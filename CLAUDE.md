# CLAUDE.md — Sierra Estates (Sierra-Estates-Final)

Context for Claude Code / AI sessions.

## What this is

Sierra Estates — a luxury real-estate (PropTech) platform for the New Cairo market. pnpm + Turborepo monorepo.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 (strict) · Tailwind 4 · Firebase (client SDK 12 + Admin SDK 13: Firestore, Storage, Auth) · Leaflet maps · custom i18n (en/ar, `lib/I18nContext.tsx` — `next-intl` was removed) · **Docker n8n Workflow Engine** (`localhost:5678`) · Python API (Docker/Cloud Run). Observability: OpenTelemetry + Arize.

## Deployment Architecture (authoritative)

> **Full policy: [`DEPLOYMENT.md`](./DEPLOYMENT.md)** — the single source of truth for how
> every app deploys, domains/DNS, secrets, CI gates, and how to add a new app. Read it
> before any deployment/infra change. The summary below must stay consistent with it.

Production domain: **sierra-estates.net** (Vercel). Firebase project: **sierra-blu**.

```
Vercel → apps/sierra-estates-realty (Next.js)        [auto-deploys on push to main]
  sierra-estates.net           Public site: listings, search, about, contact, concierge
  sierra-estates.net/api/*     Backend APIs (auth-guarded per route). Lightweight —
                               they only TRIGGER the workers below; no heavy/long jobs.
  admin.sierra-estates.net     Staff admin console — SAME codebase, intended as a
    /admin                     SEPARATE Vercel project so its bot/agent traffic is
    /admin/intelligence-os     isolated from the public site. Enabled by the ADMIN_HOST
    /admin/...                 env var (host-split in middleware.ts); INERT until that
                               subdomain + its Vercel project exist (single-deploy today).

Firebase (project sierra-blu) — backend + one redirect (NOT the web host)
  Firestore / Storage / Auth   Database, media, authentication (staff-gated rules)
  Functions                    Background jobs (functions/)
  Hosting (admin-sierra-blu)   302-redirects the legacy admin URL → the Vercel /admin

Workers — where the heavy / long-running work runs (NEVER inside the website)
  n8n (Docker/VPS, :5678)      WhatsApp scraping + workflow automation
  apps/api (Cloud Run)         Python: PropertyFinder sync + bot integration
  Intelligence OS (Cloud Run)  Remix cognitive console (embedded in /admin/intelligence-os)
  GitHub Actions (workflows/)  Scheduled external data-sync
```

The admin console only **triggers/monitors** the workers (via `lib/server/n8n-client.ts`
and `lib/server/python-api-client.ts`) — scrapers/agents never run in the Next.js request
path, so they cannot affect public-site performance.

**Admin lives in ONE place**: `apps/sierra-estates-realty/app/admin/`. The duplicate
`apps/admin-dashboard` (Vite SPA) has been **removed** — its Firebase Hosting site now serves
only a 302 redirect to the Vercel `/admin` (wired in `firebase.json` → `firebase/admin-redirect/`).
(The older `sierra-estates-admin-portal` was removed June 2026.)

## Config files

- `vercel.json` (root) — Vercel config when root dir = repo root (buildCommand points to the realty app)
- `apps/sierra-estates-realty/vercel.json` — Vercel config when root dir = `apps/sierra-estates-realty` in Vercel dashboard
- `firebase.json` — Functions + Firestore rules + Storage rules + emulators + Hosting (the `admin-sierra-blu` site is a 302 redirect to the Vercel `/admin`, not a real web host)
- `.firebaserc` — Firebase project: `sierra-blu` (hosting target `sierra-estates-admin` → site `admin-sierra-blu`)

## Layout

- `apps/sierra-estates-realty` — main Next.js app and the real codebase (public site + admin suite + all API routes).
- `apps/api` — standalone Python service (Docker/Cloud Run): PropertyFinder sync + bot integration.
- `functions` — Firebase Cloud Functions (ingestion pipeline: collectData, processDataForApp, + pure transform module).
- `packages/*` — shared workspace packages. The realty app consumes `@sierra-estates/memory-engine`; `packages/db` holds the shared Firestore data layer.
- `workflows` — Node scripts for the external data-sync pipeline, run on schedule by `.github/workflows/external-workflows.yml`.

## Commands (from repo root)

- `pnpm install`
- `pnpm dev` — start Next.js web app (the main app)
- `pnpm build` — build the web app
- `pnpm lint` / `pnpm type-check` / `pnpm test:ci`
- `pnpm deploy:rules` — deploy Firestore + Storage rules
- `pnpm deploy:functions` — deploy Cloud Functions
- Tests: Jest (realty app) + functions. `type-check` is a real CI gate (`tsc --noEmit`). `apps/sierra-estates-realty/next.config.ts` has `ignoreBuildErrors: false`.

