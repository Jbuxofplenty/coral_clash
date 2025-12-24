import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { validateClientVersion } from '../utils/gameVersion.js';
import { serverTimestamp } from '../utils/helpers.js';

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
    const { timeControl, clientVersion } = data;

    // Validate client version
    const versionCheck = clientVersion ? validateClientVersion(clientVersion) : null;

    // Check if user is already in queue
    const existingEntry = await db.collection('matchmakingQueue').doc(userId).get();
    if (existingEntry.exists) {
        return {
            success: true,
            message: 'Already in matchmaking queue',
            alreadyInQueue: true,
        };
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
            clientVersion: clientVersion || 'unknown',
            joinedAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(), // Track last activity
            status: 'searching', // searching, matched
        });

    return {
        success: true,
        message: 'Joined matchmaking queue',
        versionCheck,
    };
}

/**
 * Join the matchmaking queue
 * POST /api/matchmaking/join
 */
export const joinMatchmaking = onCall(getAppCheckConfig(), async (request) => {
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
export { joinMatchmakingHandler };

/**
 * Handler for leaving matchmaking queue
 * Separated for testing purposes
 */
async function leaveMatchmakingHandler(request) {
    const { data: _data, auth } = request;
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
export const leaveMatchmaking = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await leaveMatchmakingHandler(request);
    } catch (error) {
        console.error('Error leaving matchmaking:', error);
        throw new HttpsError('internal', error.message);
    }
});
export { leaveMatchmakingHandler };

/**
 * Handler for updating matchmaking heartbeat
 * Separated for testing purposes
 * Also checks if user has been waiting 10+ seconds and triggers matching if needed
 */
async function updateMatchmakingHeartbeatHandler(request) {
    const { data: _data, auth } = request;
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

    const queueData = queueDoc.data();

    // Update last heartbeat
    await db.collection('matchmakingQueue').doc(userId).update({
        lastHeartbeat: serverTimestamp(),
    });

    // Always try to match - tryMatchPlayers will handle the logic:
    // - Match immediately with real users if available
    // - Only match with computer users if user has waited 10+ seconds
    if (queueData.status === 'searching') {
        // Import tryMatchPlayers dynamically to avoid circular dependencies
        const { tryMatchPlayers } = await import('../triggers/onPlayerJoinQueue.js');
        // Trigger matching asynchronously (don't wait for it)
        // This allows the heartbeat to return quickly while matching happens in background
        tryMatchPlayers(userId).catch((error) => {
            console.error(
                `[updateMatchmakingHeartbeat] Error triggering match for ${userId}:`,
                error,
            );
        });
    }

    return {
        success: true,
    };
}

/**
 * Update heartbeat for matchmaking queue entry
 * POST /api/matchmaking/heartbeat
 */
export const updateMatchmakingHeartbeat = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await updateMatchmakingHeartbeatHandler(request);
    } catch (error) {
        console.error('Error updating matchmaking heartbeat:', error);
        // Don't throw error - heartbeat failures shouldn't interrupt the app
        return { success: false, error: error.message };
    }
});
export { updateMatchmakingHeartbeatHandler };

/**
 * Handler for getting matchmaking status
 * Separated for testing purposes
 */
async function getMatchmakingStatusHandler(request) {
    const { data: _data, auth } = request;
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
export const getMatchmakingStatus = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await getMatchmakingStatusHandler(request);
    } catch (error) {
        console.error('Error getting matchmaking status:', error);
        throw new HttpsError('internal', error.message);
    }
});
export { getMatchmakingStatusHandler };
