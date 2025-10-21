import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
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
    const notificationListener = useRef();
    const responseListener = useRef();
    const appState = useRef(AppState.currentState);

    // Register for push notifications
    useEffect(() => {
        registerForPushNotificationsAsync().then((token) => {
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
        });

        // Listener for when notifications are received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('📱 Notification received:', notification);
                setNotification(notification);

                // Update badge count
                const newCount = badgeCount + 1;
                setBadgeCount(newCount);
                Notifications.setBadgeCountAsync(newCount);
            },
        );

        // Listener for when user taps on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                console.log('📱 Notification tapped:', response);
                const data = response.notification.request.content.data;

                // Handle navigation based on notification type
                if (data?.type === 'friend_request') {
                    // Navigate to Friends screen
                    // This will be handled by the navigation prop passed down
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
    }, [user]);

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
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

async function registerForPushNotificationsAsync() {
    let token;

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
            token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('📱 Push token:', token);
        } catch (error) {
            console.error('Error getting push token:', error);
        }
    } else {
        console.warn('Must use physical device for Push Notifications');
    }

    return token;
}
