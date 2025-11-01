# Environment Secrets Setup - Quick Start

## The Problem

Your TestFlight builds were crashing because the Firebase and Google OAuth environment variables weren't being baked into the JavaScript bundle during CI builds. The app was trying to connect to undefined endpoints.

## The Solution

Created a system to upload your environment variables as GitHub Secrets and inject them before the JavaScript bundle is created.

## Setup Steps

### 1. Ensure Your .env Files Exist

You need these two files in your project root:

- `.env.preview` (for staging/TestFlight builds)
- `.env.production` (for production/App Store builds)

Both should contain all your Firebase and Google OAuth credentials.

### 2. Run the Setup Script

```bash
./scripts/setup-github-secrets.sh
```

This will:

- Read your `.env.preview` and `.env.production` files
- Convert them to JSON format
- Upload as GitHub Secrets:
  - `STAGING_CLIENT_ENV_JSON` for preview environment
  - `PRODUCTION_CLIENT_ENV_JSON` for production environment

### 3. Verify Upload

```bash
gh secret list
```

You should see 2 secrets: `STAGING_CLIENT_ENV_JSON` and `PRODUCTION_CLIENT_ENV_JSON`.

## What Changed in CI

The `build-and-submit.yml` workflow now:

1. **Creates a `.env` file**: Writes all secrets to a `.env` file based on the profile (preview/production)
2. **Expo reads `.env` automatically**: When `npx expo export` runs, it automatically picks up variables from the `.env` file
3. **Bakes into bundle**: The env vars are embedded in the JavaScript bundle
4. **Works for both iOS & Android**: Same `.env` file is used for both platforms

## Adding New Environment Variables

When you need to add a new environment variable:

1. **Add to local `.env` files**: Update `.env.preview` and `.env.production` with the new variable
2. **Re-run the setup script**: `./scripts/setup-github-secrets.sh` to upload the updated JSON to GitHub

That's it! The workflow automatically reads all variables from the JSON secret, so you never need to update the workflow file.

## Testing

After uploading secrets, trigger a new build:

```bash
# For staging
git push origin develop

# Or manually via GitHub Actions
# Actions > Deploy to Staging > Run workflow
```

The TestFlight build should now work correctly because it will have the proper Firebase endpoints baked in.

## Files Modified

1. **`scripts/setup-github-secrets.sh`** (new)
   - Uploads .env variables as GitHub Secrets

2. **`.github/workflows/build-and-submit.yml`**
   - Added steps to inject secrets before bundling
   - Separate steps for iOS and Android
   - Separate steps for preview vs production

3. **`docs/github_secrets_setup.md`** (new)
   - Detailed documentation

## Next Steps

1. Run the setup script: `./scripts/setup-github-secrets.sh`
2. Commit these changes
3. Push to trigger a new build
4. Test the TestFlight build - it should no longer crash!

## Troubleshooting

If the build still crashes:

1. Check the CI logs to verify env vars were set (they'll show as `***` for security)
2. Verify the bundle was created: Look for `dist/_expo/static/js/ios/` in logs
3. Check the bundle was copied: Look for "✅ Bundle files copied" in logs
4. Download the `.ipa` and inspect it with `unzip` to verify bundle files exist
