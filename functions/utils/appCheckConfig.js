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

const shouldEnforceAppCheck = () => {
    // Check if enforcement is enabled via environment variable
    const enforce = process.env.ENFORCE_APP_CHECK === 'true';
    
    if (enforce) {
        console.log('🔒 App Check enforcement is ENABLED - blocking invalid tokens');
    } else {
        console.log('⚠️  App Check enforcement is DISABLED - logging only');
    }
    
    return enforce;
};

/**
 * Get App Check configuration for onCall functions
 * 
 * Returns an object with:
 * - consumeAppCheckToken: true (always consume to log usage)
 * - enforceAppCheck: based on ENFORCE_APP_CHECK env var
 */
const getAppCheckConfig = () => ({
    consumeAppCheckToken: true,  // Always consume to track usage
    enforceAppCheck: shouldEnforceAppCheck(),  // Only block if env var is true
});

module.exports = {
    getAppCheckConfig,
    shouldEnforceAppCheck,
};

