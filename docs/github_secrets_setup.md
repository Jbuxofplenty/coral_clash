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
2. Convert them to JSON format
3. Upload as two GitHub secrets:
   - `STAGING_CLIENT_ENV_JSON` (from `.env.preview`)
   - `PRODUCTION_CLIENT_ENV_JSON` (from `.env.production`)

## What Gets Created

The script creates **2 secrets** containing all your environment variables:

- **`STAGING_CLIENT_ENV_JSON`**: All variables from `.env.preview` as JSON
- **`PRODUCTION_CLIENT_ENV_JSON`**: All variables from `.env.production` as JSON

Example JSON structure:

```json
{
  "EXPO_PUBLIC_FIREBASE_API_KEY": "your-api-key",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "123456789.apps.googleusercontent.com",
  ...
}
```

**Benefits**:

- ✅ Zero maintenance - never need to update the workflow
- ✅ Add/remove variables by just updating `.env` files and re-running the script
- ✅ Single source of truth (your `.env` files)

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

It will overwrite the existing JSON secrets with the latest values from your `.env` files.

## Adding New Environment Variables

To add a new environment variable:

1. Add it to your `.env.preview` and/or `.env.production` files
2. Re-run the setup script: `./scripts/setup-github-secrets.sh`
3. Done! The workflow automatically picks up all variables from the JSON secret

**No workflow changes needed!**

## How It Works in CI

1. When a build starts, the workflow checks the `profile` input (preview or production)
2. Based on the profile, it creates a `.env` file from either `STAGING_CLIENT_ENV_JSON` or `PRODUCTION_CLIENT_ENV_JSON`
3. The JSON is automatically expanded to `.env` format using `jq`
4. When `npx expo export` runs, it reads the `.env` file
5. Expo bakes these values into the JavaScript bundle
6. The bundle is then packaged into the final `.ipa` or `.apk`

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

Check the CI logs for the "Create Environment File for Bundle" step. You should see:

```
✅ Created .env file with staging configuration
Environment variables loaded:
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=***
...
```

If you don't see this, verify:

1. The secrets exist: `gh secret list | grep CLIENT_ENV_JSON`
2. The JSON is valid: Re-run `./scripts/setup-github-secrets.sh`
3. The workflow step runs before bundling

### Invalid JSON error

If you see `jq: parse error: Invalid numeric literal`, your JSON secret is malformed. Fix it by:

1. Make sure your `.env` files don't have syntax errors
2. Re-run the setup script: `./scripts/setup-github-secrets.sh`
3. The script now validates JSON before uploading

## Related Documentation

- [Reusable CI Setup](./reusable_ci_setup.md) - Setting up CI/CD variables
- [Deployment Setup](./deployment_setup.md) - Full deployment guide
