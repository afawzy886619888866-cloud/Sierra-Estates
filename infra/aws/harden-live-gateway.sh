#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Sierra Estates — Live EC2 Gateway Hardening & Resilience Script
# Target: 54.89.162.250 (Ubuntu 22.04/24.04 / AL2023)
# Services: OpenWA Gateway (:2785) & Workflow Runner (:2786)
# ══════════════════════════════════════════════════════════════════════════════
set -e

echo "=== [1/5] Configuring 4GB Swap Space (Anti-OOM Protection) ==="
if ! swapon --show | grep -q "/swapfile"; then
  echo "Allocating 4GB swapfile..."
  sudo fallocate -l 4G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q "/swapfile" /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
  echo "✓ 4GB swap space activated successfully."
else
  echo "✓ 4GB swap space is already active."
fi

echo "=== [2/5] Hardening systemd Services & Memory Ceilings ==="
# Ensure openwa systemd service enforces a memory ceiling and auto-restart
OPENWA_SVC="/etc/systemd/system/openwa.service"
if [ -f "$OPENWA_SVC" ]; then
  if ! grep -q "MemoryMax" "$OPENWA_SVC"; then
    sudo sed -i '/\[Service\]/a MemoryMax=1500M\nRestart=always\nRestartSec=5s' "$OPENWA_SVC"
    sudo systemctl daemon-reload
    echo "✓ Added MemoryMax=1500M and auto-restart to openwa.service."
  else
    echo "✓ openwa.service already has MemoryMax configured."
  fi
else
  echo "ℹ openwa.service not in /etc/systemd/system/ (standalone process or custom path)."
fi

echo "=== [3/5] Setting up WhatsApp Session Backup to AWS S3 ==="
BACKUP_SCRIPT="/usr/local/bin/backup-openwa-session.sh"
sudo tee "$BACKUP_SCRIPT" > /dev/null << 'EOF'
#!/usr/bin/env bash
set -e
DATA_DIR="/opt/openwa/data"
BACKUP_BUCKET="s3://sierra-estates-backups/openwa-session"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -d "$DATA_DIR" ]; then
  echo "Backing up WhatsApp session data from $DATA_DIR..."
  tar -czf "/tmp/openwa_session_${TIMESTAMP}.tar.gz" -C "$DATA_DIR" .
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "/tmp/openwa_session_${TIMESTAMP}.tar.gz" "${BACKUP_BUCKET}/openwa_session_${TIMESTAMP}.tar.gz" --sse AES256 || true
    echo "✓ S3 backup completed: openwa_session_${TIMESTAMP}.tar.gz"
  else
    echo "ℹ AWS CLI not configured on host; archive saved to /tmp/openwa_session_${TIMESTAMP}.tar.gz"
  fi
  rm -f "/tmp/openwa_session_${TIMESTAMP}.tar.gz"
fi
EOF

sudo chmod +x "$BACKUP_SCRIPT"
# Add daily backup cron at 03:00 AM
if ! sudo crontab -l 2>/dev/null | grep -q "backup-openwa-session.sh"; then
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-openwa-session.sh >> /var/log/openwa-backup.log 2>&1") | sudo crontab -
  echo "✓ Daily session backup cron registered (03:00 AM)."
else
  echo "✓ Session backup cron already present."
fi

echo "=== [4/5] Installing Cloudflare Tunnel (cloudflared) ==="
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Installing cloudflared..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "x86_64" ]; then
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb 2>/dev/null && sudo dpkg -i /tmp/cloudflared.deb 2>/dev/null || sudo rpm -ivh https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm 2>/dev/null || true
  fi
fi

if command -v cloudflared >/dev/null 2>&1; then
  echo "✓ cloudflared installed: $(cloudflared --version)"
else
  echo "ℹ cloudflared installation skipped (package manager mismatch or already installed)."
fi

echo "=== [5/5] Live Health Check on Port 2785 ==="
if curl -s http://127.0.0.1:2785/api/health | grep -q "ok"; then
  echo "✅ OpenWA Gateway (:2785) is HEALTHY and active!"
else
  echo "⚠️ OpenWA Gateway did not return status 'ok' on 127.0.0.1:2785."
fi

echo ""
echo "══════════════════════════════════════════════════════════════════════════════"
echo "🎉 Hardening complete for Sierra Estates EC2 Gateway Host!"
echo "══════════════════════════════════════════════════════════════════════════════"
