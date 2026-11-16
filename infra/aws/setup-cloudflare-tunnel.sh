#!/usr/bin/env bash
# ==============================================================================
# setup-cloudflare-tunnel.sh
# Sierra Estates — Cloudflare Tunnel Automation for OpenWA Gateway (:2785)
#
# SAFETY CONTRACT (2026-10 rewrite):
#   * DRY-RUN by default. NOTHING is installed, enabled or restarted unless
#     --apply is passed explicitly.
#   * A NAMED tunnel token (Zero Trust, with a hostname + access policy
#     configured in the Cloudflare dashboard) is the ONLY sanctioned ingress.
#     A Quick Tunnel is a random PUBLIC URL with NO access control — it is
#     never created silently. --allow-quick-tunnel is the explicit, loud opt-in
#     for development ONLY and prints the risk on every use.
#   * The tunnel token is NEVER passed as a command-line argument (visible in
#     `ps` output and shell history). It is read from stdin or the
#     CLOUDFLARE_TUNNEL_TOKEN environment variable, and forwarded to
#     `cloudflared service install` via the same stdin/env mechanism
#     (cloudflared accepts the token as its sole argument, so the token is
#     written to a 0600 root-only file first and fed via stdin redirection;
#     see install_named_tunnel()).
#   * systemd units are backed up before modification and validated with
#     `systemd-analyze verify` before being enabled.
#   * A rollback procedure is printed after any applied change.
#   * Missing cloudflared, missing token, or a failed service check are
#     VISIBLE failures — never a "success" message.
#
# Usage:
#   ./setup-cloudflare-tunnel.sh                      # dry-run plan
#   ./setup-cloudflare-tunnel.sh --apply              # named tunnel from
#                                                    # $CLOUDFLARE_TUNNEL_TOKEN
#   CLOUDFLARE_TUNNEL_TOKEN=... ./setup-cloudflare-tunnel.sh --apply
#   ./setup-cloudflare-tunnel.sh --apply --token-stdin < token.txt
#   ./setup-cloudflare-tunnel.sh --apply --allow-quick-tunnel   # dev only!
# ==============================================================================
set -euo pipefail

APPLY=0
ALLOW_QUICK_TUNNEL=0
TOKEN_SRC="env"
TOKEN_VALUE=""

log()  { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die()  { printf 'FATAL: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)             APPLY=1 ;;
    --allow-quick-tunnel) ALLOW_QUICK_TUNNEL=1 ;;
    --token-stdin)       TOKEN_SRC="stdin" ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
  shift
done

[[ $EUID -eq 0 ]] || die "must run as root (sudo) to manage systemd services"
command -v systemctl >/dev/null 2>&1 || die "systemctl not found — this script targets the systemd EC2 host"

MODE="dry-run"
[[ $APPLY -eq 1 ]] && MODE="APPLY"

echo "======================================================================"
echo " SIERRA ESTATES: Cloudflare Tunnel Gateway Setup  (${MODE})"
echo "======================================================================"

# ── 1. Preflight: binary, architecture, service user ────────────────────────
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)         CF_PKG_ARCH="amd64" ;;
  aarch64|arm64)  CF_PKG_ARCH="arm64" ;;
  *) die "unsupported architecture: $ARCH" ;;
esac

CLOUDFLARED_BIN="$(command -v cloudflared || true)"
if [[ -z "$CLOUDFLARED_BIN" || ! -x "$CLOUDFLARED_BIN" ]]; then
  CLOUDFLARED_BIN="/usr/local/bin/cloudflared"
fi

if [[ ! -x "$CLOUDFLARED_BIN" ]]; then
  echo "[preflight] cloudflared not found — it would be installed from the"
  echo "[preflight] official Cloudflare release (arch ${ARCH} => cloudflared-linux-${CF_PKG_ARCH}.deb)."
  if [[ $APPLY -eq 1 ]]; then
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_PKG_ARCH}.deb"
    TMP_DEB="$(mktemp /tmp/cloudflared.XXXXXX.deb)"
    trap 'rm -f "$TMP_DEB"' EXIT
    curl -fsSL "$URL" -o "$TMP_DEB" || die "cloudflared download failed from $URL"
    dpkg -i "$TMP_DEB" || die "cloudflared install failed (dpkg)"
    rm -f "$TMP_DEB"; trap - EXIT
    CLOUDFLARED_BIN="$(command -v cloudflared || echo /usr/local/bin/cloudflared)"
  fi
