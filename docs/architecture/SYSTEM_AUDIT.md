# 🏛️ Sierra Estates: Complete System Audit & Roadmap

## Part 1: Frontend Design — Final Inventory

### 🟢 BUILT & FUNCTIONAL (16 Screens)

| # | Screen | File | Status |
| --- | -------- | ------ | -------- |
| 1 | **Landing Page** (Hero + Parallax) | `app/landing/page.tsx` | ✅ Live — Needs "Quiet Luxury" polish |
| 2 | **Portal Hub** (Main app shell) | `app/portal/page.tsx` | ✅ Live — Sidebar + Topbar + Routing |
| 3 | **Dashboard V4** (KPIs + AI Panel) | `components/Dashboard/v4/` | ✅ Live — Connected to Firestore |
| 4 | **Inventory Grid** (Portfolio Assets) | `components/Admin/PortfolioAssets.tsx` | ✅ Live — Reads from `listings` collection |
| 5 | **CRM Kanban** (10-Stage Pipeline) | `components/CRM/CRMKanban.tsx` | ✅ Live — Reads from `leads` collection |
| 6 | **Leads Flow** (Lead cards) | `components/CRM/LeadsFlow.tsx` | ✅ Live — Firestore-connected |
| 7 | **Easy Listing** (Scribe Intake) | `components/Operations/EasyListing.tsx` | ✅ Live — AI extraction working |
| 8 | **Proposal View** (Client-facing) | `components/Proposals/ProposalView.tsx` | ✅ Live — Public URL via `/proposals/[id]` |
| 9 | **Selection Gallery** (Leila S8) | `components/Concierge/SelectionView.tsx` | ✅ Live — Swipe UI exists |
| 10 | **Commission Ledger** | `components/Operations/CommissionLedger.tsx` | ✅ Live — Reads `sales` |
| 11 | **Market Intelligence** | `components/Operations/MarketIntelligence.tsx` | ✅ Live — Mock data |
| 12 | **Dedupe Review Queue** | `components/Admin/DedupeReviewQueue.tsx` | ✅ Live — Connected |
| 13 | **Integration Hub** | `components/Operations/IntegrationHub.tsx` | ✅ Live — PF + Telegram config |
| 14 | **Reports Screen** | `components/Dashboard/ReportsScreen.tsx` | ✅ Live — Charts + Stats |
| 15 | **Team Management** | `components/Dashboard/TeamScreen.tsx` | ✅ Live — User roles |
| 16 | **Login / Auth** | `components/Auth/LoginScreen.tsx` | ✅ Live — Firebase Auth |

### 🟡 PARTIALLY BUILT (Conceptual UI, No Live Data)

| # | Screen | File | What's Missing |
| --- | -------- | ------ | ---------------- |
| 17 | **Site Experiences** (Virtual Tour) | `components/Operations/SiteExperiences.tsx` | Mock data only. No 360 viewer. |
| 18 | **Map Explorer** | `components/Operations/MapExplorer.tsx` | Leaflet map exists. No live compound data overlay. |
| 19 | **Curator Portal** | `components/Operations/CuratorPortal.tsx` | UI exists. AI branding needs `GOOGLE_AI_API_KEY`. |
| 20 | **Scribe Portal** | `components/Operations/ScribePortal.tsx` | UI exists. Needs live WhatsApp feed. |

### 🔴 MISSING (Not Yet Built)

| # | Screen | Purpose |
| --- | -------- | --------- |
| 21 | **Unit Detail Page** (Strategic View) | Full-width hero + ROI sidebar + AI insights |
| 22 | **Public Inventory Browser** | Client-facing `/inventory` with SBR filter |
| 23 | **Investor Intelligence Dashboard** | Price-per-meter charts, CMA analysis |

---

## Part 2: Backend (Firebase) — What's Done vs. What's Not

### 🟢 FULLY CONNECTED TO FIREBASE

| Component | Collection | Status |
| ----------- | ------------ | -------- |
| **Firebase Client SDK** | — | ✅ Configured in `lib/firebase/index.ts` |
| **Firebase Auth** | `users` | ✅ Login/Logout/Guest working |
| **Firestore Rules** | — | ✅ Deployed in `firestore.rules` |
| **Data Schema** (546 lines) | — | ✅ Full TypeScript types in `lib/models/schema.ts` |
| **CRUD Service Layer** | All | ✅ Generic `firestore-service.ts` with pagination + real-time |
| **Listings / Units** | `listings` | ✅ Read + Write + Subscribe |
| **Leads / CRM** | `leads` | ✅ Full pipeline with stage tracking |
| **Proposals** | `proposals` | ✅ CRUD + public view counting |
| **Sales** | `sales` | ✅ Commission tracking |
| **Activities / Audit** | `activities` | ✅ Logging |
| **Vouchers** | `vouchers` | ✅ Incentive system |
| **Viewings** | `viewings` | ✅ Scheduling |

