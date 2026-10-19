---
description: How to develop, test, and deploy the Sierra Estates Realty platform
---

# Sierra Estates Platform Workflow

## Project Overview

- **Location**: `H:\Sierra Estates` (Monorepo root)
- **Client Application**: `apps/sierra-estates-realty`
- **Stack**: Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + pgvector + Auth + Storage), Vercel, Tailwind CSS v4, Framer Motion
- **Authoritative Backend**: **Supabase** (`https://gaxfqcietzoonlmatiot.supabase.co`). Firebase is permanently decommissioned.
- **Brand Mandate**: Always use "Investment Stakeholders" (not leads), "Strategic Pipeline" (not CRM), "Portfolio Assets" (not listings), in all UI + code comments
- **Aesthetic**: Cinematic Luxury — Navy `#0A1A3A`, Gold `#C9A24A`, Silver `#E2E8F0`, glassmorphism, micro-animations
- **Unified Inventory**: 12,333 curated units synced across Local Master Excel, Supabase `public.listings`, Supabase Storage `inventory-snapshots/snapshot.json`, Client Interactive Map, and the RAG Memory Engine.

---

## Architecture Map

```
apps/sierra-estates-realty/
  app/
    layout.tsx          ← Root Providers: AuthContext, I18nContext, Theme
    page.tsx            ← Root SPA orchestrator (screen router)
    globals.css         ← All design tokens, glassmorphism, animations
    api/
      openclaw/         ← Gemini AI insights endpoint
      leads/            ← Stakeholder CRUD API (Supabase backed)
      property-finder/  ← Property Finder feed ingest
      sync/             ← PF ↔ Supabase sync trigger
      telegram/
        setup/          ← Register Telegram webhook
        webhook/        ← Telegram bot message handler
      map/              ← Compound and listing GIS endpoints

  components/
    Auth/               ← Supabase Auth LoginScreen
    UI/                 ← Topbar, Sidebar, BrandLogo, LanguageToggle
    Dashboard/          ← DashboardScreen, KPIGrid, ActivityList, AIPanel, ReportsScreen
    CRM/                ← CRMKanban, LeadsFlow, ClientsScreen
    Listings/           ← ListingsHub, InventoryOS
    Operations/         ← EasyListing, ActionProtocols, SiteExperiences, CommissionLedger
    Admin/              ← DedupeReviewQueue, MediaHub, InventoryAdmin
    Map/                ← Interactive Compound GIS Map with vector overlays

  lib/
    auth/               ← Supabase client & server session helpers
    inventory/          ← snapshot.json (12,333 units) & compound-stats.json (140 compounds)
    supabase/           ← Supabase client, admin clients, and query builders
    models/             ← TypeScript data models
    services/           ← Supabase CRUD helpers for all tables
    financial-engine.ts ← ROI, GrossYield, CommissionCalculator
    audit.ts            ← Audit log writer
    config.ts           ← Centralised env/config constants

packages/
  memory-engine/        ← RAG Memory Engine & ECC (Episodic Context Cache)
  db/                   ← Supabase database types and schema helpers
  whatsapp-shared/      ← WhatsApp and lead harvester shared utilities

data/
  Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx ← Canonical master sheet (12,443 rows)
```

---

## Supabase Tables & Storage

| Table / Bucket     | Purpose                                |
|--------------------|----------------------------------------|
| `listings`         | Portfolio Assets (12,333+ units with pgvector embeddings) |
| `compounds`        | Master compound GIS coordinates & analytics |
| `leads`            | Investment Stakeholders                |
| `sales`            | Closed transactions                    |
| `activities`       | Audit trail / activity feed            |
| `users`            | User profiles + role claims            |
| `inventory-snapshots` (bucket) | Stored `snapshot.json` for edge caching & builds |

---

## 1. Start Local Dev Server

```bash
pnpm install
pnpm dev
# Or for the client app specifically:
pnpm --filter sierra-estates-client-page dev
```

Open: <http://localhost:3000>

---

## 2. Lint & Type Check

```bash
pnpm --filter sierra-estates-client-page type-check
pnpm test:ci
```

Both must exit with code 0 before pushing or deploying.

---

## 3. Production Build (Verify)

```bash
pnpm --filter sierra-estates-client-page build
```

Expect: `✓ Compiled successfully` and `✓ Generating static pages`

---

## 4. Deploy to Vercel

Deploys automatically via Vercel GitHub integration upon push to `origin main`.
Build script uses `scripts/vercel-build.sh` which automatically pulls the fresh `snapshot.json` from Supabase Storage and verifies type safety.

---

## 5. Unified Inventory & Map Sync

To synchronize changes between Local Excel, Supabase, and the Interactive Map:

```bash
node scripts/sync-all-to-supabase-and-map.mjs
```

This updates:
1. `apps/sierra-estates-realty/lib/inventory/snapshot.json`
2. `apps/sierra-estates-realty/public/data/snapshot.json`
3. `apps/sierra-estates-realty/lib/inventory/compound-stats.json`
4. Supabase `public.listings` (upsert 12,333 rows)
5. Supabase Storage bucket `inventory-snapshots/snapshot.json`

---

## 6. RAG Memory Engine

The RAG memory engine unifies domain knowledge and unit embeddings:

```bash
# Generate Supabase pgvector embeddings (Gemini embedding-001, 768 dims)
pnpm tsx scripts/generate-supabase-embeddings.ts

# Seed OpenClaw memory graph
pnpm tsx scripts/seed-openclaw-memory.ts
```

---

## 7. Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://gaxfqcietzoonlmatiot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GOOGLE_GENAI_API_KEY=...
PROPERTY_FINDER_API_KEY=...
TELEGRAM_BOT_TOKEN=...
```

---

## 8. Key Coding Rules

- **Authoritative Backend**: Strictly Supabase. Never import or use Firebase.
- **Type Safety**: Strictly avoid `any`. All schemas and RPC calls must be typed against Supabase definitions or Zod models.
- **No Secrets Client-Side**: Never expose service role keys or database credentials in client bundles.
- **Bilingual**: All user-facing strings go through `messages/` — never hardcode EN/AR text.
- **RTL**: Use `dir` and `textAlign` based on locale from `I18nContext`.
