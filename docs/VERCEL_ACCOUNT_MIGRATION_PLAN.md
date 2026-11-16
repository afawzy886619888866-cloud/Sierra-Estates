# Sierra Estates — Optimal Deployment Architecture & Vercel Account Migration Plan

> **Revision note (2026-11-16).** This version supersedes the earlier draft plan. It is aligned with
> the audited repository state: the CI-gated `deploy-vercel.yml` contract pinned by
> `__tests__/deployment.test.ts` and `__tests__/actions-and-workflows.test.ts`, the two live Vercel
> projects (`sierra-estates-client-portal`, `sierra-estates-admin-page`), `scripts/sync-vercel-env.js`
> as the canonical environment-variable source, and the quota-protection incidents of 2026-11-12/13
> documented in `DEPLOYMENT.md` and `deploy-admin-retry.yml`.

## 1. Best Deployment Hierarchy (4-Tier Performance & Isolation)

To get maximum speed for Cairo/New Cairo buyers, zero cold-start failures on WhatsApp/ML, and zero
Vercel rate-limit blocks, split the system by **workload type**:

| Tier | Component | Hosting & Domain | Why Here (Performance & Cost) |
| :--- | :--- | :--- | :--- |
| **Tier 1: Public Edge** | `apps/sierra-estates-realty` (Next.js 16.4, pnpm name `sierra-estates-client-page`) | **Vercel Project 1** `sierra-estates-client-portal` (`sierra-estates.net`) | Global Edge CDN + ISR for listings; Leaflet lazy-loaded; reads only `public_properties_view` (zero owner PII). Root `vercel.json` already carries `regions: ["fra1"]`, the `scripts/vercel-build.sh` build command, `pnpm install`, and the morning/night dispatch crons. |
| **Tier 2: Private Admin** | Same Next.js codebase (`apps/sierra-estates-realty`) deployed as a **separate Vercel project** | **Vercel Project 2** `sierra-estates-admin-page` (`admin.sierra-estates.net`) | Isolated bundle & Supabase Auth (`super_admin` / `agent`); admin charts never bloat public buyer pages. The static SPA in `deploy/` is the **fallback portal** (`legacy.sierra-estates.net`), not the primary admin. |
| **Tier 3: Stateful Workers & ML** | `apps/api` (FastAPI + LightGBM + Gemini), `workflows/runner.js` (PM2), `whatsapp-multi-session` (OpenWA), `n8n` | **AWS Lightsail 4GB Docker + Caddy** (`api.sierra-estates.net`, `n8n.sierra-estates.net`) or local always-on host via PM2 | Persistent TCP sockets for 8 WhatsApp lines; no 10s–60s serverless timeouts for LightGBM training; automatic HTTPS via Caddy. |
| **Tier 4: Source of Truth** | PostgreSQL + Auth + Storage (`unit-photos/*.webp`) | **Supabase (EU — Frankfurt/London)** + **Google Sheets (`Code.gs`)** | Lowest latency to Egypt; `version_id` optimistic locking prevents Sheets/Excel from overwriting newer DB edits. |

Tier 3 and Tier 4 are **out of scope for the Vercel account migration** — they keep running
unchanged; only the two front-end Vercel projects move.

### Performance rules actually in place (the quota-protection stack)

1. **Vercel-side guard — Ignored Build Step.** Both projects set
   *Settings → Git → Ignored Build Step* to `scripts/vercel-ignore-build.sh` with a per-project
   role argument (commands in Step 1 below). The script exits `0` to skip and anything else to
   build (Vercel semantics), fails **open** on any ambiguity, diffs against
   `VERCEL_GIT_PREVIOUS_SHA` (the last *successful* deployment of that project/branch — so nothing
   pushed since the last green deploy can be silently skipped), and falls back safely inside
   Vercel's `--depth=10` shallow clone. It requires **Enable access to System Environment
   Variables** on the project.
2. **GitHub Actions-side guard — CI-gated deploys.** `.github/workflows/deploy-vercel.yml` runs
   only after a green `ci.yml` on `main` (or an audited `emergency_override`), deploys client and
   admin sequentially (`max-parallel: 1`, `timeout-minutes: 20`), skips roles whose changed files
   are irrelevant to them, retries with 429 backoff, and halts cleanly when the free-tier daily
   quota (`api-deployments-free-per-day`) is exhausted. `deploy-admin-retry.yml` self-heals
   quota-window misses daily at 05:12 UTC until both projects match `main` HEAD.
