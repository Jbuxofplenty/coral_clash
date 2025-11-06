import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAdSize, BannerAd as GoogleBannerAd, TestIds } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';

// AdMob Unit IDs (replace with your actual IDs before production)
const AD_UNIT_IDS = {
    // Always use test IDs in development for testing
    ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-8519782324189160/3016478947',
    android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-8519782324189160/7538177884',
};

/**
 * BannerAd component that displays AdMob banner ads
 * Automatically respects the useAds hook settings
 */
export const BannerAd = () => {
    const adsEnabled = useAds();
    const [adError, setAdError] = useState(false);

    // Get the appropriate ad unit ID for the platform
    const adUnitId = Platform.select({
        ios: AD_UNIT_IDS.ios,
        android: AD_UNIT_IDS.android,
        default: TestIds.BANNER,
    });

    useEffect(() => {
        // Reset state when ads are toggled
        if (!adsEnabled) {
            setAdError(false);
        }
    }, [adsEnabled]);

    // Don't render anything if ads are disabled
    if (!adsEnabled) {
        console.log('🚫 Ads disabled via useAds hook');
        return null;
    }

    // Don't render if there was an error loading the ad
    if (adError) {
        console.log('🚫 Ad error - not rendering banner');
        return null;
    }

    return (
        <View style={styles.container}>
            <GoogleBannerAd
                unitId={adUnitId}
                size={BannerAdSize.BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                }}
                onAdLoaded={() => {
                    console.log('✅ Ad loaded successfully');
                    setAdError(false);
                }}
                onAdFailedToLoad={(error) => {
                    console.log('❌ Ad failed to load:', error);
                    setAdError(true);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        width: '100%',
    },
});

export default BannerAd;
