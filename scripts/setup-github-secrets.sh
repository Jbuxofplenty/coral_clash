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
echo "✅ All GitHub secrets created successfully!"
echo "========================================"
echo ""
echo "Created secrets:"
echo "  • STAGING_ENV_FILE (contains all staging env vars)"
echo "  • PRODUCTION_ENV_FILE (contains all production env vars)"
echo "  • GOOGLE_SERVICES_JSON (for Android builds)"
echo "  • GOOGLE_SERVICE_INFO_PLIST (for iOS builds)"
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
