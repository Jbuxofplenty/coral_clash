/**
 * App Check Configuration
 *
 * Controls whether App Check is enforced for Cloud Functions.
 *
 * Environment Variables:
 * - ENFORCE_APP_CHECK: Set to 'true' to enforce App Check (reject invalid tokens)
 *
 * Setup Steps to Enable:
 * 1. Configure Apple DeviceCheck in Firebase Console
 * 2. Configure Google Play Integrity in Firebase Console
 * 3. Test with debug tokens in development
 * 4. Set ENFORCE_APP_CHECK=true in Firebase Functions config:
 *    firebase functions:config:set app_check.enforce=true
 * 5. Redeploy functions
 */

// Cache the enforcement setting to avoid repeated checks and logs
let _enforceAppCheck = null;
let _hasLogged = false;

export const shouldEnforceAppCheck = () => {
    // Return cached value if already determined
    if (_enforceAppCheck !== null) {
        return _enforceAppCheck;
    }

    // Check if enforcement is enabled via environment variable
    _enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';

    // Only log once on first call
    if (!_hasLogged) {
        if (_enforceAppCheck) {
            console.log('🔒 App Check enforcement is ENABLED - blocking invalid tokens');
        } else {
            console.log('⚠️  App Check enforcement is DISABLED - logging only');
        }
        _hasLogged = true;
    }

    return _enforceAppCheck;
};

/**
 * Get the function region (defaults to us-central1 to match Firestore)
 * This ensures functions and Firestore are in the same region for lower latency
 */
export const getFunctionRegion = () => process.env.FUNCTION_REGION || 'us-central1';

/**
 * Get App Check configuration for onCall functions
 *
 * Returns an object with:
 * - consumeAppCheckToken: true (always consume to log usage)
 * - enforceAppCheck: based on ENFORCE_APP_CHECK env var
 * - region: Function region (defaults to us-central1 to match Firestore)
 */
export const getAppCheckConfig = () => ({
    consumeAppCheckToken: true, // Always consume to track usage
    enforceAppCheck: shouldEnforceAppCheck(), // Only block if env var is true
    region: getFunctionRegion(), // Match Firestore region for lower latency
});
