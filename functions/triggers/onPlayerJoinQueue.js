import { GAME_VERSION } from '@jbuxofplenty/coral-clash';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { makeComputerMoveHelper } from '../routes/game.js';
import { getRandomComputerUser, isComputerUser } from '../utils/computerUsers.js';
import { formatDisplayName, initializeGameState, serverTimestamp } from '../utils/helpers.js';
import { sendMatchFoundNotification } from '../utils/notifications.js';

/**
 * Helper function to try matching players
 * Called when a player joins the queue
 * Exported for use in scheduled functions
 */
export async function tryMatchPlayers(newUserId) {
    try {
        const db = admin.firestore();
        // Get the new user's time control preference
        const newUserDoc = await db.collection('matchmakingQueue').doc(newUserId).get();
        if (!newUserDoc.exists) {
            return;
        }

        const newUserData = newUserDoc.data();
        const newUserTimeControlType = newUserData.timeControl?.type || 'unlimited';
        const newUserStatus = newUserData.status;

        // Don't try to match if user is already matched
        if (newUserStatus !== 'searching') {
            return;
        }

        // Skip matching if the new user is a computer user (computer users don't initiate matches)
        if (isComputerUser(newUserId)) {
            return;
        }

        // First, try to match with real users (non-computer users)
        // Query for users with matching time control, excluding computer users
        let queueSnapshot;
        try {
            // Query for ALL searching users with matching time control (not just 10)
            // We need to see all real users, not just the first 10 which might all be computer users
            queueSnapshot = await db
                .collection('matchmakingQueue')
                .where('status', '==', 'searching')
                .where('timeControl.type', '==', newUserTimeControlType)
                .orderBy('joinedAt', 'asc')
                .limit(50) // Increased limit to ensure we see all real users
                .get();
        } catch (error) {
            // If index doesn't exist, try without orderBy and sort in memory
            if (
                error.code === 9 ||
                error.message?.includes('index') ||
                error.message?.includes('requires an index')
            ) {
                console.warn(
                    `[tryMatchPlayers] Composite index missing (error: ${error.message}), querying without orderBy for ${newUserId}`,
                );
                const allSearching = await db
                    .collection('matchmakingQueue')
                    .where('status', '==', 'searching')
                    .where('timeControl.type', '==', newUserTimeControlType)
                    .limit(100) // Increased to ensure we see all users
                    .get();


                // Sort by joinedAt in memory
                const sortedDocs = allSearching.docs.sort((a, b) => {
                    const aTime = a.data().joinedAt?.seconds || 0;
                    const bTime = b.data().joinedAt?.seconds || 0;
                    return aTime - bTime;
                });

                // Create a mock snapshot-like object
                // Don't limit here - we want to see all users to find real matches
                queueSnapshot = {
                    empty: sortedDocs.length === 0,
                    docs: sortedDocs, // Return all sorted docs, not just first 10
                };
            } else {
                console.error(`[tryMatchPlayers] Query error for ${newUserId}:`, error);
                throw error;
            }
        }

        // Find another real player (not the current user and not a computer user)
        // IMPORTANT: Prioritize real users over computer users
        let opponentDoc = null;
        const realUserCandidates = [];
        const computerUserCandidates = [];
        const sameUserCandidates = [];

        // First pass: collect all users and prioritize real users
        for (const doc of queueSnapshot.docs) {
            if (doc.id === newUserId) {
                sameUserCandidates.push(doc.id);
            } else if (isComputerUser(doc.id)) {
                computerUserCandidates.push(doc.id);
            } else {
                realUserCandidates.push(doc.id);
                // Take the first real user we find (oldest by joinedAt due to ordering)
                if (!opponentDoc) {
                    opponentDoc = doc;
                }
            }
        }

        // If no real users available, check if user has been waiting long enough before matching with computer
        if (!opponentDoc) {
            const joinedAt = newUserData.joinedAt;
            if (joinedAt) {
                const now = admin.firestore.Timestamp.now();
                const waitTimeSeconds = now.seconds - joinedAt.seconds;
                const MIN_WAIT_SECONDS = 10; // Minimum wait time before matching with computer

                // Only match with computer if user has been waiting for at least MIN_WAIT_SECONDS
                if (waitTimeSeconds >= MIN_WAIT_SECONDS) {
                    const computerUser = getRandomComputerUser(newUserTimeControlType);
                    if (computerUser) {
                        const computerQueueDoc = await db
                            .collection('matchmakingQueue')
                            .doc(computerUser.id)
                            .get();

                        if (
                            computerQueueDoc.exists &&
                            computerQueueDoc.data().status === 'searching'
                        ) {
                            opponentDoc = computerQueueDoc;
                        } else {
                            console.warn(
                                `[tryMatchPlayers] Computer user ${computerUser.id} not available in queue (exists: ${computerQueueDoc.exists}, status: ${computerQueueDoc.exists ? computerQueueDoc.data().status : 'N/A'})`,
                            );
                        }
                    } else {
                        console.warn(
                            `[tryMatchPlayers] No computer user available for time control ${newUserTimeControlType}`,
                        );
                    }
                } else {
                    // User hasn't waited long enough, don't match yet
                    return;
                }
            } else {
                // No joinedAt timestamp, skip computer matching (shouldn't happen, but be safe)
                console.warn(`[tryMatchPlayers] User ${newUserId} has no joinedAt timestamp`);
                return;
            }
        }

        if (!opponentDoc) {
            return;
        }

        const opponentId = opponentDoc.id;

        // Get both player docs to ensure they still exist
        const player1Doc = await db.collection('matchmakingQueue').doc(newUserId).get();
        const player2Doc = await db.collection('matchmakingQueue').doc(opponentId).get();

        if (!player1Doc.exists || !player2Doc.exists) {
            return;
        }

        // Mark both as matched (optimistic lock)
        // Use a transaction to ensure atomicity
        const batch = db.batch();
        batch.update(db.collection('matchmakingQueue').doc(newUserId), { status: 'matched' });
        batch.update(db.collection('matchmakingQueue').doc(opponentId), { status: 'matched' });
        await batch.commit();

        // Create the game
        await createMatchedGame(newUserId, opponentId);

        // Remove real user from queue
        // Computer users stay in queue (they're always available)
        const removeBatch = db.batch();
        removeBatch.delete(db.collection('matchmakingQueue').doc(newUserId));
        if (!isComputerUser(opponentId)) {
            // Only remove opponent if they're not a computer user
            removeBatch.delete(db.collection('matchmakingQueue').doc(opponentId));
        } else {
            // Reset computer user's status back to searching so they can match again
            removeBatch.update(db.collection('matchmakingQueue').doc(opponentId), {
                status: 'searching',
            });
        }
        await removeBatch.commit();
    } catch (error) {
        console.error('Error in tryMatchPlayers:', error);
        // Don't throw - this is called asynchronously
    }
}

