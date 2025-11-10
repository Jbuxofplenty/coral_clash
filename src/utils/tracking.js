import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * Get the current ads mode from environment
 * @returns {'enabled' | 'test' | 'disabled'} The ads mode
 */
export const getAdsMode = () => {
    const mode = process.env.EXPO_PUBLIC_ADS_MODE || 'disabled';
    if (['enabled', 'test', 'disabled'].includes(mode)) {
        return mode;
    }
    return 'disabled';
};

/**
 * Check if ads are enabled for a given user
 * Shared logic with useAds hook for consistency
 *
 * @param {Object} user - The user object (optional)
 * @returns {boolean} Whether ads are enabled (either real or test)
 */
export const shouldEnableAds = (user = null) => {
    // Get ads mode - 'enabled', 'test', or 'disabled'
    const adsMode = getAdsMode();

    // If disabled, no ads for anyone
    if (adsMode === 'disabled') {
        return false;
    }

    // If test mode, show test ads to everyone (including internal users for QA)
    if (adsMode === 'test') {
        return true;
    }

    // If enabled mode, only show real ads to non-internal users
    // Internal users should see test ads instead (handled by shouldUseTestAds)
    return user?.internalUser !== true;
};

/**
 * Check if we should use test ads
 * @param {Object} user - The user object (optional)
 * @returns {boolean} Whether to use test ad unit IDs
 */
export const shouldUseTestAds = (user = null) => {
    const adsMode = getAdsMode();

    // Always use test ads in 'test' mode
    if (adsMode === 'test') {
        return true;
    }

    // In 'enabled' mode, internal users get test ads (for QA/safety)
    if (adsMode === 'enabled' && user?.internalUser === true) {
        return true;
    }

    return false;
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
