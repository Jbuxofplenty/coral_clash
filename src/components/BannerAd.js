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
const getAdUnitId = async (user) => {
    const useTestAds = await shouldUseTestAds(user);

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
    const { isEnabled: adsEnabled, loading: adsLoading } = useAds();
    const [adError, setAdError] = useState(false);
    const [failureCount, setFailureCount] = useState(0);
    const [adUnitId, setAdUnitId] = useState(TestIds.BANNER);
    const [isTestMode, setIsTestMode] = useState(true);

    // Get the appropriate ad unit ID based on current ads mode and user status
    useEffect(() => {
        let mounted = true;

        const loadAdConfig = async () => {
            try {
                const unitId = await getAdUnitId(user);
                const testMode = await shouldUseTestAds(user);
                
                if (mounted) {
                    setAdUnitId(unitId);
                    setIsTestMode(testMode);
                }
            } catch (error) {
                console.error('Error loading ad config:', error);
            }
        };

        loadAdConfig();

        return () => {
            mounted = false;
        };
    }, [user]);

    useEffect(() => {
        // Reset state when ads are toggled
        if (!adsEnabled) {
            setAdError(false);
            setFailureCount(0);
        }
    }, [adsEnabled]);

    useEffect(() => {
        // Log ad configuration when ready
        if (!adsLoading && adsEnabled) {
            console.log('📱 BannerAd configuration:', {
                platform: Platform.OS,
                adUnitId,
                isTestMode,
                isInternalUser: user?.internalUser === true,
                adsEnabled,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adsLoading, adsEnabled]);

    // Don't render anything while loading or if ads are disabled
    if (adsLoading || !adsEnabled) {
        if (!adsEnabled && !adsLoading) {
            console.log('🚫 Ads disabled via useAds hook');
        }
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
