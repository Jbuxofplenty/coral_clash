#!/bin/bash

# ============================================================================
# Set GitHub Repository Variables for React Native Project
# ============================================================================
#
# This is a TEMPLATE script. Copy it to your new project and update the
# configuration values below with your app's details.
#
# Prerequisites:
#   - GitHub CLI installed (brew install gh)
#   - Authenticated with GitHub (gh auth login)
#
# Usage:
#   1. Copy this file to your new project
#   2. Update the CONFIGURATION section below
#   3. Run: ./set-github-variables.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION - UPDATE THESE VALUES FOR YOUR PROJECT
# ============================================================================

# iOS Configuration
IOS_APP_IDENTIFIER="com.yourcompany.yourapp"        # Your iOS bundle identifier
IOS_TEAM_ID="ABC123XYZ"                             # Your Apple Developer Team ID
IOS_SCHEME="YourApp"                                # Your Xcode scheme name
IOS_WORKSPACE_PATH="./ios/YourApp.xcworkspace"      # Path to your .xcworkspace
IOS_PROJECT_PATH="./ios/YourApp.xcodeproj"          # Path to your .xcodeproj
IOS_OUTPUT_NAME="YourApp.ipa"                       # Output IPA filename

# Android Configuration
ANDROID_PACKAGE_NAME="com.yourcompany.yourapp"      # Your Android package name
ANDROID_PROJECT_DIR="./android"                     # Path to Android project (usually ./android)

# Firebase Configuration (optional - only if using Firebase)
FIREBASE_PROJECT_ID="your-firebase-project"         # Your Firebase project ID (set to "" to skip)

# ============================================================================
# Script (No need to edit below this line)
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting GitHub Variables${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}❌ GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Install it with: brew install gh${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}❌ Not authenticated with GitHub${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi

# Get current repo name for display
REPO_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ Setting variables for: ${REPO_NAME}${NC}\n"

# Confirm before setting
echo "The following variables will be set:"
echo ""
echo "iOS:"
echo "  IOS_APP_IDENTIFIER: ${IOS_APP_IDENTIFIER}"
echo "  IOS_TEAM_ID: ${IOS_TEAM_ID}"
echo "  IOS_SCHEME: ${IOS_SCHEME}"
echo "  IOS_WORKSPACE_PATH: ${IOS_WORKSPACE_PATH}"
echo "  IOS_PROJECT_PATH: ${IOS_PROJECT_PATH}"
echo "  IOS_OUTPUT_NAME: ${IOS_OUTPUT_NAME}"
echo ""
echo "Android:"
echo "  ANDROID_PACKAGE_NAME: ${ANDROID_PACKAGE_NAME}"
echo "  ANDROID_PROJECT_DIR: ${ANDROID_PROJECT_DIR}"
echo ""
if [ -n "${FIREBASE_PROJECT_ID}" ]; then
  echo "Firebase:"
  echo "  FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}"
  echo ""
fi
read -p "Continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${BLUE}Setting iOS Variables...${NC}"

gh variable set IOS_APP_IDENTIFIER --body "${IOS_APP_IDENTIFIER}"
echo -e "${GREEN}✓${NC} IOS_APP_IDENTIFIER"

gh variable set IOS_TEAM_ID --body "${IOS_TEAM_ID}"
echo -e "${GREEN}✓${NC} IOS_TEAM_ID"

gh variable set IOS_SCHEME --body "${IOS_SCHEME}"
echo -e "${GREEN}✓${NC} IOS_SCHEME"

gh variable set IOS_WORKSPACE_PATH --body "${IOS_WORKSPACE_PATH}"
echo -e "${GREEN}✓${NC} IOS_WORKSPACE_PATH"

gh variable set IOS_PROJECT_PATH --body "${IOS_PROJECT_PATH}"
echo -e "${GREEN}✓${NC} IOS_PROJECT_PATH"

gh variable set IOS_OUTPUT_NAME --body "${IOS_OUTPUT_NAME}"
echo -e "${GREEN}✓${NC} IOS_OUTPUT_NAME"

echo ""
echo -e "${BLUE}Setting Android Variables...${NC}"

gh variable set ANDROID_PACKAGE_NAME --body "${ANDROID_PACKAGE_NAME}"
echo -e "${GREEN}✓${NC} ANDROID_PACKAGE_NAME"

gh variable set ANDROID_PROJECT_DIR --body "${ANDROID_PROJECT_DIR}"
echo -e "${GREEN}✓${NC} ANDROID_PROJECT_DIR"

# Set Firebase variable if provided
if [ -n "${FIREBASE_PROJECT_ID}" ]; then
  echo ""
  echo -e "${BLUE}Setting Firebase Variables...${NC}"
  
  gh variable set FIREBASE_PROJECT_ID --body "${FIREBASE_PROJECT_ID}"
  echo -e "${GREEN}✓${NC} FIREBASE_PROJECT_ID"
  
  FIREBASE_VARS=1
else
  FIREBASE_VARS=0
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All variables set successfully!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "Variables set:"
echo "  📱 iOS Variables: 6"
echo "  🤖 Android Variables: 2"
if [ $FIREBASE_VARS -eq 1 ]; then
  echo "  🔥 Firebase Variables: 1"
fi
echo ""
echo "View all variables:"
echo "  gh variable list"
echo ""
echo "Or visit:"
echo "  https://github.com/${REPO_NAME}/settings/variables/actions"
echo ""
echo "Next steps:"
echo "  1. Set up GitHub Secrets (see docs/reusable_ci_setup.md)"
echo "  2. Create GitHub Environments (staging, production, production-approval)"
echo "  3. Push a staging tag to test: git tag v1.0.0-beta.1 && git push origin v1.0.0-beta.1"
echo ""

