#!/usr/bin/env bash
# ============================================================================
# Sierra Estates — PRODUCTION SMOKE TEST (production edition, 15 checks)
# Target: https://sierra-estates.net (+ admin.sierra-estates.net)
# Rebuilt 2026-10-12 after sandbox wipe. Known pitfalls encoded below:
#   [P1] /api/inventory items live under `units[]`, coords under `lat`/`lng`
#   [P2] `set -o pipefail` + `curl | grep -q` races (SIGPIPE/141) — every
#        response is saved to a temp file FIRST, then inspected
#   [P3] sitemap.xml is dynamically rendered — cold starts can 5xx; retry x3
# Usage: ./smoke_production.sh [BASE_URL] [ADMIN_URL]
# Exit code = number of failed checks (0 = all green)
# ============================================================================
set -uo pipefail
export PYTHONUTF8=1

BASE_URL="${1:-https://sierra-estates.net}"
ADMIN_URL="${2:-https://admin.sierra-estates.net}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0; FAIL=0; FAILED_NAMES=()

ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); FAILED_NAMES+=("$1"); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }
note() { printf '  \033[2m·····\033[0m %s\n' "$1"; }

http_code() { # url outfile -> prints code
  curl -s -o "$2" -w '%{http_code}' -L --max-time 30 "$1" 2>/dev/null
}

echo "================================================================"
echo " Sierra Estates production smoke — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo " client: $BASE_URL   admin: $ADMIN_URL"
echo "================================================================"

# --- 1-4: core public pages ------------------------------------------------
for path in "/" "/explore" "/properties" "/compounds"; do
  code=$(http_code "$BASE_URL$path" "$TMP/page.html")
  if [ "$code" = "200" ]; then ok "GET $path → 200"; else bad "GET $path → $code (want 200)"; fi
done

# --- 5: property detail page (dynamic id from live inventory) ---------------
INV="$TMP/inventory.json"
code=$(http_code "$BASE_URL/api/inventory" "$INV")
# --- 6: /api/inventory reachable + valid JSON -------------------------------
if [ "$code" = "200" ] && python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$INV" 2>/dev/null; then
  ok "GET /api/inventory → 200 + valid JSON"
else
  bad "GET /api/inventory → $code / invalid JSON"
fi

if [ -s "$INV" ]; then
  # --- 7: inventory source is the live database ------------------------------
  src=$(python3 -c "import json;print(json.load(open('$INV')).get('source',''))" 2>/dev/null)
  [ "$src" = "supabase" ] && ok "inventory.source == 'supabase'" || bad "inventory.source == '$src' (want supabase)"

  # --- 8: live pin count ------------------------------------------------------
  cnt=$(python3 -c "import json;print(json.load(open('$INV')).get('count',0))" 2>/dev/null)
  if [ "${cnt:-0}" -ge 4000 ] 2>/dev/null; then ok "live pins on map: $cnt (>= 4000)"; else bad "live pins: $cnt (< 4000)"; fi

  # --- 9-11: data-quality gates (P1: items under units[], coords lat/lng) -----
  dq=$(python3 - "$INV" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
units = d.get("units") or []
n = len(units)
geo  = sum(1 for u in units if u.get("lat") not in (None, "", 0) and u.get("lng") not in (None, "", 0))
prc  = sum(1 for u in units if u.get("price") not in (None, "", 0))
stub = sum(1 for u in units if str(u.get("price")) in ("999", "5000000"))
sale_cheap = sum(1 for u in units if u.get("mode") in ("sale", "buy", "resale") and 0 < float(u.get("price") or 0) < 100000)
print(f"{n} {geo} {prc} {stub} {sale_cheap}")
PY
)
  read -r n geo prc stub salecheap <<< "$dq"
  [ "${n:-0}" -gt 0 ] && [ "$geo" = "$n" ]  && ok "geocoded pins: $geo/$n (100%)"  || bad "geocoded pins: $geo/$n"
  [ "${n:-0}" -gt 0 ] && [ "$prc" = "$n" ]  && ok "priced units:   $prc/$n (100%)"  || bad "priced units: $prc/$n"
  if [ "${stub:-X}" = "0" ] && [ "${salecheap:-X}" = "0" ]; then
    ok "placeholder prices: 0 (no 999 rent / 5M stub / <100k sale)"
  else
    bad "placeholder prices: $stub stub + $salecheap suspicious-sale"
  fi

  # --- 5 (deferred): property detail page -------------------------------------
  pid=$(python3 -c "import json;us=json.load(open('$INV')).get('units') or [];print(us[0]['id'] if us else '')" 2>/dev/null)
  if [ -n "$pid" ]; then
    code=$(http_code "$BASE_URL/property/$pid" "$TMP/detail.html")
    [ "$code" = "200" ] && ok "GET /property/<live-id> → 200" || bad "GET /property/$pid → $code"
  else
    bad "no live property id available for detail-page check"
  fi
else
  bad "inventory body empty — skipping derived checks"
fi

# --- 12: /api/health ---------------------------------------------------------
code=$(http_code "$BASE_URL/api/health" "$TMP/health.json")
if [ "$code" = "200" ] && python3 - "$TMP/health.json" <<'PY'
import json, sys
h = json.load(open(sys.argv[1]))
assert h.get("status") == "healthy", h.get("status")
assert (h.get("components") or {}).get("supabase", {}).get("status") == "healthy"
PY
then ok "/api/health → healthy (supabase connected)"; else bad "/api/health → $code or unhealthy"; fi

# --- 13: robots.txt ------------------------------------------------------------
code=$(http_code "$BASE_URL/robots.txt" "$TMP/robots.txt")
[ "$code" = "200" ] && ok "GET /robots.txt → 200" || bad "GET /robots.txt → $code"

# --- 14: sitemap.xml (P3: dynamic render, retry on cold start) -----------------
sm_ok=0
for attempt in 1 2 3; do
  code=$(http_code "$BASE_URL/sitemap.xml" "$TMP/sitemap.xml")
  if [ "$code" = "200" ] && grep -q '<urlset' "$TMP/sitemap.xml"; then sm_ok=1; note "sitemap attempt $attempt → 200"; break; fi
  note "sitemap attempt $attempt → $code, retrying in 5s…"; sleep 5
done
[ "$sm_ok" = "1" ] && ok "GET /sitemap.xml → 200 + <urlset> (attempt $attempt)" || bad "GET /sitemap.xml → $code after 3 attempts"

# --- 15: admin surface ----------------------------------------------------------
code=$(http_code "$ADMIN_URL/" "$TMP/admin.html")
[ "$code" = "200" ] && ok "GET admin host / → 200" || bad "GET admin host / → $code"

# --- summary ---------------------------------------------------------------------
TOTAL=$((PASS+FAIL))
echo "================================================================"
if [ "$FAIL" -eq 0 ]; then
  printf ' RESULT: \033[32m%s/%s ALL GREEN\033[0m\n' "$PASS" "$TOTAL"
else
  printf ' RESULT: \033[31m%s failed\033[0m of %s:\n' "$FAIL" "$TOTAL"
  for f in "${FAILED_NAMES[@]}"; do echo "   ✗ $f"; done
fi
echo "================================================================"
exit "$FAIL"
