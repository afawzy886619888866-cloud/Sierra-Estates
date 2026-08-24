# Sierra Estates Platform

Luxury PropTech monorepo for the New Cairo market (pnpm + Turborepo). Firebase project: **`sierra-blu`**. Authoritative deployment policy: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

> **Current status** (August 2026): The platform is **pre-production complete** across all 4 phases of the roadmap. All core systems are implemented, tested, and ready for live deployment. The web surface is built with **Next.js 16** (App Router), deploying via Vercel for the public client portal (`sierra-estates.net`) and the staff admin console (`admin.sierra-estates.net`). Authentication uses Firebase Auth with server session cookies (`sierra_sess`). Backend workers, scrapers, and AI agents run on Cloud Run, n8n, Firebase Functions, and scheduled GitHub Actions.

---

## 🏗️ Platform Phases

| Phase | Title | Status |
| :--- | :--- | :--- |
| **Phase 1** | Security Stack (Firestore RBAC, sanitization, retry queues, observability) | ✅ Complete |
| **Phase 2** | Client Portal (Listings, AI tools, compounds map, virtual tour, bilingual) | ✅ Complete |
| **Phase 3** | Admin Console (Clay design, KPI dashboard, CRM, kanban, agent fleet UI) | ✅ Complete |
| **Phase 4** | Intelligence OS (Multi-agent orchestration, memory engine, predictive analytics) | ✅ Complete |

---

## 📦 Repository Structure

```text
SE-Vercel-deploy-main/
├── apps/
│   ├── sierra-estates-realty/  # Main Next.js 16 app (public site + admin portal + API routes)
│   │   ├── app/(site)/         # Public client portal — bilingual EN/AR
│   │   ├── app/admin/          # Staff admin console — Claymorphic design system
│   │   ├── app/api/            # Edge & Node REST API routes, session auth, webhooks
│   │   ├── components/         # Premium UI design system & spatial components
│   │   └── lib/                # Services, Firestore models, agents, server utilities
│   ├── api/                    # Python FastAPI service (Cloud Run :8000) — bots & scrapers
│   └── automations/            # Automated workflows & data pipelines
├── packages/
│   ├── agents-core/            # Autonomous agent orchestration (S1–S10 workflows)
│   ├── ai-agent-sdk/           # Multi-modal AI agent utilities (Gemini 2.5 Pro / Vertex AI)
│   ├── ai-orchestrator/        # Pipeline coordination (10-stage Intelligence OS)
│   ├── memory-engine/          # Multi-agent spatial memory & Obsidian vault syncing
│   ├── exchange/               # Real-time message exchange & events
│   ├── admin-data/             # Admin console typed data abstractions & schemas
│   ├── agents/                 # Agent definitions (OpenClaw, Scribe, Curator, Closer, Liela)
│   ├── db/                     # Firestore typed models & access layer
│   ├── deepseek-harness/       # DeepSeek evaluation harness
│   ├── obsidian/               # Obsidian vault markdown parsing & vault syncing
│   ├── shared/                 # Shared domain types, validators, utility functions
│   ├── ui/                     # Shared UI components & design system tokens
│   └── whatsapp-agent/         # WhatsApp webhook parser & Scribe ingestion agent
├── functions/                  # Firebase Cloud Functions (Node.js 22, europe-west1)
├── __tests__/                  # 65 Vitest/Jest integration test suites (698 tests)
├── .github/workflows/          # CI/CD pipelines (18 workflows)
├── firestore.rules             # Production Firestore RBAC security rules
├── storage.rules               # Production Firebase Storage security rules
├── pnpm-workspace.yaml         # Monorepo workspace configuration
├── turbo.json                  # Turborepo build pipeline & cache config
├── firebase.json               # Firebase Functions, Firestore, Storage configuration
└── docs/                       # Architecture guides, API contracts, runbooks
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+
- **pnpm** 9+
- **Python** 3.12+ (for `apps/api`)
- **uv** (Python package manager — `pip install uv`)
- **Docker & Docker Compose** (optional, for local n8n / emulator setup)
- **Firebase CLI** (`npm i -g firebase-tools` for rules and functions deployment)

### Local Setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure environment variables
cp .env.example apps/sierra-estates-realty/.env.local
# Fill in all NEXT_PUBLIC_FIREBASE_* and server secrets

# 3. Start local development server (Next.js on :3000)
pnpm dev

# 4. (Optional) Run Python API locally on :8000
cd apps/api && uv run uvicorn main:app --reload

# 5. (Optional) Run n8n workflows locally on :5678
docker-compose -f docker-compose.n8n.yml up -d
```

