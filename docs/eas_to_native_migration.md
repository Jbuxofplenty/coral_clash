# EAS to Native Build Migration Guide

This guide walks you through migrating from EAS Build to native builds using Fastlane.

## Why Migrate?

**Benefits of Native Builds:**

- ✅ Full control over build process
- ✅ No dependency on EAS cloud infrastructure
- ✅ Faster builds (parallel iOS/Android)
- ✅ No EAS account required
- ✅ Better debugging capabilities
- ✅ Works with any CI/CD platform
- ✅ No EAS build queue wait times

**Trade-offs:**

- ⚠️ More initial setup required
- ⚠️ Need to manage certificates/keystores yourself
- ⚠️ Larger GitHub Actions runner costs (macOS for iOS)

---

## Migration Steps

### Phase 1: Backup Current Setup

1. **Backup EAS credentials:**

   ```bash
   # List current credentials
   eas credentials

   # Download iOS certificates (if needed)
   eas credentials -p ios

   # Download Android keystore
   eas credentials -p android
   ```

2. **Document current configuration:**
   - Save your current `eas.json`
   - Note your app versions
   - Document any custom build configurations

3. **Create a backup branch:**
   ```bash
   git checkout -b backup/eas-config
   git push origin backup/eas-config
   ```

---

### Phase 2: Install Fastlane

1. **Create Gemfile:**

   ```bash
   cat > Gemfile << 'EOF'
   source 'https://rubygems.org'

   gem 'fastlane'
   EOF
   ```

2. **Install Fastlane:**

   ```bash
   bundle install
   ```

3. **Verify installation:**
   ```bash
   bundle exec fastlane --version
   ```

---

### Phase 3: iOS Setup

#### A. Setup Fastlane Match (Code Signing)

1. **Create a private repository for certificates:**
   - Go to GitHub → New Repository
   - Name: `fastlane-match-certificates` (or similar)
   - **Important:** Make it **private**
   - Initialize empty (no README)

2. **Initialize Match:**

   ```bash
   bundle exec fastlane match init
   ```

   - Choose `git` storage
   - Enter repo URL: `https://github.com/your-username/fastlane-match-certificates`

3. **Create Matchfile:**

   ```bash
   cat > fastlane/Matchfile << 'EOF'
   git_url("https://github.com/your-username/fastlane-match-certificates")
   storage_mode("git")
   type("appstore")
   app_identifier(["com.jbuxofplenty.coralclash"])
   username(ENV["APPLE_ID"])
   EOF
   ```

4. **Generate certificates:**

   ```bash
   bundle exec fastlane match appstore
   ```

   - Enter your Apple ID
   - Create a **strong password** (save this for later!)
   - This generates and stores your certificates

5. **Save the password** - this is your `MATCH_PASSWORD` secret

#### B. Setup App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Integrations** → **App Store Connect API**
3. Click **Generate API Key** (or use existing)
   - Name: `GitHub Actions Deploy`
   - Access: **App Manager** or **Admin**
4. Download the `.p8` file (**you can only do this once!**)
5. Save:
   - Key ID (e.g., `ABC12DEF34`)
   - Issuer ID (UUID format)
   - `.p8` file contents

#### C. Create Fastlane Configuration

Create `fastlane/Appfile`:

```ruby
# iOS
app_identifier("com.jbuxofplenty.coralclash")
apple_id(ENV["APPLE_ID"])
itc_team_id("FWV22U8U39")
team_id("FWV22U8U39")

# Android
json_key_file_path(ENV["GOOGLE_PLAY_JSON_KEY_PATH"])
package_name("com.jbuxofplenty.coralclash")
```

Create `fastlane/Fastfile` - see the complete Fastfile in the repository.

#### D. Test iOS Build Locally (requires macOS)

```bash
# Generate iOS project
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install && cd ..

# Test build
bundle exec fastlane ios build

# Test TestFlight submission
bundle exec fastlane ios beta
```

---

### Phase 4: Android Setup

#### A. Get or Generate Keystore

**If you have an existing keystore from EAS:**

```bash
# Download from EAS
eas credentials -p android

# Or extract from eas.json if stored there
```

**If you need a new keystore:**

