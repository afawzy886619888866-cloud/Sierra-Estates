#!/usr/bin/env bash
# Sierra Estates — Cloud Run deployment for Python FastAPI (apps/api)
#
# Usage: ./scripts/deploy-cloud-run.sh
# Requires: gcloud CLI authenticated, GOOGLE_CLOUD_PROJECT set

set -euo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:-sierra-blu}"
REGION="${CLOUD_RUN_REGION:-europe-west1}"
SERVICE_NAME="sierra-estates-api"
IMAGE="gcr.io/${PROJECT}/${SERVICE_NAME}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sierra Estates — Python API → Cloud Run Deploy"
echo "  Project : $PROJECT"
echo "  Region  : $REGION"
echo "  Service : $SERVICE_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Build Docker image ──────────────────────────────
echo "▶  Building Docker image..."
cd apps/api
docker build -t "$IMAGE" .
cd ../..
echo "   ✅ Image built: $IMAGE"

# ── 2. Push to Google Container Registry ──────────────
echo ""
echo "▶  Pushing to GCR..."
docker push "$IMAGE"
echo "   ✅ Image pushed"

# ── 3. Deploy to Cloud Run ─────────────────────────────
echo ""
echo "▶  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT" \
  --allow-unauthenticated \
  --port 8000 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --set-env-vars "LOG_LEVEL=INFO,ALLOWED_ORIGINS=https://sierra-estates.net,https://admin.sierra-estates.net"

echo ""
echo "▶  Getting service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --project "$PROJECT" \
  --format "value(status.url)")

echo "   ✅ Cloud Run deployed!"
echo "   URL: $SERVICE_URL"
echo ""
echo "   ⚠️  Set PYTHON_API_URL=$SERVICE_URL in your Vercel project env vars."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
