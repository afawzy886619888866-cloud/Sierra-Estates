# CLAUDE.md — Sierra Estates (`sierrablue8866-droid/SE-Vercel-deploy`)

Context for Claude Code / AI sessions. Last verified against the tree at commit `b1832250`.

## What this is

Sierra Estates — a luxury real-estate (PropTech) platform for the New Cairo market.
pnpm + Turborepo monorepo. Production domain **sierra-estates.net**, Firebase project
**sierra-blu**.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 (strict) · Tailwind 4 ·
Firebase (client SDK 12 + Admin SDK 14: Firestore, Storage, Auth) · Leaflet maps ·
Three.js / react-three-fiber · Framer Motion · n8n workflow engine (Docker, `:5678`) ·
Python API (Docker/Cloud Run). Observability: OpenTelemetry + Arize, bootstrapped from
`apps/sierra-estates-realty/instrumentation.ts`.

Toolchain: **Node 24** (`.nvmrc`, CI `setup-node@v7`; root `engines` still says `>=22`),
**pnpm 9.15.4** (pinned via `packageManager` — never pass a version to
`pnpm/action-setup`), Turborepo 2.

## Repository layout

```
apps/
  sierra-estates-realty   Next.js 16 app — THE deployable web surface.
                          ~288 TS/TSX files, 95 API route handlers.
                          pkg: sierra-estates-client-page
  admin-dashboard         Vite SPA staff console — LIVE, separate Vercel project.
                          ~75 src files. pkg: sierra-estates-admin-page
  api                     Python/FastAPI service (Docker → Cloud Run):
                          PropertyFinder sync + bot integration. pkg: @sierra-estates/api-py
  agents                  Operational agent scripts, NOT in the pnpm install graph —
                          each subdir has its own manifest and runs standalone:
                          whatsapp-bot (Liela/Sierra/OpenClaw/Hermes router),
                          stage-9-closer, whatsapp-scraper, sierra-estates-bot (py),
                          vertex-omni-agent (py). pkg: @sierra-estates/agents-tools
  automations             Scaffolded n8n/Node workflows (5 numbered stages).
                          pkg: @sierra-estates/automations
packages/                 17 workspace packages. The realty app depends on exactly five:
                          @sierra-estates/{agents,db,memory-engine,obsidian,ui}.
                          Others (admin-data, agents-api, agents-core, api, auth, batch,
                          config, exchange, property-finder-api, whatsapp-agent) are
                          shared/experimental; open-memory and shared have no package.json
                          and are not workspace members.
functions/                Firebase Cloud Functions — ingestion pipeline
                          (collectData, processData, pure transform module).
workflows/                Node scripts for the external data-sync pipeline, run on cron by
                          .github/workflows/external-workflows.yml.
infra/                    docker-compose, n8n workflow JSON, whatsapp-scraper infra, AWS.
docs/                     Long-form docs + the Obsidian vault (see below).
design/                   Design references and extracted styles (docs only).
scripts/                  Root-level ops/maintenance scripts (deploy helpers, seeding, etc.).
lib/  hooks/  types/      LEGACY root-level code from an older single-app layout. Not part
                          of the realty app's build. Do not add new code here — the live
                          equivalents are apps/sierra-estates-realty/{lib,components}.
```

## Deployment architecture

> `DEPLOYMENT.md` is the long-form policy doc and **the only deployment doc in this repo**
> — eight competing ones were deleted in PR #187, and it was rewritten against the tree at
> the same time. It is no longer the partly-stale document earlier revisions of this file
> warned about.

```
Vercel project 1 · prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E → apps/sierra-estates-realty
  sierra-estates.net           Public site, listings, search, map, concierge
  sierra-estates.net/api/*     ~95 route handlers. Lightweight — they only TRIGGER the
                               workers below. No heavy/long jobs in the request path.
  sierra-estates.net/admin     Small in-app admin surface (app/admin/, 4 files + login)
  admin.sierra-estates.net     Also served by this app via the host-split in proxy.ts

Vercel project 2 · prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA → apps/admin-dashboard
  admin.sierra-estates.net     Vite SPA staff console: CRM kanban, leads, listings hub,
                               bots control, audit logs, commission ledger, agents chat,
                               DB editor. Its vercel.json rewrites /api/* →
                               https://sierra-estates.net/api/* — it has no backend of
                               its own. DO NOT DELETE: this is the main staff console.

Firebase (sierra-blu) — backend only, not a web host
  Firestore / Storage / Auth   Data, media, authentication (rules staff-gated by role)
  Functions                    europe-west1, nodejs20, 540s timeout
  Hosting (admin-sierra-blu)   302 → https://sierra-estates.net/admin. That is its ONLY job.

Workers — where heavy/long-running work runs (never inside the website)
  n8n (Docker/VPS :5678)       WhatsApp scraping + workflow automation
  apps/api (Cloud Run)         Python: PropertyFinder sync + bot integration
  Intelligence OS (Cloud Run)  Remix console embedded in the admin
  GitHub Actions               Scheduled external data-sync + WhatsApp dispatch
```

