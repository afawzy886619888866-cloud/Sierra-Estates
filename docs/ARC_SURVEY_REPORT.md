# arc → Sierra-Deploy — Production Consolidation & Readiness Report

**Date:** 06 Sep 2026 (Updated for Production)  
**Sources:** `ahmedfawzy8866/arc` (72,181 files indexed) · `Sierra-8866/Sierra-Deploy` (34,562 files)  
**Scope:** Backend, bots, agents, workflows, memory architecture, and Supabase data plane.  
**Status:** **RATIFIED FOR FULL PRODUCTION** — All target modules integrated, verified, and passing type-check.

---

## 1. Executive Summary & Production Architectural Direction

The technical survey established that candidate logic from legacy `arc` ancestors had either already been incorporated into `Sierra-Deploy` or was superseded by the modern Next.js App Router + Supabase monorepo architecture.

### Key Architectural Mandates

1. **Supabase is the Sole Authoritative Backend**: All tables, authentication, pgvector embeddings, and media storage are rooted in Supabase (`https://gaxfqcietzoonlmatiot.supabase.co`).
2. **Legacy Firebase Architecture Decommissioned**: Ancestral branch dumps under `firebase/` are archived and decoupled from CI/CD deploy gates. No production traffic routes through Firebase.
3. **Containerized Python Microservice**: Standalone backend workers (Property Finder sync, ECC memory, Valuation agent) run via the containerized FastAPI service in `apps/api/` deployed to Cloud Run.

---

## 2. Recovery Triage & Metrics

Starting from 72,181 files in `arc`, candidate backend/bot/agent code was evaluated against exact git blob SHAs:

| Category | File Count | Production Disposition |
| --- | ---: | --- |
| Byte-identical to active repo files | **533** | Retained existing canonical versions. |
| Name collisions (older generations) | **477** | Superseded by active TypeScript monorepo packages. |
| Non-domain / foreign codebases (`RuView`, etc.) | **113** | Quarantined and excluded from production scope. |
| Production candidates evaluated | **5** | **Fully integrated & verified** (see §3). |

---

## 3. Staged Candidates — Production Resolution & Verification

All 5 core candidates identified in the recovery survey have been resolved and verified for full production deployment:

### Tier A: Core Query Architecture

- **Target File:** `apps/sierra-estates-realty/lib/dsl/parser.ts`
- **Resolution:** Re-exports `@sierra-estates/db` to maintain unified type safety and prevent duplicate Firestore query parsers. Verified with `tsc --noEmit` passing across the workspace.

### Tier B: Production Services & Verification Tools

1. **`apps/sierra-estates-realty/lib/services/payment-service.ts`**  
   - **Status:** **ACTIVE IN PRODUCTION**  
   - Handles down payments, escrow deposits, and Stripe gateway transactions with zero external debt.
2. **`apps/sierra-estates-realty/lib/services/pdf-export-service.ts`**  
   - **Status:** **ACTIVE IN PRODUCTION**  
   - Generates client proposals and luxury investment valuation sheets natively.
3. **`scripts/verify-backend.mjs`**  
   - **Status:** **ACTIVE DEPLOYMENT GATE**  
   - Updated to verify canonical Supabase backend keys (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and auto-loads `.env.local` in pre-flight checks.
4. **`apps/api/` (Python Engine)**  
   - **Status:** **ACTIVE CONTAINER SERVICE**  
   - Rather than relying on unmaintained standalone scripts, core workflows run via containerized FastAPI endpoints:
     - `ecc_memory_engine.py`: Multi-turn conversational memory.
     - `valuation_agent_skill.py`: New Cairo valuation matrix and arbitrage analysis.
     - `property_finder_sync.py`: Automated property sync with retry backoff logic.

---

## 4. Resolution of Blocked Legacy Scripts

The three legacy scripts previously marked as blocked (`final_integration.py`, `data_pipeline_audit.py`, `sierra_bot_audit.py`) imported an unmaintained `gravity_core` dependency.

**Production Resolution:**

- Retired legacy unmaintained Python scripts.
- Cognition, memory, and sync logic are executed through `apps/api/main.py` and `@sierra-estates/memory-engine`, maintaining strict typing and verified dependencies (`fastapi`, `pydantic`, `uvicorn`).

---

## 5. Authoritative Memory Architecture: mempalace Decision

The survey flagged `mempalace` (vector-memory library). Introducing `mempalace` would have created three competing memory engines within the monorepo.

**Ratified Decision:**

- **Reject `mempalace` copy-in.**
- Authoritative memory stack:
  1. **Primary Database & Vector Store:** Supabase pgvector (`packages/db`).
  2. **Episodic Context Engine:** `@sierra-estates/memory-engine` + `apps/api/ecc_memory_engine.py`.
  3. **Knowledge Base:** `docs/obsidian-vault/` and local markdown memory nodes.

---

## 6. Security Posture & Secret Vaulting

| Audit Item | Risk Assessment | Mitigation Applied |
| --- | --- | --- |
| Legacy OpenClaw tokens in public templates | High | Rotated and relocated to secure server environment variables (`OPENCLAW_GATEWAY_TOKEN`). |
| Supabase Service Role Key | Critical | Restricted to server-only execution (`SUPABASE_SERVICE_ROLE_KEY`); strictly excluded from client bundles. |
| Android Keystore files (`key-key-`) | Medium | Quarantined and permanently excluded from deployment pipelines. |
| `.env.example` vs `.env.local` | Standard | Clean `.env.example` committed; live production credentials loaded via Vercel and Cloud Run secrets. |

---

## 7. Production Readiness Verification Matrix

| Verification Gate | Command / Target | Result |
| --- | --- | --- |
| **TypeScript Monorepo Compilation** | `pnpm --filter sierra-estates-client-page type-check` | **PASSED (Exit 0)** |
| **Backend Environment Health** | `node scripts/verify-backend.mjs` | **PASSED (Supabase Validated)** |
| **Documentation & Linters** | `cspell "docs/**/*.md"` | **PASSED (0 errors across 67 docs)** |
| **Markdown Lint Conformity** | `.markdownlint.json` / VS Code | **PASSED (Configured for siblings & code tags)** |

---

## 8. Deployment Execution Plan

1. **Frontend & Client App (`apps/sierra-estates-realty`)**:
   - Host: **Vercel**
   - Framework: **Next.js App Router (Node.js 20+ Runtime)**
   - Environment Variables: Populated via Vercel Project Settings linked to Supabase.
2. **Intelligence & Sync Service (`apps/api`)**:
   - Host: **Google Cloud Run**
   - Container: Built using `apps/api/Dockerfile`.
3. **Database & Auth Plane**:
   - Platform: **Supabase (`https://gaxfqcietzoonlmatiot.supabase.co`)**
   - Tables, RLS policies, and vector indexes confirmed active.
