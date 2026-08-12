# Deployment Plan — Sierra Estates

> **This is the only deployment document in this repository.** Every other deploy
> doc (`DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md`, `DEPLOY_FIRESTORE_RULES.md`,
> `docs/DEPLOYMENT.md`, `PHASE_1_DEPLOYMENT_SUMMARY.md`,
> `PHASE_1_4_OBSERVABILITY_DEPLOYMENT.md`, `GITHUB_PUSH_INSTRUCTIONS.md`) was deleted
> because each one contradicted the others. They live in git history if you need them.
> If any file — including `CLAUDE.md` — disagrees with this one, **this one wins**, and
> the other file is the bug.
>
> Last verified against the repo: **2026-08-10**. A change to where or how something
> deploys is not "done" until it is reflected here.

---

## 0. The rules, in eight lines

1. **Two Vercel projects, one per app.** Client site and admin console are separate projects with separate build pipelines. They never share a deployment.
2. **`main` is the only thing that reaches production.** Branch → draft PR → green CI → squash-merge. Never commit to `main`.
3. **Heavy or long-running work never runs in a Next.js request or a Vercel function.** Scrapers, browser sessions, multi-minute agents, bulk sends → a worker. The web apps only *trigger and monitor* them.
4. **Firebase is backend-only.** Firestore, Storage, Auth, Functions. The one Firebase Hosting site serves a 302 redirect and nothing else. Never host a web app on Firebase.
5. **One root domain: `sierra-estates.net`.** Every new surface is a subdomain, never a new root domain.
6. **Secrets never enter git.** `NEXT_PUBLIC_*` values are public by design; everything else lives in the Vercel env store and GitHub Secrets.
7. **Firebase rules and Functions deploy manually, on purpose.** No push trigger. A bad rules deploy locks out the whole product.
8. **Any new app registers itself in the §2 matrix here before its first deploy.**

---

## 1. Architecture

```
                          sierra-estates.net                admin.sierra-estates.net
                          (Vercel project: client)          (Vercel project: admin)
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────┐
│ apps/sierra-estates-realty               │   │ apps/admin-dashboard                 │
│   Next.js 16 · App Router · Turbopack    │   │   Vite SPA · React 19 · TypeScript   │
│                                          │   │                                      │
│   /            public marketing site     │   │   The MAIN staff console:            │
│   /admin       small in-app admin        │   │   CRM kanban, leads, listings hub,   │
│   /api/*       lightweight API — only    │   │   bots control, audit logs,          │
│                TRIGGERS the workers      │   │   commission ledger, agents chat,    │
│   crons        thin scheduled pokes      │   │   DB editor                          │
│                                          │   │                                      │
│                                          │   │   /api/* ──rewrite──▶ sierra-        │
│                                          │   │            estates.net/api/*         │
└────────────┬─────────────────────┬───────┘   └──────────────────────────────────────┘
             │ Admin SDK           │ typed trigger calls
             ▼                     ▼
┌────────────────────────┐  ┌───────────────────────────────────────────────┐
│ Firebase · sierra-blu  │  │ Workers — where the heavy work actually runs   │
│  Firestore  rules-gated│  │  n8n           Docker/VPS :5678                │
│  Storage    rules-gated│  │    WhatsApp scraping + workflow automation     │
│  Auth                  │  │  apps/api      Cloud Run (FastAPI)             │
│  Functions europe-west1│  │    PropertyFinder sync + bot integration       │
│  Hosting   302 → /admin│  │  Intelligence OS  Cloud Run (Remix console)    │
│  (NOT an app host)     │  │  GitHub Actions   scheduled external data-sync │
└────────────────────────┘  └───────────────────────────────────────────────┘
```

**Why this shape.** The public site stays fast and cheap. The admin can be busy without
touching it. And the genuinely heavy, stateful work — a persistent WhatsApp browser
session, a long agent run — lives on always-on infra that Vercel's serverless model
cannot host anyway.

**There are two admin surfaces and both are live.** `apps/sierra-estates-realty/app/admin/`
is a small in-app surface at `sierra-estates.net/admin` (~5 files). `apps/admin-dashboard`
is the main staff console at `admin.sierra-estates.net` (~100 files, its own Vercel
project). Deleting `apps/admin-dashboard` takes the admin console offline.

---

## 2. Deployment matrix — what deploys where

