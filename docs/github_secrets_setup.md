# GitHub Secrets Setup Guide

This guide explains how to configure all the required GitHub secrets for automated iOS and Android builds using Fastlane.

## Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, then add the following secrets:

---

## iOS Secrets

### 1. `APP_STORE_CONNECT_API_KEY_ID`

**What it is:** The Key ID for your App Store Connect API Key

**How to get it:**

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Integrations** → **App Store Connect API**
3. Click **Generate API Key** or select an existing key
4. Copy the **Key ID** (format: `ABC12DEF34`)

**Value format:** `ABC12DEF34`

---

### 2. `APP_STORE_CONNECT_ISSUER_ID`

**What it is:** The Issuer ID for your App Store Connect API Key

**How to get it:**

1. Same location as above (Users and Access → Integrations → App Store Connect API)
2. Copy the **Issuer ID** at the top of the page (UUID format)

**Value format:** `12345678-1234-1234-1234-123456789012`

---

### 3. `APP_STORE_CONNECT_API_KEY_CONTENT`

**What it is:** The contents of your App Store Connect API private key file (.p8)

**How to get it:**

1. When generating your API key in App Store Connect, download the `.p8` file
2. **Important:** You can only download this once! Keep it safe
3. Open the file in a text editor and copy the entire contents

**Value format:**

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
[multiple lines of base64 encoded data]
...vwOhBBNCEmZ+EI0bzzret3mw=
-----END PRIVATE KEY-----
```

**Note:** Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines

---

### 4. `APPLE_ID`

**What it is:** Your Apple ID email address

**Value format:** `your.email@example.com`

---

### 5. `MATCH_PASSWORD`

**What it is:** Password to encrypt/decrypt your certificates stored in your match repository

**How to set it:**

1. Choose a strong password (this is what Fastlane Match will use to encrypt your certificates)
2. If you haven't run `fastlane match` yet, choose a new password
3. If you already have certificates in a match repo, use the existing password

**Value format:** `YourSecurePassword123!`

---

### 6. `MATCH_GIT_BASIC_AUTHORIZATION`

**What it is:** Base64 encoded GitHub credentials for accessing your match certificates repository

**How to generate it:**

**Option A: Using Personal Access Token (Recommended)**

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Give it a name like "Fastlane Match"
4. Select scope: `repo` (full control of private repositories)
5. Click **Generate token** and copy it
6. Create the base64 encoded value:
   ```bash
   echo -n "your-github-username:your-personal-access-token" | base64
   ```

**Option B: Using your GitHub password**

```bash
echo -n "your-github-username:your-github-password" | base64
```

**Value format:** `dXNlcm5hbWU6cGFzc3dvcmQK` (base64 encoded string)

---

## Android Secrets

### 7. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

**What it is:** JSON credentials for your Google Play Service Account

**How to get it:**

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. If not linked, click **Link** to link your Google Cloud Project
4. Click **Create new service account**
   - This redirects to Google Cloud Console
5. In Google Cloud Console:
   - Click **Create Service Account**
   - Name: `fastlane-deploy` or similar
   - Click **Create and Continue**
   - Grant role: **Service Account User**
   - Click **Done**
6. Find your service account in the list, click on it
7. Go to **Keys** tab → **Add Key** → **Create new key**
8. Choose **JSON** format and click **Create**
9. Save the downloaded JSON file
10. Back in Play Console → **Setup** → **API Access**:
    - Find your service account
    - Click **Grant access**
    - Under **App permissions**, add your app
    - Under **Account permissions**, grant:
      - **View app information and download bulk reports**
      - **Manage production releases**
      - **Manage testing track releases**
    - Click **Invite user** / **Apply**

**Value format:**

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "fastlane-deploy@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Note:** Copy the entire JSON file contents as-is

---

### 8. `ANDROID_KEYSTORE_BASE64`

**What it is:** Base64 encoded Android keystore file used to sign your app

**How to generate it:**

**If you don't have a keystore yet:**

```bash
keytool -genkey -v -keystore release.keystore -alias coral-clash \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Convert your keystore to base64:**

```bash
base64 -i release.keystore | tr -d '\n' > keystore_base64.txt
```

**Value format:** Long base64 string (no line breaks)

**Important:** Keep your original `release.keystore` file safe! You'll need it for all future releases.

---

### 9. `ANDROID_KEYSTORE_PASSWORD`

