# Deployment & Architecture Policy

> **Authoritative.** This file is the single source of truth for *how Sierra Estates
> is built, deployed, and extended*. It supersedes any older deploy notes (including
> `ARCHITECTURE.md`) for anything deployment-related. The legacy deploy docs
> (`RECOMMENDATIONS.md`, `DEPLOYMENT_GUIDE.md`, `sierra_estates_OVERVIEW.md`, etc.)
> were removed in the July 2026 root cleanup and live only in git history.
> When other docs disagree with this file,
> **this file wins.** Keep it updated as the system evolves — a change to
> where/how something deploys is not "done" until it is reflected here.

---

## 0. Golden rules (the policy in 8 lines)

1. **One front door per concern.** Public site + admin → **Vercel** (isolated projects: `sierra-estates` and `sierra-admin-dashboard`). Database/auth/jobs → **Firebase**. Heavy/long work → **workers** (Cloud Run / n8n / GitHub Actions).
2. **Heavy or long-running work NEVER runs inside a Next.js request or Vercel function.** Scrapers, browser automation, multi-minute agents, bulk sends → a worker. The web app only *triggers/monitors* them through typed clients (`lib/server/n8n-client.ts`, `lib/server/python-api-client.ts`).
3. **One canonical admin:** `apps/sierra-estates-realty/app/admin/`. No second admin UI, ever.
4. **Firebase is backend-only.** No app hosting on Firebase except the single legacy-admin **redirect**. Never host the Next.js app on Firebase.
5. **`main` is protected.** Every change ships via a PR from a feature branch; CI must be green; squash-merge.
6. **Vercel git auto-deploy stays OFF** (`git.deploymentEnabled: false`). The `deploy-vercel.yml` GitHub Action is the *only* path to production.
7. **One production root domain: `sierra-estates.net`.** Every new surface is a **subdomain** (`*.sierra-estates.net`), never a new root domain.
8. **Secrets are never committed.** Public `NEXT_PUBLIC_*` values may be inlined; everything else lives in the platform's env store + GitHub Secrets. Any new app **registers itself in the matrix below before its first deploy.**

---

## 1. Architecture

```
                      ┌────────────────────────────────────────────────────────┐
                      │                   Vercel (Region iad1)                 │
                      │                                                        │
                      │  Project: sierra-estates (Client)                      │
                      │    Domain: sierra-estates.net                          │
                      │    Surface: Public marketing site, listings, lead gen  │
                      │                                                        │
                      │  Project: sierra-admin-dashboard (Admin)               │
                      │    Domain: admin.sierra-estates.net                    │
                      │    Surface: Staff console, agents hub, orchestrator    │
                      └───────────────────┬────────────────┬───────────────────┘
                                          │ Admin SDK/REST │ typed triggers
                                          ▼                ▼
┌─────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│  Firebase  (Project: sierra-blu)        │   │  Workers — where heavy work actually runs │
│   Firestore  (rules-gated via CI)       │   │   n8n            Docker/VPS :5678           │
│   Storage    (rules-gated via CI)       │   │     WhatsApp scraping + automation         │
│   Auth       (Identity Platform)        │   │   apps/api       Cloud Run (FastAPI :8000) │
│   Functions  (europe-west1, Node.js 20) │   │     PropertyFinder sync + bot integration  │
│   Hosting    redirect → /admin          │   │   Intelligence OS Cloud Run (europe-west2) │
│   (NOT an app host)                     │   │     Remix console (embedded in /admin)     │
└─────────────────────────────────────────┘   │   GitHub Actions (Scheduled / Event Cron)  │
                                              │     external-workflows.yml                 │
                                              │     whatsapp-dispatch-cron.yml             │
                                              │     vercel-cron-bridge.yml                 │
                                              └───────────────────────────────────────────┘
```

**Why this shape:** The public site and staff console run in completely isolated Vercel projects from a unified codebase (`apps/sierra-estates-realty`), ensuring zero blast radius between marketing traffic spikes and staff operations. Heavy and long-running stateful tasks (WhatsApp scraping, continuous scrapers, long agent chains) live on Cloud Run, VPS/Docker, and GitHub Actions cron runners.

---

## 2. Deployment matrix — *where each thing lives*

