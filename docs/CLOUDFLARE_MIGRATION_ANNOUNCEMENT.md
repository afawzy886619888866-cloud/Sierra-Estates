# Official Platform Announcement: Cloudflare Workers Unified Production Cutover

**Effective Date:** 2026-11-19  
**Repository:** `afawzy886619888866-cloud/Sierra-Estates`  
**Status:** LIVE & VERIFIED ON CLOUDFLARE GLOBAL EDGE

---

## 1. New Production Deployment Authority (Cloudflare Workers)

All Sierra Estates web surfaces, APIs, and 4-Engine Brain endpoints have completed migration from **Vercel (permanently retired)** to a **single unified Cloudflare Worker** built with `@opennextjs/cloudflare`.

| Parameter | Canonical Value |
| :--- | :--- |
| **Cloudflare Account ID** | `22804b3ba513993444a33357d7bca953` |
| **Authoritative Zone** | `sierra-estates.net` (`e2263fa4159f29a08a8d589d08e9ce8e`) |
| **Nameservers** | `drake.ns.cloudflare.com`, `melody.ns.cloudflare.com` |
| **Single Worker Project** | `sierra-estates` (duplicate `sierra-estates88` deleted; single-project lock enforced in CI) |
| **Public Domains** | `https://sierra-estates.net` (canonical apex, HTTP 200, Full Strict SSL, Always Use HTTPS), `https://www.sierra-estates.net` (Cloudflare Edge `301` redirect &rarr; `https://sierra-estates.net`, query string preserved) |
| **Admin Intelligence OS** | `https://admin.sierra-estates.net` (Next.js host rewrite &rarr; `/admin`, protected by Cloudflare Zero Trust Access) |
| **Database & Storage** | Supabase PostgreSQL + pgvector (`https://gaxfqcietzoonlmatiot.supabase.co` — 26,364+ live properties) |
| **CI/CD Workflow** | `.github/workflows/deploy-cloudflare.yml` (runs after green `CI`, Next.js build cache, no-new-project guardrail) |

---

## 2. Important Notice: Cloudflare Workers Free Plan CPU Limit (Deferred Upgrade)

> [!IMPORTANT]
> Production currently operates on the **Cloudflare Workers Free Plan**, which enforces a **`10 ms` CPU time cap per request**. Because heavy cold-start SSR/cron isolates currently parse a large OpenNext server bundle, occasional cold starts can return Cloudflare `error code: 1102` (CPU time limit exceeded) before warm hits settle cleanly around ~200 ms.

Two complementary mitigations govern this notice:

1. **Active Code Mitigation (In Progress):** Eliminate heavy server cold-start imports inside `apps/sierra-estates-realty` — replacing the 45 MB `googleapis` monolith with `@googleapis/sheets` + `google-auth-library` and replacing static 6.6 MB `snapshot.json` imports with Supabase-first queries.
2. **Deferred Platform Upgrade ($5/month):** When ready for zero-1102 cold-start headroom on global edge traffic and cron bursts, upgrade Account `22804b3ba513993444a33357d7bca953` manually to **Cloudflare Workers Paid ($5/month &rarr; `30,000 ms` CPU limit per request)**. Billing changes are never applied automatically by CI.

---

## 3. Retired Platforms & Migration Actions Completed

- **Vercel Permanently Retired:**
  - Removed legacy `www.sierra-estates.net` Vercel CNAME (`8ee057028fefddb5.vercel-dns-017.com`) and bound `www.sierra-estates.net` directly to Worker `sierra-estates`.
  - Disabled `deploy-vercel.yml` and `deploy-admin-retry.yml` on GitHub Actions.
  - Migrated `telegram-activation-watch.yml` to dispatch `deploy-cloudflare.yml`.
  - Disabled `vercel` MCP in Antigravity and removed `VERCEL_*` keys from OpenClaw `.env`.
- **Repository Deduplication & Hygiene:**
  - Removed throwaway `my-next-app/` starter scaffold and obsolete Dependabot branch.
  - Archived untracked duplicate folders (`sierra-estates/`, `sierra-estates.worktrees/`, `staging/`) out of the workspace to `I:\c files\2\sierra-repo-duplicates-archive\`.
  - Resolved all 33 markdownlint, 17 cSpell, CSS purity, and HTML viewport warnings (`0` IDE problems).

---

## 4. Wired 4-Engine Brain & OpenClaw v3.0 Architecture

- **Engine 1 (Memory):** Obsidian Vault + ECC Memory Engine + OpenClaw episodic ledger (`C:\Users\Sierr\.openclaw\memory\episodic.jsonl`) + Amphion Command Deck memory (`/api/memory/events`).
- **Engine 2 (RAG & GIS):** Supabase `listings` / `real_available_units` + pgvector + New Cairo GIS masterplan (`4,440+` fast-snapshot + `26,364` live DB properties).
- **Engine 3 (Valuation & Harness):** Cairo AVM + DeepSeek Harness + Gemini `2.5-flash` (`/api/openclaw-terminal`) + privacy/rent-ceiling invariant gates (`01092048333` helpline lock).
- **Engine 4 (Workflows & Closer):** OpenClaw MCP bridge (`scripts/openclaw-mcp-server.mjs`, **62 skills** + `SOUL.md` executive twin) + local daemons (`:2785` OpenWA, `:2786` Workflow Runner, `:2790` Admin Bridge, `:5678` n8n, `:8000` Sierra Webhook).

---

## 4. Unified Sync Command (Credentials, Cloudflare Secrets & Project Memory)

Run from PowerShell in `H:\Sierra Estates`:

```powershell
.\scripts\sync-sierra-cloudflare-and-memory.ps1
```

This zero-exposure script optionally prompts with masked input for a fresh BotFather `TELEGRAM_BOT_TOKEN`, syncs all production secrets to GitHub Secrets and Cloudflare Worker `sierra-estates`, broadcasts this Cloudflare platform state to OpenClaw + Obsidian + Command Deck memory, mirrors OpenClaw skills to `PCMClawUbuntu` when running, and smoke-tests all live production endpoints.
