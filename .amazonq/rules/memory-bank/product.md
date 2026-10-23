# Sierra Estates — Product Overview

## Project Purpose & Value Proposition

Sierra Estates is a **luxury PropTech platform** targeting the New Cairo real estate market. It automates the full investment lifecycle — from lead capture via WhatsApp/Telegram to AI-driven matching, proposal generation, and deal closing — replacing manual broker workflows with an intelligent multi-agent pipeline.

Firebase project: **`sierra-blu`** | Deployed on: **Vercel** (Next.js app) + **Google Cloud** (Firebase Functions, Cloud Run)

---

## Key Features & Capabilities

### Intelligence Pipeline (S1–S10 Stages)
- **Scribe Agent (S1/S2):** Ingests raw WhatsApp group messages → structured `rawScrapeData` in Firestore
- **Curator Agent:** Normalizes and enriches property data
- **Matchmaker Agent (S6/S7/S8):** AI-powered buyer–property matching engine
- **Stage 9 Closer Agent:** Automated deal-closing sequences with Telegram alerts + PDF proposals
- **Orchestrator:** Full pipeline trigger via `/api/orchestrate`

### API Surface (82 Routes)
- Property listings, sync, and PropertyFinder gateway
- Lead management, viewing requests, CRM
- WhatsApp & Telegram webhook handlers
- Admin deploy trigger, agent hub, proposals
- Wealth/ROI calculators, inventory management

### Integrations
- **WhatsApp** (Meta Cloud API + Twilio) — inbound scraping + outbound messaging
- **Telegram** — deal alerts and bot handler
- **PropertyFinder** — bidirectional sync with HMAC-verified webhooks
- **Google Sheets / Airtable** — data sync pipelines
- **n8n** — external workflow automation (owner search, email, unit adder)
- **ElevenLabs** — voice service (Leila AI voice)
- **Arize Phoenix** — LLM observability / tracing (OpenTelemetry)
- **Upstash Redis** — rate limiting and queue management
- **Google Vertex AI** — agent reasoning and execution

### Memory & AI
- **ObsidianMemory / SharedMemoryBus** (`@sierra-estates/obsidian`) — persistent JSON-backed memory shared across all agents
- **Google Generative AI (Gemini)** — primary LLM for agents
- **OpenClaw** — external AI orchestration service
- **MCP Servers** — DocuSign, Stripe, Stage-9, WhatsApp messaging, Sierra Deals

### Admin & Client Portals
- Admin console (Next.js route group `/admin`) — currently active
- Client portal (`/app/(client)/`) — intentionally removed, pending new design
- Houzez-style property portal components

---

## Target Users

| User | Use Case |
|------|----------|
| **Real estate brokers** | Monitor WhatsApp deal flow, manage leads, track pipeline |
| **Investment clients** | Browse luxury properties, request viewings, get ROI projections |
| **Platform admins** | Deploy, monitor agents, manage Firestore data, sync PropertyFinder |
| **AI agents** | Autonomous deal qualification, matching, and closing |

---

## Current Status

- **Backend:** Fully intact — all 82 API routes, Firebase Functions, Python service, WhatsApp/PropertyFinder workers
- **Frontend:** Client-facing UI intentionally removed for redesign (see `NEXT_STEPS.md`)
- **Admin UI:** Active at `/admin` route
- **Deployment:** Vercel (GitHub Actions `deploy-vercel.yml`) — Vercel native git auto-deploy is **disabled**
