# CHANGE LOG — Sierra Blu / Sierra Estates

Format per Master Execution Command §22: date · change · reason · files · DB impact · risk · rollback.

---

## 2026-09-29 — Phase 0/1/1.5 Execution

### Change 1 — Phase 0 Audit Reports (docs only, no runtime impact)

- **Change:** Added `docs/CURRENT_STATE_REPORT.md`, `docs/DATA_GAP_REPORT.md`, `docs/IMPLEMENTATION_ROADMAP.md`.
- **Reason:** Master Command Phase 0 deliverables; README claims ("100% production ready", "11,488 verified units") verified against code and found materially overstated.
- **Files:** docs/ (3 new files).
- **DB impact:** none.
- **Risk:** none (documentation).
- **Rollback:** delete files.

### Change 2 — Phase 1 Master Inventory Pipeline (new tooling, no runtime impact)

- **Change:** Added `scripts/data-audit/` with three Python scripts: `build_master_inventory.py` (parse → normalize → validate → dedupe → classify → score), `generate_deliverables.py` (XLSX + 5 markdown reports), `explore_sources.py` (source profiling). Generated `data/MASTER_INVENTORY_V1.csv` + `.xlsx` (gitignored per repo data-hygiene policy) and `docs/DATA_DICTIONARY.md`, `DATA_QUALITY_REPORT.md`, `DUPLICATE_REPORT.md`, `MISSING_DATA_REPORT.md`, `STALE_LISTINGS_REPORT.md`.
- **Reason:** Master Command Phase 1 — inventory truth audit. Findings: 12,088 source records → 8,486 unique units; 3,602 duplicates; **0 publishable** (91.5% unverified freshness, only 36% plausibly valid prices); owner-direct 1,862 / broker 6,540 / partner 84.
- **Files:** scripts/data-audit/ (3 new), data/MASTER_INVENTORY_V1.* (generated, gitignored), docs/ (5 new).
- **DB impact:** none (read-only against source files; DB untouched).
- **Risk:** low (offline tooling).
- **Rollback:** delete scripts/data-audit/ and generated files.

### Change 3 — ANTI-FABRICATION SWEEP (behavior change, P0) — Master Rule 5

The following changes remove every code path that could present invented property data to a real client:

