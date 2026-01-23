import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { validateClientVersion } from '../utils/gameVersion.js';
import { serverTimestamp } from '../utils/helpers.js';
import { sendCorrespondenceMatchNotification } from '../utils/notifications.js';

const db = admin.firestore();

/**
 * Handler for creating a correspondence invitation
 * User creates an invitation that will be matched to another player
 */
async function createCorrespondenceInviteHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { timeControl, clientVersion } = data;

    // Validate client version
    const versionCheck = clientVersion ? validateClientVersion(clientVersion) : null;

    // Get user profile for storing in invitation
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();

    // Calculate expiration time (24 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Create correspondence invitation
    const inviteRef = await db.collection('correspondenceInvitations').add({
        creatorId: userId,
        creatorDisplayName: userData.displayName || 'User',
        creatorDiscriminator: userData.discriminator || '',
        creatorAvatarKey: userData.settings?.avatarKey || 'dolphin',
        matchedUserId: null, // Will be set when matched
        timeControl: timeControl || { type: 'unlimited' },
        status: 'pending', // pending, matched, accepted, declined, expired, cancelled
        createdAt: serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        gameId: null, // Will be set when game is created
        clientVersion: clientVersion || 'unknown',
    });

    return {
        success: true,
        message: 'Correspondence invitation created',
        inviteId: inviteRef.id,
        expiresAt: expiresAt.toISOString(),
        versionCheck,
    };
}

/**
 * Create a correspondence invitation
 * POST /api/correspondence/create
 */
