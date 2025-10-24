const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { serverTimestamp, formatDisplayName } = require('../utils/helpers');
const {
    sendFriendRequestNotification,
    sendFriendAcceptedNotification,
} = require('../utils/notifications');

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
        const requestRef = await db.collection('friendRequests').add({
            from: userId,
            to: targetUserId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });

        // Send notification
        await db.collection('notifications').add({
            userId: targetUserId,
            type: 'friend_request',
            from: userId,
            read: false,
            createdAt: serverTimestamp(),
        });

        // Get sender's info for push notification
        const senderDoc = await db.collection('users').doc(userId).get();
        const senderData = senderDoc.data();
        const senderName = formatDisplayName(senderData.displayName, senderData.discriminator);

        // Send push notification
        sendFriendRequestNotification(targetUserId, userId, senderName, requestRef.id).catch(
            (error) => console.error('Error sending push notification:', error),
        );

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

        // Authorization:
        // - Recipient (to) can accept or decline
        // - Sender (from) can cancel (decline)
        // - Both can decline/cancel at any time
        const isRecipient = requestData.to === userId;
        const isSender = requestData.from === userId;

        if (!isRecipient && !isSender) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }

        // Only recipient can accept (sender cannot accept their own request)
        if (accept && !isRecipient) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only the recipient can accept a friend request',
            );
        }

        if (accept) {
            // Add to both users' friends subcollections
            const batch = db.batch();

            batch.set(
                db.collection('users').doc(userId).collection('friends').doc(requestData.from),
                {
                    addedAt: serverTimestamp(),
                },
            );

            batch.set(
                db.collection('users').doc(requestData.from).collection('friends').doc(userId),
                {
                    addedAt: serverTimestamp(),
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
                createdAt: serverTimestamp(),
            });
        } else {
            await db.collection('friendRequests').doc(requestId).update({
                status: 'declined',
            });
        }

        // Determine the appropriate message
        let message = 'Friend request declined';
        if (accept) {
            message = 'Friend request accepted';
        } else if (isSender) {
            message = 'Friend request canceled';
        }

        return {
            success: true,
            message,
        };
    } catch (error) {
        console.error('Error responding to friend request:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get user's friends list and pending requests
 * GET /api/friends
 */
exports.getFriends = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        // Get friends
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
                const userData = friendDoc.data();
                friends.push({
                    id: friendId,
                    displayName: formatDisplayName(userData.displayName, userData.discriminator),
                    avatarKey: userData.avatarKey || 'dolphin',
                });
            }
        }

        // Get incoming pending requests
        const incomingRequestsSnapshot = await db
            .collection('friendRequests')
            .where('to', '==', userId)
            .where('status', '==', 'pending')
            .get();

        const incomingRequests = [];
        for (const doc of incomingRequestsSnapshot.docs) {
            const request = doc.data();
            const fromUserDoc = await db.collection('users').doc(request.from).get();
            if (fromUserDoc.exists) {
                const userData = fromUserDoc.data();
                incomingRequests.push({
                    requestId: doc.id,
                    id: request.from,
                    displayName: formatDisplayName(userData.displayName, userData.discriminator),
                    avatarKey: userData.avatarKey || 'dolphin',
                    createdAt: request.createdAt,
                });
            }
        }

        // Get outgoing pending requests
        const outgoingRequestsSnapshot = await db
            .collection('friendRequests')
            .where('from', '==', userId)
            .where('status', '==', 'pending')
            .get();

        const outgoingRequests = [];
        for (const doc of outgoingRequestsSnapshot.docs) {
            const request = doc.data();
            const toUserDoc = await db.collection('users').doc(request.to).get();
            if (toUserDoc.exists) {
                const userData = toUserDoc.data();
                outgoingRequests.push({
                    requestId: doc.id,
                    id: request.to,
                    displayName: formatDisplayName(userData.displayName, userData.discriminator),
                    avatarKey: userData.avatarKey || 'dolphin',
                    createdAt: request.createdAt,
                });
            }
        }

        return {
            success: true,
            friends,
            incomingRequests,
            outgoingRequests,
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

/**
 * Search users by username or email (fuzzy match)
 * GET /api/friends/search
 */
exports.searchUsers = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { query } = data;
        const userId = context.auth.uid;

        if (!query || query.trim().length < 2) {
            return {
                success: true,
                users: [],
            };
        }

        const searchQuery = query.toLowerCase().trim();

        // Get all users and filter in memory for fuzzy matching
        // Note: For better performance with large user bases, consider using Algolia or similar
        const usersSnapshot = await db.collection('users').limit(500).get();

        const matchedUsers = [];

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const uid = doc.id;

            // Skip current user
            if (uid === userId) continue;

            // Check if already friends
            const friendDoc = await db
                .collection('users')
                .doc(userId)
                .collection('friends')
                .doc(uid)
                .get();

            if (friendDoc.exists) continue;

            // Check for pending friend requests (both directions)
            const sentRequest = await db
                .collection('friendRequests')
                .where('from', '==', userId)
                .where('to', '==', uid)
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            const receivedRequest = await db
                .collection('friendRequests')
                .where('from', '==', uid)
                .where('to', '==', userId)
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            const hasPendingRequest = !sentRequest.empty || !receivedRequest.empty;

            // Fuzzy match on displayName and email
            const displayName = (userData.displayName || '').toLowerCase();
            const email = (userData.email || '').toLowerCase();

            const matchScore = calculateMatchScore(searchQuery, displayName, email);

            if (matchScore > 0) {
                matchedUsers.push({
                    id: uid,
                    displayName: formatDisplayName(userData.displayName, userData.discriminator),
                    avatarKey: userData.avatarKey || 'dolphin',
                    matchScore,
                    hasPendingRequest,
                });
            }
        }

        // Sort by match score and return top 5
        matchedUsers.sort((a, b) => b.matchScore - a.matchScore);
        const topMatches = matchedUsers.slice(0, 5);

        return {
            success: true,
            users: topMatches,
        };
    } catch (error) {
        console.error('Error searching users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Calculate fuzzy match score
 * Higher score = better match
 */
function calculateMatchScore(query, displayName, email) {
    let score = 0;

    // Exact match (case insensitive)
    if (displayName === query || email === query) {
        return 100;
    }

    // Starts with query
    if (displayName.startsWith(query)) {
        score += 50;
    }
    if (email.startsWith(query)) {
        score += 40;
    }

    // Contains query
    if (displayName.includes(query)) {
        score += 30;
    }
    if (email.includes(query)) {
        score += 25;
    }

    // Character-by-character fuzzy match
    const displayNameScore = fuzzyScore(query, displayName);
    const emailScore = fuzzyScore(query, email);

    score += Math.max(displayNameScore, emailScore);

    return score;
}

/**
 * Calculate fuzzy score based on matching characters in order
 */
function fuzzyScore(query, text) {
    let queryIndex = 0;
    let score = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
        if (text[i] === query[queryIndex]) {
            score += 1;
            queryIndex++;
        }
    }

    // If all query characters were found in order
    if (queryIndex === query.length) {
        return score;
    }

    return 0;
}
