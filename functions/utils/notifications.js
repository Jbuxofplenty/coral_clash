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

/**
 * Send game request notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} senderId - User sending the game request
 * @param {string} senderName - Name of the sender
 * @param {string} gameId - Game ID
 * @param {string} avatarKey - Avatar key of the sender
 */
async function sendGameRequestNotification(recipientId, senderId, senderName, gameId, avatarKey) {
    return sendPushNotification(recipientId, {
        title: 'Game Request',
        body: `${senderName} wants to play Coral Clash with you`,
        data: {
            type: 'game_request',
            from: senderId,
            fromName: senderName,
            gameId: gameId,
            displayName: senderName,
            avatarKey: avatarKey || 'dolphin',
        },
    });
}

/**
 * Send game request accepted notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} accepterId - User who accepted the request
 * @param {string} accepterName - Name of the accepter
 * @param {string} gameId - Game ID
 */
async function sendGameAcceptedNotification(recipientId, accepterId, accepterName, gameId) {
    return sendPushNotification(recipientId, {
        title: 'Game Request Accepted',
        body: `${accepterName} accepted your game request`,
        data: {
            type: 'game_accepted',
            from: accepterId,
            fromName: accepterName,
            gameId: gameId,
        },
    });
}

/**
 * Send opponent move notification (works for both PvP and computer)
 * @param {string} userId - User receiving the notification
 * @param {string} gameId - Game ID
 * @param {string} opponentId - Opponent's ID ('computer' or user ID)
 * @param {string} opponentName - Opponent's display name
 */
async function sendOpponentMoveNotification(userId, gameId, opponentId, opponentName) {
    const isComputer = opponentId === 'computer';
    const body = isComputer ? 'The computer made a move' : `${opponentName} made a move`;

    return sendPushNotification(userId, {
        title: 'Your Turn',
        body: body,
        data: {
            type: 'move_made',
            gameId: gameId,
            from: opponentId,
            fromName: opponentName,
            isComputer: isComputer,
        },
    });
}

/**
 * Send undo request notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} senderId - User requesting the undo
 * @param {string} senderName - Name of the requester
 * @param {string} gameId - Game ID
 * @param {number} moveCount - Number of moves to undo
 */
async function sendUndoRequestNotification(recipientId, senderId, senderName, gameId, moveCount) {
    return sendPushNotification(recipientId, {
        title: 'Undo Request',
        body: `${senderName} wants to undo ${moveCount} move(s)`,
        data: {
            type: 'undo_requested',
            from: senderId,
            displayName: senderName,
            gameId: gameId,
            moveCount: moveCount.toString(),
        },
    });
}

/**
 * Send undo approved notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} approverId - User who approved the undo
 * @param {string} approverName - Name of the approver
 * @param {string} gameId - Game ID
 * @param {number} moveCount - Number of moves undone
 */
async function sendUndoApprovedNotification(
    recipientId,
    approverId,
    approverName,
    gameId,
    moveCount,
) {
    return sendPushNotification(recipientId, {
        title: 'Undo Approved',
        body: `${approverName} approved your undo request`,
        data: {
            type: 'undo_approved',
            from: approverId,
            displayName: approverName,
            gameId: gameId,
            moveCount: moveCount.toString(),
        },
    });
}

/**
 * Send undo rejected notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} rejecterId - User who rejected the undo
 * @param {string} rejecterName - Name of the rejecter
 * @param {string} gameId - Game ID
 * @param {number} moveCount - Number of moves requested to undo
 */
async function sendUndoRejectedNotification(
    recipientId,
    rejecterId,
    rejecterName,
    gameId,
    moveCount,
) {
    return sendPushNotification(recipientId, {
        title: 'Undo Rejected',
        body: `${rejecterName} declined your undo request`,
        data: {
            type: 'undo_rejected',
            from: rejecterId,
            displayName: rejecterName,
            gameId: gameId,
            moveCount: moveCount.toString(),
        },
    });
}

/**
 * Send undo cancelled notification (when requester cancels their own request)
 * @param {string} recipientId - User receiving the notification (the opponent)
 * @param {string} cancellerId - User who cancelled the undo request
 * @param {string} cancellerName - Name of the canceller
 * @param {string} gameId - Game ID
 */
async function sendUndoCancelledNotification(recipientId, cancellerId, cancellerName, gameId) {
    return sendPushNotification(recipientId, {
        title: 'Undo Request Cancelled',
        body: `${cancellerName} cancelled their undo request`,
        data: {
            type: 'undo_cancelled',
            from: cancellerId,
            displayName: cancellerName,
            gameId: gameId,
        },
    });
}

/**
 * Send reset approved notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} approverId - User who approved the reset
 * @param {string} approverName - Name of the approver
 * @param {string} gameId - Game ID
 */
async function sendResetApprovedNotification(recipientId, approverId, approverName, gameId) {
    return sendPushNotification(recipientId, {
        title: 'Reset Approved',
        body: `${approverName} approved your reset request`,
        data: {
            type: 'reset_approved',
            from: approverId,
            displayName: approverName,
            gameId: gameId,
        },
    });
}

/**
 * Send reset rejected notification
 * @param {string} recipientId - User receiving the notification
 * @param {string} rejecterId - User who rejected the reset
 * @param {string} rejecterName - Name of the rejecter
 * @param {string} gameId - Game ID
 */
async function sendResetRejectedNotification(recipientId, rejecterId, rejecterName, gameId) {
    return sendPushNotification(recipientId, {
        title: 'Reset Rejected',
        body: `${rejecterName} declined your reset request`,
        data: {
            type: 'reset_rejected',
            from: rejecterId,
            displayName: rejecterName,
            gameId: gameId,
        },
    });
}

/**
 * Send reset cancelled notification (when requester cancels their own request)
 * @param {string} recipientId - User receiving the notification (the opponent)
 * @param {string} cancellerId - User who cancelled the reset request
 * @param {string} cancellerName - Name of the canceller
 * @param {string} gameId - Game ID
 */
async function sendResetCancelledNotification(recipientId, cancellerId, cancellerName, gameId) {
    return sendPushNotification(recipientId, {
        title: 'Reset Request Cancelled',
        body: `${cancellerName} cancelled their reset request`,
        data: {
            type: 'reset_cancelled',
            from: cancellerId,
            displayName: cancellerName,
            gameId: gameId,
        },
    });
}

module.exports = {
    sendPushNotification,
    sendFriendRequestNotification,
    sendFriendAcceptedNotification,
    sendGameRequestNotification,
    sendGameAcceptedNotification,
    sendOpponentMoveNotification,
    sendUndoRequestNotification,
    sendUndoApprovedNotification,
    sendUndoRejectedNotification,
    sendUndoCancelledNotification,
    sendResetApprovedNotification,
    sendResetRejectedNotification,
    sendResetCancelledNotification,
};