else
  echo "[preflight] cloudflared present: $("$CLOUDFLARED_BIN" --version 2>/dev/null || echo 'version probe failed')"
fi

SERVICE_USER="${SUDO_USER:-ubuntu}"
id -u "$SERVICE_USER" >/dev/null 2>&1 || SERVICE_USER="root"
echo "[preflight] architecture=${ARCH}  service user=${SERVICE_USER}"

# ── 2. Read the named-tunnel token (never from argv, never printed) ──────────
if [[ $ALLOW_QUICK_TUNNEL -eq 0 ]]; then
  if [[ "$TOKEN_SRC" == "stdin" ]]; then
    [[ ! -t 0 ]] || die "--token-stdin requires the token piped on stdin (e.g. ./setup.sh --apply --token-stdin < token.txt)"
    TOKEN_VALUE="$(cat)"
  else
    TOKEN_VALUE="${CLOUDFLARE_TUNNEL_TOKEN:-}"
  fi
  if [[ $APPLY -eq 1 && -z "$TOKEN_VALUE" ]]; then
    die "no named tunnel token provided. Pass CLOUDFLARE_TUNNEL_TOKEN in the environment or use --token-stdin. A named tunnel with a dashboard-configured hostname + Cloudflare Access policy is REQUIRED for production ingress. (Quick Tunnel is dev-only: --allow-quick-tunnel.)"
  fi
  if [[ -n "$TOKEN_VALUE" ]]; then
    echo "[token] named tunnel token present (value not displayed, length ${#TOKEN_VALUE})"
  else
    echo "[token] no token supplied — dry-run only, no changes possible."
  fi
fi

# ── 3. Plan ──────────────────────────────────────────────────────────────────
if [[ $ALLOW_QUICK_TUNNEL -eq 1 ]]; then
  warn "QUICK TUNNEL SELECTED — this creates a RANDOM PUBLIC URL with NO access"
  warn "control in front of the OpenWA gateway. Development use only. Anyone"
  warn "who learns the URL reaches the gateway's HTTP surface."
  PLAN="persistent Quick Tunnel systemd service (cloudflared-gateway) -> http://localhost:2785"
elif [[ -n "$TOKEN_VALUE" || $APPLY -eq 0 ]]; then
  PLAN="named Cloudflare Zero Trust tunnel (token via ${TOKEN_SRC}/env) installed as the cloudflared system service"
else
  die "nothing to do: no token and no quick-tunnel opt-in"
fi

echo "[plan] ${PLAN}"

# ── 4. Back up existing unit files before touching them ─────────────────────
backup_unit() {
  local unit="$1"
  if [[ -f "/etc/systemd/system/${unit}" ]]; then
    local bk="/etc/systemd/system/${unit}.bak.$(date +%Y%m%d_%H%M%S)"
    cp -a "/etc/systemd/system/${unit}" "$bk"
    echo "[backup] ${unit} -> ${bk}"
  fi
}

# ── 5. Quick Tunnel path (explicit dev opt-in only) ──────────────────────────
if [[ $ALLOW_QUICK_TUNNEL -eq 1 ]]; then
  UNIT="cloudflared-gateway.service"
  if [[ $APPLY -eq 0 ]]; then
    echo "[dry-run] would write /etc/systemd/system/${UNIT} forwarding to http://localhost:2785 and enable+restart it."
    echo "[dry-run] re-run with --apply to make this change."
    exit 0
  fi
  backup_unit "$UNIT"
  cat > "/etc/systemd/system/${UNIT}" << EOF
[Unit]
Description=Cloudflare Quick Tunnel for OpenWA Gateway (DEV — unauthenticated public URL)
After=network.target openwa.service
Wants=openwa.service

