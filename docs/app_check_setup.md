# Firebase App Check Setup

App Check helps protect your Firebase resources from abuse by verifying that requests come from your legitimate app.

## Current Status

✅ **Configured in code** - All functions have App Check support
⚠️ **Not enforced** - Currently logging only (won't block requests)

## How It Works

- **Client Side**: App sends a token with each request (invisible to users)
- **Server Side**: Functions verify the token (controlled by `ENFORCE_APP_CHECK` env var)
- **iOS/Android**: Uses device attestation (DeviceCheck/Play Integrity)
- **Development**: Uses debug tokens

## Enabling App Check (When Ready)

### Prerequisites

1. **Apple DeviceCheck** (for iOS):
   - Already configured in Apple Developer account
   - Automatically works with App Store builds

2. **Google Play Integrity** (for Android):
   - Configure in Firebase Console → App Check
   - Link your app's signing certificate

### Steps to Enable

#### 1. Test in Development

The app already sends App Check tokens in development (debug mode).

#### 2. Configure Production Providers

**iOS - DeviceCheck** (automatic):

```bash
# Go to Firebase Console → App Check → Apps
# Select your iOS app → Register with DeviceCheck provider
```

**Android - Play Integrity**:

```bash
# Go to Firebase Console → App Check → Apps
# Select your Android app → Register with Play Integrity API
# Add your SHA-256 certificate fingerprints
```

#### 3. Enable Enforcement

Once providers are configured and tested:

```bash
# Set the environment variable in Firebase
firebase functions:config:set app_check.enforce=true

# Redeploy functions
firebase deploy --only functions
```

#### 4. Verify

Check Firebase Console → App Check → Metrics to see token usage.

## Disabling App Check

If you need to disable enforcement:

```bash
# Unset the environment variable
firebase functions:config:unset app_check.enforce

# Redeploy functions
firebase deploy --only functions
```

Or set it to false:

```bash
firebase functions:config:set app_check.enforce=false
firebase deploy --only functions
```

## Environment Variable

The `ENFORCE_APP_CHECK` environment variable controls enforcement:

- **Not set** or **false**: Logs tokens but doesn't block invalid/missing tokens
- **true**: Blocks requests without valid App Check tokens

```javascript
// In functions/utils/appCheckConfig.js
const shouldEnforceAppCheck = () => {
  return process.env.ENFORCE_APP_CHECK === 'true';
};
```

## Testing

### Development

App Check uses debug tokens automatically when `__DEV__` is true.

### Staging/Production

1. Build and deploy to TestFlight/Internal Testing
2. Test login and game actions
3. Check Firebase Console → App Check → Metrics
4. Enable enforcement once tokens are flowing

## Troubleshooting

### "App Check token is invalid"

- **iOS**: Ensure DeviceCheck is enabled in Firebase Console
- **Android**: Verify SHA-256 fingerprints are correct in Play Integrity setup
- **Both**: Check Firebase Console → App Check → Apps for provider status

### Tokens not showing in metrics

- Verify `consumeAppCheckToken: true` in function configs
- Check client-side App Check initialization in `src/config/firebase.js`
- Look for console warnings about App Check initialization

### Development issues

- Debug tokens should work automatically
- If not, check `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` in firebase.js
- Try clearing app data/cache

## Benefits

- 🛡️ **Abuse Prevention**: Blocks scrapers, bots, and modified apps
- 📊 **Usage Analytics**: Monitor legitimate vs suspicious requests
- 🔒 **Defense in Depth**: Additional layer beyond Firebase Auth
- 👻 **Invisible to Users**: No CAPTCHAs or extra steps for mobile users

## Current Security

Even without App Check enforcement, your app is secure because:

- ✅ All functions require Firebase Authentication
- ✅ Server-side game validation prevents cheating
- ✅ Firestore security rules enforce data access
- ✅ API keys are just identifiers (not secrets)

App Check adds an extra layer to block abuse at scale.
