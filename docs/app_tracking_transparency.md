# App Tracking Transparency (ATT) Setup Guide

This document explains how App Tracking Transparency has been implemented in Coral Clash and how to manage it in App Store Connect.

## Overview

App Tracking Transparency (ATT) is an iOS 14+ requirement that requires apps to ask users for permission before tracking them across apps and websites owned by other companies.

## Implementation

### 1. Package Installation

We're using `expo-tracking-transparency` package which provides native module support for ATT:

```bash
yarn add expo-tracking-transparency
```

### 2. App Configuration

#### app.json Changes

Added ATT configuration in the iOS section:

- **Plugin**: Added `expo-tracking-transparency` to plugins array
- **NSUserTrackingUsageDescription**: Added explanation text that users will see in the permission dialog

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "We use tracking to provide personalized ads and improve your gaming experience. Your privacy is important to us."
      }
    },
    "plugins": [
      "expo-tracking-transparency"
    ]
  }
}
```

#### Best Practices for Permission Message

The message should:
- Be clear and concise
- Explain the benefit to the user
- Be honest about how tracking is used
- Respect user privacy

### 3. Code Implementation

#### Tracking Utility (`src/utils/tracking.js`)

Created a utility module with:

- **Environment variable integration**: Uses `EXPO_PUBLIC_ENABLE_ADS` to control tracking (currently `false` in `.env.production`)
- **`requestTrackingPermission()`**: Requests ATT permission from user
- **`isTrackingAllowed()`**: Checks if tracking is currently allowed
- **`getTrackingStatus()`**: Gets current permission status

#### Login Screen Integration

Added tracking permission request after successful login:

```javascript
import { requestTrackingPermission } from '../utils/tracking';

React.useEffect(() => {
    const requestPermission = async () => {
        if (user) {
            setTimeout(async () => {
                try {
                    const granted = await requestTrackingPermission();
                    console.log('📊 Tracking permission granted:', granted);
                } catch (error) {
                    console.error('📊 Error requesting tracking permission:', error);
                }
            }, 1000);
        }
    };
    requestPermission();
}, [user]);
```

**Why after login?**
- Users understand the value of your app
- Provides context for why tracking is beneficial
- Better approval rates than requesting immediately on app launch

## Environment Variable System

The `EXPO_PUBLIC_ENABLE_ADS` environment variable controls whether ads are active:

**In `.env.production`:**
```bash
EXPO_PUBLIC_ENABLE_ADS=false  # Set to 'true' when ready to show ads
```

**Current State**: 
- ATT permission is requested (required for App Store approval)
- But ads won't actually show until `EXPO_PUBLIC_ENABLE_ADS=true`
- This lets you get App Store approval now, enable ads later
- Consistent with the existing `useAds` hook in `src/hooks/useAds.js`

**When to Enable Ads:**
1. Change `EXPO_PUBLIC_ENABLE_ADS` to `true` in `.env.production`
2. Ensure ad implementation is tested and working
3. Rebuild and deploy new version to production

## App Store Connect Configuration

### Step 1: Access App Privacy Settings

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (Coral Clash)
3. Go to **App Information** section
4. Scroll to **App Privacy** section

### Step 2: Update Privacy Information

Click **Edit** next to App Privacy and configure:

#### Data Collection

You need to declare that you collect data for tracking. Based on your implementation with Google Mobile Ads:

**Data Types to Declare:**

1. **Device ID**
   - Collected for: Advertising/Marketing, Analytics
   - Linked to User: No (if using ads without account linking)
   - Used for Tracking: Yes

2. **Advertising Data** (if collecting)
   - Collected for: Advertising/Marketing
   - Linked to User: No
   - Used for Tracking: Yes

3. **Usage Data** (optional, if collecting analytics)
   - Collected for: Analytics
   - Linked to User: No
   - Used for Tracking: Yes (if used for cross-site tracking)

#### Important Notes:

- **"Used for Tracking"**: Select **YES** for data types used to track users across other companies' apps/websites
- **"Linked to User"**: Select based on whether data is tied to user accounts
- If you collect the data but ads are disabled via feature flag, you still need to declare it since the capability exists in your app

### Step 3: Verify Tracking Permission

Make sure you've indicated:
- ✅ **"Do you or your third-party partners collect data from this app for tracking purposes?"** → YES
- ✅ Your app includes ATT permission request code
- ✅ `NSUserTrackingUsageDescription` is in Info.plist

### Step 4: Resubmit App

After updating privacy information:
1. Go to your app version in App Store Connect
2. In **Review Notes**, mention:
   - "ATT permission dialog implemented after user login"
   - "Tracking permission requested via expo-tracking-transparency"
   - "Privacy information updated to reflect data collection"
3. Submit for review

## Testing ATT Implementation

### Test on Device

1. Build and install app on iOS device
2. Sign in with a test account
3. After successful login, you should see the ATT permission dialog
4. Dialog should show your custom message from `NSUserTrackingUsageDescription`

### Reset Permission for Testing

To test multiple times:

1. Go to **Settings** → **Privacy & Security** → **Tracking** on your iOS device
2. Find your app in the list
3. Toggle it off, then test again

Or use Terminal:

```bash
xcrun simctl privacy booted reset all com.jbuxofplenty.coralclash
```

### Check Permission Status

Use the utility functions:

```javascript
import { getTrackingStatus, isTrackingAllowed } from '../utils/tracking';

