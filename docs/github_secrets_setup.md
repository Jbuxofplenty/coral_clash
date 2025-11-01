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

1. Read your `.env.preview` and `.env.production` files
2. Upload each `EXPO_PUBLIC_*` variable as an individual GitHub secret
   - `STAGING_EXPO_PUBLIC_*` (from `.env.preview`)
   - `PRODUCTION_EXPO_PUBLIC_*` (from `.env.production`)
3. Upload Firebase service files (base64-encoded)
   - `GOOGLE_SERVICES_JSON`
   - `GOOGLE_SERVICE_INFO_PLIST`

## What Gets Created

The script creates:

### Individual Environment Variable Secrets

Each `EXPO_PUBLIC_*` variable becomes a separate secret:

**Staging (from `.env.preview`)**:

- `STAGING_EXPO_PUBLIC_FIREBASE_API_KEY`
- `STAGING_EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `STAGING_EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- ... (one secret per variable)

**Production (from `.env.production`)**:

- `PRODUCTION_EXPO_PUBLIC_FIREBASE_API_KEY`
- `PRODUCTION_EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PRODUCTION_EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- ... (one secret per variable)

### Firebase Service File Secrets (Base64-encoded)

- `GOOGLE_SERVICES_JSON` - Android Firebase configuration
- `GOOGLE_SERVICE_INFO_PLIST` - iOS Firebase configuration

**Benefits**:

- ✅ Explicit - Each variable is clearly referenced in the workflow
- ✅ Secure - Variables are isolated from each other
- ✅ Expo-compatible - Matches how `expo export:embed` expects environment variables

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
3. Add the new secret to `.github/workflows/build-and-submit.yml` in the `env:` blocks:
   ```yaml
   env:
     EXPO_PUBLIC_YOUR_NEW_VAR: ${{ secrets.STAGING_EXPO_PUBLIC_YOUR_NEW_VAR }}
   ```

## How It Works in CI

### Environment Variables

1. When a build starts, the workflow checks the `profile` input (preview or production)
2. Based on the profile, it sets environment variables in the `env:` block:
   - `STAGING_EXPO_PUBLIC_*` for preview builds
   - `PRODUCTION_EXPO_PUBLIC_*` for production builds
3. When `npx expo export:embed` runs, Expo reads these environment variables
4. Expo bakes these values into the JavaScript bundle
5. The bundle is packaged into the final `.ipa` or `.apk`

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

Then check they were created:

```bash
gh secret list | grep EXPO_PUBLIC
gh secret list | grep GOOGLE_SERVICE
```

### Environment variables not being baked into bundle

Check the CI logs for the "Bundle JavaScript with Expo" step. The environment variables should be set in the `env:` block above the bundling command.

If variables are `undefined` in your app:

1. Verify the secrets exist: `gh secret list | grep EXPO_PUBLIC`
2. Check that the secret names in the workflow match the uploaded secrets
3. Ensure all secrets are referenced in the `env:` block before `npx expo export:embed`
4. Re-run the setup script: `./scripts/setup-github-secrets.sh`

### Firebase service files not found in CI

If you see errors about missing `GoogleService-Info.plist` or `google-services.json`:

1. Verify the secrets exist: `gh secret list | grep GOOGLE_SERVICE`
2. Check the "Restore Firebase Service Files" step in CI logs
3. Re-run the setup script to upload them: `./scripts/setup-github-secrets.sh`

### Google Sign-In not working in CI builds

1. Verify Firebase service files are uploaded: `gh secret list | grep GOOGLE_SERVICE`
2. Check that `app.json` has the config plugin: `@react-native-google-signin/google-signin`
3. Ensure `GoogleService-Info.plist` and `google-services.json` paths are correct in `app.json`
4. Check the prebuild logs for URL scheme configuration

## Related Documentation

- [Reusable CI Setup](./reusable_ci_setup.md) - Setting up CI/CD variables
- [Deployment Setup](./deployment_setup.md) - Full deployment guide
