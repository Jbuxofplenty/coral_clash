import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { isComputerUser } from '../utils/computerUsers.js';
import { getFunctionRegion } from '../utils/appCheckConfig.js';
import { serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

/**
 * Firestore trigger: Auto-accept friend requests sent to computer users
 * When a friend request is created and the recipient is a computer user,
 * automatically accept it
 */
export const onFriendRequestCreate = onDocumentCreated(
    {
        document: 'friendRequests/{requestId}',
        region: getFunctionRegion(), // Match Firestore region for lower latency
    },
    async (event) => {
    try {
        const snap = event.data;
        if (!snap) return;

        const requestData = snap.data();
        const recipientId = requestData.to;

        // Check if recipient is a computer user
        if (!isComputerUser(recipientId)) {
            return null;
        }

        console.log(`[onFriendRequestCreate] Auto-accepting friend request to computer user ${recipientId}`);

        const senderId = requestData.from;

        // Add both users to each other's friends subcollections
        const batch = db.batch();

        batch.set(db.collection('users').doc(senderId).collection('friends').doc(recipientId), {
            addedAt: serverTimestamp(),
        });

        batch.set(db.collection('users').doc(recipientId).collection('friends').doc(senderId), {
            addedAt: serverTimestamp(),
        });

        // Update request status to 'accepted'
        batch.update(db.collection('friendRequests').doc(event.params.requestId), {
            status: 'accepted',
        });

        await batch.commit();

        // Create notification for requester
        await db.collection('notifications').add({
            userId: senderId,
            type: 'friend_request_accepted',
            from: recipientId,
            read: false,
            createdAt: serverTimestamp(),
        });

        console.log(`[onFriendRequestCreate] Successfully auto-accepted friend request from ${senderId} to ${recipientId}`);
        return null;
    } catch (error) {
        console.error('Error in onFriendRequestCreate trigger:', error);
        // Don't throw - we don't want to fail the friend request creation
        return null;
    }
    },
);

