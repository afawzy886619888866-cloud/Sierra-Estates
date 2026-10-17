# Deployment & Architecture Policy

This file is the single source of truth for Sierra Estates deployment, architecture, and backend workflow. The repo is intentionally aligned around one runtime model:

- Vercel hosts the web surfaces.
- Supabase is the canonical backend for database, auth, storage, and vector/search state.
- Heavy work stays in workers (n8n, Cloud Run, GitHub Actions), never in request handlers.
- Legacy Firebase deployment commands and legacy admin flow are retired and intentionally not part of the active workflow.

---

## 1. Canonical architecture

```text
                         ┌──────────────────────────────────────────────┐
                         │                Vercel (Next.js)               │
                         │  sierra-estates.net   |   admin.sierra-estates.net │
                         │  Public site + admin console, one repo       │
                         └───────────────┬──────────────────────────────┘
                                         │
                                         │ HTTPS / typed client calls
                                         ▼
                    ┌──────────────────────────────────────────────┐
                    │             Supabase (authoritative)          │
                    │ Postgres + Auth + Storage + RLS + pgvector   │
                    │ canonical DB, identity, listing data, media  │
                    └──────────────────────┬───────────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  │                                                 │
                  ▼                                                 ▼
        ┌─────────────────────┐                       ┌────────────────────────────┐
        │ n8n / Docker/VPS    │                       │ apps/api / Cloud Run      │
        │ WhatsApp, scrapers, │                       │ PropertyFinder sync, bot  │
        │ workflow automation │                       │ and integration workers    │
        └─────────────────────┘                       └────────────────────────────┘
                  │                                                 │
                  └──────────────────────────────┬──────────────────┘
                                                 ▼
                                  ┌────────────────────────────┐
                                  │ GitHub Actions / schedules │
                                  │ periodic sync + automation │
                                  └────────────────────────────┘
```

This is the active operating model. The app surfaces stay thin and trigger or monitor workers; the workers do the heavy lifting.

---

## 2. Active deployment matrix

| Component | Path / host | Runtime | Deployment model |
| --- | --- | --- | --- |
| Public site | `apps/sierra-estates-realty` + `sierra-estates.net` | Vercel | GitHub deployment workflow / Vercel project config |
| Admin console | `apps/sierra-estates-realty` + `admin.sierra-estates.net` | Vercel | Separate Vercel project targeting the admin host |
| Canonical backend | Supabase project | Postgres / Auth / Storage / pgvector | Supabase-managed |
| Property sync + API workers | `apps/api` | Cloud Run / Python | Hosted worker service |
| Automation runs | `workflows/`, n8n | Docker/VPS / GitHub Actions | Triggered worker automation |
| Shared libraries | `packages/*` | Monorepo | Built into the consuming app |

Legacy Firebase deployment paths are retired and are not part of the active deployment contract. Any old Firebase deployment command is considered stale unless explicitly reintroduced in a future migration plan.

---

## 3. Backend and workflow policy

1. Supabase is the authoritative backend for database, auth, storage, and embeddings.
2. Public and admin web surfaces are thin front ends; they do not own long-running work.
3. Heavy work runs in worker services: n8n, `apps/api`, GitHub Actions, or scheduled Cloud Run jobs.
4. Every new app or service must declare its host, runtime, and trigger path before it is deployed.
5. Secrets and credentials stay in environment stores, not in source control.
6. No silent fallback to a legacy backend path for write operations. If canonical backend config is absent, fail loudly.

---

## 4. One command set

