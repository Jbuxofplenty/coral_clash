#!/bin/bash

# Allow unauthenticated access to all Cloud Functions
# This is safe because functions still verify Firebase authentication internally

set -e

PROJECT_ID="coral-clash"
REGION="us-central1"

echo "🔓 Allowing unauthenticated Cloud Run access for Firebase Functions..."
echo ""

# Get all Cloud Run services (Firebase Functions v2 deploy as Cloud Run services)
SERVICES=$(gcloud run services list --project=$PROJECT_ID --region=$REGION --format="value(name)")

if [ -z "$SERVICES" ]; then
    echo "❌ No Cloud Run services found in region $REGION"
    exit 1
fi

# Add allUsers invoker policy to each service
for SERVICE in $SERVICES; do
    echo "📝 Adding policy to: $SERVICE"
    gcloud run services add-iam-policy-binding $SERVICE \
        --project=$PROJECT_ID \
        --region=$REGION \
        --member="allUsers" \
        --role="roles/run.invoker" \
        --quiet
    echo "   ✅ Done"
done

echo ""
echo "✅ All functions now allow unauthenticated Cloud Run access"
echo "🔒 Functions still require Firebase authentication internally"

