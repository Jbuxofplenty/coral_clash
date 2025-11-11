import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import { getAdsMode } from './featureFlags';

/**
 * Check if ads are enabled for a given user
 * Shared logic with useAds hook for consistency
 *
 * @param {Object} user - The user object (optional)
 * @returns {Promise<boolean>} Whether ads are enabled (either real or test)
 */
export const shouldEnableAds = async (_user = null) => {
    // Get ads mode - 'enabled', 'test', or 'disabled'
    const adsMode = await getAdsMode();

    // If disabled, no ads for anyone
    if (adsMode === 'disabled') {
        return false;
    }

    // If test mode, show test ads to everyone (including internal users for QA)
    if (adsMode === 'test') {
        return true;
    }

    // If enabled mode
    return true;
};

/**
 * Check if we should use test ads
 * @param {Object} user - The user object (optional)
 * @returns {Promise<boolean>} Whether to use test ad unit IDs
 */
export const shouldUseTestAds = async (user = null) => {
    const adsMode = await getAdsMode();

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
 * Only requests if ads are actually enabled (not in disabled mode)
 * This should be called after the user has had a chance to experience your app
 * and understand why you're requesting tracking permission
 *
 * @param {Object} user - The user object (optional, for checking if ads are enabled)
 * @returns {Promise<boolean>} Whether tracking permission was granted
 */
export const requestTrackingPermission = async (user = null) => {
    // Only request if ads are enabled (no point asking for tracking if no ads)
    const adsEnabled = await shouldEnableAds(user);
    if (!adsEnabled) {
        console.log('🚫 Skipping ATT request - ads are not enabled');
        return false;
    }

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
        const adsMode = await getAdsMode();
        console.log('📱 Requesting ATT permission (ads mode:', adsMode, ')');
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();

        return newStatus === 'granted';
    } catch (error) {
        console.error('Error requesting tracking permission:', error);
        return false;
    }
};

/**
 * Check if tracking is allowed
 * Only relevant if ads are enabled - returns false if ads disabled
 * This checks both the system permission and ads settings
 *
 * @param {Object} user - The user object (optional)
 * @returns {Promise<boolean>} Whether tracking is allowed
 */
export const isTrackingAllowed = async (user = null) => {
    // No tracking needed if ads are disabled
    const adsEnabled = await shouldEnableAds(user);
    if (!adsEnabled) {
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
 * Note: Only relevant if ads are enabled
 *
 * @returns {Promise<string>} The current tracking permission status
 * Possible values: 'undetermined', 'denied', 'granted', 'restricted', 'not-applicable', 'disabled'
 */
export const getTrackingStatus = async (user = null) => {
    const adsEnabled = await shouldEnableAds(user);
    if (!adsEnabled) {
        return 'disabled';
    }

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
