#!/bin/bash

# UNDO: Remove unauthenticated access from all Cloud Functions
# Use this if you want to switch to App Check or other authentication methods

set -e

PROJECT_ID="coral-clash"
REGION="us-central1"

echo "🔒 Removing unauthenticated Cloud Run access from Firebase Functions..."
echo ""

# Get all Cloud Run services (Firebase Functions v2 deploy as Cloud Run services)
SERVICES=$(gcloud run services list --project=$PROJECT_ID --region=$REGION --format="value(name)")

if [ -z "$SERVICES" ]; then
    echo "❌ No Cloud Run services found in region $REGION"
    exit 1
fi

# Remove allUsers invoker policy from each service
for SERVICE in $SERVICES; do
    echo "📝 Removing policy from: $SERVICE"
    gcloud run services remove-iam-policy-binding $SERVICE \
        --project=$PROJECT_ID \
        --region=$REGION \
        --member="allUsers" \
        --role="roles/run.invoker" \
        --quiet
    echo "   ✅ Done"
done

echo ""
echo "✅ All functions now require authenticated Cloud Run access"
echo "⚠️  You'll need to implement App Check or service accounts for app to work"

