import { useMemo } from 'react';
import { useAuth } from '../contexts';

/**
 * Custom hook to check if dev features are enabled
 * Dev features are enabled if:
 * 1. EXPO_PUBLIC_ENABLE_DEV_FEATURES env var is set to 'true', OR
 * 2. User is logged in and has internalUser flag set to true in their profile
 */
export const useDevFeatures = () => {
    const { user } = useAuth();

    const isEnabled = useMemo(() => {
        // Check environment variable
        const envEnabled = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';

        // Check if user has internal user flag
        const userIsInternal = user?.internalUser === true;

        return envEnabled || userIsInternal;
    }, [user?.internalUser]);

    return isEnabled;
};

export default useDevFeatures;
