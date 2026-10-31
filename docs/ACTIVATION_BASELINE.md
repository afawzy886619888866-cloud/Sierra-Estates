# ACTIVATION BASELINE — Phase A Freeze & Audit

```text
PHASE:   A — Freeze and Audit Current Head
STATUS:  VERIFIED
DATE:    2026-09-29
EXECUTOR: Activation audit (strict protocol, Rules A–F enforced)
```

This baseline records the **actual verified state** of `main` at audit time.
Every claim below was re-executed from a clean checkout — no statement is
inherited from prior reports without re-verification (Rule F / Rule C).
Verification levels are labelled explicitly: `Implemented`, `Tested locally`,
`Integrated`, `Deployed`, `Live`, `End-to-End Verified`.

---

## CURRENT HEAD

```text
commit   : 8015a6a5bd7037f3f3b865bed7b48eca2910a15d
subject  : feat(partner-accounts): scoped admin access for merger partners + admin photo button + bot media policy
author   : Z User
date     : 2026-09-29 02:51:27 +0000
branch   : main
sync     : local main == origin/main (0 ahead / 0 behind) — VERIFIED
worktree : clean at audit start (only audit-introduced changes listed in FILES CHANGED)
```

Toolchain used: Node v24.21.0, pnpm 9.15.4 (pinned `packageManager`),
TypeScript 7.0.2 (root catalog) / 5.8.3 (client app), Python 3.12.14
(pandas + openpyxl).

---

## BUILD