export const createCorrespondenceInvite = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await createCorrespondenceInviteHandler(request);
    } catch (error) {
        console.error('Error creating correspondence invite:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
export { createCorrespondenceInviteHandler };

/**
 * Handler for canceling a correspondence invitation
 */
async function cancelCorrespondenceInviteHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { inviteId } = data;

    if (!inviteId) {
        throw new HttpsError('invalid-argument', 'Invite ID is required');
    }

    // Get the invitation
    const inviteDoc = await db.collection('correspondenceInvitations').doc(inviteId).get();

    if (!inviteDoc.exists) {
        throw new HttpsError('not-found', 'Invitation not found');
    }

    const inviteData = inviteDoc.data();

    // Verify user owns this invitation
    if (inviteData.creatorId !== userId) {
        throw new HttpsError('permission-denied', 'You can only cancel your own invitations');
    }

    // If invitation was already matched, notify the matched user
    if (inviteData.matchedUserId && inviteData.status === 'matched') {
        await db.collection('notifications').add({
            userId: inviteData.matchedUserId,
            type: 'correspondence_invite_cancelled',
            creatorId: userId,
            creatorName: inviteData.creatorDisplayName,
            read: false,
            createdAt: serverTimestamp(),
        });
    }

    // Delete the invitation
    await db.collection('correspondenceInvitations').doc(inviteId).delete();

    return {
        success: true,
        message: 'Correspondence invitation cancelled',
    };
}

/**
 * Cancel a correspondence invitation
 * POST /api/correspondence/cancel
 */
export const cancelCorrespondenceInvite = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await cancelCorrespondenceInviteHandler(request);
    } catch (error) {
        console.error('Error canceling correspondence invite:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
export { cancelCorrespondenceInviteHandler };

/**
 * Handler for accepting a correspondence invitation
 * Creates the game and starts play
 */
async function acceptCorrespondenceInviteHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { inviteId } = data;

    if (!inviteId) {
        throw new HttpsError('invalid-argument', 'Invite ID is required');
    }

    // Get the invitation
    const inviteDoc = await db.collection('correspondenceInvitations').doc(inviteId).get();

    if (!inviteDoc.exists) {
        throw new HttpsError('not-found', 'Invitation not found');
    }

    const inviteData = inviteDoc.data();

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate();
    if (now > expiresAt) {
        throw new HttpsError('failed-precondition', 'This invitation has expired');
    }

    // Check if user is the matched user
    if (inviteData.matchedUserId !== userId) {
        throw new HttpsError('permission-denied', 'You are not matched to this invitation');
    }

    // Check status
    if (inviteData.status !== 'matched') {
        throw new HttpsError(
            'failed-precondition',
            `Invitation cannot be accepted (status: ${inviteData.status})`,
        );
    }

    // Get current user's data for game creation
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();

    // Randomly assign colors
    const creatorIsWhite = Math.random() < 0.5;

    // Create the game
    const gameData = {
        creatorId: inviteData.creatorId,
        creatorDisplayName: inviteData.creatorDisplayName,
        creatorAvatarKey: inviteData.creatorAvatarKey,
        opponentId: userId,
        opponentDisplayName: userData.displayName || 'User',
        opponentAvatarKey: userData.settings?.avatarKey || 'dolphin',
        whitePlayerId: creatorIsWhite ? inviteData.creatorId : userId,
        blackPlayerId: creatorIsWhite ? userId : inviteData.creatorId,
        status: 'active',
        opponentType: 'pvp',
        timeControl: inviteData.timeControl,
        createdAt: serverTimestamp(),
        lastMoveAt: serverTimestamp(),
    };

    const gameRef = await db.collection('games').add(gameData);

    // Update invitation status
    await db.collection('correspondenceInvitations').doc(inviteId).update({
        status: 'accepted',
        gameId: gameRef.id,
    });

    // Notify creator that invitation was accepted
    await db.collection('notifications').add({
        userId: inviteData.creatorId,
        type: 'correspondence_invite_accepted',
        gameId: gameRef.id,
        opponentId: userId,
        opponentName: userData.displayName || 'User',
        opponentAvatarKey: userData.settings?.avatarKey || 'dolphin',
        read: false,
        createdAt: serverTimestamp(),
    });

    return {
        success: true,
        message: 'Correspondence invitation accepted',
        gameId: gameRef.id,
    };
}

/**
 * Accept a correspondence invitation
 * POST /api/correspondence/accept
 */
export const acceptCorrespondenceInvite = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await acceptCorrespondenceInviteHandler(request);
    } catch (error) {
        console.error('Error accepting correspondence invite:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
export { acceptCorrespondenceInviteHandler };

/**
 * Handler for declining a correspondence invitation
 */
async function declineCorrespondenceInviteHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { inviteId } = data;

    if (!inviteId) {
        throw new HttpsError('invalid-argument', 'Invite ID is required');
    }

    // Get the invitation
    const inviteDoc = await db.collection('correspondenceInvitations').doc(inviteId).get();

    if (!inviteDoc.exists) {
        throw new HttpsError('not-found', 'Invitation not found');
    }

    const inviteData = inviteDoc.data();

    // Check if user is the matched user
    if (inviteData.matchedUserId !== userId) {
        throw new HttpsError('permission-denied', 'You are not matched to this invitation');
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate();
    const isExpired = now > expiresAt;

    // Update invitation - return to pool if not expired
    if (isExpired) {
        await db.collection('correspondenceInvitations').doc(inviteId).update({
            status: 'declined',
            matchedUserId: null,
        });
    } else {
        // Return to pool for others to match
        await db.collection('correspondenceInvitations').doc(inviteId).update({
            status: 'pending',
            matchedUserId: null,
        });
    }

    // Notify creator that invitation was declined
    await db.collection('notifications').add({
        userId: inviteData.creatorId,
        type: 'correspondence_invite_declined',
        declinedBy: userId,
        read: false,
        createdAt: serverTimestamp(),
    });

    return {
        success: true,
        message: 'Correspondence invitation declined',
    };
}

/**
 * Decline a correspondence invitation
 * POST /api/correspondence/decline
 */
export const declineCorrespondenceInvite = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await declineCorrespondenceInviteHandler(request);
    } catch (error) {
        console.error('Error declining correspondence invite:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
export { declineCorrespondenceInviteHandler };

/**
 * Handler for finding and matching a correspondence invitation
 * Called when user selects correspondence mode
 */
async function findCorrespondenceMatchHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;
    const { timeControl } = data;

    // Get user profile
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();

   // Find available invitations (not own, not expired, pending status, matching time control if specified)
    const now = new Date();
    let query = db
        .collection('correspondenceInvitations')
        .where('status', '==', 'pending')
        .where('expiresAt', '>', admin.firestore.Timestamp.fromDate(now))
        .orderBy('expiresAt')
        .orderBy('createdAt');

    // If time control specified, try to match with same time control first
    if (timeControl && timeControl.type) {
        query = query.where('timeControl.type', '==', timeControl.type);
    }

    const snapshot = await query.limit(50).get();

    // Filter out own invitations
    let availableInvites = snapshot.docs.filter((doc) => doc.data().creatorId !== userId);

    // If no matches with time control filter, try without it
    if (availableInvites.length === 0 && timeControl && timeControl.type) {
        const fallbackQuery = db
            .collection('correspondenceInvitations')
            .where('status', '==', 'pending')
            .where('expiresAt', '>', admin.firestore.Timestamp.fromDate(now))
            .orderBy('expiresAt')
            .orderBy('createdAt')
            .limit(50);

        const fallbackSnapshot = await fallbackQuery.get();
        availableInvites = fallbackSnapshot.docs.filter((doc) => doc.data().creatorId !== userId);
    }

    if (availableInvites.length === 0) {
        // No invitations found - create one for this user
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const inviteRef = await db.collection('correspondenceInvitations').add({
            creatorId: userId,
            creatorDisplayName: userData.displayName || 'User',
            creatorDiscriminator: userData.discriminator || '',
            creatorAvatarKey: userData.settings?.avatarKey || 'dolphin',
            matchedUserId: null,
            timeControl: timeControl || { type: 'unlimited' },
            status: 'pending',
            createdAt: serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            gameId: null,
        });

        return {
            success: false,
            message: 'Correspondence invitation created',
            noMatches: true,
            inviteId: inviteRef.id,
            expiresAt: expiresAt.toISOString(),
        };
    }

    // Match with the oldest invitation
    const inviteDoc = availableInvites[0];
    const inviteData = inviteDoc.data();

    // Update invitation with matched user
    await db.collection('correspondenceInvitations').doc(inviteDoc.id).update({
        status: 'matched',
        matchedUserId: userId,
    });

    // Send notification to creator using push notification helper
    await sendCorrespondenceMatchNotification(
        inviteData.creatorId,
        userId,
        userData.displayName || 'User',
        userData.settings?.avatarKey || 'dolphin',
        inviteDoc.id,
    );

    // Return invitation details to matched user
    return {
        success: true,
        message: 'Matched to correspondence invitation',
        inviteId: inviteDoc.id,
        creatorId: inviteData.creatorId,
        creatorName: inviteData.creatorDisplayName,
        creatorAvatarKey: inviteData.creatorAvatarKey,
        timeControl: inviteData.timeControl,
        expiresAt: inviteData.expiresAt.toDate().toISOString(),
    };
}

/**
 * Find and match to a correspondence invitation
 * POST /api/correspondence/findMatch
 */
export const findCorrespondenceMatch = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await findCorrespondenceMatchHandler(request);
    } catch (error) {
        console.error('Error finding correspondence match:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});
export { findCorrespondenceMatchHandler };
