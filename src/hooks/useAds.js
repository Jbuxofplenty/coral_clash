import { useMemo } from 'react';
import { useAuth } from '../contexts';

/**
 * Custom hook to check if ads are enabled
 * Ads are enabled if:
 * 1. EXPO_PUBLIC_ENABLE_ADS env var is set to 'true', AND
 * 2. User is NOT an internal user (internalUser flag is false or undefined)
 *
 * This ensures internal users and testers never see ads
 */
export const useAds = () => {
    const { user } = useAuth();

    const isEnabled = useMemo(() => {
        // Check environment variable - ads must be explicitly enabled
        const envEnabled = process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';

        // Check if user is NOT an internal user (internal users should never see ads)
        const userIsNotInternal = user?.internalUser !== true;

        // Ads are enabled if env is true AND user is not internal
        return envEnabled && userIsNotInternal;
    }, [user?.internalUser]);

    return isEnabled;
};

export default useAds;