## Vercel Setup

**Root Directory = `apps/sierra-estates-realty`** — this is the real, enforced setting:
`.github/workflows/deploy-vercel.yml` re-pins it via the Vercel API (`PATCH .../projects/:id`)
on every deploy, so the dashboard value is self-healing even if changed manually.
`apps/sierra-estates-realty/vercel.json` is the config Vercel actually reads (crons,
security headers, the `/api` rewrite, redirects) — keep it in sync with the root
`vercel.json` below.

- Framework Preset: `Next.js` (zero-config detected inside the app directory)
- Build/Install commands: left to Vercel's Next.js zero-config detection (no override needed)
- Deploy mechanism: **GitHub Action only** (`deploy-vercel.yml`, `vercel pull` → `vercel build` → `vercel deploy --prebuilt`). Vercel's own git auto-deploy is OFF (`git.deploymentEnabled: false`).

The root `vercel.json` is kept as a ready-made fallback for the **alternate** topology
(Root Directory = repo root) — only relevant if the dashboard root directory is ever
changed back and the re-pin step in `deploy-vercel.yml` is removed. Until then, it is
not read by Vercel; `apps/sierra-estates-realty/vercel.json` is the live one.

## Conventions

- ESLint flat config (`apps/sierra-estates-realty/eslint.config.mjs`) with `eslint-plugin-unused-imports`; unused vars/args/caught-errors must be `_`-prefixed.
- `apps/sierra-estates-realty/tsconfig.json` excludes `agents/**` and `public/**` from type-check.
- Privileged server work uses the **Admin SDK** (`@/lib/server/firebase-admin`) which BYPASSES Firestore rules. Client uses `@/lib/firebase`.

## Auth model (important)

- Client role: read from Firestore `users/{uid}.role` in {admin, manager, agent} (see `lib/AuthContext.tsx`).
- Server admin check: `verifyAdminRequest` (`lib/server/auth-guard.ts`) — Firebase Bearer token with `role==='admin'`. `verifyRequest` also accepts the `X-SBR-SECRET-KEY` header for service/cron calls.
- Edge middleware (`apps/sierra-estates-realty/middleware.ts`) matches ONLY `/api/orchestrate` — it is NOT broad protection.
- Admin page protection: client-side auth guard in `app/admin/layout.tsx` — redirects to `/admin/login` if not authenticated.
- Firestore/Storage security rules are staff-gated via `users/{uid}.role` (see `firestore.rules`) — pending deploy (see NEXT_STEPS.md).

## API Auth (hardened)

- Admin-only: `viewing-requests`, `concierge/send-whatsapp`, `telegram/setup`, `wealth/roi` → `verifyAdminRequest`
- Service+token: `admin/ingest` → `verifyRequest` (Firebase token OR X-SBR-SECRET-KEY)
- Webhook secret: `telegram/webhook`, `whatsapp/webhook`, `ingest/whatsapp` → conditional SBR_SECRET_KEY check
- Public: `listings`, `leads`, `leads/request-viewing`, `closer/initiate`, `concierge/[leadId]`, `wealth/portfolio`, `whatsapp/heartbeat`

## Reality check

Pre-production. Some services are mock/scaffolded (`MockAIService`, unwired i18n). Test coverage is thin. Stale root docs (`STATUS.md`, `TODO.md`, the AUTOMATION_*/PHASE_*/THEME_* reports) were removed in the July 2026 root cleanup — consult git history if needed; don't recreate report-style docs at the root.

## Obsidian Memory Engine & AI Sourcing

- **Vault Location:** `docs/obsidian-vault/` contains the core cognitive and database architecture notes.
- **Rules of Engagement:** For every new task, feature, or bugfix, the AI agent MUST search and read the relevant node in the Obsidian vault (e.g. `Sourcing Pipeline & Lead Aggregator.md`, `WhatsApp CRM & Hand-off Pipeline.md`).
- **Graph Alignment:** Maintain double-bracket `[[Links]]` when editing vault files to preserve the Obsidian graph view.

## Constraints for AI sessions

- GitHub access is scoped to `ahmedfawzy8866/Sierra-Estates-Final` only — do not touch other repos.
- The `main` branch is protected on GitHub. Direct commits are blocked. Never force-push or delete `main`.
- For all changes, checkout a new branch, push it to remote, and open a Pull Request.
- Do not deploy without explicit approval. Never place API keys or credentials in raw code or in chat.
