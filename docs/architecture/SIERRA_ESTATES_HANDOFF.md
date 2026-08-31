# ✦ SIERRA ESTATES REALTY — COMPLETE PROJECT HANDOFF ✦

> **Date**: April 15, 2026  
> **Platform Version**: V10.2.0 (Cinematic Reality)  
> **Stack**: Next.js 16 + React 19 + Firebase + Gemini AI  
> **Repository**: `c:\OpenClaw\my-app`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Environment Variables](#3-environment-variables)
4. [Architecture Overview](#4-architecture-overview)
5. [Firestore Database Schema](#5-firestore-database-schema)
6. [The 10-Stage Orchestration Pipeline](#6-the-10-stage-orchestration-pipeline)
7. [Backend Services Inventory](#7-backend-services-inventory)
8. [API Routes Map](#8-api-routes-map)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Bilingual (i18n) System](#10-bilingual-i18n-system)
11. [Page-Level Design Briefs (For Designers)](#11-page-level-design-briefs-for-designers)
12. [Component Inventory](#12-component-inventory)
13. [Integration Points](#13-integration-points)
14. [Known Gaps & TODOs](#14-known-gaps--todos)
15. [Brand Tokens (Reference Only)](#15-brand-tokens-reference-only)

---

## 1. Executive Summary

Sierra Estates is a **real estate intelligence platform** for the Egyptian luxury market. It is NOT a simple listings website — it is an **AI-powered operating system** that automates the entire lifecycle of a property transaction, from raw broker WhatsApp messages all the way to deal closure and feedback.

**What the system does in one sentence:**  
> A broker sends a WhatsApp message → AI parses it into a structured listing → AI brands it → AI distributes it to portals → AI matches it with leads → AI generates a proposal → Agent closes the deal → System learns from outcome.

### Core Concepts

| Term | Meaning |
| ------ | --------- |
| **Signature Asset** | A property listing (unit) |
| **Investment Stakeholder** | A lead / buyer / renter |
| **Strategic Acquisition** | A completed sale |
| **Sierra Code** | Proprietary property ID (e.g. `MVD-3F-75K+G`) |
| **Orchestration Pipeline** | The 10-stage automated workflow |
| **The 4 Agents** | AI personas: Scribe, Curator, Matchmaker, Closer |

---

## 2. Tech Stack & Dependencies

### Core Framework

| Layer | Technology | Version |
| ------- | ----------- | --------- |
| Framework | **Next.js** (App Router) | 16.2.1 |
| UI | **React** | 19.2.4 |
| Language | **TypeScript** | ^5 |
| Styling | **Tailwind CSS** v4 + Vanilla CSS (`globals.css` — 51KB) | ^4 |
| Animations | **Framer Motion** + **anime.js** | 12.38 / 4.3.6 |

### Backend & Data

| Layer | Technology |
| ------- | ----------- |
| Database | **Firebase Firestore** (NoSQL) |
| Auth | **Firebase Auth** (Email/Password + Guest mode) |
| Storage | **Firebase Storage** (images, brochures) |
| AI Engine | **Google Generative AI** (Gemini 1.5 Flash / Pro) |
| Observability | **OpenTelemetry** → Arize Phoenix (traces) |

### External Integrations

| Service | Purpose |
| --------- | --------- |
| Property Finder API | Distribution — push/pull listings |
| WhatsApp Business API (Meta) | Broker intake + lead messaging |
| Telegram Bot API | Alternate broker intake channel |
| ElevenLabs | Voice synthesis (Leila persona) |
| Leaflet.js | Map visualization |

### Key npm Dependencies

```
firebase, firebase-admin, @google/generative-ai, framer-motion, animejs,
lucide-react, react-hot-toast, next-intl, leaflet, react-leaflet,
@opentelemetry/sdk-node, @arizeai/openinference-semantic-conventions
```

---

## 3. Environment Variables

> [!IMPORTANT]
> All env vars live in `.env.local`. A template exists at `.env.example`.

| Variable | Purpose | Required |
| ---------- | --------- | ---------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web SDK | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore project | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Media storage | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app instance | ✅ |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check (optional) | ❌ |
| `GOOGLE_AI_API_KEY` | Gemini API (server-side) | ✅ |
| `PROPERTY_FINDER_API_GATEWAY` | PF REST API base URL | ⚠️ |
| `PROPERTY_FINDER_CLIENT_ID` | PF OAuth client | ⚠️ |
| `PROPERTY_FINDER_CLIENT_SECRET` | PF OAuth secret | ⚠️ |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | ⚠️ |
| `TELEGRAM_CHAT_ID` | Telegram channel | ⚠️ |
| `WHATSAPP_TOKEN` | Meta Cloud API token | ⚠️ |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification | ⚠️ |
| `ELEVENLABS_API_KEY` | Voice synthesis | ❌ |
| `LEILA_VOICE_ID` | Cloned voice ID | ❌ |
| `CRON_SECRET` | Cron job auth | ⚠️ |
| `SBR_SECRET_KEY` | Internal API auth header | ✅ |

> ✅ = Required for app to start  
> ⚠️ = Required for specific feature  
> ❌ = Optional enhancement

---

## 4. Architecture Overview

```mermaid
graph TD
    subgraph "Input Layer"
        WA[WhatsApp Business API]
        TG[Telegram Bot]
        WEB[Landing Page Form]
        PF_IN[Property Finder Sync]
    end

    subgraph "API Routes (Next.js)"
        API_WA[/api/whatsapp]
        API_TG[/api/telegram]
        API_LEADS[/api/leads]
        API_INGEST[/api/ingest]
        API_SYNC[/api/sync]
        API_ORCH[/api/orchestrate]
        API_MATCH[/api/matching]
        API_PROP[/api/proposals]
        API_CONC[/api/concierge]
        API_AGENT[/api/agent/hub]
    end

    subgraph "Service Layer (lib/services/)"
        PARSER[WhatsAppParserService]
        ORCH[OrchestratorService]
        CODING[CodingAlgorithm]
        MATCH[MatchingEngine]
        PROFILE[ProfilingService]
        SYNC[SyncEngine]
        SALES[SalesEngine]
        CLOSE[ClosingEngine]
        FEEDBACK[FeedbackEngine]
        PF_CLIENT[PropertyFinderClient]
        AGENT_SVC[AntigravityAgent]
    end

    subgraph "AI Layer"
        GEMINI[Gemini 1.5 Flash / Pro]
        VOICE[ElevenLabs Voice]
    end

    subgraph "Data Layer (Firestore)"
        DB_LISTINGS[(listings)]
        DB_LEADS[(leads)]
        DB_SALES[(sales)]
        DB_BROKER[(broker_listings)]
        DB_PROPOSALS[(proposals)]
        DB_VOUCHERS[(vouchers)]
        DB_VIEWINGS[(viewings)]
        DB_SYNC[(syncQueue / syncLog)]
    end

    WA --> API_WA --> PARSER --> CODING
    TG --> API_TG
    WEB --> API_LEADS
    PF_IN --> API_SYNC --> SYNC

    PARSER --> DB_BROKER
    API_ORCH --> ORCH
    ORCH --> MATCH --> DB_LEADS
    ORCH --> SALES
    MATCH --> GEMINI
    PROFILE --> GEMINI
    AGENT_SVC --> GEMINI
```

### Directory Structure

```
my-app/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Operations Dashboard (4-agent switcher)
│   ├── layout.tsx                # Root layout (fonts, auth, i18n)
│   ├── globals.css               # Master stylesheet (51KB)
│   ├── landing/page.tsx          # Public marketing page
│   ├── portal/page.tsx           # Internal CRM portal (auth-gated)
│   ├── admin/page.tsx            # Admin login gate
│   ├── agent/page.tsx            # AI Agent chat interface
│   ├── proposals/[id]/page.tsx   # Shareable proposal view
│   ├── select/[leadId]/page.tsx  # Concierge selection gallery
│   └── api/                      # 15 API route groups
│       ├── agent/                # AI agent hub
│       ├── concierge/            # Lead profiling
│       ├── cron/                 # Scheduled tasks
│       ├── ingest/               # Raw data intake
│       ├── leads/                # Lead CRUD
│       ├── matching/             # AI matching
│       ├── openclaw/             # AI gateway
│       ├── orchestrate/          # Pipeline trigger
│       ├── property-finder/      # PF sync
│       ├── proposals/            # Proposal CRUD
│       ├── sync/                 # Sync operations
│       ├── telegram/             # TG webhook
│       ├── wealth/               # Financial engine
│       ├── webhooks/             # External webhooks
│       └── whatsapp/             # WA webhook
├── components/                   # React components
│   ├── Admin/                    # MediaHub, DedupeReview, PortfolioAssets
│   ├── Auth/                     # LoginScreen
│   ├── CRM/                      # CRMKanban, LeadsFlow, ClientsScreen
│   ├── Concierge/                # SelectionView, SmartProfilingForm
│   ├── Dashboard/                # DashboardV4, Reports, Team
│   ├── Listings/                 # ListingsHub
│   ├── Operations/               # 16 operational components
│   ├── Proposals/                # Proposal rendering
│   ├── Shared/                   # Reusable UI bits
│   ├── UI/                       # BrandLogo, Topbar, Sidebar, Toggles
│   └── Visuals/                  # Cinematic visual effects
├── lib/                          # Core business logic
│   ├── AuthContext.tsx            # Auth provider (inactivity timeout)
│   ├── I18nContext.tsx            # Bilingual EN/AR provider
│   ├── config.ts                 # Global site config
│   ├── firebase/                 # Firebase client + admin init
│   ├── server/                   # Server-only: google-ai, firebase-admin
│   ├── models/schema.ts          # THE single source of truth (schema)
│   ├── services/                 # 28 backend service files
│   └── agents/                   # 4 AI agent logic files
└── messages/                     # i18n JSON (en.json, ar.json)
```

---

## 5. Firestore Database Schema

> [!IMPORTANT]
> The canonical schema lives at [schema.ts](file:///c:/OpenClaw/my-app/lib/models/schema.ts). All types inherit from `BaseDocument`.

### Collections Map

| Collection Name | TypeScript Interface | Purpose |
| ---------------- | --------------------- | --------- |
| `listings` | `Unit` / `PortfolioAsset` | Property inventory |
| `leads` | `InvestmentStakeholder` / `Lead` | Buyer/renter pipeline |
| `sales` | `Sale` | Completed transactions |
| `broker_listings` | `InboundAssetSignal` | Raw WhatsApp/TG intake |
| `proposals` | `Proposal` | AI-curated asset packages |
| `vouchers` | `Voucher` | Incentives & rewards |
| `viewings` | `Viewing` | Property inspections |
| `projects` | `Project` | Real estate developments |
| `developers` | `Developer` | Developer companies |
| `mediaAssets` | `MediaAsset` | Images/videos/docs |
| `users` | `UserProfile` | Staff accounts |
| `activities` | `Activity` | Audit trail |
| `syncQueue` | `SyncRecord` | PF sync review queue |
| `syncLog` | `SyncResult` | Sync run history |

### Key Type: `Unit` (Listing)

```
title, titleAr, code, propertyType, status, compound, location,
area, bedrooms, bathrooms, price, images[], automation{},
intelligence{code, valuationScore, sentiment, ...},
orchestrationState{stage, status, lastTriggeredAt}
```

### Key Type: `InvestmentStakeholder` (Lead)

```
name, phone, email, stage (PipelineStage), source,
budget, preferredLocations[], aiProfiling{score, topMatches[]},
intelligence{memory{negativeSignals[], positiveSignals[]},
  objections[], matrix{lossAversion, premiumTolerance}},
automation{botInitiated, scoringCompleted, selectionUrlSent},
interactionHistory[{unitId, action, timestamp}]
```

### Orchestration State (On Every Document)

Every document can carry:

```typescript
orchestrationState: {
  stage: string;        // 'S1' through 'S10'
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastTriggeredAt: Timestamp;
  engineVersion: string;
  errors?: string[];
}
```

---

## 6. The 10-Stage Orchestration Pipeline

The heart of Sierra Estates. Controlled by [orchestrator.ts](file:///c:/OpenClaw/my-app/lib/services/orchestrator.ts).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STAGE     │  NAME                │  AGENT       │  SERVICE(S)          │
├──────────────────────────────────────────────────────────────────────────┤
│  S1        │  Data Acquisition    │  SCRIBE      │  WhatsAppParser      │
│  S2        │  AI Listing Engine   │  SCRIBE      │  CodingAlgorithm     │
│──────────────────────────────────────────────────────────────────────────│
│  S3        │  Asset Branding      │  CURATOR     │  Canvas Engine (TBD) │
│  S4        │  Global Distribution │  CURATOR     │  SyncEngine, PF API  │
│  S5        │  Portal Sync         │  CURATOR     │  PFIntegration       │
│──────────────────────────────────────────────────────────────────────────│
│  S6        │  Stakeholder Intel   │  MATCHMAKER  │  ProfilingService    │
│  S7        │  Neural Matching     │  MATCHMAKER  │  MatchingEngine      │
│  S8        │  Portfolio Proposal  │  MATCHMAKER  │  ProposalService     │
│──────────────────────────────────────────────────────────────────────────│
│  S9        │  Asset Finalization  │  CLOSER      │  ClosingEngine       │
│  S10       │  Feedback Loop       │  CLOSER      │  FeedbackEngine      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Trigger

```
POST /api/orchestrate
Header: X-SBR-SECRET-KEY: <secret>
Body: { docId: string, collection: 'units' | 'brokerListings' | ... }
```

The pipeline runs **asynchronously** — the API returns immediately with `status: 'processing'` while the pipeline works through stages in sequence.

---

## 7. Backend Services Inventory

All files in `lib/services/`. Each file is a self-contained service module.

### Core Pipeline Services

| File | Function |
| ------ | ---------- |
| [orchestrator.ts](file:///c:/OpenClaw/my-app/lib/services/orchestrator.ts) | Pipeline controller — sequences S1→S10 |
| [WhatsAppParserService.ts](file:///c:/OpenClaw/my-app/lib/services/WhatsAppParserService.ts) | Stage 1-2: NLP parsing of raw broker messages via Gemini |
| [coding-algorithm.ts](file:///c:/OpenClaw/my-app/lib/services/coding-algorithm.ts) | Generates Sierra Internal Codes (`MVD-3F-75K+G`) |
| [coding-service.ts](file:///c:/OpenClaw/my-app/lib/services/coding-service.ts) | Code validation and metadata builder |
| [profiling-service.ts](file:///c:/OpenClaw/my-app/lib/services/profiling-service.ts) | Stage 6: Lead qualification & Leila Score (1-10) |
| [matching-engine.ts](file:///c:/OpenClaw/my-app/lib/services/matching-engine.ts) | Stage 7: AI-driven lead↔listing matching |
| [sales-engine.ts](file:///c:/OpenClaw/my-app/lib/services/sales-engine.ts) | Stage 7-8: Strategic sales logic |
| [closing-engine.ts](file:///c:/OpenClaw/my-app/lib/services/closing-engine.ts) | Stage 9: Deal finalization |
| [feedback-engine.ts](file:///c:/OpenClaw/my-app/lib/services/feedback-engine.ts) | Stage 10: Outcome learning loop |

### Integration Services

| File | Function |
| ------ | ---------- |
| [sync-engine.ts](file:///c:/OpenClaw/my-app/lib/services/sync-engine.ts) | Property Finder ↔ Firestore bi-directional sync |
| [PFIntegrationService.ts](file:///c:/OpenClaw/my-app/lib/services/PFIntegrationService.ts) | Property Finder API integration |
| [PropertyFinderService.ts](file:///c:/OpenClaw/my-app/lib/services/PropertyFinderService.ts) | PF data normalization |
| [telegram-controller.ts](file:///c:/OpenClaw/my-app/lib/services/telegram-controller.ts) | Telegram bot commands |
| [whatsapp-parser.ts](file:///c:/OpenClaw/my-app/lib/services/whatsapp-parser.ts) | Lightweight WA message parser |
| [WhatsAppStatusService.ts](file:///c:/OpenClaw/my-app/lib/services/WhatsAppStatusService.ts) | WA delivery status tracking |

### AI & Intelligence Services

| File | Function |
| ------ | ---------- |
| [antigravity-agent.ts](file:///c:/OpenClaw/my-app/lib/services/antigravity-agent.ts) | Main AI agent (12.5KB) — multi-skill orchestration |
| [skill-loader.ts](file:///c:/OpenClaw/my-app/lib/services/skill-loader.ts) | Dynamic skill registry for AI agent |
| [nexus-agent.ts](file:///c:/OpenClaw/my-app/lib/services/nexus-agent.ts) | Nexus integration agent |
| [roi-service.ts](file:///c:/OpenClaw/my-app/lib/services/roi-service.ts) | ROI & financial projection calculator |
| [vector-service.ts](file:///c:/OpenClaw/my-app/lib/services/vector-service.ts) | Embedding / vector search |
| [voice-service.ts](file:///c:/OpenClaw/my-app/lib/services/voice-service.ts) | ElevenLabs voice synthesis |
| [legal-brain.ts](file:///c:/OpenClaw/my-app/lib/services/legal-brain.ts) | Legal risk assessment AI |

### Operational Services

| File | Function |
| ------ | ---------- |
| [firestore-service.ts](file:///c:/OpenClaw/my-app/lib/services/firestore-service.ts) | Generic Firestore CRUD helpers |
| [handoff-service.ts](file:///c:/OpenClaw/my-app/lib/services/handoff-service.ts) | Agent-to-agent handoff logic |
| [asset-encoding.ts](file:///c:/OpenClaw/my-app/lib/services/asset-encoding.ts) | Asset encoding utilities |
| [viewing-engine.ts](file:///c:/OpenClaw/my-app/lib/services/viewing-engine.ts) | Stage 8: Viewing scheduling |
| [MaintenanceMonitor.ts](file:///c:/OpenClaw/my-app/lib/services/MaintenanceMonitor.ts) | System health monitoring |
| [ClosingSimulator.ts](file:///c:/OpenClaw/my-app/lib/services/ClosingSimulator.ts) | Deal close simulation |

### AI Agent Files (`lib/agents/`)

| File | Agent | Stages |
| ------ | ------- | -------- |
| [scribe.ts](file:///c:/OpenClaw/my-app/lib/agents/scribe.ts) | The Scribe | S1, S2 |
| [curator.ts](file:///c:/OpenClaw/my-app/lib/agents/curator.ts) | The Curator | S3, S4, S5 |
| [matchmaker.ts](file:///c:/OpenClaw/my-app/lib/agents/matchmaker.ts) | The Matchmaker | S6, S7, S8 |
| [closer.ts](file:///c:/OpenClaw/my-app/lib/agents/closer.ts) | The Closer | S9, S10 |

---

## 8. API Routes Map

All routes under `app/api/`.

| Route | Method | Purpose | Auth |
| ------- | -------- | --------- | ------ |
| `/api/orchestrate` | POST | Trigger pipeline for a document | `X-SBR-SECRET-KEY` header |
| `/api/ingest` | POST | Raw data intake | — |
| `/api/leads` | POST | Create new lead from landing page | — |
| `/api/matching` | POST | Trigger AI matching for a lead | — |
| `/api/proposals` | GET/POST | CRUD proposals | — |
| `/api/concierge` | POST | Profiling interview endpoint | — |
| `/api/agent/hub` | POST | AI agent chat endpoint | — |
| `/api/sync` | POST | PF sync trigger | — |
| `/api/property-finder` | GET/POST | PF API proxy | — |
| `/api/telegram` | POST | Telegram webhook receiver | — |
| `/api/whatsapp` | GET/POST | WhatsApp webhook (verify + receive) | `WHATSAPP_VERIFY_TOKEN` |
| `/api/webhooks` | POST | Generic webhook receiver | — |
| `/api/wealth` | POST | Financial analysis endpoint | — |
| `/api/openclaw` | POST | AI gateway proxy | — |
| `/api/cron` | POST | Scheduled tasks (stale data cleanup) | `CRON_SECRET` |

---

## 9. Authentication & Authorization

### System: Firebase Auth + Guest Mode

**File**: [AuthContext.tsx](file:///c:/OpenClaw/my-app/lib/AuthContext.tsx)

| Feature | Implementation |
| --------- | --------------- |
| Auth Provider | Firebase Auth (Email/Password) |
| Guest Mode | `isGuest` flag — can browse portal with limited access |
| Inactivity Timeout | 30 minutes → auto sign-out |
| Activity Events | `pointerdown`, `keydown`, `scroll`, `touchstart` reset timer |
| App Check | Optional ReCaptcha Enterprise integration |

### Auth Flow

1. User hits `/portal` → if not authenticated, shows `LoginScreen`
2. User logs in via Firebase → `AuthProvider` sets user state
3. After 30 min inactivity → auto logout
4. Guest mode available for demo purposes

### Role System (UserProfile)

```typescript
role: 'admin' | 'manager' | 'agent'
```

> [!WARNING]
> Currently no server-side role enforcement on API routes. All API auth is via header secret keys. This needs hardening before production.

---

## 10. Bilingual (i18n) System

**File**: [I18nContext.tsx](file:///c:/OpenClaw/my-app/lib/I18nContext.tsx)

| Feature | Implementation |
| --------- | --------------- |
| Languages | English (EN) / Arabic (AR) |
| RTL Support | `dir="rtl"` on container elements |
| Font | `Noto Sans Arabic` (Google Fonts) for AR |
| Storage | `messages/en.json`, `messages/ar.json` |
| Data Model | Every text field has a `fieldAr` counterpart (`title`/`titleAr`, `description`/`descriptionAr`) |

---

## 11. Page-Level Design Briefs (For Designers)

> [!NOTE]
> **This section is for the design team.** It describes WHAT each page needs — functionally and communicatively. The visual design (colors, typography, spacing, animations) is entirely the designer's domain. These are functional requirements, not design specs.

---

### 11.1 Landing Page (`/landing`)

**File**: [landing/page.tsx](file:///c:/OpenClaw/my-app/app/landing/page.tsx)  
**Audience**: External — prospective buyers, investors, cold traffic  
**Language**: Bilingual EN/AR with toggle

#### What This Page Must Communicate

- "This is a premium, institutional-grade real estate firm" — not a classifieds site
- Entry point for lead capture
- Showcase of featured properties

#### Required Sections (Top to Bottom)

1. **Navigation Bar**
   - Brand logo (left)
   - Language toggle (EN/AR)
   - CTA button → Advisor Portal (`/portal`)

2. **Hero Section** (full viewport)
   - Large headline (translated via i18n key: `landing.hero`)
   - Subtitle (i18n: `landing.heroSub`)
   - Primary CTA → scrolls to collection or opens form
   - Scroll indicator

3. **Stats Bar** — 3 metrics:
   - Assets Managed (e.g. "1.2B EGP")
   - Luxury Compounds (e.g. "85+")
   - Average Response Time (e.g. "15 min")

4. **Featured Properties Grid** — 3 to 6 cards:
   - Data source: Firestore `listings` where `isFeatured == true`
   - Fallback: hardcoded 3 properties if DB empty
   - Each card: image, location, title, price

5. **Consultation Section** — Lead capture form:
   - Uses `SmartProfilingForm` component (AI-powered conversational form)
   - Submits to `/api/leads`
   - Success state: confirmation message

6. **Footer**
   - Brand logo
   - Executive contact info (from `SiteConfig`)
   - Links: Telegram Bot, WhatsApp Direct

#### Design Notes for Designers

- This page uses **scroll-driven parallax** (Framer Motion `useScroll`)
- Has architectural SVG wireframe layers that animate on scroll
- Mouse-following gold glow effect exists in the background
- **Must be RTL-compatible** — mirrors for Arabic
- Featured property images come from Firestore Storage (or fallback PNGs)

---

### 11.2 Portal / Dashboard (`/portal`)

**File**: [portal/page.tsx](file:///c:/OpenClaw/my-app/app/portal/page.tsx)  
**Audience**: Internal — agents, managers, admins  
**Auth**: Login required (or Guest mode)

#### Layout Structure

```
┌──────────────────────────────────────────────┐
│  Topbar (logo, user avatar, sign out)        │
├──────────┬───────────────────────────────────┤
│ Sidebar  │  Main Content Area               │
│ (nav)    │  (switches based on activeScreen) │
│          │                                   │
│          │                                   │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

#### Sidebar Navigation Items (16 screens)

| Screen Key | Label | Component |
| ----------- | ------- | ----------- |
| `dashboard` | Dashboard | `DashboardV4` |
| `listings` | Portfolio Assets | `PortfolioAssets` |
| `crm` | CRM Pipeline | `CRMKanban` |
| `leads` | Leads Flow | `LeadsFlow` |
| `clients` | Clients | `ClientsScreen` |
| `reports` | Reports | `ReportsScreen` |
| `team` | Team | `TeamScreen` |
| `protocols` | Action Protocols | `ActionProtocols` |
| `media` | Media Hub | `MediaHub` |
| `experiences` | Site Experiences | `SiteExperiences` |
| `ledger` | Commission Ledger | `CommissionLedger` |
| `sync` | Sync Queue | `DedupeReviewQueue` |
| `processing` | Easy Listing | `EasyListing` (42KB — largest component) |
| `nexus` | Integration Hub | `IntegrationHub` |
| `intelligence` | Market Intel | `MarketIntelligence` |

#### Design Notes for Designers

- **Dashboard** is the default view — should show KPIs, pipeline status, recent activity
- All screens are loaded via **dynamic import** (code splitting)
- Greeting is time-aware ("Good morning", "Good afternoon", "Good evening")
- Mouse glow effect follows cursor across the portal
- Guest users get limited access (demo mode)

---

### 11.3 Operations Dashboard (`/` — root)

**File**: [page.tsx](file:///c:/OpenClaw/my-app/app/page.tsx)  
**Audience**: Internal power users  

#### Layout

- Top nav with 4-stage switcher tabs: `Scribe | Curator | Matchmaker | Closer`
- Main area shows the active agent portal component
- Tabs transition with blur/scale animations

#### Stage Components

| Tab | Component | Status |
| ----- | ----------- | -------- |
| Scribe | `ScribePortal` | ✅ Built |
| Curator | `CuratorPortal` | ✅ Built |
| Matchmaker | — | 🔒 Locked placeholder |
| Closer | — | 🔒 Locked placeholder |

#### Design Notes

- The locked stages show a "LOCKED | AWAITING UPSTREAM SYNC" message
- Search bar in nav for asset search
- This is a **power user interface**, not client-facing

---

### 11.4 Agent Chat Interface (`/agent`)

**File**: [agent/page.tsx](file:///c:/OpenClaw/my-app/app/agent/page.tsx)  
**Audience**: Internal — system administrators, power users

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header: Sierra Estates — INTELLIGENCE PIPELINE [BASE 44]  │
├──────────┬──────────────────────┬───────────────────────┤
│ Sidebar  │  Chat Interface     │  Tactical Monitor     │
│ (4 agent │  (message log +     │  (pipeline visual +   │
│  buttons)│   text input)       │   metrics)            │
│          │                     │                       │
└──────────┴──────────────────────┴───────────────────────┘
```

#### Functional Requirements

- **Agent Selection** (left sidebar): 4 buttons (Scribe, Curator, Matchmaker, Closer)
- **Chat Log** (center): Messages from USER, AGENT, and SYSTEM
- **Chat Input**: Textarea + "TRANSMIT" button
- **Tactical Monitor** (right): 10-step pipeline visualization, active agent description, metrics graph
- Messages sent to `/api/agent/hub` with `{ agentId, message }`
- Switching agents logs a system message

#### Design Notes

- Each agent has a unique accent color
- Background glow changes color based on active agent
- This is styled with CSS Modules (`agent.module.css`, 7.5KB)
- Pipeline steps highlight which stages belong to the selected agent

---

### 11.5 Admin Gate (`/admin`)

**File**: [admin/page.tsx](file:///c:/OpenClaw/my-app/app/admin/page.tsx)  
**Audience**: Administrators only

#### Functional Requirements

- Simple login form: Institutional ID + Security Token
- Currently a **simulation** (shows alert, no real backend auth)
- Back link to public terminal (`/`)
- Status indicators: Node name, connection status

#### Design Notes

- Centered card on dark background
- Dot-grid background pattern
- This needs real admin auth implementation

---

### 11.6 Proposal View (`/proposals/[id]`)

**File**: `proposals/[id]/page.tsx`  
**Audience**: External — shared with leads via unique URL

#### Functional Requirements

- Dynamic route — loads proposal by Firestore ID
- Shows: lead name, curated property cards with match scores
- Each property card: title, price, match score (%), match reason, optional financial analysis (ROI, yield)
- Strategic summary (AI-generated)
- View count tracking
- Optional expiry date

#### Design Notes

- This is a **shareable, public-facing page** — must look institutional
- Should feel like receiving a luxury portfolio from a wealth manager
- No auth required — URL is the access credential

---

### 11.7 Selection Gallery (`/select/[leadId]`)

**File**: `select/[leadId]/page.tsx`  
**Audience**: External — leads reviewing their curated options

#### Functional Requirements

- Loads matched properties for a specific lead
- Tinder-style or gallery interface: swipe through properties
- Actions per property: "Interested" / "Pass" (with optional reason)
- Each interaction is logged to `interactionHistory[]` on the lead document
- Results feed back into the matching engine (Neural Memory)

#### Design Notes

- Mobile-first — this is often sent via WhatsApp
- Must be fast-loading and intuitive
- The `SelectionView.tsx` component handles rendering
- `SmartProfilingForm.tsx` handles the initial profiling questions

---

## 12. Component Inventory

### Operations Components (16 total)

| Component | Size | Purpose |
| ----------- | ------ | --------- |
| `EasyListing.tsx` | 42KB | Full listing creation/edit workflow |
| `IntegrationHub.tsx` | 17KB | API integrations management |
| `CuratorPortal.tsx` | 13KB | Stage 3-5 branding/distribution |
| `CommissionLedger.tsx` | 13KB | Financial tracking |
| `BrokerFeed.tsx` | 12KB | Raw broker message feed |
| `ActionProtocols.tsx` | 11KB | Operational procedures |
| `ScribePortal.tsx` | 9KB | Stage 1-2 intake dashboard |
| `ImageLinkHub.tsx` | 9KB | Image management |
| `MapExplorer.tsx` | 9KB | Leaflet map visualization |
| `SiteExperiences.tsx` | 8KB | Site visit management |
| `MarketIntelligence.tsx` | 8KB | Market data analysis |
| `NormalizationTrace.tsx` | 7KB | Data quality viewer |
| `StaleDataMonitor.tsx` | 6KB | Data freshness alerts |
| `VoucherSystem.tsx` | 5KB | Incentive management |
| `ClosingTerminal.tsx` | 4KB | Deal closing interface |
| `ViewingTerminal.tsx` | 4KB | Property viewing scheduler |
| `FeedbackPortal.tsx` | 4KB | Post-deal feedback |

---

## 13. Integration Points

### Property Finder Sync (Bi-directional)

**Sync Logic**: [sync-engine.ts](file:///c:/OpenClaw/my-app/lib/services/sync-engine.ts)

| Feature | Implementation |
| --------- | --------------- |
| Match by Reference | Exact match → auto-merge |
| Fuzzy Match | Weighted scoring (title 20%, price 15%, location 15%, size 10%, ref# 40%) |
| High Confidence (≥90%) | Auto-merge with editorial override protection |
| Medium Confidence (50-89%) | Sent to Dedup Review Queue (`syncQueue`) |
| Low Confidence (<50%) | Creates new listing |
| Editorial Protection | Fields in `manualOverrides[]` are NEVER overwritten by sync |

### WhatsApp Business API

**Webhook**: `/api/whatsapp` (GET for verification, POST for messages)

Flow:

1. Raw message arrives → `WhatsAppParserService.processIncomingMessage()`
2. Gemini 1.5 Flash parses text → structured JSON
3. Sierra Code generated → DQE duplicate check → saved to `broker_listings`
4. If auto-orchestration enabled → triggers pipeline via `OrchestratorService`

### AI Matching (Gemini)

**Scoring Weights**:

- Neural Alignment (preferences & memory): 30%
- Financial ROI / Capital Appreciation: 40%
- Market Liquidity & Scarcity: 20%
- Strategic Feasibility: 10%

Fallback: If AI is unavailable, uses heuristic scoring (property type + budget + location).

---

## 14. Known Gaps & TODOs

> [!CAUTION]
> These items need attention before production.

| Area | Gap | Priority |
| ------ | ----- | ---------- |
| **Auth** | No server-side role enforcement on API routes | 🔴 Critical |
| **Admin** | `/admin` page is a simulation — no real admin auth | 🔴 Critical |
| **Pipeline** | Matchmaker and Closer portals are locked placeholders | 🟡 Medium |
| **Canvas Engine** | Stage 3 branding (image overlay) is not implemented | 🟡 Medium |
| **Property Finder** | API credentials are placeholder — needs real PF partnership | 🟡 Medium |
| **WhatsApp** | Webhook needs secure domain + Meta verification | 🟡 Medium |
| **Testing** | Zero automated tests | 🟡 Medium |
| **Images** | Landing page featured images use fallback PNGs | 🟢 Low |
| **Voice** | ElevenLabs integration (Leila voice) is stubbed | 🟢 Low |
| **Performance** | `globals.css` is 51KB — needs audit/split | 🟢 Low |

---

## 15. Brand Tokens (Reference Only)

> [!NOTE]
> These tokens are currently hardcoded in `globals.css` and various components. The design team should define the final design system. These are what currently exist in the code:

| Token | Value | Usage |
| ------- | ------- | ------- |
| Navy | `#0A1A3A` / `#0B1A3E` / `#020611` | Primary dark backgrounds |
| Gold | `#C9A24A` / `#C5A059` / `#D4AF37` | Accent, CTAs, highlights |
| Silver | `#E2E8F0` | Secondary text |
| Serif Font | Cinzel (Google Fonts) | Headlines |
| Sans Font | Josefin Sans (Google Fonts) | Body text |
| Arabic Font | Noto Sans Arabic (Google Fonts) | Arabic content |

---

> *This handoff document was generated from a complete codebase audit of `c:\OpenClaw\my-app`. All file references and data are accurate as of April 15, 2026.*
