# Sierra Estates — Backend Completions Audit & Patch Report

**Date:** 2026-11-12 · **Base:** `main` @ `851f4caf0` (cloned 2026-11-12, after the Antigravity frontend commits)
**Role:** Principal Backend Architect / AI Orchestration Lead / DevOps
**Boundary compliance:** edits confined to `app/api/**` only. No `components/**`, no `app/(site)/**`, no `package.json` changes, no commits, no installs written to manifests.

---

## Executive Summary

The four task areas were audited against the live HEAD. The codebase is in substantially better shape than the brief assumed: the DQE rule chain, two-tab Sheets bridge, OpenWA 240/day pacing, Telegram sub-500ms intake, `💎 GEM` auto-tagging, and PUBLISHABLE-only public exposure are **already implemented and test-covered** (57/57 DQE + all-pillars tests pass).

The audit found **one production-breaking bug** and **three functional gaps**, all fixed in-place in three existing route files (187 insertions, 15 deletions, 3 files):

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | `POST /api/viewing-requests` inserts 4 columns that exist in **no schema or migration** (`ceo_email`, `team_leader_email`, `sales_advisor_email`, `golden_hour_at`) → PostgREST rejects every insert (PGRST204) → **every public viewing request returns 500** | 🔴 Critical | Roster + golden-hour deadline parked in the real `notes` column; visitor message preserved |
| 2 | Golden Hour timer was a string inside calendar-event text — nothing operational ever acted on it | 🟠 High | Real `public.followups` row (type `viewing`, high priority, due at golden-hour deadline) so the CRM task board and `/api/cron/lead-timers` can act on it |
| 3 | 3-way calendar "dispatch" was a link only in the *visitor's* response — CEO / Team Leader / Sales Advisor never received anything | 🟠 High | Role-based Telegram dispatch (`TELEGRAM_CEO_CHAT_ID` / `TELEGRAM_TEAM_LEADER_CHAT_ID` / `TELEGRAM_SALES_ADVISOR_CHAT_ID` env chat ids) with honest per-role delivery reporting; no email provider exists in the repo, so no fake email channel was invented |
| 4 | `POST /api/inquiries` rejected the `/request` extended payload (zod stripped unknown keys silently) and returned no matches | 🟠 High | Schema extended (`campaign`, `discountPercent`, `voucherCode`, `dealType`, `compounds`, `unitType`, `bedrooms`, `finishing`, `budgetMin`, `budgetMax`, `targetDate`), campaign fields persisted to the `leads` mirror metadata, and **Top-3 matched units** returned via the same `rankMatches` engine + PUBLISHABLE gate as `/api/matches` |
| 5 | Sheet-webhook secret hardcoded (`SE_OUTREACH_SECRET_2026_CAIRO`) — no `SIERRA_SECRET_KEY` support | 🟡 Medium | `SIERRA_SECRET_KEY` env takes precedence; legacy value kept as fallback so the deployed Apps Script keeps working until rotated |

---

## Task 1 — Inventory, Sheets Sync & DQE: **already complete**

All rules verified present in `lib/services/SheetsIntegrationService.ts` (778 lines) and covered by `__tests__/e2e-supply-and-dqe.test.ts`:

- ✅ Phone gate: rejects missing/invalid, normalizes to E.164 `+20...` (Feature 15; duplicated-code and leading-zero repair included)
- ✅ `"NULL"` placeholder filling for all non-mandatory cells (Feature 16, `NULL_CELL` constant)
- ✅ Rent ceiling 400,000 EGP/month + auto-reclassify ≥ 1,000,000 EGP Rent → Resale (Feature 17, boundary tests at 400k/1M)
- ✅ Canonical compound dictionary incl. `cfc`/`كايرو فيستيفال`, `mvd`/`ميفيدا`, `hp`/`هايد بارك`, `mvhp` (Feature 18, 50+ aliases)
- ✅ `sync_hash` dedup with duplicates routing (Feature 19)
- ✅ Two-tab bridge: `Master_Inventory` + `Real_Available_Units`, mirror restricted to Available + Verified (Feature 20; tabs configurable via `MASTER_INVENTORY_TAB`/`REAL_AVAILABLE_TAB` env)
- ✅ Sanitizer: download route + inventory GET scrub owner phones from every string field to concierge `+201092048333` (`scrubOwnerContactText`, `lib/server/owner-privacy.ts`)
- ✅ Public exposure: PUBLISHABLE-only enforced **inside the query** in `/api/inventory` and `/api/listings` (defense-in-depth over RLS), PII columns not even grantable to anon role
- ✅ `/api/properties/sync`: Property Finder → canonical listings via `upsertCanonicalListing` with fingerprint identity — nothing to add; sheets handling already lives in the inventory/sync routes, so no duplicate bridge was created (per repo-hygiene rule 1)

**Gap fixed here:** webhook secret now env-first (finding 5).

## Task 2 — Inquiries, Matches, Calendar Dispatch: **three gaps fixed**

