# SIERRA ESTATES — GO-LIVE RUNBOOK
# The single document that sequences every remaining step.
# Current state (2026-10-11 11:15 UTC): **sierra-estates.net IS LIVE** (4,322
# verified pins, smoke 14/14, admin domain 200). TWO owner actions remain:
# rotate the Supabase secret (Step 1) and apply pending migrations 027/028
# (Step 1b) — both are dashboard actions, doable in ONE dashboard visit.

> ✅ 2026-10-11 PRODUCTION VERIFIED: the live site passed the full smoke suite
> **14/14 GREEN** against https://sierra-estates.net — all routes 200 + content,
> health healthy/supabase-healthy, inventory `source:supabase` **count 4,322**
> (155 sale / 4,167 rent), ALL pins geocoded, 0 placeholder-price pins, all
> security headers, robots + sitemap. Browser-verified end-to-end: /properties
> map renders compound-cluster markers; clicking one opens real listings
> (Standalone Villas, rent EGP 230k/200k/150k/mo, bilingual data intact);
> /explore renders the 3D compound explorer with 29 towers + real price labels.
> Production runs current main — the inventory API already serves the new
> `segments` / `compoundCounts` fields from commit 90d05f29.
> GitHub token exposure: CLOSED (revoked, 401-confirmed).
> Remaining: Step 1 only (rotate the Supabase secret — still live as of today).

---

## STEP 1 — Rotate the Supabase secret key (THE ONE REMAINING ACTION — 1 min)

The `sb_secret_…` service key was pasted into a chat. **Confirmed still live
and working (re-tested 2026-10-11 — project REST returns 200 with it)**, so it
remains an active exposure. Rotation is dashboard-only — this was proven twice:
the Supabase Management API (`api.supabase.com/v1/…`) rejects the service key
itself ("JWT could not be decoded"; it requires an `sbp_…` personal access
token), and no such token exists anywhere in this environment.

1. Supabase dashboard → project `gaxfqcietzoonlmatiot` → Settings → API Keys
2. Service role / secret key → **rotate** (creates a new `sb_secret_…`)
3. Update the value in TWO places:
   - **Vercel** → project → Settings → Environment Variables →
     `SUPABASE_SERVICE_ROLE_KEY` (used server-side for writes) → redeploy
   - **Local workflow scripts** → `scripts/se.env`
     (`SUPABASE_SECRET_KEY=…`, chmod 600, never committed)
4. Confirm the old key is dead: it should return 401 against
   `https://gaxfqcietzoonlmatiot.supabase.co/rest/v1/listings?select=id`

The publishable key (`sb_publishable_…`) is safe to keep — it ships in the
browser by design. Everything else keeps working through the rotation: the
public map reads via the anon key; only server-side writes use the secret.

---

## STEP 1b — Apply pending migrations 027 + 028 (unblocks the intake pipeline)

**Verified state (2026-10-11 11:15 UTC):** production's `schema_migrations`
ledger stops at 026 — migrations **027** (owner-listing intake lifecycle:
durable intake records, inbound-event idempotency, Telegram update ledger,
RLS) and **028** (6 new staff roles + `pending` status + access_requests
audit table) are **pending**. These unlock the WhatsApp/Telegram owner-intake
pipeline you are actively building (PRs #298–#300).

The runtime applier is fully armed — `/api/ops/deploy-diagnostics` on
production reports: `postgresUrl: true` · migrations bundled (26 files incl.
027/028) · `cronSecretSet: true` · `ownerGuardWouldSkip: false`. Three paths,
any one of them applies both migrations (all idempotent, additive-only):

1. **Dashboard paste (deterministic, do it with Step 1 in the same visit):**
   open `download/sierra_apply_migrations_027_028.sql`, paste the WHOLE file
   into Supabase → SQL Editor → Run. It contains both migrations verbatim
   PLUS the ledger inserts with the applier-exact checksums
   (027 `475786f4eb8daf93` · 028 `96131c726111e7bc`), so the runtime
   applier will recognize them as applied and never re-run them. Safe to
   paste at any time — if another path already applied them, it no-ops.
2. **Your preimage route (PR #300, deploy landing ~11:30 UTC):**
   `curl -X POST https://sierra-estates.net/api/ops/apply-pending \
     -H "x-apply-key: <your preimage>"` — you hold the preimage (only its
   SHA-256 commitment `da6c0b75…5d27` is committed).
3. **The armed one-shot cron (12:25 UTC today) — RACE-DEPENDENT:** the
   live deployment carries `25 12 * * *` → `/api/cron/apply-migrations`.
   It fires ONLY if the PR #300 deploy does NOT land first (that deploy
   removes the cron). Verified: all gates pass on latest main
   (typecheck · lint · 1,507/1,507 tests), so that deploy will land and
   likely wins the race — do not count on the cron.

Verify afterwards: `owner_listing_intakes` table exists (was 404), ledger
shows 027/028, or simply re-run the diagnostics route. Then delete the two
TEMPORARY ops routes (`apply-pending`, `deploy-diagnostics`) in a follow-up
PR as their headers instruct — they self-document as temporary.

---

## STEP 2 — ✅ DONE: main is hardened, all gates green

- PR #288 (memory guard, dev-gated) · PR #289 (handlebars 4.7.10 override —
  Dependabot alerts 6→0, zero open) · PR #290 (zone fabrication fix) — merged.
