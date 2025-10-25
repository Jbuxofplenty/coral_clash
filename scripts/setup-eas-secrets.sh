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

# Source the .env file
export $(cat .env | grep -v '^#' | xargs)

# Create secrets
echo "Creating Firebase secrets..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "$EXPO_PUBLIC_FIREBASE_DATABASE_URL" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$EXPO_PUBLIC_FIREBASE_APP_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" --type string --force

echo ""
echo "Creating Firebase Functions URL..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL --value "$EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL" --type string --force

echo ""
echo "Creating Firebase Emulator setting..."
eas secret:create --scope project --name EXPO_PUBLIC_USE_FIREBASE_EMULATOR --value "false" --type string --force

echo ""
echo "Creating Google OAuth secrets..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" --type string --force
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID --value "$EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID" --type string --force

echo ""
echo "Creating dev features setting..."
eas secret:create --scope project --name EXPO_PUBLIC_ENABLE_DEV_FEATURES --value "false" --type string --force

echo ""
echo "✅ All EAS secrets created successfully!"
echo ""
echo "To view your secrets:"
echo "  eas secret:list"
echo ""
echo "To delete a secret:"
echo "  eas secret:delete --name EXPO_PUBLIC_FIREBASE_API_KEY"

