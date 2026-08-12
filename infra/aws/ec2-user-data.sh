#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — AWS EC2 User Data (Cloud-Init)
# File: SE/infra/aws/ec2-user-data.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  This script runs AUTOMATICALLY when the EC2 instance first boots.
#  Paste it into the "User data" field when launching the EC2 instance.
#
#  It will:
#    1. Install Docker + Docker Compose
#    2. Create swap (t3.micro has only 1GB RAM — needs swap for n8n)
#    3. Clone the SE repo
#    4. Start n8n + WhatsApp scraper
#    5. Configure firewall (iptables)
#
#  LAUNCH COMMAND (AWS CLI):
#    aws ec2 run-instances \
#      --image-id ami-0c7217cdde317cfec \
#      --instance-type t3.small \
#      --user-data file://infra/aws/ec2-user-data.sh \
#      --key-name your-key-pair \
#      --security-group-ids sg-xxxxx \
#      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=sierra-estates}]"
# ═══════════════════════════════════════════════════════════════════════════

#!/bin/bash
set -ex

# ── Log everything ──
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Sierra Estates EC2 Setup Starting ==="

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1: System updates
# ═══════════════════════════════════════════════════════════════════════════
apt-get update -y
apt-get upgrade -y

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2: Create swap (critical for t3.micro — 1GB RAM is not enough for n8n)
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

# Install docker-compose plugin (v2)
apt-get install -y docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

echo "✓ Docker installed"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 4: Clone SE repo
# ═══════════════════════════════════════════════════════════════════════════
SE_DIR="/opt/sierra-estates"
apt-get install -y git
git clone -b dispatch https://github.com/ahmedfawzy8866/SE.git "$SE_DIR"
cd "$SE_DIR/infra"

echo "✓ Repo cloned to $SE_DIR"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 5: Create .env from template (with sensible defaults)
# ═══════════════════════════════════════════════════════════════════════════
cp .env.example .env

# Generate a random n8n password
N8N_PASS=$(openssl rand -base64 16)
sed -i "s/N8N_BASIC_AUTH_PASSWORD=.*/N8N_BASIC_AUTH_PASSWORD=$N8N_PASS/" .env

# Get instance public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")
sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=http://$PUBLIC_IP:5678|" .env
sed -i "s|N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=http://$PUBLIC_IP:5678|" .env

# Set timezone
sed -i "s|TIMEZONE=.*|TIMEZONE=Africa/Cairo|" .env

echo "✓ .env configured (n8n password: $N8N_PASS)"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 6: Create directories for persistence
# ═══════════════════════════════════════════════════════════════════════════
mkdir -p n8n-data whatsapp-auth secrets

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 7: Start containers
# ═══════════════════════════════════════════════════════════════════════════
docker compose up -d --build

echo "✓ Containers started"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 8: Configure iptables (in case security group isn't enough)
# ═══════════════════════════════════════════════════════════════════════════
# Allow SSH, n8n, WhatsApp QR
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 5678 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 9: Write access info to /etc/motd (shows on SSH login)
# ═══════════════════════════════════════════════════════════════════════════
cat > /etc/motd << EOF

╔════════════════════════════════════════════════════════════╗
║   Sierra Estates — AWS EC2 is running!                     ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  n8n Dashboard:  http://$PUBLIC_IP:5678                    ║
║  Login:          admin / $N8N_PASS                         ║
║                                                            ║
║  WhatsApp QR:    docker compose -f $SE_DIR/infra/docker-compose.yml \\
║                  logs whatsapp-scraper | grep -A 25 "Scan"  ║
║                                                            ║
║  Workflows:      /opt/sierra-estates/infra/n8n-workflows/   ║
║                                                            ║
║  Logs:           docker compose -f $SE_DIR/infra/docker-compose.yml logs ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

EOF

echo "=== Sierra Estates EC2 Setup Complete ==="
echo "n8n URL: http://$PUBLIC_IP:5678"
echo "n8n Password: $N8N_PASS"
