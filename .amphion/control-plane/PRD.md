# Product Requirements Document (PRD) · Sierra Estates

## 1. Product Overview

Sierra Estates delivers an end-to-end luxury proptech monorepo powering the high-net-worth real estate corridor in New Cairo. The platform combines a public high-fidelity client portal, an operations-grade Admin Command OS, and a 7-layer autonomous agent architecture.

## 2. Core Functional Requirements

### 2.1 Multi-Agent Fleet & Orchestration

- **Titan Vertex AI Agent**: Multi-modal spatial analysis, compound trend prediction, and GenAI Search retrieval grounding.
- **OpenClaw WhatsApp Scraper**: Unstructured Egyptian-Arabic broker broadcast ingestion with regex heuristic and entity parsing.
- **DeepSeek Reasoning Harness**: 5-scenario evaluation suite testing AVM pricing, Arabic intent matching, contract verification, and long-term memory retrieval.
- **Stage-9 Closer**: Instant contract drafting, milestone-bound escrow generation, and CRM stage progression.
- **Leila Bilingual Concierge**: High-agency Arabic/English dialogue management with cultural nuance and Gulf investor negotiation.

### 2.2 Memory Engine & State Persistence

- **Obsidian Memory Engine**: Tag-indexed, persistent JSON storage for cross-session agent context, system checkpoints, and task handoffs.
- **Pub/Sub Broker**: Distributed asynchronous message distribution with local event bus fallback.

### 2.3 Command Deck & Admin Portal

- **Fleet Telemetry & Needs Matrix**: Real-time heartbeat tracking, missing credential diagnosis with one-click resolution links, and interactive agent simulator.
- **Role-Based Access Control (RBAC)**: Enforced roles (`admin`, `manager`, `agent`, `auditor`) matching `docs/roles.md`.
- **Live Chat Manager & Proxy**: Direct internal inference interface routing through `/api/internal/chat`.

### 2.4 Data Syndication & Authoritative Database
- **PropertyFinder API Gateway**: Automated catalog sync mapping external feeds into unified compound schemas.
- **Supabase PostgreSQL & pgvector Engine**: Sole authoritative datastore with real-time subscriptions, RLS policies, and pgvector semantic similarity search.

### 2.5 Interactive Spatial Intelligence & Masterplans Engine
- **Compound Boundary Polygons**: High-precision GPS polygon boundaries for key New Cairo masterplans (Mivida, Hyde Park, Mountain View, Katameya Heights, Eastown, Villette, Swan Lake, etc.).
- **District & Phase Inspection**: Multi-phase boundary mapping, amenity overlays (golf, lagoons, international schools), and live inventory synchronization.
- **Deterministic Luxury Media**: Algorithmic image resolution mapping high-res architectural photos without duplication or layout shifts.

### 2.6 WhatsApp Lead Concierge & Inventory Harvester
- **Automated WhatsApp Pipeline**: Harvester for broker broadcasts and direct owner listings, extracting price, BUA, bedrooms, and compound codes into the master inventory.
- **Bilingual Lead Concierge**: High-agency WhatsApp/Telegram conversational agent for client qualification, automated inquiry intake, and CRM synchronization.

### 2.7 Grounded Audio & NotebookLM Briefing Engine
- **NotebookLM Real Estate Briefing**: Citation-grounded compound guides, market trends, and automated podcast-style audio overviews.

## 3. Non-Functional Requirements

- **Performance**: Edge-rendered Next.js App Router pages with < 1.2s Largest Contentful Paint (LCP) and sub-500ms p95 API latency.
- **Security**: Strict environment isolation, Supabase PostgreSQL RLS, token-validated internal routes (`/api/internal/*`), and zero client-side service keys.
- **Reliability**: 100% CI pass rate with zero unhandled exceptions.

