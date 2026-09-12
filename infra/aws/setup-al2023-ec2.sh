#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Amazon Linux 2023 (AL2023) EC2 Setup Script
# Target Instance: i-0be8ff8c5cfba7363 (18.232.148.172)
# OS: Amazon Linux 2023 | Type: t3.micro (1GB RAM)
# ═══════════════════════════════════════════════════════════════════════════
set -e

echo "=== 1. Setting up 4GB Swap Space (Critical for t3.micro 1GB RAM) ==="
if ! swapon --show | grep -q "/swapfile"; then
  sudo fallocate -l 4G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "✓ 4GB swap enabled"
else
  echo "✓ Swap already active"
fi

echo "=== 2. Installing Docker & Tools on Amazon Linux 2023 ==="
sudo dnf update -y
sudo dnf install -y docker git curl jq

# Install Docker Compose plugin
DOCKER_PLUGINS_DIR="/usr/local/lib/docker/cli-plugins"
sudo mkdir -p "$DOCKER_PLUGINS_DIR"
if [ ! -f "$DOCKER_PLUGINS_DIR/docker-compose" ]; then
  sudo curl -SL "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64" -o "$DOCKER_PLUGINS_DIR/docker-compose"
  sudo chmod +x "$DOCKER_PLUGINS_DIR/docker-compose"
fi

# Enable and start Docker service
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "=== 3. Cloning or Updating Sierra Estates Repository ==="
TARGET_DIR="/opt/sierra-estates"
sudo mkdir -p /opt
sudo chown -R ec2-user:ec2-user /opt

if [ ! -d "$TARGET_DIR/.git" ]; then
  git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git "$TARGET_DIR"
else
  cd "$TARGET_DIR"
  git pull origin main
fi

cd "$TARGET_DIR/infra/openwa"

echo "=== 4. Preparing Environment ==="
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created infra/openwa/.env from template"
fi

echo "=== 5. Starting OpenWA & n8n Containers ==="
# Using sg to execute docker command with new group permissions if not logged out yet
sg docker -c "docker compose up -d"

echo "=== 6. Running Plugin Setup ==="
bash setup.sh

echo "═══════════════════════════════════════════════════════════════"
echo "🎉 Sierra Estates OpenWA Stack is running on EC2!"
echo "OpenWA Dashboard (Scan WhatsApp QR): http://18.232.148.172:3000"
echo "n8n Automation Engine:                http://18.232.148.172:5678"
echo "═══════════════════════════════════════════════════════════════"
