# CLAUDE.md — Sierra Estates (SE)

Context and operational guidelines for Claude Code and AI assistant sessions.

---

## 🏗️ Project Overview & Stack

Sierra Estates is a luxury real-estate (PropTech) platform for the New Cairo market structured as a pnpm + Turborepo monorepo.

- **Frontend**: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 (strict) · Tailwind 4 · Leaflet maps · Custom i18n (en/ar via `lib/I18nContext.tsx`)
- **Backend & Database**: Firebase (Client SDK 12 + Admin SDK 14: Firestore, Cloud Storage, Authentication) · Cloud Functions
- **Automations & Agents**: Docker n8n Workflow Engine (`localhost:5678`) · Python API (Docker/Cloud Run) · Multi-agent memory engine (`@sierra-estates/memory-engine` with ECC & Obsidian vault)
- **Observability**: OpenTelemetry + Arize semantic conventions

---

## 🚀 Deployment Architecture (Authoritative)

> **Full policy: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)** — the single source of truth for deployment, domains/DNS, secrets, CI gates, and new app provisioning.

- **Production Domain**: `sierra-estates.net` (Vercel)
- **Admin Domain**: `admin.sierra-estates.net` (Vercel)
- **Firebase Project**: `sierra-blu`

```text
Vercel → apps/sierra-estates-realty (Next.js)        [auto-deploys on push to main]
  sierra-estates.net           Public site: listings, search, about, contact, concierge
  sierra-estates.net/api/*     Backend APIs (auth-guarded per route; triggers workers)
  admin.sierra-estates.net     Staff admin console (isolated Vercel project deployment)

Firebase (project sierra-blu) — backend + redirect
  Firestore / Storage / Auth   Database, media, staff-gated authentication
  Functions                    Background ingestion pipeline (functions/)
  Hosting (admin-sierra-blu)   302-redirects legacy admin URL → Vercel /admin

Workers — long-running/heavy workloads (isolated from Next.js request loop)
  n8n (Docker/VPS :5678)       WhatsApp scraping & CRM workflow automation
  apps/api (Cloud Run)         Python: PropertyFinder sync + bot integration
  GitHub Actions (workflows/)  Scheduled external data-sync
```

---

## 📁 Repository Layout

- `apps/sierra-estates-realty` — Main Next.js application (Public client site + Admin suite + API routes)
- `apps/api` — Standalone Python service for PropertyFinder sync & bot hooks
- `functions` — Firebase Cloud Functions (`collectData`, `processDataForApp`, transforms)
- `packages/` — Shared workspace packages:
  - `packages/db` — Shared Firestore data layer
  - `packages/memory-engine` — Episodic Context Cache (ECC) & MemPalace engine
  - `packages/agents` — Lead concierge, OpenClaw, and closer agents
  - `packages/obsidian` — Obsidian vault integration & indexing
  - `packages/ui` — Shared UI design components
- `workflows/` — Node scripts for external data sync pipelines
- `docs/obsidian-vault/` — Cognitive and database knowledge vault
- `.claude/` & `.agents/` — MCD workflows, slash commands, and specialized agent skills

---

## 🛠️ Commands (Run from Repo Root)

- `pnpm install` — Install all workspace dependencies
- `pnpm dev` — Start Next.js development server
- `pnpm build` — Build production bundle (`type-check` enforced)
- `pnpm lint` — Run ESLint across packages
- `pnpm type-check` — TypeScript typecheck (`tsc --noEmit`)
- `pnpm test:ci` — Run Jest test suites
- `pnpm deploy:rules` — Deploy Firestore and Storage security rules
- `pnpm deploy:functions` — Deploy Cloud Functions

---

## 🔒 Protected Core Rules (Never Override)

1. **Client Frontend Lock**:
   - Never modify files under `apps/sierra-estates-realty/app/(client)/` or `apps/sierra-estates-realty/components/` without explicit written approval from the user.
2. **Push Protection & Secret Cleanliness**:
   - Never commit raw API keys, tokens, or credentials into the codebase. Always access via environment variables (`process.env.*`).
3. **Protected Main Branch**:
   - Never force-push to `main`. Create feature branches and submit pull requests.

---

## 🔐 Auth & Security Model

- **Client Role**: Read from Firestore `users/{uid}.role` (`admin`, `manager`, `agent`).
- **Server Admin Guard**: `verifyAdminRequest` (`lib/server/auth-guard.ts`) requires Firebase Bearer token with `role === 'admin'`. Service/cron calls accept `X-SBR-SECRET-KEY` header.
- **Admin Page Guard**: Handled in `app/admin/layout.tsx` (redirects unauthenticated users to `/admin/login`).
- **API Guard Summary**:
  - *Admin-only*: `viewing-requests`, `concierge/send-whatsapp`, `telegram/setup`, `wealth/roi`
  - *Service + Token*: `admin/ingest`
  - *Webhook Secret*: `telegram/webhook`, `whatsapp/webhook`, `ingest/whatsapp`
  - *Public*: `listings`, `leads`, `leads/request-viewing`, `closer/initiate`, `concierge/[leadId]`

---

## 🔑 GitHub Secrets & Variables Configuration

