#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenWA gateway — one-command VPS bootstrap (Sierra Estates)
#
# Takes a FRESH Ubuntu 22.04/24.04 box to a running, systemd-managed gateway:
#   Node 22 + Chromium system libraries → repo checkout → OpenWA install →
#   systemd unit (auto-restart, enabled on boot) → firewall.
#
# Usage (as root, on the VPS):
#   git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git /opt/se
#   bash /opt/se/services/openwa/bootstrap-vps.sh
#
# After it finishes:
#   1. open http://<VPS-IP>:2785  → pair "session-default" (QR / pairing code)
#   2. dashboard → API Keys → create a real key
#   3. edit /opt/openwa/.env → ALLOW_DEV_API_KEY=false, API_KEYS=key1:sk-live-...
#   4. systemctl restart openwa
#   5. Vercel env: WHATSAPP_API_URL / WHATSAPP_API_TOKEN / OPENWA_SESSION_ID
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SE_DIR="${SE_DIR:-/opt/se}"
OPENWA_DIR="${OPENWA_DIR:-/opt/openwa}"
REPO_URL="${REPO_URL:-https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git}"

[ "$(id -u)" = "0" ] || { echo "ERROR: run as root"; exit 1; }
. /etc/os-release
case "${ID:-}" in ubuntu|debian) ;; *) echo "WARNING: untested distro '${ID:-}' — continuing"; ;; esac

echo "==> [1/6] Base packages + Node 22 + Chromium system libraries"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates git ufw
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'parseInt(process.versions.node)')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2 libxshmfence1
echo "    node $(node -v)"

echo "==> [2/6] SE repo checkout at ${SE_DIR}"
if [ -d "${SE_DIR}/.git" ]; then
  git -C "${SE_DIR}" pull --ff-only || echo "    (pull skipped — keeping local checkout)"
else
  git clone --depth 1 "${REPO_URL}" "${SE_DIR}"
fi

echo "==> [3/6] OpenWA install into ${OPENWA_DIR}"
OPENWA_DIR="${OPENWA_DIR}" bash "${SE_DIR}/services/openwa/setup.sh"

echo "==> [4/6] systemd unit (auto-restart, enabled on boot)"
sed "s|WorkingDirectory=/opt/openwa|WorkingDirectory=${OPENWA_DIR}|" \
  "${SE_DIR}/services/openwa/openwa.service" > /etc/systemd/system/openwa.service
systemctl daemon-reload
systemctl enable --now openwa
sleep 3
systemctl --no-pager --lines=3 status openwa || true

echo "==> [5/6] Firewall (SSH + gateway port only)"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 2785/tcp >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true
ufw status | head -5 || true

echo "==> [6/6] Health check"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:2785/api/health >/dev/null 2>&1; then
    echo "    gateway healthy on :2785"
    break
  fi
  sleep 2
done

cat <<'NEXT'

╔══════════════════════════════════════════════════════════════════╗
║  Bootstrap complete. Finish pairing + hardening:                 ║
║                                                                  ║
║  1. http://<VPS-IP>:2785  → login (dev key), create session      ║
║     "session-default", scan the QR with the Sierra Estates       ║
║     number (or use "link with phone number instead")             ║
║  2. Dashboard → API Keys → create a REAL key                     ║
║  3. Edit /opt/openwa/.env:                                       ║
║       ALLOW_DEV_API_KEY=false                                    ║
║       API_KEYS=key1:sk-live-<paste-the-new-key>                  ║
║     then: systemctl restart openwa                               ║
║  4. Vercel project env vars → redeploy:                          ║
║       WHATSAPP_API_URL=http://<VPS-IP>:2785                      ║
║       WHATSAPP_API_TOKEN=sk-live-<the-key>                       ║
║       OPENWA_SESSION_ID=session-default                          ║
║                                                                  ║
║  Session credentials live in /opt/openwa/data — back it up.      ║
╚══════════════════════════════════════════════════════════════════╝
NEXT
