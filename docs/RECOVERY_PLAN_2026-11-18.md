# Sierra Estates — Recovery & Continuation Plan (2026-11-18)

> Written by the GLM agent session after a full-repo + full-infrastructure audit.
> This file is the durable record of the crisis recovery (Task 1) and the
> milestone plan to finish the platform. Update the status column as items close.
>
> **HOSTING PIVOT (Nov 18, owner decision):** production surfaces now run on
> **Cloudflare Workers** (`@opennextjs/cloudflare`), not Vercel. The Vercel
> deploy workflow is disabled; `.github/workflows/deploy-cloudflare.yml` is
> the active release pipeline (same fail-closed CI gate pattern).

## 0. What was broken and what was fixed today

| # | Problem | Root cause | Fix | Status |
|---|---------|-----------|-----|--------|
| 1 | CI red since Nov 17 (`1,871`-test wall) | Commit `d2b8a45e` added the `owner_feedback` nav item without registering it in `NAV_REQUIRED_PERMISSIONS` (default-deny contract) | `apps/sierra-estates-realty/lib/admin-nav-access.ts` + `campaigns:write` entry | ✅ Fixed (commit `7488e692`) |
| 2 | CI red (CI-only security suite) | `/api/admin/owner-feedback` route had **no authentication guard** and could spawn the registry rebuild via `?refresh=1` unauthenticated | Standard `verifyRequest`/`verifyAdminRequest` `checkAuth` pattern on GET+POST | ✅ Fixed (commit `7ad60c36`) |
| 3 | Deploy pipeline could never run | `secrets.*` context used inside `strategy.matrix` → GitHub rejects workflow at parse time (422) | Project IDs resolved at step level from `projectIdEnv` names | ✅ Fixed (commit `2e39e635`) |
| 4 | No auto-deploy on green main | `workflow_run` trigger had been removed from `deploy-vercel.yml` | Trigger restored (repo is **public** → zero Actions minutes cost); gate stays fail-closed | ✅ Fixed (commit `2e39e635`) |
| 5 | Deploy workflow manually disabled | Disabled during the Nov 16 quota/account-migration episode | Re-enabled via API | ✅ Done |
| 6 | `sierra-estates.net` (apex) does not resolve | **No A/CNAME record exists at the zone apex** (www has one; admin/legacy do not) | Superseded by the Workers pivot: **Worker Custom Domains auto-create the DNS records** — attach `sierra-estates.net` + `admin.sierra-estates.net` to the two workers (deploy workflow does it via API, or one dashboard click each) | 🔄 Auto via deploy-cloudflare.yml |
| 7 | `www.sierra-estates.net` → Vercel `DEPLOYMENT_NOT_FOUND` | Vercel path retired with the hosting pivot (its deploy workflow is disabled via API, reversible) | None — obsolete once Workers serve apex + admin | ✅ Moot (pivot) |
| 8 | `Telegram activation watch` failing daily | `TELEGRAM_BOT_TOKEN` secret is stale/revoked | Regenerate from @BotFather → update secret | ⛔ Needs new bot token |
| 9 | `Automations` dispatcher + `production-smoke` failing daily | They probe production URLs that are down (cascade of #6) | Self-heals when the site is live | 🔄 Auto after #6 |
| 10 | Cloudflare Workers Builds `sierra-estates88` + `sierra-estates` failing | The CF-side Git integration had no Cloudflare adapter wiring in the repo (no wrangler config / OpenNext) | Repo now ships `apps/sierra-estates-realty/{open-next.config.ts, wrangler.jsonc}` + adapter deps; repo-driven `deploy-cloudflare.yml` replaces Workers Builds as the release path — pause the Workers Builds connection in the dashboard, or set its build command to `apps/sierra-estates-realty`: `node scripts/ensure-snapshot.mjs && next build --webpack && opennextjs-cloudflare build --skipNextBuild` | 🔄 Superseded by deploy-cloudflare.yml |

## 1. Milestone plan

| Milestone | Scope | Depends on | Status |
|---|---|---|---|
| **M0 — Site Live on Cloudflare & Fleet Self-Heal** | Add `CLOUDFLARE_API_TOKEN` repo secret → push → `deploy-cloudflare.yml` builds OpenNext artifacts (CI already smoke-tests the transform), deploys `sierra-estates` (client) + `sierra-estates88` (admin), bulk-syncs runtime secrets, attaches custom domains (auto-DNS); Telegram token rotate; Automations + production-smoke turn green | User: one CF API token + one TG token | 🟡 Pipeline fully wired + locally validated — blocked ONLY on the token secret |
| **M1 — Security Hardening (code-only, no credentials)** | Close the §5.5 audit backlog: RLS `client_requests_staff_access` → `public.is_staff()`; auth guards on unauthenticated routes; remove hardcoded fallback secrets/URLs; retire or wire stubbed handlers; sync schema mirrors | none | ✅ Done (Task 2, commit `83e74bc0`, 2026-11-18): 57 main-app routes guarded (8 admin via secret-key-or-session, 36 service via verifyRequest, 13 mutation handlers; esbuild-verified); verified already-closed: RLS 046 uses `public.is_staff()` (mirrors in sync), easy-listing save/extract/generate (`x-sbr-secret-key`), worker.js pair/reload (global checkAuth in prod), all Python/TS service backends (fail-closed service keys), no hardcoded keys/JWTs. 8 direct-handler test files aligned via `x-sbr-secret-key` + `setup.ts`. Deferred to Task 3: MCP OAuth `register` protocol review, easy-listing `settings/test` probe (regex-confined to script.google.com), `?key=` query-param auth in worker.js (log-leak risk), rate-limiting for public AI surfaces (`/api/chat`, `search/semantic`) |
| **M2 — Database & Migrations** | Apply pending migrations `20261115_048/049` via `deploy-supabase.yml` (uses existing `SUPABASE_ACCESS_TOKEN` secret); run `test:rls`; verify `public_properties_view` PII lock | M1 RLS fix | ⬜ Ready |
| **M3 — Agents, RAG & Harness activation** | Wire `ai-orchestrator` + `deepseek-harness` + `gravity-memory`/`open-memory` + ECC; activate the RAG station compose profile; verify agent-fleet scheduled flow; add fleet health heartbeat to Admin OS | M0 site live (for webhooks) | ⬜ Planned |
| **M4 — M12 Delivery (Voice & Video)** | `M12.1` Egyptian-Arabic audio briefings (Gemini Live); `M12.2` video teaser generator; `M12.3` self-healing telemetry; `M12.4` direct deploy automation (**done today** as a side effect of the pipeline repair) | M0 | ⬜ Planned |
| **M5 — Data & Syndication** | Property Finder live push (`PF_API_KEY/SECRET` exist); Google Sheets 2-way write (`GOOGLE_SERVICE_ACCOUNT_JSON` — free tier option: Apps Script webhook already wired); owner-search with free Google CSE tier (100 q/day); email via Resend free tier (`RESEND_API_KEY` exists) | M0/M1 | ⬜ Planned |
| **M6 — E2E verification & docs** | Refresh `FINAL_ECOSYSTEM_VERIFICATION.md`, README/ARCHITECTURE status tables, recovery-plan close-out | M1-M5 | ⬜ Planned |

## 2. Credential checklist (the ONLY user-side inputs)

1. **Cloudflare:** ONE repo secret — `CLOUDFLARE_API_TOKEN` (Cloudflare dash → My Profile → API Tokens → Create Token; permissions: `Workers Scripts:Edit` on the account + `Zone DNS:Edit` on `sierra-estates.net`; account `22804b3ba513993444a33357d7bca953`). Add it in GitHub → Settings → Secrets and variables → Actions (or paste it here and I'll add it via API). The very next push to `main` then releases both workers AND auto-creates the apex/admin DNS records.
2. **Telegram:** new bot token from @BotFather → I can update the repo secret via API.
3. **Optional free-tier APIs** (already keyed in secrets): Gemini, Tavily, Serper, Jina, Resend, n8n, Supabase, GitHub. No additional spend required anywhere. Vercel credentials are NOT needed anymore (retired path).

## 3. Hosting contract (Cloudflare, since Nov 18)

- Repo is **public** → GitHub-hosted runners are free; push/PR triggers stay on.
- Release path: push to `main` → CI (type-check, lint, 1,871 tests, root vitest, Next build, **OpenNext transform smoke**) → `deploy-cloudflare.yml` (workflow_run gate, fail-closed) → `wrangler deploy` per role + `wrangler secret bulk` + custom-domain attach.
- Worker ↔ surface mapping (rename in the workflow matrix if swapped): client portal → `sierra-estates` @ `sierra-estates.net`; admin OS → `sierra-estates88` @ `admin.sierra-estates.net`.
- The old Vercel pipeline (`deploy-vercel.yml`) is disabled, not deleted — revert by re-enabling it if the pivot is undone.
