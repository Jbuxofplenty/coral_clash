const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { initializeGameState, serverTimestamp, formatDisplayName } = require('../utils/helpers');
const { GAME_VERSION } = require('../../shared/dist/game');

const db = admin.firestore();

/**
 * Handler for joining matchmaking queue
 * Separated for testing purposes
 */
async function joinMatchmakingHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { timeControl } = data;

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
        throw new HttpsError(
            'failed-precondition',
            'You already have an active game. Finish it before joining matchmaking.',
        );
    }

    // Get user profile for storing in queue
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();

    // Add user to matchmaking queue
    // The onPlayerJoinQueue trigger will automatically attempt matching
    await db
        .collection('matchmakingQueue')
        .doc(userId)
        .set({
            userId,
            displayName: userData.displayName || 'User',
            discriminator: userData.discriminator || '',
            avatarKey: userData.settings?.avatarKey || 'dolphin',
            timeControl: timeControl || { type: 'unlimited' },
            joinedAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(), // Track last activity
            status: 'searching', // searching, matched
        });

    return {
        success: true,
        message: 'Joined matchmaking queue',
    };
}

/**
 * Join the matchmaking queue
 * POST /api/matchmaking/join
 */
exports.joinMatchmaking = onCall(async (request) => {
    try {
        return await joinMatchmakingHandler(request);
    } catch (error) {
        console.error('Error joining matchmaking:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
exports.joinMatchmakingHandler = joinMatchmakingHandler;

/**
 * Handler for leaving matchmaking queue
 * Separated for testing purposes
 */
async function leaveMatchmakingHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

    // Remove user from queue
    await db.collection('matchmakingQueue').doc(userId).delete();

    return {
        success: true,
        message: 'Left matchmaking queue',
    };
}

/**
 * Leave the matchmaking queue
 * POST /api/matchmaking/leave
 */
exports.leaveMatchmaking = onCall(async (request) => {
    try {
        return await leaveMatchmakingHandler(request);
    } catch (error) {
        console.error('Error leaving matchmaking:', error);
        throw new HttpsError('internal', error.message);
    }
});
exports.leaveMatchmakingHandler = leaveMatchmakingHandler;

/**
 * Handler for updating matchmaking heartbeat
 * Separated for testing purposes
 */
async function updateMatchmakingHeartbeatHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

    // Check if user is in queue
    const queueDoc = await db.collection('matchmakingQueue').doc(userId).get();
    if (!queueDoc.exists) {
        return {
            success: false,
            message: 'Not in matchmaking queue',
        };
    }

    // Update last heartbeat
    await db.collection('matchmakingQueue').doc(userId).update({
        lastHeartbeat: serverTimestamp(),
    });

    return {
        success: true,
    };
}

/**
 * Update heartbeat for matchmaking queue entry
 * POST /api/matchmaking/heartbeat
 */
exports.updateMatchmakingHeartbeat = onCall(async (request) => {
    try {
        return await updateMatchmakingHeartbeatHandler(request);
    } catch (error) {
        console.error('Error updating matchmaking heartbeat:', error);
        // Don't throw error - heartbeat failures shouldn't interrupt the app
        return { success: false, error: error.message };
    }
});
exports.updateMatchmakingHeartbeatHandler = updateMatchmakingHeartbeatHandler;

/**
 * Handler for getting matchmaking status
 * Separated for testing purposes
 */
async function getMatchmakingStatusHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

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
}

/**
 * Get matchmaking status (queue count and user's status)
 * GET /api/matchmaking/status
 */
exports.getMatchmakingStatus = onCall(async (request) => {
    try {
        return await getMatchmakingStatusHandler(request);
    } catch (error) {
        console.error('Error getting matchmaking status:', error);
        throw new HttpsError('internal', error.message);
    }
});
exports.getMatchmakingStatusHandler = getMatchmakingStatusHandler;
