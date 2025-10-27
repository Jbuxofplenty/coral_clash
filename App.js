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
import { Image, Platform, StatusBar, LogBox } from 'react-native';
import { Images, materialTheme } from './src/constants/';
import Screens from './src/navigation/Screens';
import {
    AuthProvider,
    ThemeProvider,
    useTheme,
    NotificationProvider,
    GamePreferencesProvider,
    AlertProvider,
} from './src/contexts';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore expo-notifications warnings in development (keychain access issues in Expo Go)
// Also ignore Galio Input deprecation warnings (third-party library issue)
LogBox.ignoreLogs([
    '[expo-notifications]',
    'Keychain access failed',
    'Could not enable automatically registering',
    'iconColor is deprecated',
    'iconSize is deprecated',
]);

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

    return (
        <Block flex>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor='transparent'
                translucent
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
