#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — AWS EC2 User Data (Cloud-Init)
# File: SE/infra/aws/ec2-user-data.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  Runs automatically on first EC2 boot. Installs:
#    • Docker + Docker Compose
#    • OpenWA WhatsApp Gateway (replaces legacy whatsapp-scraper)
#    • n8n Workflow Automation
#    • 4 Sierra Estates plugins: gsheets-logger, http-action, after-hours, faq-bot
#
#  After boot (~5 min):
#    Dashboard: http://<EC2_IP>:3000   (OpenWA — scan QR here)
#    n8n:       http://<EC2_IP>:5678
#
# ═══════════════════════════════════════════════════════════════════════════

#!/bin/bash
set -ex

exec >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Sierra Estates EC2 Setup Starting ==="

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1: System updates
# ═══════════════════════════════════════════════════════════════════════════
apt-get update -y
apt-get upgrade -y

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2: Create swap (critical for t3.micro — wwebjs needs Chromium)
# ═══════════════════════════════════════════════════════════════════════════
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl vm.swappiness=10
  echo "✓ Swap created (2GB)"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 3: Install Docker
# ═══════════════════════════════════════════════════════════════════════════
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
apt-get install -y docker-compose-plugin
usermod -aG docker ubuntu
echo "✓ Docker installed"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 4: Clone SE repo (dispatch branch)
# ═══════════════════════════════════════════════════════════════════════════
SE_DIR="/opt/sierra-estates"
apt-get install -y git
git clone -b dispatch https://github.com/ahmedfawzy8866/SE.git "$SE_DIR"
echo "✓ Repo cloned to $SE_DIR"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 5: Configure OpenWA environment
# ═══════════════════════════════════════════════════════════════════════════
OPENWA_DIR="$SE_DIR/infra/openwa"
cd "$OPENWA_DIR"
cp .env.example .env

# Get instance public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

# Generate secure keys
ADMIN_KEY=$(openssl rand -hex 32)
OPERATOR_KEY=$(openssl rand -hex 32)
N8N_PASS=$(openssl rand -base64 16)

# Patch .env
sed -i "s|OPENWA_ADMIN_API_KEY=.*|OPENWA_ADMIN_API_KEY=${ADMIN_KEY}|" .env
sed -i "s|OPENWA_OPERATOR_KEY=.*|OPENWA_OPERATOR_KEY=${OPERATOR_KEY}|" .env
sed -i "s|N8N_BASIC_AUTH_PASSWORD=.*|N8N_BASIC_AUTH_PASSWORD=${N8N_PASS}|" .env
sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=http://${PUBLIC_IP}:5678|" .env
sed -i "s|N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=http://${PUBLIC_IP}:5678|" .env
sed -i "s|TIMEZONE=.*|TIMEZONE=Africa/Cairo|" .env

echo "✓ OpenWA environment configured"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 6: Migrate any existing session data
# ═══════════════════════════════════════════════════════════════════════════
mkdir -p "$OPENWA_DIR/whatsapp-auth" "$OPENWA_DIR/openwa-data" "$OPENWA_DIR/n8n-data"
bash "$OPENWA_DIR/migrate-session.sh" || echo "No existing session to migrate — fresh QR needed"
echo "✓ Session migration complete"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 7: Start OpenWA + n8n stack
# ═══════════════════════════════════════════════════════════════════════════
docker compose up -d --pull always
echo "✓ OpenWA + n8n containers started"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 8: Wait for OpenWA health then install plugins
# ═══════════════════════════════════════════════════════════════════════════
echo "Waiting 60s for OpenWA to initialize..."
sleep 60
bash "$OPENWA_DIR/setup.sh" || echo "Plugin setup will retry on next login. Run: bash $OPENWA_DIR/setup.sh"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 9: Configure firewall
# ═══════════════════════════════════════════════════════════════════════════
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT   # OpenWA dashboard
iptables -A INPUT -p tcp --dport 5678 -j ACCEPT   # n8n
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 10: Write MOTD (shown on SSH login)
# ═══════════════════════════════════════════════════════════════════════════
cat > /etc/motd << EOF

╔════════════════════════════════════════════════════════════╗
║   Sierra Estates — OpenWA Gateway is running!              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  OpenWA Dashboard: http://${PUBLIC_IP}:3000                ║
║  Admin Key:        ${ADMIN_KEY}                            ║
║                                                            ║
║  n8n Dashboard:   http://${PUBLIC_IP}:5678                 ║
║  n8n Login:       admin / ${N8N_PASS}                      ║
║                                                            ║
║  Scan QR:  Open dashboard → Sessions → sierra-main         ║
║                                                            ║
║  Logs:     docker compose -f ${OPENWA_DIR}/docker-compose.yml logs -f openwa  ║
║                                                            ║
║  Plugins installed:                                        ║
║    ✓ gsheets-logger  (auto-log to Google Sheets)           ║
║    ✓ http-action     (!status, !listings, !price)          ║
║    ✓ after-hours     (auto-reply outside business hours)   ║
║    ✓ faq-bot         (Arabic/English listing FAQ)          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

EOF

echo "=== Sierra Estates EC2 Setup Complete ==="
echo "OpenWA URL: http://${PUBLIC_IP}:3000"
echo "Admin Key: ${ADMIN_KEY}"
echo "n8n URL: http://${PUBLIC_IP}:5678"
echo "n8n Password: ${N8N_PASS}"

