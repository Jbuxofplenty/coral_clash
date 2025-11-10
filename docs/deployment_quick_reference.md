# Deployment Quick Reference (Native Builds)

## 🚀 Quick Deploy Commands

### Staging (TestFlight / Internal Testing)

```bash
# Deploy staging via Git tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1

# Or push to develop branch (auto-deploys)
git push origin develop

# Or trigger manually from GitHub
# Go to Actions → "Deploy to Staging" → "Run workflow"
```

### Production (App Store / Play Store)

```bash
# Deploy production via Git tag
git tag v1.8.0
git push origin v1.8.0

# Or trigger manually from GitHub
# Go to Actions → "Deploy to Production" → "Run workflow"
```

---

## 📦 Local Build Commands

### Prerequisites

```bash
# Install Fastlane and dependencies
bundle install

# Generate native projects
yarn prebuild:ios      # iOS only
yarn prebuild:android  # Android only
yarn prebuild:all      # Both platforms
```

### iOS (requires macOS)

```bash
# Install CocoaPods
cd ios && pod install && cd ..

# Build only
yarn build:ios

# Build and submit to TestFlight
yarn build:staging:ios

# Build and submit to App Store
yarn build:production:ios
```

### Android

```bash
# Setup environment variables first
export ANDROID_KEYSTORE_PATH="./release.keystore"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="coral-clash"
export ANDROID_KEY_PASSWORD="your-password"
export GOOGLE_PLAY_JSON_KEY_PATH="./google-play-key.json"

# Build only
yarn build:android

# Build and submit to Internal Testing
yarn build:staging:android

# Build and submit to Production
yarn build:production:android
```

---

## 🏗️ Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     test.yml                                 │
│                (Reusable Test Workflow)                      │
│                                                              │
│  • Run app tests                                             │
│  • Run shared module tests                                   │
│  • Run functions tests                                       │
└─────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
         │                                    │
┌────────┴─────────────┐         ┌───────────┴──────────────┐
│  deploy-staging.yml  │         │    deploy.yml            │
│                      │         │   (Production)           │
│  Triggers:           │         │                          │
│  • v*-beta.*         │         │  Triggers:               │
│  • v*-rc.*           │         │  • v* (not beta/rc)      │
│  • push to develop   │         │  • manual                │
│  • manual            │         │                          │
│                      │         │  Profile: production     │
│  Profile: preview    │         │  Env: production         │
│  Env: staging        │         │                          │
└──────────┬───────────┘         └───────────┬──────────────┘
           │                                 │
           │                                 │
           ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              build-and-submit.yml                            │
│              (Reusable Build Workflow)                       │
│                                                              │
│  iOS Job (macos-latest):                                    │
│  • npx expo prebuild --platform ios                         │
│  • pod install                                              │
│  • bundle exec fastlane ios beta/release                    │
│                                                              │
│  Android Job (ubuntu-latest):                               │
│  • npx expo prebuild --platform android                     │
│  • Setup keystore                                           │
│  • bundle exec fastlane android beta/release                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏷️ Git Tag Naming Convention

| Tag Format  | Environment | Example         | Destination                   |
| ----------- | ----------- | --------------- | ----------------------------- |
| `v*`        | Production  | `v1.8.0`        | App Store + Play Store        |
| `v*-beta.*` | Staging     | `v1.8.0-beta.1` | TestFlight + Internal Testing |
| `v*-rc.*`   | Staging     | `v1.8.0-rc.1`   | TestFlight + Internal Testing |

---

## 🔍 Monitoring Deployments

### GitHub Actions

```
Your Repo → Actions tab → Select workflow run
```

### App Store Connect (iOS)

```
https://appstoreconnect.apple.com/
→ My Apps → Coral Clash
→ TestFlight (for staging)
→ App Store (for production)
```

### Google Play Console (Android)

```
https://play.google.com/console/
→ Coral Clash
→ Release → Testing → Internal testing (for staging)
→ Release → Production (for production)
```

### Fastlane CLI

```bash
# View all available lanes
bundle exec fastlane lanes

# View iOS builds (requires proper auth)
# Check App Store Connect for actual builds
```

