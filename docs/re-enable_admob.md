# Re-enabling AdMob Integration

AdMob was temporarily disabled to avoid Google Play Store AD_ID permission issues.

## How to Re-enable AdMob

### 1. Restore the plugin in `app.json`

Add the plugin back to the `plugins` array:

```json
"plugins": [
    "expo-font",
    "@react-native-google-signin/google-signin",
    "expo-apple-authentication",
    "expo-tracking-transparency",
    [
        "expo-notifications",
        {
            "icon": "./src/assets/icons/android_icon.png",
            "color": "#2a5298"
        }
    ],
    [
        "react-native-google-mobile-ads",
        {
            "androidAppId": "ca-app-pub-8519782324189160~6327493409",
            "iosAppId": "ca-app-pub-8519782324189160~8486752889"
        }
    ]
]
```

### 2. Uncomment code in `App.js`

- Line 19-20: Uncomment the mobileAds import
- Lines 91-102: Uncomment the AdMob initialization code

### 3. Uncomment code in `src/screens/Home.js`

- Line 8-9: Uncomment the BannerAd import
- Line 528: Uncomment `<BannerAd />` component

### 4. Declare Advertising ID in Google Play Console (REQUIRED)

**This is the critical step that was missing:**

1. Go to [Play Console](https://play.google.com/console)
2. Navigate to your app → **Policy** → **App content**
3. Find **Advertising ID** section
4. Click **Manage**
5. Select: **"Yes, my app uses Advertising ID"**
6. Select purposes: **Advertising or marketing**
7. Click **Save**

Without this declaration, uploads will fail with:
```
Invalid request - This release includes the com.google.android.gms.permission.AD_ID
permission but your declaration on Play Console says your app doesn't use advertising ID.
```

### 5. Rebuild native code

After restoring the plugin:

```bash
npx expo prebuild --clean
```

### 6. Set environment variable (if needed)

Make sure `EXPO_PUBLIC_ENABLE_ADS='true'` in your production `.env` file to actually show ads.

## Reference

See `docs/admob_integration.md` for full AdMob setup documentation.