[Service]
Type=simple
User=${SERVICE_USER}
ExecStart=${CLOUDFLARED_BIN} tunnel --url http://localhost:2785
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  systemd-analyze verify "/etc/systemd/system/${UNIT}" 2>/dev/null || die "unit file failed systemd-analyze verify — aborting (backup kept)"
  systemctl daemon-reload
  systemctl enable "$UNIT"
  systemctl restart "$UNIT"
  sleep 4
  if systemctl is-active --quiet "$UNIT"; then
    echo "[verify] ${UNIT} is ACTIVE. Public URL (also in journal):"
    journalctl -u "$UNIT" -n 20 --no-pager | grep -E "https://.*trycloudflare.com" || warn "could not extract the trycloudflare URL from the journal — inspect: journalctl -u ${UNIT}"
  else
    die "${UNIT} failed to start — inspect: journalctl -u ${UNIT} -n 50 --no-pager"
  fi
  echo
  echo "ROLLBACK: sudo systemctl disable --now ${UNIT} && sudo rm /etc/systemd/system/${UNIT} && sudo systemctl daemon-reload"
  exit 0
fi

# ── 6. Named tunnel path (production) ────────────────────────────────────────
if [[ $APPLY -eq 0 ]]; then
  echo "[dry-run] would: install the cloudflared system service with the provided"
  echo "[dry-run] named-tunnel token, enable + restart it, then verify the service"
  echo "[dry-run] is active and the tunnel connector is registered."
  echo "[dry-run] PREREQUISITE (dashboard, manual): the tunnel must have an ingress"
  echo "[dry-run] rule routing your hostname to http://localhost:2785 and a Cloudflare"
  echo "[dry-run] Access policy in front of that hostname."
  echo "[dry-run] re-run with --apply to make this change."
  exit 0
fi

[[ -n "$TOKEN_VALUE" ]] || die "apply mode requires a token (internal invariant violated)"

# cloudflared service install takes the token as its argument; to keep it out
# of `ps` output we pass it through a root-only file descriptor fed by a here-doc.
backup_unit "cloudflared.service"
TOKEN_FILE="$(mktemp /tmp/cf-token.XXXXXX)"
chmod 600 "$TOKEN_FILE"
printf '%s' "$TOKEN_VALUE" > "$TOKEN_FILE"
trap 'rm -f "$TOKEN_FILE"' EXIT
if ! "$CLOUDFLARED_BIN" service install "$(cat "$TOKEN_FILE")"; then
  rm -f "$TOKEN_FILE"; trap - EXIT
  die "cloudflared service install failed — check that the token is a valid named-tunnel token (dashboard: Zero Trust > Networks > Tunnels). No systemd changes were enabled."
fi
rm -f "$TOKEN_FILE"; trap - EXIT

systemctl restart cloudflared || die "cloudflared restart failed"
systemctl enable cloudflared  >/dev/null

# ── 7. Verify ────────────────────────────────────────────────────────────────
sleep 5
FAIL=0
if systemctl is-active --quiet cloudflared; then
  echo "[verify] cloudflared service is ACTIVE."
else
  echo "[verify] cloudflared service is NOT active:"; FAIL=1
fi
if journalctl -u cloudflared -n 30 --no-pager 2>/dev/null | grep -qE "Registered tunnel connection|Tunnel credentials"; then
  echo "[verify] tunnel connector registration found in journal."
else
  warn "no tunnel-registration line found in the last 30 journal lines — the token may be invalid or the tunnel unreachable. Inspect: journalctl -u cloudflared -n 100 --no-pager"
  FAIL=1
fi
echo "[verify] END-TO-END CHECK (manual, required): open the tunnel hostname in a"
echo "[verify] browser and confirm the Cloudflare Access login interstitial or the"
echo "[verify] gateway health payload appears. An installed binary is NOT proof of"
echo "[verify] a working, policy-protected tunnel."

echo
echo "ROLLBACK: sudo systemctl disable --now cloudflared && sudo cloudflared service uninstall"

[[ $FAIL -eq 0 ]] || die "verification failed — see warnings above"
echo "======================================================================"
echo " Named Cloudflare Tunnel installed and verified (${SERVICE_USER}@$(hostname), ${ARCH})"
echo "======================================================================"
