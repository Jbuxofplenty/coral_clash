import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAdSize, BannerAd as GoogleBannerAd, TestIds } from 'react-native-google-mobile-ads';
import { useAuth } from '../contexts';
import { useAds } from '../hooks/useAds';
import { shouldUseTestAds } from '../utils/tracking';

// AdMob Unit IDs
// Controlled by EXPO_PUBLIC_ADS_MODE environment variable and user status:
// - 'test': Uses Google's test ad units (TestIds.BANNER) for everyone
// - 'enabled': Uses real ads for regular users, test ads for internal users
// - 'disabled': No ads shown
const getAdUnitId = (user) => {
    const useTestAds = shouldUseTestAds(user);

    return Platform.select({
        ios: useTestAds ? TestIds.BANNER : 'ca-app-pub-8519782324189160/3016478947',
        android: useTestAds ? TestIds.BANNER : 'ca-app-pub-8519782324189160/7538177884',
        default: TestIds.BANNER,
    });
};

/**
 * BannerAd component that displays AdMob banner ads
 * Automatically respects the useAds hook settings
 * Internal users always see test ads (even in 'enabled' mode)
 */
export const BannerAd = () => {
    const { user } = useAuth();
    const adsEnabled = useAds();
    const [adError, setAdError] = useState(false);
    const [failureCount, setFailureCount] = useState(0);

    // Get the appropriate ad unit ID based on current ads mode and user status
    const adUnitId = getAdUnitId(user);
    const isTestMode = shouldUseTestAds(user);

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
            adsMode: process.env.EXPO_PUBLIC_ADS_MODE,
            isTestMode,
            isInternalUser: user?.internalUser === true,
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
