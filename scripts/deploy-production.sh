#!/usr/bin/env bash
# ============================================================
# Sierra Estates — Production Deploy Script
# Run this once to push all infrastructure to production.
#
# Pre-requisites:
#   1. firebase login (run once, stores credentials locally)
#   2. All FIREBASE_* environment variables set in Vercel dashboard
#   3. Every staff member has a Firestore users/{uid} doc with
#      role ∈ {admin, manager, agent}
# ============================================================
set -euo pipefail

FIREBASE_PROJECT="sierra-blu"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sierra Estates — Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Validate Firebase CLI is authenticated ──────────
echo "▶  Validating Firebase auth..."
firebase projects:list --json | grep -q "$FIREBASE_PROJECT" \
  && echo "   ✅ Authenticated to $FIREBASE_PROJECT" \
  || (echo "   ❌ Run: firebase login" && exit 1)

# ── 2. Deploy Firestore & Storage Security Rules ───────
echo ""
echo "▶  Deploying Firestore + Storage security rules..."
firebase deploy --only firestore:rules,storage --project "$FIREBASE_PROJECT"
echo "   ✅ Security rules live"

# ── 3. Deploy Firebase Cloud Functions ─────────────────
echo ""
echo "▶  Building & deploying Firebase Cloud Functions..."
cd functions && pnpm build && cd ..
firebase deploy --only functions --project "$FIREBASE_PROJECT"
echo "   ✅ Cloud Functions deployed"

# ── 4. Deploy Firestore Indexes ────────────────────────
echo ""
echo "▶  Deploying Firestore indexes..."
firebase deploy --only firestore:indexes --project "$FIREBASE_PROJECT"
echo "   ✅ Indexes deployed"

# ── 5. Register Telegram Bot Webhook (optional) ────────
echo ""
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
VERCEL_URL="${VERCEL_URL:-https://admin.sierra-estates.net}"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo "▶  Registering Telegram webhook..."
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${VERCEL_URL}/api/telegram/webhook\", \"allowed_updates\": [\"message\", \"callback_query\"]}" \
    | jq '.ok // .description'
  echo "   ✅ Telegram webhook registered"
else
  echo "   ⚠️  TELEGRAM_BOT_TOKEN not set — skipping webhook registration"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Production deployment complete!"
echo "  Next: Set all env vars in Vercel dashboard."
echo "  See: NEXT_STEPS.md → 'Secrets — set before going live'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
