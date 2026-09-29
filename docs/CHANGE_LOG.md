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

---

## 2026-09-29 — Merge main ↔ origin/main (migration-set alignment)

### Change 1 — integrated remote repo-cleanup line (82827c2..bcf347d) with local Phase 2/3/4 line (5fa2d85, a7a8557)

- **Change:** Merge commit uniting two parallel consolidation efforts that had solved the same problem (B4: app-only migrations 011/012 invisible to root-based runs) differently. Remote (repo-cleanup session): canonical root `supabase/migrations/` keeping original names + force-tracked app copies (add-both rule, documented in `.gitignore` + `docs/REPO_CLEANUP_NOTICE.md`) + deletion of unreferenced root `tailwind.config.ts`/`postcss.config.mjs`. Local (Phase 2/3 session): same files renamed to dated names `20260924_011`/`20260925_012` + new `20260929_013_master_inventory_activation.sql`. **Resolution: remote naming wins** — the deploy-time runner (`scripts/apply-pending-migrations.mjs`) tracks applied migrations by filename+checksum in `public.schema_migrations`; the production ledger aligns with the original names, so keeping them means zero spurious re-applies and zero checksum mismatches. Local dated renames deleted (content byte-identical to originals — pure renames, nothing lost); `20260929_013` re-homed under the add-both rule (canonical root copy + force-tracked app copy, blob-identical).
- **Reason:** Naive merge would have left BOTH naming families in `supabase/migrations/` → 011/012 re-applied under new filenames against the production ledger (double-apply of 331+1,655 lines of DDL) and a missing app copy of 013 → turbo replay ENOENT (the exact 19:55 UTC / 22:0x UTC Vercel failure class the remote commits fixed).
- **Files:** supabase/migrations/ (canonical 6-file set), apps/sierra-estates-realty/supabase/migrations/ (mirror 6-file set, force-tracked), scripts/data-audit/import-master-inventory.mjs + app/admin/views/InventoryOsView.tsx (user-facing migration-name hints updated to canonical names).
- **DB impact:** none at merge time. Next deploy applies exactly one new migration: `20260929_013_master_inventory_activation.sql` (idempotent, additive: listings +source_verified_at/availability/publish_status, uq_listings_dupe_check_hash partial unique, broker_sessions TO service_role — see Phase 3 entry).
- **Risk:** low — verified post-merge: app==root content identity for all 6 migration files (blob-level), tsc 0 errors, Jest 106/106 suites 1,126/1,126 tests.
- **Rollback:** git revert of the merge commit.


---

## 2026-09-29 — Phase 4 completion (admin honesty + CRM persistence + least privilege)

### Change 1 — Executive Dashboard honest data wiring (operator-facing, Master Rule 5)

- **Change:** `DashboardView.tsx` fabricated-metrics sweep: KPI fallbacks ('585' catalog, '283' leads, 'EGP 142M' volume, invented growth %) → live `/api/admin/dashboard` values or '—'; "AI Match Precision 98.4% / AVM Tier 1 Verified" card → real "Conversion Rate" (closed/inquiries); rent/sale ratio, avg rent/sale, compound market share, price tiers → computed from real `/api/inventory` units with honest empty states; deal funnel (hardcoded 1,240/482/186/74) → computed from real lead pipeline stages; RECENT_ACTIVITIES (5 invented events incl. "585 verified units", "100% owner WhatsApp verified") → server's real `recentActivity` (actual inquiries + leads, newest first); hot-lead `?? 95` invented score → rendered only when a real score exists; "19 Channels Live / 12 owner + 7 broker" → registry-derived 15 active (8 owner + 7 broker, from `whatsappGroupRegistry.ts` 20 registered − 5 archived); "CANONICAL 585" → "CANONICAL SOURCE"; "460 Units / 100% De-duplicated" → live `activeListings` count or '—'; "460 verified units synchronized with AVM" → honest DB-sync description.
- **Also in this change:** `handleOpenClawTask` previously faked a 1.4s `setTimeout` then reported "✓ Completed" without calling any backend → now POSTs the real `/api/openclaw/scan-whatsapp-groups` and reports its actual result; `handleBroadcastFleet` claimed "✓ 10/10 Agents" while posting 4 → honest "4/4 (simulated)"; `handleRequestPurge`'s confirm showed "✓ Staging Cache Safely Purged" with zero backend action → honest "Guard demo completed — no data was touched (no purge backend is wired)".
- **Reason:** Phase 4 open block (CHANGE_LOG Phase 4 note) + audit: the executive dashboard is the operational source of truth for staff; every hardcoded number above was invented and provably false (Phase 1 found 8,486 unique units, 0 publishable).
- **Files:** app/admin/views/DashboardView.tsx.
- **DB impact:** none (read-only API calls). **Risk:** low — dashboard shows '—'/empty states until live data arrives; that is the intended honest behavior. **Rollback:** git revert.

