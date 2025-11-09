# Apple Sign-In for Android - Quick Setup Guide

## Do You Need This?

**For App Store submission:** ❌ **NO** - Only iOS implementation is required

**For Android users:** ✅ Optional - Only if you want Apple Sign-In on Android

## Prerequisites

- Active Apple Developer Account ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/account)
- Firebase project configured

## Step-by-Step Setup

### Step 1: Create Services ID

1. Go to [Apple Developer - Services IDs](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Click the **"+"** button
3. Select **"Services IDs"** → Continue
4. Fill in details:

   ```
   Description: Coral Clash Sign in with Apple
   Identifier: com.jbuxofplenty.coralclash.signin
   ```

5. Check **"Sign In with Apple"**
6. Click **"Configure"** next to "Sign In with Apple"
7. Configure domains:

   ```
   Primary App ID: com.jbuxofplenty.coralclash
   Domains and Subdomains: coral-clash.firebaseapp.com
   Return URLs: https://coral-clash.firebaseapp.com/__/auth/handler
   ```

8. Save → Continue → Register

### Step 2: Create Private Key

1. Go to [Apple Developer - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **"+"** to create new key
3. Fill in:

   ```
   Key Name: Coral Clash Sign in with Apple Key
   ```

4. Check **"Sign In with Apple"**
5. Click **"Configure"** → Select your Primary App ID: `com.jbuxofplenty.coralclash`
6. Continue → Register
7. **⚠️ IMPORTANT:** Download the `.p8` file - you can only download it ONCE!
8. **Note the Key ID** (looks like `ABC1234567`)

### Step 3: Store Private Key Securely

Save the downloaded file as:

```
AuthKey_<KeyID>.p8
```

**Never commit this file to git!** It's already in `.gitignore`:

```gitignore
*.p8
AuthKey_*.p8
```

Store it securely:
- Use environment variables in CI/CD
- Store in secure key management service
- Keep backup in secure location

### Step 4: Configure Firebase

1. Go to **Firebase Console** → **Authentication** → **Sign-in method**
2. Click **"Apple"**
3. Click **"Web SDK configuration"** to expand
4. Fill in OAuth credentials:

   ```
   Services ID: com.jbuxofplenty.coralclash.signin
   Apple Team ID: FWV22U8U39
   Key ID: <Your 10-character Key ID>
   Private Key: <Upload your .p8 file>
   ```

5. Click **Save**

### Step 5: Test on Android

Build and test:

```bash
# Build Android app
npx expo prebuild --platform android --clean

# Run on Android device/emulator
yarn android
```

The Apple Sign-In button should now appear on Android (if configured correctly).

## Troubleshooting

### Button doesn't appear on Android

Check `AppleAuthentication.isAvailableAsync()`:
- Returns `false` if OAuth not configured properly
- Returns `true` if Services ID and keys are set up correctly

### Authentication fails

Common issues:
- ❌ Services ID doesn't match Firebase configuration
- ❌ Return URL doesn't match exactly
- ❌ Private key expired or incorrect
- ❌ Domain not authorized in Apple Developer portal

### Error: "invalid_client"

- Verify Services ID in Firebase matches Apple Developer portal
- Check that bundle identifier is correct
- Ensure return URL is exactly: `https://coral-clash.firebaseapp.com/__/auth/handler`

## Security Best Practices

1. **Never commit `.p8` files** to version control
2. **Rotate keys periodically** (Apple allows multiple active keys)
3. **Use environment variables** for Key ID and Services ID in CI/CD
4. **Backup your `.p8` file** securely (can't re-download)
5. **Revoke old keys** when no longer needed

## For CI/CD

If using GitHub Actions or similar:

```yaml
# Store in GitHub Secrets:
APPLE_KEY_ID: <Your Key ID>
APPLE_SERVICES_ID: com.jbuxofplenty.coralclash.signin
APPLE_PRIVATE_KEY: <Base64 encoded .p8 file contents>
```

Then decode in your build process:

```bash
echo "$APPLE_PRIVATE_KEY" | base64 -d > AuthKey.p8
```

## Cost Consideration

**Apple Developer Account Required:** $99/year

If you don't have an active Apple Developer account, you can:
- Skip Android implementation (only iOS required for App Store)
- Users can still sign in with Google or Email/Password on Android
- Revisit Android support later if needed

## Summary

| Platform | Requirements | Complexity |
|----------|--------------|------------|
| iOS | Native SDK only | ✅ Simple |
| Android | Services ID + Private Key | ⚠️ Complex |

**Recommendation:** Start with iOS-only implementation (which you already have) to satisfy App Store requirements. Add Android support later if needed.

## Related Documentation

- [Main Apple Sign-In Setup](./apple_signin_setup.md)
- [Firebase Setup](./firebase_setup.md)
- [Deployment Guide](./deployment_setup.md)