### Verification & CI Checks

```bash
# Full monorepo type-check (all 13 workspaces)
npx turbo run type-check

# Run all Vitest integration tests (30 suites, 272 tests)
npx vitest run __tests__

# Run client app Jest tests in CI mode (65 suites, 698 tests)
pnpm --filter sierra-estates-client-page test:ci

# Run Python FastAPI & ECC tests (24 tests)
uv run --with-requirements apps/api/requirements.txt --with pytest pytest apps/api/

# Run Firebase Functions tests (26 tests)
pnpm --filter sierra-estates-functions test
```

### CI Test Summary

| Suite | Tests | Status |
| :--- | :---: | :---: |
| TypeScript monorepo type-check | 13 workspaces | ✅ |
| Vitest integration suites | 272 / 272 | ✅ |
| Client Jest CI suites | 698 / 698 | ✅ |
| Firebase Functions Jest | 26 / 26 | ✅ |
| Python FastAPI / ECC pytest | 24 / 24 | ✅ |

---

## 🔐 Admin Authentication

The admin console is at `admin.sierra-estates.net/admin` (or `/admin` locally).

1. **Sign-in**: Browser authenticates via Firebase Auth (email/password) and receives a short-lived ID token.
2. **Session Minting**: ID token sent to `POST /api/auth`.
3. **Verification**: Firebase Admin SDK validates the token, checks Firestore `users/{uid}` for an `admin|manager|agent` role, and signs an `httpOnly SameSite=Lax` session cookie (`sierra_sess`).
4. **Route Guard**: `middleware.ts` and server layouts enforce `sierra_sess` validation on every `/admin/*` request.

### Key Auth Environment Variables

| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | Firebase browser SDK initialization |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | Firebase project `sierra-blu` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server Only | Admin SDK service account |
| `SESSION_SECRET` | Server Only | HMAC signing key for `sierra_sess` cookie |
| `ADMIN_BOOTSTRAP_EMAIL` / `PASSWORD` | Dev Only | Offline local dev fallback credentials |

---

## 🤖 Intelligence OS — Agent Pipeline (S1–S10)

Sierra Estates runs a 10-stage autonomous agent pipeline powered by **Gemini 2.5 Pro** and **Vertex AI**:

```text
WhatsApp Groups ──▶ /api/webhooks/whatsapp ──▶ Firestore rawScrapeData
                         (Scribe S1)                       │
                                                           ▼
                                          Cloud Function processDataForApp (S2)
                                                           │
                    ┌──────────────────────────────────────┘
                    ▼                       ▼
              Curator Agent          Matchmaker Agent         Closer Agent
            (AVM Pricing S3-5)   (Buyer Matching S6-8)    (Proposals S9)
                                                           │
                                                           ▼
                                          Memory Engine (S10 — Obsidian Vault)
```

### Agent Fleet

| Agent | Role | Engine |
| :--- | :--- | :--- |
| **Scribe** | WhatsApp group listener & normalizer | Gemini 2.0 Flash + Rule Engine |
| **OpenClaw** | WhatsApp inventory harvester & XLSX ingestion | Vertex AI + xlsx parser |
| **Curator** | AVM pricing & portfolio deduplication | Valuation matrix + LLM |
| **Matchmaker** | Buyer-to-listing matching (ROI, zone, specs) | Gemini 2.5 Pro |
| **Closer** | Proposal drafting & Telegram broker alerts | Gemini 2.0 Flash |
| **Liela Bot** | Conversational real estate concierge | Gemini 2.0 Flash + Memory |
| **Intelligence OS** | Multi-agent orchestration (NLP → ML → Guard → Docs) | `runIntelligenceWorkflow` |

---

