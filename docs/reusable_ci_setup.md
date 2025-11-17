# Reusable CI/CD Setup Guide

This guide shows you how to copy the Coral Clash CI/CD pipeline to another React Native project.

## Overview

The workflows and Fastfile are now **fully generalized** - you can copy them as-is without any code changes. All app-specific configuration is done through GitHub Variables and Secrets.

## Step 1: Copy Files to Your New Project

Copy these files from Coral Clash to your new project:

```bash
# GitHub Workflows (copy all)
cp .github/workflows/build-and-submit.yml your-project/.github/workflows/
cp .github/workflows/deploy-staging.yml your-project/.github/workflows/
cp .github/workflows/deploy.yml your-project/.github/workflows/
cp .github/workflows/promote-to-production.yml your-project/.github/workflows/
cp .github/workflows/test.yml your-project/.github/workflows/

# Fastlane
cp fastlane/Fastfile your-project/fastlane/
cp fastlane/Appfile your-project/fastlane/  # Optional: update for local dev
cp fastlane/Matchfile your-project/fastlane/  # Optional: update for local dev

# Optional: Firebase deployment
cp .github/workflows/firebase-deploy.yml your-project/.github/workflows/
```

## Step 2: Configure GitHub Variables

Go to your new repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab

Click "New repository variable" for each:

### iOS Variables (6 variables)

| Variable Name        | Description             | Example Value               |
| -------------------- | ----------------------- | --------------------------- |
| `IOS_APP_IDENTIFIER` | iOS Bundle Identifier   | `com.yourcompany.yourapp`   |
| `IOS_TEAM_ID`        | Apple Developer Team ID | `ABC123XYZ`                 |
| `IOS_SCHEME`         | Xcode Scheme Name       | `YourApp`                   |
| `IOS_WORKSPACE_PATH` | Path to .xcworkspace    | `./ios/YourApp.xcworkspace` |
| `IOS_PROJECT_PATH`   | Path to .xcodeproj      | `./ios/YourApp.xcodeproj`   |
| `IOS_OUTPUT_NAME`    | Output IPA filename     | `YourApp.ipa`               |

### Android Variables (2 variables)

| Variable Name          | Description             | Example Value             |
| ---------------------- | ----------------------- | ------------------------- |
| `ANDROID_PACKAGE_NAME` | Android Package Name    | `com.yourcompany.yourapp` |
| `ANDROID_PROJECT_DIR`  | Path to Android project | `./android`               |

### Firebase Variables (optional - 1 variable)

| Variable Name         | Description         | Example Value           |
| --------------------- | ------------------- | ----------------------- |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `your-firebase-project` |

**💡 Tip:** For most standard React Native apps, the iOS paths follow the pattern `./ios/{AppName}.xcworkspace` and `./ios/{AppName}.xcodeproj`

## Step 3: Configure GitHub Secrets

Go to **Secrets** tab (next to Variables)

Click "New repository secret" for each:

### iOS Secrets (4 secrets)

| Secret Name                      | Description               | How to Get                           |
| -------------------------------- | ------------------------- | ------------------------------------ |
| `APP_STORE_CONNECT_API_KEY_JSON` | API Key JSON file         | JSON with key_id, issuer_id, and key |
| `APPLE_ID`                       | Your Apple ID email       | your.email@apple.com                 |
| `MATCH_PASSWORD`                 | Fastlane Match password   | Your chosen password                 |
| `MATCH_GIT_BASIC_AUTHORIZATION`  | Git auth for certificates | base64 of `username:token`           |

**Create MATCH_GIT_BASIC_AUTHORIZATION:**

```bash
echo -n "your-github-username:your-github-token" | base64
```

### Android Secrets (5 secrets)

| Secret Name                        | Description             | How to Get                           |
| ---------------------------------- | ----------------------- | ------------------------------------ |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Service account JSON    | Entire contents of JSON file         |
| `ANDROID_KEYSTORE_BASE64`          | Base64 encoded keystore | See command below                    |
| `ANDROID_KEYSTORE_PASSWORD`        | Keystore password       | Password used when creating keystore |
| `ANDROID_KEY_ALIAS`                | Key alias               | Alias used when creating keystore    |
| `ANDROID_KEY_PASSWORD`             | Key password            | Key password from keystore           |

**Create ANDROID_KEYSTORE_BASE64:**

```bash
base64 -i your-keystore.jks | tr -d '\n'
```

## Step 4: Set Up GitHub Environments

Go to **Settings** → **Environments**

