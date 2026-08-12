# Sierra Estates Platform

Luxury PropTech monorepo for the New Cairo market (pnpm + Turborepo). Firebase project: **`sierra-blu`**. Full policy: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

> **Current status**: the frontend (public site + admin console UI) was intentionally removed to make way for a new design — see `NEXT_STEPS.md`. The backend below is fully intact and deployed: all 82 API routes, Firebase Functions, the Python service, and the WhatsApp/PropertyFinder workers keep running unaffected.

> **Migration history**: code and history from several legacy repositories were consolidated here under the Sierra Estates brand. See [docs/MIGRATION.md](./docs/MIGRATION.md) for details.

## 📦 Repository Structure

```
Sierra-Estates-Final/
├── apps/
│   ├── sierra-estates-realty/  # Main Next.js 16 app — API routes + (soon) frontend
│   │   ├── app/api/            # REST API endpoints (82 routes) — the only app/ content today
│   │   ├── lib/                # Services, models, agents, server-only utilities
│   │   ├── proxy.ts            # Edge CORS + /api/orchestrate secret gate
│   │   └── data/                # Seed data consumed by API routes
│   ├── api/                    # Python service (Docker/Cloud Run) — PropertyFinder sync + bot integration
│   └── agents/                 # WhatsApp bot/scraper, Stage-9 closer (backend workers)
├── packages/                   # Shared workspace packages (db, agents-core, memory-engine, ui, config, ...)
├── functions/                  # Firebase Cloud Functions — collectData, processDataForApp
├── workflows/                  # Node scripts + n8n templates for the external data-sync pipeline
├── .github/workflows/          # CI/CD pipelines (lint, type-check, test, build, deploy)
├── firestore.rules             # Production Firestore security rules
├── storage.rules               # Production Storage security rules
├── pnpm-workspace.yaml         # Monorepo workspace config
├── turbo.json                  # Turborepo build cache config
├── firebase.json               # Functions + Firestore + Storage + Hosting (redirect only) config
├── vercel.json                 # Vercel config (fallback topology — see DEPLOYMENT.md)
├── CLAUDE.md                   # Codebase guidelines & architecture decisions
├── docs/                       # Additional guides, Obsidian vault, business content
└── NEXT_STEPS.md               # Outstanding tasks
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Firebase CLI** (optional, for local emulation / rules deploy)

### Installation

```bash
pnpm install
cp .env.example apps/sierra-estates-realty/.env.local   # fill in your credentials
pnpm dev               # Next.js app on :3000
docker-compose -f docker-compose.n8n.yml up -d  # n8n on :5678
```

## API Routes

| Route | Method | Description |
| ------- | -------- | ------------- |
| `/api/admin/deploy` | POST | Admin deploy trigger |
| `/api/agent/hub` | POST | Multi-agent hub (Scribe/Curator/Matchmaker/Closer) |
| `/api/closer/initiate` | POST | Stage 9 closer agent |
| `/api/ingest/whatsapp` | POST | WhatsApp message ingestion |
| `/api/leads` | POST | Create investment stakeholder |
| `/api/leads/request-viewing` | POST | Request property viewing |
| `/api/listings` | GET | Fetch portfolio assets |
| `/api/matching` | POST | Run AI matching engine |
| `/api/orchestrate` | POST | Full S1–S10 pipeline |
| `/api/properties/sync` | POST | Property Finder sync |
| `/api/property-finder` | GET/POST/PUT/DELETE | PF gateway |
| `/api/proposals` | POST | Generate proposal |
| `/api/sync` | GET/POST | Sync management |
| `/api/sync/publish` | POST | Publish to Property Finder |
| `/api/telegram/setup` | GET | Telegram webhook setup |
| `/api/telegram/webhook` | POST | Telegram bot handler |
| `/api/viewing-requests` | GET/POST | Viewing requests |
| `/api/webhooks/property-finder` | POST | PF webhook (HMAC verified) |
| `/api/webhooks/whatsapp` | GET/POST | WhatsApp webhook |
| `/api/whatsapp/heartbeat` | POST | Scraper heartbeat |
| `/api/whatsapp/webhook` | POST | WhatsApp message handler |

## Intelligence Pipeline

```
WhatsApp Groups
    └─→ /api/webhooks/whatsapp (Scribe agent — S1/S2)
            └─→ Firestore rawScrapeData
                    └─→ processDataForApp (Cloud Function)
                            └─→ Matching Engine (S6/S7/S8)
                                    └─→ Stage 9 Closer Agent
                                            └─→ Telegram alerts + Proposals
```

## Deployment

Public site + admin + API deploy together via Vercel (GitHub Action `deploy-vercel.yml` — `vercel pull` → `vercel build` → `vercel deploy --prebuilt`; Vercel's own git auto-deploy is off). Firebase (`sierra-blu`) is backend-only — Firestore, Storage, Auth, Functions, plus one Hosting site that only 302-redirects the legacy admin URL. Full details, rollback procedure, and the deploy matrix: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

```bash
# Deploy Firestore/Storage rules + Cloud Functions (manual)
pnpm deploy:rules
pnpm deploy:functions
```

## 📋 Environment Variables

See `.env.example` for the full, canonical list (kept in sync with a CI sweep of `process.env.*`). Copy it to `apps/sierra-estates-realty/.env.local` and fill in real values — never commit that file.

## 🔐 Security

- ✅ Type-safe with TypeScript strict mode
- ✅ Authentication via Firebase Auth + JWT
- ✅ Secrets via Google Secret Manager
- ✅ CORS & CSP headers configured
- ✅ SQL injection prevention (Zod validation)
- ✅ XSS protection (React automatic escaping)
- ✅ Rate limiting on Cloud Functions
- ✅ Firestore Security Rules enforced
- ✅ Cloud Storage CORS restricted

## 📚 Documentation

- `ARCHITECTURE.md` - System design & data flows
- `DEPLOYMENT.md` - Deployment policy & runbooks (authoritative)
- `API.md` - REST API specifications
- `CONTRIBUTING.md` - Developer setup & workflow
- `SECURITY.md` - Security model & reporting
- `docs/` - Additional guides (Firebase App Check, n8n workflows, theme system, Obsidian vault)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Follow TypeScript strict mode
3. Add tests for new functionality
4. Run linter & tests: `pnpm lint && pnpm type-check && pnpm test:ci`
5. Submit pull request with description

## 📞 Support

- **Issues**: GitHub Issues (this repo)
- **Docs**: See `ARCHITECTURE.md`, `API.md`, `DEPLOYMENT.md`

## 📄 License

Proprietary - Sierra Estates Inc.
