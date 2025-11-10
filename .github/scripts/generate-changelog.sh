#!/bin/bash
# Generate changelog from conventional commits since last release
# Usage: ./generate-changelog.sh [platform] [track]
# Example: ./generate-changelog.sh android production

set -e

PLATFORM="${1:-android}"
TRACK="${2:-production}"
MAX_LENGTH=500  # Play Store limit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📝 Generating changelog for ${PLATFORM} ${TRACK}...${NC}"

# Get the last release tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  echo -e "${YELLOW}⚠️  No previous release tag found. Using all commits from main branch.${NC}"
  COMMIT_RANGE="origin/main"
else
  echo -e "${GREEN}✅ Last release: ${LAST_TAG}${NC}"
  COMMIT_RANGE="${LAST_TAG}..HEAD"
fi

# Parse conventional commits
FEATURES=""
FIXES=""
IMPROVEMENTS=""
BREAKING=""

# Determine which scopes to include based on platform
if [ "$PLATFORM" == "android" ] || [ "$PLATFORM" == "ios" ]; then
  # For mobile apps, include client and shared changes
  RELEVANT_SCOPES="(client|shared)"
else
  RELEVANT_SCOPES=".*"
fi

echo -e "${BLUE}🔍 Analyzing commits in range: ${COMMIT_RANGE}${NC}"

# Read commits and parse them
while IFS= read -r commit; do
  # Extract commit message (first line only)
  message=$(echo "$commit" | head -n 1)
  
  # Check for breaking changes
  if echo "$message" | grep -qE "^[a-z]+(\([a-z]+\))?!:|BREAKING CHANGE:"; then
    desc=$(echo "$message" | sed -E 's/^[a-z]+(\([a-z]+\))?!?: //' | sed 's/BREAKING CHANGE: //')
    BREAKING="${BREAKING}\n• ${desc}"
    continue
  fi
  
  # Parse conventional commit format: type(scope): description
  if echo "$message" | grep -qE "^(feat|fix|perf|refactor)\(${RELEVANT_SCOPES}\):"; then
    type=$(echo "$message" | sed -E 's/^([a-z]+)\([a-z]+\):.*/\1/')
    scope=$(echo "$message" | sed -E 's/^[a-z]+\(([a-z]+)\):.*/\1/')
    desc=$(echo "$message" | sed -E 's/^[a-z]+\([a-z]+\): //')
    
    # Capitalize first letter
    desc="$(echo "${desc:0:1}" | tr '[:lower:]' '[:upper:]')${desc:1}"
    
    case "$type" in
      feat)
        FEATURES="${FEATURES}\n• ${desc}"
        ;;
      fix)
        FIXES="${FIXES}\n• ${desc}"
        ;;
      perf|refactor)
        IMPROVEMENTS="${IMPROVEMENTS}\n• ${desc}"
        ;;
    esac
  fi
done < <(git log ${COMMIT_RANGE} --pretty=format:"%s" --no-merges 2>/dev/null || echo "")

# Build changelog
CHANGELOG=""

# Add breaking changes first (most important)
if [ -n "$BREAKING" ]; then
  CHANGELOG="${CHANGELOG}⚠️ Breaking Changes:${BREAKING}\n\n"
fi

# Add features
if [ -n "$FEATURES" ]; then
  CHANGELOG="${CHANGELOG}🎮 New Features:${FEATURES}\n\n"
fi

# Add fixes
if [ -n "$FIXES" ]; then
  CHANGELOG="${CHANGELOG}🐛 Bug Fixes:${FIXES}\n\n"
fi

# Add improvements
if [ -n "$IMPROVEMENTS" ]; then
  CHANGELOG="${CHANGELOG}⚡ Improvements:${IMPROVEMENTS}\n\n"
fi

# Default if no conventional commits found
if [ -z "$CHANGELOG" ]; then
  CHANGELOG="Bug fixes and performance improvements"
  echo -e "${YELLOW}⚠️  No conventional commits found. Using default changelog.${NC}"
else
  # Remove trailing newlines
  CHANGELOG=$(echo -e "$CHANGELOG" | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
fi

# Check length
LENGTH=${#CHANGELOG}
if [ $LENGTH -gt $MAX_LENGTH ]; then
  echo -e "${RED}❌ Changelog too long: ${LENGTH}/${MAX_LENGTH} characters${NC}"
  echo -e "${YELLOW}📝 Truncating to fit Play Store limit...${NC}"
  
  # Truncate and add ellipsis
  CHANGELOG="${CHANGELOG:0:$((MAX_LENGTH-3))}..."
  LENGTH=${#CHANGELOG}
fi

echo -e "${GREEN}✅ Changelog generated (${LENGTH}/${MAX_LENGTH} characters)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "$CHANGELOG"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Output for GitHub Actions
if [ -n "$GITHUB_OUTPUT" ]; then
  # Use multiline output format for GitHub Actions
  {
    echo "changelog<<EOF"
    echo -e "$CHANGELOG"
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
  
  echo "length=${LENGTH}" >> "$GITHUB_OUTPUT"
  echo -e "${GREEN}✅ Changelog written to GITHUB_OUTPUT${NC}"
fi

# Also output to stdout for local testing
echo -e "\n${BLUE}To use this changelog:${NC}"
echo -e "export CHANGELOG='${CHANGELOG}'"

