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
        SECRET_NAME="STAGING_CLIENT_ENV"
    else
        SECRET_NAME="PRODUCTION_CLIENT_ENV"
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

    # Count non-empty, non-comment lines
    VAR_COUNT=$(grep -v '^#' "$ENV_FILE" | grep -v '^$' | wc -l | xargs)
    
    echo "📝 Uploading .env file as text secret with $VAR_COUNT variables"
    echo "Creating GitHub secret: $SECRET_NAME"
    
    # Upload the .env file contents directly as a text secret
    cat "$ENV_FILE" | gh secret set "$SECRET_NAME" --body -
    
    echo "✅ Completed setup for $ENV environment!"
done

echo ""
echo "========================================"
echo "✅ All GitHub secrets created successfully!"
echo "========================================"
echo ""
echo "Created secrets:"
echo "  • STAGING_CLIENT_ENV (from .env.preview)"
echo "  • PRODUCTION_CLIENT_ENV (from .env.production)"
echo ""
echo "These secrets contain your .env files as plain text."
echo ""
echo "To view your secrets:"
echo "  gh secret list"
echo ""
echo "To add a new variable:"
echo "  1. Add it to .env.preview or .env.production"
echo "  2. Run this script again: ./scripts/setup-github-secrets.sh"
echo ""
echo "No workflow changes needed - CI writes secrets directly to .env file!"
echo ""