const status = await getTrackingStatus();
console.log('Current status:', status); // 'undetermined', 'denied', 'granted', 'restricted'

const allowed = await isTrackingAllowed();
console.log('Tracking allowed:', allowed); // true/false
```

## Common Issues and Solutions

### Issue: "App Not Using ATT"

**Solution**: Make sure:
- `expo-tracking-transparency` is in plugins array in app.json
- `NSUserTrackingUsageDescription` is in infoPlist section
- You're calling `requestTrackingPermissionsAsync()` in your code
- You've run `npx expo prebuild --clean` after adding the plugin

### Issue: Permission Dialog Not Showing

**Possible Causes**:
- Already responded to permission (check Settings → Privacy → Tracking)
- Not running on iOS 14+
- Not calling the request function
- Running on simulator with restricted settings

### Issue: Still Getting Rejected

**Check**:
1. Privacy information in App Store Connect matches your implementation
2. You declared all data types you collect
3. Review notes clearly state where ATT request occurs
4. App actually calls the ATT permission request (not just having the code)

## Resources

- [App Tracking Transparency Documentation](https://developer.apple.com/documentation/apptrackingtransparency)
- [expo-tracking-transparency Docs](https://docs.expo.dev/versions/latest/sdk/tracking-transparency/)
- [App Store Review Guidelines 5.1.2](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage)
- [User Privacy and Data Use - Apple](https://developer.apple.com/app-store/user-privacy-and-data-use/)

## Deployment Checklist

Before submitting to App Store:

- [ ] `expo-tracking-transparency` package installed
- [ ] Plugin added to app.json
- [ ] `NSUserTrackingUsageDescription` added with clear message
- [ ] ATT request implemented in code (Login.js)
- [ ] Tested on real iOS device (iOS 14+)
- [ ] Privacy information updated in App Store Connect
- [ ] "Used for Tracking" correctly declared for data types
- [ ] Environment variable (`EXPO_PUBLIC_ENABLE_ADS`) set appropriately in `.env` files
- [ ] Review notes mention ATT implementation
- [ ] Prebuild run after plugin changes: `npx expo prebuild --clean`

## Future: Enabling Ads

When you're ready to enable ads:

1. **Update Environment Variable**:
   ```bash
   # .env.production
   EXPO_PUBLIC_ENABLE_ADS=true
   ```

2. **Verify Ad Components**:
   - Check `src/components/BannerAd.js` respects the environment variable via `useAds` hook
   - Test ads are working properly
   - Verify tracking utility also checks the same variable

3. **Rebuild and Deploy**:
   - Environment variables are baked into the build
   - Run: `npx expo prebuild --clean`
   - Build new version: `yarn build:production:ios`
   - Bump version in app.json
   - Submit update to App Store
   - No additional App Store privacy approval needed (privacy already declared)

4. **Monitor Metrics**:
   - Check ad performance in Google AdMob dashboard
   - Monitor user tracking consent rates
   - Verify ads only show when tracking is granted (if required by ad network)
   - Check that internal users don't see ads (handled by `useAds` hook)

