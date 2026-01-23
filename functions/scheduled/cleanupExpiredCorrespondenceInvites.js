import { onSchedule } from 'firebase-functions/v2/scheduler';
import { admin } from '../init.js';
import { serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

/**
 * Scheduled function to clean up expired correspondence invitations
 * Runs every hour to find and mark expired invitations
 */
export const cleanupExpiredCorrespondenceInvites = onSchedule(
    {
        schedule: 'every 1 hours',
        timeZone: 'UTC',
        retryCount: 3,
    },
    async (_event) => {
        console.log('[cleanupExpiredCorrespondenceInvites] Starting cleanup...');

        try {
            const now = admin.firestore.Timestamp.now();

            // Find all pending invitations that have expired
            const expiredInvitesSnapshot = await db
                .collection('correspondenceInvitations')
                .where('status', '==', 'pending')
                .where('expiresAt', '<=', now)
                .get();

            if (expiredInvitesSnapshot.empty) {
                console.log('[cleanupExpiredCorrespondenceInvites] No expired invitations found');
                return;
            }

            console.log(
                `[cleanupExpiredCorrespondenceInvites] Found ${expiredInvitesSnapshot.size} expired invitations`,
            );

            const batch = db.batch();
            const notifications = [];

            expiredInvitesSnapshot.docs.forEach((doc) => {
                const inviteData = doc.data();

                // Update invitation status to expired
                batch.update(doc.ref, {
                    status: 'expired',
                });

                // Notify creator that invitation expired
                notifications.push({
                    userId: inviteData.creatorId,
                    type: 'correspondence_invite_expired',
                    inviteId: doc.id,
                    read: false,
                    createdAt: serverTimestamp(),
                });

                // If invitation was matched, notify matched user as well
                if (inviteData.matchedUserId) {
                    notifications.push({
                        userId: inviteData.matchedUserId,
                        type: 'correspondence_invite_expired',
                        inviteId: doc.id,
                        creatorId: inviteData.creatorId,
                        read: false,
                        createdAt: serverTimestamp(),
                    });
                }
            });

            // Commit batch update
            await batch.commit();
            console.log(
                `[cleanupExpiredCorrespondenceInvites] Updated ${expiredInvitesSnapshot.size} invitations to expired`,
            );

            // Create notifications
            const notificationBatch = db.batch();
            notifications.forEach((notification) => {
                const notifRef = db.collection('notifications').doc();
                notificationBatch.set(notifRef, notification);
            });
            await notificationBatch.commit();
            console.log(
                `[cleanupExpiredCorrespondenceInvites] Created ${notifications.length} expiration notifications`,
            );
        } catch (error) {
            console.error('[cleanupExpiredCorrespondenceInvites] Error during cleanup:', error);
            throw error; // Re-throw to trigger retry
        }
    },
);
