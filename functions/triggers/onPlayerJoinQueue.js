import { GAME_VERSION } from '@jbuxofplenty/coral-clash';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { formatDisplayName, initializeGameState, serverTimestamp } from '../utils/helpers.js';
import { getRandomComputerUser, isComputerUser } from '../utils/computerUsers.js';
import { makeComputerMoveHelper } from '../routes/game.js';

/**
 * Helper function to try matching players
 * Called when a player joins the queue
 */
async function tryMatchPlayers(newUserId) {
    try {
        const db = admin.firestore();
        // Get the new user's time control preference
        const newUserDoc = await db.collection('matchmakingQueue').doc(newUserId).get();
        if (!newUserDoc.exists) {
            return;
        }

        const newUserData = newUserDoc.data();
        const newUserTimeControlType = newUserData.timeControl?.type || 'unlimited';

        // Skip matching if the new user is a computer user (computer users don't initiate matches)
        if (isComputerUser(newUserId)) {
            return;
        }

        // First, try to match with real users (non-computer users)
        const queueSnapshot = await db
            .collection('matchmakingQueue')
            .where('status', '==', 'searching')
            .where('timeControl.type', '==', newUserTimeControlType)
            .orderBy('joinedAt', 'asc')
            .limit(10) // Get up to 10 oldest waiting players
            .get();

        // Find another real player (not the current user and not a computer user)
        let opponentDoc = null;
        for (const doc of queueSnapshot.docs) {
            if (doc.id !== newUserId && !isComputerUser(doc.id)) {
                opponentDoc = doc;
                break;
            }
        }

        // If no real users available, match with a computer user
        if (!opponentDoc) {
            const computerUser = getRandomComputerUser(newUserTimeControlType);
            if (computerUser) {
                const computerQueueDoc = await db
                    .collection('matchmakingQueue')
                    .doc(computerUser.id)
                    .get();

                if (computerQueueDoc.exists && computerQueueDoc.data().status === 'searching') {
                    opponentDoc = computerQueueDoc;
                }
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

        // Send notifications to both players
        await db.collection('notifications').add({
            userId: player1Id,
            type: 'match_found',
            gameId: gameRef.id,
            opponentId: player2Id,
            opponentName: player2Name,
            opponentAvatarKey: player2Settings.avatarKey || 'dolphin',
            read: false,
            createdAt: serverTimestamp(),
        });

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
        }

        // If computer user is white (goes first), trigger their move immediately
        // Wait a small delay to ensure game document is fully written
        if (isOpponentComputer && whitePlayerId === player2Id) {
            console.log(`[createMatchedGame] Computer user ${player2Id} is white, triggering first move`);
            // Small delay to ensure game document is written, then trigger move
            setTimeout(async () => {
                try {
                    // Fetch fresh game data to ensure we have the latest
                    const freshGameDoc = await db.collection('games').doc(gameRef.id).get();
                    if (freshGameDoc.exists) {
                        await makeComputerMoveHelper(gameRef.id, freshGameDoc.data());
                    } else {
                        console.error(`[createMatchedGame] Game ${gameRef.id} not found when trying to make computer move`);
                    }
                } catch (error) {
                    console.error(`[createMatchedGame] Error making computer move for ${player2Id}:`, error);
                }
            }, 500); // 500ms delay
        } else if (isOpponentComputer && whitePlayerId === player1Id && isComputerUser(player1Id)) {
            // Handle case where player1 is also a computer user (shouldn't happen in matchmaking, but handle it)
            console.log(`[createMatchedGame] Computer user ${player1Id} is white, triggering first move`);
            setTimeout(async () => {
                try {
                    const freshGameDoc = await db.collection('games').doc(gameRef.id).get();
                    if (freshGameDoc.exists) {
                        await makeComputerMoveHelper(gameRef.id, freshGameDoc.data());
                    } else {
                        console.error(`[createMatchedGame] Game ${gameRef.id} not found when trying to make computer move`);
                    }
                } catch (error) {
                    console.error(`[createMatchedGame] Error making computer move for ${player1Id}:`, error);
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
        await new Promise((resolve) => setTimeout(resolve, 500));

        await tryMatchPlayers(userId);
        return null;
    } catch (error) {
        console.error('Error in onPlayerJoinQueue trigger:', error);
        return null;
    }
});
