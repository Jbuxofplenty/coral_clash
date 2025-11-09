import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * Check if ads are enabled for a given user
 * Shared logic with useAds hook for consistency
 *
 * @param {Object} user - The user object (optional)
 * @returns {boolean} Whether ads are enabled
 */
export const shouldEnableAds = (user = null) => {
    // Check environment variable - ads must be explicitly enabled
    const envEnabled = process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';

    // Check if user is NOT an internal user (internal users should never see ads)
    const userIsNotInternal = user?.internalUser !== true;

    // Ads are enabled if env is true AND user is not internal
    return envEnabled && userIsNotInternal;
};

/**
 * Request tracking permission from the user
 * This should be called after the user has had a chance to experience your app
 * and understand why you're requesting tracking permission
 *
 * @returns {Promise<boolean>} Whether tracking permission was granted
 */
export const requestTrackingPermission = async () => {
    // Only request on iOS 14+
    if (Platform.OS !== 'ios') {
        return true;
    }

    try {
        // Check if we can request tracking
        const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();

        // If already granted or denied, don't ask again
        if (currentStatus === 'granted') {
            return true;
        }

        if (currentStatus === 'denied') {
            return false;
        }

        // Request permission
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();

        return newStatus === 'granted';
    } catch (error) {
        console.error('Error requesting tracking permission:', error);
        return false;
    }
};

/**
 * Check if tracking is allowed
 * This checks both the system permission and ads settings
 *
 * @param {Object} user - The user object (optional)
 * @returns {Promise<boolean>} Whether tracking is allowed
 */
export const isTrackingAllowed = async (user = null) => {
    // Check if ads are enabled (env + internal user check)
    if (!shouldEnableAds(user)) {
        return false;
    }

    // Only check on iOS
    if (Platform.OS !== 'ios') {
        return true;
    }

    try {
        const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking tracking permission:', error);
        return false;
    }
};

/**
 * Get the current tracking permission status
 *
 * @returns {Promise<string>} The current tracking permission status
 * Possible values: 'undetermined', 'denied', 'granted', 'restricted'
 */
export const getTrackingStatus = async () => {
    if (Platform.OS !== 'ios') {
        return 'not-applicable';
    }

    try {
        const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
        return status;
    } catch (error) {
        console.error('Error getting tracking status:', error);
        return 'error';
    }
};
