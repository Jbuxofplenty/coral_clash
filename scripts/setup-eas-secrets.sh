#!/bin/bash

# Setup EAS Secrets for Coral Clash
# This script creates EAS secrets from your .env files and Google Service Account

set -e

echo "🔐 Setting up EAS Secrets for Coral Clash..."
echo ""

# List of environments to configure
ENVIRONMENTS=("preview" "production")

# List of all environment variable names
ENV_VARS=(
    "EXPO_PUBLIC_FIREBASE_API_KEY"
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "EXPO_PUBLIC_FIREBASE_DATABASE_URL"
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "EXPO_PUBLIC_FIREBASE_APP_ID"
    "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
    "EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL"
    "EXPO_PUBLIC_USE_FIREBASE_EMULATOR"
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"
    "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"
    "EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID"
    "EXPO_PUBLIC_ENABLE_DEV_FEATURES"
)

# Loop through each environment
for ENV in "${ENVIRONMENTS[@]}"; do
    echo ""
    echo "========================================"
    echo "Setting up environment: $ENV"
    echo "========================================"
    echo ""
    
    # Load environment-specific .env file
    ENV_FILE=".env.$ENV"
    if [ -f "$ENV_FILE" ]; then
        echo "📄 Loading $ENV_FILE..."
        set -a
        source "$ENV_FILE"
        set +a
    else
        echo "❌ Error: Neither $ENV_FILE nor .env file found!"
        echo "Please create $ENV_FILE with your Firebase credentials for the $ENV environment"
        exit 1
    fi
    echo ""

    # Delete existing variables for this environment
    echo "Deleting existing environment variables for $ENV (if any)..."
    for VAR_NAME in "${ENV_VARS[@]}"; do
        eas env:delete --variable-name "$VAR_NAME" --variable-environment "$ENV" --non-interactive 2>/dev/null || true
    done
    echo "Cleanup complete."
    echo ""

    echo "Creating Firebase environment variables..."
    eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY" --environment "$ENV" --visibility secret --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "$EXPO_PUBLIC_FIREBASE_DATABASE_URL" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$EXPO_PUBLIC_FIREBASE_APP_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true

    echo ""
    echo "Creating Firebase Functions URL..."
    eas env:create --name EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL --value "$EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL" --environment "$ENV" --visibility sensitive --non-interactive --force || true

    echo ""
    echo "Creating Firebase Emulator setting..."
    eas env:create --name EXPO_PUBLIC_USE_FIREBASE_EMULATOR --value "false" --environment "$ENV" --visibility sensitive --non-interactive --force || true

    echo ""
    echo "Creating Google OAuth environment variables..."
    eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    eas env:create --name EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID" --environment "$ENV" --visibility sensitive --non-interactive --force || true

    echo ""
    echo "Creating dev features setting..."
    eas env:create --name EXPO_PUBLIC_ENABLE_DEV_FEATURES --value "false" --environment "$ENV" --visibility sensitive --non-interactive --force || true
    
    echo "✅ Completed setup for $ENV environment!"
done

echo ""
echo "========================================"
echo "✅ All EAS environment variables created successfully!"
echo "========================================"

# Setup Google Service Account for Android Play Store submission
echo ""
echo "========================================"
echo "📱 Google Play Store Setup"
echo "========================================"
echo ""

# Check if Google Service Account JSON exists
if [ -f "google-service-account.json" ]; then
    echo "Found google-service-account.json file"
    echo ""
    
    # Check if secret already exists
    if eas secret:list 2>/dev/null | grep -q "GOOGLE_SERVICE_ACCOUNT"; then
        echo "⚠️  GOOGLE_SERVICE_ACCOUNT secret already exists"
        read -p "Do you want to update it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Deleting existing secret..."
            eas secret:delete --name GOOGLE_SERVICE_ACCOUNT --non-interactive || true
            echo "Creating new Google Service Account secret..."
            eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT --type file --value ./google-service-account.json
            echo "✅ Google Service Account secret updated!"
        else
            echo "⏭️  Skipping Google Service Account update"
        fi
    else
        echo "Creating Google Service Account secret..."
        eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT --type file --value ./google-service-account.json
        echo "✅ Google Service Account secret created!"
    fi
else
    echo "⚠️  google-service-account.json not found"
    echo ""
    echo "To enable Android Play Store submissions:"
    echo "  1. Download your Google Service Account JSON from Google Play Console"
    echo "  2. Save it as 'google-service-account.json' in the project root"
    echo "  3. Run this script again"
    echo ""
    echo "For detailed instructions, see: docs/deployment_setup.md"
fi

echo ""
echo "========================================"
echo "📋 Summary"
echo "========================================"
echo ""
echo "This script loads environment-specific configuration:"
echo "  • .env.preview → preview environment"
echo "  • .env.production → production environment"
echo "  • Falls back to .env if environment files don't exist"
echo ""
echo "To view your environment variables:"
echo "  eas env:list"
echo ""
echo "To view your secrets:"
echo "  eas secret:list"
echo ""
echo "To update an environment variable:"
echo "  eas env:update EXPO_PUBLIC_FIREBASE_API_KEY --value \"new-value\""
echo ""
echo "To delete an environment variable:"
echo "  eas env:delete EXPO_PUBLIC_FIREBASE_API_KEY"
echo ""
echo "To update Google Service Account:"
echo "  eas secret:delete --name GOOGLE_SERVICE_ACCOUNT"
echo "  eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT --type file --value ./google-service-account.json"

