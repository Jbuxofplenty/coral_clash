# Native Build Deployment Guide

This guide explains how to deploy Coral Clash using native builds with Fastlane instead of EAS.

## Overview

The deployment system uses:

- **Expo Prebuild** to generate native iOS/Android directories
- **Fastlane** for building and submitting to app stores
- **GitHub Actions** for CI/CD automation

## Prerequisites

1. **GitHub Secrets** configured (see [GitHub Secrets Setup Guide](./github_secrets_setup.md))
2. **Fastlane Match** set up for iOS code signing
3. **Android keystore** generated and backed up
4. **Bundle dependencies** installed: `bundle install`

---

## Local Builds

### iOS (requires macOS)

```bash
# Install Ruby dependencies
bundle install

# Generate iOS native project
npx expo prebuild --platform ios --clean

# Install CocoaPods
cd ios && pod install && cd ..

# Build for TestFlight
bundle exec fastlane ios beta

# Build for App Store
bundle exec fastlane ios release
```

### Android

```bash
# Install Ruby dependencies
bundle install

# Generate Android native project
npx expo prebuild --platform android --clean

# Set up environment variables
export ANDROID_KEYSTORE_PATH="./release.keystore"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="coral-clash"
export ANDROID_KEY_PASSWORD="your-password"
export GOOGLE_PLAY_JSON_KEY_PATH="./google-play-key.json"

# Build for Internal Testing
bundle exec fastlane android beta

# Build for Production
bundle exec fastlane android release
```

---

## Automated Deployments via GitHub Actions

### Staging (TestFlight / Internal Testing)

**Method 1: Push to develop branch**

```bash
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop
```

**Method 2: Create a beta/RC tag**

```bash
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1
```

**Method 3: Manual trigger**

1. Go to GitHub → Actions → "Deploy to Staging"
2. Click "Run workflow"
3. Select platform (iOS, Android, or all)

### Production (App Store / Play Store)

**Method 1: Create a version tag**

```bash
# Update version in app.json if needed
git add app.json
git commit -m "chore: bump version to 1.8.0"

git tag v1.8.0
git push origin main --tags
```

**Method 2: Manual trigger**

1. Go to GitHub → Actions → "Deploy to Production"
2. Click "Run workflow"
3. Select platform (iOS, Android, or all)

---

## Deployment Architecture

### Workflow Flow

```
┌─────────────────────────────────────────────────────────┐
│              deploy-staging.yml / deploy.yml             │
│                  (Trigger Workflows)                     │
│                                                          │
│  • Detect platform (iOS/Android/all)                    │
│  • Call build-and-submit.yml                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              build-and-submit.yml                        │
│              (Reusable Build Workflow)                   │
│                                                          │
│  iOS Job (macos-latest):                                │
│  • Run expo prebuild (iOS)                              │
│  • Install CocoaPods                                    │
│  • Fastlane match (code signing)                        │
│  • Build with Xcode                                     │
│  • Upload to TestFlight/App Store                       │
│                                                          │
│  Android Job (ubuntu-latest):                           │
│  • Run expo prebuild (Android)                          │
│  • Setup keystore                                       │
│  • Build with Gradle                                    │
│  • Upload to Play Console                               │
└─────────────────────────────────────────────────────────┘
```

### Fastlane Lanes

**iOS Lanes:**

- `fastlane ios build` - Build IPA file
- `fastlane ios beta` - Build + Upload to TestFlight
- `fastlane ios release` - Build + Upload to App Store

**Android Lanes:**

- `fastlane android build` - Build AAB file
- `fastlane android beta` - Build + Upload to Internal Testing
- `fastlane android release` - Build + Upload to Production

---

## Build Profiles

### Preview (Staging)

- **iOS:** TestFlight (external testing)
- **Android:** Play Console Internal Testing track
- **Triggered by:** `develop` branch pushes, `v*-beta.*` or `v*-rc.*` tags

### Production

- **iOS:** App Store (production)
- **Android:** Play Console Production track
- **Triggered by:** `v*` tags (excluding beta/rc)

---

## Version Management

### Automatic Version Code Increment

**iOS:** Build number auto-increments via `increment_build_number` in Fastfile

**Android:** Version code auto-increments via Gradle:

```gradle
android {
    defaultConfig {
        versionCode getVersionCode()
        versionName "1.8.0"
    }
}

def getVersionCode() {
    def versionCode = System.getenv('VERSION_CODE')
    return versionCode ? versionCode.toInteger() : 1
}
```

### Manual Version Updates

Update in `app.json`:

```json
{
  "expo": {
    "version": "1.8.0"
  }
}
```

This version string is used for both iOS (`CFBundleShortVersionString`) and Android (`versionName`).

---

## Monitoring Deployments

### GitHub Actions

- Navigate to **Actions** tab in your repository
- View real-time build logs
- Download build artifacts (IPA/AAB files)

### App Store Connect (iOS)