| Component | Path | Runtime / Host | How it deploys | Domain / endpoint |
| --- | --- | --- | --- | --- |
| **Public Client Site** | `apps/sierra-estates-realty` | Vercel (Next.js) | **Auto on push to `main`** → `.github/workflows/deploy-vercel.yml` (`role: client`) | `sierra-estates.net` |
| **Admin Console** | `apps/sierra-estates-realty` | Vercel (Next.js) | **Auto on push to `main`** → `.github/workflows/deploy-vercel.yml` (`role: admin`) | `admin.sierra-estates.net` |
| **Firestore & Storage Rules** | `firestore.rules`, `storage.rules` | Firebase · `sierra-blu` | **Auto on push to `main`** → `.github/workflows/deploy-firebase-rules.yml` (or `pnpm deploy:rules`) | n/a (Security policies) |
| **Cloud Functions** | `functions/` | Firebase Functions · `sierra-blu` | Manual / CD → `firebase deploy --only functions --project sierra-blu` (or `pnpm deploy:functions`) | `europe-west1` callable / triggers |
| **Legacy-admin redirect** | `firebase.json` (`sierra-estates-admin`) | Firebase Hosting (`admin-sierra-blu`) | `.github/workflows/deploy-firebase.yml` | 302 → `admin.sierra-estates.net/admin` |
| **Python API + bots** | `apps/api` | Cloud Run (FastAPI, :8000) | `gcloud run deploy` (containerized) | Gated by `PYTHON_API_BASE_URL` |
| **Intelligence OS** | external (Remix) | Cloud Run · europe-west2 | `gcloud run deploy` (containerized) | `NEXT_PUBLIC_INTELLIGENCE_OS_URL` |
| **WhatsApp scraper & automations** | `workflows/`, n8n templates | n8n · Docker/VPS :5678 | Webhook triggered via `N8N_BASE_URL` | Internal |
| **Scheduled Data Sync** | `workflows/*` | GitHub Actions | `.github/workflows/external-workflows.yml` | n/a |
| **Shared packages** | `packages/*` | Monorepo internal | **Not deployed independently** — built into consuming apps | n/a |

> **Identifiers (committed & non-secret)**:
> - Vercel Org ID: `team_UvdJ5ezVTaqEKyhqZ5QVqOKJ` (or repo var `VERCEL_ORG_ID`)
> - Client Vercel Project: `prj_theA731k4WdFVhgd6DJUP6pAry6n` (repo var `CLIENT_VERCEL_PROJECT_ID`)
> - Admin Vercel Project: `prj_NMqZUADX9A5ba22ylMfls2l7I0zX` (repo var `ADMIN_VERCEL_PROJECT_ID`)
> - Firebase Project: `sierra-blu`
> - Firebase Hosting Target: `sierra-estates-admin` → Site: `admin-sierra-blu`

---

## 3. Domains & DNS Configuration

- **Root (Client Public Portal):** `sierra-estates.net` → Dedicated Vercel project `sierra-estates` (`CLIENT_VERCEL_PROJECT_ID`).
- **Admin Console:** `admin.sierra-estates.net` → Dedicated Vercel project `sierra-admin-dashboard` (`ADMIN_VERCEL_PROJECT_ID`).
- **Strict Compute & Deployment Separation:**
  - `sierra-estates.net` is attached exclusively to the client project.
  - `admin.sierra-estates.net` is attached exclusively to the admin project.
  - Host filtering in `middleware.ts` routes requests based on `ADMIN_HOST` to prevent cross-domain pollution.
  - `.github/workflows/deploy-vercel.yml` deploys both matrix targets independently with immutable build artifacts.
- **Rule:** Every new surface gets a **subdomain of `sierra-estates.net`** (e.g. `api.sierra-estates.net`), never a new root domain.

---

## 4. Environments & Secrets Management

| Scope | Location | Items |
| --- | --- | --- |
| **Vercel (Prod/Preview)** | Vercel Project Environment Variables | `ADMIN_HOST`, `SESSION_SECRET`, `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `N8N_BASE_URL`, `PYTHON_API_BASE_URL` |
| **Firebase Functions** | Cloud Secret Manager / Runtime Env | `FIREBASE_ADMIN_*`, service keys |
| **Cloud Run (API/OS)** | Cloud Run Environment Variables | `PROPERTY_FINDER_*`, `ALLOWED_ORIGINS`, DB connection URLs |
| **GitHub Actions** | Repository Secrets & Variables | `VERCEL_TOKEN`, `CLIENT_VERCEL_PROJECT_ID`, `ADMIN_VERCEL_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU` |

**Security Guardrail:** Service account private keys, API secrets, and signing tokens must never be committed to source control. Canonical templates: `.env.example` and `apps/sierra-estates-realty/.env.local.example`.

---

## 5. CI/CD Gates (`.github/workflows/ci.yml`)

Runs on every Pull Request and push to `main`:

| Gate | Command | Enforcement |
| --- | --- | --- |
| **Lint** | `pnpm run lint` (Turbo, all workspaces) | **Hard Gate — Blocks merge** |
| **Type Check** | `pnpm run type-check` (tsc across packages) | **Hard Gate — Blocks merge** |
| **Build** | `pnpm run build` (Turbo cache verification) | **Hard Gate — Blocks merge** |
| **Unit & Integration Tests** | `pnpm test:ci` (Vitest) | Hard Gate for critical paths |
| **CodeQL Security Analysis** | `.github/workflows/codeql.yml` | Security vulnerability scan |

---

## 6. Release Flow (Production Path)

```
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ Feature Branch  │ ────▶ │ Pull Request & Review  │ ────▶ │ CI Gates Pass (Hard)   │
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
                                                                       │
                                                                       ▼
┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ Production Live        │ ◀──── │ Matrix Deploy Vercel   │ ◀──── │ Squash-Merge to `main` │
│ (Client & Admin)       │       │ deploy-vercel.yml      │       └────────────────────────┘
└────────────────────────┘       └────────────────────────┘
```

1. **Branching**: Create branch from `main` (`feature/xyz` or `fix/abc`). Never push directly to `main`.
2. **Pull Request**: Open PR, verify all CI gates (`lint`, `type-check`, `build`) pass green.
3. **Squash-Merge**: Merge PR to `main`.
4. **Vercel Continuous Deployment**: `.github/workflows/deploy-vercel.yml` deploys both `client` (`sierra-estates.net`) and `admin` (`admin.sierra-estates.net`) simultaneously.
5. **Firebase Security Deployment**: `.github/workflows/deploy-firebase-rules.yml` applies updated `firestore.rules` and `storage.rules`.
6. **Backend Cloud Functions**: Deployed manually or via tagged releases with `pnpm deploy:functions`.

---

## 7. Policy — Adding New Apps or Services

Before adding a new app or package to the monorepo:

| Service Type | Deployment Target | Required Steps |
| --- | --- | --- |
| **Web Application** | Vercel (subdomain) | Add to `pnpm-workspace.yaml`, add `lint`/`build` scripts, register domain and matrix target in `deploy-vercel.yml`. |
| **Backend Microservice / API** | Google Cloud Run | Containerize with `Dockerfile`, set up health checks, configure environment variables, document in §2. |
| **Scheduled Worker / Sync** | GitHub Actions / n8n | Create workflow in `.github/workflows/` or import n8n template, set cron expression. |
| **Long-running Daemon / Scraper** | VPS / Cloud Run / n8n | Deploy on persistent infrastructure; expose webhooks for triggers. |
| **Shared Library** | `packages/*` | Export typed ESM/CJS interfaces; consume within apps. |

---

## 8. Anti-Patterns & Strict Boundaries

- ❌ **No heavy computation in Next.js/Vercel request handlers** (scrapers, browser sessions, bulk email).
- ❌ **No secondary admin portals**; all administrative functionality lives under `apps/sierra-estates-realty/app/admin/`.
- ❌ **No full Next.js hosting on Firebase** (`frameworksBackend`); Firebase is backend-only.
- ❌ **No direct commits to `main`**; all changes require green PR checks and review.
- ❌ **No hardcoded secrets or committed credentials**.

---

## 9. Incident Response & Rollback Runbook

- **Vercel Web Deployments**: Instant rollback available via Vercel Dashboard or CLI (`vercel rollback <deployment-url>`).
- **Firebase Security Rules**: Re-deploy previous known good rules commit via `firebase deploy --only firestore:rules,storage --project sierra-blu`.
- **Cloud Run Microservices**: Traffic can be instantly redirected to the previous revision in GCP Console.
- **n8n Automations**: Deactivate failing workflow in n8n UI.
- **Git Reversion**: Roll back faulty production changes by creating a revert PR on `main`.

---

## 10. Completed Milestones & Current State

- [x] **Hard CI Gates**: Enforced `lint`, `type-check`, and `build` in `.github/workflows/ci.yml`.
- [x] **Firebase Project Unification**: Consolidated all environments to single canonical project `sierra-blu`.
- [x] **Dual-Project Vercel Separation**: Split client (`sierra-estates.net`) and admin (`admin.sierra-estates.net`) into isolated Vercel projects orchestrated by matrix CI/CD in `deploy-vercel.yml`.
- [x] **Root Directory Configuration**: Root `vercel.json` and app `vercel.json` aligned for redirects, security headers, and cron tasks.
- [x] **Firebase Security Rules CI/CD**: Automated deployment of `firestore.rules` and `storage.rules` via `deploy-firebase-rules.yml`.
- [x] **Session Cookie Authentication**: Implemented and verified `POST /api/auth` token exchange and `sierra_sess` cookie flow.
- [x] **Git Cleanliness**: Cleaned up tracked `.vercel` metadata files and verified `.gitignore` enforcement.