| Command | Result | Evidence |
|---|---|---|
| `pnpm build` (canonical root) | **BLOCKED (env-gated, by design)** | Fails at `scripts/sync-inventory-snapshot.mjs`: requires `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to pull the canonical `snapshot.json` (48 MB+) from Supabase Storage bucket `inventory-snapshots`. No offline fallback exists. |
| `turbo run build` (committed snapshot) | **PASS — 11/11 tasks, exit 0** | `sierra-estates-client-page`: Next.js 16.3.3 (webpack), compiled successfully in 55 s, 117 static pages generated, built-in type-check passed. 10/11 tasks turbo-cached on re-run. |

Notes:

- One transient failure occurred on the first turbo attempt (worker died during
  page-data collection with zero error output); reproduced clean twice after.
- `apps/.../scripts/apply-pending-migrations.mjs` correctly self-skips without
  `POSTGRES_URL` (local-dev mode, exit 0) — no destructive behavior offline.

---

## TYPECHECK

**PASS — `turbo run type-check`: 16/16 tasks, 32.6 s.**
Includes the client app (`tsc --noEmit` under 4 GB heap with ensure-snapshot)
and all workspace packages (incl. TS-7.0.2-pinned packages, which type-check
fine — only their *lint/jest* tooling breaks, see LINT).

---

## LINT

| Scope | Result | Cause |
|---|---|---|
| `apps/sierra-estates-realty` (main app) | **PASS** | `eslint .` clean + `validate-configs.mjs` all configs valid (tsconfig, vercel.json, turbo.json, package.json, eslint.config.mjs). |
| Root `pnpm lint` (turbo, all packages) | **FAIL — pre-existing at HEAD** | Packages inheriting root TypeScript 7.0.2 (`packages/ui`, `packages/deepseek-harness`, …) crash typescript-eslint 8.70.1: "typescript-eslint does not support TS 7.0". The app pins TS ^5.8.3 and lints clean. |

---

## UNIT TESTS

| Suite | Result | Evidence |
|---|---|---|
| Client app Jest (122 suites incl. real-data fail-fast suites) | **PASS — 124/124 suites, 1,343/1,343 tests** (30.3 s) | Includes `phase13-data-qa.test.ts` and `client-journey-personas.test.ts`, which **fail-fast unless the real `data/MASTER_INVENTORY_V1.csv` exists** — regenerated this audit (see INVENTORY STATUS). Coverage: 28.6 % statements. |
| `packages/memory-engine` Jest (3 suites) | **CANNOT RUN — pre-existing at HEAD** | ts-jest 29 is incompatible with the package's pinned TypeScript 7.0.2 ("does not expose the JavaScript compiler API required by ts-jest"). |

---

## INTEGRATION TESTS

Root Vitest (monorepo wiring/contracts): **605/619 tests pass (62/69 files).**
14 failures in 7 files — **all pre-existing at HEAD** (verified: none touch
files changed by this audit; generated artifacts are gitignored):

| Suite | Failure | Root cause (at HEAD) |
|---|---|---|
| `data-hygiene-and-git-weight` | 3 | `apps/.../lib/inventory/snapshot.json` (6.2 MB) tracked in git despite 5 MB policy; `data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx` tracked though policy expects `data/` untracked; snapshot.json tracked. |
| `excel-inventory-and-mobile-ui` | 4 | Expects `Inventory_with_Photos.xlsx` at repo root — file absent from repository (data gap); `readExcelListings` returns 0 units. |
| `action-routing-and-deployment-dispatch` | 2 | Test expects literal `app/api/cron/dispatch/night/route.ts`; implementation uses dynamic `[job]` route (drift). Test expects Vercel project `prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA`; `sync-vercel-env.js` targets `prj_ieVcIcoeTtHndspXMzlE0cwLl89c` (drift). |
| `admin-db-and-hero-regression` | 1 | cspell dictionary missing PostgreSQL/domain words. |
| `backend-services` | 1 | Cron path assertion drift vs `vercel.json`. |
| `docker-infrastructure` / workflow agents / mobile-nav | 3 | Config/expectation drift at HEAD (volumes, audit-workflow agents, responsive header source check). |

---

## DEPLOY CHECK

`pnpm deploy:check` (`scripts/verify-deploy-readiness.ts`) — **7/9 stages PASS**

```text
✅ Root Configuration Files
✅ Production Environment Configuration (Supabase authoritative; creds in GitHub Secrets/Vercel — NOTICE only)
✅ Public Environment Safety          (no server creds browser-visible)
❌ Canonical Supabase Backend Policy  — requires live NEXT_PUBLIC_SUPABASE_URL + anon key (env-gated; passes where env exists)
✅ Legacy Runtime Boundary
✅ Supabase Master Schema Readiness
✅ Packages Compilation & Type-Check
✅ Client Unit & Integration Tests    (re-ran Jest — green)
❌ Git Status & Zero Working-Tree Drift — drift = THIS audit's 2 intentional pipeline path fixes (see FILES CHANGED)
```

The prior Phase-14 "9/9 green" held in an env-complete context; in this
environment the 2 failures are (a) missing live credentials and (b) the
audit's own documented changes. No new defects.

---

## LIVE ENV STATUS

Probed directly (full detail + evidence in `docs/LIVE_ENVIRONMENT_GATE.md`):

| Target | State | Evidence |
|---|---|---|
| `https://sierra-estates.net` (client) | **Deployed + Live (HTTP 200)** | `/api/health` healthy v3.1.0, prod env, Supabase connected 210 ms |
| `https://admin.sierra-estates.net` (admin SPA) | **Deployed + Live (HTTP 200)** | Static no-build SPA (`deploy/`) |
| Supabase project `gaxfqcietzoonlmatiot.supabase.co` | **Live — CONNECTED (platform-verified)** | Health endpoint reports "Connected to Supabase PostgreSQL"; public API returns real rows |
| OpenWA WhatsApp gateway `18.232.148.172:3000` | **Host UP (HTTP 200)** | Session/auth state requires gateway admin key — UNKNOWN |
| Gemini (`gemini-2.0-flash`) | **Configured (self-reported)** | Independent generation test NOT performed (no key in audit env) |
| Telegram / Excel sync | **Configured (self-reported)** | Independent delivery test NOT performed |

---

## DATABASE STATUS

- **Live Supabase: CONNECTED** (live health endpoint; latency 116–511 ms).
- **Schema/migration state: NOT verifiable from this audit environment**
  (needs service-role key). Canonical schema = `supabase/schema.sql` (2,497
  lines, 57+ tables, 126 RLS statements) + 12 migrations; app mirror is
  missing migration `019` (drift).
- **Live `properties` table: EMPTY** — `/api/health` reports
  `activeProperties: 0` (counts `properties`).
- **Live `listings` table: contains real imported inventory** — public
  `/api/listings` returns 500 rows (its `.limit(500)` cap) with master-inventory
  lineage codes (`SE-RNT-*`, `INV-*`; all sampled codes present in the
  canonical snapshot), `status='active'`.
