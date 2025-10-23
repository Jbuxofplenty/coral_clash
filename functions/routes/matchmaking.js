const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { initializeGameState, serverTimestamp, formatDisplayName } = require('../utils/helpers');
const { GAME_VERSION } = require('../../shared/dist/game');

const db = admin.firestore();

/**
 * Join the matchmaking queue
 * POST /api/matchmaking/join
 */
exports.joinMatchmaking = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        // Check if user is already in queue
        const existingEntry = await db.collection('matchmakingQueue').doc(userId).get();
        if (existingEntry.exists) {
            return {
                success: true,
                message: 'Already in matchmaking queue',
                alreadyInQueue: true,
            };
        }

        // Check if user already has active games (optional - you can remove this check if you want to allow multiple games)
        const activeGamesQuery = await db
            .collection('games')
            .where('status', 'in', ['pending', 'active'])
            .where('creatorId', '==', userId)
            .limit(1)
            .get();

        const activeGamesQuery2 = await db
            .collection('games')
            .where('status', 'in', ['pending', 'active'])
            .where('opponentId', '==', userId)
            .limit(1)
            .get();

        if (!activeGamesQuery.empty || !activeGamesQuery2.empty) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'You already have an active game. Finish it before joining matchmaking.',
            );
        }

        // Get user profile for storing in queue
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data();

        // Add user to matchmaking queue
        await db
            .collection('matchmakingQueue')
            .doc(userId)
            .set({
                userId,
                displayName: userData.displayName || 'User',
                discriminator: userData.discriminator || '',
                avatarKey: userData.settings?.avatarKey || 'dolphin',
                joinedAt: serverTimestamp(),
                status: 'searching', // searching, matched
            });

        // Try to find a match immediately
        await tryMatchPlayers(userId);

        return {
            success: true,
            message: 'Joined matchmaking queue',
        };
    } catch (error) {
        console.error('Error joining matchmaking:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Leave the matchmaking queue
 * POST /api/matchmaking/leave
 */
exports.leaveMatchmaking = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        // Remove user from queue
        await db.collection('matchmakingQueue').doc(userId).delete();

        return {
            success: true,
            message: 'Left matchmaking queue',
        };
    } catch (error) {
        console.error('Error leaving matchmaking:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get matchmaking status (queue count and user's status)
 * GET /api/matchmaking/status
 */
exports.getMatchmakingStatus = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        // Get total count of players in queue
        const queueSnapshot = await db.collection('matchmakingQueue').get();
        const queueCount = queueSnapshot.size;

        // Check if current user is in queue
        const userQueueDoc = await db.collection('matchmakingQueue').doc(userId).get();
        const inQueue = userQueueDoc.exists;
        const userStatus = userQueueDoc.exists ? userQueueDoc.data().status : null;

        return {
            success: true,
            queueCount,
            inQueue,
            status: userStatus,
        };
    } catch (error) {
        console.error('Error getting matchmaking status:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Helper function to try matching players
 * Called when a player joins the queue
 */
async function tryMatchPlayers(newUserId) {
    try {
        // Get all players in queue (excluding the new user)
        const queueSnapshot = await db
            .collection('matchmakingQueue')
            .where('status', '==', 'searching')
            .orderBy('joinedAt', 'asc')
            .limit(10) // Get up to 10 oldest waiting players
            .get();

        if (queueSnapshot.empty) {
            return;
        }

        // Find another player (not the current user)
        let opponentDoc = null;
        for (const doc of queueSnapshot.docs) {
            if (doc.id !== newUserId) {
                opponentDoc = doc;
                break;
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

        // Remove both players from queue
        const removeBatch = db.batch();
        removeBatch.delete(db.collection('matchmakingQueue').doc(newUserId));
        removeBatch.delete(db.collection('matchmakingQueue').doc(opponentId));
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
        // Randomly assign white/black to players
        const randomizeColors = Math.random() < 0.5;
        const whitePlayerId = randomizeColors ? player1Id : player2Id;
        const blackPlayerId = randomizeColors ? player2Id : player1Id;

        // Get both players' data
        const player1Doc = await db.collection('users').doc(player1Id).get();
        const player2Doc = await db.collection('users').doc(player2Id).get();

        if (!player1Doc.exists || !player2Doc.exists) {
            throw new Error('One or both players not found');
        }

        const player1Data = player1Doc.data();
        const player2Data = player2Doc.data();

        // Create game document (active immediately, no pending state for matchmaking)
        const gameData = {
            creatorId: player1Id,
            opponentId: player2Id,
            whitePlayerId,
            blackPlayerId,
            status: 'active', // Matchmaking games start immediately
            currentTurn: whitePlayerId, // White always starts
            timeControl: { type: 'unlimited' },
            moves: [],
            gameState: initializeGameState(),
            version: GAME_VERSION,
            matchmakingGame: true, // Mark as matchmaking game
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const gameRef = await db.collection('games').add(gameData);

        // Send notifications to both players
        const player1Name = formatDisplayName(player1Data.displayName, player1Data.discriminator);
        const player2Name = formatDisplayName(player2Data.displayName, player2Data.discriminator);

        await db.collection('notifications').add({
            userId: player1Id,
            type: 'match_found',
            gameId: gameRef.id,
            opponentId: player2Id,
            opponentName: player2Name,
            opponentAvatarKey: player2Data.settings?.avatarKey || 'dolphin',
            read: false,
            createdAt: serverTimestamp(),
        });

        await db.collection('notifications').add({
            userId: player2Id,
            type: 'match_found',
            gameId: gameRef.id,
            opponentId: player1Id,
            opponentName: player1Name,
            opponentAvatarKey: player1Data.settings?.avatarKey || 'dolphin',
            read: false,
            createdAt: serverTimestamp(),
        });

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
exports.onPlayerJoinQueue = functions.firestore
    .document('matchmakingQueue/{userId}')
    .onCreate(async (snap, context) => {
        try {
            const userId = context.params.userId;
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

/**
 * Firestore trigger: Clean up stale matchmaking entries
 * Remove entries older than 10 minutes
 */
exports.cleanupStaleMatchmakingEntries = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        try {
            const tenMinutesAgo = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() - 10 * 60 * 1000),
            );

            const staleEntries = await db
                .collection('matchmakingQueue')
                .where('joinedAt', '<', tenMinutesAgo)
                .get();

            if (staleEntries.empty) {
                return null;
            }

            const batch = db.batch();
            staleEntries.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            return null;
        } catch (error) {
            console.error('Error cleaning up stale matchmaking entries:', error);
            return null;
        }
    });