- [App Store Connect](https://appstoreconnect.apple.com/)
- Check **TestFlight** tab for beta builds
- Check **App Store** tab for production builds
- Review submission status and TestFlight feedback

### Google Play Console (Android)

- [Google Play Console](https://play.google.com/console)
- Check **Internal testing** track for beta builds
- Check **Production** track for production releases
- View release dashboard and crash reports

### Fastlane CLI

```bash
# View available lanes
bundle exec fastlane lanes

# iOS: Check latest build
xcrun altool --list-apps --apiKey KEY_ID --apiIssuer ISSUER_ID

# Android: Check upload status via Play Console
```

---

## Build Artifacts

GitHub Actions automatically uploads build artifacts:

- **iOS:** `*.ipa` files and Fastlane reports
- **Android:** `*.aab` and `*.apk` files, Fastlane reports
- **Retention:** 30 days

Download artifacts from the GitHub Actions run page.

---

## Troubleshooting

### iOS Build Issues

**"No matching provisioning profiles found"**

```bash
# Regenerate profiles
bundle exec fastlane match appstore --readonly false

# Verify in Xcode
open ios/CoralClash.xcworkspace
```

**"Keychain is locked"**

- This is handled by `setup_ci` in CI environment
- Locally, ensure Keychain is unlocked

**CocoaPods installation fails**

```bash
cd ios
pod deintegrate
pod install --repo-update
```

### Android Build Issues

**"Keystore was tampered with, or password was incorrect"**

- Verify `ANDROID_KEYSTORE_PASSWORD` is correct
- Ensure keystore file wasn't corrupted during base64 encoding

**"Failed to read key from keystore"**

- Verify `ANDROID_KEY_ALIAS` matches the alias in your keystore
- Check `ANDROID_KEY_PASSWORD` is correct

**Gradle build fails**

```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
```

### Expo Prebuild Issues

**"Existing project files detected"**

```bash
# Clean and regenerate
npx expo prebuild --platform ios --clean
npx expo prebuild --platform android --clean
```

**"Config plugin errors"**

- Check `app.json` for invalid plugin configurations
- Update plugins: `yarn upgrade`

### Fastlane Issues

**"Authentication failed"**

- iOS: Verify App Store Connect API key credentials
- Android: Verify Google Play service account JSON
- Check GitHub secrets are correctly set

**"Certificate expired"**

```bash
# Regenerate with Match
bundle exec fastlane match appstore --force_for_new_devices
```

---

## Best Practices

### 1. Test Locally Before CI

Always test builds locally before pushing:

```bash
# Test iOS build
bundle exec fastlane ios build

# Test Android build
bundle exec fastlane android build
```

### 2. Use Staging Before Production

Always deploy to staging (TestFlight/Internal Testing) first:

1. Push to `develop` or create beta tag
2. Test the build thoroughly
3. Then deploy to production

### 3. Keep Dependencies Updated

```bash
# Update Fastlane
bundle update fastlane

# Update CocoaPods (iOS)
cd ios && pod update && cd ..

# Update Gradle (Android)
cd android && ./gradlew wrapper --gradle-version=latest && cd ..
```

### 4. Monitor Build Times

- iOS builds: ~15-25 minutes (on GitHub Actions)
- Android builds: ~10-15 minutes (on GitHub Actions)

### 5. Handle Sensitive Files

Never commit:

- `*.keystore`
- `*.p8`
- `*.p12`
- `google-play-key.json`
- Match repository credentials

Add to `.gitignore`:

```gitignore
# iOS
*.p8
*.p12
*.mobileprovision
fastlane/report.xml
fastlane/Preview.html

# Android
*.keystore
*.jks
google-play-key.json
release.keystore

# Build outputs
ios/build/
android/app/build/
*.ipa
*.apk
*.aab
```

---

## Performance Tips

### Speed Up iOS Builds

```ruby
# In Fastfile
build_app(
  export_method: "app-store",
  skip_profile_detection: true,
  include_bitcode: false
)
```

### Speed Up Android Builds

```gradle
// In android/gradle.properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
android.enableJetifier=true
android.useAndroidX=true
```

### Cache Dependencies

GitHub Actions automatically caches:

- Node modules (via `cache: 'yarn'`)
- Ruby gems (via `bundler-cache: true`)
- CocoaPods (automatically cached by setup-ruby action)
- Gradle dependencies (automatically cached by setup-java action)

---

## Advanced Configuration

### Custom Build Configurations

Add to `Fastfile`:

```ruby
lane :custom_build do |options|
  build_number = options[:build_number] || increment_build_number
  environment = options[:environment] || "staging"

  # Custom build logic here
end
```

### Parallel Builds

Both iOS and Android build in parallel in GitHub Actions:

```yaml
jobs:
  build-ios:
    runs-on: macos-latest
  build-android:
    runs-on: ubuntu-latest
```

### Notifications

Add Slack notifications to `Fastfile`:

```ruby
lane :beta do
  build
  upload_to_testflight
  slack(
    message: "New beta build available!",
    success: true
  )
end
```

### Multiple Environments

Create additional build flavors:

```ruby
# In Fastfile
lane :staging do
  build(configuration: "Staging")
end

lane :production do
  build(configuration: "Release")
end
```

---

## Migration Checklist

If migrating from EAS, complete these steps:

- [ ] Install Fastlane: `bundle install`
- [ ] Setup Fastlane Match for iOS
- [ ] Generate Android keystore
- [ ] Add all GitHub secrets
- [ ] Test local iOS build
- [ ] Test local Android build
- [ ] Test GitHub Actions staging deployment
- [ ] Verify TestFlight build
- [ ] Verify Play Console build
- [ ] Test production deployment
- [ ] Update team documentation

See [EAS to Native Migration Guide](./eas_to_native_migration.md) for detailed steps.

---

## Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
