# AdMob Integration Guide

## Overview

Coral Clash uses Google Mobile Ads (AdMob) for monetization. The integration is designed to be flexible, allowing ads to be easily enabled/disabled based on environment variables and user profiles.

## Architecture

### Core Components

1. **useAds Hook** (`src/hooks/useAds.js`)
   - Controls whether ads are shown to the user
   - Ads are enabled when:
     - `EXPO_PUBLIC_ENABLE_ADS` environment variable is set to `'true'` **AND**
     - User is NOT an internal user (`internalUser !== true`)
   - Internal users and testers never see ads

2. **BannerAd Component** (`src/components/BannerAd.js`)
   - Displays an anchored adaptive banner ad
   - Automatically respects the `useAds` hook settings
   - Uses test ad units in development mode (`__DEV__`)
   - Handles ad loading states and errors gracefully
   - Includes keywords for better ad targeting: `['game', 'board game', 'strategy', 'puzzle']`

### Integration Points

1. **App.js**
   - Initializes the Google Mobile Ads SDK on app startup
   - Must be initialized before any ads are shown

2. **Home.js**
   - Banner ad is displayed below the header (after VersionWarningBanner)
   - Positioned at the top of the ScrollView content

3. **app.json**
   - Plugin configuration with AdMob App IDs
   - Currently using test app IDs (see Production Setup below)

## Environment Variables

### `EXPO_PUBLIC_ENABLE_ADS`

Controls whether ads are shown in the app.

- `'true'` - Ads are enabled (for non-internal users)
- Any other value or undefined - Ads are disabled

**Example:**

```bash
# Enable ads
EXPO_PUBLIC_ENABLE_ADS='true'

# Disable ads (default)
# EXPO_PUBLIC_ENABLE_ADS='false'
```

## Development Mode

In development (`__DEV__ === true`), the app uses AdMob's test ad units:

- **Test Banner ID:** Uses `TestIds.ADAPTIVE_BANNER`
- This prevents invalid traffic and potential account suspensions
- Test ads are clearly marked by AdMob

## Production Setup

### Step 1: Create AdMob Account

1. Go to [AdMob](https://admob.google.com/)
2. Sign in with your Google account
3. Create a new app for Coral Clash

### Step 2: Get Your App IDs

1. In AdMob console, navigate to **Apps**
2. Select your app
3. Copy the **App ID** (format: `ca-app-pub-XXXXXXXXXXXXX~YYYYYYYYYY`)
4. Do this for both iOS and Android apps

### Step 3: Create Ad Units

1. In AdMob console, go to **Ad units**
2. Create a new ad unit
3. Select **Banner** ad format
4. Choose **Anchored adaptive banner**
5. Copy the **Ad unit ID** (format: `ca-app-pub-XXXXXXXXXXXXX/YYYYYYYYYY`)
6. Do this for both iOS and Android

### Step 4: Update Configuration Files

#### Update `app.json`

Replace the test App IDs with your real App IDs:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-YOUR_ANDROID_APP_ID",
          "iosAppId": "ca-app-pub-YOUR_IOS_APP_ID"
        }
      ]
    ]
  }
}
```

#### Update `src/components/BannerAd.js`

Replace the test Ad Unit IDs with your real Ad Unit IDs:

```javascript
const AD_UNIT_IDS = {
  ios: __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-YOUR_IOS_AD_UNIT_ID',
  android: __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-YOUR_ANDROID_AD_UNIT_ID',
};
```

### Step 5: Rebuild Native Code

After updating `app.json`, you must rebuild the native code:

```bash
# For iOS
yarn prebuild:ios

# For Android
yarn prebuild:android

