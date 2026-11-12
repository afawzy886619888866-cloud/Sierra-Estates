# Sierra Estates — Backend Completions: End-to-End Audit, Fixes & Landing Report

**Date:** 2026-11-12 · **Repo:** `afawzy886619888866-cloud/Sierra-Estates` · **Final main head verified:** `afcb67557` (CI green)
**Role:** Principal Backend Architect / AI Orchestration Lead / DevOps
**Outcome:** all findings fixed, all follow-ups closed, ten PRs squash-merged to `main` across the session (**#45** `d62337b03`, **#46** `c22ac4848`, **#47** `8a16ec080d`, then recovery **#48–#54**), both pre-existing `main`-branch breakages repaired, and — after the evening production outage — **both production sites restored and verified healthy** (Part 5).

---

## Executive Summary

The original audit (Task 1–4) found **one production-breaking bug** and **three functional gaps**; all four were fixed. The three follow-ups from that audit (viewings migration, Apps Script secret rotation, lead-timers cron) were then completed. Landing on `main` surfaced two **pre-existing** breakages that had been hiding behind a broken lint gate — a `turbo.json` parse error introduced by a Vercel bot commit and a pure-mode CSS-modules violation in the new CartographicMap stylesheet — both root-caused and fixed. Applying migration 043 then exposed a four-deep chain of pipeline breakages (PRs #48–#52) that had silently kept Supabase env vars off the Vercel projects, causing a **production outage of both sites**; the last mile (PRs #53–#54) repaired the env-sync itself and production recovered (Part 5). Final state: **CI fully green, both production sites verified healthy** (client 21:00 UTC, admin 21:34 UTC, 2026-11-12).

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `POST /api/viewing-requests` inserted 4 columns existing in **no schema or migration** → PostgREST PGRST204 → **every public viewing request returned 500** | 🔴 Critical | ✅ Fixed (PR phase 1) + hardened with migration 043 (PR #45) |
| 2 | Golden Hour timer was text inside a calendar event — nothing operational acted on it | 🟠 High | ✅ Fixed: real `followups` row + real `golden_hour_at` column (PR #45) |
| 3 | 3-way "dispatch" reached only the visitor — CEO / Team Leader / Sales Advisor got nothing | 🟠 High | ✅ Fixed: per-role Telegram dispatch with honest delivery reporting |
| 4 | `POST /api/inquiries` silently stripped the extended `/request` payload and returned no matches | 🟠 High | ✅ Fixed: schema extended, campaign fields persisted, Top-3 matches via `rankMatches` + PUBLISHABLE gate |
| 5 | Sheet-webhook secret hardcoded; no rotation path | 🟡 Medium | ✅ Fixed end to end: `SIERRA_SECRET_KEY` chain across webhook, `GoogleSheetSyncService`, both Apps Script engines (Script Property with legacy fallback), easy-listing documented |
| 6 | `turbo.json` carried invalid `tags` keys (Vercel bot commit `e5f16bf03`, PR #43) → **every `turbo run` on `main` failed**, including `pnpm lint` | 🔴 Critical (pre-existing) | ✅ Fixed (PR #46) |
| 7 | `CartographicMap.module.css` shipped fully-global selectors — invalid under Next's pure-mode css-loader → **deterministic build failure**, mislabeled by the CI retry wrapper as a network flake | 🔴 Critical (pre-existing) | ✅ Fixed + fast purity check + signature-gated retry (PR #47) |

---

## Part 1 — The original four fixes (route-level)

All in `apps/sierra-estates-realty/app/api/**` (boundary-respecting; landed to `main` by the parallel frontend agent as `5ca6716eb`):

1. **`viewing-requests/route.ts`** — roster + deadline out of the phantom columns; followups row; role-based Telegram dispatch; per-role delivery reported honestly (no email provider exists in-repo, so none was invented).
2. **`inquiries/route.ts`** — extended payload accepted and persisted; Top-3 matched units returned through the same engine and PUBLISHABLE gate as `/api/matches`.
3. **`sync/sheet-webhook/route.ts`** — `SIERRA_SECRET_KEY` env-first with legacy fallback.

`proxy.ts` was audited and needs no change (public inquiry/matches routes pass through with CORS; no session block).

## Part 2 — The three follow-ups (closed by PR #45)

1. **Migration 043** (`supabase/migrations/20261112_043_viewing_dispatch_golden_hour_columns.sql`, mirrored byte-identically to the app migrations dir per the parity test): `viewings` gains `ceo_email`, `team_leader_email`, `sales_advisor_email`, `golden_hour_at`. The route now writes the real columns first and, on a project where 043 is not yet applied (PostgREST `Could not find the 'ceo_email' column`), retries once with the roster parked in `notes` — the public form never 500s either way. `schema.sql` updated to match.
2. **Secret rotation chain** — `SIERRA_SECRET_KEY` now wins on every side: the Next.js webhook, `GoogleSheetSyncService` (→ `SHEETS_WEBAPP_SECRET` → `WF_SHEET_WRITE_SECRET` → legacy), and both Apps Script engines (`PropertiesService.getScriptProperties().getProperty("SIERRA_SECRET_KEY") || legacy`). The engines' guidance dialogs render the live value; the easy-listing browser tool documents its Settings-dialog override (no env access client-side).
3. **lead-timers scheduling — verified, no change needed.** `automations.yml` already dispatches `lead-timers,check-availability-sla` every 3 hours (`25 */3 * * *`) through the Phase 11 dispatcher (dedupe window + DLQ + retry-on-500). The Golden-Hour rows the fixed route writes become actionable through that existing lane.

**Also audited:** `GET/POST /api/leads` (the home hero form path) — already correct (`intent`→`mode` mapping, `portal_home_inquiry` → `website` normalization with raw token preserved in `origin_channel`, WhatsApp queue + Telegram wired). No fix needed. **Sweep for other phantom-column writers of `viewings`:** none (admin viewing routes use real columns only).

## Part 3 — Landing, and the two pre-existing breakages it exposed

`main`'s CI had been failing for hours before any of this session's merges — every recent run died at **Lint**, which masked everything downstream. Two independent causes:

1. **`turbo.json` parse error (PR #46).** Vercel's bot added `"tags": ["ci"]` blocks (commit `e5f16bf03`, merged as PR #43) to `turbo.json` and two package-level turbo configs; the installed turbo rejects the key (`Found an unknown key 'tags'`), so every `turbo run` — including `pnpm lint` — exited 1. Removal is purely subtractive (no cache/dependsOn/outputs semantics). 
2. **Pure-mode CSS modules (PR #47).** With lint fixed, the build failed 3× *deterministically*, but the CI retry wrapper labeled each attempt "known next/font Google-fetch flake." The raw logs told the real story: `Selector ":global(.leaflet-container) svg, …" is not pure`. Root cause: **Next runs css-loader `modules.mode: 'pure'` for `*.module.css`** (verified in `next/dist/build/webpack/config/blocks/css/loaders/modules.js`: "Disallow global style exports…"), which rejects *any* fully-global selector. The fix anchors the four global rules to the file's own `.gisEmbedWrap` wrapper (the div around the Leaflet map) — the same valid pattern the file already uses at its bottom (`.editorialFrame :global(.leaflet-container)`). Verified with the real css-loader v6 in pure mode: the pre-fix file reproduces the exact CI error; the fixed file compiles clean. Two hardening pieces shipped with it:
   - `scripts/check-css-modules-purity.mjs` — fast static check of the real pure-mode rule, wired into CI **before** the build (verified both directions: clean tree passes, injected violation fails with `file:line`).
   - The build-retry loop now retries **only** on the actual flake signature (`fonts.googleapis.com` fetch failure or the null-read loader crash); any other failure exits fast with the real error on top.

**Final CI state on `main` @ `0512b23a3`:** Realty app (Type-check + Lint + Test + Build) ✅ · CI gate (production) ✅ · Supabase Preview ✅ · CodeQL ✅. (The Vercel deploy jobs for intermediate commits show *cancelled* — that is the deploy workflow's concurrency group superseding older heads, not a failure; the latest head's deploy proceeded.)

> Note: `main` also received `7e17b9ea1` (WhatsApp multi-session worker) from a parallel workstream during this session. It is not part of this patch set, but the green CI above includes it.

---

## Verification

| Gate | Result |
|---|---|
| Scoped `tsc` on all edited TS files | **0 errors** |
| css-loader v6 pure-mode probe (pre-fix vs fixed stylesheet) | pre-fix **FAILS with the exact CI error**; fixed **PASSES** |
| `pnpm lint` full pipeline (after turbo fix) | **exit 0** (32 pre-existing warnings, 0 errors) |
| Root vitest suite | **104 files / 1047 passed / 0 failed** |
| App jest suite (`test:ci`) | **178 suites / 1826 passed** (incl. migration-mirror parity test with 043 committed) |
| Migration chain dry-run | **valid**, 043 included, all statements idempotent |
| CI on final main head `0512b23a3` | **all green** (Realty job, CI gate, Supabase Preview, CodeQL) |

## Files changed (this session's three PRs)

```
PR #45 (d62337b03) — migration + secret rotation:
  supabase/migrations/20261112_043_viewing_dispatch_golden_hour_columns.sql  (new, + app mirror)
  supabase/schema.sql                                                        (viewings columns)
  apps/sierra-estates-realty/app/api/viewing-requests/route.ts               (columns-first insert + pre-043 fallback)
  apps/sierra-estates-realty/lib/services/GoogleSheetSyncService.ts          (SIERRA_SECRET_KEY chain)
  scripts/GoogleAppsScript_SierraEstates_Unified_Engine.gs                   (Script Property + live-value dialog)
  scripts/google_apps_script_master_v6.1.gs                                  (same)
  apps/easy-listing/src/lib/local-store.ts                                   (rotation note)

PR #46 (c22ac4848) — CI lint unblock:
  turbo.json, packages/agents-core/turbo.json, packages/memory-engine/turbo.json  (remove invalid tags keys)

PR #47 (8a16ec080) — build unblock + hardening:
  apps/sierra-estates-realty/components/site/CartographicMap.module.css      (anchor global rules to .gisEmbedWrap)
  scripts/check-css-modules-purity.mjs                                       (new, CI-wired)
  .github/workflows/ci.yml                                                   (purity step + signature-gated retry)
```

Consolidated patch: `download/sierra-estates-end-to-end-fixes.patch` (all three PRs, in merge order). The earlier phase-1 patch (`sierra-estates-backend-completions.patch`) remains for reference; its content is already on `main` via `5ca6716eb`.

## Operator actions still open (cannot be done from this environment)

1. **Apply migration 043 to production:** GitHub → *Deploy Supabase* workflow → manual dispatch with `dry_run=false` (pushes only validate the chain by design). Until then the route's fallback keeps the public form working, with the roster parked in `notes`.
2. **Rotate the sheet secret when ready:** set the `SIERRA_SECRET_KEY` Script Property in both Apps Script projects *and* the matching env vars (Vercel + GitHub secrets); the legacy fallback keeps both sides working before, during, and after the switch.
3. **Set the role chat ids** for 3-way dispatch (`TELEGRAM_CEO_CHAT_ID`, `TELEGRAM_TEAM_LEADER_CHAT_ID`, `TELEGRAM_SALES_ADVISOR_CHAT_ID`) — unset roles are reported `delivered: false` rather than silently faked.

---

## Part 4 — Production recovery addendum (2026-11-12, evening)

Applying migration 043 (the report's operator action #1) surfaced and then repaired a chain of four deeper, pre-existing breakages. Five more PRs landed:

| PR | Commit | What |
|---|---|---|
| #48 | `857b092f2e` | **Baseline parity 041/042** — the first Deploy Supabase dispatch failed with `42P13: cannot change return type of existing function get_listings_near_capital`: migration 041 (deployed 2026-11-01) recreated the RPC as `RETURNS TABLE` over public-safe columns, but `schema.sql` still declared the old `RETURNS SETOF public.listings` — every subsequent schema apply re-declared a conflicting type and Postgres refused, blocking the whole pipeline. The baseline now carries 041's exact function (drop-guard + `RETURNS TABLE`) and 042's `listings.last_contact_date`. |
| #49 | `1f0109f4ff` | **Comment terminator repair** — the #48 block extraction dropped the closing `'` + `;` of the function's comment, leaving an unterminated literal that swallowed the rest of the file (apply died `42601`). The baseline now parses **351/351 statements** clean under libpg-query (real Postgres grammar); the parser harness lives in `scripts/` locally. |
| #50 | `021cd96d2c` | **CI unblock** — a parallel workstream (`580dcba1c`) committed two `data/` files, tripping the data-hygiene pin; CI red → the production deploy gate blocked **every** deploy since 16:37 UTC. Files untracked (kept on disk). CI green again. |
| #51 | `5a99c6ab18` | **Env-sync actually passes Supabase values** — root cause of the production outage: the deploy workflow's "Re-sync environment variables" step ran the sync with nothing but `VERCEL_TOKEN`; the script silently skips unset keys, so `NEXT_PUBLIC_SUPABASE_URL` / anon key were **never pushed** to the Vercel projects (the sync log showed ~30 ✅ lines and zero Supabase entries). The step now receives the values (same `secrets \|\| vars \|\| default` chain as every other workflow) and fails loudly when absent; the script logs loud ❌ warnings for `CRITICAL_KEYS`. |
| #52 | `232c67ab1a` | **`env_sync_only` dispatch mode + always-run sync** — the Vercel free-tier daily deploy quota (`api-deployments-free-per-day`, >100/day, exhausted by the day's churn) made deploy steps fail 5×, and `set -euo pipefail` aborted the job before env-sync could run. Env-sync now runs `always()`; a new `env_sync_only` dispatch input pushes env vars without deploying (env PATCHes are not quota-limited). |

**Migration 043 IS applied to production** (Deploy Supabase run `43278876264` success: 6 applied — 038–043 idempotent re-asserts — 0 failed). The `viewings` table now has the dispatch/Golden-Hour columns for real.

**Supabase env vars ARE restored on both Vercel projects** — the `env_sync_only` dispatch (`43291439796`) verified `✅ NEXT_PUBLIC_SUPABASE_URL -> Synced to Production & Preview` on client + admin, along with the publishable/anon/service-role keys.

### ~~The one open item (timed, not fixable from here)~~ — RESOLVED, superseded by Part 5

The quota-blocker diagnosis below was wrong (or rather, incomplete): the deploy quota did reset and deploys resumed, but production stayed degraded — the env-sync was writing entries that production deployments could not see. PRs #53/#54 (Part 5) fixed that, and both sites came back healthy on 2026-11-12 at 21:00 (client) / 21:34 (admin) UTC. The paragraph below is kept for the record.

The live runtime instance still serves the pre-recovery build, so `/api/health` shows `degraded` and `/api/inventory` is empty until a new deployment ships — and deploys are blocked by the **Vercel free-tier daily quota (resets ~24h after 19:22 UTC today)**. Everything is staged for automatic recovery: `main` @ `232c67ab1a` is fully CI-green, the deploy gate passes, and the next successful deploy will both carry all fixes and sync env correctly. Either wait for the quota window, or (faster) upgrade the Vercel project / ask the owner to redeploy from the Vercel dashboard — the dashboard's own deploy button is a different quota path in some plans. After that deploy, verify: `/api/health` → `ok`, `/api/inventory` → `source: supabase` with live units.

### Operator actions (updated)

1. ~~Apply migration 043~~ ✅ **done** (see above).
2. ~~Redeploy when the Vercel quota resets~~ ✅ **resolved** — see Part 5; the redeploy happened via the repaired pipeline and both sites are healthy.
3. ~~Rotate the sheet secret when ready~~ — mechanism landed in #45 (`SIERRA_SECRET_KEY` everywhere); still optional to actually rotate.
4. ~~Role chat ids~~ — still open (Telegram CEO/Team-Leader/Sales-Advisor chat ids), unchanged.

Files: `download/sierra-estates-end-to-end-fixes.patch` (PRs #45–#47), `download/sierra-estates-production-recovery.patch` (PRs #48–#54, incl. the Part-5 extension).

---

## Part 5 — Final recovery status (2026-11-12, 21:34 UTC)

**BOTH PRODUCTION SITES RECOVERED — verified live:**

| Check | Client (sierra-estates.net) | Admin (admin.sierra-estates.net) |
|---|---|---|
| `/api/health` | **healthy**, supabase **healthy** | **healthy**, supabase **healthy** |
| Active properties | 26,184 | 26,184 |
| Homepage | HTTP 200 | 307 → `/admin/login` (expected auth redirect), login page 200 |
| Inventory | source: **supabase**, 3,850 live units | — |

**What the last mile took (PRs #53, #54):** the outage had a second half. Even after #51/#52, the env-sync was writing to entries that production deployments could not see:
- **PR #53** (`5ca2ddabe2`) — pagination (the project list endpoint truncates at 100 vars), "already exists" no longer silently skips, target repair for critical keys, runtime `SUPABASE_URL` fallback (the app resolves `NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL || POSTGRES_URL` at runtime).
- **PR #54** (`25297b7a1b`) — duplicate-aware handling (stale `[development]`-only copies existed beside production copies), PATCH-first target repair, key-refetch repair for "already exists", and a post-sync verification pass that fails loudly when a CRITICAL_KEY lacks a production-target copy.

The decisive evidence came from PR #54's repair path: every variable — including all Supabase keys — was "repaired via key-refetch PATCH (production copy)" at 20:45 UTC, after which the ~21:00 deployment booted healthy. The Vercel API list-endpoint rate limit (`api-projects-get` >300/h, exhausted by the day's churn) prevented the verification pass from printing its report, but the per-key PATCH successes plus the now-healthy production endpoints are conclusive.

Recovery timeline (2026-11-12, UTC): env-sync repaired → 20:45 repair PATCHes land → 20:59 workflow run starts → ~21:00 client aliases healthy deployment → 21:34 admin aliases healthy deployment (queued behind client, max-parallel: 1).

**Operator actions (final):**
1. ~~Apply migration 043~~ ✅ done.
2. ~~Restore production~~ ✅ done — both client and admin verified healthy (client: health ok, inventory supabase/3,850 units, homepage 200; admin: health ok, 26,184 props, login flow 200).
3. Optional hygiene: delete the stale `[development]`-only duplicate env entries in the Vercel dashboards (both projects) — the sync now diagnoses them loudly but only repairs CRITICAL keys.
4. Still open from before: Telegram role chat ids (CEO/Team-Leader/Sales-Advisor) for the follow-up router.

Files: `download/sierra-estates-audit-report.md`, `download/sierra-estates-backend-completions.patch`, `download/sierra-estates-end-to-end-fixes.patch` (PRs #45–#47), `download/sierra-estates-production-recovery.patch` (PRs #48–#54).
