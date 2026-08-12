# Sierra Estates — Backend Architecture & Hierarchy

**Repository:** `Sierra-Estates-Final` → `https://github.com/ahmedfawzy8866/Sierra-Estates-Final.git`
**Frontend:** Inside monorepo → `apps/sierra-estates-realty`

---

## System Overview

```
                        INTERNET / CLIENTS
                               │
                ┌──────────────┴──────────────┐
                │                             │
          WhatsApp / Telegram              Browser (Admin)
          Webhooks / Bots                  REST API Calls
                │                             │
                ▼                             ▼
    ┌───────────────────────────────────────────────────────┐
    │              SIERRA ESTATES BACKEND                    │
    │       (Sierra-Estates-Final monorepo · Turborepo)     │
    │                                                       │
    │  ┌─────────────────┐    ┌──────────────────────────┐  │
    │  │   apps/api      │    │   apps/agents-dashboard  │  │
    │  │  (Python FastAPI│    │   (Admin Exchange Hub)   │  │
    │  │   + TS routes)  │    │                          │  │
    │  └────────┬────────┘    └──────────┬───────────────┘  │
    │           │                        │                  │
    │           ▼                        ▼                  │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │              EXCHANGE SHEET                      │  │
    │  │         Firestore /exchange collection           │  │
    │  │  agent_tasks · workflow_runs · admin_signals     │  │
    │  │  crm_events · lead_updates · property_matches   │  │
    │  └──────────┬────────────────────┬─────────────────┘  │
    │             │                    │                    │
    │             ▼                    ▼                    │
    │  ┌──────────────────┐  ┌─────────────────────────┐   │
    │  │  packages/agents │  │  packages/agents-core   │   │
    │  │  · Scribe        │  │  · Orchestrator         │   │
    │  │  · Curator       │  │  · Registry             │   │
    │  │  · Matchmaker    │  │  · Workflows Engine     │   │
    │  │  · Closer        │  └─────────────────────────┘   │
    │  └──────────────────┘                                │
    │             │                                        │
    │             ▼                                        │
    │  ┌──────────────────────────────────────────────┐   │
    │  │         SHARED PACKAGES LAYER                 │   │
    │  │  db · auth · config · memory-engine          │   │
    │  │  exchange · property-finder-api · batch      │   │
    │  └──────────────────────────────────────────────┘   │
    │             │                                        │
    │             ▼                                        │
    │  ┌──────────────────────────────────────────────┐   │
    │  │           DATA LAYER                         │   │
    │  │  Firestore (primary) · Firebase Storage      │   │
    │  │  Firebase Auth · n8n Workflows (Docker)      │   │
    │  └──────────────────────────────────────────────┘   │
    └───────────────────────────────────────────────────────┘
```

---

## Directory Hierarchy

```
Sierra-Estates-Final/                  ← Turborepo monorepo root
│
├── apps/                              ← Deployable applications
│   ├── api/                           ← 🐍 Python API server
│   │   ├── main.py                    ← FastAPI entrypoint
│   │   ├── property_finder_sync.py    ← Property Finder sync job
│   │   ├── sierra_estatese_api_integration.py  ← Full API integration
│   │   ├── sierra_estatese_bot_implementation.py ← Bot logic
│   │   ├── sierra_estatese_dsl_parser.ts  ← DSL query parser
│   │   ├── sierra_estatese_property_finder.ts ← PF connector
│   │   ├── sierra_estatese_view_configs.ts  ← View config DSL
│   │   ├── system_prompt_and_deployment.py  ← AI system prompts
│   │   ├── Dockerfile                 ← Container definition
│   │   └── requirements.txt           ← Python deps
│   │
│   ├── agents-dashboard/              ← 🎛️ Admin Exchange Hub app
│   │   └── (Next.js admin UI — reads from /exchange live)
│   │
│   ├── sierra-estates-realty/         ← 🏠 Core realty service
│   └── frontend/                      ← ⚠️ Deprecated (moved to sf1 repo)
│       └── app/admin/nexus/page.tsx   ← Exchange Hub page (keep only admin)
│
├── packages/                          ← Shared internal libraries
│   │
│   ├── agents/                        ← 🤖 Agent definitions
│   │   ├── scribe.ts                  ← Lead intake + NLU parsing agent
│   │   ├── curator.ts                 ← Listing enrichment + branding agent
│   │   ├── matchmaker.ts              ← AI property-to-lead matching agent
│   │   ├── closer.ts                  ← Contract + payment closing agent
│   │   └── index.ts                   ← Agent registry export
│   │
│   ├── agents-core/                   ← 🧠 Agent orchestration engine
│   │   └── src/
│   │       ├── orchestrator.ts        ← Multi-agent orchestrator (SBRO)
│   │       ├── registry.ts            ← Agent registry + role definitions
│   │       ├── workflows.ts           ← Workflow state machine
│   │       ├── index.ts               ← Public API exports
│   │       └── *.md                   ← Agent role specifications (20+ roles)
│   │
│   ├── exchange/                      ← 📡 Exchange Sheet client
│   │   └── exchange-client.ts         ← Firestore /exchange read/write/subscribe
│   │
│   ├── memory-engine/                 ← 🧩 Agent memory store
│   │   └── src/
│   │       ├── memory-engine.ts       ← Vector + KV memory for agents
│   │       ├── types.ts               ← Memory record types
│   │       └── index.ts               ← Public exports
│   │
│   ├── db/                            ← 🗄️ Database layer
│   │   └── (Firestore + Firebase Admin client)
│   │
│   ├── auth/                          ← 🔐 Authentication
│   │   └── (Firebase Auth + JWT guard)
│   │
│   ├── config/                        ← ⚙️ Environment config
│   │   └── (Env vars, feature flags, secrets loader)
│   │
│   ├── property-finder-api/           ← 🔌 Property Finder integration
│   │   └── (External API client + XML sync)
│   │
│   ├── batch/                         ← ⚡ Batch processing jobs
│   │   └── (Cron jobs, bulk data sync)
│   │
│   ├── api/                           ← 🌐 Shared API utilities
│   │   └── (HTTP helpers, validation, middleware)
│   │
│   ├── obsidian/                       ← 🔗 Obsidian memory integration
│   └── open-memory/                   ← 🧠 Open memory protocol
│
├── workflows/                         ← ⚡ n8n automation workflows
│   ├── 01-whatsapp-scraper/           ← Scrape & ingest WhatsApp leads
│   ├── 02-owner-search/               ← Search & verify property owners
│   ├── 03-owner-contact/              ← Auto-contact property owners
│   ├── 04-email-sender/               ← Automated email sequences
│   ├── 05-unit-adder/                 ← Auto-add inventory units to DB
│   ├── n8n-templates/                 ← Reusable n8n workflow templates
│   └── docker-compose.n8n.yml        ← n8n self-hosted Docker setup
│
├── ai/                                ← 🤖 AI model configs & prompts
├── docs/                              ← 📚 Documentation
├── scripts/                           ← 🔧 Utility scripts
├── functions/                         ← 🔥 Firebase Cloud Functions
├── .github/                           ← 🔄 GitHub Actions CI/CD
│
├── firestore.rules                    ← Firestore security rules
├── storage.rules                      ← Firebase Storage security rules
├── firebase.json                      ← Firebase project config
├── turbo.json                         ← Turborepo pipeline config
└── pnpm-workspace.yaml                ← Workspace definition
```

