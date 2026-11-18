# Sierra Estates — Recovery & Continuation Plan (2026-11-18)

> Written by the GLM agent session after a full-repo + full-infrastructure audit.
> This file is the durable record of the crisis recovery (Task 1) and the
> milestone plan to finish the platform. Update the status column as items close.

## 0. What was broken and what was fixed today

| # | Problem | Root cause | Fix | Status |
|---|---------|-----------|-----|--------|
| 1 | CI red since Nov 17 (`1,871`-test wall) | Commit `d2b8a45e` added the `owner_feedback` nav item without registering it in `NAV_REQUIRED_PERMISSIONS` (default-deny contract) | `apps/sierra-estates-realty/lib/admin-nav-access.ts` + `campaigns:write` entry | ✅ Fixed (commit `7488e692`) |
| 2 | CI red (CI-only security suite) | `/api/admin/owner-feedback` route had **no authentication guard** and could spawn the registry rebuild via `?refresh=1` unauthenticated | Standard `verifyRequest`/`verifyAdminRequest` `checkAuth` pattern on GET+POST | ✅ Fixed (commit `7ad60c36`) |
| 3 | Deploy pipeline could never run | `secrets.*` context used inside `strategy.matrix` → GitHub rejects workflow at parse time (422) | Project IDs resolved at step level from `projectIdEnv` names | ✅ Fixed (commit `2e39e635`) |
| 4 | No auto-deploy on green main | `workflow_run` trigger had been removed from `deploy-vercel.yml` | Trigger restored (repo is **public** → zero Actions minutes cost); gate stays fail-closed | ✅ Fixed (commit `2e39e635`) |
| 5 | Deploy workflow manually disabled | Disabled during the Nov 16 quota/account-migration episode | Re-enabled via API | ✅ Done |
| 6 | `sierra-estates.net` (apex) does not resolve | **No A/CNAME record exists at the zone apex** (www has one; admin/legacy do not) | Needs Cloudflare: `A @ → 76.76.21.21`, `CNAME admin → cname.vercel-dns.com` | ⛔ Needs real CF API token or dashboard action |
| 7 | `www.sierra-estates.net` → Vercel `DEPLOYMENT_NOT_FOUND` | Production deployments gone since Nov 16 + `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `CLIENT_/ADMIN_VERCEL_PROJECT_ID` **absent from repo secrets** (no workflow declares an `environment:`) | Add the 4 Vercel secrets → next push auto-deploys both projects | ⛔ Needs user-provided Vercel credentials |
| 8 | `Telegram activation watch` failing daily | `TELEGRAM_BOT_TOKEN` secret is stale/revoked | Regenerate from @BotFather → update secret | ⛔ Needs new bot token |
| 9 | `Automations` dispatcher + `production-smoke` failing daily | They probe production URLs that are down (cascade of #6/#7) | Self-heals when the site is live | 🔄 Auto after #6/#7 |
| 10 | Cloudflare Workers Builds `sierra-estates88` + `sierra-estates` failing | CF-side build integration errors (inspected after CF token arrives) | Inspect via CF API | ⛔ Needs real CF API token |

## 1. Milestone plan

| Milestone | Scope | Depends on | Status |
|---|---|---|---|
| **M0 — Site Live & Fleet Self-Heal** | Vercel credentials → deploy → www/admin live; Cloudflare apex+admin DNS; Telegram token rotate; Automations + production-smoke turn green | User: Vercel token + project IDs, CF API token, TG token | 🔴 Blocked on credentials (pipeline armed, one push away) |
| **M1 — Security Hardening (code-only, no credentials)** | Close the §5.5 audit backlog: RLS `client_requests_staff_access` → `public.is_staff()`; auth guards on the ~20 unauthenticated routes (`apps/easy-listing /api/save|extract|generate`, `worker.js /api/pair/reload`, `apps/api/main.py`, `vertex-omni-agent/api.py`, `memory-engine api-router`, `sierra-admin-bridge :2790`, remaining admin/integration routes); remove hardcoded fallback secrets/URLs; retire or wire stubbed handlers; sync `apps/.../supabase/schema.sql` with root schema | none | ⬜ Ready to start (Task 2) |
| **M2 — Database & Migrations** | Apply pending migrations `20261115_048/049` via `deploy-supabase.yml` (uses existing `SUPABASE_ACCESS_TOKEN` secret); run `test:rls`; verify `public_properties_view` PII lock | M1 RLS fix | ⬜ Ready |
| **M3 — Agents, RAG & Harness activation** | Wire `ai-orchestrator` + `deepseek-harness` + `gravity-memory`/`open-memory` + ECC; activate the RAG station compose profile; verify agent-fleet scheduled flow; add fleet health heartbeat to Admin OS | M0 site live (for webhooks) | ⬜ Planned |
| **M4 — M12 Delivery (Voice & Video)** | `M12.1` Egyptian-Arabic audio briefings (Gemini Live); `M12.2` video teaser generator; `M12.3` self-healing telemetry; `M12.4` direct deploy automation (**done today** as a side effect of the pipeline repair) | M0 | ⬜ Planned |
| **M5 — Data & Syndication** | Property Finder live push (`PF_API_KEY/SECRET` exist); Google Sheets 2-way write (`GOOGLE_SERVICE_ACCOUNT_JSON` — free tier option: Apps Script webhook already wired); owner-search with free Google CSE tier (100 q/day); email via Resend free tier (`RESEND_API_KEY` exists) | M0/M1 | ⬜ Planned |
| **M6 — E2E verification & docs** | Refresh `FINAL_ECOSYSTEM_VERIFICATION.md`, README/ARCHITECTURE status tables, recovery-plan close-out | M1-M5 | ⬜ Planned |

## 2. Credential checklist (the ONLY user-side inputs)

1. **Vercel:** `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `CLIENT_VERCEL_PROJECT_ID` + `ADMIN_VERCEL_PROJECT_ID` (Vercel dashboard → Settings → General). Once added as GitHub repo secrets, the very next push to `main` releases both surfaces automatically.
2. **Cloudflare:** the *secret* API token string (the JSON pasted in chat was only the token's policy definition, not the token). Then: apex + admin DNS records, Workers Builds diagnosis, email-routing verification.
3. **Telegram:** new bot token from @BotFather → I can update the repo secret via API.
4. **Optional free-tier APIs** (already keyed in secrets): Gemini, Tavily, Serper, Jina, Resend, n8n, Supabase, GitHub. No additional spend required anywhere.

## 3. Working agreements confirmed today

- Repo is **public** → GitHub-hosted runners are free; push/PR triggers may stay on.
- The deploy gate is fail-closed; `emergency_override` exists but was NOT needed.
- Vercel free tier caps at 100 deploys/day; the workflow's path-filter + quota guard conserve it.
