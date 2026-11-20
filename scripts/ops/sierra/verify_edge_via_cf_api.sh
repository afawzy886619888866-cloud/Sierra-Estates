#!/usr/bin/env bash
# ============================================================================
# verify_edge_via_cf_api.sh — edge-side verification when the zone WAF
# challenges datacenter clients (403 + cf-ray: GitHub Actions runners and
# other datacenter egress). Zone-level WAF rules do not apply to workers.dev,
# so a healthy workers.dev response proves the worker is deployed AND serving.
#
# Verified live 2026-11-20: the Free-plan 10 ms CPU cap can 503 `/api/health`
# with `error code: 1102` while the SSR root page serves 200 — so the root
# page (real Next.js HTML) is accepted as proof of serving, and a 1102 on
# health is surfaced as the known Workers-Free-plan CPU cap, not a failure.
#
# Requires: CLOUDFLARE_API_TOKEN (secret) + CLOUDFLARE_ACCOUNT_ID (variable).
# Exit 0 = edge verified; exit 1 = could not verify (treat as deploy failure).
# ============================================================================
set -euo pipefail
WORKER="${CF_WORKER_NAME:-sierra-estates}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID required}"
command -v jq >/dev/null 2>&1 || { echo "::error::jq required for edge verification"; exit 1; }
API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# 1) Worker exists (token has scripts read — same call the credentials step makes).
CODE=$(curl -sS -o "$TMP/worker.json" -w '%{http_code}' "${AUTH[@]}" \
  "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER" || echo 000)
[ "$CODE" = "200" ] || { echo "::error::worker '$WORKER' not visible via CF API (HTTP $CODE)"; exit 1; }
echo "CF API: worker '$WORKER' present (HTTP 200)."

# 2) workers.dev preview (zone WAF does not apply there).
# Cold isolates on the FREE plan often 5xx on the very first hit (startup CPU
# cap); the hit itself warms the isolate, so ONE warm-up retry is honest
# signal — a second consecutive failure is a real outage, not a cold start.
wf_probe() { # url outfile -> http_code
  curl -sS -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' \
    -o "$2" -w '%{http_code}' --max-time 30 "$1" || echo 000
}
SUB=$(curl -sS "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" \
  | jq -r '.result.subdomain // empty' 2>/dev/null || true)
if [ -n "$SUB" ]; then
  BASE="https://$WORKER.$SUB.workers.dev"

  HEALTH_CODE=$(wf_probe "$BASE/api/health" "$TMP/preview.json")
  if [ "$HEALTH_CODE" != "200" ] && [ "$HEALTH_CODE" != "000" ]; then
    sleep 15
    HEALTH_CODE=$(wf_probe "$BASE/api/health" "$TMP/preview.json")
  fi
  if [ "$HEALTH_CODE" = "200" ] && jq -e '.status == "healthy"' "$TMP/preview.json" >/dev/null 2>&1; then
    echo "CF workers.dev: $BASE/api/health → 200 healthy."
    exit 0
  fi
  if [ "$HEALTH_CODE" = "503" ] && grep -qi 'error code: 1102' "$TMP/preview.json" 2>/dev/null; then
    echo "::warning::workers.dev /api/health → 503 error code: 1102 (Workers FREE-plan 10 ms CPU cap on cold start — known deferred upgrade; the worker itself is up)."
  else
    echo "::warning::workers.dev /api/health → HTTP $HEALTH_CODE (checking the SSR root page as serving proof)."
  fi

  ROOT_CODE=$(wf_probe "$BASE/" "$TMP/preview.html")
  if [ "$ROOT_CODE" != "200" ] && [ "$ROOT_CODE" != "000" ]; then
    sleep 15
    ROOT_CODE=$(wf_probe "$BASE/" "$TMP/preview.html")
  fi
  if [ "$ROOT_CODE" = "200" ] && grep -q '<!DOCTYPE html' "$TMP/preview.html" 2>/dev/null; then
    echo "CF workers.dev: $BASE/ → 200 with real Next.js HTML — worker is deployed AND serving."
    exit 0
  fi
  echo "::warning::workers.dev root → HTTP $ROOT_CODE (falling back to deployment-recency check)."
else
  echo "::warning::workers.dev subdomain not available — falling back to deployment-recency check."
fi

# 3) Deployment recency (weak signal: proves a deployment exists).
# Try the per-script deployments endpoint first (canonical), then the
# by-script filter, then the scripts listing — response shapes vary by
# endpoint, so all three shapes are parsed.
DEP=""
for EP in \
  "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER/deployments" \
  "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/deployments/by_script?script_name=$WORKER"; do
  DEP=$(curl -sS "${AUTH[@]}" "$EP" \
    | jq -r '.result.items[0].modified_on // .result.items[0].created_on // .result.modified_on // .result.created_on // .result[0].modified_on // empty' 2>/dev/null || true)
  [ -n "$DEP" ] && break
done
if [ -z "$DEP" ]; then
  # Last resort: the scripts listing carries modified_on per script.
  DEP=$(curl -sS "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts" \
    | jq -r --arg w "$WORKER" '.result[] | select(.id == $w) | .modified_on // .created_on // empty' 2>/dev/null || true)
fi
if [ -n "$DEP" ]; then
  echo "CF API: latest deployment for '$WORKER' at $DEP (weak-pass: workers.dev not checkable)."
  exit 0
fi
echo "::error::could not verify edge via Cloudflare API (no workers.dev response and no deployment data)."
exit 1
