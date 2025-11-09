# Apple Sign-In Setup Guide

## Overview

This document describes how Sign in with Apple is implemented in Coral Clash. Apple requires that apps offering third-party login services (like Google Sign-In) must also offer Sign in with Apple as an equivalent option.

## Why Sign in with Apple?

**App Store Requirement (Guideline 4.8):**

- Apps that use third-party login services must offer Sign in with Apple
- Sign in with Apple meets all of Apple's privacy requirements:
  - Limits data collection to name and email
  - Allows users to keep email private
  - Does not collect app interactions for advertising

## Implementation

### Platform Support

- **iOS:** Full native support (iOS 13+)
- **Android:** Requires additional OAuth setup with Apple Developer account
- **Note:** For App Store submission, only iOS implementation is required

### 1. Package Installation

```bash
yarn add expo-apple-authentication
```

### 2. App Configuration (`app.json`)

Added Apple Sign-In capability and plugin:

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true
    },
    "plugins": ["expo-apple-authentication"]
  }
}
```

### 3. Firebase Auth Configuration

#### For iOS (Native Apps)

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Apple" as a provider
3. **Service ID:** Use your bundle identifier: `com.jbuxofplenty.coralclash`
4. Save - No additional OAuth configuration needed for native iOS

#### For Android (Optional - Requires Apple Developer Account)

If you want Sign in with Apple on Android:

1. **Create Services ID in Apple Developer Portal:**
   - Go to [Apple Developer Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId)
   - Create a new Services ID (e.g., `com.jbuxofplenty.coralclash.signin`)
   - Configure Sign In with Apple:
     - Primary App ID: `com.jbuxofplenty.coralclash`
     - Domains: `coral-clash.firebaseapp.com`
     - Return URLs: `https://coral-clash.firebaseapp.com/__/auth/handler`

2. **Create Private Key in Apple Developer Portal:**
   - Go to [Keys section](https://developer.apple.com/account/resources/authkeys/list)
   - Create a new key with Sign in with Apple capability
   - Download the `.p8` file (can only download once!)
   - Save the Key ID (10-character ID)

3. **Configure Firebase with OAuth credentials:**
   - Firebase Console → Authentication → Apple Provider
   - Add Services ID, Team ID, Private Key (.p8), and Key ID
   - Save

**⚠️ Security:** Never commit `.p8` files to git (already in `.gitignore`)

### 4. Authentication Context (`src/contexts/AuthContext.js`)

Added `signInWithApple` method that:

- Generates a secure nonce for the authentication request
- Requests user's full name and email (optional for user)
- Creates Firebase credential with Apple ID token
- Handles new user creation with Firestore document
- Gracefully handles user cancellation

```javascript
const signInWithApple = async () => {
  // Generate nonce for security
  const nonce = Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

  // Request Apple authentication
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  // Create Firebase credential
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce: nonce,
  });

  // Sign in to Firebase
  await signInWithCredential(auth, credential);
};
```

### 5. Login Screen (`src/screens/Login.js`)

Added Apple Sign-In button that:

- Only displays on iOS devices (iOS 13+)
- Checks availability using `AppleAuthentication.isAvailableAsync()`
- Appears above Google Sign-In button
- Uses Apple's black button style guidelines
- Handles loading states and errors

## Apple Guidelines Compliance

### Button Design

- Uses black background (`#000`)
- White Apple logo and text
- Follows Apple's Human Interface Guidelines
- Consistent sizing with other social login buttons

### User Experience

- Button only shows on iOS devices where available
- Graceful error handling for user cancellation
- Clear loading states
- Respects user privacy choices

### Data Collection

- Only requests name and email (both optional for user)
- User can choose to hide their email (Apple provides relay email)
- No tracking or advertising data collection
- Complies with App Store Guideline 4.8

## Privacy Features

Apple Sign-In provides enhanced privacy:

1. **Email Privacy:** Users can hide their real email and use Apple's relay email
2. **Minimal Data:** Only collects what's explicitly requested and approved
3. **No Tracking:** Does not collect interactions for advertising
4. **User Control:** User manages their Apple ID connections in Settings

## User Name Handling

Apple provides the user's name **only on first sign-in**. Our implementation:

- Stores the name in Firestore on first sign-in
- Falls back to email username if no name provided
- Uses "Apple User" as last resort
- Updates Firebase Auth profile with display name

## Testing

### Development Testing

- Apple Sign-In only works on physical iOS devices
- Cannot be tested in iOS Simulator
- Requires active Apple Developer account
- Must rebuild native project after configuration:
  ```bash
  npx expo prebuild --platform ios --clean
  ```

### Production Testing

- Test with TestFlight builds
- Verify email privacy option works
- Test new user creation flow
- Test returning user flow

## Deployment

### Before Submitting to App Store

1. ✅ Verify Apple Sign-In is enabled in Firebase
2. ✅ Test on physical iOS device
3. ✅ Verify button appears on login screen
4. ✅ Test complete sign-in flow
5. ✅ Rebuild native iOS project with `npx expo prebuild --platform ios --clean`
6. ✅ Submit with Fastlane: `yarn build:production:ios`

### App Store Review Response

When responding to App Store review, you can state:

> "Our app now includes Sign in with Apple as an equivalent login option. The Sign in with Apple button is prominently displayed on the login screen and meets all requirements specified in guideline 4.8:
>
> - Limits data collection to name and email address
> - Allows users to keep email address private via Apple's relay email feature
> - Does not collect interactions for advertising purposes
>
> Sign in with Apple appears above other login options on our iOS app's login screen."

## Firebase Entitlements

The `usesAppleSignIn: true` flag in `app.json` automatically adds the required entitlements to your iOS build:

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

This is handled automatically by Expo's prebuild process.

## Troubleshooting

### Button Not Appearing

- Check iOS version (requires iOS 13+)
- Verify `AppleAuthentication.isAvailableAsync()` returns true
- Ensure prebuild was run after configuration changes

### Authentication Fails

- Verify Apple provider is enabled in Firebase Console
- Check that bundle identifier matches in all configs
- Ensure nonce is properly generated and hashed
- Check Firebase logs for detailed error messages

### User Email Is Null

- Apple allows users to hide their email
- Implement fallback logic (we use email username)
- User can manage email sharing in Apple ID settings

## Related Documentation

- [Google Sign-In Setup](./google_signin_setup.md)
- [Firebase Setup](./firebase_setup.md)
- [Deployment Guide](./deployment_setup.md)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [App Store Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple)

## Security Considerations

1. **Nonce Usage:** We generate a random nonce and hash it with SHA-256 to prevent replay attacks
2. **Token Validation:** Firebase validates the Apple ID token server-side
3. **Credential Scope:** We only request necessary scopes (name and email)
4. **User Privacy:** Respects user's choice to hide email
5. **No Data Sharing:** User data is not shared with third parties for advertising

## Version History

- **v1.0.0** (Nov 2025): Initial Apple Sign-In implementation
  - Added expo-apple-authentication package
  - Configured app.json with Apple Sign-In capability
  - Implemented signInWithApple in AuthContext
  - Added Apple Sign-In button to Login screen
  - Created comprehensive documentation