- `/api/inquiries`: extended payload + leads persistence + Top-3 matches (findings 4). Budget for the scorer derives from `budgetMax` → `budgetMin` → legacy `budget` string, EGP→USD at the same ÷50 rate the listings mapper uses. Matching is best-effort — it can never break the inquiry itself.
- `/api/viewing-requests`: PGRST204 crash fix + Golden-Hour followup row + 3-way dispatch (findings 1–3). New response fields: `goldenHourFollowupAt`, `calendarDispatch: [{role, delivered}]`.
- `proxy.ts` whitelist: **verified, no change needed.** `/request`-style public pages are not in the matcher's gated sets (`/admin/**`, `/api/internal/**`, `/api/orchestrate`); `/api/inquiries`, `/api/matches`, `/list-property` pass through with CORS headers and no session block. `middleware.ts` no longer exists as a file — Next 16 convention moved it to `proxy.ts`, which exports `proxy as middleware`.
- Note: `/request` as a literal route does not exist; the campaign form is the home-page inquiry (`portal_home_inquiry` → `/api/leads`) — the extended contract was therefore wired into `/api/inquiries`, which the api-client's `submitInquiry` calls.

## Task 3 — Workflows, OpenWA & AI Memory: **already complete**

- ✅ **OpenWA 240/day pacing** (`workflows/13-paced-outreach/paced-outreach.js`): 2 workers, Cairo window 12:00–20:00, 30 msgs / 2h slot → 4×30×2 = 240/day, 45–55s typing simulation, line-2 (concierge) hard-excluded, JSONL ledger, opt-out guard, `owner_outreach_log` audit, DRY_RUN mode. Feature 9 test enforces every constant.
- ✅ **Sub-500ms Telegram intake** (`workflows/12-telegram-intake/bot.js`): poll loop dispatches without awaiting; verified-watermark broadcast to General group + Property Finder feed wiring.
- ✅ **`💎 GEM` tagging** (`workflows/15-scribe-guardian/scribe.js`): ≥ 15% below compound average (per `deal_type`) → `is_featured_gem = true`, `tag = '💎 GEM'`, activity + learning events. Missing-photo GEMs: `/api/inventory/request-photos` already auto-alerts ops with owner media-request flow.
- ✅ **Market memory**: `packages/memory-engine` (brain RAG, New Cairo active-goal doctrine, Hyde Park resale policy vault) and `packages/deepseek-harness` (Hyde Park 2026 AVM, Q2-2026 Uptown Cairo scenarios) carry the 2026 baselines. Compound GIS benchmarks (`lib/gis/compound-polygons.ts`) supply `avgPriceSqmEgp` / rental yields used by the public map's GEM/discount math.

## Task 4 — Cleanup & Workflow Audit: **clean**

- All 13 `.github/workflows/*.yml` parse validly; CI uses `pnpm --filter` with package names that all exist (`sierra-estates-client-page`, `@sierra-estates/automations`, `./packages/*`). **No `TURBO_UI` references exist anywhere in the repo** (CI runs plain pnpm filters, not turbo) — nothing to set to `false`; flagging in case the brief targeted a different branch state.
- No stray `.bak`/`.tmp`/copy files, no stub-only route files, no duplicate route handlers under `app/api/`, no TODO/FIXME markers in allowed paths. Nothing to consolidate.

---

## Verification

| Gate | Result |
|---|---|
| Scoped `tsc` on the 3 edited files (app tsconfig, full type resolution) | **0 errors** (after fixing 7 errors found on first pass — 5 were use-before-declaration in my own dispatch block, 1 the `Listing` cast, caught and fixed before delivery) |
| Full-program `tsc` | Not runnable on this 4 GB host — kernel OOM-killed at every heap cap 2200–2900 MB (pre-existing environment limit, same as earlier in this session; not caused by these edits) |
| Targeted suites (DQE, all-pillars, concierge) | **75/75 pass** |
| Full root suite | **104 files, 1047 passed, 5 skipped, 0 failed** |

## Files Changed (all within the allowed boundary)

```text
apps/sierra-estates-realty/app/api/viewing-requests/route.ts   | 100 +++++++++--
apps/sierra-estates-realty/app/api/inquiries/route.ts          |  88 ++++++++-
apps/sierra-estates-realty/app/api/sync/sheet-webhook/route.ts |  14 ++-
3 files changed, 187 insertions(+), 15 deletions(-)
```

Patch: `download/sierra-estates-backend-completions.patch` — apply with `git apply sierra-estates-backend-completions.patch` from the repo root. Per the parallel-execution rules, **nothing was committed or pushed**; the working tree holds the changes.

## Env vars introduced (documented, all optional)

- `SIERRA_SECRET_KEY` — canonical sheet-bridge secret (falls back to the legacy Apps Script value)
- `TELEGRAM_CEO_CHAT_ID`, `TELEGRAM_TEAM_LEADER_CHAT_ID`, `TELEGRAM_SALES_ADVISOR_CHAT_ID` — per-role dispatch chats; unset roles are reported `delivered: false` in the response (honest, never fabricated)

## Follow-ups (not blocking, outside today's boundary)

1. The viewings-table roster columns could be added properly via a migration (043) if the ops dashboard should filter on them; today they live in `notes` which no dashboard parses yet.
2. `scripts/GoogleAppsScript_SierraEstates_Unified_Engine.gs` still hardcodes the legacy secret — rotate its `OUTREACH_SECRET` to read the same value you set in `SIERRA_SECRET_KEY` when convenient.
3. Golden-Hour followups only fire if something calls `/api/cron/lead-timers` (external scheduler) — confirm the cron is wired in your EC2/GitHub Actions lane.
