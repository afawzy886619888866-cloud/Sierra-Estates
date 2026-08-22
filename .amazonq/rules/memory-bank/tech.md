# Sierra Estates — Technology Stack

## Languages & Runtimes

| Language | Version | Usage |
| --- | --- | --- |
| TypeScript | ^5.8.2 | Primary language — strict mode, all apps and packages |
| JavaScript | ES2022+ | Legacy scripts, Firebase Functions (compiled from TS) |
| Python | 3.x | `apps/api` (Cloud Run service), PropertyFinder sync, bot integration |
| Rust | stable | `ECC/ecc2/src/` — ECC session manager (standalone tooling) |
| C | — | `firmware/esp32-csi-node/` — ESP32 CSI node (IoT, standalone) |
| Node.js | >=22.0.0 | Runtime requirement (engines field) |

---

## Core Frameworks & Libraries

### Next.js App (`apps/sierra-estates-realty`)

- **Next.js** ^16.2.6 — App Router, React Server Components, API routes
- **React** 19.2.8 (exact — Expo compatibility pin)
- **Tailwind CSS** ^4 — utility-first styling
- **Framer Motion** ^12 — animations
- **Three.js / @react-three/fiber / @react-three/drei** — 3D property visualization
- **Spline** (@splinetool/react-spline) — 3D scene embedding
- **Leaflet / react-leaflet** — interactive property maps
- **Recharts** — analytics dashboards
- **next-intl** ^4 — i18n (English + Arabic, `messages/en.json`, `messages/ar.json`)
- **Lenis** — smooth scroll
- **Zod** ^4 — runtime schema validation (all API inputs)
- **Lucide React** — icon library

### AI & LLM

- **ai** & **@ai-sdk/gateway** — Vercel AI SDK for Easy Listing parsing & generative workflows
- **@google/generative-ai** ^0.24.1 — Gemini (primary LLM)
- **Google Vertex AI** — agent reasoning via `packages/agents-core/src/vertex-agent.ts`
- **OpenTelemetry** (full SDK) — tracing + logs
- **Arize Phoenix** (`@arizeai/openinference-semantic-conventions`) — LLM observability

### Firebase

- **firebase** ^12.16.0 — client SDK (Auth, Firestore, Storage)
- **firebase-admin** ^14.2.0 — server SDK (API routes, Cloud Functions)
- **Firebase Cloud Functions** — `functions/` (Node.js, compiled TS)
- **Firestore** — primary database
- **Firebase Storage** — asset storage
- **Firebase Auth** — authentication

### Integrations

- **Twilio** ^6 — WhatsApp/SMS messaging & multi-sender WABA round-robin
- **Scheduled WhatsApp Dispatcher** — 12:00 PM – 8:00 PM Africa/Cairo queue worker
- **googleapis** ^173 — Google Sheets, Drive
- **Upstash Redis** — rate limiting, queuing
- **Airtable** — CRM data sync
- **n8n** — workflow automation (self-hosted, Docker)
- **ElevenLabs** — voice synthesis (Leila agent)
- **Pino** ^10 — structured logging

### Admin Dashboard (`apps/admin-dashboard` & `/admin`)

- **Next.js Admin Console** (`/admin`) — full Intelligence OS portal with Scribe AI studio, WhatsApp scheduler, and live agent telemetry
- **Vite** — build tool (standalone SPA, not part of Next.js monorepo build)

---

## Build System

### Turborepo

- Config: `turbo.json`
- Tasks: `build`, `dev`, `lint`, `type-check`, `test:ci`, `clean`
- Build outputs cached: `.next/**`, `dist/**`, `packages/**/dist/**`
- Global env vars: 80+ variables declared in `turbo.json` `globalEnv`

### pnpm

- Version: 9.15.4 (packageManager field)
- Workspace: `pnpm-workspace.yaml`
- Supply-chain defense: `minimumReleaseAge` configured
- Catalog: shared version pins for React, Tailwind, Vite, Zod, etc.

### TypeScript

- Root: `tsconfig.base.json` (strict mode, ^5.8.2)
- App: `apps/sierra-estates-realty/tsconfig.json`
- `ignoreBuildErrors: false` in next.config.ts

### Testing

- **Jest** ^30 — unit/integration tests (`apps/sierra-estates-realty/__tests__/`)
- **Vitest** ^4 — workspace-level (root `vitest.config.ts`)
- **46 test suites (464 tests passing)** covering: API routes, services, easy-listing-parser, whatsapp-scheduler, agents, middleware, pipeline, and security guards

---

## Deployment

### Vercel (Primary)

- **Client:** `apps/sierra-estates-realty` → `sierra-estates.net` (Next.js)
- **Admin:** `apps/admin-dashboard` → `admin.sierra-estates.net` (Vite SPA)
- Trigger: GitHub Actions `deploy-vercel.yml` on push to `main`
- Flow: `vercel pull` → `vercel build` → `vercel deploy --prebuilt --archive=tgz`
- Vercel native git auto-deploy is **DISABLED** — use GitHub Actions only

### Firebase (`sierra-blu` project)

- Firestore, Storage, Auth, Cloud Functions
- Hosting: redirect-only (302 → legacy admin URL)
- Deploy: `pnpm deploy:firebase` or `firebase deploy --only firestore:rules,storage,functions`

### Docker / Cloud Run

- `apps/api` (Python service) — PropertyFinder sync + bot integration
- `infra/docker-compose.yml` — local n8n + services
- `docker-compose.n8n.yml` — n8n workflow engine

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Local development
pnpm dev                    # All apps via Turborepo (Next.js on :3000)
pnpm build                  # Full monorepo build
pnpm lint                   # ESLint across all packages
pnpm type-check             # TypeScript check across all packages
pnpm test:ci                # Jest + Vitest CI run with coverage

# Data & scripts
pnpm fetch:real-data        # Fetch real property data from PropertyFinder
pnpm vertex-agent           # Run Vertex AI agent runner

# Deployment
pnpm deploy:preview         # Vercel preview deploy
pnpm deploy:prod            # Vercel production deploy
pnpm deploy:firebase        # Firebase rules + functions deploy

# Firebase manual
pnpm deploy:rules           # Firestore + Storage rules only
pnpm deploy:functions       # Cloud Functions only

# n8n
docker-compose -f docker-compose.n8n.yml up -d   # n8n on :5678
```

---

## Environment Variables

Canonical list in `.env.example` (root) and `apps/sierra-estates-realty/.env.example`.
Copy to `apps/sierra-estates-realty/.env.local` — never commit.

Key variable groups:

- `NEXT_PUBLIC_FIREBASE_*` — Firebase client SDK config
- `FIREBASE_*` — Firebase Admin SDK (server-only)
- `GOOGLE_AI_API_KEY` / `GOOGLE_GENAI_API_KEY` — Gemini
- `WHATSAPP_*` / `WABA_NUMBER_*` — WhatsApp Cloud API
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Telegram bot
- `PROPERTY_FINDER_*` — PropertyFinder API credentials
- `UPSTASH_REDIS_*` — Redis rate limiting
- `TWILIO_*` — Twilio messaging
- `AIRTABLE_*` / `GOOGLE_SHEETS_ID` — Data sync
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` — Deployment
- `OPENCLAW_BASE_URL` / `OPENCLAW_TOKEN` — OpenClaw AI service
- `ARIZE_*` — LLM observability
- `N8N_BASE_URL` / `N8N_API_KEY` — n8n automation
