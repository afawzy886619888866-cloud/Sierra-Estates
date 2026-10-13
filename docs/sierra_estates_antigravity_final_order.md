# FINAL ORDER FOR ANTIGRAVITY — Sierra Estates: Seal & Operate

> Paste everything below this line into Google Antigravity as a single task.
> It is fully self-contained. Do NOT paste secrets into the chat — when the
> agent asks for the new key, type it into a file on disk instead.
> (Written 2026-10-12. This is the closing order: the go-live mission from the
> previous order doc is DONE and verified.)

---

## CONTEXT — WHAT IS ALREADY DONE (do not redo)

Sierra Estates went LIVE on 2026-10-11 and has been verified green repeatedly
since (15/15 production smoke checks, browser-tested, 4,322 live map pins):

- **Client**: https://sierra-estates.net — **Admin**: https://admin.sierra-estates.net
- Deployment: Vercel auto-deploy from GitHub `main` (push = deploy)
- `main` HEAD at last audit: `e2530d9a` (docs commit; prior `178bac90` = PR #307)
- The full test suite (1,524 tests), production build, and quality gates were
  all green at go-live; PRs #298–#307 merged after with no regressions.

Do NOT re-implement the app, re-run the big test suite, or touch the deploy
pipeline. This order is about the four remaining closure tasks.

## KEY FACTS (verified 2026-10-12)

- **Repo**: `https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git`
  — **PUBLIC** (`"private": false`). Default branch `main`.
  Monorepo, pnpm workspaces, app at `apps/sierra-estates-realty`.
- **Supabase** (sole backend): `https://gaxfqcietzoonlmatiot.supabase.co`,
  project id `gaxfqcietzoonlmatiot`. Storage: `property-media` (public),
  `media` (private).
- **Vercel**: org `team_UvdJ5ezVTaqEKyhqZ5QVqOKJ`; client project `prj_ieVc…`;
  admin project `prj_inhT…` (find exact ids with `vercel project ls`).
- **DB state**: `listings` = 15,994 total / 9,435 `status='active'` /
  4,502 `publish_status='PUBLISHABLE'` (what the public map serves, 4,322 pins
  after geo/compound filters) / 4,933 active-but-unpublished enrichment queue.
- **Env var trap**: server client `packages/db/lib/supabase.ts` reads
  `SUPABASE_SERVICE_ROLE_KEY` and fails CLOSED. Browser client reads
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (classic name — NOT the publishable key's
  new name). A wrong name does not error: `/api/inventory` silently returns
  `source:"none"` and the map goes blank. First debugging step is always:
  `curl -s https://sierra-estates.net/api/inventory | head -c 120` → check
  `"source":"supabase"`.
- **§21 no-fabrication rule (project law)**: missing data stays missing. Never
  invent prices, coords, descriptions, or defaults. Guard rejections
  (rent-level price on a sale listing, 999 rent, `file://` photos) are
  FEATURES. Unverified rows stay `REVIEW_REQUIRED` until a human fills them.
- **REST pagination trap**: Supabase PostgREST caps responses at 1,000 rows
  by default. Any full-table operation MUST paginate with `Range` headers
  (`Prefer: count=exact` on the first request to learn the total).

## SECURITY INCIDENT — THE REASON MISSION 1 EXISTS

Two service-level credentials are exposed and were both **confirmed still
active via read-only probes on 2026-10-12**:

1. 🔴 **Legacy `service_role` JWT** (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…`).
   It was hard-coded in
   `apps/sierra-estates-realty/__tests__/supabase-storage-and-vercel-resilience.test.ts`
   (and the repo-root twin) and committed to the **public** repo. Commit
   `178bac90` (PR #307, 2026-10-12) removed it from HEAD, but it remains
   recoverable from git history forever. It bypasses ALL RLS. Anyone who
   clones the repo currently has full read/write to the database.
2. 🟠 **New-format secret key** `sb_secret_5rAj…` — exposed in a chat log
   (and in a local `se.env`). Same privilege tier via the REST API.

Both must be rotated. Rotation itself can ONLY be done by the human in the
Supabase dashboard (Management API needs an `sbp_` PAT we do not have):
**Settings → API Keys → Legacy API keys tab → rotate the legacy secret**,
and **New API keys tab → rotate `sb_secret_…`**.

---

## MISSION 1 — COMPLETE THE CREDENTIAL ROTATION (URGENT, ~15 MIN)

**Precondition**: the human has clicked Rotate for BOTH keys in the Supabase
dashboard and has the new `sb_secret_…` value available.

1. Ask the human to paste the NEW secret key into a local file
   (e.g. `scripts/se.env` as `SUPABASE_SECRET_KEY=…`, chmod 600, git-ignored —
   never into the chat).
2. Verify the old keys are dead (expect HTTP 401 now):
   `curl -s -o /dev/null -w '%{http_code}' -H "apikey: <OLD-KEY>" \
     https://gaxfqcietzoonlmatiot.supabase.co/rest/v1/listings?select=id&limit=1`
   Do the same for the legacy JWT (it is in git history — extract it with
   `git show 178bac90^:apps/sierra-estates-realty/__tests__/supabase-storage-and-vercel-resilience.test.ts`).
   **401 on both old credentials = success.**
3. Update `SUPABASE_SERVICE_ROLE_KEY` on BOTH Vercel projects (client + admin)
   using `vercel env` / the dashboard, then **redeploy both projects**
   (`vercel deploy --prod` or Redeploy button — auto-deploy from git will NOT
   fire because no code changed).
4. Post-rotation verification, in order:
   - `curl -s https://sierra-estates.net/api/inventory | head -c 120` →
     must still say `"source":"supabase"` and `"count":4322`-ish
   - `curl -s https://sierra-estates.net/api/health` → `"status":"healthy"`
   - If the map breaks: it is the env-var-name trap above. Check the value
     actually landed in both projects and a fresh deployment is serving it.

## MISSION 2 — COMMIT THE OPS TOOLKIT INTO THE REPO (~20 MIN)

Four battle-tested operational scripts currently exist ONLY on an ephemeral
agent sandbox. Commit them so they survive forever (full sources in the
APPENDICES below):

```
scripts/ops/sierra/README.md            ← operating manual (write from §RUNBOOK below)
scripts/ops/sierra/smoke_production.sh  ← APPENDIX A
scripts/ops/sierra/generate_worklist.py ← APPENDIX B
scripts/ops/sierra/apply_enrichment.py  ← APPENDIX C
scripts/ops/sierra/recheck_and_publish.py ← APPENDIX D
```

- Make `smoke_production.sh` executable (`chmod +x`) and add a
  `__tests__/ops-toolkit.test.ts` following the repo's existing test style:
  verify scripts exist, are non-empty, contain no hardcoded secrets
  (regex-scan for `sb_secret_` / `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`),
  and that `generate_worklist.py` compiles (`python3 -m py_compile`).
- One PR titled `ops(toolkit): production smoke + enrichment workflow scripts`.
  Description must state the security context (JWT incident) and that no
  secrets are included.

## MISSION 3 — DAILY SMOKE GUARD, GITHUB ACTIONS (~10 MIN)

Add `.github/workflows/production-smoke.yml`: daily at 07:00 UTC, runs the
15 public checks (no secrets — the script only needs `curl` + `python3`):

```yaml
name: production-smoke
on:
  schedule: [{cron: "0 7 * * *"}]
  workflow_dispatch: {}
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/ops/sierra/smoke_production.sh
```

If the script exits non-zero the job fails and GitHub emails the owner.
(Keep it public-only: do NOT add Supabase keys to Actions for this.)

## MISSION 4 — OPTIONAL: PURGE THE JWT FROM GIT HISTORY

Only attempt AFTER Mission 1 confirms the old JWT returns 401 (then the
history scrub is cosmetic, not urgent). Use `git filter-repo` to replace the
JWT string across all history, force-push, and note that every collaborator
must re-clone. Given rotation already neutralizes the credential, skipping
this mission entirely is a legitimate decision — recommend skipping unless
compliance requires it.

## GUARDRAILS — NEVER DO THESE

- Never write any key/secret into a commit, PR body, or chat output.
- Never bulk-change `publish_status` on listings (the 4,502 PUBLISHABLE rows
  are the verified public inventory; mass-unpublishing breaks the live map).
- Never fabricate data to make guards pass — blank stays blank (§21).
- Never run `apply_enrichment.py --apply` / `recheck_and_publish.py --apply`
  with invented values; those scripts exist for HUMAN-supplied data only.
- Never run schema migrations ad hoc; the repo's migration ledger + the
  fail-closed `/api/cron/apply-migrations` route is the only path.

## VERIFICATION CHECKLIST (do at the end, report all results)

1. Old `sb_secret_…` key → HTTP 401
2. Old legacy JWT → HTTP 401
3. New key REST read works (200)
4. `https://sierra-estates.net/api/inventory` → `"source":"supabase"`, count ≈ 4,322
5. `https://sierra-estates.net/api/health` → healthy
6. `bash scripts/ops/sierra/smoke_production.sh` → 15/15
7. `python3 scripts/ops/sierra/recheck_and_publish.py` (dry-run) → 4,933 queue rows
8. Toolkit PR merged to `main`, Vercel deployed it, smoke still 15/15
9. GHA workflow file present and manually dispatched once (green)

## §RUNBOOK (source for scripts/ops/sierra/README.md)

- Daily 2-min check: run `smoke_production.sh` (needs only curl + python3,
  no credentials). All green = done for the day.
- Enrichment loop (turning the 4,933 queue into sellable inventory):
  `generate_worklist.py` → human fills `new_*` columns in Excel/Sheets
  (only values they actually know; 70.3% of rows already carry a phone) →
  `apply_enrichment.py worklist.csv` (dry-run review) → `--apply` (writes +
  audit_logs rows, action `enrichment.apply`) → `recheck_and_publish.py`
  (dry-run) → `--apply` (12-field gate; passing rows become PUBLISHABLE and
  appear on the live map immediately).
- Queue defect groups (mutually exclusive, verified 2026-10-12):
  no_price 3,834 / stub_5m 423 / rent_level_on_sale 242 / rent_anomaly 5 /
  no_coords 17 / incomplete_fields 412.
- Rollback of an accidental publish batch:
  `PATCH /rest/v1/listings?publish_status=eq.PUBLISHABLE` with body
  `{"publish_status":"REVIEW_REQUIRED"}` (single request, reversible).
- Enrichment audit trail: `audit_logs` rows with actor
  `sierra-enrichment-workflow`; the `before` field is the pre-change snapshot.

---

# APPENDIX A — scripts/ops/sierra/smoke_production.sh

```bash
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
```


# APPENDIX B — scripts/ops/sierra/generate_worklist.py

```python
#!/usr/bin/env python3
# ============================================================================
# generate_worklist.py — Sierra Estates enrichment queue → daily worklist CSV
# ----------------------------------------------------------------------------
# Queue = listings with status='active' AND publish_status != 'PUBLISHABLE'
# (the rows that CANNOT go on the public map yet — §21 no-fabrication: they
# stay unpublished until a human supplies real values).
#
# Each queue row is assigned exactly ONE priority defect group:
#   1. no_price            price is NULL/0
#   2. stub_5m             price == 5,000,000 (known placeholder pattern)
#   3. rent_level_on_sale  sale/resale/primary with 0 < price < 100,000
#                          (a monthly-rent number attached to a sale listing)
#   4. rent_anomaly        rent with 0 < price <= 999
#   5. no_coords           priced but latitude/longitude NULL
#   6. incomplete_fields   priced + geocoded but missing description/photos/
#                          bedrooms/bathrooms/area/code
#
# Output CSV carries current values (read-only reference) + empty `new_*`
# fill columns. Fill ONLY what you actually know — blanks are preserved
# (never invented). Then run apply_enrichment.py.
#
# Usage:
#   python3 generate_worklist.py [--out worklist_YYYY-MM-DD.csv]
# Credentials: SUPABASE_URL + SUPABASE_SECRET_KEY env vars, or an
# adjacent se.env file (SUPABASE_URL=... / SUPABASE_SECRET_KEY=...).
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

PAGE = 1000  # Supabase default max-rows silently truncates — always paginate


def load_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        here = os.path.dirname(os.path.abspath(__file__))
        for cand in ("se.env", "../scripts/se.env"):
            p = os.path.join(here, cand)
            if os.path.exists(p):
                for line in open(p, encoding="utf-8"):
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
                url = os.environ.get("SUPABASE_URL")
                key = os.environ.get("SUPABASE_SECRET_KEY")
                break
    if not url or not key:
        sys.exit("ERROR: set SUPABASE_URL / SUPABASE_SECRET_KEY (env or se.env)")
    return url.rstrip("/"), key


def api(base, key, path, range_header=None, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "count=exact" if range_header is None else "return=minimal",
        },
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    if range_header:
        req.add_header("Range", range_header)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
        cr = r.headers.get("Content-Range") or ""
        return (json.loads(raw) if raw else []), cr


def fetch_queue(base, key):
    sel = ",".join([
        "id", "ref_id", "code", "unit_code", "title", "compound",
        "location_area", "city", "deal_type", "property_type", "price",
        "price_currency", "bedrooms", "bathrooms", "area_sqm", "latitude",
        "longitude", "description", "images", "photo_count", "owner_name",
        "owner_phone", "broker_name", "broker_phone", "sync_source",
        "created_at",
    ])
    path = (f"listings?select={sel}&status=eq.active"
            "&publish_status=neq.PUBLISHABLE&order=created_at.desc")
    rows, cr = api(base, key, path)
    total = int(cr.split("/")[-1]) if cr and "/" in cr else len(rows)
    all_rows = list(rows)
    while len(all_rows) < total:  # paginate past the 1000-row silent cap
        lo, hi = len(all_rows), len(all_rows) + PAGE - 1
        page, _ = api(base, key, path, range_header=f"{lo}-{hi}")
        if not page:
            break
        all_rows.extend(page)
    return all_rows, total


def num(v):
    return float(v) if v not in (None, "") else None


def classify(r):
    price = num(r.get("price"))
    deal = (r.get("deal_type") or "").lower()
    lat, lng = num(r.get("latitude")), num(r.get("longitude"))
    has_desc = bool((r.get("description") or "").strip())
    n_img = len(r.get("images") or []) or (r.get("photo_count") or 0)
    if price is None or price == 0:
        return "no_price", "price is NULL/0"
    if price == 5000000:
        return "stub_5m", "price == 5,000,000 placeholder"
    if deal in ("sale", "resale", "primary") and 0 < price < 100000:
        return "rent_level_on_sale", f"sale listing priced at rent level ({price:,.0f}/mo?)"
    if deal == "rent" and 0 < price <= 999:
        return "rent_anomaly", f"rent price <= 999 ({price:,.0f})"
    if lat is None or lng is None:
        return "no_coords", "priced but missing latitude/longitude"
    missing = []
    if not has_desc:
        missing.append("description")
    if not n_img:
        missing.append("photos")
    if not (r.get("bedrooms") or 0):
        missing.append("bedrooms")
    if not (r.get("bathrooms") or 0):
        missing.append("bathrooms")
    if not num(r.get("area_sqm")):
        missing.append("area_sqm")
    if not (r.get("code") or r.get("unit_code") or r.get("ref_id")):
        missing.append("code")
    return "incomplete_fields", "missing: " + ",".join(missing)


CSV_META = [
    "defect_group", "defect_detail", "id", "ref_id", "code", "title",
    "compound", "location_area", "deal_type", "property_type", "price",
    "bedrooms", "bathrooms", "area_sqm", "latitude", "longitude",
    "desc_preview", "photo_count", "owner_name", "owner_phone",
    "broker_name", "broker_phone", "sync_source",
]
CSV_FILL = [
    "new_price", "new_deal_type", "new_property_type", "new_bedrooms",
    "new_bathrooms", "new_area_sqm", "new_latitude", "new_longitude",
    "new_description", "new_image_urls", "new_owner_name", "new_owner_phone",
    "new_broker_name", "new_broker_phone", "notes",
]


def main():
    ap = argparse.ArgumentParser(
        description="Sierra Estates enrichment queue → daily worklist CSV")
    ap.add_argument("--out", default=None, help="output CSV path")
    args = ap.parse_args()
    base, key = load_env()
    out = args.out or dt.date.today().strftime("worklist_%Y-%m-%d.csv")

    rows, total = fetch_queue(base, key)
    if len(rows) != total:
        print(f"WARN: fetched {len(rows)} of {total} (pagination issue)")

    groups = {}
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(CSV_META + CSV_FILL)
        for r in rows:
            g, d = classify(r)
            groups[g] = groups.get(g, 0) + 1
            desc = (r.get("description") or "").strip().replace("\n", " ")
            w.writerow([
                g, d, r.get("id"), r.get("ref_id"), r.get("code") or r.get("unit_code"),
                (r.get("title") or "")[:80], r.get("compound"),
                r.get("location_area") or r.get("city"), r.get("deal_type"),
                r.get("property_type"), r.get("price"), r.get("bedrooms"),
                r.get("bathrooms"), r.get("area_sqm"), r.get("latitude"),
                r.get("longitude"), desc[:80],
                len(r.get("images") or []) or r.get("photo_count") or 0,
                r.get("owner_name"), r.get("owner_phone"),
                r.get("broker_name"), r.get("broker_phone"),
                r.get("sync_source"),
            ] + [""] * len(CSV_FILL))

    n_contact = sum(1 for r in rows if r.get("owner_phone") or r.get("broker_phone"))
    print(f"\nWorklist written: {out}")
    print(f"Queue rows: {len(rows)} (DB reports {total})")
    print("\nDefect groups (priority-ordered, mutually exclusive):")
    for g in ("no_price", "stub_5m", "rent_level_on_sale", "rent_anomaly",
              "no_coords", "incomplete_fields"):
        print(f"  {g:20s} {groups.get(g, 0):>6,}")
    print(f"  {'TOTAL':20s} {len(rows):>6,}")
    print(f"\nRows already carrying a phone contact: {n_contact} "
          f"({100.0 * n_contact / max(len(rows), 1):.1f}%) — verify/correct in new_* columns")
    print("\nNext: fill new_* columns for what you KNOW, then run apply_enrichment.py")


if __name__ == "__main__":
    main()
```


# APPENDIX C — scripts/ops/sierra/apply_enrichment.py

```python
#!/usr/bin/env python3
# ============================================================================
# apply_enrichment.py — apply human-filled new_* columns to the live database
# ----------------------------------------------------------------------------
# Reads the worklist CSV produced by generate_worklist.py. For every row where
# at least one `new_*` column is filled, validates the fill against the
# anti-fabrication guards, then (with --apply) PATCHes the listing and writes
# an audit_logs row. WITHOUT --apply it is a pure dry-run: ZERO writes.
#
# GUARDS (§21 no-fabrication — rejecting a fill is the system working):
#   G1  new_price must parse to a positive number
#   G2  deal rent            : 1,000 <= price <= 500,000  (EGP/month)
#   G3  deal sale/resale/etc.: price >= 100,000            (45,000 = rent
#                               level on a sale listing -> REJECTED)
#                               price <= 500,000,000 sanity ceiling
#   G4  price == 5,000,000 on a stub_5m row -> REJECTED unless notes contains
#       '5m-confirmed' (it is the known placeholder pattern)
#   G5  rent price <= 999 -> REJECTED (placeholder pattern)
#   G6  new_latitude  in 22.0..31.6, new_longitude in 24.0..37.0 (Egypt bounds)
#   G7  new_image_urls: http(s):// only — file:// or bare paths REJECTED
#   G8  new_description: >= 20 non-space characters
#   G9  new_deal_type in {sale, rent, resale, primary}
#   G10 numeric columns (bedrooms/bathrooms/area_sqm) must parse clean
#
# Usage:
#   python3 apply_enrichment.py worklist_2026-10-12.csv           # dry-run
#   python3 apply_enrichment.py worklist_2026-10-12.csv --apply   # write
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

FILLABLE = {
    "new_price": ("price", "float"),
    "new_deal_type": ("deal_type", "deal"),
    "new_property_type": ("property_type", "str"),
    "new_bedrooms": ("bedrooms", "int"),
    "new_bathrooms": ("bathrooms", "int"),
    "new_area_sqm": ("area_sqm", "float"),
    "new_latitude": ("latitude", "float"),
    "new_longitude": ("longitude", "float"),
    "new_description": ("description", "str"),
    "new_image_urls": ("images", "images"),
    "new_owner_name": ("owner_name", "str"),
    "new_owner_phone": ("owner_phone", "str"),
    "new_broker_name": ("broker_name", "str"),
    "new_broker_phone": ("broker_phone", "str"),
}
DEALS = {"sale", "rent", "resale", "primary"}


def load_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        here = os.path.dirname(os.path.abspath(__file__))
        for cand in ("se.env", "../scripts/se.env"):
            p = os.path.join(here, cand)
            if os.path.exists(p):
                for line in open(p, encoding="utf-8"):
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
                url = os.environ.get("SUPABASE_URL")
                key = os.environ.get("SUPABASE_SECRET_KEY")
                break
    if not url or not key:
        sys.exit("ERROR: set SUPABASE_URL / SUPABASE_SECRET_KEY (env or se.env)")
    return url.rstrip("/"), key


def api(base, key, path, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" if method == "GET" else "return=minimal",
        },
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else []


def parse_val(col, raw, row):
    """Validate one fill. Returns (ok, value_or_reason)."""
    kind = FILLABLE[col][1]
    s = (raw or "").strip()
    if kind == "float":
        try:
            v = float(s.replace(",", ""))
        except ValueError:
            return False, f"{col}: not a number ({s!r})"
        if col == "new_price":
            if v <= 0:
                return False, "new_price must be positive"
            deal = (row.get("new_deal_type") or row.get("deal_type") or "").strip().lower()
            if deal == "rent":
                if v <= 999:
                    return False, f"rent price {v:,.0f} <= 999 (placeholder pattern)"
                if v > 500000:
                    return False, f"rent price {v:,.0f} > 500,000/month (sale level?)"
            elif deal in DEALS:
                if v < 100000:
                    return False, (f"sale price {v:,.0f} < 100,000 — looks like a "
                                   f"monthly rent on a sale listing")
                if v > 500000000:
                    return False, f"sale price {v:,.0f} above 500M sanity ceiling"
            if v == 5000000 and row.get("defect_group") == "stub_5m":
                if "5m-confirmed" not in (row.get("notes") or "").lower():
                    return False, ("price 5,000,000 equals the stub pattern — put "
                                   "'5m-confirmed' in notes if genuinely 5M")
        if col == "new_latitude" and not (22.0 <= v <= 31.6):
            return False, f"latitude {v} outside Egypt bounds 22.0..31.6"
        if col == "new_longitude" and not (24.0 <= v <= 37.0):
            return False, f"longitude {v} outside Egypt bounds 24.0..37.0"
        return True, v
    if kind == "int":
        try:
            v = int(float(s))
        except ValueError:
            return False, f"{col}: not an integer ({s!r})"
        return True, v
    if kind == "deal":
        if s.lower() not in DEALS:
            return False, f"new_deal_type {s!r} not in {sorted(DEALS)}"
        return True, s.lower()
    if kind == "images":
        urls = [u.strip() for u in s.split(",") if u.strip()]
        for u in urls:
            if not u.lower().startswith(("http://", "https://")):
                return False, f"image URL rejected ({u[:60]}…): http(s):// only, file:// forbidden"
        return True, urls
    if col == "new_description" and len(s) < 20:
        return False, f"new_description too short ({len(s)} chars, need >= 20)"
    return True, s


def main():
    ap = argparse.ArgumentParser(
        description="Apply worklist new_* fills (guarded, audited, dry-run by default)")
    ap.add_argument("csv", help="worklist CSV from generate_worklist.py")
    ap.add_argument("--apply", action="store_true",
                    help="actually write (default: dry-run, zero writes)")
    args = ap.parse_args()
    base, key = load_env()

    with open(args.csv, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    plans, rejects, skipped = [], [], 0
    for row in rows:
        fills = {c: row[c].strip() for c in FILLABLE if (row.get(c) or "").strip()}
        if not fills:
            skipped += 1
            continue
        changes, reasons = {}, []
        for col, raw in fills.items():
            ok, val = parse_val(col, raw, row)
            if ok:
                changes[FILLABLE[col][0]] = val
            else:
                reasons.append(val)
        if reasons:
            rejects.append((row.get("id"), row.get("code") or row.get("ref_id"), reasons))
        else:
            plans.append((row.get("id"), row.get("code") or row.get("ref_id"), changes))

    print(f"Worklist rows:     {len(rows)}")
    print(f"  no fills:        {skipped}")
    print(f"  accepted plans:  {len(plans)}")
    print(f"  rejected fills:  {len(rejects)}  (guards held — see below)")
    for rid, code, reasons in rejects[:40]:
        print(f"    REJECT {code or rid}: " + "; ".join(reasons))
    if len(rejects) > 40:
        print(f"    … and {len(rejects) - 40} more")

    if not args.apply:
        print("\nDRY-RUN: no database writes happened. Re-run with --apply to write.")
        for rid, code, ch in plans[:10]:
            print(f"  would PATCH {code or rid}: {json.dumps(ch, ensure_ascii=False)[:160]}")
        if len(plans) > 10:
            print(f"  … and {len(plans) - 10} more")
        return

    if not plans:
        print("\nNothing to apply.")
        return

    wrote, failed = 0, 0
    for rid, code, ch in plans:
        try:
            cur = api(base, key,
                      f"listings?select=id,price,deal_type,latitude,longitude,"
                      f"description,images,bedrooms,bathrooms,area_sqm&id=eq.{rid}")
            before = {k: cur[0].get(k) for k in ch} if cur else {}
            api(base, key, f"listings?id=eq.{rid}", method="PATCH", body=ch)
            api(base, key, "audit_logs", method="POST", body={
                "action": "enrichment.apply",
                "target": rid,
                "before": before,
                "after": ch,
                "actor_uid": "sierra-enrichment-workflow",
                "actor_email": "ops+enrichment@sierra-estates.net",
            })
            wrote += 1
            print(f"  WROTE {code or rid}: {list(ch.keys())}")
        except Exception as e:  # noqa: BLE001 — report and continue
            failed += 1
            print(f"  ERROR {code or rid}: {e}")
    print(f"\nApplied: {wrote} rows, {failed} errors. "
          f"Run recheck_and_publish.py to move passing rows to PUBLISHABLE.")


if __name__ == "__main__":
    main()
```


# APPENDIX D — scripts/ops/sierra/recheck_and_publish.py

```python
#!/usr/bin/env python3
# ============================================================================
# recheck_and_publish.py — publish gate for the enrichment loop
# ----------------------------------------------------------------------------
# Re-fetches every queue row (status='active' AND publish_status != PUBLISHABLE),
# re-evaluates the 12-field completeness gate, and reports how many rows would
# pass. With --apply, passing rows are promoted to publish_status='PUBLISHABLE'
# (+ published_at / verified_at / verified_by) and an audit_logs row is written
# per promotion. Rows that still fail are left untouched — §21 no-fabrication:
# missing data stays unpublished until a human supplies real values.
#
# 12-FIELD GATE (a row must satisfy ALL):
#   title, description, price (present AND deal-sane), bedrooms, bathrooms,
#   area_sqm, location (area/city/compound), geo (lat+lng), photos, code
#   (code/unit_code/ref_id), property_type, deal_type
#   price sanity: rent 1,000..500,000 | sale/resale/primary >= 100,000
#
# Usage:
#   python3 recheck_and_publish.py            # dry-run report
#   python3 recheck_and_publish.py --apply    # promote passing rows
#   python3 recheck_and_publish.py --ids id1,id2   # limit to specific ids
# ============================================================================
import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.request

PAGE = 1000
SEL = ("id,ref_id,code,unit_code,title,compound,location_area,city,deal_type,"
       "property_type,price,bedrooms,bathrooms,area_sqm,latitude,longitude,"
       "description,images,photo_count,publish_status")


def load_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        here = os.path.dirname(os.path.abspath(__file__))
        for cand in ("se.env", "../scripts/se.env"):
            p = os.path.join(here, cand)
            if os.path.exists(p):
                for line in open(p, encoding="utf-8"):
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
                url = os.environ.get("SUPABASE_URL")
                key = os.environ.get("SUPABASE_SECRET_KEY")
                break
    if not url or not key:
        sys.exit("ERROR: set SUPABASE_URL / SUPABASE_SECRET_KEY (env or se.env)")
    return url.rstrip("/"), key


def api(base, key, path, range_header=None, method="GET", body=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "count=exact" if range_header is None else "return=minimal",
        },
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    if range_header:
        req.add_header("Range", range_header)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read().decode()
        cr = r.headers.get("Content-Range") or ""
        return (json.loads(raw) if raw else []), cr


def fetch(base, key, path):
    rows, cr = api(base, key, path)
    total = int(cr.split("/")[-1]) if cr and "/" in cr else len(rows)
    all_rows = list(rows)
    while len(all_rows) < total:
        lo, hi = len(all_rows), len(all_rows) + PAGE - 1
        page, _ = api(base, key, path, range_header=f"{lo}-{hi}")
        if not page:
            break
        all_rows.extend(page)
    return all_rows


def gate(r):
    """Returns (passed, [failed field names])."""
    fails = []
    if not (r.get("title") or "").strip():
        fails.append("title")
    if not (r.get("description") or "").strip():
        fails.append("description")
    price = float(r.get("price") or 0)
    deal = (r.get("deal_type") or "").lower()
    if price <= 0:
        fails.append("price")
    elif deal == "rent" and not (1000 <= price <= 500000):
        fails.append("price(sanity:rent)")
    elif deal in ("sale", "resale", "primary") and price < 100000:
        fails.append("price(sanity:sale)")
    if not (r.get("bedrooms") or 0):
        fails.append("bedrooms")
    if not (r.get("bathrooms") or 0):
        fails.append("bathrooms")
    if not float(r.get("area_sqm") or 0):
        fails.append("area_sqm")
    if not ((r.get("location_area") or r.get("city") or r.get("compound") or "").strip()):
        fails.append("location")
    if r.get("latitude") is None or r.get("longitude") is None:
        fails.append("geo")
    if not (r.get("images") or []) and not (r.get("photo_count") or 0):
        fails.append("photos")
    if not (r.get("code") or r.get("unit_code") or r.get("ref_id")):
        fails.append("code")
    if not (r.get("property_type") or "").strip():
        fails.append("property_type")
    if not deal:
        fails.append("deal_type")
    return (not fails), fails


def main():
    ap = argparse.ArgumentParser(
        description="Publish gate: recheck enrichment queue, promote passing rows")
    ap.add_argument("--apply", action="store_true",
                    help="promote passing rows (default: dry-run report)")
    ap.add_argument("--ids", default=None, help="comma-separated listing ids to limit to")
    ap.add_argument("--worklist", default=None,
                    help="optional worklist CSV — limits recheck to its ids")
    args = ap.parse_args()
    base, key = load_env()

    ids = None
    if args.ids:
        ids = [x.strip() for x in args.ids.split(",") if x.strip()]
    elif args.worklist:
        with open(args.worklist, newline="", encoding="utf-8-sig") as f:
            ids = [r["id"].strip() for r in csv.DictReader(f) if r.get("id")]

    path = f"listings?select={SEL}&status=eq.active&publish_status=neq.PUBLISHABLE&order=created_at.desc"
    if ids:
        path += f"&id=in.({','.join(ids)})"
    rows = fetch(base, key, path)

    passing = [(r, []) for r in rows if gate(r)[0]]
    failing = [(r, gate(r)[1]) for r in rows if not gate(r)[0]]

    print(f"Rechecked {len(rows)} queue rows"
          + (f" (limited to {len(ids)} ids)" if ids else "") + ":")
    print(f"  PASS the 12-field gate : {len(passing)}")
    print(f"  still failing          : {len(failing)}")
    from collections import Counter
    c = Counter(f for _, fl in failing for f in fl)
    for field, n in c.most_common(15):
        print(f"    {field:22s} {n:>6,}")

    if not args.apply:
        print("\nDRY-RUN: nothing written. Re-run with --apply to promote passing rows.")
        return
    if not passing:
        print("\nNothing to promote.")
        return

    now = dt.datetime.now(dt.timezone.utc).isoformat()
    wrote = 0
    for r, _ in passing:
        try:
            api(base, key, f"listings?id=eq.{r['id']}", method="PATCH", body={
                "publish_status": "PUBLISHABLE",
                "published_at": now,
                "verified_at": now,
                "verified_by": "sierra-enrichment-workflow",
            })
            api(base, key, "audit_logs", method="POST", body={
                "action": "enrichment.publish",
                "target": r["id"],
                "before": {"publish_status": r.get("publish_status")},
                "after": {"publish_status": "PUBLISHABLE",
                          "verified_by": "sierra-enrichment-workflow"},
                "actor_uid": "sierra-enrichment-workflow",
                "actor_email": "ops+enrichment@sierra-estates.net",
            })
            wrote += 1
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR {r.get('code') or r['id']}: {e}")
    print(f"\nPromoted {wrote}/{len(passing)} rows to PUBLISHABLE. "
          f"They appear on the public map on the next request "
          f"(Vercel serves /api/inventory uncached/dynamically).")


if __name__ == "__main__":
    main()
```