The web app only **triggers/monitors** workers, through
`apps/sierra-estates-realty/lib/server/n8n-client.ts` and `.../python-api-client.ts`.

**Both admin surfaces are real and deployed.** `apps/admin-dashboard` is a workspace
member with its own `vercel.json` and Vercel project.
Never delete it, and never "consolidate" it away without explicit instruction.

⚠️ **But it is not in CI.** `.github/workflows/ci.yml` gates only `packages/*` and
`sierra-estates-client-page` — the admin app has no lint, type-check, test or build step
anywhere in CI, even though it defines the scripts. It deploys to production on merge with
no pre-merge gate, so a broken admin build is first discovered by Vercel after the fact.
Tracked in `DEPLOYMENT.md` §12.

### How deploys actually happen (read this before touching deploy config)

`.github/workflows/deploy-vercel.yml` is **DISABLED** — its `push:` trigger is commented
out (2026-08-08, PR #165) because every recorded run failed or was cancelled; the
remaining blocker is `vercel deploy --prebuilt` choking on dangling pnpm symlinks under
`node_modules/.pnpm/@opentelemetry+api@1.9.1/`. It runs on `workflow_dispatch` only.

**Vercel's native Git integration is the live deploy path** for both projects. Practical
consequences:

- Root `vercel.json` sets `git.deploymentEnabled: false`, an `ignoreCommand` that always
  exits 0, `buildCommand`, `regions`, security headers and **five cron entries**. When a
  project's Root Directory is the app directory (which is how both projects are wired),
  Vercel reads the *app-level* `vercel.json` and the root one is dead config. Treat the
  root file as a fallback for the alternate "root dir = repo root" topology, not as live
  truth.
  **Those five crons were never registered — confirmed, not just suspected.** Moving them
  into the app-level file failed the deploy outright: `Hobby accounts are limited to daily
  cron jobs. This cron expression (0 */6 * * *) would run more than once per day.` The
  client project is on **Hobby** (max 2 crons, daily only), so all five now run from
  `.github/workflows/scheduled-crons.yml` on their original UTC schedules. If the project
  is ever upgraded to Pro they may move back — *move*, never duplicate, or each job fires
  twice against Firestore and Sheets.
- `apps/sierra-estates-realty/vercel.json` is the live client config; it contains only
  `name`, `github.silent` and an `ignoreCommand` that skips the build when neither the
  app nor `packages/`, the lockfile, `pnpm-workspace.yaml` or `turbo.json` changed.
- `apps/admin-dashboard/vercel.json` sets framework `vite`, build/install commands, the
  SPA fallback rewrite and the `/api/*` proxy to the client domain.
- Security headers are also declared in `next.config.ts` `headers()`, so the client app
  gets them regardless of which `vercel.json` wins.

If you re-enable the workflow: it PATCHes each project's `rootDirectory`/`framework` via
the Vercel API, upserts env vars, strips `crons` from the admin `vercel.json`, then does
`vercel pull → build → deploy --prebuilt`. Both roles build from the repo root.

### The Vercel project IDs (docs now match observation; intent still unconfirmed)

The repo used to declare one set of Vercel projects while a different set was actually
deploying. The docs were aligned to what Vercel reports in PR #187 (2026-08-10):

| | Live — reported by Vercel on PR previews | Formerly declared, now stale |
| --- | --- | --- |
| realty | `prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E` (`se-vercel-deploy-sierra-estates-realty`) | `prj_zOF7omFCSr3I7e5jJJtVQnJg5o6E`, `prj_theA731k4WdFVhgd6DJUP6pAry6n` |
| admin | `prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA` (`admin-dashboard`) | `prj_NMqZUADX9A5ba22ylMfls2l7I0zX` |

Team `sierra-estates-projects` / `team_UvdJ5ezVTaqEKyhqZ5QVqOKJ`. Both live projects have
`rootDirectory` set to their app directory, which is what makes the root `vercel.json`
dead config.

`.agents/AGENTS.md` previously laid down three rules that reality contradicted on every
point — "all deployments orchestrated exclusively via `deploy-vercel.yml`" (disabled),
"Vercel's native GitHub integration MUST remain disabled" (it is the live path), and "do
not deploy to legacy project `prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA`" (precisely where the
admin dashboard deploys). All three are corrected there now.