- **CRITICAL → RESOLVED AT APP LAYER (2026-09-30, credential-free patch):**
  - Public RLS policy is `FOR SELECT USING (status = 'active' OR is_staff())`
    (`supabase/schema.sql:566`) — **`publish_status` still NOT enforced in
    RLS** (migration `20261002_020_public_publish_gate.sql` is written but
    needs Supabase credentials to apply — the remaining credential-gated
    half of this blocker).
  - **App-layer defense-in-depth now enforces
    `publish_status = 'PUBLISHABLE'` on EVERY public listing surface**
    (verified by tests `api/inventory-publish-gate`,
    `api/matches-publish-gate`, `api/listings-envelope`,
    `api/listings-spatial`, `phase13-security-sweep`):
    `/api/listings` (filter + envelope + `?id=` + proximity modes),
    `/api/listings/spatial` (RPC output filtered in-app + gated live-table
    fallback), `/api/inventory` (gated query; unverified Excel /
    WhatsApp-ingested / sheet / snapshot tiers REMOVED from the public GET),
    `/api/matches` (status + publish gate inside the query), and
    `/api/feeds/property-finder` (gated query; unverified snapshot fallback
    removed).
  - Consequence: until staff verify units, public surfaces serve an honest
    EMPTY state (`source: 'none'`) instead of 500 unverified units. The
    public client now sees ONLY PUBLISHABLE at the application layer; the
    DB-layer (RLS) enforcement lands when migration 020 is applied.

---

## INVENTORY STATUS

Re-ran the canonical Phase-1 pipeline first-hand
(`scripts/data-audit/build_master_inventory.py` +
`generate_deliverables.py`); regenerated reports are **byte-identical** to the
committed docs (deterministic, genuine):

```text
SOURCE RECORDS      : 12,088   (XLSX 11,488 + owner TSVs 298 + 302)
UNIQUE UNITS        :  8,486
DUPLICATES          :  3,602   (2,013 exact + 1,589 near)
PUBLISHABLE         :      0   ← THE core business blocker
  REVIEW_REQUIRED   :  1,800
  STALE             :  3,679
  EXPIRED           :    240
  INCOMPLETE        :  2,767
FRESHNESS (unique)  : Verification Required 501 · Unknown 7,766 · Aging 206 · Stale 13
CLASS               : OWNER_DIRECT 1,862 · PARTNER 84 · BROKER 6,540
PHONES VALID        :  6,700 (78.9 %)
PRICES VALID        :  3,081 (36.3 % of unique)
COMPOUND UNRESOLVED :    127
VERIFICATION QUEUE  :  7,898 units (priority order per plan §C3)
PHOTOS              : effectively none in master inventory; live public API: 500/500 listings have NO image (Phase C5 minimum 3–5 real photos unmet)
```

No fake data was introduced at any point (Rule B). Where data does not exist,
this document says so.

---

## BOT STATUS

- **Implemented + Tested locally**: `LailaLeadIntakeService` (6-stage bilingual
  intake: location, deal_type, property_type, budget, bedrooms, furnishing,
  move-in, nationality, special requirements; state persisted in
  `whatsapp_lead_sessions`; hand-off to matching engine at Stage 6), prompts in
  `lib/prompts/leila.ts`, inbound webhook `app/api/whatsapp/webhook` (Meta
  Cloud API, HMAC `WHATSAPP_APP_SECRET`), router in
  `apps/agents/whatsapp-bot/router.ts` (Liela→Sierra→OpenClaw→Hermes).
  Real-data persona suites pass against the 8,486-unit CSV.
- **Live: CONFIGURED, NOT End-to-End Verified** — needs Gemini key + WhatsApp
  gateway credentials to run a live qualification (blocked from this
  environment).

## MATCHING STATUS

- **Implemented + Tested locally**: `matching-engine.ts`
  (`runMatchingForLead`), `lib/server/match-scoring.ts`, `/api/matching/*`,
  hard-constraint engine + soft ranking (Phase 5/6/7 commits); persona tests
  run against real 8,486-unit inventory.
- **Live: NOT VERIFIED** — matching against live `listings` (incl. the 500
  public unverified rows) has not been exercised end-to-end with a real lead.

## VIEWING STATUS

- **Implemented + Tested locally**: canonical `viewings` table + public
  request flow (migration 014), viewing feedback (015), scheduling/reminders
  in `viewing-engine.ts`, public feedback page, admin Viewings view.
- **Live: NOT VERIFIED** — calendar + WhatsApp confirmation E2E not performed.

## CRM STATUS

- **Implemented + Tested locally**: pipeline unification (migration 016),
  `/api/crm/*`, lead state machine, admin dashboards; jest suites green.
- **Live: NOT VERIFIED** — persistence checked only at test level; reload
  persistence on production not exercised.

## AUTOMATION STATUS

- **Implemented**: unified cron dispatcher `/api/cron/dispatch/[job]`
  (job registry, executor, run ledger `automation_runs`, DLQ lifecycle,
  `cron-auth.ts`), `vercel.json` crons `night` (02:00) + `morning` (06:00),
  10 cron routes.
- **Live: VERIFIED** — scheduled executions actively logged in
  `public.automation_runs` (`night` job run at `2026-10-05T02:11:53Z`;
  `morning` job run at `2026-10-05T06:44:39Z`).

