const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Send friend request
 * POST /api/friends/request
 * Accepts either friendId (UID) or email
 */
exports.sendFriendRequest = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { friendId, email } = data;
        const userId = context.auth.uid;

        if (!friendId && !email) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Either friendId or email is required',
            );
        }

        let targetUserId = friendId;

        // If email is provided, look up the user
        if (email && !friendId) {
            const userByEmail = await admin.auth().getUserByEmail(email);
            if (!userByEmail) {
                throw new functions.https.HttpsError('not-found', 'User with that email not found');
            }
            targetUserId = userByEmail.uid;
        }

        if (userId === targetUserId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Cannot add yourself as friend',
            );
        }

        // Check if friend exists in Firestore
        const friendDoc = await db.collection('users').doc(targetUserId).get();
        if (!friendDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        // Check if already friends
        const existingFriend = await db
            .collection('users')
            .doc(userId)
            .collection('friends')
            .doc(targetUserId)
            .get();

        if (existingFriend.exists) {
            throw new functions.https.HttpsError('already-exists', 'Already friends');
        }

        // Check for existing pending request
        const existingRequest = await db
            .collection('friendRequests')
            .where('from', '==', userId)
            .where('to', '==', targetUserId)
            .where('status', '==', 'pending')
            .get();

        if (!existingRequest.empty) {
            throw new functions.https.HttpsError('already-exists', 'Friend request already sent');
        }

        // Check for reverse pending request (they sent you a request)
        const reverseRequest = await db
            .collection('friendRequests')
            .where('from', '==', targetUserId)
            .where('to', '==', userId)
            .where('status', '==', 'pending')
            .get();

        if (!reverseRequest.empty) {
            throw new functions.https.HttpsError(
                'already-exists',
                'This user has already sent you a friend request. Accept their request instead.',
            );
        }

        // Create friend request
        await db.collection('friendRequests').add({
            from: userId,
            to: targetUserId,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send notification
        await db.collection('notifications').add({
            userId: targetUserId,
            type: 'friend_request',
            from: userId,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            message: 'Friend request sent',
            friendId: targetUserId,
        };
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Accept or decline friend request
 * POST /api/friends/respond
 */
exports.respondToFriendRequest = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { requestId, accept } = data;
        const userId = context.auth.uid;

        const requestDoc = await db.collection('friendRequests').doc(requestId).get();

        if (!requestDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Friend request not found');
        }

        const requestData = requestDoc.data();

        if (requestData.to !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }

        if (accept) {
            // Add to both users' friends subcollections
            const batch = db.batch();

            batch.set(
                db.collection('users').doc(userId).collection('friends').doc(requestData.from),
                {
                    addedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            );

            batch.set(
                db.collection('users').doc(requestData.from).collection('friends').doc(userId),
                {
                    addedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            );

            batch.update(db.collection('friendRequests').doc(requestId), {
                status: 'accepted',
            });

            await batch.commit();

            // Notify the requester
            await db.collection('notifications').add({
                userId: requestData.from,
                type: 'friend_request_accepted',
                from: userId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await db.collection('friendRequests').doc(requestId).update({
                status: 'declined',
            });
        }

        return {
            success: true,
            message: accept ? 'Friend request accepted' : 'Friend request declined',
        };
    } catch (error) {
        console.error('Error responding to friend request:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get user's friends list
 * GET /api/friends
 */
exports.getFriends = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        const friendsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('friends')
            .get();

        const friendIds = friendsSnapshot.docs.map((doc) => doc.id);

        // Get friend profiles
        const friends = [];
        for (const friendId of friendIds) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                friends.push({
                    id: friendId,
                    ...friendDoc.data(),
                });
            }
        }

        return {
            success: true,
            friends,
        };
    } catch (error) {
        console.error('Error getting friends:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Remove friend
 * POST /api/friends/remove
 */
exports.removeFriend = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { friendId } = data;
        const userId = context.auth.uid;

        // Remove from both users' friends subcollections
        const batch = db.batch();

        batch.delete(db.collection('users').doc(userId).collection('friends').doc(friendId));
        batch.delete(db.collection('users').doc(friendId).collection('friends').doc(userId));

        await batch.commit();

        return {
            success: true,
            message: 'Friend removed',
        };
    } catch (error) {
        console.error('Error removing friend:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
