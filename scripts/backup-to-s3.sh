#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — S3 Backup Script
# File: SE/scripts/backup-to-s3.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  Backs up n8n workflows + WhatsApp session to S3.
#  Run on the EC2 instance (via cron or manually).
#
#  SETUP:
#    1. Create S3 bucket: aws s3 mb s3://sierra-estates-backups
#    2. Make this script executable: chmod +x backup-to-s3.sh
#    3. Add to crontab for daily backups:
#       crontab -e
#       0 3 * * * /opt/sierra-estates/scripts/backup-to-s3.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

BUCKET_NAME="${1:-sierra-estates-backups}"
SE_DIR="/opt/sierra-estates/infra"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_PREFIX="backup-$DATE"

echo "Backing up Sierra Estates to s3://$BUCKET_NAME/$BACKUP_PREFIX/"

# ── Stop containers for consistent backup ──
echo "Stopping containers..."
cd "$SE_DIR"
docker compose stop

# ── Backup n8n data (workflows + credentials) ──
echo "Backing up n8n data..."
aws s3 sync "$SE_DIR/n8n-data" "s3://$BUCKET_NAME/$BACKUP_PREFIX/n8n-data/" --no-progress

# ── Backup WhatsApp auth session ──
echo "Backing up WhatsApp auth..."
aws s3 sync "$SE_DIR/whatsapp-auth" "s3://$BUCKET_NAME/$BACKUP_PREFIX/whatsapp-auth/" --no-progress

# ── Backup .env config ──
echo "Backing up .env..."
aws s3 cp "$SE_DIR/.env" "s3://$BUCKET_NAME/$BACKUP_PREFIX/.env" --no-progress

# ── Backup Firebase service account (if exists) ──
if [ -f "$SE_DIR/secrets/firebase-service-account.json" ]; then
  echo "Backing up Firebase service account..."
  aws s3 cp "$SE_DIR/secrets/firebase-service-account.json" \
    "s3://$BUCKET_NAME/$BACKUP_PREFIX/firebase-service-account.json" --no-progress
fi

# ── Restart containers ──
echo "Restarting containers..."
docker compose start

# ── Clean up old backups (keep last 7 days) ──
echo "Cleaning up backups older than 7 days..."
aws s3 ls "s3://$BUCKET_NAME/" --recursive | grep "backup-" | awk '{print $4}' | \
  while read -r KEY; do
    BACKUP_DATE=$(echo "$KEY" | grep -oP 'backup-\d{4}-\d{2}-\d{2}')
    if [ -n "$BACKUP_DATE" ]; then
      BACKUP_TS=$(date -d "${BACKUP_DATE#backup-}" +%s 2>/dev/null || echo 0)
      SEVEN_DAYS_AGO=$(date -d "7 days ago" +%s)
      if [ "$BACKUP_TS" -lt "$SEVEN_DAYS_AGO" ] 2>/dev/null; then
        echo "  Deleting old backup: $KEY"
        aws s3 rm "s3://$BUCKET_NAME/$KEY" --no-progress
      fi
    fi
  done

echo "✅ Backup complete: s3://$BUCKET_NAME/$BACKUP_PREFIX/"
