#!/bin/bash

# Setup GitHub Secrets for Coral Clash
# This script uploads .env files and Firebase service files as GitHub secrets

set -e

echo "🔐 Setting up GitHub Secrets for Coral Clash..."
echo ""

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub CLI"
    echo "Run: gh auth login --scopes 'repo,workflow'"
    exit 1
fi

echo "✅ GitHub CLI is authenticated"
echo ""

# Clean up old deprecated secrets if they exist
echo "🧹 Cleaning up old individual environment variable secrets (deprecated)..."
gh secret list | grep "STAGING_EXPO_PUBLIC_" | awk '{print $1}' | while read secret; do
    gh secret delete "$secret" 2>/dev/null && echo "  ✅ Deleted $secret" || true
done
gh secret list | grep "PRODUCTION_EXPO_PUBLIC_" | awk '{print $1}' | while read secret; do
    gh secret delete "$secret" 2>/dev/null && echo "  ✅ Deleted $secret" || true
done
echo ""

# Check if .env files exist
if [ ! -f ".env.preview" ]; then
    echo "❌ Error: .env.preview not found!"
    echo "Please create .env.preview with your Firebase credentials for staging"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production not found!"
    echo "Please create .env.production with your Firebase credentials for production"
    exit 1
fi

echo "📋 Found environment files:"
echo "  • .env.preview (staging)"
echo "  • .env.production (production)"
echo ""

echo "========================================"
echo "Uploading environment files"
echo "========================================"
echo ""

# Upload staging .env file
echo "📤 Uploading .env.preview as STAGING_ENV_FILE..."
# Filter out comments and empty lines before uploading
# Use temp file to ensure proper newline handling
TEMP_ENV=$(mktemp)
grep -v '^\s*#' .env.preview | grep -v '^\s*$' > "$TEMP_ENV"
echo "   Filtered $(wc -l < "$TEMP_ENV" | tr -d ' ') lines (removed comments and empty lines)"
gh secret set STAGING_ENV_FILE < "$TEMP_ENV"
SECRET_UPLOAD_STATUS=$?
rm "$TEMP_ENV"

if [ $SECRET_UPLOAD_STATUS -eq 0 ]; then
    echo "✅ STAGING_ENV_FILE uploaded successfully"
    staging_count=$(grep -c "^EXPO_PUBLIC_" .env.preview || true)
    echo "   Contains $staging_count EXPO_PUBLIC_* variables"
else
    echo "❌ Failed to upload STAGING_ENV_FILE"
    exit 1
fi
echo ""

# Upload production .env file
echo "📤 Uploading .env.production as PRODUCTION_ENV_FILE..."
# Filter out comments and empty lines before uploading
# Use temp file to ensure proper newline handling
TEMP_ENV=$(mktemp)
grep -v '^\s*#' .env.production | grep -v '^\s*$' > "$TEMP_ENV"
echo "   Filtered $(wc -l < "$TEMP_ENV" | tr -d ' ') lines (removed comments and empty lines)"
gh secret set PRODUCTION_ENV_FILE < "$TEMP_ENV"
SECRET_UPLOAD_STATUS=$?
rm "$TEMP_ENV"

if [ $SECRET_UPLOAD_STATUS -eq 0 ]; then
    echo "✅ PRODUCTION_ENV_FILE uploaded successfully"
    production_count=$(grep -c "^EXPO_PUBLIC_" .env.production || true)
    echo "   Contains $production_count EXPO_PUBLIC_* variables"
else
    echo "❌ Failed to upload PRODUCTION_ENV_FILE"
    exit 1
fi
echo ""

echo "========================================"
echo "Setting up App Store Connect API Key"
echo "========================================"
echo ""

# Check if App Store Connect API JSON key exists
# Priority: .env.fastlane > environment variable > auto-discovery
if [ -f ".env.fastlane" ]; then
    # Load from .env.fastlane if it exists
    ENV_API_KEY_PATH=$(grep "^APP_STORE_CONNECT_API_KEY_JSON_PATH=" .env.fastlane | cut -d'=' -f2 | tr -d ' "' | tr -d "'")
    if [ -n "$ENV_API_KEY_PATH" ]; then
        API_KEY_JSON="$ENV_API_KEY_PATH"
        echo "📌 Using API key from .env.fastlane: $API_KEY_JSON"
    fi
fi

# Fall back to environment variable if not set from .env.fastlane
if [ -z "$API_KEY_JSON" ] && [ -n "$APP_STORE_CONNECT_API_KEY_JSON_PATH" ]; then
    API_KEY_JSON="$APP_STORE_CONNECT_API_KEY_JSON_PATH"
    echo "📌 Using API key from APP_STORE_CONNECT_API_KEY_JSON_PATH env var"
fi