1. **`packages/whatsapp-shared/src/property-matcher.js`** — Deleted `FALLBACK_INVENTORY` (5 fictional rentals with plausible sierra-estates.net URLs served when DB empty). `findMatches()` now returns `[]` on DB failure; card formatter renders missing fields as N/A instead of inventing specs (`bedrooms || '3'`, `price || 50000`); added `formatNoMatchMessage()` bilingual honest fallback.
2. **`packages/agents-core/src/personas/property-matcher.ts`** — Replaced the Gemini prompt that explicitly asked for "(fictional) luxury properties" with a DB-grounded ranking prompt (inventory must be attached in `payload.inventory`; refuses with `noMatchReason: NO_REAL_INVENTORY_PROVIDED` otherwise; model forbidden from inventing/renaming/embellishing).
3. **`packages/agents/openclaw.ts`** — Removed invented ingestion defaults (price 35,000 rent / 12,500,000 sale; area 200 sqm; bedrooms 3). Unknown values stay `undefined`; missing price sets `priceNeedsVerification` flag; Sierra code uses `U` marker for unknown beds. Interface updated in `packages/agents/tools/inventoryTools.ts`.
4. **`apps/sierra-estates-realty/app/api/internal/chat/route.ts`** — Removed canned "Analyzed 306 luxury units… high-yield opportunities in Mivida and Hyde Park" fake-analysis reply; honest "AI not configured" message instead.
5. **`apps/sierra-estates-realty/app/(site)/properties/PropertiesPage.tsx`** — `sanitizeUnit` no longer fabricates price (default was 8,500,000), compound ("New Cairo"), beds (3), area (160), finishing, per-index synthetic aiScore (9.1+jitter), jittered lat/lng, "Verified Portfolio" tag, "Verified Master Sync" freshness label. Missing price → "Price on request"; missing coords → 0 (map layer filters).
6. **`apps/sierra-estates-realty/hooks/useListingsRealtime.ts`** — Same anti-fabrication treatment for realtime rows (no 8.5M price default, no hardcoded PropertyFinder stock photo, no fake "Verified Portfolio" tag); added `onStatus` callback.
7. **`apps/sierra-estates-realty/app/(site)/properties/PropertiesPage.tsx`** — Removed the fake "realtime live" green dot (2.5s optimistic timer); indicator now reflects the actual Supabase channel subscription status.
8. **`apps/sierra-estates-realty/app/api/matches/route.ts`** — Removed `SEED_LISTINGS` fallback (2,310 stale hardcoded listings served when DB empty/unreachable). Empty DB → honest empty match set.
9. **`apps/sierra-estates-realty/app/api/listings/route.ts`** + **`app/api/listings/[id]/route.ts`** + **`app/api/listings/spatial/route.ts`** — Removed all `SEED_LISTINGS` fallbacks (find-by-id, limit mode, proximity mode); removed synthetic `aiScore` (8.8/9.0) and fake "Verified Owner" tag in Supabase row mapping.
10. **`apps/sierra-estates-realty/app/api/webhooks/whatsapp/route.ts`** — Removed hardcoded demo Arabic voice transcript that parsed into a fake "East Town 165m, 45k" listing; voice notes without transcripts are now skipped with an explicit reason.
11. **`apps/sierra-estates-realty/app/admin/views/data-constants.ts`** — `LEADS_DATA` (6 fabricated demo leads with fake PII) emptied; `KPI_DATA` fake numbers (1,547 listings, 284 leads, 98.2% AI match…) replaced with honest "—" placeholders (real values merge from `/api/admin/dashboard` when live).
12. **`apps/sierra-estates-realty/app/admin/AdminPortal.tsx`** — Removed fabricated lead-pipeline funnel (4,821/3,102/1,240/421/97), "3 urgent" hot-leads chip, "1,762 units" PF feed count.

- **Reason:** Master Rule 5 ("Never invent property data") + audit finding B1/B2/B13. Several of these paths were reachable by real clients (WhatsApp bot replies, public listing APIs, property cards, admin CRM).
- **Files:** 12 files listed above + 3 test files updated (`__tests__/whatsapp-agent-matcher.test.ts`, `__tests__/agents-and-bots-extended.test.ts`, `__tests__/admin-portal-extended.test.tsx`) to assert the honest contract (empty DB → 0 matches, no fake PII) — the old tests were asserting the fabrication.
- **DB impact:** none (no schema/data changes).
- **Risk:** MEDIUM — if Supabase is empty/unreachable, public APIs now return empty sets instead of showing stale inventory. This is the intended honest behavior but changes perceived "fullness" of the site. Mitigation: run the Phase 1.5 verification campaign and the Phase 2 importer to populate verified listings.
- **Rollback:** `git revert` of this commit restores prior behavior (not recommended).

### Change 4 — Environment repair (dev tooling only)

- **Change:** Added `typescript@5.8.3` devDep to `apps/sierra-estates-realty` (ts-jest incompatible with the root `typescript@7.0.2` native preview — pre-existing); added root `vite@^6.3.5` devDep (vitest 5.0.1 could not resolve `vite` — pre-existing breakage from dependabot catalog bump commit 6def83e).
- **Reason:** Restore ability to run the app Jest suite and monorepo Vitest suite.
- **Files:** apps/sierra-estates-realty/package.json, package.json, pnpm-lock.yaml.
- **DB impact:** none.
- **Risk:** low. `tsc --noEmit` on the app was validated with TS 5.8.3: clean.
- **Rollback:** remove the two devDeps.

