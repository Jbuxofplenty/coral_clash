/*!

 =========================================================
 * Material Kit React Native - v1.10.1
 =========================================================
 * Product Page: https://demos.creative-tim.com/material-kit-react-native/
 * Copyright 2019 Creative Tim (http://www.creative-tim.com)
 * Licensed under MIT (https://github.com/creativetimofficial/material-kit-react-native/blob/master/LICENSE)
 =========================================================
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import { NavigationContainer } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { Block, GalioProvider } from 'galio-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, StatusBar } from 'react-native';
import { Images, materialTheme } from './src/constants/';
import Screens from './src/navigation/Screens';
import {
    AuthProvider,
    ThemeProvider,
    useTheme,
    NotificationProvider,
    useNotifications,
    GamePreferencesProvider,
    AlertProvider,
} from './src/contexts';
import { NotificationDropdown } from './src/components';
import { httpsCallable } from 'firebase/functions';
import { functions } from './src/config/firebase';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Before rendering any navigation stack
import { enableScreens } from 'react-native-screens';
enableScreens();

// cache app images
const assetImages = [];

function cacheImages(images) {
    return images.map((image) => {
        if (typeof image === 'string') {
            return Image.prefetch(image);
        } else {
            return Asset.fromModule(image).downloadAsync();
        }
    });
}

function AppContent({ navigationRef }) {
    const { isDarkMode } = useTheme();
    const { notification, dismissNotification, decrementBadge } = useNotifications();

    const handleAccept = async (notificationData) => {
        try {
            const notificationType = notificationData.data.type;

            if (notificationType === 'game_request') {
                // Accept game request
                const respondToGameInvite = httpsCallable(functions, 'respondToGameInvite');
                const result = await respondToGameInvite({
                    gameId: notificationData.data.gameId,
                    accept: true,
                });

                // Navigate to game
                if (result.data.gameId && navigationRef.current) {
                    navigationRef.current.navigate('Game', {
                        gameId: result.data.gameId,
                        isPvP: true,
                    });
                }
            } else if (notificationType === 'friend_request') {
                // Accept friend request
                const respondToFriendRequest = httpsCallable(functions, 'respondToFriendRequest');
                await respondToFriendRequest({
                    requestId: notificationData.data.requestId,
                    accept: true,
                });
            } else if (notificationType === 'reset_requested') {
                // Approve reset request
                const respondToResetRequest = httpsCallable(functions, 'respondToResetRequest');
                await respondToResetRequest({
                    gameId: notificationData.data.gameId,
                    approve: true,
                });
            } else if (notificationType === 'undo_requested') {
                // Approve undo request
                const respondToUndoRequest = httpsCallable(functions, 'respondToUndoRequest');
                await respondToUndoRequest({
                    gameId: notificationData.data.gameId,
                    approve: true,
                });
            }

            decrementBadge();
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleDecline = async (notificationData) => {
        try {
            const notificationType = notificationData.data.type;

            if (notificationType === 'game_request') {
                // Decline game request
                const respondToGameInvite = httpsCallable(functions, 'respondToGameInvite');
                await respondToGameInvite({
                    gameId: notificationData.data.gameId,
                    accept: false,
                });
            } else if (notificationType === 'friend_request') {
                // Decline friend request
                const respondToFriendRequest = httpsCallable(functions, 'respondToFriendRequest');
                await respondToFriendRequest({
                    requestId: notificationData.data.requestId,
                    accept: false,
                });
            } else if (notificationType === 'reset_requested') {
                // Reject reset request
                const respondToResetRequest = httpsCallable(functions, 'respondToResetRequest');
                await respondToResetRequest({
                    gameId: notificationData.data.gameId,
                    approve: false,
                });
            } else if (notificationType === 'undo_requested') {
                // Reject undo request
                const respondToUndoRequest = httpsCallable(functions, 'respondToUndoRequest');
                await respondToUndoRequest({
                    gameId: notificationData.data.gameId,
                    approve: false,
                });
            }

            decrementBadge();
        } catch (error) {
            console.error('Error declining request:', error);
        }
    };

    const handleNotificationTap = (notificationData) => {
        const notificationType = notificationData.data.type;

        // Navigate based on notification type
        if (navigationRef.current) {
            switch (notificationType) {
                case 'move_made':
                case 'game_accepted':
                case 'reset_approved':
                case 'reset_rejected':
                case 'reset_cancelled':
                case 'undo_approved':
                case 'undo_rejected':
                case 'undo_cancelled':
                case 'undo_requested':
                case 'reset_requested':
                    // Navigate to the game
                    if (notificationData.data.gameId) {
                        navigationRef.current.navigate('Game', {
                            gameId: notificationData.data.gameId,
                            isPvP: true,
                        });
                    }
                    break;

                case 'friend_accepted':
                    // Navigate to Friends screen
                    navigationRef.current.navigate('Friends');
                    break;

                case 'game_over':
                    // Could navigate to game history or results
                    if (notificationData.data.gameId) {
                        navigationRef.current.navigate('Game', {
                            gameId: notificationData.data.gameId,
                            isPvP: true,
                        });
                    }
                    break;

                default:
                    break;
            }
        }

        decrementBadge();
    };

    // Extract notification data for the dropdown
    const notificationDropdownData = notification
        ? {
              displayName: notification.request.content.data.displayName,
              avatarKey: notification.request.content.data.avatarKey,
              data: notification.request.content.data,
          }
        : null;

    return (
        <Block flex>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor='transparent'
                translucent
            />
            <NotificationDropdown
                notification={notificationDropdownData}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onDismiss={dismissNotification}
                onTap={handleNotificationTap}
            />
            <Screens />
        </Block>
    );
}

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);
    const navigationRef = React.useRef(null);

    useEffect(() => {
        async function prepare() {
            try {
                //Load Resources
                await _loadResourcesAsync();
            } catch (e) {
                console.warn(e);
            } finally {
                // Tell the application to render
                setAppIsReady(true);
            }
        }
        prepare();
    }, []);

    const _loadResourcesAsync = async () => {
        try {
            await Promise.all([...cacheImages(assetImages)]);
        } catch (e) {
            console.warn('Error loading resources:', e);
        }
    };

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    if (!appIsReady) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <ThemeProvider>
                    <AlertProvider>
                        <GamePreferencesProvider>
                            <NotificationProvider>
                                <NavigationContainer ref={navigationRef} onReady={onLayoutRootView}>
                                    <GalioProvider theme={materialTheme}>
                                        <AppContent navigationRef={navigationRef} />
                                    </GalioProvider>
                                </NavigationContainer>
                            </NotificationProvider>
                        </GamePreferencesProvider>
                    </AlertProvider>
                </ThemeProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