**Settled:** which projects build this repo. Vercel reported them directly, and only the
docs changed — no Vercel setting was touched.

**Not settled:** whether these are the projects anyone *intended*, and which project each
production domain is attached to. Building previews from this repo is not the same as
serving `sierra-estates.net` / `admin.sierra-estates.net`; only the dashboard can settle
that. **Do not rewire Vercel or re-enable the workflow to "fix" it** — surface it and let
a human decide. Tracked in `DEPLOYMENT.md` §12.

## Key config files

| File | What it governs |
| --- | --- |
| `turbo.json` | Task graph + **`globalEnv`** — every env var the build may read must be listed here or Turbo will not pass it through |
| `pnpm-workspace.yaml` | Workspace members, the dependency `catalog:` (react/react-dom), platform `overrides:`, `minimumReleaseAge*` |
| `package.json` (root) | `pnpm.overrides` = security version bumps (active on pnpm 9). pnpm 10+ would read `overrides:` in `pnpm-workspace.yaml` instead — keep the two in sync |
| `firebase.json` | Functions, emulators, hosting redirect, and rules paths — note it points at **`apps/sierra-estates-realty/firestore.rules`**, not the root `firestore.rules` |
| `.firebaserc` | Project `sierra-blu`; hosting target `sierra-estates-admin` → site `admin-sierra-blu` |
| `tsconfig.json` (root) | `@sierra-estates/*` path aliases with `dist/*.d.ts` → `src/*.ts` fallbacks |
| `apps/sierra-estates-realty/tsconfig.json` | App aliases (`@/*`); excludes `agents/`, `apps/`, `bots/`, `functions/`, `public/`, `__tests__/` |

There are **duplicate rules files**: root `firestore.rules` / `storage.rules` and
`apps/sierra-estates-realty/firestore.rules` / `storage.rules`. `firebase.json` deploys
the app-level `firestore.rules` and the **root** `storage.rules`. Edit the ones
`firebase.json` actually references.

## Commands (from repo root)

```bash
pnpm install                    # workspace install (frozen-lockfile in CI)
pnpm dev                        # turbo run dev (persistent, all apps)
pnpm build                      # turbo run build
pnpm lint                       # turbo run lint
pnpm type-check                 # turbo run type-check
pnpm test:ci                    # turbo run test:ci
pnpm deploy:firebase            # firebase deploy --only firestore:rules,storage,functions
```

Targeting one package is usually what you want:

```bash
pnpm --filter sierra-estates-client-page dev
pnpm --filter sierra-estates-client-page type-check   # fast local check (tsc --noEmit)
pnpm --filter sierra-estates-client-page lint         # eslint + scripts/validate-configs.mjs
pnpm --filter sierra-estates-client-page test:ci      # jest, ts-jest, node env
pnpm --filter "./packages/*" run build                # required before packages type-check
```

`pnpm deploy:rules` and `pnpm deploy:functions` **do not exist** despite being referenced
in `DEPLOYMENT.md`. Use `pnpm deploy:firebase` or a direct `firebase deploy --only ...`.

## CI (`.github/workflows/ci.yml`)

One job, on push/PR to `main`, Node 24 + pnpm cache + a Next.js `.next/cache` cache:

1. `pnpm install --frozen-lockfile`
2. **Build workspace packages first** — the root tsconfig maps `@sierra-estates/*` to
   `dist/*.d.ts` with a `src/*.ts` fallback; on a clean checkout `dist/` is missing and
   the fallback trips TS6059 (rootDir violation).
3. Type-check `packages/*`
4. Lint, unit-test, then build the realty app (with dummy `NEXT_PUBLIC_FIREBASE_*` values)

There is deliberately **no separate `tsc --noEmit` step for the realty app**:
`next.config.ts` sets `typescript.ignoreBuildErrors: false`, so `next build` type-checks
the whole app against the same tsconfig — verified to fail on a type error in a `lib/`
file no route imports. Type errors are a real gate; they just surface at build time.

