#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Vercel Deployment Script
# ═══════════════════════════════════════════════════════════════════════════
#
#  Deploys both Admin SPA + Client Portal to Vercel.
#
#  PREREQUISITES:
#    npm install -g vercel
#    vercel login
#
#  USAGE:
#    bash scripts/deploy-vercel.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e
BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Sierra Estates — Vercel Deployment                       ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Deploy Sierra Estates Next.js App Router ──
echo -e "${YELLOW}Step 1: Synchronize Canonical Supabase Environment to Vercel${NC}"
node "$(dirname "$0")/sync-vercel-env.js"

echo -e "\n${YELLOW}Step 2: Deploy Unified Next.js Platform (Client + Admin)${NC}"
echo "  Directory: apps/sierra-estates-realty"
echo "  Framework: Next.js (App Router)"
echo ""

cd "$(dirname "$0")/.."
vercel --prod --yes 2>&1 | tail -10

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Sierra Estates successfully deployed to Vercel!        ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Production URLs:                                         ║${NC}"
echo -e "${GREEN}║  • Client Portal: https://sierra-estates.net               ║${NC}"
echo -e "${GREEN}║  • Admin Portal:  https://admin.sierra-estates.net         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
