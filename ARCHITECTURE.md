# Sierra Estates Architecture

This document describes the active architecture. Deployment and release policy is
defined in [`DEPLOYMENT.md`](./DEPLOYMENT.md); this file focuses on runtime
boundaries and module ownership.

## Runtime topology

```text
Clients
  |
  v
Vercel / Next.js (`apps/sierra-estates-realty`)
  |-- public site: sierra-estates.net
  |-- admin surface: admin.sierra-estates.net
  |-- API routes and webhook ingress
  |
  +--> Supabase
  |      PostgreSQL + Auth + Storage + RLS + pgvector
  |
  +--> Worker services & 4-Engine Automation Plane
         Docker Runner (:2786) + 8-Line OpenWA RAG Station (:2785)
         OpenClaw Worker Manager + DeepSeek Evaluation Harness
         Property Finder Enterprise Atlas v1 Connector
         GitHub Actions and scheduled workflows
```

The Next.js application owns request handling, authentication boundaries, typed
domain services, and user-facing responses. It does not own long-running scraping,
sync, bot, or batch work. Those jobs run in workers and persist canonical state in
Supabase.

For the full **4-Engine Revenue & Automation Architecture** (Memory Engine, RAG/GIS Map Engine, DeepSeek Harness, and Workflows/OpenClaw/Property Finder Atlas v1), see [`docs/FOUR_ENGINE_AUTOMATION_ARCHITECTURE.md`](./docs/FOUR_ENGINE_AUTOMATION_ARCHITECTURE.md).

## Repository boundaries

| Area | Responsibility |
| --- | --- |
| `apps/sierra-estates-realty` | Public web app, admin surface, API routes, domain services |
| `apps/api` | Python integration worker for Property Finder and bot hooks |
| `apps/automations` | TypeScript automation entry points writing through shared DB helpers |
| `packages/db` | Supabase clients, typed records, backend policy assertions |
| `packages/agents*` | Agent definitions, tools, orchestration, and lifecycle contracts |
| `packages/memory-engine` | Episodic and vector-backed agent memory |
| `packages/deepseek-harness` | 10-scenario DeepSeek evaluation harness and quality gates |
| `packages/property-finder-api` | Enterprise Atlas v1 OAuth2 connector, lead sync, and parsers |
| `packages/ui` | Shared UI primitives and design tokens |
| `workflows/` | 10-workflow control plane (`:2786`), inbound reply classifier, and outreach pipelines |
| `scripts/` | Deployment checks, migration, Property Finder feed exporters, and OpenClaw tooling |
| `supabase/` | Authoritative schema, functions, policies, and database tests |

## Data and write boundaries

1. Supabase is the authoritative store for listings, leads, users, media, memory,
   and workflow state.
2. Server-side writes use the shared database layer and must pass the canonical
   backend policy.
3. `SUPABASE_SERVICE_ROLE_KEY` is server-only and is never exposed through a
   `NEXT_PUBLIC_*` variable.
4. Workers call typed service boundaries rather than writing directly from
   browser code.
5. Missing canonical backend configuration is an error. Write paths must fail
   loudly rather than silently falling back to a legacy provider.

## Application modules

The main app is organized around these runtime concerns:

- `app/` — Next.js routes, pages, API handlers, and host-aware surfaces.
- `lib/` — server utilities, authentication, integrations, and domain services.
- `components/` — reusable presentation and interaction components.
- `__tests__/` and package test directories — targeted application and package tests.

The inventory write path is representative of the intended flow:

```text
API or worker input
  -> InventoryDomainService
  -> assertCanonicalBackendForWrites()
  -> packages/db record helper
  -> Supabase table + RLS/service policy
```

## Worker and agent flow

External events such as WhatsApp messages, Property Finder updates, and scheduled
syncs enter through worker services or authenticated API routes. They are parsed,
validated, and persisted to Supabase. Agent packages consume typed records and
write status, lead, listing, or memory updates through the same canonical boundary.

Long-running work must not be implemented as an unbounded Next.js request.

## Authentication and security

- Supabase Auth provides the canonical identity boundary.
- Supabase RLS protects database access.
- Admin and service routes enforce authentication and role checks before mutation.
- Webhook secrets and service credentials are read from environment stores.
- Public environment variables contain public configuration only.

See [`SECURITY.md`](./SECURITY.md) for the active security checklist.

## Legacy material

Firebase files, compatibility modules, and historical notes may still exist while
the migration is completed. They are not the active backend contract and must not
be used for new features, deployment, auth, storage, or database writes.

In particular, the following are retired:

- Firebase Hosting deployment
- Firebase rules and Functions deployment commands
- Firestore as the primary exchange or inventory store
- Legacy AWS EC2 host (`54.89.162.250`) — replaced by the Docker Runner + Cloudflare Tunnel control plane
- A second standalone admin application

When legacy code is removed, update this section and the relevant migration tests
in the same change.
