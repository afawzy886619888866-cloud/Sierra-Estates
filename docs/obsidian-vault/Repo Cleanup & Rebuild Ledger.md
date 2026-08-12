---
type: memory
domain: infrastructure
status: living
updated: 2026-07-06
---

# Repo Cleanup & Rebuild Ledger

The single source of truth for **what was removed from the working tree, why, how to
recover it, and what still needs rebuilding**. Nothing here is lost — every removal is
recoverable from git history at the SHAs below. Keeps the repo clean with **no
duplication and no lost logic**.

Related: [[Sierra Estates Memory Engine]] · [[Admin Console Map]] · [[Sourcing Pipeline & Lead Aggregator]] · [[WhatsApp CRM & Hand-off Pipeline]]

---

## 1. Recovery anchors (git SHAs)

| What | Anchor (merge SHA) | How to recover a path |
|---|---|---|
| Big cleanup — old frontend + `.archive` + design trees removed | `e064fce2` (PR #155) | `git checkout e064fce2^ -- <path>` |
| Archived-snapshots removal | `69efde35` (PR #152) | `git checkout 69efde35^ -- <path>` |
| Seed-hardening + dead-tree removal (this pass) | `ee5d50c6` (branch `chore/harden-seed-and-tidy`) | `git checkout ee5d50c6^ -- <path>` |

> **Golden recovery rule:** to bring any removed file back →
> `git checkout <removalSHA>^ -- <path>`  (the `^` = the commit *before* removal).

---

## 2. Removed in this cleanup pass (recoverable)

| Path | What it was | Why removed | Contained secrets? |
|---|---|---|---|
| `_archived_repos/MANIFEST.json`, `_archived_repos/MANIFEST.md` | Archive manifests (original content replaced with redirect stubs) | Replaced with lightweight stubs that redirect readers to this ledger; full manifests remain recoverable from git history | No |
| `backups/*.json` | `sierra-blu-…-ai-studio.json`, `…-remixed.json` — demo agent/activity data exports | Not referenced; superseded by live Firestore | **No** (scanned: 0 secret indicators) |
| `public/assets/ui_kits/website/` | Static design kit (Header/Footer/PropertyCard .jsx + html) | Unreferenced by app code; superseded by the designer's new bundles | No |

## 3. Removed earlier by PR #155 (recoverable at `e064fce2^`)

Old public frontend (`app/page.tsx`, `app/clients/`, `app/listings/page.tsx`, `DesktopHome.tsx`,
`ClientPage.tsx/.jsx`, `mobile.css`, `designTokens.css`, `globals-theme.css`, `template.tsx`,
`providers.tsx`, `ThemeProvider.tsx`), the whole `.archive/2026-07-dedup/` tree (~1,150 files,
534MB), root `public/design/` (170MB) and `sierra-estates-design-system/` (87MB), and
`STRUCTURE.md`. **Backend/API were untouched.**

---

## 4. Current clean structure (keep)

- `apps/sierra-estates-realty` — the Next.js app. **Backend/API intact** (25 `app/api/*` groups).
  Public pages currently **empty by design** — "client page to follow from Claude Design" (#155).
- `apps/api` (Python/Cloud Run), `apps/agents` (stage-9 closer, WhatsApp scraper).
- `packages/*` — shared libs. `auth`, `batch`, `config` are **empty scaffolds but referenced**
  by workspace deps → **do not delete** (would break `pnpm install`).
- `functions/` (Firebase), `workflows/` (n8n exports, wired via #127/#134), `docs/obsidian-vault/`.
- Two `vercel.json` (root + app) are **intentional** (alternate root-dir topology) — not a duplicate.
- `sierra-estates-motion/` — standalone motion-design reference (kept; may inform the rebuild).

---

## 5. Rebuild plan — what still needs doing (no logic lost)

### 5a. Client site (public pages) — **not yet built**
- Source design: the **houzez-portal** bundle (home hero-slider, compounds, properties, property
  detail, virtual tour; EN/AR) — the designer's static kit. Data is placeholder in its `data.js`
  (`window.HZDATA`).
- Rebuild as **native Next.js server pages** (NOT an iframe — the old iframe home was invisible to
  Google). Wire listings to Firestore `properties`/`houyez_listings` with the static entries as
  fallback. Add `app/sitemap.ts` + `app/robots.ts` + per-page `metadata`.
- Seed data + Firestore helpers already exist: `lib/houyez/firestore.ts`,
  `data/houyez-properties.ts`, `POST /api/houyez/seed` (now fail-closed in prod).

### 5b. Admin portal — **wired, on demo data**
- `app/admin/AdminPortal.tsx` (1,399 lines, ported 1:1 from `admin3.0portalBLUE.html`), mounted at
  `/admin` via `app/admin/page.tsx`; client-side role guard in `app/admin/layout.tsx`
  (`users/{uid}.role` ∈ {admin, manager}). Has `@ts-nocheck` — excluded from the type gate.
- **To finish:** replace the demo arrays (`LEADS`, `DEALS`, `COMPOUNDS`, …) with Firestore reads;
  the KPI queries are ready in `lib/services/dashboard-metrics.ts`. See [[Admin Console Map]].

### 5c. Open follow-ups (tracked in the audit)
- Set `ADMIN_API_KEY` (Vercel) — seed endpoint now refuses in prod without it.
- Set `CLIENT_VERCEL_PROJECT_ID` (repo variable) to activate client deploys.
- Enable branch protection on `main` (merges over red CI have happened).
- Rotate `VERCEL_TOKEN` (was pasted in chat once).

---

## 6. Rules for future cleanups
1. **Never hard-delete without a recovery SHA recorded here.**
2. Verify unreferenced first: `grep -rn "<name>" --include=*.ts* apps packages` (exclude node_modules).
3. Never remove a `packages/*` scaffold without checking workspace refs — empty ≠ unused.
4. Keep the build green: `pnpm type-check && pnpm lint && pnpm build` (CI is authoritative; local
   esbuild version check is a sandbox-only quirk).
5. Preserve `[[links]]` when editing vault notes (graph integrity).