3. **Env changes never burn deploy quota.** Re-syncing variables (including during the migration)
   uses the workflow's `env_sync_only` dispatch input — a pure env PATCH, not a deployment.
4. **Image optimization.** `workflows/03-media-harvester` converts WhatsApp photos to WebP
   (1920px max) into Supabase Storage (`unit-photos/{unit_id}/{index}.webp`) so Next.js `<Image>`
   loads fast on Egyptian 4G.
5. **Database proximity.** Supabase stays in **EU (eu-central-1 / eu-west-2)** and Function Region
   stays **`fra1`** — already configured in both `vercel.json` files (~45–65ms RTT to Cairo).

---

## 2. Zero-Downtime Vercel Account Migration Plan

Execute in this exact order so `sierra-estates.net` and `admin.sierra-estates.net` never go down.
The target account is switched **purely by repository configuration** — no code change at cutover.

### Step 0 — Preconditions

1. `git tag pre-vercel-migration-$(date +%F)` and push the tag (rollback anchor).
2. Confirm `ci.yml` is green on latest `main`.
3. Read `DEPLOYMENT.md` §2–3. Do **not** bypass the deployment test contracts: `max-parallel: 1`,
   the CI gate, the env re-sync step, fail-loud credentials, Node 22 + pnpm, and the absence of
   Firebase references are all pinned by tests and will fail CI if removed.

### Step 1 — Prepare the New Vercel Account (Before Touching DNS)