Other workflows: `backend-tests.yml` (path-filtered), `codeql.yml`, `dependency-review.yml`,
`defender-for-devops.yml`, `deploy-firebase.yml` / `deploy-firebase-rules.yml`
(`workflow_dispatch` only), `external-workflows.yml` (4 crons: 08:00/09:00/10:00 daily +
every 30 min), `whatsapp-dispatch-cron.yml` (every 10 min, 08–18 UTC — curls
`https://sierra-estates.net/api/cron/whatsapp-dispatch`), plus labeler/stale/pr-size/auto-assign.

## The realty app — architecture notes that will surprise you

- **The public marketing site is static HTML served out of `public/client-page/`.**
  `next.config.ts` `rewrites()` maps `/` and every marketing path (`/roi`, `/compounds`,
  `/properties`, `/property`, `/pricing`, `/advice`, `/ai-engine`, `/matches`, `/career`,
  `/virtual-tour`, …) to `/client-page/*.html`, with a catch-all `fallback` rewrite to
  `/client-page/:path*`. The App Router `app/` tree serves `/admin`, `/api/*`, `/client`,
  `/inventory`, `/map`, `/compounds`, `/properties`, `/property`, `/virtual-tour`.
  Editing an `app/page.tsx` may not change what users see — check the rewrite table first.
- **`proxy.ts` replaces `middleware.ts`** (Next.js 16 file convention). It is *not*
  narrow: the matcher covers everything except `_next/static`, `_next/image`, `favicon.ico`
  and image assets. It handles (a) admin host split — on `ADMIN_HOST` the root path
  rewrites to `/admin`, and off-host `/admin` requests 307-redirect to `ADMIN_HOST`;
  (b) **server-side session RBAC on every `/admin` route** except `/admin/login`;
  (c) CORS + OPTIONS preflight for `/api/*`; (d) a fail-closed `X-SBR-SECRET-KEY` gate on
  `/api/orchestrate`.
- **Server-only packages are stubbed for the browser** three ways: `serverExternalPackages`,
  `turbopack.resolveAlias` → `lib/stubs/empty.js`, and a webpack `resolve.alias[pkg] = false`
  branch. Adding a Node-native dependency means updating `SERVER_ONLY_PACKAGES` in
  `next.config.ts` and all three lists.
- `transpilePackages` lists the five workspace packages the app consumes.
- `turbopack.root` is pinned to the monorepo root so git worktrees resolve correctly.

## Auth model (two parallel systems — know which one you are in)

**1. Signed session cookie** (`lib/auth.ts`) — what the admin UI uses.
`signSession` / `verifySession` / `SESSION_COOKIE`, `requireRole(req, minRole)` with an
ordered role ladder, and `getSessionFromRequest`. `proxy.ts` enforces it on `/admin/**`;
API routes call `requireRole` (e.g. `app/api/admin/{users,audit,inquiries,dashboard}`,
`app/api/listings`). `lib/auth.ts` also contains `tryDemoLogin` / `DEMO_ADMIN` — a
credentialed demo admin path. Treat that as a production risk, not a feature to extend.

**2. Firebase ID token / shared secret** (`lib/server/auth-guard.ts`) — what service and
staff API calls use.
- `verifyRequest(req)` → `Authorization: Bearer <Firebase ID token>` **or**
  `X-SBR-SECRET-KEY: $SBR_SECRET_KEY`. Used by ingest/sync/CRM routes:
  `admin/ingest`, `admin/auth/verify`, `admin/whatsapp/send`, `crm/leads`,
  `crm/property-finder`, `properties/sync`, `sync`, `sync/{airtable,master-sheet,publish}`.
- `verifyAdminRequest(req)` → the above **plus** a Firestore lookup of `users/{uid}.role`,
  accepting `admin` **or `superadmin`**. Guards all ~30 `app/api/admin/*` routes plus
  `agent/hub`, `concierge/send-whatsapp`, `matching`, `property-finder`, `proposals`,
  `telegram/setup`, `viewing-requests`, `wealth/roi`.
- `unauthorizedResponse()` for consistent 401s.

Client-side role comes from Firestore `users/{uid}.role` (`admin | manager | agent`).
Webhook routes (`telegram/webhook`, `whatsapp/webhook`, `ingest/whatsapp`) do a
conditional `SBR_SECRET_KEY` check. Genuinely public: `listings` (read), `leads`,
`leads/request-viewing`, `closer/initiate`, `concierge/[leadId]`, `wealth/portfolio`,
`whatsapp/heartbeat`.

