# Sierra Estates — Repository Cleanup & Cloudflare Migration Report

**Date:** 2026-11-16 · **Baseline commit:** `6ab71c6` — `chore: clean repository structure, migrate config to Cloudflare, and reset baseline` · **Status: LOCAL ONLY — awaiting your explicit approval to force-push**

**Cloudflare account:** signed up with `a.fawzy886619888866@gmail.com` (GitHub email). Follow **`CLOUDFLARE-SETUP-GUIDE.md`** (also in-repo at `docs/deployment/cloudflare-setup.md`) to create the API token, set the two GitHub secrets, and attach `sierra-estates.net` + `admin.sierra-estates.net`.

---

## 1. Root cause of the reported bloat

| Finding | Reality |
| --- | --- |
| "12,000+ commits" | The GitHub repo has **53 commits on main (55 across all refs)**. The 12k+ history exists **only in your local `H:\` clone** (unpushed automation/auto-commits). It never reached GitHub. |
| "Large `.git`" | Remote `.git` = **191 MB**, but pruning old history frees almost nothing: the pack is **~188 MB of *live* blobs** — current site media (`cairo-plaza` renders ≈ 55 MB, 19 MB reel MP4, 13 MB WhatsApp demo video, brochures, PNGs). The reset removes old revisions (e.g. two 6.x MB `snapshot.json` generations) but cannot shrink assets still in use. |

**Recommendation (follow-up):** move `apps/sierra-estates-realty/public/**` media (video + heavy renders) to Cloudflare R2 / Images after the Workers migration; that is the only real size lever.

## 2. Backup (guardrail 1) — done, twice over

1. **Full working-tree copy** (robocopy-equivalent, excluding `node_modules`/`.git`): 4,920 files / ~917 MB.
2. **`Sierra-Estates-full-history-backup-2026-11-16.bundle`** (189 MB, in `download/`) — a git bundle of **all refs and all history**, verified `The bundle records a complete history`. Even after the force-push, the old 53-commit history is fully recoverable from this file. On `H:\`, `Finish-Cleanup-H-Drive.ps1` Phase A additionally creates `H:\Sierra-Estates-Backup-2026`.

## 3. What was deleted vs. archived (guardrails 2 & 3)

**Deleted (14 files — the obsolete Vercel set, all preserved in the bundle/backup):**
`vercel.json` (root + client + easy-listing + admin), `.vercelignore`, `.github/workflows/deploy-vercel.yml`, `deploy-admin-retry.yml`, `telegram-activation-watch.yml`, `scripts/deploy-vercel.sh`, `scripts/cleanup-vercel-deployments.mjs`, `scripts/sync-vercel-env.js`, `scripts/vercel-build.sh`, `scripts/deployment/`, app-level `vercel-build.sh`.

**Archived to `_archive_local/` (gitignored, on disk, never committed):**

| Destination | Contents | Size |
| --- | --- | --- |
| `ai-tooling/` | `.agents` `.claude` `.grok` `.devin` `.continue` `.commandcode` `.kilo` `.amazonq` `.codex` `.amphion` `.hermes`, `agent/`, `GEMINI.md`, `skills-lock.json`, `.clinerules`, `.bruin.yml` | 13 MB |
| `prototypes/` | root `client/` (Arabic recruitment SPA), root `public/` (Blu Landing assets), `vite.config.ts`, `template.json` | 16 MB |
| `loose-modules/` | `shared/`, `server/`, `ops/`, `transport/`, root-legacy `docker-compose.yml` | 1.6 MB |
| `patches-archive/` | `patches/` (xlsx dump, audit report, old fix patches — no `patchedDependencies` existed) | 3.2 MB |
| `tools-dupes/` | easy-listing doc/pipeline dupes | 248 KB |
| `scripts-junk/` | `scripts/.agent*`, `scripts/test-results` | 144 KB |

**Restored after test-pinning audit** (they looked like clutter but are imported by the root vitest suite): `agents/`, `automations/`, `core/`, `prompts/`, `tools/test-stubs/`, `AGENTS.md`, `.vscode/`, `.mcp.json`.

**Zero data loss:** the only tracked data files in git were 2 skill-fixture CSVs + 1 xlsx (all archived). All spreadsheets/dumps you have locally on `H:\` are handled by the companion script (move → `_archive_local/`, never delete).

## 4. New structure (1,359 tracked-file moves)

```
apps/
  sierra-estates-realty/   client portal (NOT renamed — 232 files reference this path;
                           documented deviation from the plan's "apps/client")
  admin/                   ← deploy/ static SPA (outside pnpm workspace, as before)
  easy-listing | agents | automations | whatsapp-bot
packages/                  untouched (16 workspace packages)
automation/                NEW: scripts/ (30 root .bat/.ps1/.vbs + ecosystem.config.cjs),
                           api/ (sierra_master.py, sierra_webhook.py, requirements.txt),
                           whatsapp/ (services/ OpenWA defs)
infra/                     + 3 docker-compose files (root ones)
docs/                      + marketing/ (was announcement/), plans/ (was FUTURE_PLAN/),
                           archive/root-status/ (9 root status MDs), ideas.md
_archive_local/            everything above (gitignored)
```

Configs updated: `vitest.config.mts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, root + client `package.json`, `labeler.yml`, `ci.yml`, `ecosystem.config.cjs` (PM2 paths re-anchored to repo root), `validate-configs.mjs`, README surface table, `DEPLOYMENT.md`, 12 contract-test files (see §5).

## 5. Cloudflare deployment (Vercel removed end-to-end)

| File | Purpose |
| --- | --- |
| `apps/sierra-estates-realty/wrangler.jsonc` | OpenNext Worker: `nodejs_compat`, `.open-next/worker.js`, assets binding, **crons carried over** (morning `45 6 * * *`, night `45 2 * * *`) |
| `apps/sierra-estates-realty/open-next.config.ts` | `defineCloudflareConfig()` (default; R2 incremental cache can be added later) |
| `apps/admin/wrangler.jsonc` | Static-assets Worker (`directory: "."`) for admin.sierra-estates.net |
| `.github/workflows/deploy-cloudflare.yml` | `changes` job (dorny/paths-filter: docs/data edits don't trigger builds) → `deploy-client` (build:cf → deploy:cf, timeout 20) + `deploy-admin` (wrangler deploy, timeout 15); fail-loud on missing `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; `submodules: false` everywhere; serialized concurrency |
| client `package.json` | devDeps `@opennextjs/cloudflare ^1`, `wrangler ^4`; scripts `build:cf` / `preview:cf` / `deploy:cf` |

Contract tests rewritten to pin the new world (Vercel decommissioning assertions, worker configs, workflow contract, cron carry-over, secret hygiene). Functional fixes: WhatsApp bot default API base `vercel.app → sierra-estates.net`, workflow-runner email templates → `sierra-estates.net`, PM2 config, README/DEPLOYMENT surface docs.

**Open items flagged, not invented:** easy-listing app still points at its Vercel URL (needs its own hosting decision); `estimate-costs.ts` updated to Cloudflare; already-applied SQL migrations 012 contain old URLs — fix via DB UPDATE, not by editing applied migration files (checksum ledger).

## 6. `.gitignore` & `.gitattributes` (Phase 5)

- `.gitignore`: added `_archive_local/`, `.open-next/`, `.wrangler/` (the file was already comprehensive: `.env*`, `node_modules/`, `.next/`, `downloads_sheets/`, `*.xlsx`, `*.csv`, `*.log`, `*.sqlite`, WhatsApp session folders, OS temp files).
- `.gitattributes`: `* text=auto eol=lf` global default (CRLF kept only for `*.ps1/*.bat/*.cmd`), binaries marked — prevents Windows CRLF breaking Linux CI.

## 7. History reset & verification (Phase 6)

| Check | Result |
| --- | --- |
| `git rev-list --count HEAD` | **1** (`33b2c2b`) |
| Old branches (`main`@9aa7145, PR branch) | deleted locally; recoverable from bundle |
| reflog + gc `--prune=now --aggressive` | done (incl. remote-tracking refs) |
| `.git` size | 191 MB → **189 MB** — the pack is live media, not dead history (see §1) |
| Tracked files | 4,908 → 4,898 |
| `pnpm install` | ✓ (lockfile regenerated; `@opennextjs/cloudflare 1.20.17` resolved) |
| Type-check (packages / realty / automations) | ✓ / ✓ / ✓ (realty needs `TSC_MAX_OLD_SPACE=2900` on 4 GB hosts — its own adaptive wrapper) |
| Lint (`turbo run lint` + `eslint workflows`) | ✓ 17/17 tasks |
| Root vitest suite | **107/107 files, 1,064 tests passed**, 5 skipped (pre-existing skips) |
| `build:cf` / `next build` | **not verifiable in this sandbox** — the app's own build script requests `--max-old-space-size=6144` (6 GB heap) and the sandbox caps at 4 GB total (exit 137 twice: OpenNext and plain `next build`). GitHub Actions runners (7 GB) build this app fine — CI validates the build after push. Type-check/lint/tests all green locally. |

## 8. HARD STOP — what happens next (your move)

0. **Cloudflare side (account `a.fawzy886619888866@gmail.com`):** follow
   `CLOUDFLARE-SETUP-GUIDE.md` → confirm account, add the `sierra-estates.net`
   zone, create the "Edit Cloudflare Workers" API token, set GitHub secrets
   `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
1. **Do NOT merge PR #69** — superseded (`9aa7145` fixed the same type errors; Vercel work is retired). Close it on GitHub.
2. Download `Sierra-Estates-full-history-backup-2026-11-16.bundle` (keep it — it is the only copy of the old history outside this sandbox).
3. On `H:\`: run `Finish-Cleanup-H-Drive.ps1` (backup → local data archive → junk delete → adopt the clean `main` from the bundle → verify count = 1).
4. **Only after you approve:** `git push -f origin main` — then add the two Cloudflare secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) to the GitHub repo; the next push to `main` deploys client + admin.
