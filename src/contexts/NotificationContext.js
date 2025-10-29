import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

// Ref to track active game ID for notification filtering
// This needs to be outside the component so the handler can access it
const activeGameIdRef = { current: null };

// Notification types that should be suppressed when user is viewing that game
export const SUPPRESSIBLE_NOTIFICATION_TYPES = [
    'move_made',
    'game_accepted',
    'reset_approved',
    'reset_rejected',
    'reset_cancelled',
    'undo_approved',
    'undo_rejected',
    'undo_cancelled',
    'undo_requested',
    'reset_requested',
    'game_over',
];

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const notificationData = notification.request.content.data;
        const notificationType = notificationData?.type;
        const notificationGameId = notificationData?.gameId;

        // Check if this notification should be suppressed for the currently active game
        // Suppress game-related notifications if user is viewing that game
        const shouldSuppress =
            SUPPRESSIBLE_NOTIFICATION_TYPES.includes(notificationType) &&
            notificationGameId &&
            notificationGameId === activeGameIdRef.current;

        return {
            shouldShowAlert: false, // Deprecated but keeping for backwards compatibility
            shouldShowBanner: !shouldSuppress, // Don't show banner if suppressed
            shouldPlaySound: !shouldSuppress, // Don't play sound if suppressed
            shouldSetBadge: !shouldSuppress, // Don't update badge if suppressed
        };
    },
});

const NotificationContext = createContext({});

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(null);
    const [badgeCount, setBadgeCount] = useState(0);
    const [activeGameId, setActiveGameId] = useState(null);
    const [gameStatusUpdate, setGameStatusUpdate] = useState(null); // For showing status even when suppressed
    const notificationListener = useRef();
    const responseListener = useRef();
    const appState = useRef(AppState.currentState);

    // Keep shared ref in sync with state for notification handler
    useEffect(() => {
        activeGameIdRef.current = activeGameId;
    }, [activeGameId]);

    // Register for push notifications
    useEffect(() => {
        registerForPushNotificationsAsync()
            .then((token) => {
                if (token) {
                    setExpoPushToken(token);
                    // Save token to user's Firestore document if logged in
                    if (user?.uid) {
                        updateDoc(doc(db, 'users', user.uid), {
                            pushToken: token,
                            pushTokenUpdatedAt: new Date().toISOString(),
                        }).catch((error) => console.error('Error saving push token:', error));
                    }
                }
            })
            .catch(() => {
                // Silently handle registration errors (common in simulators/Expo Go)
            });

        // Listener for when notifications are received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (receivedNotification) => {
                const notificationData = receivedNotification.request.content.data;
                const notificationType = notificationData?.type;
                const notificationGameId = notificationData?.gameId;

                // Filter out game-related notifications if user is viewing that game
                // (The notification handler already suppressed the banner/sound/badge)
                const shouldSuppress =
                    SUPPRESSIBLE_NOTIFICATION_TYPES.includes(notificationType) &&
                    notificationGameId === activeGameIdRef.current;

                // Special handling: Show status updates even when suppressed for certain types
                const statusUpdateTypes = [
                    'reset_approved',
                    'reset_rejected',
                    'undo_approved',
                    'undo_rejected',
                ];

                if (
                    shouldSuppress &&
                    statusUpdateTypes.includes(notificationType) &&
                    notificationGameId === activeGameIdRef.current
                ) {
                    // Set game status update that Game screen can display
                    setGameStatusUpdate({
                        type: notificationType,
                        gameId: notificationGameId,
                        timestamp: Date.now(),
                    });
                    return; // Still suppress the notification itself
                }

                if (shouldSuppress) {
                    return; // Don't store in state or show dropdown
                }

                setNotification(receivedNotification);

                // Update badge count - use functional update to avoid stale closure
                setBadgeCount((prevCount) => {
                    const newCount = prevCount + 1;
                    Notifications.setBadgeCountAsync(newCount);
                    return newCount;
                });
            },
        );

        // Listener for when user taps on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;

                // Handle navigation based on notification type
                // Navigation is handled by the useNotificationHandlers hook
                if (data?.type) {
                    // Notification types: friend_request, game_request, game_accepted, etc.
                    // The actual navigation logic is in useNotificationHandlers
                }
            },
        );

        // Handle app state changes
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground, refresh badge count
                refreshBadgeCount();
            }
            appState.current = nextAppState;
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
            subscription?.remove();
        };
    }, [user?.uid]); // Only re-run when user ID changes, not when entire user object changes

    // Auto-dismiss move, undo, and reset request notifications when user navigates to that game
    useEffect(() => {
        if (!notification || !activeGameId) return;

        const notificationData = notification.request.content.data;
        const notificationType = notificationData?.type;
        const notificationGameId = notificationData?.gameId;

        // Dismiss if it's a game-related notification and user is now viewing that game
        if (
            SUPPRESSIBLE_NOTIFICATION_TYPES.includes(notificationType) &&
            notificationGameId === activeGameId
        ) {
            setNotification(null);
        }
    }, [notification, activeGameId]);

    const refreshBadgeCount = async () => {
        // In a real app, fetch unread notifications count from Firebase
        // For now, we'll just get the current badge count
        const count = await Notifications.getBadgeCountAsync();
        setBadgeCount(count);
    };

    const clearBadge = async () => {
        await Notifications.setBadgeCountAsync(0);
        setBadgeCount(0);
    };

    const decrementBadge = async () => {
        const newCount = Math.max(0, badgeCount - 1);
        await Notifications.setBadgeCountAsync(newCount);
        setBadgeCount(newCount);
    };

    const dismissNotification = () => {
        setNotification(null);
    };

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken,
                notification,
                badgeCount,
                dismissNotification,
                clearBadge,
                decrementBadge,
                refreshBadgeCount,
                setActiveGameId,
                gameStatusUpdate,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

async function registerForPushNotificationsAsync() {
    let token;

    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Failed to get push token for push notification!');
                return;
            }

            try {
                // Get push token - may fail in Expo Go due to keychain access
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } catch (_error) {
                // Silently handle - common in simulators and Expo Go
            }
        } else {
            console.warn('Must use physical device for Push Notifications');
        }
    } catch (error) {
        console.warn('Push notification setup failed:', error.message);
    }

    return token;
}
