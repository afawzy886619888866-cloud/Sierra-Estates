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

1. **One front door per concern.** Public site + admin → **Vercel**. Database/auth/jobs → **Firebase**. Heavy/long work → **workers** (Cloud Run / n8n / GitHub Actions).
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
                              sierra-estates.net  (Vercel · region iad1)
┌──────────────────────────────────────────────────────────────────────────────┐
│  apps/sierra-estates-realty  (Next.js 16, App Router)                          │
│    sierra-estates.net/                public marketing site (listings, etc.)   │
│    admin.sierra-estates.net/admin     staff console  (host-split, see §3)      │
│    /api/*                             lightweight API — TRIGGERS workers only   │
│    cron (vercel.json)                 thin scheduled pokes (no heavy work)      │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │ Admin SDK / REST              │ typed trigger calls
                ▼                                ▼
┌───────────────────────────────┐   ┌───────────────────────────────────────────┐
│  Firebase  (project: sierra-blu)│   │  Workers — where heavy work actually runs │
│   Firestore  (rules-gated)     │   │   n8n            Docker/VPS :5678           │
│   Storage    (rules-gated)     │   │     WhatsApp scraping + automation         │
│   Auth                         │   │   apps/api       Cloud Run (FastAPI :8000) │
│   Functions  (europe-west1)    │   │     PropertyFinder sync + bot integration  │
│   Hosting    redirect → /admin │   │   Intelligence OS Cloud Run (europe-west2) │
│   (NOT an app host)            │   │     Remix console (embedded in /admin)     │
└───────────────────────────────┘   │   GitHub Actions external-workflows.yml    │
                                     │     scheduled external data-sync           │
                                     └───────────────────────────────────────────┘
```

**Why this shape:** the public site stays fast and cheap; the admin can be busy
without touching it; and the genuinely heavy/stateful work (a persistent WhatsApp
browser session, long agent runs) lives on always-on infra that Vercel's
serverless model can't host anyway.

---

## 2. Deployment matrix — *where each thing lives*

| Component | Path | Runtime / Host | How it deploys | Domain / endpoint |
| --- | --- | --- | --- | --- |
| **Public site + Admin + API** | `apps/sierra-estates-realty` | Vercel (Next.js) | **Auto on push to `main`** → `.github/workflows/deploy-vercel.yml` | `sierra-estates.net` (+ `admin.sierra-estates.net`) |
| **Backend infra** | `firestore.rules`, `storage.rules`, `functions/` | Firebase · project `sierra-blu` | Manual → `firebase deploy --only firestore:rules,storage,functions --project sierra-blu` (or `pnpm deploy:rules` / `pnpm deploy:functions`) | n/a (Firestore/Storage/Auth) |
| **Legacy-admin redirect** | `firebase.json` hosting `sierra-estates-admin` | Firebase Hosting site `admin-sierra-blu` | Manual → `deploy-firebase.yml` | 302 → `sierra-estates.net/admin` |
| **Python API + bots** | `apps/api` | Cloud Run (FastAPI, :8000) | `gcloud run deploy` (own pipeline) | gated by `PYTHON_API_BASE_URL` |
| **Intelligence OS** | external (Remix) | Cloud Run · europe-west2 | `gcloud run deploy` (own pipeline) | `NEXT_PUBLIC_INTELLIGENCE_OS_URL` |
| **WhatsApp scraper + automation** | `workflows/`, n8n templates | n8n · Docker/VPS :5678 | imported into n8n; triggered by `N8N_BASE_URL` webhooks | internal |
| **Scheduled external sync** | `workflows/*` | GitHub Actions | `external-workflows.yml` (cron) | n/a |
| **Shared libraries** | `packages/*` | — | **not deployed** — consumed by apps at build time | n/a |
| **`apps/admin-dashboard`** | *removed* | **deleted** | legacy Vite second-admin UI removed; Firebase serves only the redirect (never an app) | — |

> Identifiers (non-secret, committed): Vercel team `team_k2jaWfzeatcYG6Qpl0ooCxQh`,
> project `prj_theA731k4WdFVhgd6DJUP6pAry6n` (root dir pinned to
> `apps/sierra-estates-realty`). Firebase project `sierra-blu`, hosting target
> `sierra-estates-admin` → site `admin-sierra-blu`.

---

## 3. Domains & DNS

- **Root (public client site):** `sierra-estates.net` → Dedicated Vercel project `sierra-estates` (Repo Var: `CLIENT_VERCEL_PROJECT_ID`).
- **Admin Console:** `admin.sierra-estates.net` → Dedicated Vercel project `sierra-admin-dashboard` (Repo Var: `ADMIN_VERCEL_PROJECT_ID`).
- **Strict Separation Policy:** Client and Admin surfaces run on **separate Vercel projects** for full compute and deployment isolation.
  - Remove `admin.sierra-estates.net` from the `sierra-estates` client project.
  - Attach `admin.sierra-estates.net` strictly to the `sierra-admin-dashboard` project.
  - `.github/workflows/deploy-vercel.yml` deploys each target independently to its respective Vercel project.
- **Rule:** new surfaces get a **subdomain of `sierra-estates.net`**, never a new root domain.

---

## 4. Environments & secrets

| Scope | Where values live | Notes |
| --- | --- | --- |
| Vercel (prod/preview) | Vercel project → Environment Variables | `ADMIN_HOST`, `NEXT_PUBLIC_*`, `SBR_SECRET_KEY`, `N8N_*`, `PYTHON_API_BASE_URL`, Firebase Admin creds |
| Firebase Functions | `firebase functions:config` / runtime env | server-only |
| Cloud Run (api, OS) | service env vars | `PROPERTY_FINDER_*`, `ALLOWED_ORIGINS`, etc. |
| GitHub Actions | repo **Secrets** | `VERCEL_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU`, `NEXT_PUBLIC_FIREBASE_*` |

**Never commit** service-account JSON, tokens, or private keys. `*.env.example`
files document *names only*. `NEXT_PUBLIC_*` are public by design (protected by
Firestore rules + App Check, not secrecy). Canonical env templates: root
`.env.example` and `apps/sierra-estates-realty/.env.local.example`.

---

## 5. CI/CD gates (`.github/workflows/ci.yml`, runs on every PR + push to `main`)

| Step | Status today | Policy target |
| --- | --- | --- |
| **Lint** (`pnpm run lint`, turbo, all workspaces) | **Hard gate — blocks** | keep blocking |
| **Type-check** (`tsc --noEmit`) | **Hard gate — blocks** | keep blocking |
| **Build** (`pnpm run build`, turbo) | **Hard gate — blocks** | keep blocking |
| **Test** (`pnpm test:ci`) | non-blocking | make blocking as coverage grows |
| **CodeQL** (`codeql.yml`) | security analysis | keep |

> Reality check: Lint, type-check, and build are all hard gates now (verified
> locally against current `main` — all three pass clean). Test coverage is still
> thin and stays non-blocking until that improves.

---

## 6. Release flow (how a change reaches production)

```
feature branch  ──PR──▶  CI (lint hard-gate)  ──review──▶  squash-merge to main
                                                                  │
                    push to main triggers deploy-vercel.yml ──────┘
                                  │
                                  ▼
                    production live at sierra-estates.net
```

1. Branch from `main` (never commit to `main`).
2. Open a **draft PR**; let CI run; mark **ready**; **squash-merge** when green.
3. Merge to `main` → `deploy-vercel.yml` builds + deploys **production** automatically.
4. **Backend** changes (rules/functions): `firebase deploy --only firestore:rules,storage,functions --project sierra-blu` (or `pnpm deploy:rules` / `pnpm deploy:functions`). The **`deploy-firebase.yml`** Action deploys only the admin **redirect**, not rules/functions.
5. **Cloud Run** apps (`apps/api`, Intelligence OS): deploy via their own `gcloud run deploy`.
6. **n8n** workflows: import/update in the n8n UI.

---

## 7. Policy — adding ANY new app or service

Before a new thing ships, classify it and follow its lane:

| If it's a… | It deploys to… | You must… |
| --- | --- | --- |
| **Web UI / site** | Vercel, on a **subdomain** | add to pnpm workspace; ensure `lint` script; add a deploy workflow or reuse Vercel; pick `something.sierra-estates.net` |
| **Backend API / bot / worker** | **Cloud Run** (or a worker) | containerize; expose health; set service env; gate the caller behind an env var (dormant by default) |
| **Scheduled job** | **GitHub Actions** (or n8n) | add a workflow with a `cron`; keep each run short |
| **Long-running / stateful** (browser session, queue) | **n8n / VPS / Cloud Run**, **never Vercel** | run on always-on infra; expose a webhook the app can trigger |
| **Shared code** | `packages/*` (**not deployed**) | export a typed API; consumed by apps |

**Checklist for every new app**

- [ ] Added to the pnpm/Turbo workspace; `lint` (ideally `type-check`, `build`) scripts exist — Turbo runs them in CI automatically.
- [ ] Lint passes (hard gate).
- [ ] Deploy path defined (workflow or documented command).
- [ ] Env/secrets placed in the right platform store — **nothing committed**.
- [ ] Uses a **subdomain of `sierra-estates.net`** if it serves HTTP.
- [ ] Heavy/long work runs on a worker, not in a request path.
- [ ] **Registered in the §2 matrix here and in `CLAUDE.md`.**

---

## 8. Anti-patterns — what must NEVER happen

- ❌ Running a scraper / multi-minute agent / browser session as a Vercel route or cron body.
- ❌ A second admin UI, or admin features built outside `apps/sierra-estates-realty/app/admin/`.
- ❌ Hosting the Next.js app on Firebase (`frameworksBackend`) — it competes with Vercel. (Removed; do not reintroduce.)
- ❌ Two apps writing the same Firestore collections with divergent logic.
- ❌ Committing secrets / service-account JSON / tokens.
- ❌ Force-pushing or committing directly to `main`.
- ❌ A new root domain instead of a `sierra-estates.net` subdomain.

---

## 9. Rollback & incidents

- **Vercel:** redeploy the previous deployment from the dashboard, or `vercel rollback <url>`. (Builds are immutable; rollback is instant.)
- **Firebase rules/functions:** re-deploy the previous commit's files.
- **Cloud Run:** shift 100% traffic to the previous revision.
- **n8n:** disable the offending workflow in the UI.
- Because Vercel deploys only from `main`, a bad deploy is reverted by reverting the merge (new PR) — never by hot-editing production.

---

## 10. Current gaps to reach the target state

- [x] Promote **type-check** and **build** to hard CI gates — done in `ci.yml`; verified both pass against current `main`.
- [x] Pin the **one** Firebase project ID (`sierra-blu`) across `.firebaserc`, app env, and the admin applet config — stray `sierra-estates-realty` in `apps/admin-dashboard` fixed.
- [x] Add `admin.sierra-estates.net` to Vercel + DNS, then set `ADMIN_HOST` — reported done; confirm `https://admin.sierra-estates.net/admin/login` loads in a browser, since this sandbox couldn't independently verify it.
- [x] **`deploy-vercel.yml` was broken on every run** (all 30+ runs on `main` failed) — `actions/setup-node`'s `cache: npm` had no `package-lock.json` to key on (repo is pnpm-only), so the job died at step 3 before ever reaching the Vercel CLI steps. Fixed: added `pnpm/action-setup@v4`, switched to `cache: pnpm` + `pnpm install --frozen-lockfile`. Also added the missing `id: target` step — `steps.target.outputs.name`/`.flag` were referenced but never produced, so every deploy would have silently run as **preview**, never production, even once the install step worked.
- [x] **`apps/sierra-estates-realty/vercel.json` did not exist**, despite Vercel's Root Directory being pinned to that folder (`deploy-vercel.yml`'s PATCH step) and both `CLAUDE.md` and this file documenting it as present. Vercel only reads `vercel.json` from the configured root directory, so the root-level crons/headers/rewrites/redirects were never actually applied in production. Fixed: created `apps/sierra-estates-realty/vercel.json` mirroring the root file's crons/headers/rewrites/redirects.
- [x] `.vercel/project.json` and `.vercel/README.txt` were tracked in git despite `.gitignore` listing `.vercel` — harmless (IDs are non-secret and match the ones hardcoded in `deploy-vercel.yml`), but redundant. Fixed: untracked with `git rm --cached` so `.gitignore` is actually enforced; files remain on disk locally.
- [ ] (Optional) Split the admin into its own Vercel project for full compute isolation.
