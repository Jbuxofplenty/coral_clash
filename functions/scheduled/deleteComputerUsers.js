import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { getAllComputerUsers } from '../utils/computerUsers.js';

const db = admin.firestore();

/**
 * Callable function: Delete all computer users from Firestore
 * Removes computer users from users collection, matchmaking queue, and related data
 * Only accessible to internal users
 */
export const deleteComputerUsers = onCall(getAppCheckConfig(), async (request) => {
    try {
        // Verify user is authenticated and is an internal user
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const requestingUserId = request.auth.uid;
        const requestingUserDoc = await db.collection('users').doc(requestingUserId).get();

        if (!requestingUserDoc.exists || !requestingUserDoc.data().internalUser) {
            throw new HttpsError(
                'permission-denied',
                'Only internal users can delete computer users',
            );
        }

        console.log('[DeleteComputerUsers] Starting computer user deletion');
        const computerUsers = getAllComputerUsers();

        let deletedCount = 0;
        const batch = db.batch();

        for (const userData of computerUsers) {
            const computerUserId = userData.id;

            // Delete from matchmaking queue
            const queueRef = db.collection('matchmakingQueue').doc(computerUserId);
            const queueDoc = await queueRef.get();
            if (queueDoc.exists) {
                batch.delete(queueRef);
                deletedCount++;
            }

            // Delete user document (this will cascade delete subcollections in production)
            // But we'll also explicitly delete subcollections to be safe
            const userRef = db.collection('users').doc(computerUserId);
            const computerUserDoc = await userRef.get();

            if (computerUserDoc.exists) {
                // Delete settings subcollection
                const settingsRef = userRef.collection('settings');
                const settingsSnapshot = await settingsRef.get();
                settingsSnapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                // Delete friends subcollection
                const friendsRef = userRef.collection('friends');
                const friendsSnapshot = await friendsRef.get();
                friendsSnapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                // Delete user document
                batch.delete(userRef);
                deletedCount++;
            }

            // Delete friend requests where this user is involved
            const friendRequestsTo = await db
                .collection('friendRequests')
                .where('to', '==', computerUserId)
                .get();
            friendRequestsTo.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            const friendRequestsFrom = await db
                .collection('friendRequests')
                .where('from', '==', computerUserId)
                .get();
            friendRequestsFrom.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            console.log(`[DeleteComputerUsers] Queued deletion for: ${userData.displayName}`);
        }

        // Commit all deletions
        await batch.commit();

        console.log(`[DeleteComputerUsers] Successfully deleted ${deletedCount} computer user entries`);
        return {
            success: true,
            message: `Successfully deleted ${computerUsers.length} computer users`,
            deletedCount,
        };
    } catch (error) {
        console.error('[DeleteComputerUsers] Error deleting computer users:', error);
        throw error;
    }
});