- PR #292 (map-card honesty — unknown beds/area now '?') · PR #293 (inventory
  mode honors real deal_type) · PR #294 (`.range()` pagination — max-rows was
  silently capping the map at ~1,000 rows) — merged.
- Verified on b151507e: 8/8 preflight gates, **1,524/1,524 tests** (141
  suites), production build exit 0, smoke 13/13 against the local boot.
- Later upstream commits (PR #296 test pins, admin portal work, PR #297 ops
  hardening, 90d05f29 inventory Google-Sheet wiring) were reviewed — public
  map/inventory pipeline untouched (route unchanged; lib changes add
  `segments`/`compoundCounts` enrichment) — and are LIVE in production now.

---

## STEP 3 — ✅ DONE (absorbed by live production): Vercel deploy

> [!NOTE] 2026-11-20: the Vercel pipeline is RETIRED (workflows and env-sync
> scripts deleted). Production now deploys the unified Cloudflare Worker
> `sierra-estates` via `.github/workflows/deploy-cloudflare.yml` — see
> [DEPLOYMENT.md](../../DEPLOYMENT.md). The topology below is historical.

The Vercel–GitHub integration auto-deployed main; production at
**https://sierra-estates.net** (admin at **admin.sierra-estates.net**, also
200). Deployment topology (from the repo's own `scripts/sync-vercel-env.js`):
org `<VERCEL_ORG_ID>`, client project
`sierra-estates-client-portal` (<CLIENT_VERCEL_PROJECT_ID>), admin
project `sierra-estates-admin-page` (<ADMIN_VERCEL_PROJECT_ID>).

**Env var names that MUST be right on Vercel (they currently are — verified
by the live inventory):**
| Variable | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://gaxfqcietzoonlmatiot.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | sb_publishable_… — ⚠️ EXACTLY this name: `packages/db/lib/supabase.ts` reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`, NOT `…_PUBLISHABLE_KEY`. Wrong name → `/api/inventory` silently returns `source:"none"` → empty map. |
| SUPABASE_SERVICE_ROLE_KEY | the sb_secret_… (update after Step 1 rotation) |
| NEXT_PUBLIC_SITE_URL / ALLOWED_ORIGINS | https://sierra-estates.net |
| SESSION_SECRET / ADMIN_BOOTSTRAP_* | per Vercel project settings |

Build pipeline on Vercel: `ci-preflight.sh` (8 gates incl. full jest) then
`next build` — the deploy IS the CI. Migrations defer to
`/api/cron/apply-migrations` by design (sensitive vars are build-excluded).

**Post-deploy verification (run any time):**
```
bash sierra_post_deploy_smoke_test.sh https://sierra-estates.net 4000
```
14 checks: routes+content, health, inventory source/count/geo/price-integrity,
security headers, robots/sitemap. Validated **14/14 GREEN** on production
2026-10-11 (includes cold-start retry for the dynamic sitemap; field names
match the live API shape: `units[]` with `lat`/`lng`).

---

## STEP 4 — Grow the public inventory (enrichment workflow)

Current DB state (2026-10-11): **15,994 total · 9,435 active · 4,503
PUBLISHABLE · 4,933 REVIEW_REQUIRED → 4,322 unique map pins live** (4,167 rent
/ 155 sale; the API dedups by listing code — code-shared rows render as one
pin).

**Committed-source harvest audit — DONE (do not repeat).** Every committed
source was cross-matched against the deferred rows: consolidated master xlsx
(3,421 matches; only 1 coherent price — applied as the INV-52BDFCEB51F7
1000×-corruption fix), owners CSV/TSV (752), MASTER_INVENTORY_V1.csv (0),
PF feeds (derived from the xlsx), DB side tables (empty),
consolidated-master-inventory.json (445 matches but LOW-TRUST: 1,038 uniform
5M placeholders + prices parsed from UUID fragments + heuristic deal labels —
excluded). **Net harvestable real prices: 1 row (applied).** Deferred prices
never existed in committed sources — owner/broker outreach is the only path.

**THE ENRICHMENT WORKFLOW** — `download/sierra_enrichment_workflow/` (README
inside): `generate_worklist.py` → staff fill `new_*` columns (owner/broker
calls) → `apply_enrichment.py --apply` (fill-EMPTY-only + price-coherence
guards, audit-logged) → `recheck_and_publish.py --apply` (auto-publishes newly
viable rows) → repeat. Rebuilt + revalidated 2026-10-11 after the environment
wiped the originals: cohorts match exactly (3,834/640/423/19/17), contacts
joined from the master xlsx (7,276 broker Record IDs + 1,130 owner INV- IDs →
**2,628 rows / 53% with real contacts**; the day-0 worklist CSV is included).
Guard test: valid price planned · incoherent (45k-on-sale, rent 999) rejected ·
non-http photos rejected · dry-run writes nothing.

**Deferred cohorts (all need REAL data — never invented, per §21):**
| Cohort | Rows | Reason |
|---|---|---|
| No price | 3,834 | nothing honest to display on a price pin |
| Rent-scale price on sale rows | 585 | classification-vs-price conflict at source |
| Placeholder EGP 5M (Direct Owner resale) | 423 | uniform 5M across the source chain = ingest default |
| Rent-scale on resale rows | 55 | same conflict class |
| Rent outside plausible band | 19 | USD suspects, sale-scale-on-rent, one phone-as-price |
| No coordinates (unresolvable area) | 17 | cannot place a map pin |

Every publish/revert/enrichment decision is in `audit_logs`.

---

## REFERENCE — what lives where

| Artifact | Location | Purpose |
|---|---|---|
| Migration paste bundle | download/sierra_apply_migrations_027_028.sql | One-paste apply of pending 027+028 with applier-exact ledger checksums (Step 1b) |
| Post-deploy smoke test | download/sierra_post_deploy_smoke_test.sh | 14 checks; validated 14/14 on production 2026-10-11 (re-verified 11:15 UTC) |
| Production proof | download/sierra_production_map_live.png | Full-page screenshot: live map + listings drawer |
| Enrichment workflow | download/sierra_enrichment_workflow/ | The operating loop for the 4,933 deferred rows |
| Memory-guard patch | download/0001-dev-memory-guard.patch | Archive only — already on main via PR #288 |
| Antigravity order | download/sierra_estates_antigravity_order.md | Mission B handoff (hardening re-implementation) |
| This runbook | download/SIERRA_GO_LIVE_RUNBOOK.md | The sequence |
| Live site | https://sierra-estates.net (+ admin.sierra-estates.net) | Production |
| Live DB | Supabase project gaxfqcietzoonlmatiot | Data (survives everything) |
| Audit trail | audit_logs table | Proof of every publish/revert/enrichment decision |

## SECURITY NOTES

- ⚠️ **THE ONE OPEN ITEM**: the `sb_secret_…` key pasted in chat is confirmed
  still live (2026-10-11). Rotate it in Step 1, then update Vercel +
  scripts/se.env. Dashboard-only (Management API needs an sbp_ PAT — proven).
- ✅ GitHub token exposure CLOSED: the full-scope owner token is confirmed
  revoked (401) and appears in zero local files.
- ✅ Vercel env hygiene: production verified serving `source:supabase` with
  the correct `NEXT_PUBLIC_SUPABASE_ANON_KEY` name.
- Never paste credentials you care about into chat — use dashboards directly.
