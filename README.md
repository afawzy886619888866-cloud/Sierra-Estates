# Sierra Estates Platform

Luxury PropTech monorepo for the New Cairo market (pnpm + Turborepo). Firebase project: **`sierra-blu`**. Authoritative deployment policy: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

> **Current status**: The platform delivers high-end real estate intelligence and client experiences. The primary web surface is built with Next.js 16 (App Router), deployed across isolated Vercel projects for the public client portal (`sierra-estates.net`) and the staff admin console (`admin.sierra-estates.net`). Authentication uses Firebase Auth with custom server session cookies (`sierra_sess`). Backend workers, scrapers, and Python microservices run on Cloud Run, n8n, and scheduled GitHub Actions.
>
> **Migration history**: Code and architectural history from legacy repositories were unified under the Sierra Estates monorepo. See [docs/MIGRATION.md](./docs/MIGRATION.md) and [docs/ADMIN_MIGRATION_PLAN.md](./docs/ADMIN_MIGRATION_PLAN.md) for details.

---

## 📦 Repository Structure

```text
SE-Vercel-deploy-main/
├── apps/
│   ├── sierra-estates-realty/  # Main Next.js 16 app (public site, admin portal, API routes)
│   │   ├── app/admin/          # Staff login & protected admin console UI
│   │   ├── app/api/            # Edge & Node REST API routes, session auth, webhooks
│   │   ├── components/         # Premium UI design system & spatial components
│   │   ├── lib/                # Services, Firestore models, agents, server utilities
│   │   └── proxy.ts            # Edge CORS & orchestrator security gates
│   ├── api/                    # Python FastAPI service (Cloud Run :8000) — PropertyFinder & bots
│   ├── agents/                 # Backend worker agents & scrapers (Closer, Curator, Scribe)
│   └── automations/            # Automated workflows & data pipelines
├── packages/                   # Shared monorepo packages
│   ├── admin-data/             # Admin console data abstractions & schemas
│   ├── agents/                 # Agent definitions & execution interfaces
│   ├── agents-api/             # Typed client SDKs for agent communication
│   ├── agents-core/            # Core autonomous agent orchestration logic
│   ├── ai-agent-sdk/           # Multi-modal AI agent utilities
│   ├── ai-orchestrator/        # Pipeline orchestration (S1–S10 stages)
│   ├── api/                    # Shared API types & HTTP clients
│   ├── auth/                   # Shared auth verification & token parsing
│   ├── batch/                  # Batch operations & mass update helpers
│   ├── config/                 # Shared lint, TypeScript, and build configs
│   ├── db/                     # Database access layer & Firestore typed models
│   ├── deepseek-harness/       # DeepSeek model evaluation harness
│   ├── exchange/               # Real-time message exchange & events
│   ├── memory-engine/          # Obsidian-backed multi-agent memory & context engine
│   ├── obsidian/               # Obsidian vault syncing & markdown parsing
│   ├── open-memory/            # Open long-term memory bridge
│   ├── property-finder-api/    # PropertyFinder portal integration SDK
│   ├── shared/                 # Shared domain types, validators, and utility functions
│   ├── ui/                     # Shared UI components & design system tokens
│   └── whatsapp-agent/         # WhatsApp Webhook parser & Scribe ingestion agent
├── functions/                  # Firebase Cloud Functions (Node.js 20, europe-west1)
├── workflows/                  # Node scripts & n8n templates for external sync pipelines
├── .github/workflows/          # CI/CD pipelines (CI, Vercel deploy, Firebase rules, crons)
├── firestore.rules             # Production Firestore security rules
├── storage.rules               # Production Firebase Storage security rules
├── pnpm-workspace.yaml         # Monorepo workspace configuration
├── turbo.json                  # Turborepo build pipeline & cache config
├── firebase.json               # Firebase Functions, Firestore, Storage, & Hosting redirect
├── vercel.json                 # Root Vercel configuration
├── CLAUDE.md                   # Codebase guidelines & architectural rules
└── docs/                       # Architectural guides, API contracts, and runbooks
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (or Node 22+)
- **pnpm** 9+
- **Python** 3.11+ (for `apps/api`)
- **Docker & Docker Compose** (optional, for local n8n / emulator setup)
- **Firebase CLI** (`npm i -g firebase-tools` for rules and functions deployment)

### Local Setup

```bash
# 1. Install all dependencies across workspace
pnpm install

