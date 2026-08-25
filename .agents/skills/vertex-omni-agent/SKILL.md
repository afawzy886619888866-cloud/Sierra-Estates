---
name: vertex-omni-agent
description: Google Vertex AI and Gemini multi-modal reasoning agent for real estate property analysis, multi-agent memory coordination, and property matching.
---

# Vertex Omni Agent Skill

## Overview

Sierra Estates has two separate things named "Vertex," which this doc used
to conflate — they don't call each other and aren't interchangeable:

1. **`VertexAgent`** (`packages/agents-core/src/vertex-agent.ts`) — a generic,
   configurable TypeScript wrapper around the Vertex AI / Gemini SDK
   (`@google/genai`). It's a building block other TS agents instantiate with
   their own `name`/`systemInstruction`/`tools`; OpenClaw
   (`packages/agents/openclaw.ts`, `scripts/openclaw-task-runner.ts`,
   `scripts/vertex-agent-runner.ts`) is its main consumer today.
2. **`apps/agents/vertex-omni-agent/`** — a standalone Python/FastAPI
   microservice running a single persona ("Titan," the Sierra Estates COO
   agent) with its own tool-execution loop (`agent_core.py`'s
   `run_agent_turn` dispatches to `tools/executor.py`) and its own
   `/agent/run` and `/webhook/whatsapp` endpoints. Not deployed anywhere as
   of this writing — see its own module docstrings.

If you're building a new TS agent that needs Vertex/Gemini reasoning, use
`VertexAgent`. If you're extending Titan's persona/tools, work in
`apps/agents/vertex-omni-agent/`. Neither replaces the other.

## Architecture

- **`VertexAgent`**: `packages/agents-core/src/vertex-agent.ts`.
- **Titan (Python service)**: `apps/agents/vertex-omni-agent/`.
- **Memory Store**: Integrates with `obsidian-store.json` via `@sierra-estates/obsidian`.
- **Reasoning**: Evaluates multi-modal inputs (property images, PDFs, compound blueprints, financial spreadsheets).

## Common Operations

### 1. Evaluate Property Listing

```typescript
import { VertexAgent } from '@sierra-estates/agents-core';

const vertex = new VertexAgent({
  name: 'valuation-evaluator',
  systemInstruction: 'Analyze real estate comps in New Cairo and score property value.',
});

const result = await vertex.executeTask("Evaluate compound 5th Settlement ROI and pricing spread");
```

### 2. Multi-Agent Coordination

Vertex Omni Agent serves as the reasoning backbone for:

- Concierge WhatsApp bot lead scoring.
- Stage-9 Closer inventory matching.
- OpenClaw architectural task synthesis.