| Component | Path | Host | Trigger | Endpoint |
| --- | --- | --- | --- | --- |
| **Public site + API + small admin** | `apps/sierra-estates-realty` | Vercel (Next.js) | Vercel Git integration, push to `main` | `sierra-estates.net` |
| **Staff admin console** | `apps/admin-dashboard` | Vercel (Vite SPA) | Vercel Git integration, push to `main` | `admin.sierra-estates.net` |
| **Firestore + Storage rules** | `apps/sierra-estates-realty/firestore.rules`, root `storage.rules` | Firebase · `sierra-blu` | **Manual** — `deploy-firebase-rules.yml` (`workflow_dispatch`) or `pnpm deploy:firebase` | n/a |
| **Cloud Functions** | `functions/` | Firebase · `sierra-blu` · europe-west1 | **Manual** — `pnpm deploy:firebase` | n/a |
| **Legacy-admin redirect** | `firebase/admin-redirect/` | Firebase Hosting site `admin-sierra-blu` | **Manual** — `deploy-firebase.yml` (`workflow_dispatch`) | 302 → `sierra-estates.net/admin` |
| **Python API + bots** | `apps/api` | Cloud Run (FastAPI) | `gcloud run deploy`, own pipeline | gated by `PYTHON_API_BASE_URL` |
| **Intelligence OS** | external (Remix) | Cloud Run | `gcloud run deploy`, own pipeline | `NEXT_PUBLIC_INTELLIGENCE_OS_URL` |
| **WhatsApp scraping + automation** | `workflows/`, n8n templates | n8n · Docker/VPS :5678 | imported in the n8n UI; triggered by webhook | internal |
| **Scheduled external sync** | `workflows/*` | GitHub Actions | `external-workflows.yml` cron | n/a |
| **Shared libraries** | `packages/*` | — | **not deployed** — consumed at build time | n/a |

### Vercel projects

Vercel team: **`sierra-estates-projects`** (`team_UvdJ5ezVTaqEKyhqZ5QVqOKJ`).

| | Client | Admin |
| --- | --- | --- |
| Vercel project name | **`se-vercel-deploy-sierra-estates-realty`** ✅ confirmed | **`admin-dashboard`** ✅ confirmed |
| Vercel project ID | **`prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E`** ✅ confirmed | **`prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA`** ✅ confirmed |
| Package name | `sierra-estates-client-page` | `sierra-estates-admin-page` |
| Root Directory | `apps/sierra-estates-realty` ✅ confirmed | `apps/admin-dashboard` ✅ confirmed |
| Framework preset | Next.js | Vite |
| Live config file | `apps/sierra-estates-realty/vercel.json` | `apps/admin-dashboard/vercel.json` |
| Plan | **Hobby** ✅ confirmed (see §7) | — |
| Domain | `sierra-estates.net` | `admin.sierra-estates.net` |

> **Read this before trusting any project ID in this repo.**
>
> Four different client IDs and two different admin IDs have circulated here. Both IDs above
> are the ones Vercel's own GitHub integration reported on PR #187 (2026-08-10), each
> building its app from this repository and deploying a preview successfully. That is the
> evidence standard; nothing else in this repo met it.
>
> **`.agents/AGENTS.md` had the admin project exactly backwards.** It named
> `prj_NMqZUADX9A5ba22ylMfls2l7I0zX` as the official admin project and `prj_W2gYCo…` as a
> "legacy" project never to deploy to — but `prj_W2gYCo…` is the one actually wired to this
> repository. The likeliest explanation is that those IDs belong to a *different*
> repository's projects (`Sierra-Estates-Final`) and were copied here.
>
> Still unverified — only the Vercel dashboard can settle these:
>
> - Do these projects hold the **production domains**, or do they only build previews while
>   some other project serves `sierra-estates.net` / `admin.sierra-estates.net`?
> - Does `prj_NMqZUADX9A5ba22ylMfls2l7I0zX` exist in this team at all?
>
> Never take a project ID from a doc — including this one — when the dashboard is available.
> Stale IDs seen in this repo: `prj_zOF7om…`, `prj_theA731k…`, `prj_NMqZUA…`.

---

## 3. How a change reaches production

```
feature branch ──PR──▶ CI (lint · test · build, all hard gates)
                              │
                        squash-merge to main
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
   Vercel builds client project    Vercel builds admin project
   (skipped by ignoreCommand       (skipped by ignoreCommand
    if nothing relevant changed)    if nothing relevant changed)
              │                               │
              ▼                               ▼
     sierra-estates.net              admin.sierra-estates.net
```