---

---

## CURRENT STATUS & INTERIM VERIFICATION (2026-10-05)

```text
PHASE:      Interim Phase — Live Verification Without Inventory
STATUS:     LIVE-VERIFIED
MIGRATIONS: 22 migrations ledgered in public.schema_migrations (incl. 020, 022, 025)
INVENTORY:  15,994 listings in public.listings (15,994 REVIEW_REQUIRED, 0 PUBLISHABLE)
GATE:       RLS Policy 020 live-verified (anon sees 0); public /api/listings returns []
SITE:       Honest empty state live (health 200, inventory count: 0, source: "none", seeded: false)
NEXT:       Human verification of the 50-unit pilot (data/PILOT_50_WORKSHEET.xlsx)
```

### Root Cause & Corrective Actions

1. **Root Cause of 9,435 Anon-Visible Units**: An unledgered `DEFAULT 'PUBLISHABLE'` constraint on `public.listings.publish_status` automatically backfilled pre-existing rows upon creation and was omitted from the 022 defaults-drop migration.
2. **Migration 025**: Dropped `publish_status` default constraint and demoted unverified rows to `REVIEW_REQUIRED`. Ledgered on live production at `2026-10-04T21:49:08Z`.
3. **Workflow 08 Ingestion (+177 / +240 Rows)**: Identified `workflows/08-units-sync/sync.js` as the source of rows from Google Sheets (gid=1127958606) executed `2026-10-04T15:07:29-32Z`. Baseline 15,754 grew to 15,932 (+177 observed mid-run) and completed at 15,994 (+240 net additions). All 240 rows share `sync_source: 'sheets-units'`, `source_channel: 'sheets'`, `ref_id: null`, and SBR sheet codes. Patched in commit `871299e87` to hardcode `listing.publish_status = 'REVIEW_REQUIRED'` (never `PUBLISHABLE` without photos and staff verification).
4. **Permanent Regression Test**: Probe row `probe-test-1791229563902` inserted without `publish_status` landed as `NULL` (proving default is dropped), verified invisible to `anon` under RLS Policy 020 (0 returned), and probe deleted cleanly (`id: 0b1803bc-8986-4753-a9c3-25615d32f917`).

---

## OPEN BLOCKERS & STATUS

1. **50-Unit Pilot Human Verification (High Business Blocker)** —
   Status: **IMPLEMENTED & DEPLOYED (Gate), AWAITING HUMAN VERIFICATION (Data)**.
   The 50 top `OWNER_DIRECT` units have been extracted to `data/PILOT_50_WORKSHEET.csv`
   and `.xlsx`. Live verification with owners and real unit photos ($\ge 3$ photos)
   is required before promoting any unit to `PUBLISHABLE`.
2. **Public visibility `publish_status` enforcement — COMPLETE & LIVE-VERIFIED**.
   Migrations 020, 022, and 025 are ledgered in `public.schema_migrations`.
   RLS Policy 020 is active on `public.listings`.
   Public anon sees 0 unverified rows.
3. **No-fabrication violations in client-facing code (Rule B / §21) — RESOLVED**.
   Invented fallbacks (`|| 1500`, `|| 'New Cairo'`) removed. Honest empty sets
   served across `/api/listings`, `/api/inventory`, and `/api/matches`.
4. **Photo Gate Enforcement — ACTIVE**.
   0 units currently meet the $\ge 3$ photo threshold. All stock photos rejected.
5. **Toolchain & DDL Tracking — SYNCHRONIZED**.
   22 migrations ledgered 1:1 between repository and live Supabase.
   TypeScript compilation clean across all 16 packages.

---

## FILES CHANGED (this audit)

```text
scripts/data-audit/build_master_inventory.py   — ROOT path made self-locating + SE_PIPELINE_ROOT env override (was hardcoded /home/z/my-project/sierra-blu; pipeline could not execute from any other checkout)
scripts/data-audit/generate_deliverables.py    — same minimal fix
```

Generated artifacts (gitignored, not committed): `data/MASTER_INVENTORY_V1.csv|.xlsx`.
`apps/.../next-env.d.ts` build-noise was reverted (checkout).

## DATABASE CHANGES

None. No migrations applied, no data written (no credentials; Rule E).

## ENVIRONMENT DEPENDENCIES

None added. No secrets read, printed, or committed (Rule B / Phase B rule).

---

## GATE

Phase A passes: current HEAD state is documented with evidence at the
correct verification levels. Proceed to Phase B — `docs/LIVE_ENVIRONMENT_GATE.md`.
