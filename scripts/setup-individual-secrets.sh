#!/bin/bash

# Script to upload individual environment variables as GitHub Secrets
# This matches the EAS build approach where each env var is explicitly set

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  GitHub Individual Secrets Setup${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if .env files exist
if [ ! -f ".env.preview" ]; then
    echo -e "${RED}❌ Error: .env.preview not found${NC}"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Found environment files:${NC}"
echo "  - .env.preview (staging)"
echo "  - .env.production (production)"
echo ""

# Function to upload secrets from an env file
upload_secrets() {
    local env_file=$1
    local prefix=$2
    local env_name=$3
    
    echo -e "${BLUE}📤 Uploading ${env_name} secrets...${NC}"
    
    # Read each line from the env file
    local count=0
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^#.*$ ]] || [[ -z "$line" ]]; then
            continue
        fi
        
        # Extract key and value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            # Only upload EXPO_PUBLIC_ variables
            if [[ "$key" =~ ^EXPO_PUBLIC_ ]]; then
                local secret_name="${prefix}_${key}"
                
                # Upload to GitHub Secrets
                echo "$value" | gh secret set "$secret_name" --body -
                
                if [ $? -eq 0 ]; then
                    echo -e "  ${GREEN}✅${NC} $secret_name"
                    ((count++))
                else
                    echo -e "  ${RED}❌${NC} Failed to upload $secret_name"
                fi
            fi
        fi
    done < "$env_file"
    
    echo -e "${GREEN}✅ Uploaded $count ${env_name} secrets${NC}"
    echo ""
}

# Upload staging secrets
upload_secrets ".env.preview" "STAGING" "staging"

# Upload production secrets
upload_secrets ".env.production" "PRODUCTION" "production"

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  ✅ All Secrets Uploaded Successfully!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${BLUE}📝 Summary:${NC}"
echo "  - Staging secrets: STAGING_EXPO_PUBLIC_*"
echo "  - Production secrets: PRODUCTION_EXPO_PUBLIC_*"
echo ""
echo -e "${YELLOW}💡 These secrets are now referenced in the CI workflow${NC}"
echo -e "${YELLOW}   and will be baked into the JavaScript bundle during build.${NC}"
echo ""
echo -e "${BLUE}🔍 Verify secrets:${NC}"
echo "  gh secret list | grep 'EXPO_PUBLIC'"
echo ""

