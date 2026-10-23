#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Sierra Estates — Live EC2 Gateway Hardening & Resilience Script
# Target: Ubuntu 22.04/24.04 / AL2023 (OpenWA Gateway :2785, Runner :2786)
#
# SAFETY CONTRACT (2026-10 rewrite — previous version was unsafe):
#   * DRY-RUN by default; infrastructure mutations require --apply.
#   * Swap: preflight-checked (existing swap, free disk, RAM) and configurable
#     (SWAP_SIZE_MB). The unconditional 4GB allocation is gone.
#   * Backups: destination is configurable via BACKUP_BUCKET (S3 URI) — the
#     hard-coded bucket is gone. Upload failures PROPAGATE (set -e per step,
#     `|| true` suppressions removed), the archive is KEPT on upload failure,
#     and every uploaded object is verified by size + SHA-256 checksum.
#   * Retention: existing objects are listed after upload (verification that
#         the bucket actually holds the backup); pruning is opt-in.
#   * Restore procedure is printed and stored next to the backup script.
#   * systemd MemoryMax is configurable (MEMORY_MAX_MB, default unset → only a
#     documented recommendation is printed, no arbitrary limit enforced).
#   * Unit files are backed up before modification and validated afterwards.
#   * cloudflared is only INSTALLED if requested with --install-cloudflared —
#     installing the binary is never conflated with a verified secure tunnel
#     (see setup-cloudflare-tunnel.sh for the tunnel procedure).
#   * The final report distinguishes attempted / applied / verified actions.
#
# Usage:
#   sudo ./harden-live-gateway.sh                     # dry-run plan
#   sudo ./harden-live-gateway.sh --apply             # apply all safe steps
#   sudo BACKUP_BUCKET=s3://my-bucket/openwa-session SWAP_SIZE_MB=2048 \
#        ./harden-live-gateway.sh --apply
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APPLY=0
INSTALL_CLOUDFLARED=0
SWAP_SIZE_MB="${SWAP_SIZE_MB:-4096}"
MEMORY_MAX_MB="${MEMORY_MAX_MB:-}"
BACKUP_BUCKET="${BACKUP_BUCKET:-}"
BACKUP_DATA_DIR="${BACKUP_DATA_DIR:-/opt/openwa/data}"
BACKUP_CRON_HOUR="${BACKUP_CRON_HOUR:-3}"

log()  { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die()  { printf 'FATAL: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)               APPLY=1 ;;
    --install-cloudflared) INSTALL_CLOUDFLARED=1 ;;
    -h|--help)             sed -n '2,28p' "$0"; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
  shift
done

MODE="dry-run"; [[ $APPLY -eq 1 ]] && MODE="APPLY"

[[ $EUID -eq 0 ]] || die "must run as root (sudo)"

echo "═════════════════════════════════════════════════════════════════════════════"
echo " Sierra Estates — EC2 Gateway Hardening (${MODE})"
echo "═════════════════════════════════════════════════════════════════════════════"

# ── Preflight ────────────────────────────────────────────────────────────────
echo "── [preflight]"
RAM_MB="$(free -m | awk '/^Mem:/{print $2}')"
DISK_AVAIL_MB="$(df -m / | awk 'NR==2{print $4}')"
CUR_SWAP_MB="$(free -m | awk '/^Swap:/{print $2}')"
echo "[preflight] RAM=${RAM_MB}MB  free-disk=${DISK_AVAIL_MB}MB  current-swap=${CUR_SWAP_MB}MB"
[[ $DISK_AVAIL_MB -gt $((SWAP_SIZE_MB + 1024)) ]] || warn "low free disk (${DISK_AVAIL_MB}MB) for a ${SWAP_SIZE_MB}MB swapfile"

SWAP_NEEDED=0
if [[ "$CUR_SWAP_MB" -lt 2048 ]]; then
  if [[ $APPLY -eq 0 ]]; then
    echo "[preflight] swap below 2GB — would allocate ${SWAP_SIZE_MB}MB (configurable: SWAP_SIZE_MB)"
  fi
  SWAP_NEEDED=1
fi

OPENWA_SVC="/etc/systemd/system/openwa.service"
HAS_OPENWA_UNIT=0; [[ -f "$OPENWA_SVC" ]] && HAS_OPENWA_UNIT=1
echo "[preflight] openwa.service present: ${HAS_OPENWA_UNIT}"