# Fall back to auto-discovery if still not set
if [ -z "$API_KEY_JSON" ]; then
    API_KEY_JSON=$(ls fastlane/*.json 2>/dev/null | head -n 1)
    if [ -n "$API_KEY_JSON" ]; then
        echo "📌 Auto-discovered API key: $API_KEY_JSON"
    fi
fi

if [ -z "$API_KEY_JSON" ] || [ ! -f "$API_KEY_JSON" ]; then
    echo "⚠️  Warning: App Store Connect API Key JSON file not found in fastlane/"
    echo "   iOS builds will fail without this key"
    echo "   Download from: https://appstoreconnect.apple.com/access/api"
    echo "   Convert .p8 to JSON format and place in fastlane/ directory"
    echo ""
    echo "   JSON format example:"
    echo '   {'
    echo '     "key_id": "YOUR_KEY_ID",'
    echo '     "issuer_id": "YOUR_ISSUER_ID",'
    echo '     "key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",'
    echo '     "duration": 1200,'
    echo '     "in_house": false'
    echo '   }'
    echo ""
    echo "   Continuing with other secrets..."
else
    echo "📄 Found API Key JSON: $API_KEY_JSON"
    
    # Read and upload the entire JSON file
    API_KEY_JSON_CONTENT=$(cat "$API_KEY_JSON")
    gh secret set APP_STORE_CONNECT_API_KEY_JSON --body "$API_KEY_JSON_CONTENT"
    echo "✅ APP_STORE_CONNECT_API_KEY_JSON uploaded"
    
    # Check for Apple ID in .env.fastlane
    if [ -f ".env.fastlane" ]; then
        APPLE_ID=$(grep "^APPLE_ID=" .env.fastlane | cut -d'=' -f2 | tr -d ' ')
        if [ -n "$APPLE_ID" ]; then
            gh secret set APPLE_ID --body "$APPLE_ID"
            echo "✅ APPLE_ID uploaded from .env.fastlane"
        else
            echo "⚠️  APPLE_ID not found in .env.fastlane"
            echo "   Set it manually: gh secret set APPLE_ID"
        fi
    else
        echo "⚠️  Set APPLE_ID secret manually: gh secret set APPLE_ID"
    fi
    
    echo ""
fi

echo ""

echo "========================================"
echo "Setting up Android keystore"
echo "========================================"
echo ""

# Check if Android keystore exists
ANDROID_KEYSTORE_PATH="fastlane/keystore.jks"
if [ ! -f "$ANDROID_KEYSTORE_PATH" ]; then
    echo "⚠️  Warning: $ANDROID_KEYSTORE_PATH not found!"
    echo "   Android release builds will fail without this keystore"
    echo "   Place your release keystore in fastlane/keystore.jks"
    echo "   Continuing with other secrets..."
else
    echo "📄 Found Android keystore: $ANDROID_KEYSTORE_PATH"
    
    # Base64 encode the keystore
    ANDROID_KEYSTORE_BASE64=$(base64 -i "$ANDROID_KEYSTORE_PATH")
    gh secret set ANDROID_KEYSTORE_BASE64 --body "$ANDROID_KEYSTORE_BASE64"
    echo "✅ ANDROID_KEYSTORE_BASE64 uploaded"
    
    # Prompt for keystore credentials if not in environment
    if [ -z "$ANDROID_KEYSTORE_PASSWORD" ]; then
        echo ""
        echo "⚠️  ANDROID_KEYSTORE_PASSWORD not set"
        echo "   Set it manually: gh secret set ANDROID_KEYSTORE_PASSWORD"
    else
        gh secret set ANDROID_KEYSTORE_PASSWORD --body "$ANDROID_KEYSTORE_PASSWORD"
        echo "✅ ANDROID_KEYSTORE_PASSWORD uploaded"
    fi
    
    if [ -z "$ANDROID_KEY_ALIAS" ]; then
        echo ""
        echo "⚠️  ANDROID_KEY_ALIAS not set"
        echo "   Get it with: keytool -list -v -keystore $ANDROID_KEYSTORE_PATH | grep 'Alias name'"
        echo "   Set it manually: gh secret set ANDROID_KEY_ALIAS"
    else
        gh secret set ANDROID_KEY_ALIAS --body "$ANDROID_KEY_ALIAS"
        echo "✅ ANDROID_KEY_ALIAS uploaded"
    fi
    
    if [ -z "$ANDROID_KEY_PASSWORD" ]; then
        echo ""
        echo "⚠️  ANDROID_KEY_PASSWORD not set"
        echo "   Set it manually: gh secret set ANDROID_KEY_PASSWORD"
    else
        gh secret set ANDROID_KEY_PASSWORD --body "$ANDROID_KEY_PASSWORD"
        echo "✅ ANDROID_KEY_PASSWORD uploaded"
    fi
    
    echo ""
    echo "📋 To set Android keystore credentials as environment variables:"
    echo "   export ANDROID_KEYSTORE_PASSWORD='your-password'"
    echo "   export ANDROID_KEY_ALIAS='de7919af3bdc771f8f3fa07be4204388'"
    echo "   export ANDROID_KEY_PASSWORD='your-password'"
    echo "   Then run this script again"
fi

echo ""

echo "========================================"
echo "Setting up Google Play Service Account"
echo "========================================"
echo ""

# Check if Google Play service account JSON exists
GOOGLE_PLAY_JSON_PATH="fastlane/google-service-account.json"
if [ ! -f "$GOOGLE_PLAY_JSON_PATH" ]; then
    echo "⚠️  Warning: $GOOGLE_PLAY_JSON_PATH not found!"
    echo "   Android Play Store uploads will fail without this key"
    echo "   Download from: https://console.cloud.google.com/iam-admin/serviceaccounts"
    echo "   Place it in fastlane/google-service-account.json"
    echo "   Continuing with other secrets..."
else
    echo "📄 Found Google Play service account: $GOOGLE_PLAY_JSON_PATH"
    
    # Base64 encode the service account JSON
    GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64=$(base64 -i "$GOOGLE_PLAY_JSON_PATH")
    gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --body "$GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64"
    echo "✅ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON uploaded"
fi

echo ""

echo "========================================"
echo "Setting up Firebase service files"
echo "========================================"
echo ""

# Check if Firebase service files exist
if [ ! -f "google-services.json" ]; then
    echo "❌ Error: google-services.json not found!"
    echo "Please add this file to the project root"
    exit 1
fi

if [ ! -f "GoogleService-Info.plist" ]; then
    echo "❌ Error: GoogleService-Info.plist not found!"
    echo "Please add this file to the project root"
    exit 1
fi

# Base64 encode the files for safe storage in secrets
echo "📄 Encoding google-services.json..."
GOOGLE_SERVICES_JSON_BASE64=$(base64 -i google-services.json)
gh secret set GOOGLE_SERVICES_JSON --body "$GOOGLE_SERVICES_JSON_BASE64"
echo "✅ GOOGLE_SERVICES_JSON uploaded"
echo ""

echo "📄 Encoding GoogleService-Info.plist..."
GOOGLE_SERVICE_INFO_PLIST_BASE64=$(base64 -i GoogleService-Info.plist)
gh secret set GOOGLE_SERVICE_INFO_PLIST --body "$GOOGLE_SERVICE_INFO_PLIST_BASE64"
echo "✅ GOOGLE_SERVICE_INFO_PLIST uploaded"

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Created secrets:"
echo "  • STAGING_ENV_FILE (contains all staging env vars)"
echo "  • PRODUCTION_ENV_FILE (contains all production env vars)"
echo "  • ANDROID_KEYSTORE_BASE64 (for Android release builds)"
echo "  • ANDROID_KEYSTORE_PASSWORD (if env var was set)"
echo "  • ANDROID_KEY_ALIAS (if env var was set)"
echo "  • ANDROID_KEY_PASSWORD (if env var was set)"
echo "  • GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (for Play Store uploads)"
echo "  • GOOGLE_SERVICES_JSON (for Android builds)"
echo "  • GOOGLE_SERVICE_INFO_PLIST (for iOS builds)"
echo "  • APP_STORE_CONNECT_API_KEY_JSON (for iOS builds - contains key_id, issuer_id, and key)"
echo "  • APPLE_ID (if found in .env.fastlane)"
echo ""
echo "The .env files will be restored and loaded in CI/CD automatically."
echo ""
echo "To view your secrets:"
echo "  gh secret list"
echo ""
echo "To update environment variables:"
echo "  1. Update .env.preview or .env.production locally"
echo "  2. Run this script again: ./scripts/setup-github-secrets.sh"
echo ""
echo "For Android deployment:"
echo "  To upload/update Android keystore credentials:"
echo "    export ANDROID_KEYSTORE_PASSWORD='your-password'"
echo "    export ANDROID_KEY_ALIAS='de7919af3bdc771f8f3fa07be4204388'"
echo "    export ANDROID_KEY_PASSWORD='your-password'"
echo "    ./scripts/setup-github-secrets.sh"
echo ""
echo "For iOS deployment:"
echo "  Option 1: Add to .env.fastlane (recommended)"
echo "    APP_STORE_CONNECT_API_KEY_JSON_PATH=fastlane/KEYID.json"
echo "    ./scripts/setup-github-secrets.sh"
echo ""
echo "  Option 2: Set environment variable"
echo "    export APP_STORE_CONNECT_API_KEY_JSON_PATH=/path/to/your/key.json"
echo "    ./scripts/setup-github-secrets.sh"
echo ""
echo "  Option 3: Auto-discovery (place JSON in fastlane/)"
echo "    Place key JSON in fastlane/ (e.g., fastlane/KEYID.json)"
echo "    ./scripts/setup-github-secrets.sh"
echo ""
