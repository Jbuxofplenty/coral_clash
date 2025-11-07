#!/bin/bash

# Setup GitHub PAT Secret for Firebase Functions
# This script sets up a GitHub Personal Access Token as a Firebase Function secret
# to allow the issue submission function to create GitHub issues

set -e

echo "🔐 Setting up GitHub PAT Secret for Firebase Functions..."
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Not authenticated with Firebase CLI"
    echo "Run: firebase login"
    exit 1
fi

echo "✅ Firebase CLI is authenticated"
echo ""

echo "========================================"
echo "GitHub Personal Access Token Setup"
echo "========================================"
echo ""
echo "To create issues in your GitHub repository, you need a Personal Access Token."
echo ""
echo "📋 Option 1: Fine-grained Token (Recommended for better security)"
echo "  1. Go to https://github.com/settings/tokens?type=beta"
echo "  2. Click 'Generate new token'"
echo "  3. Token name: 'Coral Clash Issue Reporter'"
echo "  4. Expiration: 90 days or 1 year (recommended)"
echo "  5. Repository access: Select 'Only select repositories' → coral_clash"
echo "  6. Permissions → Repository permissions:"
echo "     ✓ Issues: Read and write"
echo "  7. Click 'Generate token' at the bottom"
echo "  8. Copy the token (starts with 'github_pat_')"
echo ""
echo "📋 Option 2: Classic Token"
echo "  1. Go to https://github.com/settings/tokens"
echo "  2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "  3. Token name: 'Coral Clash Issue Reporter'"
echo "  4. Expiration: 90 days or 1 year (recommended)"
echo "  5. Scopes: ✓ repo (Full control of private repositories)"
echo "  6. Click 'Generate token' at the bottom"
echo "  7. Copy the token (starts with 'ghp_')"
echo ""
echo "⚠️  Keep this token secure and never commit it to your repository!"
echo ""
read -p "Press Enter when you have your GitHub PAT ready..."
echo ""

# Prompt for the GitHub PAT
echo "Please enter your GitHub Personal Access Token:"
read -s GITHUB_PAT
echo ""

# Validate that token is not empty
if [ -z "$GITHUB_PAT" ]; then
    echo "❌ Error: GitHub PAT cannot be empty"
    exit 1
fi

# Validate token format (should start with ghp_ for classic or github_pat_ for fine-grained)
if [[ ! "$GITHUB_PAT" =~ ^(ghp_|github_pat_) ]]; then
    echo "⚠️  Warning: Token doesn't start with 'ghp_' (classic) or 'github_pat_' (fine-grained)"
    echo "    Are you sure this is a valid GitHub Personal Access Token?"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "📤 Setting GITHUB_PAT secret in Firebase Functions..."
echo ""

# Set the secret using Firebase CLI
# The secret will be available in all Firebase Functions in this project
echo "$GITHUB_PAT" | firebase functions:secrets:set GITHUB_PAT

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ GitHub PAT secret set successfully!"
    echo "========================================"
    echo ""
    echo "The GITHUB_PAT secret is now available to your Firebase Functions."
    echo ""
    echo "Next steps:"
    echo "  1. Deploy your functions: firebase deploy --only functions"
    echo "  2. The submitIssue function will now be able to create GitHub issues"
    echo ""
    echo "To update the secret in the future:"
    echo "  • Run this script again"
    echo "  • Or use: echo 'your-new-token' | firebase functions:secrets:set GITHUB_PAT"
    echo ""
    echo "To view all secrets:"
    echo "  firebase functions:secrets:access --list"
    echo ""
else
    echo ""
    echo "❌ Failed to set GITHUB_PAT secret"
    echo "Please check your Firebase CLI authentication and try again"
    exit 1
fi

