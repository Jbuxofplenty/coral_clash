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
        <NavigationContainer onReady={onLayoutRootView}>
            <GalioProvider theme={materialTheme}>
                <Block flex>
                    {Platform.OS === 'ios' && <StatusBar barStyle='default' />}
                    <Screens />
                </Block>
            </GalioProvider>
        </NavigationContainer>
    );
}
