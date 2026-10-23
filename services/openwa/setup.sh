#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenWA WhatsApp Gateway — installer (Sierra Estates)
#
# Installs the self-hosted WhatsApp gateway from GitHub:
#   https://github.com/rmyndharis/OpenWA  (MIT, Node >= 22.19, API port 2785)
#
# This replaces the Meta Cloud API / Twilio outbound dependency: messages are
# sent through your own WhatsApp Web session (QR-paired) exposed as a plain
# HTTP API — exactly the contract lib/server/twilio-client.ts already speaks:
#   POST {WHATSAPP_API_URL}/api/sessions/{OPENWA_SESSION_ID}/messages/send-text
#   X-API-Key: {WHATSAPP_API_TOKEN}      body: {"chatId": "<phone>@c.us", "text": "..."}
#
# Usage:
#   bash services/openwa/setup.sh              # install into ./openwa (default)
#   OPENWA_DIR=/opt/openwa bash services/openwa/setup.sh
#   OPENWA_REF=v0.23.7 bash services/openwa/setup.sh   # pin a tag/commit
#
# Run it ON THE GATEWAY HOST (VPS / EC2 / home box with Docker or Node 22+),
# NOT on Vercel — the gateway is a long-running Puppeteer/Baileys process.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

OPENWA_REF="${OPENWA_REF:-v0.23.7}"
OPENWA_DIR="${OPENWA_DIR:-$(pwd)/openwa}"
REPO_URL="https://github.com/rmyndharis/OpenWA.git"

echo "==> [1/4] Cloning OpenWA (${OPENWA_REF}) from GitHub"
if [ -d "${OPENWA_DIR}/.git" ]; then
  echo "    existing clone found at ${OPENWA_DIR} — fetching updates"
  git -C "${OPENWA_DIR}" fetch --tags origin
  git -C "${OPENWA_DIR}" checkout "${OPENWA_REF}"
else
  git clone --depth 1 --branch "${OPENWA_REF}" "${REPO_URL}" "${OPENWA_DIR}" \
    || git clone "${REPO_URL}" "${OPENWA_DIR}" \
    || { echo "clone failed — check network access to github.com"; exit 1; }
  git -C "${OPENWA_DIR}" checkout "${OPENWA_REF}" 2>/dev/null || true
fi

echo "==> [2/4] Installing dependencies (this downloads Chromium — be patient)"
cd "${OPENWA_DIR}"
if command -v npm >/dev/null 2>&1; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  echo "ERROR: npm not found. Install Node.js >= 22.19 first: https://nodejs.org"; exit 1;
fi

echo "==> [3/4] Preparing environment file"
if [ ! -f .env ]; then
  cp "${OLDPWD}/env.openwa.example" .env 2>/dev/null \
    || cp "$(dirname "$0")/env.openwa.example" .env \
    || echo "(env.openwa.example not found — create .env manually, see README.md)"
  echo "    created ${OPENWA_DIR}/.env — EDIT IT before going live (API key, session)"
fi

echo "==> [4/4] Building + starting"
npm run build
echo
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Install complete. Start the gateway:                            ║"
echo "║    cd ${OPENWA_DIR}                                  ║"
echo "║    npm run prod        # or: npm run start:dev                   ║"
echo "║                                                                  ║"
echo "║  Then (see services/openwa/README.md for the full runbook):      ║"
echo "║   1. open http://<host>:2785  → dashboard → pair WhatsApp (QR)   ║"
echo "║   2. create an API key      → POST /api/auth/api-keys            ║"
echo "║   3. create a session       → POST /api/sessions                 ║"
echo "║   4. wire Vercel env vars:                                       ║"
echo "║        WHATSAPP_API_URL=http://<host>:2785                       ║"
echo "║        WHATSAPP_API_TOKEN=<the api key>                          ║"
echo "║        OPENWA_SESSION_ID=<the session id>                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