/**
 * Create a game between two matched players
 */
async function createMatchedGame(player1Id, player2Id) {
    try {
        const db = admin.firestore();
        // Randomly assign white/black to players
        const randomizeColors = Math.random() < 0.5;
        const whitePlayerId = randomizeColors ? player1Id : player2Id;
        const blackPlayerId = randomizeColors ? player2Id : player1Id;

        // Get both players' data from users collection
        const player1Doc = await db.collection('users').doc(player1Id).get();
        const player2Doc = await db.collection('users').doc(player2Id).get();

        if (!player1Doc.exists || !player2Doc.exists) {
            throw new Error('One or both players not found');
        }

        const player1Data = player1Doc.data();
        const player2Data = player2Doc.data();

        // Get player 1's avatar from settings
        const player1SettingsDoc = await db
            .collection('users')
            .doc(player1Id)
            .collection('settings')
            .doc('preferences')
            .get();
        const player1Settings = player1SettingsDoc.exists ? player1SettingsDoc.data() : {};

        // Get player 2's avatar from settings
        const player2SettingsDoc = await db
            .collection('users')
            .doc(player2Id)
            .collection('settings')
            .doc('preferences')
            .get();
        const player2Settings = player2SettingsDoc.exists ? player2SettingsDoc.data() : {};

        // Format display names
        const player1Name = formatDisplayName(player1Data.displayName, player1Data.discriminator);
        const player2Name = formatDisplayName(player2Data.displayName, player2Data.discriminator);

        // Get players' queue data to retrieve time controls
        const player1QueueDoc = await db.collection('matchmakingQueue').doc(player1Id).get();
        const player2QueueDoc = await db.collection('matchmakingQueue').doc(player2Id).get();

        // Use player1's time control (they initiated the match), or default to unlimited
        const timeControl = (player1QueueDoc.exists && player1QueueDoc.data().timeControl) ||
            (player2QueueDoc.exists && player2QueueDoc.data().timeControl) || { type: 'unlimited' };

        // Initialize time remaining if time control has a limit
        const timeRemaining = timeControl.totalSeconds
            ? {
                  [player1Id]: timeControl.totalSeconds,
                  [player2Id]: timeControl.totalSeconds,
              }
            : null;

        // Check if opponent is a computer user
        const isOpponentComputer = isComputerUser(player2Id);
        const opponentDifficulty = isOpponentComputer ? player2Data.difficulty : null;

        // Create game document (active immediately, no pending state for matchmaking)
        const gameData = {
            creatorId: player1Id,
            opponentId: player2Id,
            whitePlayerId,
            blackPlayerId,
            status: 'active', // Matchmaking games start immediately
            currentTurn: whitePlayerId, // White always starts
            timeControl,
            timeRemaining,
            lastMoveTime: serverTimestamp(),
            moves: [],
            gameState: initializeGameState(),
            version: GAME_VERSION,
            matchmakingGame: true, // Mark as matchmaking game
            // Computer user specific fields
            opponentType: isOpponentComputer ? 'computer' : 'pvp',
            difficulty: opponentDifficulty, // Store difficulty if opponent is computer
            // Snapshot player info at game creation
            creatorDisplayName: player1Name,
            creatorAvatarKey: player1Settings.avatarKey || 'dolphin',
            opponentDisplayName: player2Name,
            opponentAvatarKey: player2Settings.avatarKey || 'dolphin',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const gameRef = await db.collection('games').add(gameData);

        // Send notification to player1 (always a real user in matchmaking)
        await db.collection('notifications').add({
            userId: player1Id,
            type: 'match_found',
            gameId: gameRef.id,
            opponentId: player2Id,
            opponentName: player2Name, // This will be the computer user's mocked display name (e.g., "Alex#2847")
            opponentAvatarKey: player2Settings.avatarKey || 'dolphin',
            read: false,
            createdAt: serverTimestamp(),
        });

        // Send push notification to player1
        sendMatchFoundNotification(
            player1Id,
            player2Id,
            player2Name,
            gameRef.id,
            player2Settings.avatarKey || 'dolphin',
        ).catch((error) => console.error('Error sending match found push notification:', error));

        // Only send notification to player2 if they're not a computer user
        if (!isOpponentComputer) {
            await db.collection('notifications').add({
                userId: player2Id,
                type: 'match_found',
                gameId: gameRef.id,
                opponentId: player1Id,
                opponentName: player1Name,
                opponentAvatarKey: player1Settings.avatarKey || 'dolphin',
                read: false,
                createdAt: serverTimestamp(),
            });

            // Send push notification to player2
            sendMatchFoundNotification(
                player2Id,
                player1Id,
                player1Name,
                gameRef.id,
                player1Settings.avatarKey || 'dolphin',
            ).catch((error) =>
                console.error('Error sending match found push notification:', error),
            );
        }

        // If computer user is white (goes first), trigger their move immediately
        // Wait a small delay to ensure game document is fully written
        if (isOpponentComputer && whitePlayerId === player2Id) {
            console.log(
                `[createMatchedGame] Computer user ${player2Id} is white, triggering first move`,
            );
            // Small delay to ensure game document is written, then trigger move
            setTimeout(async () => {
                try {
                    // Fetch fresh game data to ensure we have the latest
                    const freshGameDoc = await db.collection('games').doc(gameRef.id).get();
                    if (freshGameDoc.exists) {
                        await makeComputerMoveHelper(gameRef.id, freshGameDoc.data());
                    } else {
                        console.error(
                            `[createMatchedGame] Game ${gameRef.id} not found when trying to make computer move`,
                        );
                    }
                } catch (error) {
                    console.error(
                        `[createMatchedGame] Error making computer move for ${player2Id}:`,
                        error,
                    );
                }
            }, 500); // 500ms delay
        } else if (isOpponentComputer && whitePlayerId === player1Id && isComputerUser(player1Id)) {
            // Handle case where player1 is also a computer user (shouldn't happen in matchmaking, but handle it)
            console.log(
                `[createMatchedGame] Computer user ${player1Id} is white, triggering first move`,
            );
            setTimeout(async () => {
                try {
                    const freshGameDoc = await db.collection('games').doc(gameRef.id).get();
                    if (freshGameDoc.exists) {
                        await makeComputerMoveHelper(gameRef.id, freshGameDoc.data());
                    } else {
                        console.error(
                            `[createMatchedGame] Game ${gameRef.id} not found when trying to make computer move`,
                        );
                    }
                } catch (error) {
                    console.error(
                        `[createMatchedGame] Error making computer move for ${player1Id}:`,
                        error,
                    );
                }
            }, 500);
        }

        return gameRef.id;
    } catch (error) {
        console.error('Error creating matched game:', error);
        throw error;
    }
}

/**
 * Firestore trigger: When a player joins the queue, try to match them
 * This provides real-time matching without polling
 */
export const onPlayerJoinQueue = onDocumentCreated('matchmakingQueue/{userId}', async (event) => {
    try {
        const snap = event.data;
        if (!snap) return;

        const userId = event.params.userId;
        const userData = snap.data();

        // Only try matching if status is searching
        if (userData.status !== 'searching') {
            return null;
        }

        // Wait a brief moment to avoid race conditions
        // This delay helps ensure that if multiple users join simultaneously,
        // they have time to be written to Firestore before we query
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased to 1 second

        // Try matching immediately
        await tryMatchPlayers(userId);

        // Also retry after a short delay to catch users who join very close together
        // This helps ensure that if User A joins and User B joins 500ms later,
        // User A will retry and find User B
        setTimeout(async () => {
            const userDoc = await admin
                .firestore()
                .collection('matchmakingQueue')
                .doc(userId)
                .get();
            if (userDoc.exists && userDoc.data().status === 'searching') {
                await tryMatchPlayers(userId);
            }
        }, 2000); // Retry after 2 seconds

        return null;
    } catch (error) {
        console.error('Error in onPlayerJoinQueue trigger:', error);
        return null;
    }
});
