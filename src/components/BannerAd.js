import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAdSize, BannerAd as GoogleBannerAd, TestIds } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';

// AdMob Unit IDs
// In development (__DEV__ = true): Uses Google's test ad units (TestIds.BANNER)
// In production (__DEV__ = false): Uses real ad unit IDs
const AD_UNIT_IDS = {
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
    const [failureCount, setFailureCount] = useState(0);

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
            setFailureCount(0);
        }
    }, [adsEnabled]);

    useEffect(() => {
        // Log ad configuration on mount
        console.log('📱 BannerAd configuration:', {
            platform: Platform.OS,
            adUnitId,
            isTestAd: __DEV__,
            adsEnabled,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Don't render anything if ads are disabled
    if (!adsEnabled) {
        console.log('🚫 Ads disabled via useAds hook');
        return null;
    }

    // Only hide ad after multiple consecutive failures (more forgiving for simulators)
    if (adError && failureCount > 3) {
        console.log(`🚫 Ad error - failed ${failureCount} times, not rendering banner`);
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
                    setFailureCount(0);
                }}
                onAdFailedToLoad={(error) => {
                    const newCount = failureCount + 1;
                    console.log(`❌ Ad failed to load (attempt ${newCount}):`, error);
                    setFailureCount(newCount);
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