### Verification (tested, not just "implemented")

| Layer | Result |
|---|---|
| App TypeScript (`tsc --noEmit`) | **PASS (0 errors)** |
| App Jest suite | **106/106 suites, 1,126/1,126 tests PASS** (incl. 6 new anti-fabrication contract tests) |
| Monorepo Vitest | 62/69 files pass; **11 failures verified pre-existing on clean HEAD via git-stash A/B** (snapshot.json git-tracking, data/ git-tracking, missing Inventory_with_Photos.xlsx, cspell dictionary, docker volumes, agents-core audit stub, vercel env script drift) |
| Phase 1 pipeline | Row accounting reconciles exactly (8,486 unique + 3,602 dupes = 12,088 seen) |

### Known pre-existing issues NOT fixed this session (documented, prioritized in roadmap)

- CI workflow triggers corrupted (`branches: ain]`) in 6 files — CI/deploy never runs on main.
- `supabase/schema.sql` not consolidated with migrations 011/012 + `infra/...broker_sessions.sql` (RLS hole).
- `lib/seed.ts` (7,016 lines) still imported by non-API consumers — recommend full deletion in Phase 4 after DB population.
- Snapshot-in-bundle architecture (B3) — Phase 4 scope.
- `/api/inventory` service-role usage (B5), admin browser bearer token (B12) — Phase 4/13 scope.

---

## 2026-09-29 — Phase 2/3 Execution (importer + schema consolidation)

### Change 1 — Phase-1 pipeline audit-trail fix (data correctness)

- **Change:** `scripts/data-audit/build_master_inventory.py` dedupe stage: (a) exact-fingerprint group members no longer share one `unit_id` — merged-away rows get `SB-<fp>-D<n>` row ids; (b) near-dupe chains resolve transitively to the surviving canonical row; (c) absorbing winners inherit the loser's `dupe_sources` provenance. `data/MASTER_INVENTORY_V1.csv` regenerated.
- **Reason:** Pre-import verification found 2,013 self-referencing `duplicate_of` entries and 667 dangling chain references — the duplicate audit trail was partially unusable, and row identity was not unique (12,088 rows / 10,075 ids).
- **Files:** scripts/data-audit/build_master_inventory.py, data/MASTER_INVENTORY_V1.csv|.xlsx (gitignored), docs/DUPLICATE_REPORT.md.
- **DB impact:** none.
- **Risk:** low — canonical counts unchanged (8,486 / 3,602); only audit-trail columns improved (verified: 0 self-refs, 0 dangling, 12,088 unique ids).
- **Rollback:** git revert; regenerate CSV from prior script version.

### Change 2 — Migration chain consolidation (B4 fragmentation fix)

- **Change:** `011_inventory_os_v2.sql` and `012_workflow_studio.sql` moved from `apps/sierra-estates-realty/supabase/migrations/` to root `supabase/migrations/` as `20260924_011_inventory_os_v2.sql` / `20260925_012_workflow_studio.sql`, with identical app-local mirrors kept for sparse-checkout deploys. The deploy-time runner prefers the root directory, so a full-repo checkout previously never applied 011/012.
- **Reason:** Audit B4 — 4 scattered migration directories; two of them unreachable depending on checkout mode.
- **Files:** supabase/migrations/ (+2), apps/sierra-estates-realty/supabase/migrations/ (renamed mirrors), apps/sierra-estates-realty/app/admin/views/InventoryOsView.tsx (hint text paths).
- **DB impact:** none until the runner executes (idempotent SQL: IF NOT EXISTS / OR REPLACE throughout). Renaming resets `schema_migrations` identity — both files re-apply harmlessly.
- **Risk:** low.
- **Rollback:** git revert; old filenames remain in git history.

### Change 3 — Migration 013: master inventory activation (B5 + B6 fixes)

