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

# Function to convert .env file to JSON using jq for proper escaping
env_to_json() {
    local env_file=$1
    
    # Use jq to properly construct JSON with correct escaping
    jq -n 'reduce inputs as $line (
        {};
        if $line != "" and ($line | startswith("#") | not) then
            ($line | capture("^(?<key>[^=]+)=(?<value>.*)$") // {}) as $parsed |
            if $parsed.key then
                .[$parsed.key] = $parsed.value
            else
                .
            end
        else
            .
        end
    )' "$env_file"
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
    
    # Validate JSON
    if ! echo "$ENV_JSON" | jq empty 2>/dev/null; then
        echo "❌ Error: Generated invalid JSON from $ENV_FILE"
        echo "JSON output:"
        echo "$ENV_JSON"
        exit 1
    fi
    
    echo "✅ Valid JSON created with $(echo "$ENV_JSON" | jq 'keys | length') variables"
    echo "Variables: $(echo "$ENV_JSON" | jq -r 'keys | join(", ")')"
    
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
echo "  • STAGING_CLIENT_ENV_JSON (from .env.preview)"
echo "  • PRODUCTION_CLIENT_ENV_JSON (from .env.production)"
echo ""
echo "These JSON secrets contain all environment variables from your .env files."
echo ""
echo "To view your secrets:"
echo "  gh secret list"
echo ""
echo "To add a new variable:"
echo "  1. Add it to .env.preview or .env.production"
echo "  2. Run this script again: ./scripts/setup-github-secrets.sh"
echo ""
echo "No workflow changes needed - variables are automatically expanded!"
echo ""

