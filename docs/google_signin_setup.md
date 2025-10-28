# Google Sign-In Setup Guide

This guide will help you set up Google Sign-In for Coral Clash.

## Prerequisites

- Firebase project (coral-clash)
- Google Cloud Console access
- App configured in Firebase console

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
5. Copy the **Client ID** - this is your `EXPO_GOOGLE_WEB_CLIENT_ID`

### For iOS

1. In Google Cloud Console > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **iOS** as application type
4. Enter your iOS Bundle ID: `com.jbuxofplenty.coralclash`
5. Click **Create**
6. Copy the **Client ID** - this is your `EXPO_GOOGLE_IOS_CLIENT_ID`

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
8. Copy the **Client ID** - this is your `EXPO_GOOGLE_ANDROID_CLIENT_ID`

### For Expo Go (Development)

For testing in Expo Go during development:

1. In Google Cloud Console > **Credentials**
2. Find the **Web client** (created by Firebase)
3. Edit it
4. Under **Authorized redirect URIs**, add:
   ```
   https://auth.expo.io/@your-expo-username/coral-clash
   ```
5. The Web client ID can also be used as `EXPO_GOOGLE_EXPO_CLIENT_ID`

## Step 3: Update Environment Variables

Edit your `.env` file and add the Client IDs:

```bash
# Google OAuth Client IDs
EXPO_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
EXPO_GOOGLE_IOS_CLIENT_ID=123456789-hijklmn.apps.googleusercontent.com
EXPO_GOOGLE_ANDROID_CLIENT_ID=123456789-opqrstu.apps.googleusercontent.com
EXPO_GOOGLE_EXPO_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

## Step 4: Configure iOS (for production builds)

If you're building for iOS, add the URL scheme to `ios/coralclash/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>coralclash</string>
      <string>com.googleusercontent.apps.YOUR-IOS-CLIENT-ID-REVERSED</string>
    </array>
  </dict>
</array>
```

Replace `YOUR-IOS-CLIENT-ID-REVERSED` with your iOS Client ID in reverse order (e.g., if your client ID is `123-abc.apps.googleusercontent.com`, use `com.googleusercontent.apps.123-abc`).

## Step 5: Test

1. Restart your Expo development server
2. Open the Login screen
3. Click "Sign in with Google"
4. Complete the Google sign-in flow

## Testing with Emulators

Google Sign-In works with Firebase Emulators! When `EXPO_USE_FIREBASE_EMULATOR=true`:

- Authentication will be handled by the Auth Emulator
- User profiles will be stored in the local Firestore Emulator
- No real Google accounts are needed for testing

## Troubleshooting

### "Developer Error" or "Invalid Client"

- Verify all Client IDs are correct in `.env`
- Make sure the bundle ID/package name matches exactly
- Check that OAuth consent screen is configured

### iOS Sign-In Not Working

- Verify the URL scheme is added to Info.plist
- Ensure the iOS Client ID is correct
- Check that the bundle ID matches

### Android Sign-In Not Working

- Verify SHA-1 fingerprint is correct
- Ensure package name matches
- For release builds, use release keystore SHA-1

### Expo Go Sign-In Issues

- Make sure you're using the Web Client ID for `EXPO_GOOGLE_EXPO_CLIENT_ID`
- Verify the redirect URI is added to the Web client in Google Cloud Console
- The redirect URI format: `https://auth.expo.io/@your-expo-username/coral-clash`

## Security Notes

1. **Never commit** `.env` file with real credentials
2. Keep Client IDs in `.env` files only
3. Use different Client IDs for development and production
4. Regularly rotate credentials if compromised
5. Enable **App Check** in Firebase for production

## Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android/start)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