# 2. Configure environment variables
cp .env.example apps/sierra-estates-realty/.env.local

# 3. Start local development server (Next.js on :3000)
pnpm dev

# 4. (Optional) Run n8n workflows locally on :5678
docker-compose -f docker-compose.n8n.yml up -d
```

### Verification & CI Checks

```bash
# Run all workspace lint checks
pnpm lint

# Run TypeScript type check
pnpm type-check

# Build all applications and packages
pnpm build

# Run unit and integration tests
pnpm test
```

---

## 🔐 Admin Authentication

The admin portal is accessible at `admin.sierra-estates.net/admin` (or `/admin` in local development).

1. **Browser Authentication**: The browser signs in using the Firebase Auth Client SDK with email/password credentials and obtains a short-lived ID token.
2. **Session Minting**: The ID token is transmitted to `POST /api/auth`.
3. **Verification & Claims**: The server validates the ID token using the Firebase Admin SDK, verifies role permissions from Firestore (`users/{uid}`), and signs a secure, `httpOnly`, `SameSite=Lax` cookie named `sierra_sess`.
4. **Protected Routes**: Middleware (`middleware.ts`) and server layouts enforce `sierra_sess` validation before granting access to `/admin/*`.

### Key Auth Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public / Client | Firebase browser SDK initialization |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public / Client | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public / Client | Firebase project identifier (`sierra-blu`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server Only | Service account key for Firebase Admin SDK |
| `SESSION_SECRET` | Server Only | Secret used to sign and encrypt the `sierra_sess` cookie |
| `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | Dev Only | Fallback credentials for offline local development |

---

## 🤖 Intelligence & Agent Pipeline

Sierra Estates operates a multi-stage autonomous agent pipeline (S1–S10):

```text
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ WhatsApp Groups │ ────▶ │ /api/webhooks/whatsapp │ ────▶ │  Firestore Raw Scrape  │
└─────────────────┘       │    (Scribe Agent S1)   │       │     rawScrapeData      │
                          └────────────────────────┘       └────────────────────────┘
                                                                       │
                                                                       ▼
┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ Closer Agent (Stage 9) │ ◀──── │ AI Matching Engine     │ ◀──── │ Cloud Function         │
│ Telegram & Proposals   │       │   (Curator/Matchmaker) │       │   processDataForApp    │
└────────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

- **S1–S2 (Scribe Agent)**: Ingests raw listings and inquiries from WhatsApp groups via webhooks.
- **S3–S5 (Curator Agent)**: Cleans, deduplicates, and normalizes property attributes into structured Firestore documents.
- **S6–S8 (Matchmaker Agent)**: Matches verified buyer criteria with available inventory based on ROI, location, and compound specifications.
- **S9 (Closer Agent)**: Drafts contextual proposals, sends instant Telegram alerts to brokers, and prepares viewing contracts.
- **S10 (Feedback & Memory Engine)**: Logs transaction outcomes to Obsidian memory vaults to refine matching weights.

---

## 🌐 API Directory

| Route | Method | Description |
| --- | --- | --- |
| `/api/auth` | POST / DELETE | Exchange Firebase ID token for `sierra_sess` cookie / Logout |
| `/api/admin/deploy` | POST | Trigger deployment status check & maintenance hooks |
| `/api/agent/hub` | POST | Multi-agent execution hub (Scribe, Curator, Matchmaker, Closer) |
| `/api/closer/initiate` | POST | Stage 9 automated closer agent initiation |
| `/api/ingest/whatsapp` | POST | Ingest raw WhatsApp messages |
| `/api/leads` | GET / POST | Manage prospective investment leads and buyer profiles |
| `/api/leads/request-viewing` | POST | Create viewing requests for listed properties |
| `/api/listings` | GET / POST | Fetch and manage verified portfolio inventory |
| `/api/matching` | POST | Run multi-variable property-to-buyer matching |
| `/api/orchestrate` | POST | Full S1–S10 multi-agent pipeline trigger |
| `/api/properties/sync` | POST | PropertyFinder synchronization trigger |
| `/api/property-finder` | GET / POST / PUT | PropertyFinder gateway proxy |
| `/api/proposals` | POST | Generate dynamic investment proposals |
| `/api/sync` | GET / POST | Master inventory synchronization control |
| `/api/sync/publish` | POST | Publish verified property listings to external portals |
| `/api/telegram/webhook` | POST | Telegram bot notification & command handler |
| `/api/webhooks/property-finder` | POST | PropertyFinder incoming webhook (HMAC verified) |
| `/api/webhooks/whatsapp` | GET / POST | WhatsApp webhook verification and payload ingestion |
| `/api/whatsapp/heartbeat` | POST | WhatsApp scraper worker healthcheck heartbeat |

---

## 🚢 Deployment Architecture & Plan

Sierra Estates follows a decoupled, resilient multi-cloud deployment strategy. Full details are documented in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

### 1. Web Applications (Vercel)

- **Client Public Site**: `sierra-estates.net` deployed via Vercel Project `sierra-estates` (`CLIENT_VERCEL_PROJECT_ID`).
- **Admin Console**: `admin.sierra-estates.net` deployed via Vercel Project `sierra-admin-dashboard` (`ADMIN_VERCEL_PROJECT_ID`).
- **CI/CD Action**: `.github/workflows/deploy-vercel.yml` builds and deploys both projects in parallel upon merge to `main`.

### 2. Backend Infrastructure (Firebase `sierra-blu`)

- **Firestore & Storage Rules**: Deployed via `.github/workflows/deploy-firebase-rules.yml` or manual `pnpm deploy:rules`.
- **Cloud Functions**: Node.js 20 functions deployed via `pnpm deploy:functions`.
- **Legacy Admin Redirect**: Firebase Hosting site `admin-sierra-blu` issues a 302 redirect to `https://admin.sierra-estates.net/admin`.

### 3. Background Workers & Integrations

- **Python FastAPI Service** (`apps/api`): Containerized and hosted on Google Cloud Run (`:8000`).
- **Automation Workflows**: n8n instance hosted on VPS/Docker (`:5678`) triggered via webhook.
- **Scheduled Sync Tasks**: Executed via `.github/workflows/external-workflows.yml`, `whatsapp-dispatch-cron.yml`, and `vercel-cron-bridge.yml`.

---

## 🛡️ Security & Compliance

- **Strict Type Safety**: TypeScript strict mode enforced monorepo-wide.
- **Session Security**: `httpOnly`, `Secure`, `SameSite=Lax` cookies with HMAC verification.
- **Zero Committed Secrets**: All credentials managed via Google Secret Manager, Vercel Environment Variables, and GitHub Secrets.
- **Firestore Security Rules**: Role-based access control (RBAC) with granular read/write policies (`firestore.rules`).
- **API Guardrails**: Zod request schema validation and rate limiting on all public endpoints.
- **CORS & CSP**: Restrictive HTTP security headers configured in `proxy.ts` and `vercel.json`.

---

## 📚 Documentation Index

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Authoritative deployment policy, release matrix, and runbooks.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Monorepo architecture and data flow diagrams.
- [`API.md`](./API.md) — REST API specifications and request/response contracts.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Developer onboarding, branch conventions, and testing guidelines.
- [`SECURITY.md`](./SECURITY.md) — Threat model, security boundaries, and vulnerability reporting.
- [`docs/ADMIN_MIGRATION_PLAN.md`](./docs/ADMIN_MIGRATION_PLAN.md) — Admin console migration blueprint.
- [`docs/FIREBASE_APPCHECK_SETUP.md`](./docs/FIREBASE_APPCHECK_SETUP.md) — Firebase App Check setup and verification.

---

## 📄 License

Proprietary — © Sierra Estates Inc. All rights reserved.