## 🌐 API Directory

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/auth` | POST / DELETE | Firebase ID token → `sierra_sess` cookie / Logout |
| `/api/agent/hub` | POST | Multi-agent execution hub (Scribe, Curator, Matchmaker, Closer) |
| `/api/closer/initiate` | POST | Stage 9 automated closer agent |
| `/api/leads` | GET / POST | Manage buyer leads & investment profiles |
| `/api/leads/request-viewing` | POST | Create property viewing requests |
| `/api/listings` | GET / POST | Fetch & manage verified portfolio inventory |
| `/api/matching` | POST | Multi-variable property-to-buyer matching |
| `/api/orchestrate` | POST | Full S1–S10 Intelligence OS pipeline trigger |
| `/api/pricing/evaluate` | POST | AVM valuation & arbitrage analysis |
| `/api/properties/sync` | POST | PropertyFinder synchronization trigger |
| `/api/proposals` | POST | Generate dynamic investment proposals |
| `/api/sync` | GET / POST | Master inventory synchronization |
| `/api/telegram/webhook` | POST | Telegram bot notification handler |
| `/api/webhooks/property-finder` | POST | PropertyFinder incoming webhook (HMAC verified) |
| `/api/webhooks/whatsapp` | GET / POST | WhatsApp webhook verification & ingestion |
| `/api/whatsapp/heartbeat` | POST | WhatsApp scraper healthcheck |

---

## 🚢 Deployment Architecture

Full details: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

### Web Applications (Vercel)

- **Client Portal**: `sierra-estates.net` → Vercel Project `sierra-estates-client-page`
- **Admin Console**: `admin.sierra-estates.net` → same Vercel deployment at `/admin`
- **CI/CD**: `.github/workflows/deploy-vercel.yml` builds & deploys on merge to `main`

### Backend Infrastructure (Firebase `sierra-blu`)

- **Firestore RBAC Rules**: Deploy via `pnpm deploy:rules` or `firebase deploy --only firestore:rules,storage`
- **Cloud Functions**: Node.js 22 functions via `pnpm deploy:functions`
- **Firebase Hosting**: Issues a 302 redirect from `admin-sierra-blu` → `https://admin.sierra-estates.net/admin`

### Background Workers & Integrations

| Service | Runtime | Purpose |
| :--- | :--- | :--- |
| Python FastAPI (`apps/api`) | Cloud Run :8000 | PropertyFinder scraper, bot webhooks, ECC |
| n8n Automations | VPS Docker :5678 | Lead routing, notification workflows |
| Scheduled GitHub Actions | GitHub Actions | Nightly sync, WhatsApp dispatch, cron bridges |

---

## 🎨 Design System

The platform runs a dual design system:

- **Client Portal**: High-end luxury editorial — Double-Bezel (Doppelrand) property cards, floating island glassmorphism navigation, smooth `cubic-bezier(0.16, 1, 0.3, 1)` spring physics, AI score micro-badges, and bilingual Arabic RTL support.
- **Admin Console**: Tactile Claymorphism — pneumatic dual-shadow bevels, squircle card surfaces, spring button click physics, and full dark/light mode with clay token system (`--clay-card-shadow`, `--clay-card-inset`, `--clay-btn-shadow`).

---

## 🛡️ Security & Compliance

- **Strict Type Safety**: TypeScript strict mode across all 13 workspace packages.
- **Session Security**: `httpOnly`, `Secure`, `SameSite=Lax` cookies with HMAC verification.
- **Zero Committed Secrets**: All credentials managed via Google Secret Manager, Vercel Env Vars, and GitHub Secrets.
- **Firestore RBAC**: Role-based access (`admin|manager|agent`) with granular read/write policies (`firestore.rules`).
- **API Guardrails**: Zod schema validation and rate limiting on all public endpoints.
- **CORS & CSP**: Restrictive HTTP security headers configured in `proxy.ts` and `vercel.json`.
- **Input Sanitization**: 10+ LLM injection pattern blocking via `sanitizer.ts`.

---

## 📚 Documentation Index

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Authoritative deployment policy, release matrix, and runbooks
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Monorepo architecture and data flow diagrams
- [`API.md`](./API.md) — REST API specifications and request/response contracts
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Developer onboarding, branch conventions, and testing guidelines
- [`SECURITY.md`](./SECURITY.md) — Threat model, security boundaries, and vulnerability reporting
- [`MASTER_PROJECT_ROADMAP.md`](./MASTER_PROJECT_ROADMAP.md) — Full 4-phase delivery roadmap
- [`PHASE_4_INTELLIGENCE_OS_BLUEPRINT.md`](./PHASE_4_INTELLIGENCE_OS_BLUEPRINT.md) — Multi-agent AI architecture
- [`NEXT_STEPS.md`](./NEXT_STEPS.md) — Pre-deploy checklist and remaining production gates
- [`docs/ADMIN_MIGRATION_PLAN.md`](./docs/ADMIN_MIGRATION_PLAN.md) — Admin console migration blueprint
- [`docs/FIREBASE_APPCHECK_SETUP.md`](./docs/FIREBASE_APPCHECK_SETUP.md) — Firebase App Check setup

---

## 📄 License

Proprietary — © Sierra Estates Inc. All rights reserved.
