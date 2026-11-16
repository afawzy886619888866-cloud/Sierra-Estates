# Sierra Estates — System Architecture & Engineering Blueprint

This document is the **authoritative architectural blueprint** for Sierra Estates. It defines runtime boundaries, module ownership, component topologies, data flow patterns, and security guardrails across the platform.

Deployment protocols and release procedures are defined in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 1. System Topology Overview

Sierra Estates is architected as an event-driven, decoupled system combining high-performance Next.js frontends with an autonomous 4-Engine intelligence and automation plane:

```mermaid
flowchart TD
    subgraph Clients ["Web & Staff Clients"]
        WEB["Public Luxury Buyer Experience\n(sierra-estates.net)"]
        ADMIN["Admin Intelligence OS\n(admin.sierra-estates.net)"]
        FALLBACK["Static Lead Capture Portal\n(legacy.sierra-estates.net)"]
        PROXY["Edge Proxy & Host Router\n(proxy.ts)"]
    end

    subgraph CoreBackend ["Authoritative Backend (Supabase)"]
        POSTGRES[("PostgreSQL 15 Core Schema\n(27 Migrations)")]
        PGVEC[("pgvector Embeddings (768-dim)\nSemantic Matchmaking")]
        MEDIA[("Supabase Storage\nproperty-media bucket")]
        AUTH["Supabase Auth & RLS Policies"]
    end

    subgraph FourEngines ["Autonomous 4-Engine Automation Plane"]
        E1["Engine 1 · Memory & Learning\n(Obsidian Vault + ECC + Unified Memory)"]
        E2["Engine 2 · RAG & GIS Map Engine\n(Leaflet Polygons + Compound Assets)"]
        E3["Engine 3 · Valuation & Reasoning\n(DeepSeek Harness + Cairo AVM)"]
        E4["Engine 4 · Workflows & Syndication\n(OpenWA :2785 + Runner :2786 + PF Atlas)"]
    end

    subgraph Gateways ["External Integrations & Networks"]
        WA["OpenWA WhatsApp Pool (Lines 1-8)\nCloudflare Tunnel (:2785)"]
        PF["Property Finder Enterprise Atlas v1\nOAuth2 REST & Lead Sync"]
        TG["Telegram Agency Bot (@arias_sierra_blue_bot)"]
    end

    WEB --> PROXY
    ADMIN --> PROXY
    FALLBACK --> PROXY

    PROXY --> AUTH
    AUTH --> POSTGRES
    AUTH --> PGVEC
    POSTGRES --> MEDIA

    POSTGRES <--> E1
    POSTGRES <--> E2
    POSTGRES <--> E3
    POSTGRES <--> E4

    E4 <--> WA
    E4 <--> PF
    E4 --> TG
```

---

## 2. Monorepo Structure & Package Boundaries

The codebase is structured under **Turborepo** with strict boundary isolation between presentation, shared services, and background workers:

```text
Sierra-Estates/
├── prompts/                        # Centralized versioned system prompts, Zod schemas & WA/TG templates
├── agents/                         # Unified AI Agent Bus (PropertyParser, UnitCoder, InventoryMatcher, LeadQualifier, Dispatcher, CareerEvaluator)
├── automations/                    # Central automation & worker registry (scrapes, dispatchers, sheet syncs, crons)
├── core/                           # Grouped startup env validator, phone/unit deduplication & PII redaction utilities
├── apps/
│   ├── sierra-estates-realty/      # Next.js 16.4 Dual-Domain Portal (sierra-estates.net & admin.sierra-estates.net) + /api/* routes
│   ├── agents/                     # OpenWA 8-line station (:2785) & WhatsApp bot routers
│   ├── api/                        # Python FastAPI integration workers (Property Finder sync & bot hooks)
│   └── automations/                # Scheduled worker entry points writing through DB helpers
├── packages/
│   ├── memory-engine/              # Unified Obsidian + ECC MemoryBrainEngine RAG
│   ├── db/                         # Authoritative Supabase clients & typed records
│   ├── agents/                     # Autonomous agents (Matchmaker, Closer, Scribe)
│   ├── agents-core/                # Agent lifecycle contracts & dispatch helpers
│   ├── ai-agent-sdk/               # Shared agent runtime & tool SDK
│   ├── ai-orchestrator/            # Multi-model gateway (Google Gemini, OpenAI & DeepSeek)
│   ├── deepseek-harness/           # 10-scenario Egyptian real-estate benchmark suite
│   ├── exchange/                   # FX currency, gold-parity & financial arbitrage calculator
│   ├── property-finder-api/        # Property Finder Atlas v1 OAuth2 API connector
│   ├── obsidian/                   # Obsidian vault markdown parser & sync
│   ├── shared/                     # Common types, validation schemas & utilities
│   └── ui/                         # Luxury design tokens & shared primitives
├── workflows/                      # 19 orchestrated workflow modules, Telegram intake & reply classifier
├── infra/                          # Docker Compose definitions (RAG station & workflow runner)
├── scripts/                        # Apps Script unified engines, deployment gates & verification suites
├── .github/workflows/              # CI/CD pipelines, cron triggers & Vercel production dispatch
└── supabase/                       # 27+ SQL migrations, schema definitions & RLS tests
```