# Or both
yarn prebuild:all
```

### Step 6: Enable Ads in Production

Set the environment variable in your production builds:

```bash
EXPO_PUBLIC_ENABLE_ADS='true'
```

## Testing

### Test Ad Display

1. Set `EXPO_PUBLIC_ENABLE_ADS='true'` in your `.env` file or environment
2. Run the app in development mode
3. Navigate to the Home screen
4. You should see a test banner ad below the header
5. The ad should be labeled "Test Ad" by AdMob

### Test Internal User Filtering

1. Set `EXPO_PUBLIC_ENABLE_ADS='true'`
2. Log in with an account that has `internalUser: true` in Firestore
3. Navigate to the Home screen
4. The banner ad should NOT appear
5. Log out and log in with a regular account
6. The banner ad should now appear

### Test Ad Loading States

The `BannerAd` component handles:

- **Loading:** Ad is being fetched from AdMob
- **Loaded:** Ad is displayed
- **Failed:** Ad failed to load (component renders nothing)

## Ad Placement Guidelines

### Current Placements

- **Home Screen:** Anchored adaptive banner below header

### Future Placement Ideas

1. **Between Active Games and Game History:** Non-intrusive placement
2. **Game Over Screen:** After game completion
3. **Interstitial Ads:** Between game navigation (be careful not to overdo it)
4. **Rewarded Ads:** Offer in-game benefits (if adding virtual currency/items)

### Best Practices

1. **Don't Overdo It:** Too many ads hurt user experience
2. **Strategic Placement:** Place ads at natural breaks in content
3. **Respect Internal Users:** Always exclude internal testers
4. **Test Thoroughly:** Ensure ads don't break layouts on different screen sizes
5. **Monitor Performance:** Use AdMob analytics to track ad performance

## Troubleshooting

### Ads Not Showing

1. **Check Environment Variable:** Ensure `EXPO_PUBLIC_ENABLE_ADS='true'`
2. **Check User Profile:** Ensure `internalUser !== true` for the logged-in user
3. **Check Native Build:** Ensure you ran `npx expo prebuild` after updating `app.json`
4. **Check Network:** Ads require internet connection
5. **Check AdMob Account:** Ensure account is active and not suspended

### "Invalid Ad Request" Error

- Usually means the ad unit ID is incorrect or test ads aren't set up properly
- Verify ad unit IDs in `BannerAd.js`
- In development, ensure test IDs are being used

### Layout Issues

- Anchored adaptive banners resize based on screen width
- Ensure parent container has proper width constraints
- Test on different device sizes (phones and tablets)

## Additional Resources

- [AdMob Documentation](https://developers.google.com/admob)
- [react-native-google-mobile-ads Documentation](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob Best Practices](https://support.google.com/admob/answer/6128877)
- [AdMob Policy Guidelines](https://support.google.com/admob/answer/6128543)

## Important Notes

### AdMob Policy Compliance

- **No Accidental Clicks:** Ensure ads are clearly distinguishable from content
- **No Incentivized Clicks:** Don't encourage users to click ads
- **No Invalid Traffic:** Don't click your own ads during testing (use test ads)
- **Age-Appropriate Ads:** Configure ad filtering in AdMob console

### Testing with Real Ads

If you need to test with real ads (not test ads):

1. Add your device as a test device in AdMob console
2. Use `mobileAds().setRequestConfiguration()` to enable test device mode
3. **NEVER** click your own ads, even on test devices

### Revenue Considerations

- Revenue depends on:
  - Ad impressions (number of times ads are shown)
  - Click-through rate (CTR)
  - eCPM (effective cost per thousand impressions)
  - Geographic location of users
  - Ad format and placement
- Monitor performance in AdMob console regularly
- Experiment with different ad placements to optimize revenue

## Maintenance

### Regular Tasks

1. **Monitor AdMob Console:** Check for policy violations or issues
2. **Review Analytics:** Track ad performance and optimize placements
3. **Update Dependencies:** Keep `react-native-google-mobile-ads` up to date
4. **Test After Updates:** Ensure ads still work after app updates

### When to Rebuild

You need to rebuild native code (`npx expo prebuild`) when:

- Updating AdMob App IDs in `app.json`
- Upgrading `react-native-google-mobile-ads` package
- Changing plugin configuration in `app.json`

You do NOT need to rebuild when:

- Updating ad unit IDs in `BannerAd.js`
- Changing ad keywords or request options
- Modifying the `useAds` hook logic