1. **Project 1 `sierra-estates-client-portal`** — import `afawzy886619888866-cloud/Sierra-Estates`:
   - **Root Directory:** leave empty (repository root). The root `vercel.json` supplies
     `buildCommand: bash scripts/vercel-build.sh`, `installCommand: pnpm install`, `regions: [fra1]`
     and the crons. *(Do not set Root Directory to `apps/sierra-estates-realty`: the build script
     runs repo-root snapshot syncs and the draft's `pnpm turbo run build
     --filter=sierra-estates-realty` would fail — the pnpm package name is
     `sierra-estates-client-page`.)*
   - **Framework:** Next.js (auto-detected).
   - **Ignored Build Step:** `bash scripts/vercel-ignore-build.sh client`
   - **Enable access to System Environment Variables:** ON (required by the script's
     `VERCEL_GIT_*` inputs).
2. **Project 2 admin** — same repository import:
   - Admin serves the same Next.js codebase today: keep **Root Directory** empty and set
     **Ignored Build Step** to `bash scripts/vercel-ignore-build.sh admin` (the `admin` role builds
     on client inputs **plus** `deploy/**` — a deliberate superset so the admin can never go stale
     whichever root directory it uses).
   - If you deliberately re-point admin at the static fallback SPA instead: **Root Directory**
     `deploy`, Ignored Build Step `bash ../scripts/vercel-ignore-build.sh admin` (the command runs
     *inside* the project's Root Directory; a purely static project may use the `static` role).
   - Do **not** Git-connect `deploy/` as a third project unless you intend to revive
     `legacy.sierra-estates.net` (repo warning: nested Git configs can spawn unauthorized projects).
3. **Environment variables — do not hand-copy.** `scripts/sync-vercel-env.js` is canonical
   (`CLIENT_ENV_VARS` / `ADMIN_ENV_VARS`: Supabase URL + publishable/anon + service-role keys,
   routing URLs, cookie domain, AI/LLM keys, Property Finder + AWS, security secrets, Telegram
   role lanes, WhatsApp tokens, media buckets). Push them after Step 2, either by dispatching
   `deploy-vercel.yml` with **`env_sync_only = true`** or locally:
   ```bash
   VERCEL_TOKEN=<new-account-token> VERCEL_ORG_ID=<new-team-id> \
   CLIENT_VERCEL_PROJECT_ID=<new-client-prj> ADMIN_VERCEL_PROJECT_ID=<new-admin-prj> \
   node scripts/sync-vercel-env.js
   ```
   *(The earlier draft's manual list was incomplete — it omitted `SENDGRID_API_KEY`,
   `AWS_SECRET_ACCESS_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_API_KEY`, the Telegram
   role-lane chats, WABA numbers and the Supabase media buckets.)*
4. **Preview validation on `*.vercel.app`:** verify `/`, `/listings`, `/request`, `/ar/request`,
   `/list-property`, and the canaries `/api/health` + `/api/inventory` (the 2026-11-12 incident was
   production silently losing `NEXT_PUBLIC_SUPABASE_URL`; health + inventory catch exactly that).

### Step 2 — Update GitHub Repository Configuration

In **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `VERCEL_TOKEN` | Token from the **new** Vercel account |
| Secret | `VERCEL_ORG_ID` | Team ID of the **new** account |
| Variable | `CLIENT_VERCEL_PROJECT_ID` | New Project 1 ID (`prj_…`) |
| Variable | `ADMIN_VERCEL_PROJECT_ID` | New Project 2 ID (`prj_…`) |

The workflow reads all four with fallbacks to the current account, so setting them flips deploys
**and** the post-deploy env re-sync to the new projects atomically on the next green run — no
workflow edits needed.

### Step 3 — Atomic Domain Cutover (~2 Minutes)

1. In the **old** account, remove `sierra-estates.net` (+ `www`) and `admin.sierra-estates.net`.
2. Immediately add them in the **new** account: `sierra-estates.net` (+ `www`) → Project 1;
   `admin.sierra-estates.net` → Project 2. If Vercel requests DNS records, use what the dashboard
   shows — typically `A 76.76.21.21` on the apex and `CNAME cname.vercel-dns.com` on
   `www`/`admin`, TTL 300s.
3. **Rollback:** the domains were only removed from the old account's projects, not deleted —
   re-adding them there rolls back in minutes. Keep the old account intact for at least a week.

### Step 4 — Disconnect the Old Vercel Account & Verify Webhooks

1. In the **old** account, disconnect the GitHub repository (*Settings → Git → Disconnect*) so
   pushes stop creating duplicate/queued deployments there.
2. Verify every webhook points at the production domains — never an old `*.vercel.app` URL or a
   tunnel: Telegram bot webhook, Property Finder webhooks, and the Google Sheets `Code.gs`
   triggers (`https://sierra-estates.net/api/...`).
3. Watch the next push to `main` end-to-end: `ci.yml` → `deploy-vercel.yml` → both projects on the
   **new** account, env re-sync green, and `deploy-admin-retry.yml` disabling itself once both
   live builds match `main` HEAD.

---

## 3. What Changed vs the Earlier Draft (Audit List)

1. **The draft workflow was not swapped in — its good ideas were merged into the CI-gated
   workflow.** The draft would have failed pinned test contracts (`max-parallel: 1`,
   `timeout-minutes: 20`, the `gate:` job, 429 backoff, env-var sync categories, fail-loud
   credentials) and silently dropped the env re-sync step that fixed the 2026-11-12 production
   incident (`NEXT_PUBLIC_SUPABASE_URL` lost).
2. **`paths-ignore` on push replaced by a role-aware skip.** The live workflow is triggered by
   `workflow_run` (after CI), where push-path filters do not apply; the per-role changed-file check
   inside the deploy job (mirroring `scripts/vercel-ignore-build.sh`) achieves the same quota
   protection, and `env_sync_only` covers non-deploy changes.
3. **Draft's local `pull → build → deploy --prebuilt` flow removed** in favour of the existing
   remote-build deploy — the draft's runner lacked Node 22/pnpm setup that a local `vercel build`
   requires, and building twice (runner + Vercel) burns build minutes.
4. **Ignored-build script fixed:** wrong env name (`VERCEL_GIT_PREVIOUS_COMMIT_SHA` →
   `VERCEL_GIT_PREVIOUS_SHA`); `VERCEL_PROJECT_NAME` no longer load-bearing (explicit role
   argument, name match only as fallback); admin patterns corrected (admin builds on the Next.js
   codebase + `deploy/**`, not on `apps/easy-listing/**`); explicit fail-open semantics; shallow
   clone and first-deploy cases handled; cwd-agnostic for `Root Directory = deploy`.
5. **Plan corrections:** client Root Directory is the repository root (build filter
   `sierra-estates-client-page`, not `sierra-estates-realty`); admin = Next.js project (the
   `deploy/` SPA is the legacy fallback); environment migration runs through
   `scripts/sync-vercel-env.js` instead of a partial manual list; `fra1` is already configured in
   both `vercel.json` files; Tier 3/4 explicitly out of scope.