- **Change:** New `supabase/migrations/20260929_013_master_inventory_activation.sql`: (a) `listings` += `source_verified_at TIMESTAMPTZ`, `availability TEXT`, `publish_status TEXT` (+4 indexes); (b) partial unique index `uq_listings_dupe_check_hash` (dedupe standard, B9); (c) **B5 fix**: `ADD COLUMN embedding_768 vector(768)` + ivfflat index — the column both embedding generators already write to; (d) **B6 fix**: `broker_sessions` folded into the canonical chain with `TO service_role` policy (was `USING(true)` = effectively public). Baseline `supabase/schema.sql` updated to match (embedding_768 column, broker_sessions table §49) and re-mirrored to the app-local copy.
- **Reason:** Phase 2 importer requires the freshness/availability/publishability columns; audit B5/B6/B9.
- **Files:** supabase/migrations/20260929_013_*.sql (new), supabase/schema.sql, apps/sierra-estates-realty/supabase/schema.sql (mirror), infra/supabase/migrations/20260928_broker_sessions.sql (policy fixed to `TO service_role`).
- **DB impact:** additive only — no drops, no column type changes, RLS policy restricted (broker_sessions public→service_role).
- **Risk:** low-medium (RLS restriction could break any code path writing broker_sessions with a non-service key — verified: only service-key contexts use it).
- **Rollback:** drop the 3 columns + index; restore old broker_sessions policy from git.

### Change 4 — Phase 2 importer (new tooling)

- **Change:** `scripts/data-audit/import-master-inventory.mjs` — consumes the canonical `MASTER_INVENTORY_V1.csv` (never raw sources), filters DUPLICATE rows, maps to the live `listings` column set (base / 011 / 013 modes), upserts `onConflict: ref_id` in 250-row batches, pre-classifies inserts vs updates, writes a reconciled import report (seen/duplicated/valid/invalid/inserted/updated/rejected + dimension breakdowns) to `data/reports/`. Default is DRY-RUN; `--write` requires credentials; PGRST204 aborts with "apply 011+013 first" guidance. Every imported row lands `status='draft'`, `verified=false`, `publish_to_client=false` — the public RLS policy (`status='active'`) makes unverified inventory unreachable by clients.
- **Reason:** Master Command Phase 2 — the legacy importer inserted with default `status='active'`, exposing unverified data publicly; raw-XLSX consumption bypassed the Phase-1 quality cascade.
- **Files:** scripts/data-audit/import-master-inventory.mjs (new), data/reports/IMPORT_REPORT_*.md|json (generated, gitignored).
- **DB impact:** none until `--write` is executed with credentials (dry-run verified: 12,088 seen = 3,602 duplicated + 8,486 valid + 0 invalid; deterministic across re-runs).
- **Risk:** low (default dry-run; live write is a deliberate, credentialed action).
- **Rollback:** no DB writes occur in dry-run; a `--write` run is reversible by re-running the prior canonical import (upsert semantics).

### Change 5 — Audit report corrections

- **Change:** `docs/CURRENT_STATE_REPORT.md` §12 appended: B5-CI (`branches: ain]`) was a terminal-rendering false positive (bytewise check: triggers were always `[main]`); B5 root cause inverted (missing `embedding_768` column, not a wrong function); migration locations clarified; Phase-1 audit-trail bug documented.
- **Reason:** Master Command — reports must stay honest; verification overturned two audit claims.
- **Files:** docs/CURRENT_STATE_REPORT.md.
- **DB impact:** none. **Risk:** none. **Rollback:** delete §12.

---

## 2026-09-29 — Phase 4 Execution (website activation, B3 + Master Rule 5)

### Change 1 — 6.5 MB snapshot out of every client bundle (B3)

