#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Vercel Deployment Script (Canonical Architecture)
# ═══════════════════════════════════════════════════════════════════════════
#
#  Deploys Sierra Estates (Client Portal + Unified Admin) to Vercel.
#  Authoritative Backend: Supabase Postgres (https://gaxfqcietzoonlmatiot.supabase.co)
#
#  PREREQUISITES:
#    pnpm install
#    vercel login
#
#  USAGE:
#    bash scripts/deploy-vercel.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Sierra Estates — Vercel Deployment (Supabase Engine)     ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-flight Verification ──
echo -e "${YELLOW}Step 1: Running monorepo pre-flight checks...${NC}"
node scripts/verify-action-routing.mjs
node scripts/check-no-compiled-twins.mjs

# ── Deploy Main Application ──
echo -e "${YELLOW}Step 2: Deploying Next.js Application (Client & Admin)...${NC}"
echo "  Directory: apps/sierra-estates-realty"
echo "  Framework: Next.js 16 (App Router)"
echo "  Backend: Supabase (PostgreSQL + pgvector)"
echo ""

cd "$(dirname "$0")/../apps/sierra-estates-realty"

# Set authoritative Supabase environment variables on Vercel
echo "  Configuring authoritative Supabase environment..."
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://gaxfqcietzoonlmatiot.supabase.co" 2>/dev/null || true
npx vercel env add SUPABASE_PROPERTY_MEDIA_BUCKET production <<< "property-media" 2>/dev/null || true

echo "  Building & Deploying..."
npx vercel --prod --yes 2>&1 | tail -10

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Sierra Estates deployed to Vercel!                     ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Domain: https://sierra-estates.net                        ║${NC}"
echo -e "${GREEN}║  Admin:  https://admin.sierra-estates.net                  ║${NC}"
echo -e "${GREEN}║  Backend: Supabase Cloud (Pure PostgreSQL)                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