```bash
keytool -genkey -v -keystore release.keystore -alias coral-clash \
  -keyalg RSA -keysize 2048 -validity 10000

# Answer the prompts:
# - Enter keystore password (SAVE THIS!)
# - Re-enter password
# - First and last name: Your name or company name
# - Organizational unit: Your team/department
# - Organization: Your company name
# - City/Locality: Your city
# - State/Province: Your state
# - Country code: US (or your country)
# - Is this correct? yes
# - Enter key password (can be same as keystore password)
```

**Convert to base64:**

```bash
base64 -i release.keystore | tr -d '\n' > keystore_base64.txt
```

**Important:** Backup `release.keystore` securely! You cannot update your app without it.

#### B. Setup Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. **Link Google Cloud Project** (if not already linked)
4. Click **Create new service account**
   - Redirects to Google Cloud Console
5. In Google Cloud Console:
   - Click **Create Service Account**
   - Name: `fastlane-deploy`
   - Description: `Service account for Fastlane deployments`
   - Click **Create and Continue**
   - Role: **Service Account User**
   - Click **Done**
6. Find service account, click on it
7. **Keys** tab → **Add Key** → **Create new key**
   - Format: **JSON**
   - Click **Create**
   - Save the downloaded JSON file as `google-play-key.json`
8. Back in Play Console:
   - **Setup** → **API Access**
   - Find your service account → **Grant access**
   - **App permissions**: Add "Coral Clash"
   - Grant permissions:
     - ✅ View app information and download bulk reports
     - ✅ Manage production releases
     - ✅ Manage testing track releases
   - Click **Invite user** / **Apply**

#### C. Test Android Build Locally

```bash
# Generate Android project
npx expo prebuild --platform android --clean

# Set environment variables
export ANDROID_KEYSTORE_PATH="./release.keystore"
export ANDROID_KEYSTORE_PASSWORD="your-keystore-password"
export ANDROID_KEY_ALIAS="coral-clash"
export ANDROID_KEY_PASSWORD="your-key-password"
export GOOGLE_PLAY_JSON_KEY_PATH="./google-play-key.json"

# Test build
bundle exec fastlane android build

# Test Play Store submission
bundle exec fastlane android beta
```

---

### Phase 5: GitHub Secrets Setup

Add all required secrets to GitHub (Settings → Secrets and variables → Actions):

#### iOS Secrets

- `APP_STORE_CONNECT_API_KEY_ID` - Key ID from App Store Connect
- `APP_STORE_CONNECT_ISSUER_ID` - Issuer ID from App Store Connect
- `APP_STORE_CONNECT_API_KEY_CONTENT` - Full contents of `.p8` file
- `APPLE_ID` - Your Apple ID email
- `MATCH_PASSWORD` - Password you set for Match
- `MATCH_GIT_BASIC_AUTHORIZATION` - Base64 encoded GitHub credentials

**Generate MATCH_GIT_BASIC_AUTHORIZATION:**

```bash
# Create GitHub Personal Access Token:
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Scopes: repo (full control)

# Then encode:
echo -n "your-github-username:ghp_yourPersonalAccessToken" | base64
```

#### Android Secrets

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` - Full JSON file contents
- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias (e.g., `coral-clash`)
- `ANDROID_KEY_PASSWORD` - Key password

See [GitHub Secrets Setup Guide](./github_secrets_setup.md) for detailed instructions.

---

### Phase 6: Update GitHub Actions Workflows

The workflows have been updated in:

- `.github/workflows/build-and-submit.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy.yml`

No changes needed - they're already configured for native builds.

---

### Phase 7: Test CI/CD

1. **Test staging deployment:**

   ```bash
   git checkout develop
   git add .
   git commit -m "chore: migrate to native builds"
   git push origin develop
   ```

2. **Monitor GitHub Actions:**
   - Go to Actions tab
   - Watch the build progress
   - Check for any errors

3. **Verify builds:**
   - iOS: Check TestFlight for new build
   - Android: Check Play Console Internal Testing

4. **Test the apps:**
   - Download from TestFlight (iOS)
   - Download from Internal Testing (Android)
   - Verify app works correctly

---

### Phase 8: Cleanup

1. **Update .gitignore:**

   ```gitignore
   # iOS
   ios/
   *.p8
   *.p12
   *.mobileprovision
   fastlane/report.xml
   fastlane/Preview.html

   # Android
   android/
   *.keystore
   *.jks
   google-play-key.json
   release.keystore

   # Build outputs
   *.ipa
   *.apk
   *.aab
   build/

   # Ruby
   vendor/bundle
   .bundle
   ```

2. **Remove EAS dependencies (optional):**

   ```bash
   # If you no longer need EAS
   yarn remove eas-cli

   # Keep eas.json for now in case you need to reference it
   # Or move it to a backup location
   mv eas.json eas.json.backup
   ```

3. **Update package.json scripts:**
   - Remove or update EAS-related scripts
   - Add Fastlane scripts

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "chore: complete EAS to native build migration"
   git push origin develop
   ```

