# Automated Deployment Setup Guide

This guide will help you set up automated deployment to the Apple App Store and Google Play Store using GitHub Actions and EAS.

## Prerequisites

1. **Expo Account**: You need an Expo account with EAS access
2. **Apple Developer Account**: Required for App Store deployment ($99/year)
3. **Google Play Developer Account**: Required for Play Store deployment ($25 one-time fee)
4. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Configure EAS Credentials

### iOS (App Store)

1. **Generate credentials** (if not already done):

    ```bash
    eas credentials
    ```

    Choose "iOS" → "App Store" → Follow the prompts to set up your certificates and provisioning profiles

2. **Configure App Store Connect API Key**:

    ```bash
    eas submit --platform ios
    ```

    On first run, you'll be prompted to provide your App Store Connect API credentials:
    - Key ID
    - Issuer ID
    - API Key (.p8 file)

    To generate these:
    - Go to [App Store Connect](https://appstoreconnect.apple.com/)
    - Navigate to Users and Access → Keys
    - Create a new key with "App Manager" role
    - Download the .p8 file and save the Key ID and Issuer ID

### Android (Play Store)

1. **Create a Google Service Account**:
    - Go to [Google Play Console](https://play.google.com/console)
    - Navigate to Setup → API access
    - Create a new service account or use existing
    - Create credentials (JSON key file)
    - Grant the service account "Release Manager" permissions

2. **Configure EAS with Play Store credentials**:
    ```bash
    eas submit --platform android
    ```
    When prompted, provide the path to your service account JSON file

## Step 2: Generate Expo Access Token

1. Go to [Expo Access Tokens](https://expo.dev/accounts/[your-account]/settings/access-tokens)
2. Click "Create Token"
3. Give it a name like "GitHub Actions Deploy"
4. Copy the token (you won't see it again!)

## Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the following secret:
    - Name: `EXPO_TOKEN`
    - Value: [paste the token from Step 2]

## Step 4: Configure App Store Submission

Update your `eas.json` submit configuration to include all necessary details:

```json
{
    "submit": {
        "production": {
            "ios": {
                "appleId": "your-apple-id@example.com",
                "ascAppId": "your-app-store-app-id",
                "appleTeamId": "FWV22U8U39"
            },
            "android": {
                "serviceAccountKeyPath": "path/to/google-service-account.json",
                "track": "production"
            }
        }
    }
}
```

**Note**: For security, don't commit the `serviceAccountKeyPath` directly. Instead, use EAS Secrets:

```bash
# Store service account JSON as EAS secret
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT --type file --value ./google-service-account.json
```

Then update `eas.json`:

```json
"android": {
  "serviceAccountKeyPath": "${EAS_SECRET:GOOGLE_SERVICE_ACCOUNT}",
  "track": "production"
}
```

## Step 5: Deploy!

### Staging Deployment (TestFlight / Internal Testing)

**Option 1: Push to develop branch (automatic)**

```bash
git checkout develop
git add .
git commit -m "Add new feature"
git push origin develop
```

**Option 2: Create a beta/RC tag**

```bash
# Create and push a beta tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1

# Or a release candidate tag
git tag v1.8.0-rc.1
git push origin v1.8.0-rc.1
```

**Option 3: Manual trigger from GitHub**

1. Go to Actions → "Deploy to Staging"
2. Click "Run workflow"
3. Choose platform (iOS, Android, or both)

The staging workflow will:

1. Build iOS and Android apps using the `preview` profile
2. Submit to TestFlight (iOS) and Internal Testing (Android)

### Production Deployment (App Store / Play Store)

**Option 1: Create a version tag (recommended)**

```bash
# Update version in app.json
# Commit your changes
git add .
git commit -m "Release version 1.8.0"

# Create and push a version tag
git tag v1.8.0
git push origin main --tags
```

**Option 2: Manual trigger from GitHub**

1. Go to Actions → "Deploy to Production"
2. Click "Run workflow"
3. Choose platform (iOS, Android, or both)

The production workflow will:

1. Build iOS and Android apps using the `production` profile
2. Submit to App Store and Google Play Store

## Step 6: Monitor Builds

- **EAS Dashboard**: Monitor builds at [https://expo.dev/accounts/[your-account]/projects/coral-clash/builds](https://expo.dev/)
- **GitHub Actions**: Check progress in the Actions tab of your repository
- **App Store Connect**: Review submission status for iOS
- **Google Play Console**: Review submission status for Android

## Deployment Timeline

- **iOS**: Apple review typically takes 24-48 hours
- **Android**: Google review typically takes a few hours to 2 days

## Troubleshooting

### Build Failures

1. Check EAS build logs:

    ```bash
    eas build:list
    ```

2. View specific build details:
    ```bash
    eas build:view [build-id]
    ```

### Submission Failures

Common issues:

- **iOS**: Missing required App Store information (screenshots, description, etc.)
- **Android**: Version code not incrementing (handled by `autoIncrement: true` in eas.json)
- **Credentials**: Expired certificates or invalid API keys

### GitHub Action Failures

Check the Actions tab in GitHub for detailed logs. Common issues:

- Invalid `EXPO_TOKEN` secret
- Network timeouts (usually resolved by re-running the workflow)

## Workflow Architecture

The deployment system uses three workflows for maximum code reuse:

### 1. `build-and-submit.yml` (Reusable Workflow)

Shared code used by both staging and production workflows. Handles:

- Node.js and Expo setup
- Dependency installation
- Building for iOS/Android
- Submission to app stores

### 2. `deploy-staging.yml` (Staging Workflow)

Triggers:

- Tags matching `v*-beta.*` or `v*-rc.*`
- Push to `develop` branch
- Manual dispatch

Calls the reusable workflow with `profile: preview`

### 3. `deploy.yml` (Production Workflow)

Triggers:

- Tags matching `v*` (excluding beta/rc)
- Manual dispatch

Calls the reusable workflow with `profile: production`

## Advanced Configuration

### Notifications

Add Slack/Discord notifications to your workflow:

```yaml
- name: Notify on Success
  if: success()
  run: |
      curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ Coral Clash deployment successful!"}'
```

## Security Best Practices

1. **Never commit sensitive files**:
    - Add to `.gitignore`: `*.p8`, `*.p12`, `google-service-account.json`
2. **Use EAS Secrets** for sensitive data instead of committing files

3. **Rotate tokens regularly**: Generate new Expo tokens every 6-12 months

4. **Limit token permissions**: Use tokens with minimum required permissions

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
