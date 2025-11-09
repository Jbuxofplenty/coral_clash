import { useMemo } from 'react';
import { useAuth } from '../contexts';
import { shouldEnableAds } from '../utils/tracking';

/**
 * Custom hook to check if ads are enabled
 * Uses shared logic with tracking utility for consistency
 *
 * Ads are enabled if:
 * 1. EXPO_PUBLIC_ENABLE_ADS env var is set to 'true', AND
 * 2. User is NOT an internal user (internalUser flag is false or undefined)
 *
 * This ensures internal users and testers never see ads
 */
export const useAds = () => {
    const { user } = useAuth();

    const isEnabled = useMemo(() => {
        return shouldEnableAds(user);
    }, [user]);

    return isEnabled;
};

export default useAds;
