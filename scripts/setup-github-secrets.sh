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

# Function to convert .env file to JSON
env_to_json() {
    local env_file=$1
    local json="{"
    local first=true
    
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^#.* ]] && continue
        
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Escape quotes in value
        value=$(echo "$value" | sed 's/"/\\"/g')
        
        if [ "$first" = true ]; then
            first=false
        else
            json+=","
        fi
        
        json+="\"$key\":\"$value\""
    done < "$env_file"
    
    json+="}"
    echo "$json"
}

# List of environments to configure
ENVIRONMENTS=("preview" "production")

# Loop through each environment
for ENV in "${ENVIRONMENTS[@]}"; do
    echo ""
    echo "========================================"
    echo "Setting up environment: $ENV"
    echo "========================================"
    echo ""
    
    # Determine the secret name based on environment
    if [ "$ENV" == "preview" ]; then
        SECRET_NAME="STAGING_CLIENT_ENV_JSON"
    else
        SECRET_NAME="PRODUCTION_CLIENT_ENV_JSON"
    fi
    
    # Load environment-specific .env file
    ENV_FILE=".env.$ENV"
    if [ -f "$ENV_FILE" ]; then
        echo "📄 Loading $ENV_FILE..."
    else
        echo "❌ Error: $ENV_FILE not found!"
        echo "Please create $ENV_FILE with your Firebase credentials for the $ENV environment"
        exit 1
    fi
    echo ""

    echo "Converting $ENV_FILE to JSON..."
    ENV_JSON=$(env_to_json "$ENV_FILE")
    
    echo "Creating GitHub secret: $SECRET_NAME"
    echo "$ENV_JSON" | gh secret set "$SECRET_NAME" --body -
    
    echo "✅ Completed setup for $ENV environment!"
done

echo ""
echo "========================================"
echo "✅ All GitHub secrets created successfully!"
echo "========================================"
echo ""
echo "Created secrets:"
echo "  Staging (preview):"
for VAR_NAME in "${ENV_VARS[@]}"; do
    echo "    - STAGING_${VAR_NAME}"
done
echo ""
echo "  Production:"
for VAR_NAME in "${ENV_VARS[@]}"; do
    echo "    - PRODUCTION_${VAR_NAME}"
done
echo ""
echo "To view your secrets:"
echo "  gh secret list"
echo ""
echo "To update a secret:"
echo "  echo 'new-value' | gh secret set STAGING_EXPO_PUBLIC_FIREBASE_API_KEY"
echo ""

