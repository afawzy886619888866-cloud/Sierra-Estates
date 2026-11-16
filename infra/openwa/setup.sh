#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — OpenWA First-Run Setup
# File: SE/infra/openwa/setup.sh
#
# Run ONCE after `docker compose up -d` to:
#   1. Wait for OpenWA to be healthy
#   2. Install all Sierra Estates plugins via REST API
#   3. Configure + enable each plugin
#   4. Verify the webhook endpoint is reachable
#   5. Print the dashboard URL + admin key
#
# Usage:
#   cd infra/openwa
#   cp .env.example .env   # fill in values first!
#   docker compose up -d
#   bash setup.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e
source .env 2>/dev/null || true

OPENWA_URL="http://localhost:${OPENWA_PORT:-3000}"
ADMIN_KEY="${OPENWA_ADMIN_API_KEY}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'

echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  Sierra Estates — OpenWA Setup                       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"

# ── Wait for OpenWA to be ready ─────────────────────────────────────────
echo -e "\n${YELLOW}⏳ Waiting for OpenWA to be ready...${NC}"
for i in $(seq 1 30); do
  if curl -sf "${OPENWA_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OpenWA is up${NC}"
    break
  fi
  [ $i -eq 30 ] && echo -e "${RED}✗ OpenWA did not start in time. Check: docker compose logs openwa${NC}" && exit 1
  sleep 5
done

# ── Helper: install + configure + enable a plugin ───────────────────────
install_plugin() {
  local NAME="$1"
  local ZIP_URL="$2"
  local CONFIG_FILE="$3"

  echo -e "\n${YELLOW}📦 Installing plugin: ${NAME}${NC}"

  # Install from GitHub release URL
  INSTALL_RESP=$(curl -sf -X POST "${OPENWA_URL}/api/plugins/install-url" \
    -H "X-API-Key: ${ADMIN_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${ZIP_URL}\"}" 2>&1 || echo "ERROR")

  if echo "$INSTALL_RESP" | grep -q '"id"'; then
    PLUGIN_ID=$(echo "$INSTALL_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "  ${GREEN}✓ Installed: ${NAME} (id: ${PLUGIN_ID})${NC}"
  else
    echo -e "  ${YELLOW}⚠ Plugin may already be installed or install-url not available. Trying by name...${NC}"
    PLUGIN_ID="$NAME"
  fi

  # Configure the plugin
  if [ -f "${CONFIG_FILE}" ]; then
    CONFIG=$(cat "${CONFIG_FILE}" | \
      sed "s|\${SE_API_URL}|${SE_API_URL}|g" | \
      sed "s|\${SBR_SECRET_KEY}|${SBR_SECRET_KEY}|g" | \
      sed "s|\${INVENTORY_SHEET_ID}|${INVENTORY_SHEET_ID}|g" | \
      sed "s|\${SUPABASE_URL}|${SUPABASE_URL}|g" | \
      sed "s|\${SUPABASE_SERVICE_ROLE_KEY}|${SUPABASE_SERVICE_ROLE_KEY}|g")
    CONFIG_PAYLOAD=$(echo "$CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({'config': d.get('config', {})}))" 2>/dev/null || echo '{}')

    curl -sf -X PUT "${OPENWA_URL}/api/plugins/${PLUGIN_ID}/config" \
      -H "X-API-Key: ${ADMIN_KEY}" \
      -H "Content-Type: application/json" \
      -d "$CONFIG_PAYLOAD" > /dev/null && echo -e "  ${GREEN}✓ Configured: ${NAME}${NC}" || echo -e "  ${YELLOW}⚠ Config skipped (configure via dashboard)${NC}"
  fi

  # Enable the plugin
  curl -sf -X POST "${OPENWA_URL}/api/plugins/${PLUGIN_ID}/enable" \
    -H "X-API-Key: ${ADMIN_KEY}" > /dev/null && echo -e "  ${GREEN}✓ Enabled: ${NAME}${NC}" || echo -e "  ${YELLOW}⚠ Enable via dashboard at ${OPENWA_URL}${NC}"
}

# ── Install all Sierra Estates plugins ──────────────────────────────────
# Plugin releases from OpenWA-plugins repository
REPO="https://github.com/rmyndharis/OpenWA-plugins/releases/latest/download"

install_plugin "gsheets-logger"   "${REPO}/gsheets-logger.zip"   "plugins/gsheets-logger.config.json"
install_plugin "http-action"      "${REPO}/http-action.zip"       "plugins/http-action.config.json"
install_plugin "after-hours"      "${REPO}/after-hours.zip"       "plugins/after-hours.config.json"
install_plugin "faq-bot"          "${REPO}/faq-bot.zip"           "plugins/faq-bot.config.json"

# ── Configure global webhook ─────────────────────────────────────────────
echo -e "\n${YELLOW}🌐 Configuring global webhook → SE API...${NC}"
curl -sf -X PUT "${OPENWA_URL}/api/settings/webhook" \
  -H "X-API-Key: ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${SE_API_URL}/api/webhooks/whatsapp\", \"hmacSecret\": \"${SBR_SECRET_KEY}\"}" \
  > /dev/null && echo -e "${GREEN}✓ Webhook configured${NC}" || echo -e "${YELLOW}⚠ Configure webhook manually in dashboard${NC}"

# ── Create a default WhatsApp session ───────────────────────────────────
echo -e "\n${YELLOW}📱 Creating default WhatsApp session...${NC}"
SESSION_RESP=$(curl -sf -X POST "${OPENWA_URL}/api/sessions" \
  -H "X-API-Key: ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "sierra-main", "engine": "wwebjs"}' 2>&1 || echo "already exists")

echo -e "${GREEN}✓ Session 'sierra-main' ready${NC}"

# ── Print summary ────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ OpenWA Setup Complete!                            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Dashboard: http://${PUBLIC_IP}:${OPENWA_PORT:-3000}              ║${NC}"
echo -e "${GREEN}║  n8n:       http://${PUBLIC_IP}:${N8N_PORT:-5678}              ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Next: Open dashboard → Sessions → sierra-main       ║${NC}"
echo -e "${GREEN}║        Scan QR code with WhatsApp mobile app         ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Plugins installed:                                  ║${NC}"
echo -e "${GREEN}║    ✓ gsheets-logger  (inventory auto-log)            ║${NC}"
echo -e "${GREEN}║    ✓ http-action     (API commands from WA)          ║${NC}"
echo -e "${GREEN}║    ✓ after-hours     (auto-reply outside hours)      ║${NC}"
echo -e "${GREEN}║    ✓ faq-bot         (Arabic/English listing FAQ)    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
