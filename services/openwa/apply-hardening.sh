#!/usr/bin/env bash
# ============================================================================
# services/openwa/apply-hardening.sh — turnkey application of
# services/openwa/SECURITY_HARDENING.md §4 (2026-10-11 all-lines outage).
#
# Run ON THE GATEWAY VPS, as root (or with sudo). Idempotent: re-running
# re-detects, updates, and re-verifies — it never stacks duplicate config.
#
# What it does (each step prints its action and can be pre-viewed with --dry-run):
#   1. systemd drop-in /etc/systemd/system/<unit>.service.d/hardening.conf
#      with MemoryHigh/MemoryMax auto-sized to the box RAM (keeps ≥1.5 GB
#      headroom for the runner + OS), MemorySwapMax, and slower restart pacing.
#   2. A 4 GB swapfile (only when the box has NO active swap), swappiness=10.
#   3. Appends --js-flags=--max-old-space-size=512 to PUPPETEER_ARGS in the
#      gateway .env (backed up first) — a per-Chromium heap ceiling.
#   4. daemon-reload + service restart, then verification output
#      (NRestarts, cgroup MemoryCurrent, free -h, swap status).
#
# Usage:
#   sudo bash apply-hardening.sh --dry-run   # show what WOULD change
#   sudo bash apply-hardening.sh             # apply + restart + verify
# ============================================================================
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

say()  { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }

# ── locate the systemd unit ────────────────────────────────────────────────
UNIT=""
for candidate in openwa wa-gateway openwa-gateway; do
  if systemctl cat "${candidate}.service" >/dev/null 2>&1; then UNIT="${candidate}.service"; break; fi
done
if [[ -z "$UNIT" ]]; then
  # fall back to whatever unit's ExecStart points at the openwa dist
  UNIT=$(systemctl list-units --type=service --no-legend --plain 2>/dev/null \
    | awk '{print $1}' | while read -r u; do
        systemctl cat "$u" 2>/dev/null | grep -qE 'ExecStart=.*openwa|WorkingDirectory=/opt/openwa' && { echo "$u"; break; }
      done || true)
fi
[[ -z "$UNIT" ]] && { echo "FATAL: no openwa systemd unit found (expected 'openwa.service'). Name it explicitly and re-run." >&2; exit 1; }
say "Detected systemd unit: $UNIT"

WORKDIR=$(systemctl show "$UNIT" -p WorkingDirectory --value 2>/dev/null || true)
[[ -z "$WORKDIR" || "$WORKDIR" == "/" ]] && WORKDIR="/opt/openwa"
ENV_FILE=""
for f in "$WORKDIR/.env" "$WORKDIR/data/.env.generated"; do
  [[ -f "$f" ]] && ENV_FILE="$f" && break
done
note "WorkingDirectory: $WORKDIR"
note "env file: ${ENV_FILE:-<none found — PUPPETEER_ARGS step will be skipped>}"

# ── size memory guards from installed RAM ──────────────────────────────────
RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_GB=$(( (RAM_KB + 500000) / 1000000 ))   # round up to whole GB
# Keep ≥1.5 GB headroom (runner :2786 lives on the same box) + OS overhead.
MAX_GB=$(( RAM_GB - 2 )); HIGH_GB=$(( RAM_GB - 3 ))
if (( MAX_GB < 3 )); then
  echo "FATAL: box has only ~${RAM_GB} GB RAM — too small for the 3-line gateway plus guards. Scale the box or split lines per SECURITY_HARDENING.md §4.4." >&2
  exit 1
fi
(( HIGH_GB < 2 )) && HIGH_GB=2
note "box RAM ≈ ${RAM_GB} GB → MemoryHigh=${HIGH_GB}G, MemoryMax=${MAX_GB}G, MemorySwapMax=1G"

DROPIN_DIR="/etc/systemd/system/${UNIT}.d"
DROPIN="${DROPIN_DIR}/hardening.conf"

write_dropin() {
  mkdir -p "$DROPIN_DIR"
  cat > "$DROPIN" <<EOF
# Applied by services/openwa/apply-hardening.sh (see SECURITY_HARDENING.md §4.1)
[Service]
MemoryHigh=${HIGH_GB}G
MemoryMax=${MAX_GB}G
MemorySwapMax=1G
RestartSec=15
StartLimitBurst=3
StartLimitIntervalSec=120
EOF
  echo "   wrote $DROPIN"
}

