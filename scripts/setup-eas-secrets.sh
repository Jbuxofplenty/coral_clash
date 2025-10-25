#!/bin/bash

# Setup EAS Secrets for Coral Clash
# This script creates EAS secrets from your .env file

set -e

echo "🔐 Setting up EAS Secrets for Coral Clash..."
echo ""

# Load .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Firebase credentials"
    exit 1
fi

# Load .env file properly
set -a
source .env
set +a

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

    # Delete existing variables first (delete removes from all environments, so we do this once)
    if [ "$ENV" == "preview" ]; then
        echo "Deleting existing environment variables (if any)..."
        for VAR_NAME in "${ENV_VARS[@]}"; do
            eas env:delete --variable-name "$VAR_NAME" --non-interactive 2>/dev/null || true
        done
        echo "Cleanup complete."
        echo ""
    fi

    echo "Creating Firebase environment variables..."
    eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY" --environment "$ENV" --visibility sensitive --non-interactive --force || true
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
echo ""
echo "To view your environment variables:"
echo "  eas env:list"
echo ""
echo "To update an environment variable:"
echo "  eas env:update EXPO_PUBLIC_FIREBASE_API_KEY --value \"new-value\""
echo ""
echo "To delete an environment variable:"
echo "  eas env:delete EXPO_PUBLIC_FIREBASE_API_KEY"

