# Deployment Setup Guide

> **Note:** This project now uses **native builds with Fastlane** instead of EAS. This guide has been updated accordingly.

This guide will help you set up automated deployment to the Apple App Store and Google Play Store using GitHub Actions and Fastlane.

---

## 📚 Documentation Overview

We've created comprehensive documentation for the native build setup:

1. **[GitHub Secrets Setup Guide](./github_secrets_setup.md)** ⭐ **START HERE**
   - Complete guide for all 11 required GitHub secrets
   - Step-by-step instructions with examples
   - Troubleshooting tips

2. **[Native Build Deployment Guide](./native_build_deployment.md)**
   - Comprehensive deployment guide
   - Local and CI/CD build instructions
   - Monitoring and troubleshooting

3. **[EAS to Native Migration Guide](./eas_to_native_migration.md)**
   - Step-by-step migration instructions
   - Complete setup walkthrough
   - Verification checklist

4. **[Deployment Quick Reference](./deployment_quick_reference.md)**
   - Quick command reference
   - Common workflows
   - Pro tips

---

## Prerequisites

1. **Apple Developer Account**: Required for App Store deployment ($99/year)
2. **Google Play Developer Account**: Required for Play Store deployment ($25 one-time fee)
3. **GitHub Repository**: Your code should be in a GitHub repository
4. **Ruby 3.2+**: For running Fastlane (see setup below)

---

## Quick Setup Steps

### 1. Install Fastlane

```bash
# Install Ruby dependencies
bundle install

# Verify installation
bundle exec fastlane --version
```

**If you encounter Ruby version issues:**

- Install rbenv: `brew install rbenv ruby-build`
- Install Ruby 3.2: `rbenv install 3.2.2`
- Set as default: `rbenv global 3.2.2`
- Restart terminal and run `bundle install`

### 2. Setup iOS Code Signing (Fastlane Match)

**a) Create a private repository for certificates:**

- Go to GitHub → New Repository
- Name: `fastlane-match-certificates` (or similar)
- **Important:** Make it **private**

**b) Initialize Match:**

```bash
bundle exec fastlane match init
```

- Choose `git` storage
- Enter your private repo URL

**c) Create `fastlane/Matchfile`:**

```ruby
git_url("https://github.com/YOUR-USERNAME/fastlane-match-certificates")
storage_mode("git")
type("appstore")
app_identifier(["com.jbuxofplenty.coralclash"])
username(ENV["APPLE_ID"])
```

**d) Generate certificates:**

```bash
bundle exec fastlane match appstore
```

- Enter your Apple ID
- Create a strong password (save this as `MATCH_PASSWORD` secret)

### 3. Setup Android Keystore