### Create "staging" Environment

1. Click "New environment"
2. Name: `staging`
3. Don't add any protection rules
4. Click "Configure environment"

### Create "production" Environment

1. Click "New environment"
2. Name: `production`
3. Enable "Required reviewers"
4. Add yourself and/or team members
5. Click "Configure environment"

### Create "production-approval" Environment

1. Click "New environment"
2. Name: `production-approval`
3. Enable "Required reviewers"
4. Add yourself and/or team members
5. Click "Configure environment"

## Step 5: Test the Pipeline

```bash
# In your new project
git add .
git commit -m "feat(ci): add deployment workflows"
git push

# Create a staging tag
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

Watch the deployment in the Actions tab!

## Complete Variable/Secret List for Copy-Paste

### Coral Clash Values (For Reference)

If you need to see working values, here are Coral Clash's settings:

**Variables:**

```
IOS_APP_IDENTIFIER=com.jbuxofplenty.coralclash
IOS_TEAM_ID=FWV22U8U39
IOS_SCHEME=CoralClash
IOS_WORKSPACE_PATH=./ios/CoralClash.xcworkspace
IOS_PROJECT_PATH=./ios/CoralClash.xcodeproj
IOS_OUTPUT_NAME=CoralClash.ipa
ANDROID_PACKAGE_NAME=com.jbuxofplenty.coralclash
ANDROID_PROJECT_DIR=./android
FIREBASE_PROJECT_ID=coral-clash
```

## Customization Options

### Different Android Build Output Path?

If your Android project has a different build output structure, update the artifact upload paths in `build-and-submit.yml`:

```yaml
- name: Upload Android build artifacts
  uses: actions/upload-artifact@v4
  with:
    path: |
      ./android/app/build/outputs/bundle/release/*.aab  # Update this
      ./android/app/build/outputs/apk/release/*.apk      # And this
```

### Skip Firebase Deployment?

Remove or comment out the `deploy-firebase` job in `deploy-staging.yml`.

### Different Branch Name?

Update `deploy-staging.yml` if you don't use `develop`:

```yaml
on:
  push:
    branches:
      - main # Change from 'develop'
```

## Troubleshooting

### "Variable not found" error

Make sure you created the variables in the **Variables** tab, not the Secrets tab.

### "Required variable IOS_APP_IDENTIFIER is not set"

The variable name must match exactly (case-sensitive). Double-check spelling.

### Local Development

For local Fastlane runs, create a `.env` file in your project root:

```bash
# .env (add to .gitignore!)
IOS_APP_IDENTIFIER=com.yourcompany.yourapp
IOS_TEAM_ID=ABC123XYZ
IOS_SCHEME=YourApp
IOS_WORKSPACE_PATH=./ios/YourApp.xcworkspace
IOS_PROJECT_PATH=./ios/YourApp.xcodeproj
IOS_OUTPUT_NAME=YourApp.ipa
ANDROID_PACKAGE_NAME=com.yourcompany.yourapp
ANDROID_PROJECT_DIR=./android

# Add your local secrets too
APPLE_ID=your.email@example.com
MATCH_PASSWORD=your_match_password
```

## What's Different from Templates?

**Old approach (templates):**

- Copy template files
- Find/replace all app-specific values
- Easy to miss something
- Hard to update later

**New approach (variables):**

- ✅ Copy files as-is (no editing needed)
- ✅ Configure everything in GitHub UI
- ✅ Clear separation of code vs config
- ✅ Easy to update workflows (just copy new version)
- ✅ Same workflow files work for all projects

## Setting Variables for Coral Clash

This repo also needs variables set! Go to Settings → Secrets and variables → Actions → Variables and add the values listed above.

## Summary Checklist

- [ ] Copy workflow files to new project
- [ ] Copy Fastfile to new project
- [ ] Set 8-9 GitHub Variables (6 iOS + 2 Android + 1 Firebase optional)
- [ ] Set 11 GitHub Secrets (6 iOS + 5 Android)
- [ ] Create 3 GitHub Environments (staging, production, production-approval)
- [ ] Test with staging tag
- [ ] 🎉 Done!

## Need Help?

- See `/docs/deployment_setup.md` for detailed setup instructions
- See `/docs/deployment_quick_reference.md` for commands
- Check Coral Clash Actions tab for working examples
- Review Fastlane docs: https://docs.fastlane.tools/

---

**Time to setup:** ~15 minutes  
**Maintenance:** Just update variables if app name/ID changes  
**Reusability:** 100% - same files work for any RN app
