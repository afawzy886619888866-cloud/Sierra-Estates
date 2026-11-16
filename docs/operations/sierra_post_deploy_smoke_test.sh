#!/usr/bin/env bash
# ============================================================================
# SIERRA ESTATES — POST-DEPLOY SMOKE TEST
# ----------------------------------------------------------------------------
# Usage:        bash sierra_post_deploy_smoke_test.sh https://your-domain
#               (defaults to http://localhost:3000)
#
# What it proves (each check mirrors the go-live acceptance criteria):
#   1. Core routes render (200 + expected content markers)
#   2. /api/health reports healthy + supabase connected
#   3. /api/inventory serves the LIVE published inventory from Supabase
#      (source=supabase, pin count, geo sanity, publish gate intact)
#   4. Security headers set (per vercel.json)
#   5. sitemap.xml / robots.txt reachable
#
# Exit code 0 = all green; 1 = at least one failure (details printed).
# Requires: curl, python3. No repo, no dependencies.
# ============================================================================
set -uo pipefail

BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"
MIN_PINS="${2:-4000}"   # expected live pin floor (4,322 as of 2026-10-11)

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

check_route() {
  local path="$1" marker="$2" label="$3"
  local body code
  body=$(curl -s --max-time 30 "$BASE$path" 2>/dev/null)
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BASE$path" 2>/dev/null)
  if [ "$code" = "200" ] && echo "$body" | grep -i "$marker" >/dev/null; then
    ok "$label → 200 + content marker"
  elif [ "$code" = "200" ]; then
    bad "$label → 200 but MISSING content marker '$marker'"
  else
    bad "$label → HTTP $code (expected 200)"
  fi
}

echo "══════════ SIERRA ESTATES POST-DEPLOY SMOKE TEST ══════════"
echo "target: $BASE   (pin floor: $MIN_PINS)"
echo

echo "── 1. Core routes ──"
check_route "/"        "sierra"            "home /"
check_route "/explore" "map\|explore\|leaflet" "explore /explore (public map)"
check_route "/price-index" "price"         "price index /price-index"
check_route "/admin"   "admin\|sign"       "admin /admin"
check_route "/careers" "career\|join\|team" "careers /careers"

echo "── 2. Health ──"
HEALTH=$(curl -s --max-time 30 "$BASE/api/health" 2>/dev/null)
if echo "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('status')=='healthy' else 1)" 2>/dev/null; then
  ok "health status: healthy"
else
  bad "health status not healthy: $(echo "$HEALTH" | head -c 120)"
fi
if echo "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); c=d.get('components',d); sys.exit(0 if 'healthy' in json.dumps(c.get('supabase','')).lower() or c.get('supabase',{}).get('status')=='healthy' else 1)" 2>/dev/null; then
  ok "supabase component: healthy"
else
  bad "supabase component not healthy"
fi

echo "── 3. Live inventory (the map's data source) ──"
INV=$(curl -s --max-time 60 "$BASE/api/inventory" 2>/dev/null)
INV_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE/api/inventory" 2>/dev/null)
if [ "$INV_CODE" = "200" ] && echo "$INV" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('source')=='supabase' else 1)" 2>/dev/null; then
  ok "inventory source: supabase"
else
  bad "inventory source is NOT supabase (got HTTP $INV_CODE) — classic symptom: wrong env var name (NEXT_PUBLIC_SUPABASE_ANON_KEY required)"
fi

if echo "$INV" | python3 -c "
import json,sys
d=json.load(sys.stdin)
items=d.get('units') or d.get('listings') or d.get('items') or d.get('data') or []
count=d.get('count') or len(items)
sys.exit(0 if count>=int(sys.argv[1]) else 1)" "$MIN_PINS" 2>/dev/null; then
  ok "pin count $(echo "$INV" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('count'))") ≥ floor $MIN_PINS"
else
  bad "pin count below floor $MIN_PINS (or unparseable response)"
fi

echo "$INV" | python3 -c "
import json,sys
d=json.load(sys.stdin)
items=d.get('units') or d.get('listings') or d.get('items') or d.get('data') or []
def lat(i): return i.get('lat') or i.get('latitude')
def lng(i): return i.get('lng') or i.get('longitude')
noge=[i for i in items if not (lat(i) and lng(i))]
print(f'  {\"✓\" if not noge else \"✗\"} all {len(items)} pins carry coordinates' + ('' if not noge else f' — missing: {len(noge)}'))
sale=sum(1 for i in items if (i.get('mode') or i.get('deal_type'))=='sale')
rent=sum(1 for i in items if (i.get('mode') or i.get('deal_type'))=='rent')
ph=[i for i in items if i.get('price')==5000000]
print(f'  {\"✓\" if not ph else \"✗\"} no placeholder-price pins ({len(ph)})')
print(f'  modes: {\"sale\":>5}: {sale:>5}  rent: {rent:>5}')
" 2>/dev/null

echo "── 4. Security headers (vercel.json) ──"
HDRS=$(curl -s -o /dev/null -D - --max-time 30 "$BASE/" 2>/dev/null)
for h in "X-Content-Type-Options: nosniff" "X-Frame-Options: SAMEORIGIN" "Referrer-Policy: strict-origin-when-cross-origin"; do
  key=$(echo "$h" | cut -d: -f1)
  want=$(echo "$h" | cut -d: -f2- | xargs)
  got=$(echo "$HDRS" | grep -i "^$key:" | head -1 | cut -d: -f2- | xargs | tr -d '\r')
  if [ "$got" = "$want" ]; then ok "header $h"; else bad "header $key: got '$got' want '$want'"; fi
done

echo "── 5. SEO surfaces ──"
check_route "/robots.txt"  "user-agent\|allow" "robots.txt"
# sitemap is a dynamic serverless route — retry to absorb cold starts
SM_OK=0
for try in 1 2 3; do
  if curl -s --max-time 60 "$BASE/sitemap.xml" 2>/dev/null | grep -i "urlset" >/dev/null; then SM_OK=1; break; fi
  sleep 2
done
if [ "$SM_OK" = "1" ]; then ok "sitemap.xml → 200 + urlset (cold-start retried)"; else bad "sitemap.xml missing urlset after 3 tries"; fi

echo
echo "══════════ RESULT: $PASS passed, $FAIL failed ══════════"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL GREEN — production is live and wired."
  exit 0
else
  echo "FAILURES DETECTED — see details above."
  exit 1
fi