**What it is:** Password for your Android keystore file

**Value format:** The password you set when creating the keystore

---

### 10. `ANDROID_KEY_ALIAS`

**What it is:** The alias name for your key within the keystore

**Value format:** `coral-clash` (or whatever alias you used when creating the keystore)

---

### 11. `ANDROID_KEY_PASSWORD`

**What it is:** Password for the specific key alias (can be the same as keystore password)

**Value format:** The password you set for the key alias

---

## Verification Commands

After adding all secrets, you can verify your setup locally:

### iOS Verification (requires macOS)

```bash
# Install dependencies
bundle install

# Setup match (first time only)
bundle exec fastlane match appstore --readonly false

# Test iOS build
bundle exec fastlane ios build
```

### Android Verification

```bash
# Install dependencies
bundle install

# Test Android build
bundle exec fastlane android build
```

---

## Security Best Practices

1. **Never commit these files:**
   - `*.p8` (App Store Connect API key)
   - `*.keystore` (Android keystore)
   - `google-play-key.json` (Service account JSON)
   - Add them to `.gitignore`

2. **Backup important files:**
   - Android keystore (`release.keystore`)
   - Store in a secure location (password manager, encrypted storage)
   - If you lose the keystore, you cannot update your app!

3. **Use strong passwords:**
   - All passwords should be unique and strong
   - Consider using a password manager

4. **Limit access:**
   - Only give GitHub secrets access to trusted collaborators
   - Use environment protection rules for production deployments

5. **Rotate credentials periodically:**
   - App Store Connect API keys: yearly
   - GitHub Personal Access Tokens: yearly
   - Google Play Service Account: as needed

---

## Fastlane Match Setup (iOS Code Signing)

Fastlane Match stores your iOS certificates and provisioning profiles in a private Git repository. This ensures code signing works consistently across CI/CD and local machines.

### First Time Setup

1. **Create a private Git repository** for storing certificates:

   ```bash
   # On GitHub, create a new private repository called "fastlane-match-certificates"
   ```

2. **Initialize Match:**

   ```bash
   bundle exec fastlane match init
   ```

   - Choose `git` as the storage mode
   - Enter your private repo URL: `https://github.com/your-username/fastlane-match-certificates`

3. **Generate certificates:**

   ```bash
   # For App Store distribution
   bundle exec fastlane match appstore

   # You'll be prompted for:
   # - Match repository password (this becomes MATCH_PASSWORD)
   # - Apple ID
   # - App bundle identifier
   ```

4. **Important:** Save the password you chose - this is your `MATCH_PASSWORD` secret

### Matchfile Configuration

Create `fastlane/Matchfile`:

```ruby
git_url("https://github.com/your-username/fastlane-match-certificates")
storage_mode("git")
type("appstore")
app_identifier(["com.jbuxofplenty.coralclash"])
username(ENV["APPLE_ID"])
```

---

## Troubleshooting

### iOS Build Fails: "No matching provisioning profiles"

- Run `bundle exec fastlane match appstore --readonly false` to regenerate profiles
- Verify `MATCH_PASSWORD` is correct
- Check that `MATCH_GIT_BASIC_AUTHORIZATION` has repo access

### Android Build Fails: "Keystore was tampered with"

- Verify `ANDROID_KEYSTORE_PASSWORD` is correct
- Re-encode keystore: `base64 -i release.keystore | tr -d '\n'`

### GitHub Action Fails: "Authentication failed"

- Check all secrets are added and spelled correctly
- Verify API keys haven't expired
- For iOS: Regenerate App Store Connect API key if needed
- For Android: Check service account permissions in Play Console

### Match Git Authentication Issues

- Verify `MATCH_GIT_BASIC_AUTHORIZATION` is correctly base64 encoded
- Ensure GitHub PAT has `repo` scope
- Test: `echo "YOUR_BASE64_STRING" | base64 -d` should show `username:token`

---

## Quick Reference

```bash
# Test iOS build locally
bundle exec fastlane ios build

# Test Android build locally
bundle exec fastlane android build

# Submit to TestFlight
bundle exec fastlane ios beta

# Submit to Play Store Internal Testing
bundle exec fastlane android beta

# View all lanes
bundle exec fastlane lanes
```

---

## Need Help?

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [Google Play Developer API](https://developers.google.com/android-publisher)
