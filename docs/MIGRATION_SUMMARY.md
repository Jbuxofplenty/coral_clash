# EAS to Native Builds Migration - Summary

## ✅ What Was Changed

This migration removes EAS (Expo Application Services) as a build dependency and implements native builds using Fastlane.

---

## 📁 New Files Created

### Fastlane Configuration

- **`Gemfile`** - Ruby dependencies (Fastlane)
- **`fastlane/Fastfile`** - Build and deployment automation scripts
- **`fastlane/Appfile`** - App identifiers and credentials configuration

### Documentation

- **`docs/github_secrets_setup.md`** - Comprehensive guide for all GitHub secrets
- **`docs/native_build_deployment.md`** - Complete deployment guide
- **`docs/eas_to_native_migration.md`** - Step-by-step migration instructions
- **`docs/MIGRATION_SUMMARY.md`** - This file

---

## 🔄 Modified Files

### GitHub Workflows

- **`.github/workflows/build-and-submit.yml`**
  - Now uses native builds with Fastlane
  - iOS job runs on macOS with Xcode
  - Android job runs on Ubuntu with Gradle
  - Requires new GitHub secrets (see below)

- **`.github/workflows/deploy-staging.yml`**
  - Still calls `test.yml` first (no change needed)
  - Calls updated `build-and-submit.yml`

- **`.github/workflows/deploy.yml`**
  - No changes needed (already calls reusable workflow)

### Configuration Files

- **`package.json`**
  - Removed EAS build scripts
  - Added Fastlane build scripts
  - Added prebuild scripts

- **`.gitignore`**
  - Added Fastlane output directories
  - Added Ruby bundle directories
  - Added Android keystore files
  - Added iOS certificate files

### Documentation Updates

- **`docs/deployment_quick_reference.md`** - Updated for native builds

---

## 🔐 Required GitHub Secrets

You need to add **9 secrets** to your GitHub repository:

### iOS (4 secrets)

1. `APP_STORE_CONNECT_API_KEY_JSON`
2. `APPLE_ID`
3. `MATCH_PASSWORD`
4. `MATCH_GIT_BASIC_AUTHORIZATION`

### Android (5 secrets)

7. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
8. `ANDROID_KEYSTORE_BASE64`
9. `ANDROID_KEYSTORE_PASSWORD`
10. `ANDROID_KEY_ALIAS`
11. `ANDROID_KEY_PASSWORD`

📖 **Detailed setup instructions:** [docs/github_secrets_setup.md](./github_secrets_setup.md)

---

## 📋 Next Steps (Action Required)

### 1. Install Fastlane Locally

```bash
bundle install
```

### 2. Setup iOS Code Signing (Fastlane Match)

**a) Create a private repository:**

- Go to GitHub → New Repository
- Name: `fastlane-match-certificates` (or similar)
- Make it **private**
- Don't initialize with README

**b) Initialize Match:**

```bash
bundle exec fastlane match init
```

- Choose `git` storage
- Enter your private repo URL

**c) Update Matchfile:**
Edit `fastlane/Matchfile` to add your repo URL:

```ruby
git_url("https://github.com/YOUR-USERNAME/fastlane-match-certificates")
```

**d) Generate certificates:**

```bash
bundle exec fastlane match appstore
```

- Enter your Apple ID
- Create a strong password (save this as `MATCH_PASSWORD` secret)

### 3. Setup Android Keystore

**If you don't have one:**

```bash
keytool -genkey -v -keystore release.keystore -alias coral-clash \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Convert to base64:**

```bash
base64 -i release.keystore | tr -d '\n' > keystore_base64.txt
```

**Important:** Backup `release.keystore` securely! You cannot update your app without it.

### 4. Setup Google Play Service Account

Follow the detailed steps in [docs/github_secrets_setup.md](./github_secrets_setup.md#7-google_play_service_account_json)

Key steps:

1. Create service account in Google Cloud Console
2. Download JSON key
3. Grant access in Play Console with proper permissions

### 5. Setup App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Integrations** → **App Store Connect API**
3. Generate new API key
4. Download `.p8` file (only shown once!)
5. Save Key ID and Issuer ID

### 6. Add All GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions**

Add all 11 secrets listed above.

See [docs/github_secrets_setup.md](./github_secrets_setup.md) for exact values and formats.

### 7. Test Local Builds

**iOS (requires macOS):**

```bash
yarn prebuild:ios
cd ios && pod install && cd ..
yarn build:ios
```

**Android:**

```bash
# Set environment variables first (see migration guide)
yarn prebuild:android
yarn build:android
```

### 8. Test CI/CD Pipeline

```bash
# Push to develop to trigger staging deployment
git checkout develop
git add .
git commit -m "chore: migrate to native builds"
git push origin develop
```

Monitor in GitHub Actions → Check TestFlight and Play Console after ~20-30 minutes.

---

## 🚀 New Deployment Commands

### Local Builds

```bash
# Generate native projects
yarn prebuild:ios
yarn prebuild:android
yarn prebuild:all