1. Branch from `main`. Never commit to `main` — it is protected.
2. Open a **draft PR**. CI runs on every PR to `main`.
3. Mark ready, get review, **squash-merge** when green.
4. Vercel's Git integration picks up the push to `main` and builds each connected project
   independently. Each project's `vercel.json` has an `ignoreCommand` that skips the
   build when neither the app, `packages/`, nor the lockfile/workspace/turbo config
   changed — so an admin-only PR does not rebuild the client and vice versa.
5. Backend changes (rules, Functions) are **separate manual steps** — see §5.

Both projects are confirmed Git-connected to this repository — verified on PR #187, where
`admin-dashboard` and `se-vercel-deploy-sierra-estates-realty` each reported their own
deployment status. The client project's status check is named after the project, so a
failing client build shows up as **`Vercel – se-vercel-deploy-sierra-estates-realty`**.

### `.github/workflows/deploy-vercel.yml` is disabled — do not re-enable casually

The workflow exists but its `push` trigger is commented out (disabled 2026-08-08, PR #165).
It is `workflow_dispatch`-only and **is not the deploy path**. Every recorded run of it
ended in failure or cancellation, while Vercel's native Git integration deploys both apps
correctly. It was a redundant second path racing the one that works.

If you ever re-enable it, the known remaining blocker is `vercel deploy --prebuilt`
failing to upload dangling pnpm symlinks:
`ENOENT: lstat .../node_modules/.pnpm/@opentelemetry+api@1.9.1/...`. Dropping
`--archive=tgz` did not help. Solve that first, and delete the native Git integration in
the same change — running both is what produced duplicate deployments before.

> Several files in this repo still claim "GitHub Actions is the only deploy path" and
> "Vercel Git auto-deploy is OFF". That was the intent, never the reality. The root
> `vercel.json` does set `git.deploymentEnabled: false`, but **Vercel never reads that
> file** — see §4 — which is exactly why Git deploys still happen.

---

## 4. Which config file Vercel actually reads

This has caused real production bugs, so it is worth being blunt about.

Vercel reads `vercel.json` **from the project's Root Directory only**. Both projects have
a Root Directory pointing inside `apps/`, so:

- ✅ `apps/sierra-estates-realty/vercel.json` — **live** for the client project.
- ✅ `apps/admin-dashboard/vercel.json` — **live** for the admin project.
- ❌ **Root `vercel.json` is not read by either project.** Its `crons`, `headers`,
  `rewrites`, `redirects`, `regions: fra1`, and `git.deploymentEnabled: false` have never
  applied in production.

The root file is kept only as a ready-made fallback for the alternate topology (Root
Directory = repo root). Treat it as documentation, not configuration. **Never fix a
production config problem by editing it.**

What this cost, and what is now true:

- **Crons were dead.** The five scheduled jobs were declared only in the root file, so
  they never fired. They now live in `apps/sierra-estates-realty/vercel.json` — see §7.
- **Security headers were fine anyway**, by luck: `X-Content-Type-Options`,
  `X-Frame-Options`, `X-XSS-Protection`, and `Referrer-Policy` are set in
  `next.config.ts` `headers()`, which is real. The root `vercel.json` copy is redundant.
- **The `/old-landing` → `/` redirect is still dead.** It exists only in the root file.
  Move it into `next.config.ts` `redirects()` if it is still wanted.

---

## 5. Firebase — backend only

Project: **`sierra-blu`**. Config: `firebase.json`, `.firebaserc`.

| Deploy | Command | Workflow |
| --- | --- | --- |
| Firestore + Storage rules | `pnpm deploy:firebase` | `deploy-firebase-rules.yml` — manual only |
| Cloud Functions | `pnpm deploy:firebase` | none — run locally |
| Admin redirect (Hosting) | `firebase deploy --only hosting:sierra-estates-admin` | `deploy-firebase.yml` — manual only |

Nothing here runs on push, deliberately: a bad rules deploy locks every user out of the
database, so it stays a human decision.

Two path details that are easy to get wrong:

- `firebase.json` reads Firestore rules from **`apps/sierra-estates-realty/firestore.rules`**.
  The root `firestore.rules` is **not** the deployed file.
- Storage rules **do** come from the root `storage.rules`.

The Firebase Hosting site `admin-sierra-blu` serves a 302 redirect to
`https://sierra-estates.net/admin` and nothing else. It is not a web host and must never
become one.

---

## 6. Domains and DNS

- `sierra-estates.net` → client Vercel project.
- `admin.sierra-estates.net` → admin Vercel project.
- A domain can only be attached to **one** Vercel project. To move one, detach it from
  the current project first.
- New surfaces get a subdomain of `sierra-estates.net`. Never a new root domain.

---

## 7. Scheduled jobs

**Every scheduled job runs from GitHub Actions. There are no Vercel crons.**

The client Vercel project is on the **Hobby** plan, which allows at most 2 cron jobs and
daily schedules only. Declaring the five jobs in `vercel.json` does not degrade — it fails
the entire deployment. Verified on PR #187:

```
Hobby accounts are limited to daily cron jobs. This cron expression
(0 */6 * * *) would run more than once per day.
```

So `apps/sierra-estates-realty/vercel.json` deliberately declares **no** `crons` key:

| Workflow | Endpoint | Schedule (UTC) |
| --- | --- | --- |
| `scheduled-crons.yml` | `/api/cron/sync-leads` | `0 0 * * *` |
| `scheduled-crons.yml` | `/api/cron/ingest-from-sheets` | `0 0 * * *` |
| `scheduled-crons.yml` | `/api/cron/sync-listings` | `0 6 * * *` |
| `scheduled-crons.yml` | `/api/cron/maintenance` | `0 23 * * *` |
| `scheduled-crons.yml` | `/api/cron/sync-master-sheet` | `0 */6 * * *` |
| `whatsapp-dispatch-cron.yml` | `/api/cron/whatsapp-dispatch` | `*/10 8-18 * * *` |
| `external-workflows.yml` | external data-sync scripts | several, incl. `*/30 * * * *` |

Each workflow calls the route over HTTPS with `Authorization: Bearer $CRON_SECRET`, and
every route enforces it. The `CRON_SECRET` repo secret must match the `CRON_SECRET`
environment variable on the client Vercel project, or every run returns 401.

**If the project is upgraded to Pro**, the five daily-ish jobs may move back into
`vercel.json`. **Move them, do not duplicate them** — a job defined in both places fires
twice, and these write to Firestore and Google Sheets.

A cron route must stay a thin poke. If the work behind it is heavy, the route triggers a
worker and returns — it does not do the work itself.

---

## 8. Environments and secrets

| Scope | Where values live |
| --- | --- |
| Vercel (prod + preview) | Vercel project → Environment Variables: `NEXT_PUBLIC_*`, `SBR_SECRET_KEY`, `N8N_*`, `PYTHON_API_BASE_URL`, `SESSION_SECRET`, Firebase Admin credentials |
| Firebase Functions | `firebase functions:config` / runtime env |
| Cloud Run | service env vars — `PROPERTY_FINDER_*`, `ALLOWED_ORIGINS`, … |
| GitHub Actions | repo Secrets: `VERCEL_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU`; repo Variables: `NEXT_PUBLIC_FIREBASE_*` |

Env vars are set **per Vercel project** — the client and admin projects do not share
them. Adding a variable to one does not add it to the other.

Never commit service-account JSON, tokens, or private keys. `NEXT_PUBLIC_*` values are
public by design; they are protected by Firestore rules and App Check, not by secrecy.
Canonical templates: root `.env.example` and `apps/sierra-estates-realty/.env.local.example`
— names only, never values.

---

## 9. CI gates (`.github/workflows/ci.yml`, every PR and push to `main`)

| Step | Scope | Status |
| --- | --- | --- |
| Build workspace packages | `packages/*` | hard gate |
| Type-check workspace packages | `packages/*` | hard gate |
| Lint realty app | `sierra-estates-client-page` | hard gate |
| Unit tests | `sierra-estates-client-page` | hard gate |
| Build realty app | `sierra-estates-client-page` | hard gate — also type-checks the app, because `next.config.ts` sets `typescript.ignoreBuildErrors: false` |
| CodeQL (`codeql.yml`) | repo | security analysis |

There is deliberately no separate `tsc --noEmit` step for the realty app: `next build`
already type-checks it against the same tsconfig. `pnpm --filter sierra-estates-client-page type-check`
remains the fast local check.

> ⚠️ **`apps/admin-dashboard` is not in CI at all** — not linted, not type-checked, not
> built, not tested. It deploys straight to `admin.sierra-estates.net` on merge with zero
> pre-merge verification, so a broken admin build is only discovered by Vercel after the
> merge has landed. See §12.

---

## 10. Rollback

- **Vercel:** redeploy the previous deployment from the dashboard, or `vercel rollback <url>`. Builds are immutable, so rollback is instant. Do this per project — rolling back the client does not roll back the admin.
- **Firestore / Storage rules, Functions:** re-deploy from the previous commit's files.
- **Cloud Run:** shift 100% of traffic to the previous revision.
- **n8n:** disable the offending workflow in the UI.
- Because production only ever comes from `main`, the durable fix for a bad deploy is a
  revert PR. Never hot-edit production.

---

## 11. Adding a new app or service

| If it is a… | It deploys to… | You must… |
| --- | --- | --- |
| Web UI / site | Vercel, on a subdomain | add to the pnpm workspace; give it `lint`/`type-check`/`build` scripts; **add it to `ci.yml`**; create its own Vercel project; pick `something.sierra-estates.net` |
| Backend API / bot / worker | Cloud Run or a worker | containerize; expose a health endpoint; gate the caller behind an env var so it is dormant by default |
| Scheduled job | Vercel cron if daily and thin; otherwise GitHub Actions or n8n | keep each run short; heavy work goes to a worker |
| Long-running or stateful | n8n / VPS / Cloud Run — **never Vercel** | run on always-on infra; expose a webhook the app can trigger |
| Shared code | `packages/*` — not deployed | export a typed API |

**Checklist before the first deploy**

- [ ] Workspace member; `lint`, `type-check`, `build` scripts exist.
- [ ] **Wired into `ci.yml`** — a workspace member is not automatically gated.
- [ ] Deploy path defined: its own Vercel project, or a documented command.
- [ ] Env and secrets placed in that project's store — nothing committed.
- [ ] Serves HTTP on a `sierra-estates.net` subdomain.
- [ ] Heavy work runs on a worker, not in a request path.
- [ ] Registered in the §2 matrix here **and** in `CLAUDE.md`.

---

## 12. Open items

- [ ] **Confirm both production domains.** Both projects are proven to build previews from this repo; which project each production domain is attached to is not proven (§2).
- [ ] **Reconcile `prj_NMqZUADX9A5ba22ylMfls2l7I0zX`.** `.agents/AGENTS.md` called it the official admin project and `prj_W2gYCo…` legacy; the evidence is the reverse. Determine whether it exists in this team, then delete the loser from every doc.
- [ ] **Set `CRON_SECRET` as a repo secret** if it is not already, matching the client Vercel project's `CRON_SECRET` env var — otherwise every job in `scheduled-crons.yml` returns 401 (§7).
- [ ] **Decide whether to upgrade the client project to Pro.** On Hobby all scheduled jobs must stay in GitHub Actions (§7). Pro would allow the five daily-ish jobs to move back to Vercel crons — move, never duplicate.
- [ ] **Put `apps/admin-dashboard` in CI.** Add a job running its `type-check` and `build`. It is live in production with no pre-merge gate at all — the single largest hole in this pipeline.
- [ ] **Verify each Vercel project's Root Directory in the dashboard** matches §2. Nothing in the repo enforces it now that `deploy-vercel.yml` is disabled — the re-pinning `PATCH` step only ran as part of that workflow.
- [ ] Move the `/old-landing` → `/` redirect into `next.config.ts`, or drop it (§4).
- [ ] Decide the root `vercel.json`'s fate: keep as documented fallback, or delete it so nobody edits it expecting an effect.
- [ ] Deploy the Firestore + Storage rules — still pending per `NEXT_STEPS.md`.
- [ ] `design/ui_kits/admin/` is missing: `_ds_manifest.json` referenced `index.html` and `index-print-1z0w2hh.html` ("Intelligence OS Dashboard") but neither exists, and neither was ever committed. The dangling entries were removed on 2026-08-10 so the manifest validates. The kit's **JS sources survive compiled inside `design/_ds_bundle.js`** (`ui_kits/admin/app.jsx`, `data.js`, `parts.jsx`); only the HTML shells are lost. Re-export them from Claude Design to restore the kit.

---

## 13. Anti-patterns — never do these

- ❌ Run a scraper, a multi-minute agent, or a browser session inside a Vercel route or cron body.
- ❌ Delete `apps/admin-dashboard`, or treat it as dead code. It is the live staff console.
- ❌ Fix a production config problem by editing the root `vercel.json` (§4).
- ❌ Host a web app on Firebase Hosting.
- ❌ Have two apps write the same Firestore collections with divergent logic.
- ❌ Commit secrets, service-account JSON, or tokens.
- ❌ Force-push or commit directly to `main`.
- ❌ Add a new root domain instead of a `sierra-estates.net` subdomain.
- ❌ Run the `deploy-vercel.yml` workflow and Vercel's Git integration at the same time.
