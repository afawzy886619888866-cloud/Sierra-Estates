# 🏗️ Architecture & Dependencies Map
> **Path:** `docs/memory/architecture_dependencies.md`  
> **Parent Node:** `docs/memory/index.md`

This document maps all workspace connections in the **Sierra Estates pnpm monorepo**. Modifications to any core config file listed below must be validated against this master sheet to ensure zero downstream compile errors.

---

## 🔗 Monorepo Structure

```
refine-full-stack-ecosystem/
├── apps/
│   ├── web/            # Next.js 16 Client Portal (depends on packages/db, packages/ui, packages/auth)
│   ├── admin/          # Vite Admin SPA Portal (depends on packages/db, packages/ui, packages/auth)
│   ├── api/            # Python FastAPI Backend (agent interfaces)
│   └── agents/         # AI Executable Agents (Stage-9 Closer, WhatsApp Scraper)
├── packages/
│   ├── db/             # Shared Firestore types, mock engines, and schema definitions
│   ├── ui/             # Shared Design Tokens (colors, tailwind configs, animations)
│   ├── auth/           # Shared Firebase Auth roles and tokens validator
│   └── config/         # Shared ESLint, TS configurations, and compiler specs
└── functions/          # Firebase Cloud Functions (trigger-sync endpoints)
```

---

## ⚠️ Cascading Dependency Gates

If you edit files in the left column, you MUST verify the packages/apps in the right column:

| Modified Component | Impacted Areas | Action Required |
|---|---|---|
| **`packages/db/`** | `apps/web`, `apps/admin`, `functions/` | Run `pnpm run build` at root to verify type compilation. |
| **`packages/ui/`** | `apps/web`, `apps/admin` | Verify visual pages using local dev server. |
| **`packages/auth/`** | `apps/web`, `apps/admin`, `apps/api` | Verify that Firebase Auth middleware continues to authorize agents correctly. |
| **`firestore.rules`** | `apps/web`, `apps/admin` | Run the Firebase Emulator test suite (`pnpm test` inside `functions/`). |
| **`apps/web/.env.local`** | Next.js Server Actions | Verify environment secrets are fully synchronized with Vercel environment. |

---

## 🚨 Critical Compile Warnings
1.  **TypeScript Gating:** The monorepo enforces `ignoreBuildErrors: false` inside `apps/web/next.config.ts`. Any TypeScript error on the frontend will completely fail the production deployment build on Vercel. Always run `pnpm type-check` before pushing to origin.
2.  **PostCSS v4:** Next.js uses the new CSS-first Tailwind configuration. Customize styling variables inside `apps/web/app/globals.css` rather than trying to use traditional tailwind.config files.