- **Change:** `lib/site/data.ts` no longer imports `lib/inventory/snapshot.json` (was pulled into every client page via HZDATA, and fed a fabricated mapping layer: `egpM || 8.5`, synthetic `ai` scores, fake "Verified Portfolio" tags, and an 8-hardcoded-fictional-listings fallback on empty snapshot). `unitsFor`/`findListing` are snapshot-free. New `lib/site/usePublicListings.ts` hook fetches `/api/inventory?limit=` with module-level caching — the single client-side source of real units. `PropertiesPage` starts empty with an honest loading state; `HomePage`/`AiEnginePage`/`AdvicePage`/`PropertyShowcaseVideo` wired to the hook. Server-side snapshot consumers (API routes, sitemap, metadata) unchanged — server memory only.
- **Reason:** Audit B3 + Phase 1.5 gap: the fabricated fallback layer inside data.ts survived the first sweep.
- **Files:** lib/site/data.ts, lib/site/usePublicListings.ts (new), 5 client pages/components.
- **DB impact:** none. **Risk:** low (pages show honest loading/empty states instead of stale bundled data). **Rollback:** git revert.

### Change 2 — /matches wired to the real matching engine (Phase 4 P0)

- **Change:** `MatchesPage` rewritten from client-side scoring over the static catalog to debounced `POST /api/matches` (budget 40 / beds 20 / type 15 / zone 15 / AI 10), rendering engine scores WITH match reasons (master spec: explainable matches), honest loading/error/empty states, removed the unsupported yield filter. EGP/USD budget input converted to the USD figure the engine scores against.
- **Reason:** Roadmap Phase 4/6 — the deterministic engine was orphaned from UI.
- **Files:** app/(site)/matches/MatchesPage.tsx.
- **DB impact:** none (read-only scoring). **Risk:** low. **Rollback:** git revert.

### Change 3 — property detail: one row, not the whole inventory (B3b)

- **Change:** `PropertyDetail` now fetches `/api/listings/[id]` (single-row, honest 404) instead of downloading all of `/api/inventory` to find one unit; no invented defaults (beds `?? 0`, ai `?? 0` instead of `?? 3`/`?? 8.5`). Metadata resolver in `property/[id]/page.tsx` reads the DB row server-side first, snapshot second, drops fake `?? 3`/`?? 8.5` meta defaults. `sitemap.ts` + `page.tsx` no longer statically import the gitignored (missing on fresh clones) `@/data/whatsapp-ingested-units.json` — read defensively from disk like `/api/inventory` does (fixed two latent fresh-clone build breaks).
- **Reason:** Audit B3 + roadmap Phase 4.
- **Files:** app/(site)/property/[id]/PropertyDetail.tsx, app/(site)/property/[id]/page.tsx, app/sitemap.ts.
- **DB impact:** none. **Risk:** low. **Rollback:** git revert.

### Change 4 — admin dashboard honesty (partial)

- **Change:** `DashboardView` `FALLBACK_HOT_LEADS` (4 hardcoded "leads" with real-looking phone numbers shown when the API fails) → empty honest fallback; live-lead mapping stops inventing `score: 93+(i%6)` and default budgets/phones.
- **Reason:** Master Rule 5 for internal tools — staff must not act on people who never inquired.
- **Files:** app/admin/views/DashboardView.tsx.
- **DB impact:** none. **Risk:** none. **Rollback:** git revert.
- **Note (next block):** RECENT_ACTIVITIES synthetic feed + CRM stage PATCH wiring + `/api/inventory` service-role least-privilege remain open.

### Change 5 — test updated to the honest contract

- **Change:** `v12-quiet-luxury.test.ts` PropertyDetail case now asserts the honest pre-fetch state (renders "Loading listing", contains NO fabricated compound/spec data) instead of asserting the deleted static-catalog fallback.
- **Reason:** The old assertion required the fabrication path to keep working.
- **Files:** __tests__/v12-quiet-luxury.test.ts.
- **Verification:** tsc 0 errors (needs --max-old-space-size=6144; default heap OOMs); Jest 106/106 suites, 1,126/1,126 tests.