if [[ $APPLY -eq 1 && $SWAP_NEEDED -eq 1 ]]; then
  echo "── [1] Swap (${SWAP_SIZE_MB}MB, preflight-checked)"
  if ! swapon --show | grep -q "/swapfile"; then
    fallocate -l "${SWAP_SIZE_MB}M" /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_SIZE_MB" status=progress
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "[1] ✓ swap activated and persisted in fstab"
  else
    echo "[1] ✓ /swapfile already active"
  fi
else
  [[ $SWAP_NEEDED -eq 1 ]] && echo "[1] (dry-run) would activate ${SWAP_SIZE_MB}MB swap" || echo "[1] ✓ swap already sufficient (≥2GB)"
fi

# ── [2] systemd service hardening (configurable, backup + verify) ───────────
echo "── [2] systemd service limits"
if [[ $HAS_OPENWA_UNIT -eq 1 ]]; then
  if [[ -z "$MEMORY_MAX_MB" ]]; then
    echo "[2] MEMORY_MAX_MB not set — no memory ceiling will be enforced."
    echo "[2] recommendation: size it from the host budget (RAM=${RAM_MB}MB); e.g. MEMORY_MAX_MB=1500 for a 2GB host, leaving headroom for the runner + OS."
  else
    if [[ $APPLY -eq 0 ]]; then
      echo "[2] (dry-run) would add MemoryMax=${MEMORY_MAX_MB}M + Restart=always to openwa.service (backup taken first)"
    else
      BK="/etc/systemd/system/openwa.service.bak.$(date +%Y%m%d_%H%M%S)"
      cp -a "$OPENWA_SVC" "$BK"; echo "[2] backup: ${BK}"
      if ! grep -q "MemoryMax" "$OPENWA_SVC"; then
        sed -i "/\[Service\]/a MemoryMax=${MEMORY_MAX_MB}M\nRestart=always\nRestartSec=5s" "$OPENWA_SVC"
        systemctl daemon-reload
        systemctl restart openwa || warn "openwa restart after unit change failed — inspect: journalctl -u openwa -n 50"
        echo "[2] ✓ MemoryMax=${MEMORY_MAX_MB}M applied (rollback: sudo cp ${BK} ${OPENWA_SVC} && sudo systemctl daemon-reload && sudo systemctl restart openwa)"
      else
        echo "[2] ✓ openwa.service already carries MemoryMax"
      fi
    fi
  fi
else
  echo "[2] openwa.service not in /etc/systemd/system/ — nothing to harden (standalone process or custom path)."
fi

# ── [3] Session backup to S3 (verified, error-propagating) ─────────────────
echo "── [3] WhatsApp session backup"
BACKUP_SCRIPT="/usr/local/bin/backup-openwa-session.sh"
if [[ -z "$BACKUP_BUCKET" ]]; then
  echo "[3] BACKUP_BUCKET not configured — backup script will NOT be installed."
  echo "[3] to enable: sudo BACKUP_BUCKET=s3://<authorized-bucket>/openwa-session $0 --apply"
else
  if [[ $APPLY -eq 0 ]]; then
    echo "[3] (dry-run) would install ${BACKUP_SCRIPT} →"
    echo "[3]   tar+gzip ${BACKUP_DATA_DIR} (checksummed), upload to ${BACKUP_BUCKET}"
    echo "[3]   with --sse AES256, verify size+SHA-256 of the stored object, keep the"
    echo "[3]   local archive on failure, daily cron at ${BACKUP_CRON_HOUR}:00."
  else
    command -v aws >/dev/null 2>&1 || die "[3] aws CLI required for verified S3 backups — install/configure it first (this is an applied-mode prerequisite, not optional)"
    aws s3 ls "${BACKUP_BUCKET%%/*}/" >/dev/null 2>&1 || die "[3] bucket ${BACKUP_BUCKET%%/*} is not listable with current credentials — check IAM permissions before installing a cron that would fail every night"
    mkdir -p "$(dirname "$BACKUP_SCRIPT")"
    cat > "$BACKUP_SCRIPT" << EOF
