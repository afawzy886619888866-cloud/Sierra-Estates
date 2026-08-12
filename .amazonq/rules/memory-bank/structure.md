# Sierra Estates — Project Structure

## Monorepo Layout

```
SE-Vercel-deploy/
├── apps/
│   └── sierra-estates-realty/     # Main Next.js 16 app (primary deployable)
│       ├── app/
│       │   ├── (client)/          # Client-facing route group (UI removed, pending redesign)
│       │   ├── admin/             # Admin console (active)
│       │   └── api/               # 82 REST API routes
│       ├── components/            # React UI components (client/, Maps/)
│       ├── lib/                   # Server-side services, agents, models, utilities
│       │   ├── agents/            # Scribe, Curator, Matchmaker, Closer, Leila, Nexus
│       │   ├── ai/                # AIServiceInterface + GoogleAIServiceImpl
│       │   ├── server/            # CORS, auth-guard, firebase-admin, rate-limit, n8n, openclaw
│       │   ├── services/          # Business logic (matching, inventory, ROI, WhatsApp, Telegram, etc.)
│       │   └── models/            # Firestore data models and schemas
│       ├── mcp-servers/           # MCP server definitions (DocuSign, Stripe, Stage-9, WhatsApp)
│       ├── data/                  # Seed data (mock properties, real listings JSON)
│       ├── __tests__/             # Jest test suite (22 test files)
│       └── proxy.ts               # Edge CORS + /api/orchestrate secret gate
│
├── packages/                      # Shared workspace packages
│   ├── agents/                    # Agent implementations (Scribe, Curator, Matchmaker, Closer)
│   ├── agents-core/               # Base agent, orchestrator, Vertex AI agent, persona MDs
│   ├── agents-api/                # Agent API surface
│   ├── admin-data/                # Firebase admin utilities and types
│   ├── api/                       # WhatsApp webhook package
│   ├── auth/                      # Auth utilities
│   ├── batch/                     # Batch processing
│   ├── config/                    # Shared configuration
│   ├── db/                        # Database layer (DSL, integrations, view configs)
│   ├── exchange/                  # Exchange client
│   ├── memory-engine/             # MemPalace, SharedMemoryBus, vector memory
│   ├── obsidian/                  # ObsidianMemory — persistent JSON-backed shared memory
│   ├── property-finder-api/       # PropertyFinder API client
│   ├── shared/                    # Shared types and utilities
│   ├── types/                     # Global TypeScript types
│   ├── ui/                        # Design system components + tokens
│   └── whatsapp-agent/            # WhatsApp bot (open-wa, Gemini, session store)
│
├── functions/                     # Firebase Cloud Functions
│   ├── src/
│   │   ├── agents/                # sanitized-workflow
│   │   ├── middleware/            # observability, sanitizer
│   │   └── services/              # retry-queue
│   ├── collectData.js             # Firestore trigger: rawScrapeData → processing
│   ├── processData.js             # Data transformation pipeline
│   ├── transform.js               # Data normalization utilities
│   └── index.js                   # Function exports
│
├── workflows/                     # n8n automation workflows
│   ├── 01-whatsapp-scraper/
│   ├── 02-owner-search/
│   ├── 03-owner-contact/
│   ├── 04-email-sender/
│   └── 05-unit-adder/
│
├── infra/                         # Infrastructure configs
│   ├── aws/                       # AWS setup
│   ├── n8n-workflows/             # n8n workflow templates
│   └── whatsapp-scraper/          # Scraper Docker config
│
├── scripts/                       # Maintenance and deployment scripts
├── docs/                          # Architecture, API, deployment, migration docs
├── .github/workflows/             # CI/CD (deploy-vercel.yml, lint, type-check, test)
├── firestore.rules                # Production Firestore security rules
├── storage.rules                  # Production Storage security rules
├── firebase.json                  # Firebase config (Functions + Firestore + Storage + Hosting redirect)
├── vercel.json                    # Vercel deployment config
├── turbo.json                     # Turborepo build pipeline
└── pnpm-workspace.yaml            # Workspace package definitions
```

---

## Core Components & Relationships

### Intelligence Pipeline Flow
```
WhatsApp Groups
  → /api/webhooks/whatsapp (Scribe S1/S2)
    → Firestore rawScrapeData
      → collectData Cloud Function
        → processDataForApp Cloud Function
          → Matching Engine (S6/S7/S8)
            → Stage 9 Closer Agent
              → Telegram alerts + PDF Proposals
```

### Key Package Dependencies
- `apps/sierra-estates-realty` depends on: `@sierra-estates/agents`, `@sierra-estates/db`, `@sierra-estates/memory-engine`, `@sierra-estates/obsidian`, `@sierra-estates/ui`
- `packages/agents` depends on: `packages/agents-core`
- `packages/memory-engine` provides: `SharedMemoryBus`, `MemPalace` (vector memory)
- `packages/obsidian` provides: `ObsidianMemory` (JSON-backed persistent store → `obsidian-store.json`)

### API Route Groups (`app/api/`)
| Group | Routes |
|-------|--------|
| Agent | `/agent/hub`, `/closer/initiate`, `/orchestrate` |
| Listings | `/listings`, `/properties/*`, `/property-finder/*`, `/sync/*` |
| Leads | `/leads`, `/leads/request-viewing`, `/viewing-requests` |
| Messaging | `/webhooks/whatsapp`, `/webhooks/property-finder`, `/telegram/*`, `/whatsapp/*`, `/ingest/whatsapp` |
| Admin | `/admin/deploy`, `/crm/*`, `/inventory/*` |
| Intelligence | `/matching`, `/proposals`, `/roi/*`, `/wealth/*` |

---

## Architectural Patterns

- **Monorepo:** pnpm workspaces + Turborepo for build orchestration and caching
- **API-first:** Next.js app currently serves only API routes; frontend is being redesigned
- **Agent pattern:** Each agent (Scribe/Curator/Matchmaker/Closer/Leila/Nexus) is a standalone module with a defined stage in the S1–S10 pipeline
- **Repository pattern:** `lib/db/repository.ts` + `lib/db/repositories.ts` abstract Firestore access
- **Service layer:** All business logic lives in `lib/services/` — never directly in API route handlers
- **Edge middleware:** `proxy.ts` handles CORS and secret-gated orchestration at the edge
- **Shared memory:** All agents share state via `ObsidianMemory` (obsidian-store.json) and `SharedMemoryBus`
- **Observability:** OpenTelemetry instrumentation (`instrumentation.ts`) + Arize Phoenix for LLM tracing
- **Strict client boundary:** `app/(client)/` routes must not be modified without explicit permission
