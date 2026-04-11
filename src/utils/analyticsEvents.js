import { analytics, auth } from '../config/firebase';

/**
 * Centralized Firebase Analytics event logging utility.
 *
 * All events are automatically tagged with `user_type` ('signed_in' or 'anonymous')
 * based on the current Firebase Auth state. This ensures consistent tracking of
 * signed-in vs anonymous user behavior across every event in the app.
 *
 * Usage:
 *   import { logAnalyticsEvent } from '../utils/analyticsEvents';
 *   logAnalyticsEvent('game_finish', { opponent_type: 'computer', result: 'win' });
 */

/**
 * Get the current user type based on Firebase Auth state.
 * Reads directly from the auth instance (not from React context)
 * so it works in both component and non-component code.
 *
 * @returns {'signed_in' | 'anonymous'} The current user type
 */
const getUserType = () => {
    const currentUser = auth?.currentUser;
    if (currentUser && !currentUser.isAnonymous) {
        return 'signed_in';
    }
    return 'anonymous';
};

/**
 * Log an analytics event with automatic user_type injection.
 *
 * @param {string} eventName - The event name (e.g. 'game_finish', 'login')
 * @param {Object} params - Additional event parameters
 */
export const logAnalyticsEvent = (eventName, params = {}) => {
    if (!analytics) {
        return;
    }

    try {
        analytics.logEvent(eventName, {
            ...params,
            user_type: getUserType(),
        });
    } catch (error) {
        console.warn(`⚠️ Failed to log analytics event '${eventName}':`, error.message);
    }
};

/**
 * Set the persistent user_type user property in Firebase Analytics.
 * This should be called on every auth state change so that Firebase
 * Analytics dashboards can segment users by type.
 *
 * @param {boolean} isSignedIn - Whether the user is signed in
 */
export const setUserTypeProperty = (isSignedIn) => {
    if (!analytics) {
        return;
    }

    try {
        const userType = isSignedIn ? 'signed_in' : 'anonymous';
        analytics.setUserProperties({ user_type: userType });
    } catch (error) {
        console.warn('⚠️ Failed to set user_type property:', error.message);
    }
};
