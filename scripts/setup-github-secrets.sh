#!/bin/bash

# Setup GitHub Secrets for Coral Clash
# This script creates GitHub secrets from your .env files for each environment

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
echo "🧹 Cleaning up old deprecated secrets..."
gh secret delete STAGING_CLIENT_ENV 2>/dev/null && echo "  ✅ Deleted STAGING_CLIENT_ENV" || true
gh secret delete PRODUCTION_CLIENT_ENV 2>/dev/null && echo "  ✅ Deleted PRODUCTION_CLIENT_ENV" || true
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

# Function to upload individual secrets from an env file
upload_individual_secrets() {
    local env_file=$1
    local prefix=$2
    local env_name=$3
    
    echo "========================================"
    echo "Uploading ${env_name} environment variables"
    echo "========================================"
    echo ""
    
    # Read each line from the env file
    local count=0
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]]; then
            continue
        fi
        
        # Extract key and value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            # Only upload EXPO_PUBLIC_ variables
            if [[ "$key" =~ ^EXPO_PUBLIC_ ]]; then
                local secret_name="${prefix}_${key}"
                
                # Upload to GitHub Secrets
                echo "$value" | gh secret set "$secret_name" --body -
                
                if [ $? -eq 0 ]; then
                    echo "  ✅ $secret_name"
                    ((count++))
                else
                    echo "  ❌ Failed to upload $secret_name"
                fi
            fi
        fi
    done < "$env_file"
    
    echo ""
    echo "✅ Uploaded $count ${env_name} secrets"
    echo ""
}

# Upload staging secrets (STAGING_EXPO_PUBLIC_*)
upload_individual_secrets ".env.preview" "STAGING" "staging"

# Upload production secrets (PRODUCTION_EXPO_PUBLIC_*)
upload_individual_secrets ".env.production" "PRODUCTION" "production"

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
echo "  • STAGING_EXPO_PUBLIC_* (individual staging env vars)"
echo "  • PRODUCTION_EXPO_PUBLIC_* (individual production env vars)"
echo "  • GOOGLE_SERVICES_JSON (for Android builds)"
echo "  • GOOGLE_SERVICE_INFO_PLIST (for iOS builds)"
echo ""
echo "Individual environment variables are explicitly referenced in CI workflow."
echo "Firebase secrets are base64-encoded and will be restored during CI builds."
echo ""
echo "To view your secrets:"
echo "  gh secret list"
echo ""
echo "To add a new environment variable:"
echo "  1. Add it to .env.preview or .env.production"
echo "  2. Run this script again: ./scripts/setup-github-secrets.sh"
echo "  3. Add the new secret to .github/workflows/build-and-submit.yml env blocks"
echo ""

