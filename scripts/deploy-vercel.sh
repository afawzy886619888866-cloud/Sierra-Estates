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

# ── Deploy Admin SPA ──
echo -e "${YELLOW}Step 1: Deploy Admin SPA${NC}"
echo "  Directory: apps/admin"
echo "  Framework: Vite"
echo ""
cd "$(dirname "$0")/../apps/admin"

# Set env vars for Vercel
echo "  Setting environment variables..."
vercel env add VITE_FIREBASE_API_KEY production <<< "AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs" 2>/dev/null || true
vercel env add VITE_FIREBASE_AUTH_DOMAIN production <<< "sierra-blu.firebaseapp.com" 2>/dev/null || true
vercel env add VITE_FIREBASE_PROJECT_ID production <<< "sierra-blu" 2>/dev/null || true
vercel env add VITE_FIREBASE_STORAGE_BUCKET production <<< "sierra-blu.firebasestorage.app" 2>/dev/null || true
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production <<< "941030513456" 2>/dev/null || true
vercel env add VITE_FIREBASE_APP_ID production <<< "1:941030513456:web:56209a1495d69f217086f5" 2>/dev/null || true

echo "  Deploying..."
vercel --prod --yes 2>&1 | tail -5
echo ""
echo -e "${GREEN}✅ Admin SPA deployed!${NC}"

# ── Deploy Client Portal ──
echo ""
echo -e "${YELLOW}Step 2: Deploy Client Portal${NC}"
echo "  Directory: apps/client"
echo "  Framework: Next.js"
echo ""
cd "$(dirname "$0")/../apps/client"

echo "  Setting environment variables..."
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs" 2>/dev/null || true
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "sierra-blu.firebaseapp.com" 2>/dev/null || true
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "sierra-blu" 2>/dev/null || true
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "sierra-blu.firebasestorage.app" 2>/dev/null || true
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production <<< "941030513456" 2>/dev/null || true
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "1:941030513456:web:56209a1495d69f217086f5" 2>/dev/null || true

echo "  Deploying..."
vercel --prod --yes 2>&1 | tail -5
echo ""
echo -e "${GREEN}✅ Client Portal deployed!${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Both apps deployed to Vercel!                          ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Check your Vercel dashboard for the URLs:               ║${NC}"
echo -e "${GREEN}║  https://vercel.com/dashboard                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
