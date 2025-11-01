# GitHub Secrets Setup for CI/CD

This guide explains how to set up GitHub secrets for building and deploying your React Native app via CI/CD.

## Overview

The CI/CD pipeline needs environment variables (Firebase config, Google OAuth IDs, etc.) to be baked into the JavaScript bundle during build time. These are stored as GitHub Secrets and injected before bundling.

## Prerequisites

1. **GitHub CLI installed**: Install from https://cli.github.com
2. **.env files created**: You need `.env.preview` and `.env.production` with your Firebase and Google OAuth credentials

## Quick Setup

Run the automated script:

```bash
./scripts/setup-github-secrets.sh
```

This script will:

1. Read your `.env.preview` and `.env.production` files
2. Create GitHub secrets with `STAGING_` and `PRODUCTION_` prefixes
3. Upload all secrets to your GitHub repository

## What Gets Created

### Staging Secrets (from `.env.preview`)

- `STAGING_EXPO_PUBLIC_FIREBASE_API_KEY`
- `STAGING_EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `STAGING_EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `STAGING_EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `STAGING_EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `STAGING_EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `STAGING_EXPO_PUBLIC_FIREBASE_APP_ID`
- `STAGING_EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `STAGING_EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL`
- `STAGING_EXPO_PUBLIC_USE_FIREBASE_EMULATOR`
- `STAGING_EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `STAGING_EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `STAGING_EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `STAGING_EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`
- `STAGING_EXPO_PUBLIC_ENABLE_DEV_FEATURES`

### Production Secrets (from `.env.production`)

Same variables but with `PRODUCTION_` prefix instead of `STAGING_`.

## Manual Setup

If you prefer to set secrets manually:

```bash
# For staging
echo "your-value" | gh secret set STAGING_EXPO_PUBLIC_FIREBASE_API_KEY

# For production
echo "your-value" | gh secret set PRODUCTION_EXPO_PUBLIC_FIREBASE_API_KEY
```

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

Or manually update:

```bash
echo "new-value" | gh secret set STAGING_EXPO_PUBLIC_FIREBASE_API_KEY
```

## How It Works in CI

1. When a build starts, the workflow checks the `profile` input (preview or production)
2. Based on the profile, it exports either `STAGING_*` or `PRODUCTION_*` secrets as environment variables
3. These environment variables are available when `npx expo export` runs
4. Expo bakes these values into the JavaScript bundle
5. The bundle is then packaged into the final `.ipa` or `.apk`

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
gh secret list
```

### Environment variables not being baked into bundle

The environment variables must be set **before** the `npx expo export` command runs. The workflow has dedicated steps for this:

- "Set Environment Variables for Bundle (Preview)"
- "Set Environment Variables for Bundle (Production)"

These steps run before bundling to ensure the values are available.

## How It Works

The setup script automatically converts your `.env` files to JSON and uploads them as single secrets:

- **`STAGING_CLIENT_ENV_JSON`**: All variables from `.env.preview`
- **`PRODUCTION_CLIENT_ENV_JSON`**: All variables from `.env.production`

### Example JSON Structure

```json
{
  "EXPO_PUBLIC_FIREBASE_API_KEY": "your-api-key",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "123456789.apps.googleusercontent.com",
  ...
}
```

### In the Workflow

The CI automatically expands these JSON secrets to `.env` files:

```yaml
- name: Create Environment File for Bundle (Preview)
  run: |
    echo '${{ secrets.STAGING_CLIENT_ENV_JSON }}' | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env
```

**Benefits**:
- ✅ Zero maintenance - never update the workflow
- ✅ Add/remove variables by just updating `.env` files and re-running the setup script
- ✅ Single source of truth

## Related Documentation

- [Reusable CI Setup](./reusable_ci_setup.md) - Setting up CI/CD variables
- [Deployment Setup](./deployment_setup.md) - Full deployment guide