### Boundary Rules
1. **Thin Frontends:** `apps/sierra-estates-realty` owns HTTP request handling, server component rendering, session checks, and fast UI responses. It never executes unbounded background jobs.
2. **Worker Separation:** Long-running scraping, batch updates, WhatsApp broadcasts, and AI evaluations run exclusively in `workflows/`, `apps/automations`, or dedicated containers.
3. **Canonical DB Helper:** All server-side data mutations must pass through `packages/db` and execute the `assertCanonicalBackendForWrites()` guard.

---

## 3. The 4-Engine Revenue & Intelligence Machine

### Engine 1: Memory & Learning (`packages/memory-engine`)
* **Episodic Context Cache (ECC):** Retains multi-turn conversation context across buyer preferences and owner negotiation concessions.
* **Obsidian Knowledge Vault:** Connects domain notes on compound histories, maintenance rates, and developer reputations directly to AI prompts.
* **Unified Memory Store:** Synchronizes conversational state into `public.unified_memory` and links leads to `public.leads`.

### Engine 2: RAG & GIS Map Matching (`apps/sierra-estates-realty/app/api/inventory`)
* **Precision GIS Boundaries:** Geospatial polygons for 18 top New Cairo masterplans (Hyde Park, Mountain View iCity, Mivida, Palm Hills, Katameya Heights, etc.).
* **Verified Media Registry (`compound-real-photos.json`):** 645 verified Property Finder CDN photographic assets categorized by compound.
* **OpenClaw Photo Harvester:** Identifies 1,478 direct owner units missing photos and automatically generates compound-prioritized outreach queues.

### Engine 3: Valuation, Pricing & DeepSeek Reasoning (`packages/deepseek-harness`)
* **10-Scenario Real Estate Benchmark:** Evaluates AI responses for:
  * Accurate price/m² calculation in New Cairo submarkets.
  * Egyptian Arabic colloquial sentiment and lead intent classification.
  * Lease and sales contract clauses with local legal validity.
  * Gold-parity and FX arbitrage calculations.
* **Threshold Quality Gate (`scripts/check-thresholds.ts`):** Enforces production workflow error rates `<25%` and queue depths `<250`.

### Engine 4: Workflows, OpenClaw & Syndication (`workflows/`)
* **19 Workflow Modules:** Executes sync, catalog validation, and lead alerts under `workflows/runner.js` (`:2786`).
* **OpenWA WhatsApp Pool (`:2785`):** 8 active phone lines routed via Cloudflare Tunnel, enforcing Egyptian business hours (`10:00–20:00 Africa/Cairo`) and 45–55s human-like pacing intervals.
* **Closed-Loop Reply Classifier (`workflows/lib/inbox.js`):** Classifies owner replies into Opt-Out (`إلغاء`), Available (`متاحة`), or Sold (`اتباعت`), updating `public.listings.status` automatically.
* **Property Finder Atlas v1 Syndication:** Real-time OAuth2 synchronization of listings and buyer leads between Property Finder and Supabase.

---

## 4. End-to-End 4-Stage Data Pipeline & Event Lifecycle

Every property unit, buyer demand, viewing request, and career candidate flows through four deterministic stages:

