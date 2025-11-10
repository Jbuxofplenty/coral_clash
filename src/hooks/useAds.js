import { useEffect, useState } from 'react';
import { useAuth } from '../contexts';
import { shouldEnableAds } from '../utils/tracking';

/**
 * Custom hook to check if ads are enabled
 * Uses shared logic with tracking utility for consistency
 *
 * Ads are enabled if:
 * 1. Firestore featureFlags/ads mode is 'enabled' or 'test' (with env fallback)
 * 2. User is NOT an internal user (internalUser flag is false or undefined)
 *
 * This ensures internal users and testers never see ads
 */
export const useAds = () => {
    const { user } = useAuth();
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkAdsEnabled = async () => {
            try {
                const enabled = await shouldEnableAds(user);
                if (mounted) {
                    setIsEnabled(enabled);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error checking if ads enabled:', error);
                if (mounted) {
                    setIsEnabled(false);
                    setLoading(false);
                }
            }
        };

        checkAdsEnabled();

        return () => {
            mounted = false;
        };
    }, [user]);

    return { isEnabled, loading };
};

export default useAds;
