# REPO CLEANUP & MAINTENANCE NOTICE

> **Status: ACTIVE — read before adding migrations, deleting files, or creating branches.**
> Last updated: 2026-09-29 · Applies to `main` @ `a706a947` · Both Vercel projects verified READY.

---

## 1. What was done (completed cleanup, in order)

| Commit | Action | Result |
|---|---|---|
| `6def83e0` | Merged all 14 dependabot branches + agents/* + main-1 into `main`; restored typescript-tooling catalog; regenerated `pnpm-lock.yaml` (pnpm 9.15.4) | 0 unmerged branches |
| `6ec9f0a5` | Removed AI tooling artifacts: `tools/claude-proxy` (13MB/651 files), `.amphion` (4.1MB), UUID-named dirs; extended `.vercelignore` (original rules preserved + new rules appended only) | Repo 227MB → ~210MB; ~36MB less per deploy upload |
| `9206f320` | Owner's data-audit pipeline (fast-forwarded, kept TSV inputs + root `supabase/schema.sql` — both referenced by tests/scripts) | — |
| `82827c24` | Consolidated migrations to canonical root `supabase/migrations/` (5 files); removed unreferenced legacy root `tailwind.config.ts` / `postcss.config.mjs` | Single source of truth |
| `fb6c1e75` + `a706a947` | **Build fix** — force-tracked all 5 app-dir migration copies (`git add -f`); documented the add-both rule in `.gitignore` | Deterministic builds, turbo replay safe |
| Vercel side | Pruned ~130 old deployments across both projects (kept newest per project) | Storage freed |

**Deleted remote branches:** all 18 (14 dependabot + 3 agents/* + main-1). `origin` now has **only `main`**.

---

## 2. ⚠️ CRITICAL RULE — adding a Supabase migration (add-both)

This rule exists because breaking it **breaks Vercel production builds** (it already happened twice — ENOENT from turbo remote-cache replay lstat).

```bash
# 1. Canonical copy (source of truth):
supabase/migrations/<name>.sql

# 2. Force-tracked app copy (turbo replay needs this exact path):
git add -f apps/sierra-estates-realty/supabase/migrations/<name>.sql

# 3. Commit BOTH together.
```

**Never** commit other files under `apps/sierra-estates-realty/supabase/` — that directory is gitignored because the prebuild step mirrors root `supabase/migrations/` into it at every build. Only migration files inside it are force-tracked exceptions.

**If a build fails with `ENOENT … supabase/migrations/…`:** the file at that exact path is missing from the commit. Either restore it (`git add -f`) or purge the turbo remote cache entry. Do not just retry the build — replay will fail again.

---

## 3. ⏳ PENDING — awaiting owner decision (NOT deleted)

These are product content, so they were flagged only. Say the word and they get removed:

| Item | Size | Why flagged | Risk of deletion |
|---|---|---|---|
| `apps/sierra-estates-realty/public/cairo-plaza/` | **122MB** (incl. `cairo-plaza-commercial-reel-2026.mp4` 20MB) | Large media committed to git; bloats clone + deploy upload | If any page/DB record links to `/cairo-plaza/...` assets, they 404 — verify first |
| `apps/sierra-estates-realty/public/feeds/propertyfinder-all-units.xml` | 15MB | **Zero code references** — written by feed scripts but never read at runtime | None in code; only PropertyFinder pulls it if configured externally — confirm before deleting |
| `apps/sierra-estates-realty/public/feeds/propertyfinder-owners-full.xml` | 15MB | Zero code references (same as above) | Same as above |
| `apps/sierra-estates-realty/public/feeds/propertyfinder-photos-only.xml` | 34KB | Only consumed by `scripts/publish-all-owners-to-propertyfinder.mjs` | Low — regenerate anytime via that script |

**Keep:** `propertyfinder-feed.xml` — it IS referenced at runtime: API fallback in `app/api/feeds/property-finder/route.ts` (both cwd and app-dir paths) and linked from `AdminPortal.tsx` ("Static XML").

> Alternative to deletion: move the three unreferenced XMLs (45MB) and the MP4 to external storage (Vercel Blob / R2) — git history stays slim and URLs keep working.

---

## 4. 🚫 DO NOT DELETE — looks like junk, is load-bearing

Verified and intentionally kept during cleanup:

- **`workflows/` (root)** — n8n automation definitions, not stale GitHub Actions duplicates.
- **`whatsapp-bot/package-lock.json`** — standalone npm project, required for its installs.
- **`docs/secrets.md`** — template only, no real credentials.
- **Root AI convention files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, per-scope copies)** — consumed by coding agents, referenced per-directory.
- **`data/*.tsv` audit inputs + root `supabase/schema.sql`** — referenced by tests and scripts (owner's `9206f320` pipeline).
- **`.vercelignore` original rules** (`data/**`, `*.mp4`, `snapshot.json` exception, `apps/api/**`, `ops/**`) — predate cleanup; only append, never rewrite.

---

## 5. Branch & deploy policy going forward

1. **Branches:** work on short-lived branches → PR → merge → **delete the remote branch**. Dependabot PRs: merge promptly, then delete. `origin` must at all times contain only `main` (plus in-flight PR branches).
2. **Lockfile:** any dependency change must update `pnpm-lock.yaml` via `pnpm install --lockfile-only` with pnpm 9.x (corepack) in the same commit — never let dependabot's vite-style conflict regress `pnpm-workspace.yaml` catalog values.
3. **Repo hygiene:** never commit AI tool dirs (`.agents/`, `.claude/`, `.amazonq/`, `.vscode/`), build artifacts, or vendored clones — `.gitignore` blocks them, keep it that way.
4. **Deploy:** push to `main` auto-deploys both projects (client → sierra-estates.net, admin → admin.sierra-estates.net, root dir `apps/sierra-estates-realty`, region fra1). Manual fallback: `vercel deploy --prod --yes` from repo root (see `scripts/vercel_deploy.sh`).
5. **After any deploy-affecting change:** smoke-check both domains return HTTP 200.

---

## 6. Quick reference

| What | Where |
|---|---|
| Merge/deploy/prune scripts | `/scripts` in operator workspace · `merge_npm_branches.sh`, `vercel_deploy.sh`, `prune_vercel_deployments.sh` |
| Migration rule source | `.gitignore` NOTE block (lines ~178-186) |
| Feed API runtime fallback | `apps/sierra-estates-realty/app/api/feeds/property-finder/route.ts` |
| Vercel projects | client `prj_ieVcIcoeTtHndspXMzlE0cwLl89c` · admin `prj_inhTu8kppYhQv2NZZV3GTUdU8uBi` |