Use this canonical command set from the repo root. Do not keep stale duplicates in docs or scripts.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test:ci
pnpm check:public-env
pnpm check:backend
pnpm deploy:check
pnpm deploy:supabase
pnpm migrate:supabase
```

**Notes:**

- `pnpm deploy:rules` and `pnpm deploy:functions` are legacy Firebase commands and are intentionally not part of the active workflow.
- `pnpm check:backend` is the canonical guard for Supabase write policy.
- `pnpm deploy:check` validates deployment readiness against the active architecture contract.

---

## 5. Domain and environment rules

- Primary public domain: `sierra-estates.net`
- Admin domain: `admin.sierra-estates.net`
- One codebase, two Vercel surfaces, separate host targets
- Secrets are stored in Vercel, Supabase, and GitHub environment settings; they are never committed
- `NEXT_PUBLIC_*` values remain public-only; service-role keys remain server-only and must not be exposed to the browser

---

## 6. Release flow

1. Create a feature branch from `main`.
2. Run the canonical validation set.
3. Open a PR.
4. Merge to `main` only after checks pass.
5. Deploy through the active Vercel and Supabase workflows.
6. Keep worker automation separate from the request path.

---

## 7. Vercel deployment ownership

Vercel Git deployments are enabled in the root [`vercel.json`](./vercel.json) only.
[`apps/sierra-estates-realty/vercel.json`](./apps/sierra-estates-realty/vercel.json) is a supplementary
app config and must NOT contain `git.deploymentEnabled` — enabling it there creates a rogue third
Vercel project. Both files are validated against the Vercel schema at deploy time, so they must
contain only schema-recognized top-level keys: JSON has no comments, and undocumented keys such as
`$comment` fail the whole deployment before the build even starts.

**Primary deployment path**: The Vercel GitHub integration automatically deploys on every push
to `main`. The `buildCommand` in [`vercel.json`](./vercel.json) chains `bash scripts/ci-preflight.sh`
(9 gates) before `next build`, so every production deployment is gated by the full CI preflight.

**Manual emergency deployment**: Use the [`automations.yml`](./.github/workflows/automations.yml)
`workflow_dispatch` trigger for manual automation runs. Direct Vercel CLI deployments can be done
with `vercel --prod` from the repo root using a `VERCEL_TOKEN` secret.

Required GitHub Secrets / Variables for any manual override:

- Secret: `VERCEL_TOKEN`
- Variables: `VERCEL_ORG_ID`, `CLIENT_VERCEL_PROJECT_ID`, `ADMIN_VERCEL_PROJECT_ID`
- Runtime secrets: `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

The `.vercel/project.json` in the repo root is the primary project binding (`sierra-estates-client-portal`).
The admin surface (`admin.sierra-estates.net`) is configured as a separate Vercel project linked to the same
repository with a distinct `ADMIN_VERCEL_PROJECT_ID`.

---

## 8. Storage boundary

Vercel provides the web runtime only. Property media is stored in the public
Supabase `property-media` bucket through
`apps/sierra-estates-realty/lib/services/StorageService.ts`. The application
does not use Vercel Blob, KV, or Postgres storage packages.

Do not delete or migrate Vercel or Supabase storage resources based only on
repository inspection. Any production resource cleanup requires an
authenticated provider review, an explicit target, and a reversible backup or
recovery plan. The repository intentionally contains no deployment-purge
utility: deleting historical Vercel deployments is a provider-level operation
and must not be bundled into application deployment.nventory, an approved change card, and a rollback plan.

---

## 9. Repository hygiene boundary

Generated directories such as `.next`, `.turbo`, `.vercel`, `dist`,
`node_modules`, coverage output, and local reports are safe to regenerate and
are excluded from deployment or source comparisons. Tracked archives,
`.agents`, `.amphion`, skills, workflows, and operational tooling are not
automatically disposable: they require reference checks before removal.

Run `pnpm check:hygiene` to produce a read-only classification. The command
never deletes files, changes branches, or contacts Vercel/Supabase.

---

## 10. Current-state summary

- The repo is modernized around the Supabase-first architecture.
- The web app is not the place for long-running ingestion or bot work.
- Worker orchestration is handled by dedicated services.
- The docs and scripts should reflect this single architecture; stale Firebase commands are intentionally removed from the active contract.

## Local Excel inventory workflow

Supabase `public.listings` remains the authoritative inventory source. The local workbook is an operational export and must be reviewed before importing changes.

```bash
pnpm inventory:excel:pull
pnpm inventory:excel:push -- --file apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx --dry-run
pnpm inventory:excel:push -- --file apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx
```

The pull command creates `All Listings`, `Available`, `Rentals`, `Sales`, `Needs Review`, and `README` sheets. The push command validates rows and upserts by `reference_code`; it never exposes the service-role key to the browser or workbook. Use `--dry-run` before every production import.

## Worker startup boundaries

Deploying the Next.js application does not start the WhatsApp, Telegram, OpenClaw, Vertex, scraper, or n8n workers. Each worker needs its own runtime environment and process host. The standalone WhatsApp worker has an independent lockfile and must be installed before it is started:

```bash
pnpm whatsapp:bot:install
pnpm whatsapp:bot
```

The inactive `infra/n8n-workflows/02-whatsapp-bot-handler.json` workflow is retained as a historical reference only. It still contains Firebase nodes and must not be activated; use the Supabase-backed TypeScript WhatsApp router instead.
