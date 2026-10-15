#!/usr/bin/env bash
# ==============================================================================
# setup-cloudflare-tunnel.sh
# Sierra Estates — Cloudflare Tunnel Automation for OpenWA Gateway (:2785)
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo "🛡️  SIERRA ESTATES: Cloudflare Tunnel Gateway Setup"
echo "======================================================================"

CLOUDFLARED_BIN=$(which cloudflared || echo "/usr/local/bin/cloudflared")
if [[ ! -x "$CLOUDFLARED_BIN" ]]; then
  echo "Installing cloudflared binary..."
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
  CLOUDFLARED_BIN=$(which cloudflared)
fi

echo "Found cloudflared at: $CLOUDFLARED_BIN"
$CLOUDFLARED_BIN --version

TUNNEL_TOKEN="${1:-${CLOUDFLARE_TUNNEL_TOKEN:-}}"

if [[ -n "$TUNNEL_TOKEN" ]]; then
  echo "Configuring named Cloudflare Zero Trust Tunnel with provided token..."
  sudo "$CLOUDFLARED_BIN" service install "$TUNNEL_TOKEN" || true
  sudo systemctl restart cloudflared
  sudo systemctl enable cloudflared
  echo "Named Cloudflare Tunnel installed and active."
else
  echo "Configuring persistent Quick Tunnel systemd service for http://localhost:2785..."
  cat << 'EOF' | sudo tee /etc/systemd/system/cloudflared-gateway.service > /dev/null
[Unit]
Description=Cloudflare Tunnel for OpenWA Gateway
After=network.target openwa.service
Wants=openwa.service

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:2785
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable cloudflared-gateway
  sudo systemctl restart cloudflared-gateway
  echo "cloudflared-gateway.service started."
  sleep 4
  sudo journalctl -u cloudflared-gateway -n 10 --no-pager
fi

echo "======================================================================"
echo "✅ Cloudflare Tunnel Configuration Complete"
echo "======================================================================"
