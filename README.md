# Sierra Estates Realty — Enterprise AI PropTech Platform & Autonomous Outreach Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444?style=flat&logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20pgvector-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-1%2C052%2B%20Passing%20(100%25)-brightgreen)](https://github.com/afawzy886619888866-cloud/Sierra-Estates)
[![Workflows](https://img.shields.io/badge/Autonomous%20Workflows-21%20Active-emerald)](./PROJECT_STATUS_AND_GAPS.md)
[![Production](https://img.shields.io/badge/Status-4%20Web%20Surfaces%20%2B%203%20Local%20Daemons%20Live-gold.svg)](https://sierra-estates.net)

> **Sierra Estates Realty** is the enterprise luxury PropTech intelligence and autonomous owner-outreach platform engineered for the Egyptian luxury property market (**New Cairo / Fifth Settlement**). It unites client property discovery, algorithmic valuation, automated multi-line WhatsApp & Telegram owner/buyer concierges, interactive spatial masterplan maps, and a **24/7 Autonomous Workflow Control Plane** that runs continuously in the background even when the IDE or browser is closed.

📄 **For the complete live audit of what has been built, what is working, current gaps, and next steps, see [`PROJECT_STATUS_AND_GAPS.md`](./PROJECT_STATUS_AND_GAPS.md).**

---

## 🧭 Executive Summary & Architecture Overview

* **Primary Active Repository:** <https://github.com/afawzy886619888866-cloud/Sierra-Estates>
* **Authoritative Backend:** Supabase PostgreSQL (`gaxfqcietzoonlmatiot.supabase.co`) with `pgvector`, Auth, Storage, and RLS (`20,281` total listings, `12,913` publishable, `5,067` direct owner units, `721+` audited owner outreach messages in `public.owner_outreach_log`).
* **Autonomous Local Production Stack (Replaces AWS EC2):**
  * **Port `:2785` — OpenWA Multi-Session Gateway (`apps/agents/whatsapp-multi-session/worker.js`):** Headless Chromium WhatsApp multi-line engine with **Automatic Session Vault Protection** (`.vault` / `.bak` auto-backup and self-healing restore so linked numbers never lose authentication).
  * **Port `:2786` — Server Workflow Runner (`workflows/runner.js`):** Executes **21 automated server workflows**, continuous owner outreach (`09:00–22:00` Africa/Cairo with single-line rotation & human anti-ban pacing), and the **2-Hour Executive WhatsApp Report (`outreach-2h-digest`)**.
  * **Port `:2790` — Admin Control Bridge (`workflows/sierra-admin-bridge.mjs` & `sierra-admin.html`):** Standalone Executive Control Dashboard (`http://127.0.0.1:2790/admin`) allowing full control (Run Now, Pause/Resume workflows, Send 2-Hour Report Now, Toggle Continuous Loop, Adjust Daily Cap, Restart/Pair WhatsApp lines) even when Next.js or Antigravity IDE is closed.
  * **OS-Level Persistence (`SierraEstates-Watchdog`):** Registered in Windows Task Scheduler (runs every 2 minutes) and Windows Startup (`sierra-silent-watchdog.vbs` → `sierra-autostart.bat` → `scripts/start-detached-daemons.ps1` via WMI `Win32_Process.Create`), guaranteeing that **closing Antigravity IDE never stops the workflows or 2-hour reports**.

---

## ✨ Key Platform Capabilities

* **4K Ultra-HD Glowing Cartographic GIS Map:** High-DPI Retina tiles (`detectRetina`, zoom 22), glowing metallic-gold (`#C9A84C`) / emerald (`#10B981`) / cyan (`#00F0FF`) compound polygons, permanent obsidian glass compound badges, and live Supabase pin binding (`Rent`/`Resale` chips, `💎 GEM` badges, AI Fair-Price benchmarks).
* **Two-Way Google Sheets ↔ Supabase Engine (`SheetsIntegrationService`):** Strict intake normalization gate (Egyptian mobile validation, zero blank cells, 400k EGP rent ceiling, 30+ compound aliases, smart unit codes), upsert-in-place deduplication, 1-click outreach reset locking `Sold`/`Rented`, and automatic `Real_Available_Units` mirroring.
* **Buyer Concierge, 25% Website Discount & Calendar Closing:** Exclusive **25% Commission Discount** banners on online inquiry forms (`/api/inquiries` & `LeadForm`), instant WhatsApp concierge verification (`+201092048333` Sanitizer v3 concierge routing), Top 3 property matching, and Google Calendar booking inviting CEO (`a.fawzy8866@gmail.com`), Team Leader, and Assigned Advisor with a 60-Minute Golden Hour follow-up timer.
* **USB Phone Harvester (`21-usb-phone-harvester`):** Automated extraction of WhatsApp property group exports over USB MTP twice weekly and on cable plug-in, chronological Sheet & Drive organization by unit code.

---

## 🌐 Live Deployments & Local Daemons Matrix

### Cloud Web Surfaces (Vercel)
| # | Application Surface | Public URL | Runtime / Framework | Status |
|:---:|---|---|---|:---:|
| **1** | **Client Luxury Web Portal** | <https://sierra-estates.net> | Next.js 16.4 (App Router) | ✅ Live |
| **2** | **Admin Intelligence OS** | <https://admin.sierra-estates.net> | Next.js 16.4 (App Router) | ✅ Live |
| **3** | **Static Portal (Fast Fallback)** | <https://sierra-estates-static-portal.vercel.app> | Static HTML / Vanilla JS | ✅ Live |
| **4** | **Legacy Subdomain** | <https://legacy.sierra-estates.net> | Static HTML / CDN | ✅ Live |

### Local Autonomous Production Daemons (Windows OS Watchdog)
| Port | Service Name | Entrypoint | Purpose |
|:---:|---|---|---|
| **`:2785`** | **OpenWA Multi-Session Gateway** | `apps/agents/whatsapp-multi-session/worker.js` | Manages WhatsApp lines (`line-1`, `line-2` `+201061399688`, `line-3` `+201032206443`, `line-6` `+201031622600`), anti-ban typing emulation, QR/phone-code pairing, and `.vault` session protection. |
| **`:2786`** | **Workflow Control Plane** | `workflows/runner.js` | Schedules & dispatches all 21 workflows, continuous owner outreach (`09:00–22:00` Cairo), and automatic 2-hour WhatsApp executive reports (`outreach-2h-digest`). |
| **`:2790`** | **Sierra Admin Control Center** | `workflows/sierra-admin-bridge.mjs` | Interactive web control plane at <http://127.0.0.1:2790/admin> for live monitoring, 1-click workflow execution, pause/resume, 2-hour report triggers, and instant WhatsApp messaging. |

---

## 📊 2-Hour Executive Outreach Report & Admin Control

Every **2 hours** during operating hours (`10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00` Africa/Cairo, plus an immediate catch-up run whenever the last report is >2 hours old), `runner.js` executes `outreach-2h-digest` (`workflows/lib/two-hour-outreach-digest.js`):

1. **Combines Local & Cloud Audit Ledgers:** Merges `.state/owner-outreach-ledger.jsonl` and Supabase `public.owner_outreach_log` (`721+` historical sends).
2. **Evaluates Live Metrics:**
   * Owners contacted in the **last 2 hours**
   * Owners contacted **today vs. Daily Cap**
   * **Total all-time** owners contacted
   * **Owner replies** received in the last 2 hours and today
   * **Active WhatsApp lines** (`READY` status and phone numbers)
   * **Google Sheet cursor progress** (`Top #cursor` and `Bottom #cursor` out of `3,389+` candidates)
3. **Delivers Arabic Executive Summary to WhatsApp:** Automatically dispatches the formatted Arabic report to the admin WhatsApp numbers (`+201061399688` and `+201092048333`).
4. **Updates Admin Dashboards:** Writes `.state/two-hour-outreach-report.json`, immediately visible in:
   * **Standalone Admin Control Center:** <http://127.0.0.1:2790/admin>
   * **Next.js Admin Intelligence OS (`WorkflowOpsView`):** `/admin` → Workflow Control Plane

---

## ⚙️ Server Workflows Registry (`workflows/runner.js`)

| # | Workflow Slug | Script Path | Schedule (Cairo) | Category | Status |
|:---:|---|---|---|---|---|
| 1 | `owner-outreach` | `09-owner-outreach/outreach.js` | Continuous / 30m (`09:00–22:00`) | Outreach | ✅ Active & Sending |
| 2 | `outreach-2h-digest` | `lib/two-hour-outreach-digest.js` | Every 2 Hours (`09:00–22:00`) | Outreach | ✅ Active & Reporting |
| 3 | `daily-outreach-report` | `lib/daily-outreach-report.js` | `30 21 * * *` (21:30 Daily) | Outreach | ✅ Active |
| 4 | `gateway-sentinel` | `06-gateway-sentinel/sentinel.js` | `*/5 * * * *` (Every 5m) | Operations | ✅ Active |
| 5 | `daily-digest` | `07-daily-digest/digest.js` | `0 3 * * *` (03:00 Daily) | Operations | ✅ Active |
| 6 | `units-sync` | `08-units-sync/sync.js` | `23 */2 * * *` (Every 2h) | Ingestion | ✅ Active |
| 7 | `whatsapp-dispatch` | `10-whatsapp-dispatch/dispatch.js` | `*/15 * * * *` (Every 15m) | Outreach | ✅ Active |
| 8 | `sheets-supabase-sync` | `14-sheets-supabase-sync/sync.js` | `*/10 * * * *` (Every 10m) | Ingestion | ✅ Active |
| 9 | `scribe-guardian` | `15-scribe-guardian/scribe.js` | `*/30 * * * *` (Every 30m) | Guardian | ✅ Active |
| 10 | `curator-guardian` | `16-curator-guardian/curator.js` | `5 * * * *` (Hourly) | Guardian | ✅ Active |
| 11 | `atlas-sync-guardian` | `17-atlas-sync-guardian/atlas.js` | `*/10 * * * *` (Every 10m) | Guardian | ✅ Active |
| 12 | `antigravity-closer-guardian` | `18-antigravity-closer-guardian/closer.js` | `*/15 * * * *` (Every 15m) | Guardian | ✅ Active |
| 13 | `ops-watchdog` | `19-ops-watchdog/watchdog.js` | `*/15 * * * *` (Every 15m) | Guardian | ✅ Active |
| 14 | `broker-sync` | `20-broker-sync/sync.js` | `*/30 * * * *` (Every 30m) | Ingestion | ✅ Active |
| 15 | `usb-phone-harvester` | `21-usb-phone-harvester/index.js` | `0 10 * * 0,3` (Sun/Wed 10:00) | Harvester | ✅ Active |
| 16 | `whatsapp-scraper` | `01-whatsapp-scraper/index.js` | `*/15 * * * *` | Ingestion | ✅ Active |
| 17 | `owner-search` | `02-owner-search/search.js` | `30 10 * * *` | Discovery | ⚠️ Needs SerpAPI/CSE Key |
| 18 | `owner-contact` | `03-owner-contact/contact.js` | Manual / Legacy | Outreach | 🔄 Superseded by `09` |
| 19 | `email-sender` | `04-email-sender/send.js` | Manual / Event | Outreach | ⚠️ Needs Live SendGrid Key |
| 20 | `unit-adder` | `05-unit-adder/add.js` | `0 13 * * *` | Ingestion | ✅ Active |
| 21 | `contact-partitioner` | `09-owner-outreach/contact-partitioner.js` | On-Demand Utility | Outreach | ✅ Active |

---

## 🛠️ Developer & Operator Runbook

### Managing the Autonomous Background Stack
```powershell
# Start or verify all 3 detached background daemons (:2785, :2786, :2790)
powershell -ExecutionPolicy Bypass -File "H:\Sierra Estates\scripts\start-detached-daemons.ps1" -Service all

# Open the Standalone Admin Control Center in your browser:
start http://127.0.0.1:2790/admin

# Open the Multi-Line WhatsApp QR & Session Station:
start http://127.0.0.1:2785

# Trigger an immediate 2-hour WhatsApp report from CLI:
node "H:\Sierra Estates\workflows\lib\two-hour-outreach-digest.js"
```

### Web Platform Commands
```bash
# Install dependencies across monorepo
pnpm install

# Run workflow unit & integration tests
node --test workflows/__tests__/*.test.js

# Run full monorepo test suite
pnpm -w run type-check
pnpm -w run test:root --run
pnpm turbo run build

# Start local Next.js development server (Client & Admin)
pnpm dev
```

---

## 📄 Documentation & Status Reports

* **[`PROJECT_STATUS_AND_GAPS.md`](./PROJECT_STATUS_AND_GAPS.md)** — Complete breakdown of project status, what has been built, workflow-by-workflow operational audit, root causes fixed, current gaps, and remaining action items.

## 📄 License & Maintainers

* **Lead Engineer & Architect:** Ahmed Fawzy ([a.fawzy8866@gmail.com](mailto:a.fawzy8866@gmail.com))
* **Organization:** Sierra Estates Realty
* **Authoritative Repository:** <https://github.com/afawzy886619888866-cloud/Sierra-Estates>
* **Proprietary & Confidential:** All rights reserved.