---

## Rollback Plan

If you need to rollback to EAS:

1. **Restore EAS configuration:**

   ```bash
   git checkout backup/eas-config -- eas.json
   ```

2. **Restore workflows:**

   ```bash
   git checkout backup/eas-config -- .github/workflows/
   ```

3. **Reinstall EAS CLI:**

   ```bash
   yarn add eas-cli
   ```

4. **Test EAS build:**
   ```bash
   eas build --profile preview --platform ios
   ```

---

## Troubleshooting

### iOS: "No matching provisioning profiles"

```bash
# Regenerate profiles
bundle exec fastlane match appstore --force_for_new_devices

# Or nuke and regenerate
bundle exec fastlane match nuke development
bundle exec fastlane match nuke appstore
bundle exec fastlane match appstore
```

### Android: "Upload failed"

- Check service account permissions in Play Console
- Verify version code is incrementing
- Ensure you're uploading AAB (not APK) for production

### GitHub Actions: "Authentication failed"

- Double-check all secrets are set correctly
- Verify no extra spaces in secret values
- Test secrets locally with environment variables

### Match: "Authentication failed"

- Verify `MATCH_GIT_BASIC_AUTHORIZATION` is correct
- Test decoding: `echo "YOUR_BASE64" | base64 -d`
- Ensure GitHub PAT has `repo` scope

### Prebuild: "Config is not valid"

```bash
# Clear native folders
rm -rf ios android

# Regenerate
npx expo prebuild --clean
```

---

## Verification Checklist

- [ ] Fastlane installed (`bundle exec fastlane --version`)
- [ ] iOS certificates generated with Match
- [ ] Android keystore created and backed up
- [ ] All GitHub secrets added
- [ ] Local iOS build succeeds
- [ ] Local Android build succeeds
- [ ] Staging deployment via GitHub Actions succeeds
- [ ] TestFlight build appears
- [ ] Play Console build appears
- [ ] Apps install and run correctly
- [ ] Production deployment tested
- [ ] Team notified of new process
- [ ] Documentation updated

---

## Key Differences: EAS vs Native

| Aspect               | EAS Build      | Native Build           |
| -------------------- | -------------- | ---------------------- |
| **Build Location**   | EAS cloud      | GitHub Actions         |
| **iOS Signing**      | EAS manages    | Fastlane Match         |
| **Android Signing**  | EAS manages    | Manual keystore        |
| **Build Speed**      | Varies (queue) | Consistent             |
| **Cost**             | EAS pricing    | GitHub Actions minutes |
| **Setup Complexity** | Easy           | Moderate               |
| **Control**          | Limited        | Full control           |
| **Debugging**        | Limited logs   | Full access            |

---

## Post-Migration Best Practices

1. **Regular certificate renewal:**

   ```bash
   # Every 6-12 months
   bundle exec fastlane match appstore --force_for_new_devices
   ```

2. **Keystore backup:**
   - Store in password manager
   - Store in encrypted cloud storage
   - Store in team vault

3. **Monitor builds:**
   - Set up Slack/Discord notifications
   - Review failed builds promptly
   - Keep dependencies updated

4. **Team training:**
   - Share this documentation
   - Document any custom processes
   - Keep secrets secure

---

## Getting Help

If you encounter issues:

1. Check the error logs carefully
2. Review [GitHub Secrets Setup Guide](./github_secrets_setup.md)
3. Review [Native Build Deployment Guide](./native_build_deployment.md)
4. Search [Fastlane Documentation](https://docs.fastlane.tools/)
5. Check Fastlane GitHub issues

---

## Success! 🎉

Once everything is working:

1. Update your team documentation
2. Archive EAS credentials securely
3. Celebrate faster builds! 🚀

**Pro tip:** Keep the EAS account for a few weeks in case you need to reference or rollback. After confidence is high, you can fully remove EAS dependencies.