**Generate keystore (if you don't have one):**

```bash
keytool -genkey -v -keystore release.keystore -alias coral-clash \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Convert to base64 for GitHub:**

```bash
base64 -i release.keystore | tr -d '\n' > keystore_base64.txt
```

**⚠️ Important:** Backup `release.keystore` securely! You cannot update your app without it.

### 4. Setup App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Integrations** → **App Store Connect API**
3. Generate new API key:
   - Name: `GitHub Actions Deploy`
   - Access: **App Manager** or **Admin**
4. Download the `.p8` file (**you can only do this once!**)
5. Save:
   - Key ID (e.g., `ABC12DEF34`)
   - Issuer ID (UUID format)
   - `.p8` file contents

### 5. Setup Google Play Service Account

**a) Create service account in Google Cloud Console:**

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Link Google Cloud Project (if not already linked)
4. Click **Create new service account** → redirects to Google Cloud Console
5. In Google Cloud Console:
   - Click **Create Service Account**
   - Name: `fastlane-deploy`
   - Role: **Service Account User**
   - Click **Done**

**b) Create and download JSON key:**

1. Find your service account, click on it
2. Go to **Keys** tab → **Add Key** → **Create new key**
3. Choose **JSON** format → Click **Create**
4. Save the downloaded JSON file

**c) Grant Play Console access:**

1. Back in Play Console → **Setup** → **API Access**
2. Find your service account → Click **Grant access**
3. Add your app under **App permissions**
4. Grant permissions:
   - ✅ View app information and download bulk reports
   - ✅ Manage production releases
   - ✅ Manage testing track releases
5. Click **Invite user** / **Apply**

### 6. Add GitHub Secrets

Go to your repository → **Settings → Secrets and variables → Actions**

Add these **11 secrets**:

#### iOS (6 secrets)

1. `APP_STORE_CONNECT_API_KEY_ID` - Key ID from App Store Connect
2. `APP_STORE_CONNECT_ISSUER_ID` - Issuer ID from App Store Connect
3. `APP_STORE_CONNECT_API_KEY_CONTENT` - Full contents of `.p8` file
4. `APPLE_ID` - Your Apple ID email
5. `MATCH_PASSWORD` - Password you set for Match
6. `MATCH_GIT_BASIC_AUTHORIZATION` - Base64 encoded GitHub credentials

#### Android (5 secrets)

7. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` - Full JSON file contents
8. `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore (from step 3)
9. `ANDROID_KEYSTORE_PASSWORD` - Keystore password
10. `ANDROID_KEY_ALIAS` - Key alias (e.g., `coral-clash`)
11. `ANDROID_KEY_PASSWORD` - Key password

📖 **For detailed instructions on each secret, see [GitHub Secrets Setup Guide](./github_secrets_setup.md)**

---

## Deploy!

### Staging Deployment (TestFlight / Internal Testing)

**Option 1: Push to develop branch (automatic)**

```bash
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop
```

**Option 2: Create a beta/RC tag**

```bash
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1
```

**Option 3: Manual trigger from GitHub**

1. Go to Actions → "Deploy to Staging"
2. Click "Run workflow"
3. Choose platform (iOS, Android, or both)

### Production Deployment (App Store / Play Store)

**Option 1: Create a version tag (recommended)**

```bash
# Update version in app.json if needed
git add .
git commit -m "chore: release version 1.8.0"

git tag v1.8.0
git push origin main --tags
```

**Option 2: Manual trigger from GitHub**

1. Go to Actions → "Deploy to Production"
2. Click "Run workflow"
3. Choose platform (iOS, Android, or both)

---

## Monitor Builds

### GitHub Actions

- Navigate to **Actions** tab in your repository
- View real-time build logs
- Download build artifacts (IPA/AAB files)

### App Store Connect (iOS)

- [App Store Connect](https://appstoreconnect.apple.com/)
- Check **TestFlight** tab for beta builds
- Check **App Store** tab for production builds

### Google Play Console (Android)

- [Google Play Console](https://play.google.com/console)
- Check **Internal testing** track for beta builds
- Check **Production** track for production releases

---

## Deployment Timeline

- **iOS**: Apple review typically takes 24-48 hours
- **Android**: Google review typically takes a few hours to 2 days
- **Build time**: ~20-30 minutes for both platforms (parallel)

---

## Local Builds (Optional)

### iOS (requires macOS)

```bash
# Generate native project
yarn prebuild:ios
cd ios && pod install && cd ..

# Build
yarn build:ios

# Build and submit to TestFlight
yarn build:staging:ios

# Build and submit to App Store
yarn build:production:ios
```

### Android

```bash
# Set environment variables
export ANDROID_KEYSTORE_PATH="./release.keystore"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="coral-clash"
export ANDROID_KEY_PASSWORD="your-password"
export GOOGLE_PLAY_JSON_KEY_PATH="./google-play-key.json"

# Generate native project
yarn prebuild:android

# Build
yarn build:android

# Build and submit to Internal Testing
yarn build:staging:android

# Build and submit to Production
yarn build:production:android
```

---

## Troubleshooting

### Build Failures

**iOS: "No matching provisioning profiles"**

```bash
bundle exec fastlane match appstore --force_for_new_devices
```

**Android: "Keystore was tampered with"**

- Verify `ANDROID_KEYSTORE_PASSWORD` is correct
- Re-encode keystore: `base64 -i release.keystore | tr -d '\n'`

**GitHub Action: Authentication failed**

- Check all secrets are correctly set
- Verify no extra spaces in secret values
- For iOS: Regenerate App Store Connect API key if expired
- For Android: Check service account permissions in Play Console

**Prebuild fails**

```bash
npx expo prebuild --clean
```

### Submission Failures

**iOS**: Missing required App Store information

- Ensure app metadata is complete in App Store Connect
- Check screenshots and descriptions are uploaded

**Android**: Version code not incrementing

- Handled automatically by Gradle
- Check version in `app.json` if issues persist

**Credentials**: Expired certificates or invalid API keys

- iOS: Regenerate certificates with Match
- Android: Verify service account JSON is valid

### Ruby Installation Issues

**System Ruby incompatible**

```bash
# Install rbenv
brew install rbenv ruby-build

# Install Ruby 3.2
rbenv install 3.2.2
rbenv global 3.2.2

# Restart terminal
bundle install
```

---

## Workflow Architecture

### Build Process

```
┌─────────────────────────────────────┐
│  deploy-staging.yml / deploy.yml    │
│  (Trigger on tag or manual)         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         test.yml                    │
│  • Run app tests                    │
│  • Run shared module tests          │
│  • Run functions tests              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│    build-and-submit.yml             │
│                                     │
│  iOS Job (macos-latest):            │
│  • npx expo prebuild --platform ios │
│  • pod install                      │
│  • fastlane ios beta/release        │
│                                     │
│  Android Job (ubuntu-latest):       │
│  • npx expo prebuild --platform android │
│  • Setup keystore                   │
│  • fastlane android beta/release    │
└─────────────────────────────────────┘
```

### Fastlane Lanes

**iOS:**

- `bundle exec fastlane ios build` - Build IPA
- `bundle exec fastlane ios beta` - Build + Upload to TestFlight
- `bundle exec fastlane ios release` - Build + Upload to App Store

**Android:**

- `bundle exec fastlane android build` - Build AAB
- `bundle exec fastlane android beta` - Build + Upload to Internal Testing
- `bundle exec fastlane android release` - Build + Upload to Production

---

## Security Best Practices

1. **Never commit sensitive files:**
   - Add to `.gitignore`: `*.p8`, `*.p12`, `*.keystore`, `google-play-key.json`
   - Files are already gitignored in this project

2. **Use GitHub Secrets** for all sensitive data

3. **Rotate credentials regularly:**
   - App Store Connect API keys: yearly
   - GitHub Personal Access Tokens: yearly
   - Google Play Service Account: as needed

4. **Backup keystore securely:**
   - Store in multiple secure locations
   - Use encrypted storage or password manager
   - You cannot update your app without it!

5. **Limit access:**
   - Only give GitHub secrets access to trusted collaborators
   - Use environment protection rules for production

---

## Additional Resources

- **[GitHub Secrets Setup](./github_secrets_setup.md)** - Detailed secret configuration
- **[Native Build Deployment](./native_build_deployment.md)** - Complete deployment guide
- **[Migration Guide](./eas_to_native_migration.md)** - EAS to Native migration
- **[Quick Reference](./deployment_quick_reference.md)** - Command cheat sheet

### External Documentation

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)

---

## Quick Verification Checklist

- [ ] Ruby 3.2+ installed
- [ ] Fastlane installed: `bundle install`
- [ ] iOS: Match certificates repository created
- [ ] iOS: Match initialized and certificates generated
- [ ] iOS: App Store Connect API key created
- [ ] Android: Keystore generated and backed up
- [ ] Android: Google Play service account created
- [ ] All 11 GitHub secrets added
- [ ] Local iOS build tested (if on macOS)
- [ ] Local Android build tested
- [ ] GitHub Actions staging deployment tested
- [ ] TestFlight build verified
- [ ] Play Console build verified
- [ ] Team notified of new process

---

## Need Help?

1. Check the comprehensive guides in the `docs/` folder
2. Review [Troubleshooting section](./native_build_deployment.md#troubleshooting)
3. Search [Fastlane GitHub Issues](https://github.com/fastlane/fastlane/issues)
4. Check Fastlane documentation: [docs.fastlane.tools](https://docs.fastlane.tools/)

---

**Ready to deploy?** 🚀

```bash
git push origin develop  # Staging
git tag v1.0.0 && git push origin v1.0.0  # Production
```