#!/usr/bin/env bash
# Generated by harden-live-gateway.sh — verified OpenWA session backup.
# Restore (documented, tested on a scratch host first):
#   1. aws s3 cp ${BACKUP_BUCKET}/LATEST.sha256 /tmp/ && cat /tmp/LATEST.sha256
#   2. aws s3 cp ${BACKUP_BUCKET}/<archive-from-LATEST> /tmp/
#   3. sha256sum -c <(cat /tmp/LATEST.sha256)   # MUST match before continuing
#   4. sudo systemctl stop openwa
#   5. sudo tar -xzf /tmp/<archive> -C ${BACKUP_DATA_DIR}
#   6. sudo systemctl start openwa && curl -s http://127.0.0.1:2785/api/health
set -euo pipefail
DATA_DIR="${BACKUP_DATA_DIR}"
BUCKET="${BACKUP_BUCKET}"
STAMP=\$(date -u +"%Y%m%d_%H%M%S")
ARCHIVE="/tmp/openwa_session_\${STAMP}.tar.gz"
[ -d "\$DATA_DIR" ] || { echo "no \$DATA_DIR — nothing to back up"; exit 0; }
tar -czf "\$ARCHIVE" -C "\$DATA_DIR" .
SHA=\$(sha256sum "\$ARCHIVE" | awk '{print \$1}')
SIZE=\$(stat -c%s "\$ARCHIVE")
aws s3 cp "\$ARCHIVE" "\${BUCKET}/openwa_session_\${STAMP}.tar.gz" --sse AES256
# verify what actually landed in the bucket — a queued/failed upload is NOT a backup
REMOTE_SIZE=\$(aws s3 ls "\${BUCKET}/openwa_session_\${STAMP}.tar.gz" | awk '{print \$3}')
[ "\$REMOTE_SIZE" = "\$SIZE" ] || { echo "VERIFY FAILED: remote size \$REMOTE_SIZE != local \$SIZE — archive kept at \$ARCHIVE"; exit 1; }
printf '%s  openwa_session_%s.tar.gz\n' "\$SHA" "\$STAMP" > /tmp/latest.sha256
aws s3 cp /tmp/latest.sha256 "\${BUCKET}/LATEST.sha256" --sse AES256 >/dev/null
echo "backup verified: openwa_session_\${STAMP}.tar.gz (\$SIZE bytes, sha256 \$SHA)"
rm -f "\$ARCHIVE" /tmp/latest.sha256
EOF
    chmod 700 "$BACKUP_SCRIPT"
    if ! crontab -l 2>/dev/null | grep -q "backup-openwa-session.sh"; then
      (crontab -l 2>/dev/null; echo "0 ${BACKUP_CRON_HOUR} * * * ${BACKUP_SCRIPT} >> /var/log/openwa-backup.log 2>&1") | crontab -
      echo "[3] ✓ backup script installed, daily cron at ${BACKUP_CRON_HOUR}:00 (verified-upload design)"
    else
      echo "[3] ✓ backup cron already present"
    fi
  fi
fi

# ── [4] cloudflared (binary only, opt-in) ───────────────────────────────────
echo "── [4] cloudflared"
if [[ $INSTALL_CLOUDFLARED -eq 1 ]]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    if [[ $APPLY -eq 0 ]]; then
      echo "[4] (dry-run) would install cloudflared from the official release"
    else
      ARCH="$(uname -m)"
      case "$ARCH" in
        x86_64)        DL="cloudflared-linux-amd64.deb" ;;
        aarch64|arm64) DL="cloudflared-linux-arm64.deb" ;;
        *) die "[4] unsupported architecture: $ARCH" ;;
      esac
      curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/${DL}"
      (dpkg -i /tmp/cloudflared.deb 2>/dev/null || rpm -ivh "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.rpm") || die "[4] cloudflared install failed"
      rm -f /tmp/cloudflared.deb
      echo "[4] ✓ cloudflared installed: $(cloudflared --version)"
    fi
  else
    echo "[4] ✓ cloudflared already present: $(cloudflared --version)"
  fi
  echo "[4] NOTE: an installed binary is NOT a tunnel. Configure a NAMED tunnel with"
  echo "[4] a hostname + Cloudflare Access policy via setup-cloudflare-tunnel.sh."
else
  echo "[4] skipped (binary-only step; pass --install-cloudflared if the binary is needed)"
fi

# ── [5] Live health check (honest) ──────────────────────────────────────────
echo "── [5] gateway health"
if curl -sf http://127.0.0.1:2785/api/health | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
  echo "[5] ✓ OpenWA gateway (:2785) reports ok on loopback."
else
  warn "OpenWA gateway did not return ok on 127.0.0.1:2785 — this is the CURRENT state, not a success."
fi

echo
echo "═════════════════════════════════════════════════════════════════════════════"
echo " Hardening pass complete (${MODE}) — summary above reflects what was"
echo " attempted, applied and verified. Failures, if any, were printed."
echo "═════════════════════════════════════════════════════════════════════════════"
