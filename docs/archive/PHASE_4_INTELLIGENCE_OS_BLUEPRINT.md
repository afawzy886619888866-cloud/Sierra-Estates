# Sierra Estates — Phase 4: Intelligence OS Blueprint

Architecture, Multi-Agent Orchestration, and Predictive Analytics Foundation.

---

## 1. Executive Summary

Phase 4 delivers the **Intelligence OS** for Sierra Estates. It transforms the administrative platform into an autonomous, AI-driven operating system capable of:

- Multi-modal natural language command processing across English and Egyptian Arabic.
- Real-time predictive analytics on deal closing probability, compound ROI, and lead lifetime value.
- Multi-agent orchestration through `@sierra-estates/agents-core` powered by Gemini 2.5 Pro / 2.0 Flash and Vertex AI.
- Persistent spatial neural memory via `@sierra-estates/memory-engine` and Obsidian Memory.

---

## 2. Multi-Agent Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Operator Prompt                        │
│            ("Approve wellness enrollments with >90% CLV")   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Agent Workflows Router     │
               │   (runIntelligenceWorkflow)   │
               └───────────────┬───────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Orchestrator │       │   Backend    │       │   Quality    │
│ (NLP Intent) │──────▶│  Specialist  │──────▶│  Inspector   │
└──────────────┘       │ (ML Scoring) │       │ (Thresholds) │
                       └──────────────┘       └───────┬──────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  Doc Writer  │
                                              │ (Audit/Logs) │
                                              └──────────────┘
```

---

## 3. Core Multi-Agent Fleet

| Agent Persona | Role & Domain | Engine / Model | Trigger / Endpoint |
| :--- | :--- | :--- | :--- |
| **`orchestrator`** | Intent parsing & task decomposition | Gemini 2.5 Pro / Vertex AI | `/api/orchestrate` |
| **`backend-specialist`** | ML scoring & segmentation | Python API / Scikit-learn | `/api/wealth/roi` |
| **`quality-inspector`** | Safety verification & RBAC guard | Deterministic Rule Guard | `firestore.rules` |
| **`documentation-writer`** | Bilingual notification generation | Gemini 2.0 Flash | `/api/admin/whatsapp/send` |
| **`liela-bot`** | Conversational real estate concierge | Gemini 2.0 Flash + Memory | `/api/chat` |
| **`scribe-agent`** | Canonical SBR uniform code normalization | Rule Engine + LLM | `/api/admin/ingest` |
| **`curator-agent`** | AVM pricing & automated portfolio curation | Valuation Matrix | `/api/pricing/evaluate` |
| **`closer-agent`** | Deal follow-ups & negotiation assistance | Omnichannel Hub | `/api/closer/initiate` |

---

## 4. API Endpoints

### 4.1 Orchestrate Intelligence Workflow

```typescript
import { AgentOrchestrator, AgentWorkflows } from '@sierra-estates/agents-core';

export async function POST(req: Request) {
  const { command } = await req.json();
  const orchestrator = new AgentOrchestrator();
  const workflows = new AgentWorkflows(orchestrator);

  const results = await workflows.runIntelligenceWorkflow(command);
  return Response.json({ success: true, stages: results });
}
```

### 4.2 Bot Status & Commands

- `GET /api/admin/bots`: Returns telemetry, error rates, pulse timestamps, and configuration for all 10 active bots.
- `POST /api/admin/bots`: Dispatches control signals (`start`, `stop`, `restart`, `run_now`) to background workers.

---

## 5. Security & Verification

1. **RBAC Enforcement**: All Intelligence OS APIs require verified staff JWT tokens with `admin` or `manager` roles (`verifyAdminRequest`).
2. **Deterministic Fallbacks**: In offline or degraded network conditions, deterministic scoring models ensure continuous business operation.
3. **Audit Trails**: Every executed agent action writes an immutable record to the `audit_logs` collection.

---

## 6. Success Metrics

- **Latency**: <500ms P95 response time for NLP query classification.
- **Accuracy**: >90% precision on compound and listing intent matching.
- **Reliability**: Zero silent failures via exponential backoff and dead-letter queues.