### 🟢 AI AGENTS (Connected to Firebase Admin SDK)

| Agent | Stages | Firebase Integration | AI Engine |
| ------- | -------- | --------------------- | ----------- |
| **The Scribe** | S1 → S2 | ✅ Reads/writes `broker_listings` | ✅ Gemini 1.5 Flash |
| **The Curator** | S3 → S5 | ✅ Writes `descriptionEn/Ar`, distribution templates | ✅ Gemini 1.5 Flash/Pro (multimodal) |
| **The Matchmaker** | S6 → S8 | ✅ Profiling, matching, proposal generation | ✅ Gemini via services |
| **The Closer** | S9 → S10 | ✅ Status finalization, feedback loop | ✅ Feedback engine |
| **Orchestrator** | S1 → S10 | ✅ Full pipeline runner with state machine | ✅ Arize Phoenix observability |

### 🟡 PARTIALLY CONNECTED (Code Exists, Needs Config/Testing)

| Component | File | What's Missing |
| ----------- | ------ | ---------------- |
| **Google AI (Gemini)** | `lib/server/google-ai.ts` | ⚠️ `GOOGLE_AI_API_KEY` **NOT in `.env.local`** — Agents won't fire |
| **Firebase Admin SDK** | `lib/server/firebase-admin.ts` | ⚠️ Needs `GOOGLE_APPLICATION_CREDENTIALS` service account JSON |
| **Property Finder Sync** | `lib/services/PFIntegrationService.ts` | ⚠️ API keys exist but JWT auth untested |
| **Google Sheets Sync** | `lib/services/sheets-sync.ts` | ⚠️ Placeholder — no Google Sheets API key |
| **WhatsApp Ingestion** | `app/api/ingest/whatsapp/route.ts` | ⚠️ Route exists — needs webhook verification |
| **Telegram Bot** | `app/api/telegram/webhook/route.ts` | ⚠️ Token exists — webhook URL not registered |

### 🔴 NOT ON FIREBASE YET

| Component | Current State | What Needs to Happen |
| ----------- | -------------- | --------------------- |
| **Firebase Storage** (Images) | Photos stored locally in `/public` | Upload to Firebase Storage + migrate URLs |
| **Firebase Hosting** | Running on `localhost:3000` only | Deploy to Firebase Hosting or Vercel |
| **Cloud Functions** | No serverless triggers | Orchestrator should trigger on Firestore `onCreate` |
| **Firebase App Check** | Code exists but ReCAPTCHA key missing | Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` |

---

## Part 3: The Roadmap (Priority Order)

### 🔴 Phase 1: CRITICAL (This Week)

1. **Add `GOOGLE_AI_API_KEY`** to `.env.local` → Unlocks all 4 AI agents
2. **Add Firebase Admin credentials** (`serviceAccountKey.json`) → Unlocks server-side orchestration
3. **Test the full S1→S10 pipeline** with one real listing
4. **Deploy to Vercel** (already has `.vercel/` config) → Go live

### 🟡 Phase 2: FRONTEND "Quiet Luxury" Upgrade (Next 2 Weeks)

5. **Rebuild Landing Page** → Cinematic Hero with Sky Blue/Gold palette from reference images
2. **Build Unit Detail Page** → Full-width hero + ROI sidebar
3. **Build Public Inventory** → Editorial grid with SBR Code filtering
4. **Polish Selection Gallery (S8)** → Add WhatsApp CTA + Match Score badges
5. **Add "Verified Listing" badge** to all property cards
6. **Add 3D Virtual Tour placeholder** to unit cards

### 🟢 Phase 3: SCALE (Month 2)
 1. **WhatsApp Cloud API** webhook → Live ingestion from broker groups
 2. **Property Finder bi-directional sync** → Auto-publish listings
 3. **Firebase Storage migration** → All images in cloud
 4. **Investor Intelligence Page** → Price-per-meter analytics
 5. **Interactive Compound Map** → Leaflet + live inventory overlay