# Build iOS (macOS only)
yarn build:ios                  # Build only
yarn build:staging:ios          # Build + TestFlight
yarn build:production:ios       # Build + App Store

# Build Android
yarn build:android              # Build only
yarn build:staging:android      # Build + Internal Testing
yarn build:production:android   # Build + Production
```

### CI/CD Deployments (unchanged)

```bash
# Staging
git push origin develop
# OR
git tag v1.8.0-beta.1 && git push origin v1.8.0-beta.1

# Production
git tag v1.8.0 && git push origin v1.8.0
```

---

## 🔍 What Happens During Build

### Old Process (EAS)

```
1. Push code to GitHub
2. GitHub Actions triggers
3. EAS cloud builds app
4. EAS submits to stores
```

### New Process (Native)

```
1. Push code to GitHub
2. GitHub Actions triggers
3. Run tests (test.yml)
4. Expo prebuild generates native directories
5. iOS: Fastlane builds with Xcode on macOS runner
6. Android: Fastlane builds with Gradle on Ubuntu runner
7. Fastlane submits to stores
8. Build artifacts uploaded to GitHub
```

---

## 📊 Key Differences

| Aspect              | EAS            | Native                 |
| ------------------- | -------------- | ---------------------- |
| **Build Location**  | EAS Cloud      | GitHub Actions         |
| **Build Speed**     | Varies (queue) | Consistent, Parallel   |
| **iOS Signing**     | EAS manages    | Fastlane Match         |
| **Android Signing** | EAS manages    | Manual keystore        |
| **Dependencies**    | EAS account    | Fastlane only          |
| **Cost**            | EAS pricing    | GitHub Actions minutes |
| **Control**         | Limited        | Full control           |
| **Debugging**       | Limited        | Full logs              |

---

## 🎯 Benefits

✅ **No EAS dependency** - Works with any CI/CD platform
✅ **Faster builds** - Parallel iOS/Android builds
✅ **Better debugging** - Full access to build logs
✅ **More control** - Customize every build step
✅ **No queue waits** - Immediate build starts
✅ **Portable** - Can run locally or on any CI

---

## ⚠️ Important Notes

### iOS

- **Fastlane Match** manages certificates in a private Git repo
- You need a **separate private repository** for certificates
- Match password encrypts certificates - **don't lose it!**
- iOS builds require **macOS runners** (GitHub Actions provides these)

### Android

- **Backup your keystore file** - you cannot update app without it
- Store keystore in multiple secure locations
- Keystore is base64 encoded for GitHub secrets
- Original keystore file should never be committed to Git

### Security

- All sensitive files are in `.gitignore`
- Secrets are stored in GitHub Actions secrets
- Never commit: `.p8`, `.p12`, `.keystore`, JSON keys
- Use strong passwords for Match and keystores

---

## 📚 Documentation Links

1. **[GitHub Secrets Setup](./github_secrets_setup.md)** - How to configure all secrets
2. **[Native Build Deployment](./native_build_deployment.md)** - Complete deployment guide
3. **[Migration Guide](./eas_to_native_migration.md)** - Detailed migration steps
4. **[Quick Reference](./deployment_quick_reference.md)** - Command cheat sheet

---

## 🆘 Getting Help

### Troubleshooting

See [Native Build Deployment Guide - Troubleshooting](./native_build_deployment.md#troubleshooting)

### Common Issues

- **iOS: "No matching provisioning profiles"**
  - Run: `bundle exec fastlane match appstore --force_for_new_devices`

- **Android: "Keystore was tampered with"**
  - Verify keystore password in GitHub secrets
  - Re-encode keystore file

- **GitHub Actions: "Authentication failed"**
  - Check all secrets are correctly set
  - Verify no extra spaces in secret values

### External Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [Expo Prebuild Docs](https://docs.expo.dev/workflow/prebuild/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## ✅ Migration Checklist

Use this checklist to track your progress:

- [ ] Review all documentation files
- [ ] Install Fastlane: `bundle install`
- [ ] Create private repo for Match certificates
- [ ] Setup Fastlane Match: `bundle exec fastlane match appstore`
- [ ] Generate/obtain Android keystore
- [ ] Setup Google Play service account
- [ ] Setup App Store Connect API key
- [ ] Add all 11 GitHub secrets
- [ ] Update Matchfile with your repo URL
- [ ] Test iOS build locally (if on macOS)
- [ ] Test Android build locally
- [ ] Test staging deployment via GitHub Actions
- [ ] Verify TestFlight build
- [ ] Verify Play Console build
- [ ] Test production deployment
- [ ] Update team documentation
- [ ] Celebrate! 🎉

---

## 🎉 You're Ready!

Once you complete the setup steps above, your deployment process will be:

```bash
# Staging
git push origin develop

# Production
git tag v1.8.0 && git push origin v1.8.0
```

Same simple interface, but now with native builds and full control!

**Questions?** See the detailed guides in the `docs/` folder.