### Change 2 — server-side avgAiScore fabrication removed

- **Change:** `/api/admin/dashboard` computed `avgAiScore` by inventing 8.5/9.5 for listings without a score (and 8.8 when empty) → now the true mean over listings that carry a real numeric `aiScore`, `null` when none; `DashboardKPIs.avgAiScore` type widened to `number | null`. No UI consumer renders it today.
- **Files:** app/api/admin/dashboard/route.ts, lib/types.ts.
- **DB impact:** none. **Risk:** low. **Rollback:** git revert.

### Change 3 — CRM stage/hot persistence (P1, client journey: MATCHING → SELECTION)

- **Change:** AdminPortal `LeadsPage` `advanceStage`/`toggleHot` were local-React-state only — every stage change vanished on refresh (CRM lifecycle broken at its core interaction) and were indexed against the FILTERED list while mutating the UNFILTERED array (any active filter mutated the wrong lead). Now: optimistic update by lead `id` + `PATCH /api/admin/leads/[id]` (existing endpoint, zod-validated, admin-guarded, maps SPA stage labels to `pipeline_stage`), with revert + visible inline error banner on failure.
- **Reason:** Phase 4 open block; journey stages cannot be tracked if changes don't persist.
- **Files:** app/admin/AdminPortal.tsx.
- **DB impact:** none (uses existing PATCH route). **Risk:** low. **Rollback:** git revert.

### Change 4 — /api/inventory least privilege (P1, security)

