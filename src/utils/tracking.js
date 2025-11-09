import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * Check if ads are enabled via environment variable
 * This uses the same flag as useAds hook for consistency
 */
const getAdsEnabled = () => {
    return process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';
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
 * This checks both the system permission and the environment variable
 *
 * @returns {Promise<boolean>} Whether tracking is allowed
 */
export const isTrackingAllowed = async () => {
    // Check environment variable first
    if (!getAdsEnabled()) {
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