```text
[Stage 1: Ingestion]
  ├─► WhatsApp 8-Line OpenWA Pool (:2785) & Group Listener (https://chat.whatsapp.com/D6AExC2APpoArzhYkmns5i)
  ├─► Telegram 1-to-1 & Group Intake (@arias_sierra_blue_bot → Telegram_Intake)
  ├─► Owner / Broker Google Spreadsheets (Owners Master, Master_Inventory)
  └─► Website Landing Pages (/add-listing, /easy-listing, /request, /career, /careers, /broker)
          │
          ▼
[Stage 2: AI Parsing, Coding & Deduplication] (/prompts/index.ts + /agents/index.ts + /core/deduplication.ts)
  ├─► PropertyParserAgent: Extracts bilingual Arabic/English specs into PropertyListingExtractionSchema (Zod)
  ├─► Channel Classifier: Separates Direct Owner ("من المالك") vs Broker listings
  ├─► UnitCoderAgent: Assigns canonical code SE-<COMPOUND>-<S|R>-<AREA>-<SUFFIX>
  └─► Dedup Lock: Normalizes Egyptian mobile (01xxxxxxxxx) + compound + area bucket
          │
          ▼
[Stage 3: Persistence & Bi-Directional Sync] (packages/db + Google Apps Script v6.0/v6.1)
  ├─► Supabase PostgreSQL: Upserts public.listings, public.inquiries, public.leads, public.viewings, public.career_applications
  ├─► Inventory Online Sheets: Syncs Owners Master, Master_Inventory, Real_Available_Units
  └─► Requests & Hiring Online Sheets: Syncs Client_Requests & Career_Applications (live inside /admin)
          │
          ▼
[Stage 4: Matching, Privacy-Safe Auto-Reply & Dispatch] (/api/whatsapp/webhook + /api/inquiries)
  ├─► InventoryMatcherAgent: Ranks matching units + calculates EGP/sqm arbitrage verdict
  ├─► Public Group Auto-Reply: Publishes ONLY unit details & unit code (ZERO owner/broker phone numbers)
  ├─► Private Admin Forward: Sends confidential owner/broker contact phone exclusively to 01092048333
  └─► External Syndication & Outreach: Property Finder Atlas v1 + Scheduled WhatsApp Station Outbox
```

### A. Client Search & Discovery Flow
```text
Buyer Browser
  └─► GET https://sierra-estates.net/inventory
        └─► Edge Proxy (proxy.ts)
              └─► Next.js App Router (Server Component)
                    └─► packages/db (Supabase Query)
                          ├─► Filter: status = 'available' AND publish_status = 'PUBLISHABLE'
                          ├─► Join: public.compounds (Geospatial Polygons)
                          └─► Return: Hydrated listing cards with mode chips & GIS coords
```

### B. Inbound Owner WhatsApp Reply Flow
```text
Owner Phone (WhatsApp)
  └─► OpenWA Gateway (:2785)
        └─► POST /api/whatsapp/webhook
              └─► workflows/lib/inbox.js (Reply Classifier)
                    ├─► If 'متاحة' (Available):
                    │     ├─► UPDATE public.listings SET status = 'available'
                    │     ├─► UPSERT public.leads (Qualified Seller)
                    │     └─► Enqueue Photo Collection if photos < 3
                    ├─► If 'إلغاء' (STOP/Opt-out):
                    │     └─► APPEND .state/owner-outreach-optouts.jsonl
                    └─► If 'اتباعت' (Sold):
                          └─► UPDATE public.listings SET status = 'sold'
```

---

## 5. Security Architecture & Zero-Trust Posture

### Identity & Access Control
* **Supabase Auth:** Primary authentication boundary with Role-Based Access Control (RBAC).
* **Session Integrity:** HMAC-SHA256 signed `sierra_sess` cookie session token.
* **Failsafe Gates:** The legacy `ADMIN_BOOTSTRAP_PASSWORD` route is permanently deactivated (returns HTTP 401).

### Static Analysis & Vulnerability Remediation (120/120 Resolved)
* **OAuth 2.1 RFC 6749 §4.1.3 Compliance:** Client ID, redirect URI, and token parameters are strictly validated; access-token email extraction never accepts unverified client payloads.
* **Prototype Pollution Neutralization (CWE-1321):** Dynamic dictionary stores use `Object.create(null)` and block `__proto__`, `constructor`, and `prototype` keys.
* **Polynomial ReDoS Defense (CWE-400):** Untrusted string inputs are bounded via `.slice(0, 500)` and regular expressions eliminate overlapping optional quantifier groups.
* **TOCTOU File System Race Protection (CWE-362):** Replaced non-atomic check-then-write logic with atomic `{ flag: 'wx' }` write operations and explicit `try/catch` handlers for `ENOENT`.
* **CRLF Log Injection Defense (CWE-117):** Universal sanitization replaces newline and carriage return characters (`[\r\n]`) across all application loggers.

### Data Privacy & Owner PII Containment
* **Redaction Gate:** Public inventory exports (`GET /api/inventory/download` in CSV/XLSX format) automatically redact private owner phone numbers.
* **Concierge Masking:** All public-facing buyer contact links route to the agency helpline `+201092048333` rather than exposing direct owner numbers.

---

## 6. Decommissioned Legacy Infrastructure

The following legacy components have been completely retired from the production path:

