# GitHub Secrets Setup for CI/CD

This guide explains how to set up GitHub secrets for building and deploying your React Native app via CI/CD.

## Overview

The CI/CD pipeline needs:

1. **Environment variables** (Firebase config, Google OAuth IDs, etc.) to be baked into the JavaScript bundle
2. **Firebase service files** (`google-services.json`, `GoogleService-Info.plist`) for Google Sign-In configuration

These are stored as GitHub Secrets and injected during the build process.

## Prerequisites

1. **GitHub CLI installed**: Install from https://cli.github.com
2. **.env files created**: You need `.env.preview` and `.env.production` with your Firebase and Google OAuth credentials
3. **Firebase service files**: You need `google-services.json` and `GoogleService-Info.plist` in your project root

## Quick Setup

Run the automated script:

```bash
./scripts/setup-github-secrets.sh
```

This script will:

1. Upload your `.env.preview` file as `STAGING_ENV_FILE` (filtering out comments and empty lines)
2. Upload your `.env.production` file as `PRODUCTION_ENV_FILE` (filtering out comments and empty lines)
3. Upload Firebase service files (base64-encoded) as `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST`
4. Clean up any old deprecated individual environment variable secrets

**Note**: Comments (lines starting with `#`) and empty lines are automatically filtered out before upload. This is required because GitHub Actions `$GITHUB_ENV` expects only `KEY=VALUE` pairs.

## What Gets Created

The script creates **4 GitHub secrets**:

### Environment File Secrets

- **`STAGING_ENV_FILE`** - Contains all environment variables from `.env.preview`
- **`PRODUCTION_ENV_FILE`** - Contains all environment variables from `.env.production`

### Firebase Service File Secrets (Base64-encoded)

- **`GOOGLE_SERVICES_JSON`** - Android Firebase configuration
- **`GOOGLE_SERVICE_INFO_PLIST`** - iOS Firebase configuration

**Benefits**:

- ✅ **Simple** - Only 4 secrets total instead of 30+
- ✅ **Maintainable** - Add new env vars without updating the workflow
- ✅ **Secure** - Secrets are encrypted at rest by GitHub
- ✅ **Expo-compatible** - Metro bundler reads `.env` files natively

## Viewing Secrets

List all secrets:

```bash
gh secret list
```

## Updating Secrets

To update secrets, just run the setup script again:

```bash
./scripts/setup-github-secrets.sh
```

It will overwrite the existing secrets with the latest values from your `.env` files.

## Adding New Environment Variables

To add a new environment variable:

1. Add it to your `.env.preview` and/or `.env.production` files with the `EXPO_PUBLIC_` prefix
2. Re-run the setup script: `./scripts/setup-github-secrets.sh`
3. **That's it!** No workflow changes needed - the entire .env file is uploaded automatically

## How It Works in CI

### Environment Variables

1. When a build starts, the workflow checks the `profile` input (preview or production)
2. It restores the appropriate `.env` file from GitHub secrets:
   - `STAGING_ENV_FILE` → `.env` for preview builds
   - `PRODUCTION_ENV_FILE` → `.env` for production builds
3. The `.env` file is loaded into the GitHub Actions environment using `source .env`
4. Variables are also exported to `$GITHUB_ENV` so they're available in all subsequent steps
5. When `npx expo prebuild` and `npx expo export:embed` run, they read the `.env` file
6. Expo's Metro bundler automatically inlines `EXPO_PUBLIC_*` variables into the JavaScript bundle
7. The bundle is packaged into the final `.ipa` or `.apk`

### Firebase Service Files

1. Before `npx expo prebuild`, the workflow restores the Firebase service files:
   ```bash
   echo "${{ secrets.GOOGLE_SERVICES_JSON }}" | base64 -d > google-services.json
   echo "${{ secrets.GOOGLE_SERVICE_INFO_PLIST }}" | base64 -d > GoogleService-Info.plist
   ```
2. During `expo prebuild`, the `@react-native-google-signin/google-signin` config plugin:
   - Reads `GoogleService-Info.plist` and extracts the `REVERSED_CLIENT_ID`
   - Adds it as a URL scheme to `ios/CoralClash/Info.plist`
   - Configures Android to use `google-services.json`
3. The configured native projects are then built and submitted

## Environment File Structure

Your `.env.preview` and `.env.production` files should look like:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net

# Firebase Emulator (false for production builds)
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-android.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=123456789-expo.apps.googleusercontent.com

# Dev Features (false for production)
EXPO_PUBLIC_ENABLE_DEV_FEATURES=false
```

## Troubleshooting

### "Not authenticated with GitHub CLI"

Run:

```bash
gh auth login --scopes "repo,workflow"
```

### "Secret not found" errors in CI

Make sure you ran the setup script:

```bash
./scripts/setup-github-secrets.sh
```

Then verify the secrets were created:

```bash
gh secret list | grep ENV_FILE
gh secret list | grep GOOGLE_SERVICE
```

You should see:

- `STAGING_ENV_FILE`
- `PRODUCTION_ENV_FILE`
- `GOOGLE_SERVICES_JSON`
- `GOOGLE_SERVICE_INFO_PLIST`

### Environment variables not being baked into bundle

If variables are `undefined` in your app:

1. Verify the `.env` secrets exist:
   ```bash
   gh secret list | grep ENV_FILE
   ```
2. Check the "Restore and Load Environment Variables" step in CI logs:
   - Look for "✅ .env file restored"
   - Look for "✅ Environment variables loaded"
   - Check the debug output shows your variables (sanitized)
3. **Important**: If you manually updated secrets, ensure they contain ONLY `KEY=VALUE` pairs:
   - Remove all comments (lines starting with `#`)
   - Remove all empty lines
   - GitHub Actions `$GITHUB_ENV` will fail if it encounters non-`KEY=VALUE` lines
   - The setup script automatically filters these out
4. Ensure variables use the `EXPO_PUBLIC_` prefix in your `.env` files
5. Re-run the setup script: `./scripts/setup-github-secrets.sh`

### Firebase service files not found in CI

If you see errors about missing `GoogleService-Info.plist` or `google-services.json`:

1. Verify the secrets exist:
   ```bash
   gh secret list | grep GOOGLE_SERVICE
   ```
2. Check the "Restore Firebase Service Files" step in CI logs
3. Re-run the setup script to upload them: `./scripts/setup-github-secrets.sh`

### Google Sign-In crashing in CI builds

If Google Sign-In crashes with "invalid client ID" or similar errors:

1. Verify Firebase service files are uploaded: `gh secret list | grep GOOGLE_SERVICE`
2. Check that `.env` file contains Google OAuth client IDs:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
3. Ensure `app.json` has the config plugin: `@react-native-google-signin/google-signin`
4. Check the "Restore and Load Environment Variables" step shows variables were loaded
5. Check the prebuild logs for URL scheme configuration

## Related Documentation

- [Reusable CI Setup](./reusable_ci_setup.md) - Setting up CI/CD variables
- [Deployment Setup](./deployment_setup.md) - Full deployment guide
