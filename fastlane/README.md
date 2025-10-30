# Fastlane Configuration

This directory contains Fastlane configuration for building and deploying Coral Clash to the App Store and Play Store.

## Files

- **`Fastfile`** - Lane definitions for build and deployment automation
- **`Appfile`** - App identifiers and team configuration
- **`Matchfile`** - iOS code signing configuration (create this during setup)

## Prerequisites

### Install Fastlane

```bash
# From project root
bundle install
```

### iOS Setup (requires macOS)

1. **Create Match repository:**
   - Create a private GitHub repository for certificates
   - Repository name suggestion: `fastlane-match-certificates`

2. **Initialize Match:**

   ```bash
   bundle exec fastlane match init
   ```

3. **Create Matchfile:**

   ```ruby
   git_url("https://github.com/Jbuxofplenty/fastlane_match")
   storage_mode("git")
   type("appstore")
   app_identifier(["com.jbuxofplenty.coralclash"])
   username(ENV["APPLE_ID"])
   ```

4. **Generate certificates:**
   ```bash
   bundle exec fastlane match appstore
   ```

### Android Setup

1. **Generate keystore** (if you don't have one):

   ```bash
   keytool -genkey -v -keystore release.keystore -alias coral-clash \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Set environment variables:**
   ```bash
   export ANDROID_KEYSTORE_PATH="./release.keystore"
   export ANDROID_KEYSTORE_PASSWORD="your-password"
   export ANDROID_KEY_ALIAS="coral-clash"
   export ANDROID_KEY_PASSWORD="your-password"
   export GOOGLE_PLAY_JSON_KEY_PATH="./google-play-key.json"
   ```

## Available Lanes

### iOS

```bash
# Build IPA
bundle exec fastlane ios build

# Build and upload to TestFlight
bundle exec fastlane ios beta

# Build and upload to App Store
bundle exec fastlane ios release
```

### Android

```bash
# Build AAB
bundle exec fastlane android build

# Build and upload to Internal Testing
bundle exec fastlane android beta

# Build and upload to Production
bundle exec fastlane android release
```

## Environment Variables

### iOS

- `APPLE_ID` - Your Apple Developer email
- `MATCH_PASSWORD` - Password for encrypting certificates
- `MATCH_GIT_BASIC_AUTHORIZATION` - Base64 encoded GitHub credentials
- `APP_STORE_CONNECT_API_KEY_PATH` - Path to .p8 API key file

### Android

- `ANDROID_KEYSTORE_PATH` - Path to keystore file
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password
- `GOOGLE_PLAY_JSON_KEY_PATH` - Path to service account JSON

## CI/CD

In GitHub Actions, these lanes are called automatically:

- Staging: `fastlane ios beta` / `fastlane android beta`
- Production: `fastlane ios release` / `fastlane android release`

See `.github/workflows/build-and-submit.yml` for details.

## Troubleshooting

### iOS: "No matching provisioning profiles"

```bash
bundle exec fastlane match appstore --force_for_new_devices
```

### iOS: "Certificate expired"

```bash
bundle exec fastlane match appstore --force_for_new_devices --readonly false
```

### Android: "Keystore was tampered with"

- Verify `ANDROID_KEYSTORE_PASSWORD` is correct
- Ensure keystore file path is correct

### View all available lanes

```bash
bundle exec fastlane lanes
```

## Documentation

For detailed setup instructions, see:

- [GitHub Secrets Setup](../docs/github_secrets_setup.md)
- [Native Build Deployment](../docs/native_build_deployment.md)
- [Migration Guide](../docs/eas_to_native_migration.md)
