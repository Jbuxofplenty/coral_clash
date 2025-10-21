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
import { Images, materialTheme, products } from './src/constants/';
import Screens from './src/navigation/Screens';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
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
const assetImages = [Images.Home];

// cache product images
products.map((product) => product.image && assetImages.push(product.image));

function cacheImages(images) {
    return images.map((image) => {
        if (typeof image === 'string') {
            return Image.prefetch(image);
        } else {
            return Asset.fromModule(image).downloadAsync();
        }
    });
}

function AppContent() {
    const { isDarkMode } = useTheme();
    const { notification, dismissNotification, decrementBadge } = useNotifications();

    const handleAccept = async (notificationData) => {
        try {
            const respondToFriendRequest = httpsCallable(functions, 'respondToFriendRequest');
            await respondToFriendRequest({
                requestId: notificationData.data.requestId,
                accept: true,
            });

            decrementBadge();
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const handleDecline = async (notificationData) => {
        try {
            const respondToFriendRequest = httpsCallable(functions, 'respondToFriendRequest');
            await respondToFriendRequest({
                requestId: notificationData.data.requestId,
                accept: false,
            });

            decrementBadge();
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
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
            />
            <Screens />
        </Block>
    );
}

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);

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
                    <NotificationProvider>
                        <NavigationContainer onReady={onLayoutRootView}>
                            <GalioProvider theme={materialTheme}>
                                <AppContent />
                            </GalioProvider>
                        </NavigationContainer>
                    </NotificationProvider>
                </ThemeProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