if (( DRY_RUN )); then say "DRY RUN — would write:"; sed "s/^/   /" <<EOF
$DROPIN
[Service]
MemoryHigh=${HIGH_GB}G
MemoryMax=${MAX_GB}G
MemorySwapMax=1G
RestartSec=15
StartLimitBurst=3
StartLimitIntervalSec=120
EOF
else write_dropin; fi

# ── swap (only when none is active) ────────────────────────────────────────
SWAP_ACTIVE=$(awk '/^SwapTotal/ {print $2}' /proc/meminfo)
if (( SWAP_ACTIVE == 0 )); then
  if (( DRY_RUN )); then
    say "DRY RUN — would create /swapfile (4G, swappiness=10)"
  else
    say "No active swap — creating 4 GB /swapfile"
    if [[ ! -f /swapfile ]]; then
      fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
      grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    else
      swapon /swapfile 2>/dev/null || true
      grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    sysctl -w vm.swappiness=10 >/dev/null
    grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
    note "swap enabled (swappiness=10 persists across reboot)"
  fi
else
  say "Swap already active ($(awk '/^SwapTotal/ {printf "%.1f GB", $2/1048576}' /proc/meminfo)) — skipping"
fi

# ── per-Chromium heap ceiling via PUPPETEER_ARGS ──────────────────────────
if [[ -n "$ENV_FILE" ]]; then
  if grep -qE '^PUPPETEER_ARGS=' "$ENV_FILE"; then
    if grep -qE '^PUPPETEER_ARGS=.*max-old-space-size' "$ENV_FILE"; then
      say "PUPPETEER_ARGS already carries a heap ceiling — skipping"
    else
      if (( DRY_RUN )); then
        say "DRY RUN — would append --js-flags=--max-old-space-size=512 to PUPPETEER_ARGS in $ENV_FILE"
      else
        say "Appending per-browser heap ceiling to PUPPETEER_ARGS (backup: ${ENV_FILE}.bak.$(date +%s))"
        cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
        sed -i 's/^PUPPETEER_ARGS=/PUPPETEER_ARGS=/; s/\(PUPPETEER_ARGS=\)\(.*\)$/\1\2,--js-flags=--max-old-space-size=512/' "$ENV_FILE"
        grep '^PUPPETEER_ARGS=' "$ENV_FILE" | sed 's/^/   /'
      fi
    fi
  else
    if (( DRY_RUN )); then
      say "DRY RUN — would add PUPPETEER_ARGS with heap ceiling to $ENV_FILE"
    else
      say "Adding PUPPETEER_ARGS (defaults + heap ceiling) to $ENV_FILE (backup kept)"
      cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%s)"
      echo 'PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--js-flags=--max-old-space-size=512' >> "$ENV_FILE"
    fi
  fi
fi

# ── apply + verify ────────────────────────────────────────────────────────
if (( DRY_RUN )); then
  say "DRY RUN complete — nothing was changed. Re-run without --dry-run to apply."
  exit 0
fi
say "Reloading systemd + restarting $UNIT (RestartSec=15 now paces crash-loop flapping)"
systemctl daemon-reload
systemctl restart "$UNIT"
sleep 8
say "Verification"
note "ActiveEnterTimestamp: $(systemctl show "$UNIT" -p ActiveEnterTimestamp --value)"
note "NRestarts:            $(systemctl show "$UNIT" -p NRestarts --value)"
note "MemoryCurrent:        $(systemctl show "$UNIT" -p MemoryCurrent --value) bytes"
note "MemoryMax:            $(systemctl show "$UNIT" -p MemoryMax --value)"
note "PUPPETEER_ARGS:       $(grep '^PUPPETEER_ARGS=' "$ENV_FILE" 2>/dev/null | cut -c1-120 || echo '<env not found>')"
free -h | sed 's/^/   /'
say "Done. Confirm engine reloads with: curl -s http://127.0.0.1:2785/api/health"
say "Pairing portal (if lines need re-linking): http://<host>:2786/pair"
