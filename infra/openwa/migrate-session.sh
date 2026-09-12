#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Session Migration Script
# File: SE/infra/openwa/migrate-session.sh
#
# Migrates the existing WhatsApp auth session from the old scraper
# (Baileys multi-file auth OR whatsapp-web.js LocalAuth) to OpenWA.
#
# The old session lives in:
#   ../whatsapp-auth/        (Baileys: creds.json + keys/)
#   OR
#   ../whatsapp-auth/.wwebjs_auth/  (whatsapp-web.js LocalAuth)
#
# OpenWA (wwebjs engine) expects the session in:
#   ./whatsapp-auth/         (maps to /home/node/.wwebjs_auth in container)
#
# Usage:
#   bash migrate-session.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  Sierra Estates — WhatsApp Session Migration          ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

OLD_INFRA="../"
NEW_AUTH="./whatsapp-auth"

mkdir -p "$NEW_AUTH"

# ── Case 1: wwebjs LocalAuth in old whatsapp-auth ──────────────────────
if [ -d "${OLD_INFRA}whatsapp-auth/.wwebjs_auth" ]; then
  echo -e "${YELLOW}📂 Found whatsapp-web.js LocalAuth session${NC}"
  cp -r "${OLD_INFRA}whatsapp-auth/.wwebjs_auth/." "$NEW_AUTH/"
  echo -e "${GREEN}✓ Migrated wwebjs session to ${NEW_AUTH}${NC}"

# ── Case 2: wwebjs LocalAuth directly ──────────────────────────────────
elif ls "${OLD_INFRA}whatsapp-auth"/session-*.json 2>/dev/null | head -1 | grep -q session; then
  echo -e "${YELLOW}📂 Found wwebjs session files${NC}"
  cp -r "${OLD_INFRA}whatsapp-auth/." "$NEW_AUTH/"
  echo -e "${GREEN}✓ Migrated session files to ${NEW_AUTH}${NC}"

# ── Case 3: Baileys creds.json ─────────────────────────────────────────
elif [ -f "${OLD_INFRA}whatsapp-auth/creds.json" ]; then
  echo -e "${YELLOW}📂 Found Baileys session (creds.json)${NC}"
  echo -e "${YELLOW}⚠  NOTE: OpenWA uses whatsapp-web.js engine (wwebjs) by default.${NC}"
  echo -e "${YELLOW}   Baileys sessions are NOT compatible with wwebjs.${NC}"
  echo -e "${YELLOW}   You will need to re-scan the QR code once.${NC}"
  echo ""
  echo -e "${YELLOW}   Backing up Baileys session to ./baileys-auth-backup/...${NC}"
  cp -r "${OLD_INFRA}whatsapp-auth/." "./baileys-auth-backup/"
  echo -e "${GREEN}✓ Backup saved to ./baileys-auth-backup/${NC}"
  echo -e "${YELLOW}  The Baileys memory (group lists, contacts) is preserved in n8n-data.${NC}"

# ── Case 4: No existing session ────────────────────────────────────────
else
  echo -e "${YELLOW}ℹ No existing session found — a fresh QR scan will be required.${NC}"
fi

# ── Copy n8n data if present ────────────────────────────────────────────
if [ -d "${OLD_INFRA}n8n-data" ] && [ ! -d "./n8n-data" ]; then
  echo ""
  echo -e "${YELLOW}📂 Migrating n8n data (workflows + credentials)...${NC}"
  cp -r "${OLD_INFRA}n8n-data/." "./n8n-data/"
  echo -e "${GREEN}✓ n8n data migrated (workflows + credentials preserved)${NC}"
elif [ -d "./n8n-data" ]; then
  echo -e "${GREEN}✓ n8n data already present${NC}"
fi

# ── Copy existing group memory from scraper ─────────────────────────────
MEMORY_FILES=(
  "${OLD_INFRA}whatsapp-scraper/src/owners-harvester.js"
  "${OLD_INFRA}whatsapp-scraper/src/export-owners-excel.py"
)
if [ -f "${MEMORY_FILES[0]}" ]; then
  echo ""
  echo -e "${YELLOW}📂 Preserving scraper memory files...${NC}"
  mkdir -p "./legacy-scraper"
  for f in "${MEMORY_FILES[@]}"; do
    [ -f "$f" ] && cp "$f" "./legacy-scraper/" && echo -e "  ${GREEN}✓ $(basename $f)${NC}"
  done
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Migration complete!                                  ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Next steps:                                         ║${NC}"
echo -e "${GREEN}║  1. docker compose up -d                             ║${NC}"
echo -e "${GREEN}║  2. bash setup.sh                                    ║${NC}"
echo -e "${GREEN}║  3. Scan QR if needed (dashboard → Sessions)         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
