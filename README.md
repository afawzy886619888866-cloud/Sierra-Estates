# Sierra Estates Realty — Enterprise AI PropTech Platform & Autonomous Outreach Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444?style=flat&logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20pgvector-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-1%2C871%20Passing%20(186%20Suites)-brightgreen)](https://github.com/afawzy886619888866-cloud/Sierra-Estates)
[![Autonomous Workflows](https://img.shields.io/badge/Autonomous%20Workflows-23%20Registered-emerald)](./PROJECT_STATUS_AND_GAPS.md)
[![Production](https://img.shields.io/badge/Status-4%20Web%20Surfaces%20%2B%20Local%20Daemons-gold.svg)](https://sierra-estates.net)

> **Sierra Estates Realty** is the enterprise luxury PropTech intelligence and autonomous owner-outreach platform engineered for the Egyptian luxury property market (**New Cairo / Fifth Settlement**). It unites client property discovery, LightGBM + Gemini algorithmic ad scoring, automated multi-line WhatsApp & Telegram owner/buyer concierges, interactive spatial masterplan maps, and a **24/7 Autonomous Workflow Control Plane** supervised by PM2 and Windows OS watchdogs.

📄 **For the detailed status report, gap closure record, and operational checklist, see [`PROJECT_STATUS_AND_GAPS.md`](./PROJECT_STATUS_AND_GAPS.md).**

---

## 🚀 Phase 1–5 Full-Stack Stabilization, ML Ad Scoring & Workflow Mastery (Nov 16, 2026)

Completed across commits up to **`e1054b919`** on `main`:

1. **Phase 1 — Repo Hygiene, Optimistic Locking & Privacy Views:**
   - Added AI scoring columns (`ai_score`, `score_tier`, etc.) in `20261115_048_add_ai_scoring_columns.sql` and optimistic-locking `version_id` + atomic `rpc_update_unit_field` RPC in `20261115_049_optimistic_locking_public_view_and_queues.sql` so spreadsheet/Excel syncs never silently overwrite newer Supabase edits.
   - Enforced `public_properties_view` exclusions for `owner_name`, `owner_phone`, `Owner_Name_Internal`, and `Owner_Mobile_Internal` (verified by `supabase/tests/run-rls-tests.sh`).
   - Cleaned tracked QR artifacts (`qr_line-*.png`), `supabase/.temp/cli-latest`, and script encoding issues (`setup_and_run_all.ps1`).
2. **Phase 2 — Workflow Control Plane, WhatsApp Session Guardian & Telegram Fallback:**
   - Added PM2 configuration (`ecosystem.config.cjs`, `max_memory_restart: '500M'`), updated `scripts/start-detached-daemons.ps1`, added `/health` liveness alias and `P0_INBOUND` queue handling in `workflows/runner.js` (`:2786`).
   - Implemented `session-guardian.ts` (monitoring WhatsApp lines, enforcing `!chat.isGroup` guard in `harvester.js`, emitting urgent QR/pairing alerts on disconnect, and queuing failed `13-paced-outreach` sends into `outreach_dead_letter_queue` with `1h / 4h / 24h` exponential backoff).
   - Hardened `app/api/telegram/webhook/route.ts` and `lib/server/telegram-role-chats.ts` to log every raw payload into `inbound_telegram_audit_log` before parsing and route missing/null role chats to `UNASSIGNED_DISPATCH_FALLBACK`.
3. **Phase 3 — Arabic NLP Pre-Filter, WebP Media Mirroring & Zero-Blocker Two-Way Sheets Sync:**
   - Created `@sierra-estates/arabic-nlp` (`packages/arabic-nlp/index.js`) and `workflows/02-gemini-property-classifier/index.js` for deterministic Arabic/English rent/sale/demand/role classification (`>= 0.85` auto-staging, `< 0.85` Telegram inline `"Rent or Sale?"` confirmation).
   - Added `workflows/03-media-harvester/index.js` to convert inbound WhatsApp images to WebP (`1920px` max, `80%` quality) and upload permanent CDN URLs to Supabase Storage `unit-photos/{unit_id}/{index}.webp`.
   - Upgraded `workflows/14-sheets-supabase-sync/sync.js` (composite key `(phone_last7, compound, price)` / `Unit_Code` matching, `WF_SHEET_WRITE_URL` Apps Script `upsert_units` fallback, `rpc_update_unit_field` locking, and `tier_2_search_only` search-only isolation for incomplete broker units) and `workflows/09-owner-outreach/outreach.js` (`Broker Excluded` auto-detection -> `Excluded_Brokers`).
4. **Phase 4 — Property Finder Gate, P0 Inbound Leads & LightGBM Scorer:**
   - Added Jaro-Winkler fuzzy compound matching (`resolveCanonicalCompoundFuzzy`) + Arabic/English aliases in `compound-gazetteer.ts` & `scripts/sync-compound-gazetteer.ts`, plus `< 3` photo Telegram alerts on otherwise eligible direct-owner units in `publish-gate.ts`.
   - Connected `app/api/webhooks/property-finder/route.ts` to `lib/server/p0-inbound-dispatch.ts` -> `13-paced-outreach` (`priority: "P0_INBOUND"`) for `< 60s` WhatsApp speed-to-lead.
   - Mounted LightGBM `/api/ml/train-and-score` in `apps/api/routers/ad_scoring.py` (with `X-N8N-Secret` auth and `dry_run: true` HTTP 200 verification, invoked by active n8n workflow `infra/n8n-workflows/05-ml-ad-scoring.json`).
5. **Phase 5 — Unified Add Listing & Add Request Pipelines:**
   - Created `/api/listings/intake` (`app/api/listings/intake/route.ts` + `lib/server/listing-intake-scoring.ts`) wired into `AddListingForm.tsx` (`/list-property`) and `apps/easy-listing` (`new-listing.tsx`) with live Gemini/NLP confidence badges (`< 0.75` amber highlight), live PF Title (`30–47` chars) & Bilingual Description (`750–2,000` chars) counters, and `WF_SHEET_WRITE_URL` sync.
   - Unified `InquiryForm.tsx` (`/request`, `/ar/request`, `/ar/add-request`) -> `/api/viewing-requests` -> `lib/server/buyer-demand-request.ts`, attaching top 3 matched `Unit_Code`s (preferring `tier_1_top_ad` & `tier_1_broker_top`, redacting owner phones), syncing via `RequestSheetSyncService.ts`, and rendering `matchedUnits` badges in `RequestsSpreadsheetView.tsx`.

---

## 🧭 Executive Summary & Architecture Overview

* **Primary Active Repository:** <https://github.com/afawzy886619888866-cloud/Sierra-Estates>
* **Authoritative Backend:** Supabase PostgreSQL (`gaxfqcietzoonlmatiot.supabase.co`) with `pgvector`, Auth, Storage, and RLS (`public.properties` / `public.listings`, `public.public_properties_view`, `public.outreach_dead_letter_queue`, `public.inbound_telegram_audit_log`, `public.client_requests`).
* **Autonomous Local Production Stack:**
  * **Port `:2785` — OpenWA Multi-Session Gateway (`apps/agents/whatsapp-multi-session/worker.js` + `src/session-guardian.ts`):** Headless Chromium WhatsApp multi-line engine with `.vault` / `.bak` session protection, group-only isolation guard, and instant Telegram QR/pairing alerts on disconnect.
  * **Port `:2786` — Server Workflow Runner (`workflows/runner.js` via PM2 `ecosystem.config.cjs`):** Executes server workflows, `P0_INBOUND` speed-to-lead queue dispatch, continuous owner outreach (`09:00–22:00` Africa/Cairo), and the **2-Hour Executive WhatsApp Report (`outreach-2h-digest`)**.
  * **Port `:2790` — Admin Control Bridge (`workflows/sierra-admin-bridge.mjs` & `sierra-admin.html`):** Standalone Executive Control Dashboard (`http://127.0.0.1:2790/admin`) allowing full control (Run Now, Pause/Resume workflows, Send 2-Hour Report Now, Toggle Continuous Loop, Adjust Daily Cap, Restart/Pair WhatsApp lines) even when Next.js or Antigravity IDE is closed.
  * **OS-Level Persistence (`SierraEstates-Watchdog`):** Registered in Windows Task Scheduler (runs every 2 minutes) and Windows Startup (`scripts/start-detached-daemons.ps1` + PM2 `dump.pm2`).

---

## ✨ Key Platform Capabilities

* **4K Ultra-HD Glowing Cartographic GIS Map:** High-DPI Retina tiles (`detectRetina`, zoom 22), glowing metallic-gold (`#C9A84C`) / emerald (`#10B981`) / cyan (`#00F0FF`) compound polygons, permanent obsidian glass compound badges, and live Supabase pin binding (`Rent`/`Resale` chips, `💎 GEM` badges, AI Fair-Price benchmarks).
* **Two-Way Google Sheets ↔ Supabase Engine (`SheetsIntegrationService` & `14-sheets-supabase-sync`):** Strict intake normalization gate (Egyptian mobile `+20XXXXXXXXXX` validation, 400k EGP rent ceiling, 30+ compound aliases + Jaro-Winkler fuzzy matching, deterministic canonical unit codes), optimistic locking (`version_id` + `rpc_update_unit_field`), Apps Script fallback (`WF_SHEET_WRITE_URL`), and `Excluded_Brokers` quarantine.
* **Buyer Concierge, Top-3 Tier-1 Unit Matching & Speed-to-Lead:** Buyer demand forms (`/request`, `/ar/request`, `/ar/add-request`) submit to `/api/viewing-requests`, attach the top 3 `tier_1_top_ad` / `tier_1_broker_top` `Unit_Code`s without exposing owner phone numbers, mirror to `RequestsSpreadsheetView`, and dispatch Property Finder inbound leads to `13-paced-outreach` (`P0_INBOUND`) within 60 seconds.
* **AI Property Classifier, WebP Media Mirroring & LightGBM Ad Scorer:** `@sierra-estates/arabic-nlp` pre-filters Arabic/English WhatsApp text (`>= 0.85` staging, `< 0.85` Telegram inline review), `03-media-harvester` mirrors photos to `unit-photos/{unit_id}/{index}.webp`, `publish-gate.ts` alerts Telegram on `< 3` photos, and `apps/api/routers/ad_scoring.py` scores ads via LightGBM (`/api/ml/train-and-score`).
* **Unified Sierra Unit Coding & Owner vs. Broker Isolation:** Canonical `SE-SL/SE-RNT-[AREA]-[SERIAL]` & community `[O/B][Compound][NameInitial][Last3PhoneDigits]` codes across Google Sheets, GIS Map, Client Portal, and WhatsApp, forwarding confidential phone numbers privately rather than exposing them in public responses or group replies.

---

## 🌐 Live Deployments & Local Daemons Matrix

### Cloud Web Surfaces (Vercel)

| # | Application Surface | Public URL | Runtime / Framework | Status |
|:---:|---|---|---|:---:|
| **1** | **Client Luxury Web Portal** | <https://sierra-estates.net> | Next.js 16.4 (App Router) | ✅ Live |
| **2** | **Admin Intelligence OS** | <https://admin.sierra-estates.net> | Next.js 16.4 (App Router) | ✅ Live |
| **3** | **Static Portal (Fast Fallback)** | <https://sierra-estates-static-portal.vercel.app> | Static HTML / Vanilla JS | ✅ Live |
| **4** | **Legacy Subdomain** | <https://legacy.sierra-estates.net> | Static HTML / CDN | ✅ Live |

### Local Autonomous Production Daemons (PM2 + Windows OS Watchdog)

| Port | Service Name | Entrypoint | Purpose |
|:---:|---|---|---|
| **`:2785`** | **OpenWA Multi-Session Gateway** | `apps/agents/whatsapp-multi-session/worker.js` | Manages WhatsApp lines (`line-1`..`line-8`), anti-ban typing emulation, `.vault` session protection, and `session-guardian.ts` group/disconnect safety. |
| **`:2786`** | **Workflow Control Plane** | `workflows/runner.js` (PM2: `sierra-workflow-runner`) | Schedules & dispatches workflows, `P0_INBOUND` queue, `/health` probe, continuous owner outreach (`09:00–22:00` Cairo), and 2-hour WhatsApp reports. |
| **`:2790`** | **Sierra Admin Control Center** | `workflows/sierra-admin-bridge.mjs` | Interactive local control dashboard at <http://127.0.0.1:2790/admin>. |

---

## ⚙️ Server Workflows Registry (`workflows/runner.js`)

| # | Workflow Slug | Script Path | Schedule (Cairo) | Category | Status |
|:---:|---|---|---|---|---|
| 1 | `owner-outreach` | `09-owner-outreach/outreach.js` | Continuous / 30m (`09:00–22:00`) | Outreach | ✅ Active & Sending (incl. `Broker Excluded` handler) |
| 2 | `outreach-2h-digest` | `lib/two-hour-outreach-digest.js` | Every 2 Hours (`09:00–22:00`) | Outreach | ✅ Active & Reporting |
| 3 | `daily-outreach-report` | `lib/daily-outreach-report.js` | `30 21 * * *` (21:30 Daily) | Outreach | ✅ Active |
| 4 | `paced-outreach` | `13-paced-outreach/paced-outreach.js` | Event / Paced Queue | Outreach | ✅ Active (`P0_INBOUND` + `outreach_dead_letter_queue`) |
| 5 | `gateway-sentinel` | `06-gateway-sentinel/sentinel.js` | `*/5 * * * *` (Every 5m) | Operations | ✅ Active |
| 6 | `daily-digest` | `07-daily-digest/digest.js` | `0 3 * * *` (03:00 Daily) | Operations | ✅ Active |
| 7 | `units-sync` | `08-units-sync/sync.js` | `23 */2 * * *` (Every 2h) | Ingestion | ✅ Active |
| 8 | `whatsapp-dispatch` | `10-whatsapp-dispatch/dispatch.js` | `*/15 * * * *` (Every 15m) | Outreach | ✅ Active |
| 9 | `sheets-supabase-sync` | `14-sheets-supabase-sync/sync.js` | `*/10 * * * *` (Every 10m) | Ingestion | ✅ Active (`GOOGLE_SERVICE_ACCOUNT_JSON` or `WF_SHEET_WRITE_URL`) |
| 10 | `gemini-property-classifier` | `02-gemini-property-classifier/index.js` | Intake Pipeline | Ingestion | ✅ Active (Arabic NLP + Gemini 2.5 Flash) |
| 11 | `media-harvester` | `03-media-harvester/index.js` | Sync Post-Classification | Ingestion | ✅ Active (WebP -> `unit-photos` Storage) |
| 12 | `scribe-guardian` | `15-scribe-guardian/scribe.js` | `*/30 * * * *` (Every 30m) | Guardian | ✅ Active |
| 13 | `curator-guardian` | `16-curator-guardian/curator.js` | `5 * * * *` (Hourly) | Guardian | ✅ Active |
| 14 | `atlas-sync-guardian` | `17-atlas-sync-guardian/atlas.js` | `*/10 * * * *` (Every 10m) | Guardian | ✅ Active |
| 15 | `antigravity-closer-guardian` | `18-antigravity-closer-guardian/closer.js` | `*/15 * * * *` (Every 15m) | Guardian | ✅ Active |
| 16 | `ops-watchdog` | `19-ops-watchdog/watchdog.js` | `*/15 * * * *` (Every 15m) | Guardian | ✅ Active |
| 17 | `broker-sync` | `20-broker-sync/sync.js` | `*/30 * * * *` (Every 30m) | Ingestion | ✅ Active |
| 18 | `usb-phone-harvester` | `21-usb-phone-harvester/index.js` | `0 10 * * 0,3` (Sun/Wed 10:00) | Harvester | ✅ Active (hardware-dependent for USB exports) |
| 19 | `whatsapp-scraper` | `01-whatsapp-scraper/index.js` | `*/15 * * * *` | Ingestion | ✅ Active |
| 20 | `unit-adder` | `05-unit-adder/add.js` | `0 13 * * *` | Ingestion | ✅ Active |
| 21 | `contact-partitioner` | `09-owner-outreach/contact-partitioner.js` | On-Demand Utility | Outreach | ✅ Active |
| 22 | `owner-search` | `02-owner-search/search.js` | `30 10 * * *` | Discovery | ⚠️ Needs `GOOGLE_CSE_API_KEY` / `SERPAPI_KEY` |
| 23 | `email-sender` | `04-email-sender/send.js` | Manual / Event | Outreach | ⚠️ Needs Live `SENDGRID_API_KEY` |

---

## ✅ What Was Fixed vs. What Remains To Be Done

### Fixed & Verified (`e1054b919` + Floorplan Health Pass)
- **CI / Type-Check / Lint / Build Green:** `pnpm turbo run type-check lint test build --filter=sierra-estates-client-page` (`16/16` tasks passed; Jest `186` suites / `1,871` tests passing; ESLint `0` errors) and `pnpm --filter sierra-easy-listing type-check` passed.
- **ML Scorer & RLS Checks Green:** `python -m pytest apps/api/tests/test_ad_scoring.py -v` (`3/3` passed) and `bash supabase/tests/run-rls-tests.sh` (`12/12` offline checks `PASS`).
- **Floorplan Security/URL Health Fixed (`high: 2 -> 0`, `localhost-url` removed, `1,986/1,986` files & `390/390` routes described):** Sanitized URI doc placeholders in `.kilo/skills/adbc/resources/drivers/{mysql,postgresql}.md`, replaced hardcoded loopback URLs in `WhatsAppOutboxView.tsx` and `oauth-store.ts` with environment-configured fallbacks, completed plain-language descriptions across all `70` Floorplan worksheets (`1,986` files, `390` routes, `55` modules, `63` screens, `19` recent-work cards), and rebuilt `floorplan/index.html` (`3.9 MB`) & `floorplan/graph.json`.

### What Remains To Be Done (Live Credentials, Hardening & Operational Cutover)
1. **Apply Migrations `048` & `049` to Live Supabase:** Run with `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_URL` set (`supabase/migrations/20261115_048_*`, `20261115_049_*`), then run live RLS verification (`pnpm test:rls`).
2. **Set Live Environment Secrets in Production (Vercel / FastAPI / `.env`):**
   - `WF_SHEET_WRITE_URL` & `WF_SHEET_WRITE_SECRET` (or `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_SHEET_ID`) for live two-way Google Sheets sync
   - `UNASSIGNED_DISPATCH_FALLBACK` + Telegram role chat IDs (`TELEGRAM_CEO_CHAT_ID`, `TELEGRAM_TEAM_LEADER_CHAT_ID`, `TELEGRAM_SALES_ADVISOR_CHAT_ID`, `TELEGRAM_HR_CHAT_ID`, `TELEGRAM_GENERAL_CHAT_ID`)
   - `RUNNER_API_KEY`, `WORKFLOW_RUNNER_URL`, `N8N_WEBHOOK_SECRET`, and `PYTHON_API_URL` (for active n8n workflow `05-ml-ad-scoring.json`)
   - Optional: `NEXT_PUBLIC_OPENWA_MAP_URL`, `MCP_DEV_REDIRECT_URI`, `SENDGRID_API_KEY`, `GOOGLE_CSE_API_KEY`, and live Property Finder OAuth credentials.
3. **Host Port `:2786` Container Cutover (Optional):** Docker container `sierra-workflow-runner` currently holds `127.0.0.1:2786->2786/tcp` while PM2 `sierra-workflow-runner` (`H:\Sierra Estates\workflows\runner.js`) serves on `0.0.0.0:2786`. When ready to route loopback traffic exclusively through PM2, stop/remove the stale container so `http://127.0.0.1:2786/health` resolves directly to PM2.
4. **Runtime Auth, RLS & Stub Findings from Full Floorplan Audit (`1,986` files / `390` routes):**
   - **Database RLS & Schema Alignment:** Tighten `"client_requests_staff_access"` in `20261115_046_client_requests_pipeline.sql` from `FOR ALL TO authenticated USING (TRUE)` to `public.is_staff()`, and sync `apps/sierra-estates-realty/supabase/schema.sql` with root `supabase/schema.sql`.
   - **Unauthenticated Routes to Gate:** Add staff sign-in / secret guards to `apps/easy-listing` (`/api/save`, `/api/extract`, `/api/generate`), `apps/sierra-estates-realty` (`/api/whatsapp/{pairing-code,qr,heartbeat}`, `/api/inventory/scan-and-merge`, `/api/listings/owner-intakes`, `/api/agent-orchestrator`, `/api/contracts/[id]/sign`, `/api/integrations/jira`, `/api/broker-brain`, `/api/concierge/{dashboard,complete}`, `/api/memory/ecc`, `/api/mcp/oauth/{authorize,register}`, `/api/teasers/video`), `apps/api/main.py` + `apps/agents/vertex-omni-agent/api.py`, `worker.js` (`/api/pair/reload` & local auth bypass), `packages/memory-engine/src/api-router.ts`, and `workflows/sierra-admin-bridge.mjs` (`:2790`).
   - **Hardcoded Fallback Secrets/URLs & Simulated Handlers:** Remove fallback secret/URL literals when env vars are unset (`easy-listing` `/api/save`, `sync/sheet-webhook`, `admin/whatsapp/{screen,outbox,qr}`, `email-alert-service.ts`, `multiLineListener.ts`, `worker.js`), and replace or retire simulated/stubbed endpoints (`/api/internal/*`, `/api/admin/{workflows/[id],agents/repair,deploy}`, `/api/sync/obsidian`, `/api/closer/initiate`, `/api/concierge/voice-briefing`, `/api/intelligence/deepseek-reasoning`, `VipInquiryModal.tsx`, `CareerSheetSyncService`/`RequestSheetSyncService` `{ ok: true, error }`, and `17-atlas-sync-guardian/atlas.js` `isPublishedToPF = true` on connector fallback).
5. **Ongoing Inventory & Code Hygiene:** Complete missing owner phones/areas on the audited WhatsApp Community batch (`OEA356`, `OHE188`, `ORE440`, Karima `814` units) and incrementally split large (`>1,000`-line) files (`37` medium Floorplan health warnings).

---

## 🛠️ Developer & Operator Runbook

```powershell
# Reload PM2 workflow runner on port 2786
pm2 restart sierra-workflow-runner
pm2 save

# Open Local Admin Control Center & Floorplan Codebase Map
start http://127.0.0.1:2790/admin
node floorplan/serve.mjs --no-open
```

```bash
# Type-check, lint, test, and build main portal + Easy Listing
pnpm --filter sierra-easy-listing type-check
pnpm turbo run type-check lint test build --filter=sierra-estates-client-page

# LightGBM Python ML scorer tests & RLS static checks
python -m pytest apps/api/tests/test_ad_scoring.py -v
bash supabase/tests/run-rls-tests.sh
```

---

## 📄 License & Maintainers

* **Lead Engineer & Architect:** Ahmed Fawzy ([a.fawzy8866@gmail.com](mailto:a.fawzy8866@gmail.com))
* **Organization:** Sierra Estates Realty
* **Authoritative Repository:** <https://github.com/afawzy886619888866-cloud/Sierra-Estates>
* **Proprietary & Confidential:** All rights reserved.
