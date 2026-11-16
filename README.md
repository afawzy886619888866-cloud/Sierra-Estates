# Sierra Estates Realty — Enterprise AI PropTech Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444?style=flat&logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS%20%26%20Edge%20Proxy-F38020?style=flat&logo=cloudflare)](https://dash.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Supabase-15%2C668%20Units%20(PostgreSQL%20%26%20pgvector)-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-107%20Files%20Passed%20(1%2C072%20Tests)-brightgreen)](https://github.com/afawzy886619888866-cloud/Sierra-Estates)
[![Daemons](https://img.shields.io/badge/PM2%20Daemons-4%20Online%20(:8000%20:2785%20:2786%20:2790)-emerald)](./ecosystem.config.cjs)

> **Sierra Estates** is an enterprise luxury PropTech platform and autonomous brokerage engine operating in **New Cairo / East Cairo, Egypt**. It unites a high-performance Next.js buyer portal, an interactive administrative intelligence suite, Cloudflare edge routing, Supabase PostgreSQL with `pgvector`, Python FastAPI intelligence, Google Sheets two-way synchronization, and an autonomous multi-line WhatsApp & Telegram outreach fleet.

---

## 🗺️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & External Intake"]
        U1["Web Buyers & Sellers"]
        U2["WhatsApp Inbound Leads"]
        U3["Telegram Concierge"]
        U4["Property Finder Webhooks"]
    end

    subgraph Edge["Cloudflare Edge & Security (sierra-estates.net)"]
        CF_DNS["Cloudflare DNS & DDOS Shield"]
        CF_MAIL["Email Routing (route1-3.mx.cloudflare.net)"]
        CF_PROXY["Edge Caching & SSL Termination"]
    end

    subgraph WebSurfaces["Web Applications"]
        CLIENT["Next.js App Router (sierra-estates.net)"]
        ADMIN["Admin Intelligence SPA (admin.sierra-estates.net)"]
        FASTAPI["FastAPI Intelligence Engine (:8000)"]
    end

    subgraph Storage["Authoritative Backend (Supabase)"]
        DB[("Supabase PostgreSQL (15,668 Units)")]
        AUTH["Supabase Auth & RLS Security"]
        VEC["pgvector Embeddings"]
        MEDIA["Supabase Storage (property-media)"]
    end

    subgraph Automation["Local PM2 Daemons"]
        D1["Workflow Runner (:2786)"]
        D2["OpenWA WhatsApp Gateway (:2785)"]
        D3["Sierra Admin Bridge (:2790)"]
        D4["FastAPI Engine (:8000)"]
    end

    U1 --> CF_DNS --> CF_PROXY --> CLIENT
    U1 --> CF_PROXY --> ADMIN
    CF_DNS --> CF_MAIL

    CLIENT --> DB
    CLIENT --> AUTH
    ADMIN --> DB
    ADMIN --> D3

    U2 --> D2
    U3 --> CLIENT
    U4 --> CLIENT

    D2 <--> D1 <--> D4
    D1 <--> DB
    DB --> VEC
    DB --> MEDIA
```

---

## ⚡ Multi-Channel Ingestion & Syndication Pipeline

```mermaid
flowchart LR
    subgraph Intake["1. Intake"]
        WA["WhatsApp Groups / DMs"]
        TG["Telegram Channels"]
        WEB["Public Intake Form"]
        SHEETS["Google Sheets Intake"]
    end

    subgraph Processing["2. AI Parsing & Deduplication"]
        NLP["Gemini Flash & Arabic NLP"]
        NORM["Phone Normalization (+20XXXXXXXXXX)"]
        CODE["Unit Code Generator (SE-SL/SE-RNT)"]
        DEDUP["Dedup Check (Phone + Compound + Price)"]
    end

    subgraph MasterDB["3. Database & Sync"]
        SUPA[("Supabase Master (15,668 Units)")]
        MIRROR["Google Sheets Master Mirror"]
    end

    subgraph Syndication["4. ML Scoring & Publishing"]
        SCORER["LightGBM & Gemini Ad Scorer"]
        PHOTO["Photo Gate (>= 3 HD Photos)"]
        PF["Property Finder Syndication"]
        CONCIERGE["WhatsApp Speed-to-Lead (P0_INBOUND)"]
    end

    WA --> NLP
    TG --> NLP
    WEB --> NLP
    SHEETS --> NLP

    NLP --> NORM --> CODE --> DEDUP --> SUPA
    SUPA <--> MIRROR
    SUPA --> SCORER --> PHOTO
    PHOTO --> PF
    PHOTO --> CONCIERGE
```

---

## 🖥️ Live Production Surfaces & Daemon Matrix

### Web Surfaces (Cloudflare & Supabase)

| Surface | Public URL | Engine / Architecture | Status |
|---|---|---|:---:|
| **Client Luxury Portal** | [sierra-estates.net](https://sierra-estates.net) | Next.js 16.4 App Router (React 19, Tailwind CSS) | 🟢 Configured |
| **Admin Intelligence Console** | [admin.sierra-estates.net](https://admin.sierra-estates.net) | Standalone Executive HTML5/JS Dashboard (`deploy/`) | 🟢 Configured |
| **Supabase Authoritative DB** | `gaxfqcietzoonlmatiot.supabase.co` | PostgreSQL 15, `pgvector`, Auth, Storage (15,668 units) | 🟢 Live |

### Local Production Daemons (PM2 Supervised)

All background services are supervised locally via PM2 ([`ecosystem.config.cjs`](./ecosystem.config.cjs)) with automatic restart and health monitoring:

| Port | Service Name | Entrypoint | Healthcheck Endpoint | Status |
|:---:|---|---|---|:---:|
| **`:8000`** | `sierra-fastapi-engine` | `python ./sierra_webhook.py` | `http://127.0.0.1:8000/health` | 🟢 Online |
| **`:2785`** | `sierra-openwa-gateway` | `node ./apps/agents/whatsapp-multi-session/worker.js` | `http://127.0.0.1:2785/api/health` | 🟢 Online |
| **`:2786`** | `sierra-workflow-runner` | `node ./workflows/runner.js` | `http://127.0.0.1:2786/health` | 🟢 Online |
| **`:2790`** | `sierra-admin-bridge` | `node ./workflows/sierra-admin-bridge.mjs` | `http://127.0.0.1:2790/health` | 🟢 Online |

---

## 🔒 Critical System Invariants

1. **Owner Privacy Lock:** Owner and broker phone numbers are **strictly redacted** from public views (`public_properties_view`) and client-facing API responses. All public inquiries route exclusively to the agency concierge helpline (`+201092048333`).
2. **Supabase is Authoritative:** Supabase PostgreSQL is the single source of truth for inventory, client requests, and lead states. Google Sheets are mirrors.
3. **Canonical Phone & Unit Deduplication:** All Egyptian mobile numbers must pass through `normalizeEgyptianPhone()` into the canonical 11-digit `01xxxxxxxxx` format (`+20XXXXXXXXXX`). Units receive deterministic canonical codes (`SE-SL/SE-RNT-[AREA]-[SERIAL]`).
4. **Rent Ceiling & AVM Guard:** Rental units enforce a maximum monthly ceiling of `400,000 EGP/month`. AVM estimates are computed algorithmically from compound benchmarks and never fabricated.
5. **No Silent Failures:** All side effects (Google Sheets, Telegram notifications, Supabase RPC calls) report explicit boolean success and error payloads.

---

## 🛠️ Verification & Developer Quickstart

```bash
# 1. Check local daemon status
npx pm2 status

# 2. Run repository safety boundary checks
node scripts/check-no-compiled-twins.mjs
node scripts/check-legacy-runtime-boundary.mjs
node scripts/check-public-env-safety.mjs

# 3. Execute Vitest test suite (107 files / 1,072 tests)
pnpm vitest run

# 4. Next.js type check
pnpm --filter sierra-estates-client-page type-check
```

---

## 📚 Core Technical Documentation

- **[Architecture Blueprint (`ARCHITECTURE.md`)](./ARCHITECTURE.md):** In-depth system design, data models, package boundaries, and sequence diagrams.
- **[Cloudflare Setup & DNS Guide (`docs/deployment/cloudflare-setup.md`)](./docs/deployment/cloudflare-setup.md):** Step-by-step custom domain and Cloudflare Email Routing configuration.
- **[Deployment Manual (`DEPLOYMENT.md`)](./DEPLOYMENT.md):** Release procedures, environment hygiene, and operational runbooks.
