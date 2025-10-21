const admin = require('firebase-admin');

/**
 * Send push notification to a user using Firebase Cloud Messaging
 * @param {string} userId - The user ID to send notification to
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data payload
 */
async function sendPushNotification(userId, notification) {
    try {
        const db = admin.firestore();

        // Get user's push token
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            console.log(`User ${userId} not found`);
            return { success: false, error: 'User not found' };
        }

        const userData = userDoc.data();
        const pushToken = userData.pushToken;

        if (!pushToken) {
            console.log(`No push token found for user ${userId}`);
            return { success: false, error: 'No push token' };
        }

        // Check if it's an Expo push token or FCM token
        const isExpoPushToken = pushToken.startsWith('ExponentPushToken[');

        if (isExpoPushToken) {
            // Use Expo's push notification service for Expo tokens (development)
            return await sendExpoPushNotification(pushToken, notification);
        } else {
            // Use Firebase Cloud Messaging for FCM tokens (production)
            return await sendFCMNotification(pushToken, notification);
        }
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification via Firebase Cloud Messaging
 */
async function sendFCMNotification(token, notification) {
    try {
        const message = {
            token: token,
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: notification.data || {},
            apns: {
                payload: {
                    aps: {
                        badge: 1,
                        sound: 'default',
                    },
                },
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default',
                },
            },
        };

        const response = await admin.messaging().send(message);
        console.log('FCM notification sent successfully:', response);
        return { success: true, result: response };
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification via Expo Push Service (for development with Expo Go)
 */
async function sendExpoPushNotification(token, notification) {
    try {
        const message = {
            to: token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            badge: 1,
            priority: 'high',
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();

        if (result.data?.status === 'error') {
            console.error('Error sending Expo push notification:', result.data);
            return { success: false, error: result.data.message };
        }

        console.log('Expo push notification sent successfully:', result);
        return { success: true, result };
    } catch (error) {
        console.error('Error sending Expo push notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send friend request notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} senderId - User sending the friend request
 * @param {string} senderName - Name of the sender
 * @param {string} requestId - Friend request ID
 */
async function sendFriendRequestNotification(recipientId, senderId, senderName, requestId) {
    return sendPushNotification(recipientId, {
        title: 'Friend Request',
        body: `${senderName} wants to be your friend`,
        data: {
            type: 'friend_request',
            from: senderId,
            fromName: senderName,
            requestId: requestId,
        },
    });
}

/**
 * Send friend request accepted notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} accepterId - User who accepted the request
 * @param {string} accepterName - Name of the accepter
 */
async function sendFriendAcceptedNotification(recipientId, accepterId, accepterName) {
    return sendPushNotification(recipientId, {
        title: 'Friend Request Accepted',
        body: `${accepterName} accepted your friend request`,
        data: {
            type: 'friend_accepted',
            from: accepterId,
            fromName: accepterName,
        },
    });
}

module.exports = {
    sendPushNotification,
    sendFriendRequestNotification,
    sendFriendAcceptedNotification,
};
