#!/bin/bash

# ============================================================================
# Set GitHub Repository Variables for Coral Clash
# ============================================================================
#
# This script uses GitHub CLI to set repository variables for the CI/CD pipeline.
#
# Prerequisites:
#   - GitHub CLI installed (brew install gh)
#   - Authenticated with GitHub (gh auth login)
#
# Usage:
#   ./scripts/set-github-variables.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting GitHub Variables for Coral Clash${NC}"
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

echo -e "${GREEN}✅ GitHub CLI is ready${NC}\n"

# ============================================================================
# Coral Clash Configuration
# ============================================================================

echo -e "${BLUE}Setting iOS Variables...${NC}"

gh variable set IOS_APP_IDENTIFIER --body "com.jbuxofplenty.coralclash"
echo -e "${GREEN}✓${NC} IOS_APP_IDENTIFIER"

gh variable set IOS_TEAM_ID --body "FWV22U8U39"
echo -e "${GREEN}✓${NC} IOS_TEAM_ID"

gh variable set IOS_SCHEME --body "CoralClash"
echo -e "${GREEN}✓${NC} IOS_SCHEME"

gh variable set IOS_WORKSPACE_PATH --body "./ios/CoralClash.xcworkspace"
echo -e "${GREEN}✓${NC} IOS_WORKSPACE_PATH"

gh variable set IOS_PROJECT_PATH --body "./ios/CoralClash.xcodeproj"
echo -e "${GREEN}✓${NC} IOS_PROJECT_PATH"

gh variable set IOS_OUTPUT_NAME --body "CoralClash.ipa"
echo -e "${GREEN}✓${NC} IOS_OUTPUT_NAME"

echo ""
echo -e "${BLUE}Setting Android Variables...${NC}"

gh variable set ANDROID_PACKAGE_NAME --body "com.jbuxofplenty.coralclash"
echo -e "${GREEN}✓${NC} ANDROID_PACKAGE_NAME"

gh variable set ANDROID_PROJECT_DIR --body "./android"
echo -e "${GREEN}✓${NC} ANDROID_PROJECT_DIR"

echo ""
echo -e "${BLUE}Setting Firebase Variables...${NC}"

gh variable set FIREBASE_PROJECT_ID --body "coral-clash"
echo -e "${GREEN}✓${NC} FIREBASE_PROJECT_ID"

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
echo "  🔥 Firebase Variables: 1"
echo ""
echo "View all variables:"
echo "  gh variable list"
echo ""
echo "Or visit:"
echo "  https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/variables/actions"
echo ""

