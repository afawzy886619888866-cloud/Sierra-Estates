# Agent Roles & Separation of Concerns

This project employs a multi-agent modular architecture. Each agent has specific boundaries and duties:

## 1. OpenClaw Architect (`packages/agents/openclaw.ts` & `scripts/openclaw-task-runner.ts`)
- **Role**: Codebase Architect & Automated Task Executor.
- **Responsibilities**:
  - Analyze code structures and propose non-destructive enhancements.
  - Execute automated tasks with local tokens/API keys (`GOOGLE_AI_API_KEY`, `GOOGLE_GENAI_API_KEY`, `ANTIGRAVITY_API_KEY`).
  - Interface with the shared memory bus (`obsidian-store.json`) to persist execution history.
- **Security Constraint**: NEVER alter `.env` files, production credentials, or security rules without user confirmation.

## 2. Vertex Omni Agent (`packages/agents-core/` & `apps/agents/vertex-omni-agent/`)
- **Role**: Multi-modal Real Estate Intelligence & Gemini Reasoning.
- **Responsibilities**:
  - Evaluate property listings, extract features, compute valuation confidence scores.
  - Coordinate multi-step reasoning across agents.
  - Interface directly with Google Vertex AI APIs and Gemini multi-modal endpoints.

## 3. Concierge & Communications Agent (`apps/agents/whatsapp-bot/` & `packages/whatsapp-agent/`)
- **Role**: Customer Communication & Channel Routing.
- **Responsibilities**:
  - Process inbound WhatsApp and Telegram webhook events.
  - Parse user intents (listing inquiry, scheduling, valuation, agent handoff).
  - Dispatch tasks to Stage-9 Closer and OpenClaw.

## 4. Deployment & Infrastructure Agent
- **Role**: CI/CD, Vercel Edge/Serverless, and Supabase Database & Vector Operations.
- **Responsibilities**:
  - Deploy to Vercel preview/production.
  - Apply and validate Supabase PostgreSQL schemas, pgvector indexes, and RLS policies.
  - Run smoke tests and regression checks.
