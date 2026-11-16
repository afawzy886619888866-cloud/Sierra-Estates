# Sierra Estates — Total Components & Feature Inventory

**Date:** 19 Jul 2026 · **Scope:** backend, bots, agents, workflows, integrations. Frontend not scanned, per standing rule.
**Sources:** Sierra-8866/Sierra-Deploy@main (live) + ahmedfawzy8866/arc (archive) + Sierra-Deploy's own nested archives.

Legend: 🟢 live in repo · 🟡 live but thin/stub · 🔵 staged for approval · 🟠 in FUTURE_PLAN (logic captured, code not mergeable yet) · ⚫ archived generations (reference only)

---

## 1. API surface — 89 routes (`apps/sierra-estates-realty/app/api`) 🟢

| Domain | Routes |
| --- | --- |
| Admin console | 39 routes: agents, audit, auth(+verify), automations(+executions), bots, dashboard, db editor, deploy, followups, ingest, inquiries, knowledge-base, leads(+bulk), listings, media upload, migrate, owner-negotiations(+messages), pages, python-service health, reports, schedule-viewing, search-insights, team, users, whatsapp send, workflows |
| Leads & CRM | leads, leads/request-viewing, crm/leads, crm/property-finder, inquiries, viewing-requests, matches, matching |
| Listings & inventory | listings(+id), compounds, properties/sync, feeds/property-finder, houyez/seed, search/semantic |
| AI / agents | agent/hub (Scribe·Curator·Matchmaker·Closer), chat, closer/initiate, concierge (4 routes), orchestrate (S1–S10), openclaw, openclaw-terminal, proposals |
| Wealth | wealth/portfolio, wealth/roi |
| Messaging & webhooks | whatsapp webhook+heartbeat, ingest/whatsapp, webhooks/{whatsapp, property-finder, twilio-inbound, twilio-status}, telegram setup+webhook |
| Sync & cron | sync, sync/publish, sync/airtable, sync/obsidian, cron/{sync-leads, sync-listings, ingest-from-sheets, maintenance, whatsapp-dispatch} |

## 2. Services — 47 modules (`lib/services`) 🟢

**Core engines:** matching-engine, sales-engine, closing-engine + ClosingSimulator, commission-engine, feedback-engine, viewing-engine, portfolio-engine, financial-service, roi-service, profiling-service, coding-algorithm + coding-service, legal-brain, listing-normalize (11.5 KB), sync-engine (13 KB), orchestrator (8 KB).
**Integrations:** AirtableIntegrationService (13.5 KB), SheetsIntegrationService, PFIntegrationService + PropertyFinderService, OmnichannelChatService, telegram-alert + telegram-controller, voice-service.
**Data/infra:** firestore-service, StorageService, vector-service, memory-service, dashboard-metrics, new-cairo-market-stats, MaintenanceMonitor, WhatsAppParserService (11.4 KB, tested) + WhatsAppStatusService.
**Agents-adjacent:** antigravity-agent, nexus-agent, skill-loader, handoff-service, branding-service.
🟡 **InventoryService.ts — 1.7 KB, 2 methods only** (see Enhancements §8).
🔵 **payment-service.ts, pdf-export-service.ts** — staged, restore missing payment + PDF capability.

## 3. Agents & bots 🟢

| Component | Where | What it does |
| --- | --- | --- |
| Scribe / Curator / Matchmaker / Closer | `lib/agents/` | 4-persona pipeline behind `/api/agent/hub` |
| Leila agent | `lib/agents/leila-agent.ts` | Concierge persona |
| Antigravity agent | `lib/agents` + `lib/services` (2 variants) | Autonomous task agent |
| Nexus agent | both | Admin AI |
| Stage-9 closer | `apps/agents/stage-9-closer` + MCP server | Deal-closing automation |
| Sierra Estates bot | `apps/agents/sierra-estates-bot` (3 py files) | Python master bot (implementation + system prompt + API integration) |
| WhatsApp bot | `apps/agents/whatsapp-bot` (14 files) | Group listener/responder |
| WhatsApp scraper | `apps/agents/whatsapp-scraper` (558 files) | Group scraping worker w/ heartbeat |

## 4. MCP servers — 5 🟢

`stripe-payments` · `docusign-signing` · `whatsapp-messaging` · `sierra-deals` · `stage-9-orchestration`

## 5. Server infrastructure (`lib/server`, 17 modules) 🟢

automation-executor (13 KB) · search-service (17.6 KB) · whatsapp-queue (13.6 KB) · twilio-client · n8n-client · python-api-client · openclaw bridge · google-ai · firebase-admin · app-check · auth-guard · cors · rate-limit · schemas (8.7 KB) · gravity.ts · admin-spa-mappers

## 6. Workflows & pipelines 🟢

- **S1–S10 orchestration:** WhatsApp → Scribe → Firestore rawScrapeData → Cloud Function processDataForApp → Matching (S6-S8) → Stage-9 Closer → Telegram + Proposals
- **n8n:** templates in `workflows/n8n-templates` + `infra/n8n-workflows`, docker-compose
- **Numbered workers:** 01-whatsapp-scraper → 02-owner-search → 03-owner-contact → 04-email-sender → 05-unit-adder
- **Cron (Vercel):** 4 daily jobs. **Firebase Functions:** collectData, processDataForApp
- **Python service** (`apps/api`, FastAPI/Docker): PropertyFinder sync + bot integration

## 7. Packages 🟢

open-memory (277 files) · agents-core (62) · memory-engine · db · admin-data · ui · exchange · obsidian · property-finder-api · shared · types · auth · batch · config

## 8. Recovered / staged / future

| Item | Status | Where |
| --- | --- | --- |
| Full DSL parser (16.7 KB, replaces 36-byte stub) | 🔵 staged | `staged/.../lib/dsl/parser.ts` |
| PaymentService (Stripe/escrow) | 🔵 staged | `staged/.../payment-service.ts` |
| PDFExportService (proposals) | 🔵 staged | `staged/.../pdf-export-service.ts` |
| verify-backend.mjs smoke test | 🔵 staged | `staged/scripts/` |
| integration_config.py | 🔵 staged | `staged/apps/api/` |
| Gravity Memory pipeline (3 scripts) | 🟠 FUTURE_PLAN/01 | logic captured; `gravity_core` module missing |
| mempalace vector-memory backends | 🟠 FUTURE_PLAN/02 | decision: dependency vs copy |
| Old bot generations (sierra_blue_*, 7–20 copies each) | ⚫ | do not merge |
| RuView, key-key-, setup-node | ⚫ unrelated products | excluded |
