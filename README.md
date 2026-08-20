# Sierra Estates Platform

Luxury PropTech monorepo for the New Cairo market (pnpm + Turborepo). Firebase project: **`sierra-blu`**. Full policy: [`DEPLOYMENT.md`](./DEPLOYMENT.md).

> **Current status**: the main Next.js application includes the public site, admin console UI, and API routes. The admin sign-in uses Firebase Authentication in the browser and exchanges the resulting Firebase ID token with `/api/auth` to mint the secure `sierra_sess` server session cookie before opening `/admin`.

> **Migration history**: code and history from several legacy repositories were consolidated here under the Sierra Estates brand. See [docs/MIGRATION.md](./docs/MIGRATION.md) for details.

## 📦 Repository Structure

```
Sierra-Estates-Final/
├── apps/
│   ├── sierra-estates-realty/  # Main Next.js 16 app — public site, admin console, and API routes
│   │   ├── app/admin/          # Staff login and protected admin console
│   │   ├── app/api/            # REST API endpoints and server session auth
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

## Admin Authentication

Open `/admin/login` to sign in with a Firebase Auth email/password account. The browser first authenticates with Firebase, obtains a short-lived ID token, and sends that token to `POST /api/auth`. The server verifies the token, resolves the user role from Firestore, and sets the `httpOnly` `sierra_sess` cookie used by the protected admin routes. Signing in with Firebase alone is not sufficient because the server session cookie must also be created.

For local development without Firebase Admin credentials, an explicit bootstrap account can be enabled with `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, and `SESSION_SECRET`. The bootstrap password has no repository default and must never be committed. In production, configure Firebase Admin credentials and `SESSION_SECRET`; do not rely on a development fallback.

The minimum authentication-related variables are:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase browser SDK configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project used by the browser SDK |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT` | Server-side Firebase Admin credentials |
| `SESSION_SECRET` | Signs and verifies the `sierra_sess` cookie |
| `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | Optional local-only fallback account |

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

See `.env.example` for the full, canonical list (kept in sync with a CI sweep of `process.env.*`). Copy it to `apps/sierra-estates-realty/.env.local` and fill in real values — never commit that file. For Vercel, add the same variables to the project’s Production, Preview, and Development environments as appropriate; keep all server-only credentials out of `NEXT_PUBLIC_*` variables.

## Verification

From the repository root, run the following checks before deploying:

```bash
pnpm install --frozen-lockfile
pnpm --filter sierra-estates-client-page type-check
pnpm --filter sierra-estates-client-page build
```

Then verify the admin flow in a deployed environment: open `/admin/login`, sign in, confirm that `/api/auth` returns `ok: true`, and confirm that the browser reaches `/admin` with the `sierra_sess` cookie present. Never test with real credentials in committed files, screenshots, or issue reports.

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
