# Sierra Estates — Deployment Revision Notes (2026-11-16)

Repo: `afawzy886619888866-cloud/Sierra-Estates` · Branch: `chore/vercel-deploy-migration-revision`
Commit: `6dd3574` — 3 files changed, +330 / −5.

## What was delivered

| Upload | Revised to (in repo) | Status |
| --- | --- | --- |
| `vercel_ignore_build (2).bash` | `scripts/vercel-ignore-build.sh` (new) | ✅ revised & applied |
| `deploy-vercel (1).yml` | merged into existing `.github/workflows/deploy-vercel.yml` | ✅ revised & applied |
| `deployment_architecture_and_migration_plan (2).md` | `docs/VERCEL_ACCOUNT_MIGRATION_PLAN.md` (new) | ✅ revised & applied |

## 1. Ignore-build script — what changed and why

| Draft bug | Fix |
| --- | --- |
| Relied on `VERCEL_GIT_PREVIOUS_COMMIT_SHA` — not a real Vercel variable | Uses `VERCEL_GIT_PREVIOUS_SHA` ("SHA of the last successful deployment", only exposed when an Ignored Build Step is set — verified against Vercel docs) with `HEAD^` fallback |
| Diffs only `HEAD^ HEAD` — misses everything pushed since the last deploy | Diffs against the last *successful* deployment of that project/branch, so a batch push after a failed deploy can't skip builds |
| `VERCEL_PROJECT_NAME` fuzzy match was the only project isolation — and it's only set when "Enable access to System Environment Variables" is ON | Explicit role argument first (`client` / `admin` / `static`), `DEPLOY_ROLE` env second, project-name match third; unknown → **fail-open** (build proceeds, never ships stale code) |
| Admin pattern included `apps/easy-listing/` but missed the real inputs | Roles mirror the actual build: `client` = `apps/sierra-estates-realty` + workspace `packages/` + `patches/` (pnpm patched deps) + root build config consumed by `scripts/vercel-build.sh`; `admin` = superset incl. `deploy/`; `static` = `deploy/` only |
| No handling for Vercel's `--depth=10` shallow clone or first deployments | Unreachable previous SHA / empty diff / no previous SHA all → proceed (fail-open) |
| Command assumed to run at repo root | Script re-anchors via `git rev-parse --show-toplevel` — works when the project Root Directory is `deploy/` (the Ignored Build Step runs *inside* the Root Directory per Vercel docs) |
| No escape hatch | `FORCE_BUILD=1` always proceeds |

Vercel semantics confirmed from docs: **exit 0 = skip build, exit ≥1 = build**; set per project in *Settings → Git → Ignored Build Step*:
- client (Root Directory = repo root): `bash scripts/vercel-ignore-build.sh client`
- admin (Next.js, root = repo root): `bash scripts/vercel-ignore-build.sh admin`
- admin (if Root Directory = `deploy`): `bash ../scripts/vercel-ignore-build.sh admin`

**Tested:** 21/21 scenarios pass (`docs`-only commit → skip for all roles, role inference, FORCE_BUILD, first deploy, unreachable SHA, path-pattern matrix incl. `packages/`, `patches/`, `deploy/`, `docs/`, `workflows/`, `apps/api/`, `.github/`, `supabase/` → skip).

## 2. Deploy workflow — why it was merged, not replaced

Your draft workflow would have **broken 6+ contracts pinned by `__tests__/deployment.test.ts`** (which runs in CI): no `max-parallel: 1`, no `timeout-minutes: 20`, no `gate:` job with `gh run list --workflow=ci.yml`, no 429/`Rate limited`/`sleep` backoff, no fail-loud credential error strings, and no env re-sync categories. It would also have silently dropped the env re-sync step that fixed the 2026-11-12 production incident (`NEXT_PUBLIC_SUPABASE_URL` lost).

**Adopted from your draft:** project IDs overridable via repo *Variables* `CLIENT_VERCEL_PROJECT_ID` / `ADMIN_VERCEL_PROJECT_ID` (with `<CLIENT_VERCEL_PROJECT_ID>` / `<ADMIN_VERCEL_PROJECT_ID>` historically used before legacy account removal); `VERCEL_ORG_ID` secret override; migration documentation in the header.

**Dropped from your draft:** push-trigger + `paths-ignore` (the live workflow triggers via `workflow_run` after CI, where path filters don't apply — the role-aware changed-file skip inside the deploy job provides the same quota protection); `detect-changes` job; local `pull → build → deploy --prebuilt` (requires Node 22/pnpm setup steps the draft lacked, and double-builds; the existing remote-build deploy stays).

**Also fixed:** the env re-sync step now receives `CLIENT_/ADMIN_VERCEL_PROJECT_ID` + `VERCEL_ORG_ID` — `sync-vercel-env.js` syncs **both** projects on every run (its `--role` arg is informational only), so during migration the re-sync must target the new projects/org, not silently fall back to the legacy team.

**Verified:** 74/74 automated checks — YAML parses, every pinned contract string present/absent, migration wiring correct.

## 3. Migration plan — key corrections

- **Project 1:** Root Directory = repository root (not `apps/sierra-estates-realty`); build comes from root `vercel.json` → `bash scripts/vercel-build.sh`; the pnpm filter is `sierra-estates-client-page` (the draft's `--filter=sierra-estates-realty` doesn't exist). `fra1` is already configured in both `vercel.json` files.
- **Project 2 (admin):** serves the same Next.js codebase today (per the workflow, `DEPLOYMENT.md`, and `sync-vercel-env.js`); the static `deploy/` SPA is the legacy fallback portal. The ignore-step covers both arrangements.
- **Env migration:** through `scripts/sync-vercel-env.js` (canonical `CLIENT_ENV_VARS`/`ADMIN_ENV_VARS`) or the workflow's `env_sync_only` dispatch — the draft's manual list was incomplete (missing `SENDGRID_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_API_KEY`, Telegram role lanes, WABA numbers, media buckets).
- Added: Step 0 preconditions + tag rollback anchor, preview canaries `/api/health` + `/api/inventory`, domain-cutover rollback, webhook inventory (Telegram / Property Finder / `Code.gs`), and an explicit audit list of everything that changed vs your draft.

## How to apply

```bash
cd Sierra-Estates
git checkout main
git apply Sierra-Estates-vercel-revision.patch   # or: git fetch && git merge chore/vercel-deploy-migration-revision
git push
```

I can't push to GitHub from this sandbox, so the patch + revised files are delivered here; nothing was pushed. After pushing: set the two GitHub *Variables* and two *Secrets* when the new account is ready (table in the plan, Step 2), and set the per-project Ignored Build Step commands in the Vercel dashboards.
