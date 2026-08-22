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

### 2.4 Data Syndication & Integration
- **PropertyFinder API Gateway**: Automated catalog sync mapping external feeds into unified compound schemas.
- **Airtable / Firestore Dual-Sync**: Resilient database synchronizer with schema validation and rate limiting.

## 3. Non-Functional Requirements
- **Performance**: Edge-rendered App Router pages with < 1.2s Largest Contentful Paint (LCP).
- **Security**: Strict environment isolation, token-validated internal routes (`/api/internal/*`), and App Check enforcement.
- **Reliability**: 100% CI pass rate with zero unhandled exceptions.
