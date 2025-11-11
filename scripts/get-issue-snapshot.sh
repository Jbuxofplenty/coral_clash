#!/bin/bash

# Script to fetch game snapshot from Firestore based on latest GitHub issue
# Usage: ./scripts/get-issue-snapshot.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Fetching latest GitHub issue...${NC}"

# Get the latest GitHub issue
ISSUE_DATA=$(gh issue list --repo jbuxofplenty/coral_clash --limit 1 --json number,body,title)

# Extract issue number, title, and body
ISSUE_NUMBER=$(echo "$ISSUE_DATA" | jq -r '.[0].number')
ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.[0].title')
ISSUE_BODY=$(echo "$ISSUE_DATA" | jq -r '.[0].body')

echo -e "${GREEN}Latest issue: #$ISSUE_NUMBER - $ISSUE_TITLE${NC}"

# Extract Firestore Issue ID from the body (handles markdown bold formatting)
FIRESTORE_ID=$(echo "$ISSUE_BODY" | grep -oE "\*\*Firestore Issue ID\*\*: [A-Za-z0-9]+" | sed 's/\*\*Firestore Issue ID\*\*: //')

if [ -z "$FIRESTORE_ID" ]; then
    echo -e "${RED}Error: Could not find Firestore Issue ID in issue description${NC}"
    echo "Issue body:"
    echo "$ISSUE_BODY"
    exit 1
fi

echo -e "${GREEN}Firestore Issue ID: $FIRESTORE_ID${NC}"

# Check if gcloud credentials are available
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
    echo -e "${RED}Error: No application default credentials found${NC}"
    echo -e "${YELLOW}Please run: ${NC}gcloud auth application-default login"
    exit 1
fi

echo -e "${YELLOW}Fetching game snapshot from Firestore (production)...${NC}"

# Use Node.js with firebase-admin to fetch the document from PRODUCTION
SNAPSHOT=$(cd /Users/josiah.buxton/Documents/personal/coral_clash/functions && node -e "
const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({ projectId: 'coral-clash' });

const db = admin.firestore();

// Set a timeout
setTimeout(() => {
  console.error('Timeout: Failed to fetch document within 10 seconds');
  process.exit(1);
}, 10000);

db.collection('issues').doc('$FIRESTORE_ID').get()
  .then(doc => {
    if (!doc.exists) {
      console.error('Document not found in Firestore');
      process.exit(1);
    }
    const data = doc.data();
    if (data.gameSnapshot) {
      console.log(JSON.stringify(data.gameSnapshot, null, 2));
      process.exit(0);
    } else {
      console.error('No gameSnapshot field in document');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error fetching document:', err.message);
    process.exit(1);
  });
" 2>&1)

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Error fetching gameSnapshot:${NC}"
    echo "$SNAPSHOT"
    exit 1
fi

# Check if we got valid JSON
if echo "$SNAPSHOT" | jq empty 2>/dev/null; then
    echo -e "${GREEN}Successfully fetched game snapshot!${NC}"
    
    # Copy to clipboard (macOS)
    echo "$SNAPSHOT" | pbcopy
    echo -e "${GREEN}Game snapshot copied to clipboard!${NC}"
    
    # Also show a preview
    echo ""
    echo "Preview (first 10 lines):"
    echo "$SNAPSHOT" | head -n 10
else
    echo -e "${RED}Error: Failed to fetch valid game snapshot${NC}"
    echo "$SNAPSHOT"
    exit 1
fi