1. **Firebase Hosting, Functions & Firestore:** Fully retired. Supabase is the sole authoritative datastore.
2. **Legacy AWS EC2 Host (`54.89.162.250`):** Replaced by the containerized Docker Runner (`:2786`) and OpenWA RAG Station (`:2785`) via Cloudflare Tunnel.
3. **Standalone Legacy Admin Repo:** Consolidated into the unified monorepo under `apps/sierra-estates-realty`.
4. **Plaintext Admin Backdoors:** Removed and locked.


---

## 11. Intake Pipelines (Module 1–5 Revision, 2026-11-15)

### 11.1 Route inventory (additions & fixes)

| Route | Type | Purpose |
| --- | --- | --- |
| `/add-listing` | Public page | Owner/Broker listing submission (PublicAddListingForm) |
| `/api/listings/add` | POST | Module-4 pipeline: dedup → unit code → Supabase+Sheets dual-write → storage → Telegram |
| `/api/inquiries` | POST | Module-2 pipeline (client requests): normalized phone → matcher → `client_requests` + `Client_Requests` sheet + Telegram (fixed: phantom-column insert, fake-success fallback, Telegram HTML injection) |
| `/api/admin/client-requests` | GET/PATCH | Admin console + two-way status sync (Supabase + sheet row update by `Request_ID`) |
| `/api/careers/apply` | POST | Module-3 dual-write + Telegram HR alert (+ legacy Resend lane) |
| `/api/admin/applicants/[id]` | PATCH | Stage (`New→Screening→Interview→Offer→Hired/Rejected`), scorecard rating (A+…D), notes — synced to `Careers_Applicants` sheet |

### 11.2 Google Sheets schema (canonical, auto-created headers)

**Client_Requests**: `Request_ID | Timestamp | Client_Name | Phone_Normalized | Transaction_Type | Property_Type | Compound_Zone | Budget_EGP | Area_SQM | Bedrooms | Promo_Applied | Matched_Unit_Codes | Assigned_Agent | Status | Notes`

**Careers_Applicants**: `App_ID | Timestamp | Full_Name | Phone | Email | Role | Work_Mode | Experience_Yrs | Current_Brokerage | CV_Link | Scorecard_Rating | Stage | Notes`

**Master_Inventory**: `Unit_Code | Date_Added | Last_Action_Timestamp | Deal_Type | Canonical_Compound | Unit_Type | Area_SQM | Bedrooms | Bathrooms | Floor | Furnishing | Finishing | Price_EGP | AI_Fair_Price_Benchmark | Is_Featured_Gem | Owner_Name_Internal | Owner_Mobile_Internal | Contact_Status | Listing_Status | Sourced_By_Agent | Verified_By_Employee | Media_Links | Notes`

**Real_Available_Units**: Master_Inventory + `Verified_Available_Date` (inserted after `Last_Action_Timestamp`). Appended when availability = `Available`.

**Owners Master family** (`owners rent` / `owners resale` via Apps Script bridge, `brokers rent` / `brokers resale` for co-brokers): 20-column positional row — see `lib/services/GoogleSheetSyncService.ts`.

### 11.3 Status vocabularies (two-way sync)

- Client requests: `New → Contacted → Viewing Scheduled → Closed` (Admin PATCH ↔ sheet row update keyed on `Request_ID`).
- Applicants: `New → Screening → Interview → Offer → Hired | Rejected` + scorecard `A+…D` (DB trigger keeps legacy `status` aligned).

### 11.4 Webhook & notification triggers

| Trigger | Lane |
| --- | --- |
| New client request | Telegram `sales_advisor` (env `TELEGRAM_SALES_REP_CHAT_ID` → DB `telegram_role_chats`) with matched unit codes |
| New career applicant | Telegram `hr` (`TELEGRAM_HR_CHAT_ID`) with scorecard-ready profile |
| New/merged listing | Telegram `sales_advisor` with unit code, specs, admin+map links |
| WhatsApp inbound (owner intake) | `OwnerListingIntakeService` event ledger → staff Telegram + WhatsApp prompts |

### 11.5 Unit coding rules (canonical)

`SE-SL/SE-RNT-[AREA]-[SERIAL]` — `[AREA]` from `COMPOUND_CODE_GAZETTEER` (Hyde Park→HYD, Mountain View→MVI, Mivida→MVD, Palm Hills→PK, 5th Settlement→5ST, …), `[SERIAL]` deterministic FNV-1a of `compound|dealType|seed` (seed = normalized phone + unit no. + BUA). Provided canonical codes pass through uppercase-normalized.