- **Change:** public inventory endpoint read via service-role (`getSupabaseAdmin`), bypassing RLS and trusting a client-side WHERE to protect public visibility → now reads via anon client (`getSupabase`) under the database's public RLS policy ("Public can view active listings": status='active' or staff), and the query filter tightened from `.in(status, [active, available])` to `.eq(status, active)` to match the policy exactly. Anon-env absence degrades gracefully to the existing fallback chain (domain → live sheet → snapshot).
- **Reason:** Phase 4 open block; a public endpoint holding a god key violates least privilege — a mapping mistake would publish drafts/owner PII.
- **Files:** app/api/inventory/route.ts.
- **DB impact:** none. **Risk:** low-medium — requires `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deploy env (already the documented default in .env.local.example). **Rollback:** git revert.

### Change 5 — tests updated to the honest contract

- **Change:** `admin-views.test.tsx` + `admin-views-enhanced.test.tsx` previously asserted the fabrications ('585', '98.4%', '19 Channels Live') — updated to assert Conversion Rate card, honest '—'/empty states, and the registry-derived 15-channel count.
- **Files:** __tests__/admin-views.test.tsx, __tests__/admin-views-enhanced.test.tsx.
- **Verification:** tsc 0 errors (NODE_OPTIONS max-old-space 6144); Jest 106/106 suites, 1,126/1,126 tests (--maxWorkers=2).

---

## 2026-09-29 — Phase 5 + 6 + 7 (hard-constraint matching engine, bot profile gap-fill, client-journey test)

### Change 1 — hard-constraint matching engine (P0, Phase 6)

- **Change:** scoring extracted from the route into a pure, unit-tested module `lib/server/match-scoring.ts`. Budget is now a **ceiling** (was soft "±25% full marks" — a 50%-over-budget listing could rank #1 as a normal result), minimum bedrooms a **hard floor** (a 2BR could previously outrank a 4BR for a 4BR ask). Violators can ONLY surface as explicitly flagged alternatives (`alternative: true` + `hardConstraintViolations[]`), and only when compliant results cannot fill the limit. Soft ranking weights preserved: budget fit 40 / beds 20 / type 15 / zone 15 / AI 10. `/api/matches` route now delegates to the module; `MatchResult` type carries the new fields; `/matches` page renders an explicit "Alternative — violates hard constraints" banner on flagged results.
- **Reason:** Master-spec Phase 6 acceptance: "never returns a hard-constraint violator except explicitly flagged 'alternatives'; every result traceable to a DB row."
- **Files:** lib/server/match-scoring.ts (new), app/api/matches/route.ts, lib/types.ts, app/(site)/matches/MatchesPage.tsx.
- **DB impact:** none. **Risk:** low. **Rollback:** git revert.

### Change 2 — PropertyMatchmaker hard-contract parity (agents-core)

- **Change:** `ClientProfile` extended with dealType/furnishing/moveInDate/nationality/specialRequirements (Phase 5 set); `MatchResult` gains `hardConstraintViolations` + `alternative`; `rankProperties` returns compliant-first, flagged-alternatives only when short.
- **Files:** packages/agents-core/src/property-matcher.ts.
- **DB impact:** none. **Risk:** low (backward-compatible signature). **Rollback:** git revert.

### Change 3 — bot qualification profile gap-fill (Phase 5)

- **Change:** WhatsAppConversationalService Gemini extraction now captures the full master-spec profile — minBedrooms, furnishing, moveInDate, nationality, specialRequirements — with an explicit hard-constraint vs soft-preference split and "never invent unstated values" instructions; all stored into `aiProfiling.preferences`.
- **Reason:** previously only compound/unitType/budget/urgency were captured; four required profile fields were silently dropped.
- **Files:** lib/services/WhatsAppConversationalService.ts.
- **DB impact:** none (JSONB field). **Risk:** low. **Rollback:** git revert. Live E2E pending Gemini key.

### Change 4 — Phase 7 first real client test (personas A–E)

- **Change:** new suite `__tests__/client-journey-personas.test.ts` runs the five scripted personas (exact / vague / international-EN / no-match / contradictory 4BR-villa-Madinaty-≤50k) through the REAL engine against the REAL 8,486-unit master inventory CSV — zero invented fixtures. Asserts: compliant results satisfy budget cap + bedroom floor; violators only ever appear flagged; the client-facing set (PUBLISHABLE = 0 today) is represented honestly. Findings + acceptance recorded in `docs/CLIENT_TEST_REPORT.md` and `tests/client-journey/README.md`.
- **Files:** __tests__/client-journey-personas.test.ts (new), __tests__/match-scoring.test.ts (new, 8 tests), docs/CLIENT_TEST_REPORT.md (new), tests/client-journey/README.md (new).
- **DB impact:** none. **Risk:** none (tests). **Rollback:** delete files.
- **Verification:** tsc 0 errors; Jest 108/108 suites, 1,143/1,143 tests.

---

## 2026-09-29 — Phase 8 (VIEWING: table consolidation + public request flow)

### Change 1 — viewing tables consolidated (migration 014, non-destructive)

- **Change:** `public.viewings` is now the single canonical viewing table: gained the request-capture fields it lacked (`property_code`, `visitor_name/phone/email`, `preferred_date/time`, `number_of_people`, `message`, `source`, `calendar_link`). Legacy `viewing_requests` rows copied in (status pending→pending_approval, confirmed→scheduled); legacy `viewing_appointments` rows copied in (had zero writers — dead schema); both old tables FROZEN with deprecation comments, NOT dropped (full rollback safety). Idempotent, additive-only.
- **Reason:** Roadmap Phase 8 "consolidate 3 viewing tables → one"; three overlapping tables with three status vocabularies made the journey untrackable.
- **Files:** supabase/migrations/20260930_014_viewing_consolidation.sql (+ force-tracked app copy, add-both rule), supabase/schema.sql baseline + app mirror.
- **DB impact:** next deploy applies 014 (additive; no data loss; old tables retained). **Risk:** low. **Rollback:** revert migration file — all data remains in old tables.

### Change 2 — public viewing-request flow wired (PROPERTY → REQUEST → SLOT → CONFIRM)

- **Change:** `/api/viewing-requests` POST repurposed from an orphaned admin-guarded endpoint (zero UI consumers) to the PUBLIC form: rate-limited, zod-validated (future date, phone format), upserts the visitor as a lead by phone (source website, `pipelineStage: 'viewing'`, status 'Viewing Requested'), writes ONE canonical `viewings` row (pending_approval), fires a Telegram ops alert (fire-and-forget), and returns confirmation links that carry the REAL chosen slot. GET stays admin-guarded and now reads the canonical table.
- **Change:** PropertyDetail replaces the fabricated `.ics` download — the old block shipped a HARDCODED PAST DATE (2026-09-01) to clients — with a real "Request a Viewing" form (date/time slot, name, phone) that POSTs the endpoint, then offers WhatsApp confirmation + Google Calendar add with the real date. The WhatsApp deep-link CTA remains as a secondary channel.
- **Reason:** Master-spec journey stage VIEWING had no entry point: the property page could not create a DB record at all, and the only public viewing route required an existing leadId (concierge-only).
- **Files:** app/api/viewing-requests/route.ts (rewritten), app/(site)/property/[id]/PropertyDetail.tsx.
- **DB impact:** new rows in `viewings` + `leads` only. **Risk:** low. **Rollback:** git revert.
- **Verification:** __tests__/viewing-request-public.test.ts 7/7 (lead upsert, canonical row, real-date links, existing-lead reuse, past-date/name/phone validation, lookup-failure resilience, admin GET guard). tsc 0 errors; Jest 109/109 suites, 1,150/1,150 tests.

---

## 2026-10-01 — Phase 9 (POST-VIEWING FEEDBACK)

### Change 1 — viewing feedback layer (migration 015, additive)

- **Change:** `public.viewing_feedback` — ONE row per viewing (UNIQUE(viewing_id)) with three sides: sales report (unit accuracy, client reaction, price reaction, objections[], interest level, next action, notes), token-gated client survey (rating 1-5, comment, would-recommend), manager combined review (pending_review → approved | needs_changes). `viewings` gains `survey_token` + `survey_sent_at` (48-hex capability token minted at completion, unique partial index). RLS staff-only (no anon policy — the token IS the capability; the public endpoint validates it server-side).
- **Reason:** Roadmap Phase 9: post-viewing feedback forms + combined analysis view for manager approval — the loop after Phase 8's viewing lifecycle had no capture layer.
- **Files:** supabase/migrations/20261001_015_viewing_feedback.sql (+ force-tracked app copy, add-both rule), supabase/schema.sql baseline + app mirror.
- **DB impact:** next deploy applies 015 (additive; new table + nullable columns only). **Risk:** low. **Rollback:** revert migration file (additive-only; drop optional).

### Change 2 — feedback APIs (admin upsert/review + public survey)

- **Change:** `GET /api/admin/viewings` lists viewings with the feedback row merged (status filter). `PATCH /api/admin/viewings/[id]` enforces LEGAL lifecycle transitions only (pending_approval→scheduled|cancelled; scheduled→completed|cancelled|no_show; terminals locked), audits each move to audit_logs with the acting admin; completing mints the survey token and enqueues the REAL WhatsApp survey message (`enqueueWhatsAppJob`, purpose 'viewing-followup'). `PUT /api/admin/viewings/[id]/feedback` upserts the sales report (zod vocabularies mirrored from the SQL CHECKs), resets manager review on re-submit, and nudges the lead's CRM state (offer/renegotiate→negotiate, second_viewing→viewing; hot/lost→hot flag) — the migration-016 trigger audits that stage change. `PATCH` = manager review (approve / needs_changes + notes). Public `GET/POST /api/viewing-feedback` is token-gated: GET returns survey context (first name only — no phone/email PII); POST accepts one submission per token (409 on repeat / non-completed viewing).
- **Reason:** three-sided feedback loop with zero fabricated data; every write audited.
- **Files:** app/api/admin/viewings/route.ts, app/api/admin/viewings/[id]/route.ts, app/api/admin/viewings/[id]/feedback/route.ts, app/api/viewing-feedback/route.ts, lib/server/viewing-feedback-shared.ts (single vocabulary source shared by SQL/tests/UI), lib/models/schema.ts (purpose union + 'viewing-followup').
- **DB impact:** rows in viewing_feedback / whatsapp_queue / audit_logs. **Risk:** low. **Rollback:** git revert.

### Change 3 — admin ViewingsView + public survey page

- **Change:** Admin "Viewings & Feedback" board (nav: Operations): real-data table (visitor, unit, source, status chips, feedback/review indicators), filter chips with counts, Schedule/Complete/Cancel/No-show actions, and the combined-analysis modal (① sales report form ② client survey read-only ③ manager approve/request-changes) — honest loading/error/empty states, zero seeded demo rows. Public `/viewing-feedback?token=…` page: star rating + comment + recommend toggle, honest invalid/expired/already-submitted states, noindex.
- **Files:** app/admin/views/ViewingsView.tsx (new), app/admin/views/index.ts, app/admin/AdminPortal.tsx (nav + case), app/admin/views/data-constants.ts, app/(site)/viewing-feedback/{page.tsx,FeedbackForm.tsx}, app/site-styles/viewing-feedback.css.
- **DB impact:** none beyond the APIs above. **Risk:** low. **Rollback:** git revert.

---

## 2026-10-01 — Phase 10 (CRM PIPELINE UNIFICATION)

### Change 1 — single status vocabulary + transition audit (migration 016)

- **Change:** `pipeline_stage` declared THE canonical lead vocabulary (4 overlapping ones existed). `leads.status` becomes a derived coarse projection: `lead_status_for_stage()` pure mapping + BEFORE UPDATE trigger `trigger_leads_status_sync` (fires only when the stage actually changes; manual lost/nurture edits survive until the next stage move). Legacy free-form `'Viewing Requested'` rows NORMALIZED to `'viewing_scheduled'` BEFORE the CHECK is swapped to the clean 8-value list. Every stage/status change now writes a transition record into `orchestration_history` (reused table per roadmap) via SECURITY DEFINER trigger `trigger_leads_stage_audit` with pinned search_path.
- **Reason:** Roadmap Phase 10 "single status vocabulary across the 4 overlapping ones; transition audit".
- **Files:** supabase/migrations/20261001_016_crm_pipeline_unification.sql (+ app copy, add-both rule), supabase/schema.sql baseline + app mirror (check + functions + triggers + comments).
- **DB impact:** next deploy applies 016: UPDATE normalize (Viewing Requested→viewing_scheduled) + CHECK swap + 2 triggers. **Risk:** low (normalize precedes swap; DROP/ADD constraint is metadata-only). **Rollback:** revert migration file; data value change is semantic-preserving.

### Change 2 — canonical writers + actor-context audit

- **Change:** all 3 writers of the legacy value (`/api/viewing-requests`, `/api/leads/request-viewing` ×2) now write `'viewing_scheduled'`. Lead PATCH handler records `lead.stage_change` in audit_logs with the ACTING ADMIN as actor (complements the DB trigger's row-level record with actor context). `WhatsAppMessagePurpose` extended with 'viewing-followup'.
- **Files:** app/api/viewing-requests/route.ts, app/api/leads/request-viewing/route.ts, app/api/admin/leads/[id]/route.ts, lib/models/schema.ts, __tests__/viewing-request-public.test.ts (assertion updated to the canonical contract).
- **DB impact:** none (values). **Risk:** low. **Rollback:** git revert.

### Change 3 — lead automation timers (cron)

- **Change:** `lib/server/lead-timers.ts` pure decision logic: per-stage SLAs (viewing 2d tightest → handover/contract 14d), staleness from REAL leads.updatedAt, open-followup dedupe, overdue flip selection. `GET /api/cron/lead-timers` (CRON_SECRET-guarded): flips overdue followups, creates deduped call/WhatsApp followups for stale leads quoting the real stage + real days, writes ONE honest summary activity (zero-run says 0). Deliberately NOT registered in vercel.json — the Hobby tier allows only the 2 existing crons; scheduling consolidates in Phase 11 (EC2/GHA), endpoint is invocable externally meanwhile.
- **Reason:** Roadmap Phase 10 "lead automation timers".
- **Files:** lib/server/lead-timers.ts, app/api/cron/lead-timers/route.ts.
- **DB impact:** followups rows (pending→overdue flips; new timer rows) + one activities row per run. **Risk:** low (deduped, bounded reads 500). **Rollback:** git revert; delete stray followups createdBy='lead-timers'.

- **Verification (Phase 9+10):** tsc 0 errors (NODE_OPTIONS max-old-space 6144); Jest 111/111 suites, 1,192/1,192 tests (new: phase9-viewing-feedback 30 tests, phase10-crm-pipeline 12 tests); migrations 015/016 blob-identical app mirrors verified by test; repo-wide walk asserts no app writer of the legacy status remains.

## 2026-10-01 — Phase 11 (AUTOMATION UNIFICATION)

### Change 1 — Dispatcher: one scheduled entry point for all 10 cron jobs

- **Change:** New `GET /api/cron/dispatch/[job]` (night | morning | any single job). Invokes the existing job routes IN-PROCESS (dynamic import + NextRequest with the propagated Authorization header — no self-fetch), so every scheduling path shares the same fail-closed `verifyCronRequest`/`cronOwnerGuard` gate. Per job: own try/catch (isolation), `automation_runs` ledger row (status/duration/trigger-source/truncated response), DLQ upsert on failure, DLQ resolution on success, and a dedupe guard (skip when a success fresher than the job's window exists; `?force=1` bypass). HTTP 500 when any job failed → both schedulers treat it as "retry" and the dedupe guard makes the retry execute only the failures.
- **Reason:** Roadmap Phase 11 "unify crons". 10 cron endpoints existed but only 2 were scheduled (Vercel Hobby cap) — maintenance, expire-reservations, lead-timers, availability-SLA, master-sheet/sheets ingestion and the WhatsApp drain had NO trigger at all; nothing recorded whether a job ever ran or failed.
- **Files:** app/api/cron/dispatch/[job]/route.ts (new), lib/server/automation-jobs.ts (new registry: 10 jobs, windows, dedupe hours), lib/server/automation-run.ts (new ledger/DLQ helpers, fail-soft by design).
- **DB impact:** new `automation_runs` table (migration 017). **Risk:** low — dispatcher only orchestrates existing, individually-tested routes. **Rollback:** git revert; drop table.

### Change 2 — Scheduling off the Hobby limit (Vercel 2-slot fallback + GHA canonical)

- **Change:** BOTH vercel.json files (root + app) now carry exactly 2 crons — `dispatch/night` @ 02:00 UTC, `dispatch/morning` @ 06:00 UTC (previously the root file declared 7 crons, which the Hobby plan cannot register, and the app file spent its 2 slots on sync-leads/sync-listings only). New canonical scheduler `.github/workflows/automations.yml`: hourly whatsapp-dispatch, 3-hourly lead-timers + check-availability-sla, both daily windows (10 min offset from Vercel's slots), daily sync-leads at 10:10 UTC (preserves the historical 10:00 hour), manual workflow_dispatch matrix over EVERY job incl. apply-migrations, `curl --retry 3 --retry-all-errors`, hard-fails when CRON_SECRET is unconfigured. Superseded `.github/workflows/crm-automation-crons.yml` deleted (its hourly whatsapp-dispatch + manual triggers are subsumed). `apply-migrations` is deliberately in NO window and NO schedule — DDL moves only as a deliberate act.
- **Reason:** Roadmap "move off Hobby limits → GHA"; dual independent schedulers + dedupe guard = either side failing still leaves the other running the work.
- **Files:** vercel.json, apps/sierra-estates-realty/vercel.json, .github/workflows/automations.yml (new), .github/workflows/crm-automation-crons.yml (deleted).
- **DB impact:** none. **Risk:** medium — requires the CRON_SECRET repository secret in GitHub for the GHA leg (Vercel leg works without it). Without the secret GHA runs fail visibly, they never run jobs silently. **Rollback:** git revert (previous vercel.json cron entries restored).

### Change 3 — Migration 017: automation_runs ledger + DLQ lifecycle (additive)

- **Change:** `20261001_017_automation_runs.sql`: `public.automation_runs` (job, trigger_source, status ∈ success|failed|skipped, started/finished, duration_ms, attempt, summary JSONB, error) with staff-read RLS (service-role writes only) + (job, started_at DESC) index and a partial failures index. `failed_orchestrations` (existed since workflow-studio, never had a writer) gains `resolved_at TIMESTAMPTZ` + open-queue partial index — the dispatcher upserts failures under pipeline `cron:<job>` (attempts++ on the open entry, no row-stacking) and marks them resolved when the same job later succeeds. Baseline schema.sql updated; app mirror synced (add-both rule, blob-identical).
- **Reason:** Roadmap Phase 11 "retryable + observable automations (DLQ exists)".
- **Files:** supabase/migrations/20261001_017_automation_runs.sql (+ app mirror), supabase/schema.sql (+ app mirror).
- **DB impact:** the migration itself (additive; no drops/renames). **Risk:** low. **Rollback:** drop automation_runs, drop column resolved_at.

- **Verification (Phase 11):** tsc 0 errors; Jest 112/112 suites, 1,211/1,211 tests (new phase11-automation-dispatch suite: 19 tests — registry↔disk↔handler-map invariants, window fan-out, auth propagation, clean sub-request URLs, failure isolation + retry signal, dedupe skip + force bypass, owner-mismatch skip, fail-closed 401, Hobby-cap config contract on both vercel.json files, GHA schedule/retry contract, retired-workflow assertion). The suite caught one real bug pre-merge: `?force=1` was read but not wired into the dedupe guard.

## 2026-10-01 — Phase 12 (ADMIN CONTROL CENTER)

### Change 1 — Data Integrity Control Center (dashboard API + widgets)

- **Change:** `/api/admin/dashboard` extended with two guarded sections. `inventoryHealth`: source-evidence freshness buckets (≤30d / 30–90d / >90d / never, from listings.source_verified_at), publishability cascade distribution (publish_status counts, NULL → UNCLASSIFIED), staff-verification queue (verified !== true), dupe bookkeeping (rows without dupe_check_hash) — every number a real count over the listings projection, zero defaults. `automationHealth`: per-job last run folded from automation_runs (newest-first) + open dead-letter count. Degradation contract: when the 013 projection or the 017 ledger is unavailable (migration not applied), the endpoint retries the core KPI read WITHOUT the new columns and reports the section as null — never fabricates zeros, and a pending migration can never take the dashboard down. DashboardView renders four control-center widgets (Freshness bars, Publish Readiness chips, Verification Queue, Automation Health with DLQ badge) with bilingual labels and honest empty / "not available" states; fake KPIs were already gone since Phase 4.
- **Reason:** Roadmap Phase 12 "Reuse /api/admin/dashboard; add inventory-freshness, duplicates, needs-verification widgets; remove fake KPIs" — plus the Phase 11 ledger as the natural fourth widget (automation health).
- **Files:** app/api/admin/dashboard/route.ts, lib/types.ts (DashboardKPIs + inventoryHealth/automationHealth), app/admin/views/DashboardView.tsx.
- **DB impact:** none (reads only). **Risk:** low. **Rollback:** git revert.

- **Verification (Phase 12):** tsc 0 errors; Jest 113/113 suites, 1,217/1,217 tests (new phase12-control-center suite: 6 tests — bucket math over real-shaped rows, newest-first automation fold, empty-database honesty, 013-missing degradation (inventoryHealth null + core KPIs intact + automation section still working), 017-missing degradation, widget headers + not-available render).

## 2026-10-01 — Phase 13 (QA + SECURITY)

### Change 1 — B12 fixed: cron secret no longer crosses to the browser

- **Change:** New `POST /api/admin/leads/sync-pf` (admin-session-authenticated): invokes the PF sync cron endpoint IN-PROCESS with the server-side CRON_SECRET header (Phase 11 dispatcher pattern) and returns the summary. AdminPortal's "Sync Property Finder" button now calls this proxy with NO secret in the request — previously it called /api/cron/sync-leads directly with `Bearer ${NEXT_PUBLIC_CRON_SECRET || 'sierra-cron'}`, client-inlining the cron secret into the admin bundle with a guessable fallback literal (audit B12). Repo-wide rule pinned by test: no source file references NEXT_PUBLIC_CRON_SECRET.
- **Files:** app/api/admin/leads/sync-pf/route.ts (new), app/admin/AdminPortal.tsx.
- **DB impact:** none. **Risk:** low. **Rollback:** git revert.

### Change 2 — WhatsApp webhook HMAC hardened (defense in depth)

- **Change:** X-Hub-Signature-256 verification now (a) uses the correct secret (WHATSAPP_APP_SECRET — Meta signs with the App secret; it previously "verified" against the API *token*), (b) rejects a PRESENTED signature when no app secret is configured (403, unverifiable = rejected), (c) rejects wrong signatures (403). Unsigned traffic remains allowed because the fail-closed shared-secret gate (SBR_SECRET_KEY, 503 when unconfigured / 401 when wrong) already authenticates automation bridges — documented in the route. `verifyMetaSignature` itself no longer returns true on missing inputs (was fail-open).
- **Reason:** Roadmap Phase 13 "webhook HMAC" + the house fail-closed philosophy (cron-auth / webhook-auth).
- **Files:** app/api/webhooks/whatsapp/route.ts.
- **DB impact:** none. **Risk:** medium — a Meta deployment that was relying on the broken token-based check must set WHATSAPP_APP_SECRET; unsigned bridge traffic is unaffected (tested).
- **Rollback:** git revert.

### Change 3 — QA suites: data QA (pipeline invariants) + bot QA matrix (contract) + security sweep

- **Change:** `phase13-data-qa.test.ts` runs the Phase 1 pipeline's own invariants against the REAL master inventory CSV: 12,088 rows = 8,486 unique + 3,602 duplicates (audit contract pinned), globally unique unit_ids, 0 self-referencing / 0 dangling duplicate_of chains, PUBLISHABLE honestly zero, price-validity share in the audit's ~36% band (3,081/8,486 = 0.363 via the pipeline's own price_validity column). Bot QA matrix at contract level (Gemini E2E remains blocked on the API key — documented): hard/soft split, no-invention rule, all 5 Phase 5 gap-fill fields present in the extraction prompt; lead mapping preserves unknowns as null (`?? null`, no invented defaults) — AR/EN/mixed/vague/contradictory inputs all flow through this same contract. `phase13-security-sweep.test.ts`: B12 regression scans, sync-pf proxy behavior (401 / in-process auth propagation / 502 upstream), HMAC matrix (forged 403, unverifiable 403, correct 200, unsigned allowed), service-role least-privilege pin (public /api/inventory stays on the anon client under RLS), and a secrets scan (no credential-shaped literals — sk-/ghp_/AKIA/AIza/xoxb-/Supabase-JWT — in committed source, fixtures excluded).
- **Reason:** Roadmap Phase 13 "Data QA suite, bot QA matrix, matching QA (covered by Phase 6 suites + personas), integration QA (113 existing suites), security sweep".
- **Files:** __tests__/phase13-data-qa.test.ts, __tests__/phase13-security-sweep.test.ts (new).
- **DB impact:** none. **Risk:** low. **Rollback:** git revert / delete files.

- **Verification (Phase 13):** tsc 0 errors; Jest 115/115 suites, 1,239/1,239 tests (+22). Two real defects found and fixed while building the suites: the secrets-scan walk initially passed a string where the walker expects an array (iterated path characters → walked the whole filesystem → hang; fixed + guarded with a comment), and the CSV parser transcription had dropped the character-accumulate branch (all columns parsed empty; fixed to match the personas suite's parser).
