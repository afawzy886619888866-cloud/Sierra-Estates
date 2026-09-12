#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — AWS EC2 User Data (Cloud-Init)
# File: infra/aws/ec2-user-data.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  Runs automatically on first EC2 boot. Supports:
#    • Amazon Linux 2023 (AL2023 / dnf / ec2-user)
#    • Ubuntu 22.04 / 24.04 (apt-get / ubuntu)
#
#  Provisions:
#    • 4GB Swap (essential for t3.micro 1GB RAM)
#    • Docker + Docker Compose Plugin
#    • OpenWA WhatsApp Gateway (wwebjs engine)
#    • n8n Workflow Automation
#    • Auto-enables 4 Sierra plugins (gsheets-logger, http-action, after-hours, faq-bot)
#
#  Post-boot endpoints:
#    OpenWA Dashboard: http://<EC2_IP>:3000  (Scan WhatsApp QR)
#    n8n Workflows:   http://<EC2_IP>:5678
# ═══════════════════════════════════════════════════════════════════════════
set -ex

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Sierra Estates EC2 Setup Starting ==="

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1: Detect OS & Package Manager
# ═══════════════════════════════════════════════════════════════════════════
DEFAULT_USER="ec2-user"
if id "ubuntu" &>/dev/null; then
  DEFAULT_USER="ubuntu"
elif id "ec2-user" &>/dev/null; then
  DEFAULT_USER="ec2-user"
fi

echo "Detected primary system user: ${DEFAULT_USER}"

if command -v dnf &>/dev/null; then
  PKG_MGR="dnf"
  dnf update -y
  dnf install -y git curl jq iptables
elif command -v apt-get &>/dev/null; then
  PKG_MGR="apt"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get upgrade -y
  apt-get install -y git curl jq iptables
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2: Create 4GB Swap (critical for t3.micro 1GB RAM)
# ═══════════════════════════════════════════════════════════════════════════
if ! swapon --show | grep -q "/swapfile"; then
  echo "Allocating 4GB swap space..."
  dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress || fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl vm.swappiness=10
  echo "✓ 4GB swap enabled"
else
  echo "✓ Swap already active"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 3: Install Docker & Docker Compose
# ═══════════════════════════════════════════════════════════════════════════
if [ "$PKG_MGR" = "dnf" ]; then
  dnf install -y docker
  DOCKER_PLUGINS_DIR="/usr/local/lib/docker/cli-plugins"
  mkdir -p "$DOCKER_PLUGINS_DIR"
  if [ ! -f "$DOCKER_PLUGINS_DIR/docker-compose" ]; then
    curl -SL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64" -o "$DOCKER_PLUGINS_DIR/docker-compose"
    chmod +x "$DOCKER_PLUGINS_DIR/docker-compose"
  fi
else
  curl -fsSL https://get.docker.com | sh
  apt-get install -y docker-compose-plugin || true
fi

systemctl enable --now docker
usermod -aG docker "$DEFAULT_USER"
echo "✓ Docker installed and enabled"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 4: Clone / Update Authoritative Sierra Estates Repository
# ═══════════════════════════════════════════════════════════════════════════
SE_DIR="/opt/sierra-estates"
mkdir -p /opt
chown -R "$DEFAULT_USER":"$DEFAULT_USER" /opt

REPO_URL="https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git"
if [ ! -d "$SE_DIR/.git" ]; then
  git clone "$REPO_URL" "$SE_DIR"
else
  cd "$SE_DIR"
  git pull origin main
fi
chown -R "$DEFAULT_USER":"$DEFAULT_USER" "$SE_DIR"
echo "✓ Repository cloned to $SE_DIR"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 5: Configure OpenWA Environment
# ═══════════════════════════════════════════════════════════════════════════
OPENWA_DIR="$SE_DIR/infra/openwa"
cd "$OPENWA_DIR"
cp -n .env.example .env || true

# Resolve public IP using IMDSv2 (with IMDSv1 and external fallbacks)
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)
if [ -n "$IMDS_TOKEN" ]; then
  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
fi

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "localhost" ]; then
  PUBLIC_IP=$(curl -s "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
fi

if [ -z "$PUBLIC_IP" ]; then
  PUBLIC_IP=$(curl -s "https://checkip.amazonaws.com" 2>/dev/null || echo "127.0.0.1")
fi

echo "Resolved public IP: ${PUBLIC_IP}"

# Generate persistent API keys if not present
ADMIN_KEY=$(openssl rand -hex 32)
OPERATOR_KEY=$(openssl rand -hex 32)
N8N_PASS=$(openssl rand -base64 16)

sed -i "s|OPENWA_ADMIN_API_KEY=.*|OPENWA_ADMIN_API_KEY=${ADMIN_KEY}|" .env
sed -i "s|OPENWA_OPERATOR_KEY=.*|OPENWA_OPERATOR_KEY=${OPERATOR_KEY}|" .env
sed -i "s|N8N_BASIC_AUTH_PASSWORD=.*|N8N_BASIC_AUTH_PASSWORD=${N8N_PASS}|" .env
sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=http://${PUBLIC_IP}:5678|" .env
sed -i "s|N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=http://${PUBLIC_IP}:5678|" .env
sed -i "s|TIMEZONE=.*|TIMEZONE=Africa/Cairo|" .env

echo "✓ OpenWA environment configured"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 6: Migrate Any Existing WhatsApp Auth Session
# ═══════════════════════════════════════════════════════════════════════════
mkdir -p "$OPENWA_DIR/whatsapp-auth" "$OPENWA_DIR/openwa-data" "$OPENWA_DIR/n8n-data"
bash "$OPENWA_DIR/migrate-session.sh" || echo "No legacy session found; fresh QR pairing required."

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 7: Start Containers
# ═══════════════════════════════════════════════════════════════════════════
docker compose up -d --pull always
echo "✓ OpenWA + n8n containers started"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 8: Wait for OpenWA & Register Plugins
# ═══════════════════════════════════════════════════════════════════════════
echo "Waiting 45s for OpenWA to start up..."
sleep 45
bash "$OPENWA_DIR/setup.sh" || echo "Plugins will initialize once WhatsApp session is connected."

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 9: Host Firewall (Allow ports 22, 3000, 5678)
# ═══════════════════════════════════════════════════════════════════════════
if command -v iptables &>/dev/null; then
  iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || iptables -A INPUT -p tcp --dport 22 -j ACCEPT
  iptables -C INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
  iptables -C INPUT -p tcp --dport 5678 -j ACCEPT 2>/dev/null || iptables -A INPUT -p tcp --dport 5678 -j ACCEPT
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 10: Write MOTD (Welcome Banner for SSH)
# ═══════════════════════════════════════════════════════════════════════════
cat > /etc/motd << EOF

╔════════════════════════════════════════════════════════════╗
║   Sierra Estates — OpenWA Gateway is running!              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  OpenWA Dashboard: http://${PUBLIC_IP}:3000                ║
║  Admin Key:        ${ADMIN_KEY}                            ║
║                                                            ║
║  n8n Dashboard:    http://${PUBLIC_IP}:5678                ║
║  n8n Login:        admin / ${N8N_PASS}                     ║
║                                                            ║
║  Scan QR:  Open dashboard -> Sessions -> sierra-main        ║
║                                                            ║
║  Logs:     docker compose -f ${OPENWA_DIR}/docker-compose.yml logs -f openwa ║
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
