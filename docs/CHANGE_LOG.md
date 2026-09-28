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
