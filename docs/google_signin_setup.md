# Google Sign-In Setup Guide

This guide will help you set up Google Sign-In for Coral Clash using `@react-native-google-signin/google-signin` with Firebase.

## Prerequisites

- Firebase project (coral-clash)
- Google Cloud Console access
- App configured in Firebase console
- Firebase service files (`google-services.json` and `GoogleService-Info.plist`)

## Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `coral-clash` project
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Note down the **Web SDK configuration** (Web client ID)
7. Click **Save**

## Step 2: Configure Google Cloud Console

### For Web

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (`coral-clash`)
3. Navigate to **APIs & Services** > **Credentials**
4. Find the **Web client** OAuth 2.0 Client ID (auto-created by Firebase)
5. Copy the **Client ID** - this is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### For iOS

1. In Google Cloud Console > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **iOS** as application type
4. Enter your iOS Bundle ID: `com.jbuxofplenty.coralclash`
5. Click **Create**
6. Copy the **Client ID** - this is your `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

### For Android

1. In Google Cloud Console > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Android** as application type
4. Enter your Android Package name: `com.jbuxofplenty.coralclash`
5. Get your SHA-1 certificate fingerprint:

   ```bash
   # For debug builds
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For release builds (use your keystore)
   keytool -list -v -keystore path/to/your/keystore -alias your-alias
   ```

6. Enter the SHA-1 fingerprint
7. Click **Create**
8. Copy the **Client ID** - this is your `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## Step 2.5: Download Firebase Service Files

Download the Firebase configuration files for your platforms:

### iOS

1. In Firebase Console > **Project Settings** > **General**
2. Under **Your apps**, find your iOS app
3. Click **Download GoogleService-Info.plist**
4. Place the file in your project root (ignored by `.gitignore`)

### Android

1. In Firebase Console > **Project Settings** > **General**
2. Under **Your apps**, find your Android app
3. Click **Download google-services.json**
4. Place the file in your project root (ignored by `.gitignore`)

**Important**: These files are uploaded to GitHub Secrets for CI/CD builds.

## Step 3: Update Environment Variables

Edit your `.env.preview` and `.env.production` files and add the Client IDs:

```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-hijklmn.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-opqrstu.apps.googleusercontent.com
```

**Note**: We're using `@react-native-google-signin/google-signin` which works in both development and production builds.

## Step 4: Configure app.json

The Firebase config plugin automatically handles URL scheme configuration. Ensure your `app.json` has:

```json
{
  "expo": {
    "plugins": ["expo-font", "@react-native-google-signin/google-signin"],
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

The plugin will automatically:

- Extract the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`
- Add it as a URL scheme to your iOS `Info.plist`
- Configure Android for Google Sign-In

**No manual URL scheme configuration needed!**

## Step 5: Rebuild Native Code

After adding the Firebase service files and updating `app.json`, rebuild your native code:

```bash
npx expo prebuild --clean
npx expo run:ios    # For iOS
npx expo run:android # For Android
```

The config plugin will configure everything during prebuild.

## Step 6: Test

1. Run your app on a simulator/emulator or physical device
2. Open the Login screen
3. Click "Sign in with Google"
4. Complete the Google sign-in flow

**Important**: Google Sign-In requires native builds. It won't work in Expo Go.

## Troubleshooting

### "TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found"

This means the native module isn't linked properly:

1. Run `npx expo prebuild --clean` to regenerate native code
2. Clear CocoaPods cache: `pod cache clean --all` (iOS only)
3. Run `npx expo run:ios` or `npx expo run:android` again

### "Developer Error" or "Invalid Client"

- Verify all Client IDs are correct in `.env`
- Make sure the bundle ID/package name matches exactly
- Check that OAuth consent screen is configured
- Ensure `GoogleService-Info.plist` and `google-services.json` are in the project root

### iOS Sign-In Not Working

- Verify the `GoogleService-Info.plist` is in the project root
- Check that the config plugin is in `app.json`
- Run `npx expo prebuild --clean` to regenerate `Info.plist`
- Verify the URL scheme was added: Check `ios/CoralClash/Info.plist` for `CFBundleURLSchemes`

### Android Sign-In Not Working

- Verify SHA-1 fingerprint is correct in Google Cloud Console
- Ensure package name matches exactly
- For release builds, add the release keystore SHA-1
- Check that `google-services.json` is in the project root

## Security Notes

1. **Never commit** `.env` files or Firebase service files with real credentials
2. Keep Client IDs in `.env` files only
3. Use different credentials for staging and production
4. Regularly rotate credentials if compromised
5. Enable **App Check** in Firebase for production
6. Firebase service files are in `.gitignore` - keep them there!

## Additional Resources

- [Official Library Docs](https://react-native-google-signin.github.io/docs/setting-up/expo)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android/start)

## Migration Guide

If you're migrating from `expo-auth-session`:

### What Changed

- **Library**: `expo-auth-session` → `@react-native-google-signin/google-signin`
- **Configuration**: Manual URL schemes → Automatic via Firebase config plugin
- **Auth Flow**: `promptAsync()` → `GoogleSignin.signIn()`

### Benefits

- ✅ Official Google-supported library
- ✅ Better native integration
- ✅ Automatic URL scheme configuration
- ✅ Works in development and production
- ✅ Simpler setup with Firebase

### Code Changes

See `src/contexts/AuthContext.js` for the updated implementation using `GoogleSignin`.
