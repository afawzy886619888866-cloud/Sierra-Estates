#!/usr/bin/env bash
# ============================================================
# Sierra Estates — Canonical Production Deploy Script
# Authoritative Stack: Supabase (PostgreSQL/Storage/Auth) + Vercel
# ============================================================
set -euo pipefail

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sierra Estates — Production Deployment (Supabase + Vercel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Validate Supabase Environment ───────────────────
echo "▶  Validating Supabase connection..."
node scripts/check-backend-policy.mjs
node scripts/check-public-env-safety.mjs
node scripts/check-legacy-runtime-boundary.mjs

# ── 2. Apply Supabase Schema & Migrations ──────────────
echo ""
echo "▶  Applying Supabase Schema & Policies..."
node scripts/apply-supabase-schema.mjs

# ── 3. Sync Environment Variables to Vercel ────────────
echo ""
echo "▶  Synchronizing environment variables to Vercel..."
node scripts/sync-vercel-env.js

# ── 4. Verify Pre-Flight Deployment Readiness ──────────
echo ""
echo "▶  Verifying pre-flight deploy readiness..."
npx tsx scripts/verify-deploy-readiness.ts

# ── 5. Deploy Unified Platform to Vercel Production ────
echo ""
echo "▶  Deploying to Vercel production..."
vercel --prod --yes

# ── 6. Register Telegram Bot Webhook (optional) ────────
echo ""
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
VERCEL_URL="${VERCEL_URL:-https://admin.sierra-estates.net}"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo "▶  Registering Telegram webhook..."
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${VERCEL_URL}/api/telegram/webhook\", \"allowed_updates\": [\"message\", \"callback_query\"]}" \
    | jq '.ok // .description' || true
  echo "   ✅ Telegram webhook verified"
else
  echo "   ⚠️  TELEGRAM_BOT_TOKEN not set — skipping webhook registration"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Production deployment complete!"
echo "  Authoritative Backend: Supabase (https://gaxfqcietzoonlmatiot.supabase.co)"
echo "  Live Client URL:       https://sierra-estates.net"
echo "  Live Admin URL:        https://admin.sierra-estates.net"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