| Secret Name | Description / Scope |
| :--- | :--- |
| `VERCEL_TOKEN` | Vercel Personal/Team Token with Projects & Domains read/write permissions |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key for Claude Code & automated AI PR review |
| `GEMINI_API_KEY` | Google Gemini API Key for WhatsApp Agent (`gemini-2.0-flash`) |
| `PROPERTY_FINDER_API_KEY` | Property Finder CRM API Integration Key |
| `PROPERTY_FINDER_API_SECRET` | Property Finder API Signing Secret |
| `PROPERTY_FINDER_JWT_TOKEN` | Property Finder Webhook Bearer Token |
| `CRON_SECRET` | Secret token guarding `/api/cron/*` endpoints |
| `SESSION_SECRET` | Admin session signing secret for edge middleware RBAC |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service Account JSON for server-side Firebase Admin SDK |

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `MAINTAINER_EMAIL` | `a.fawzy8866@gmail.com` | Lead notification & commit attribution |
| `CLIENT_VERCEL_PROJECT_ID` | `prj_ieVcIcoeTtHndspXMzlE0cwLl89c` | Client Vercel project ID (`sierra-estates.net`) |
| `ADMIN_VERCEL_PROJECT_ID` | `prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA` | Admin Vercel project ID (`admin.sierra-estates.net`) |
| `VERCEL_ORG_ID` | `team_UvdJ5ezVTaqEKyhqZ5QVqOKJ` | Vercel Team Org ID |
| `FIREBASE_PROJECT_ID` | `sierra-blu` | Canonical Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `sierra-blu` | Client SDK Firebase Project |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs` | Client SDK Web Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `sierra-blu.firebaseapp.com` | Client Auth Domain |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `sierra-blu.firebasestorage.app` | Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `941030513456` | Cloud Messaging Sender |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:941030513456:web:56209a1495d69f217086f5` | Web App ID |

---

## 🧠 Obsidian Knowledge Vault (`docs/obsidian-vault/`)

The repository includes a 14-node cognitive architecture and domain vault:

- `objections-and-policies.md` — Pricing rules, discount matrices, payment options
- `compounds-guide.md` — New Cairo compound pricing and features
- `Sales Scripts & Outreach.md` — Inbound qualification dialogues in Egyptian Arabic & English
- Always preserve double-bracket `[[Links]]` when reading or updating vault notes.

---

## 🧭 MCD Protocol & Command Deck API

This project uses the Micro-Contract Development (MCD) protocol.

### Slash Commands Routing

- **/evaluate** → [`.agents/workflows/evaluate.md`](.agents/workflows/evaluate.md)
- **/contract** → [`.agents/workflows/contract.md`](.agents/workflows/contract.md)
- **/execute** → [`.agents/workflows/execute.md`](.agents/workflows/execute.md)
- **/closeout** → [`.agents/workflows/closeout.md`](.agents/workflows/closeout.md)
- **/help** → [`.agents/workflows/help.md`](.agents/workflows/help.md)
- **/remember** → [`.agents/workflows/remember.md`](.agents/workflows/remember.md)
- **/docs** → [`.agents/workflows/docs.md`](.agents/workflows/docs.md)
- **/bug** → [`.agents/workflows/bug.md`](.agents/workflows/bug.md)

### Command Deck REST API

Base URL: `http://127.0.0.1:{port}` (resolved from `.amphion/config.json`):

| Action | Method | Route | Payload / Parameters |
| --- | --- | --- | --- |
| Read state | GET | `/api/state` | — |
| Find (board map) | GET | `/api/find` | Optional: `?q=`, `?milestoneId=`, `?list=` |
| Create chart | POST | `/api/charts` | `boardId`, `title`; optional: `markdown`, `description` |
| Create milestone | POST | `/api/milestones` | `boardId`, `title`, `code` |
| Create card | POST | `/api/cards` | `boardId`, `milestoneId`, `listId`, `title`; optional: `priority`, `kind` |
| Update card | PATCH | `/api/cards/{id}` | `boardId`; optional: `listId`, `title`, `priority`, `kind` |
| Move card | POST | `/api/cards/{id}/move` | `listId` |
| Delete card | DELETE | `/api/cards/{id}` | — |
| Write findings | POST | `/api/milestones/{id}/artifacts` | `boardId`, `artifactType: "findings"`, `title`, `summary`, `body` |
| Write outcomes | POST | `/api/milestones/{id}/artifacts` | `boardId`, `artifactType: "outcomes"`, `title`, `summary`, `body` |
| Write memory | POST | `/api/memory/events` | `memoryKey`, `value`, `sourceType`, `eventType: "upsert"` |
| Query memory | GET | `/api/memory/query` | `?q=` (prefix) |

### Discrete Context Windows Handoff

Before completing an MCD task card, write handoff memory:

```json
POST /api/memory/events
{
  "memoryKey": "task.{issueNumber}.handoff",
  "eventType": "upsert",
  "sourceType": "verified-system",
  "bucket": "ref",
  "ttlSeconds": 604800,
  "value": {
    "issueNumber": "...",
    "cardTitle": "...",
    "completedAt": "...",
    "outcomeArtifactId": null,
    "summary": "1-2 sentence completion summary",
    "residualNotes": "context for next session"
  }
}
```