Privileged server work uses the **Admin SDK** (`@/lib/server/firebase-admin`), which
**bypasses Firestore rules**. Client code uses `@/lib/firebase`. Never import the admin
module from a client component.

## Conventions

- ESLint flat config. The app config
  (`apps/sierra-estates-realty/eslint.config.mjs`) turns `@typescript-eslint/no-unused-vars`
  off in favour of `eslint-plugin-unused-imports`: unused vars/args/caught-errors must be
  `_`-prefixed. `no-explicit-any` is off. The root `eslint.config.mjs` ignores `apps/**`
  and `packages/**` entirely — it only covers stray root-level TS.
- `pnpm lint` for the app also runs `scripts/validate-configs.mjs`, which parses
  `tsconfig.json`, the root `vercel.json`, `turbo.json` and `package.json`. A malformed
  JSON config fails lint.
- Tests: Jest + ts-jest, `testEnvironment: node`, files under
  `apps/sierra-estates-realty/__tests__/*.test.ts`, `@/` mapped to the app root. Coverage
  is collected from `lib/**` and `app/api/**`. ~21 test files — coverage is thin; the
  suite is mostly API-route and client-wrapper level.
- i18n is **custom**, not `next-intl` (`lib/i18n.ts`, `lib/i18n.tsx`,
  `lib/i18n-client.tsx`, `lib/I18nContext.tsx`, strings in `messages/{en,ar}.json`).
  `next-intl@^4.13.3` is still an installed dependency; earlier docs claiming it was
  removed are wrong. Don't wire new code to it without a decision.
- New env vars must be added to `turbo.json` `globalEnv` **and** `.env.example`, and set
  in the Vercel project (and GitHub Secrets/Variables if CI needs them).

## Obsidian memory engine

- Vault: `docs/obsidian-vault/` — cognitive/database architecture notes
  (`Sourcing Pipeline & Lead Aggregator.md`, `WhatsApp CRM & Hand-off Pipeline.md`,
  `Admin Console Map.md`, `Sierra Estates Memory Engine.md`, agent-intelligence notes, …).
- Before a feature or bugfix, read the relevant vault node.
- When editing vault files, preserve `[[Double Bracket Links]]` so the graph view survives.
- Code side: `packages/obsidian` and `packages/memory-engine`, consumed by the realty app.

## Known doc/reality drift (verify before trusting)

- ~~`DEPLOYMENT.md` says `deploy-vercel.yml` is "the only path to production".~~ Fixed in
  PR #187 — it documents the native Git integration as the live path.
- ~~`DEPLOYMENT.md` golden rule 3 says "one canonical admin, no second admin UI, ever".~~
  Fixed in PR #187 — it documents both live admin surfaces.
- ~~`DEPLOYMENT.md` cites `pnpm deploy:rules` / `pnpm deploy:functions`.~~ Fixed in PR #187
  — the real script is `pnpm deploy:firebase`; neither of the other two exists.
- ~~`.agents/AGENTS.md` mandates GitHub-Actions-only deploys and an "official" set of
  Vercel project IDs.~~ Fixed in PR #187 — see "The Vercel project IDs" above.
- `docs/CLAUDE.md` is an older copy of this file. This root `CLAUDE.md` is the current one.
- `pnpm-workspace.yaml` carries a long comment saying `minimumReleaseAge` must never be
  disabled — the value is currently `0`. Flag it; don't silently "fix" it either way.
- The root `lib/`, `hooks/` and `types/` directories are legacy leftovers, not live app code.

## Reality check

Pre-production. Some services are mock/scaffolded, `apps/automations` is scaffolding,
several `packages/*` have no build or entry point, and test coverage is thin. Stale
root-level report docs were removed in the July 2026 cleanup — consult git history rather
than recreating report-style docs at the root.

## Constraints for AI sessions

- GitHub access is scoped to **`sierrablue8866-droid/SE-Vercel-deploy`** — do not touch
  other repositories.
- `main` is protected. Never commit directly to it, never force-push or delete it.
- All changes: feature branch → push → open a pull request. CI must be green; squash-merge.
- Do not deploy without explicit approval.
- Never place API keys or credentials in code, docs, commit messages, or chat.
  `.env.example` documents ~41 variable names — values live in the platform env stores.