---

## The 4 Core Agents

| Agent | File | Role | Triggers |
|-------|------|------|---------|
| **Scribe** | `packages/agents/scribe.ts` | Raw data ingestion, NLU parsing, SBR code generation | WhatsApp/Telegram webhook → workflow |
| **Curator** | `packages/agents/curator.ts` | Listing enrichment, luxury copywriting (EN+AR), Property Finder syndication | After Scribe completes |
| **Matchmaker** | `packages/agents/matchmaker.ts` | AI lead profiling, neural property-to-lead matching, concierge proposal generation | New lead intake |
| **Closer** | `packages/agents/closer.ts` | Digital contract (DocuSign), payment processing (Stripe), commission tracking | Match confirmed by lead |

---

## The 5 Automation Workflows (n8n)

| # | Workflow | Trigger | Action |
|---|---------|---------|--------|
| 01 | **WhatsApp Scraper** | Incoming message | Extract property data → write to DB |
| 02 | **Owner Search** | New unit in DB | Search and verify property owner data |
| 03 | **Owner Contact** | Owner found | Auto-send contact request via WhatsApp/email |
| 04 | **Email Sender** | Lead update | Send automated follow-up email sequence |
| 05 | **Unit Adder** | Form submission | Parse and add new inventory unit to Firestore |

---

## The Exchange Sheet (Central Message Bus)

**Firestore collection:** `/exchange`

```
/exchange/{id}
  ├── type:       agent_task | workflow_run | admin_signal | crm_event | lead_update
  ├── source:     admin | agent | workflow | webhook | system
  ├── status:     pending → running → done | error | cancelled
  ├── payload:    { ...event-specific data }
  ├── agentId:    which agent handled it
  ├── workflowId: which workflow run
  ├── leadId:     linked CRM lead
  ├── progress:   0–100 (live progress bar in Admin Hub)
  ├── stepName:   current step label
  ├── result:     final output data
  └── error:      error message if failed
```

### Data Flow

```
Webhook / WhatsApp
       │
       ▼
  Write to /exchange (type: crm_event, status: pending)
       │
       ▼
  agents-core/orchestrator.ts picks it up
       │
       ├── Assigns Scribe agent → updates /exchange (running, 10%)
       ├── Scribe completes   → updates /exchange (running, 30%)
       ├── Curator runs       → updates /exchange (running, 60%)
       ├── Matchmaker runs    → updates /exchange (running, 85%)
       └── Closer triggered   → updates /exchange (done, 100%)
                                          │
                              Admin Hub reads live via onSnapshot()
```

---

## Authentication & Security

```
Firebase Auth
    │
    ├── Admin role    → full access to /exchange, all admin routes
    ├── Agent role    → read/write own tasks in /exchange
    └── Viewer role   → read-only on listings and proposals

Firestore Rules (/firestore.rules)
    ├── /exchange      → write: auth.token.role in ['admin','agent','workflow']
    ├── /leads         → write: auth.token.role == 'admin' || isOwnAgent
    └── /listings      → read: public | write: admin only
```

---

## CI/CD Pipeline

```
GitHub Push → .github/workflows/
    │
    ├── lint.yml      → ESLint + TypeScript check on all packages
    ├── test.yml      → Jest unit tests for agents-core, memory-engine
    ├── build.yml     → Turborepo build pipeline (all packages)
    └── deploy.yml    → Vercel deploy (admin app) + Firebase deploy (functions, rules)
```

---

## Key Principles

| Principle | Implementation |
|-----------|---------------|
| **Separation of concerns** | Frontend and Backend unified in `Sierra-Estates-Final` monorepo. |
| **Single source of truth** | All state flows through Firestore `/exchange` collection |
| **Event-driven** | Agents don't call each other — they write to Exchange Sheet |
| **Observable** | Admin Hub reads all state live via Firestore `onSnapshot` |
| **Stateless agents** | Agents store context in `packages/memory-engine` not in-memory |
| **Typed contracts** | All Exchange records typed via `ExchangeRecord` interface |
| **Monorepo packages** | Shared code in `packages/` — never duplicated across apps |

