<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Sierra Estates — Admin Control Panel

The admin SPA for the Sierra Estates luxury PropTech platform (Egyptian market). Built with Vite + React 19 + Tailwind 4 + Firebase Auth. Talks to the [Sierra-Estates-Final backend](https://github.com/ahmedfawzy8866/Sierra-Estates-Final) via authenticated REST.

View your app in AI Studio: https://ai.studio/apps/cc0f14b8-c38e-4e88-b9b1-5bc8d3e3679d

## What's in this repo

A bilingual (EN/AR) admin control panel with 13 sections:

| Section | Pages | Description |
|---------|-------|-------------|
| **CORE** | Live Dashboard, Leads & CRM, Property Inventory, Follow-ups, Search Insights, Page Editor (CMS) | Day-to-day operations |
| **AUTOMATION & AGENTS** | Bots Control, AI Bots & Agents, Workflows | Background workers + AI personas |
| **INTEGRATIONS** | Easy Listing, Automation Portal, Data Sync & Hub | External systems |
| **SYSTEM** | DB Editor (Raw) | Direct Firestore CRUD (superadmin only) |

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  -19-6-AI (this repo)       │         │  Sierra-Estates-Final (Backend)  │
│  Vite + React 19            │         │  Next.js 16 + Turborepo          │
│                             │  HTTPS  │                                  │
│  apiClient.ts ──────────────┼────────>│  /api/admin/* (CRUD)             │
│   Bearer: <Firebase ID token>         │  /api/pages/* (public CMS read)  │
│                             │         │  /api/search/semantic (AI)       │
│  Firebase Auth ─────────────┼────────>│  Firebase Admin (verifyAdminReq) │
│                             │         │                                  │
└─────────────────────────────┘         └──────────────────────────────────┘
                                                │
                                                ▼
                                        ┌──────────────────┐
                                        │  Firestore       │
                                        │  (units, leads,  │
                                        │   pages,         │
                                        │   followups,     │
                                        │   system_status, │
                                        │   search_queries)│
                                        └──────────────────┘
```

## Run Locally

**Prerequisites:** Node.js 20+

### 1. Start the backend first

```bash
git clone https://github.com/ahmedfawzy8866/Sierra-Estates-Final.git
cd Sierra-Estates-Final/apps/sierra-estates-realty
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_FIREBASE_* and GOOGLE_AI_API_KEY
pnpm dev  # starts on :3000
```

### 2. Start this admin SPA

```bash
git clone https://github.com/ahmedfawzy8866/-19-6-AI.git
cd -19-6-AI
cp .env.example .env.local
# Set:
#   GEMINI_API_KEY=...           (for AI features)
#   VITE_BACKEND_API_URL=http://localhost:3000   (points to the backend)
npm install
npm run dev  # starts on :5173
```

### 3. Sign in

Open http://localhost:5173 and sign in with a Firebase user that has a `users/{uid}` doc in Firestore with `role: 'admin'` or `role: 'superadmin'`.

## Admin pages by capability

### 📊 Live Dashboard
Real-time KPIs, agent leaderboard, pipeline funnel, recent activity.

### 👥 Leads & CRM Hub
Full lead lifecycle: create, assign, stage-track (S1→S10), bulk update, archive, export CSV.

### 🏢 Property Inventory
Listings CRUD with map view, price heatmap, AI quality scoring, PropertyFinder sync.

### 📅 Follow-ups *(new)*
Task management for agent follow-ups with leads. Per-type icons (call/WhatsApp/email/meeting/viewing), priority badges, overdue detection, one-click complete.

### 📈 Search Insights
Analytics for the AI semantic search: top queries, no-result queries (inventory gaps), locale split, rent vs sale, top districts/compounds, time series.

### 📝 Page Editor (CMS) *(new)*
Edit client-site copy (hero headlines, about text, CTAs, contact info) without a code deploy. Publish/unpublish toggle. Bilingual (EN/AR per slug). Public site reads via `/api/pages/:slug`.

### 🤖 Bots Control *(new)*
Monitor and control 6 background bots: `whatsapp-scraper`, `n8n-orchestrator`, `scribe-agent`, `curator-agent`, `closer-agent`, `matchmaker-agent`. Send commands: run now, restart, enable, disable. Auto-refreshes every 30s.

### 🤖 AI Bots & Agents
Persona-based AI agent console (Scribe, Curator, Closer, Matchmaker). Run agents on demand, view logs, configure prompts.

### ⚡ Workflows
n8n workflow orchestration. Trigger, monitor, edit workflows.

### 📑 Easy Listing
Quick-listing wizard: paste unstructured text → Scribe agent parses → review → publish.

### ⚙️ Automation Portal
Configure automation rules (lead → WhatsApp sequence, listing → multi-channel publish, etc.).

### 🔄 Data Sync & Hub
PropertyFinder sync, Airtable sync, Google Sheets ingestion, manual CSV upload.

### 🗄️ DB Editor (Raw) *(new, superadmin only)*
Direct Firestore CRUD on any collection. Filter (`?where=field==value`), order, edit any doc as JSON, create, delete. Blocked collections: `admin_credentials`, `service_accounts`, `system_secrets`.

## Security model

- All admin endpoints require `verifyAdminRequest` on the backend (Firebase ID token OR `SBR_SECRET_KEY` OR `CRON_SECRET`)
- DB Editor + page deletion require `role === 'superadmin'`
- Follow-ups: agents see only their own; admins see all
- Public CMS read (`/api/pages/:slug`) only returns published pages

## Backend endpoints used

| Endpoint | Used by |
|----------|---------|
| `GET/POST/PATCH/DELETE /api/admin/leads[/:id]` | Leads & CRM Hub |
| `POST /api/admin/leads/bulk` | Leads & CRM Hub (bulk actions) |
| `GET/POST/PATCH/DELETE /api/admin/listings[/:id]` | Property Inventory |
| `GET /api/admin/agents` | AI Bots & Agents |
| `GET/PATCH /api/admin/agents/:id` | AI Bots & Agents |
| `GET/POST/PATCH/DELETE /api/admin/workflows[/:id]` | Workflows |
| `GET/POST/DELETE /api/admin/team` | Settings (admin control) |
| `GET /api/admin/reports` | Reports |
| `GET/POST/PATCH/DELETE /api/admin/followups[/:id]` | Follow-ups *(new)* |
| `GET/POST /api/admin/bots` | Bots Control *(new)* |
| `GET/POST/PATCH/DELETE /api/admin/pages[/:id]` | Page Editor *(new)* |
| `GET /api/admin/search-insights` | Search Insights *(new)* |
| `GET/POST/PATCH/DELETE /api/admin/db/:collection[/:id]` | DB Editor *(new, superadmin only)* |
| `GET /api/pages/:slug` | Public client site (CMS read) |

## Coordinate commit history

- This repo: latest commit `c537e74` — admin pages
- Backend: latest commit `a7984e12` — corresponding API endpoints

Always keep these in sync. If you add a new admin page that calls a new endpoint, ship the backend endpoint first.

## Deployment

This app deploys to Vercel as a static SPA. The `vercel.json` rewrites all `/api/*` to `api/index.ts` (a small Express server for the PropertyFinder proxy) and everything else to `index.html`.

Set these env vars in Vercel:
- `GEMINI_API_KEY` — for AI features
- `VITE_BACKEND_API_URL` — `https://sierra-2027.vercel.app` (or your backend URL)
- `PF_API_KEY`, `PF_API_SECRET` — for PropertyFinder proxy (only if you use `/api/health`)

## License

Private. Sierra Estates.