---

## 🎯 Typical Release Flow

### Staging Release (Beta Testing)

```bash
# 1. Commit your changes
git add .
git commit -m "feat: add new feature"

# 2. Push to develop (auto-deploys to staging)
git push origin develop

# OR create a beta tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1

# 3. Wait ~20-30 mins for builds
# 4. Check TestFlight (iOS) / Internal Testing (Android)
# 5. Test with beta testers
```

### Production Release

```bash
# 1. Merge develop to main
git checkout main
git merge develop

# 2. Update version in app.json (if needed)
# Edit: "version": "1.8.0"

# 3. Commit version bump (if changed)
git add app.json
git commit -m "chore: bump version to 1.8.0"

# 4. Create production tag
git tag v1.8.0
git push origin main --tags

# 5. Wait ~20-30 mins for builds
# 6. Wait 24-48 hours for store review
# 7. Release goes live!
```

---

## 🔐 GitHub Secrets Required

All secrets are added in: **Settings → Secrets and variables → Actions**

### iOS Secrets

- `APP_STORE_CONNECT_API_KEY_JSON`
- `APPLE_ID`
- `MATCH_PASSWORD`
- `MATCH_GIT_BASIC_AUTHORIZATION`

### Android Secrets

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

See [GitHub Secrets Setup Guide](./github_secrets_setup.md) for detailed instructions.

---

## ⚡ Pro Tips

### 1. Test Locally Before CI

```bash
# Test iOS build (macOS only)
yarn prebuild:ios
cd ios && pod install && cd ..
yarn build:ios

# Test Android build
yarn prebuild:android
yarn build:android
```

### 2. Quick Prebuild

```bash
# Regenerate native projects when needed
yarn prebuild:all
```

### 3. View Fastlane Lanes

```bash
bundle exec fastlane lanes
```

### 4. Manual Fastlane Commands

```bash
# iOS
bundle exec fastlane ios build
bundle exec fastlane ios beta
bundle exec fastlane ios release

# Android
bundle exec fastlane android build
bundle exec fastlane android beta
bundle exec fastlane android release
```

### 5. Setup Match (First Time)

```bash
# Initialize Match for iOS code signing
bundle exec fastlane match init

# Generate certificates
bundle exec fastlane match appstore
```

---

## 🐛 Troubleshooting

### Build stuck on "Running Tests"

- Tests run before deployment to ensure quality
- Check test.yml workflow for failures
- Fix failing tests before deployment proceeds

### iOS: "No matching provisioning profiles"

```bash
bundle exec fastlane match appstore --force_for_new_devices
```

### Android: "Keystore was tampered with"

- Verify `ANDROID_KEYSTORE_PASSWORD` in GitHub Secrets
- Re-encode keystore: `base64 -i release.keystore | tr -d '\n'`

### GitHub Action fails with authentication error

- Check all secrets are correctly set
- For iOS: Verify App Store Connect API key
- For Android: Verify service account JSON

### Prebuild fails

```bash
# Clean and retry
npx expo prebuild --clean
```

### CocoaPods installation fails (iOS)

```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
```

---

## 📚 Additional Documentation

- [GitHub Secrets Setup Guide](./github_secrets_setup.md) - How to configure all required secrets
- [Native Build Deployment Guide](./native_build_deployment.md) - Comprehensive deployment guide
- [EAS to Native Migration Guide](./eas_to_native_migration.md) - Migration from EAS builds
- [Fastlane Documentation](https://docs.fastlane.tools/) - Official Fastlane docs
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/) - Expo prebuild guide

---

## 🎉 Quick Start Checklist

For first-time setup:

- [ ] Install Fastlane: `bundle install`
- [ ] Setup iOS code signing: `bundle exec fastlane match appstore`
- [ ] Generate Android keystore (if needed)
- [ ] Add all GitHub secrets
- [ ] Test local builds
- [ ] Test staging deployment
- [ ] Verify builds in TestFlight/Play Console
- [ ] You're ready to deploy! 🚀
