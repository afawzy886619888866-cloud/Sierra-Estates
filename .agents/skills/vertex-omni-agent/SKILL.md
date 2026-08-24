---
name: vertex-omni-agent
description: Google Vertex AI and Gemini multi-modal reasoning agent for real estate property analysis, multi-agent memory coordination, and property matching.
---

# Vertex Omni Agent Skill

## Overview

The Vertex Omni Agent provides enterprise AI capabilities to Sierra Estates using Google Vertex AI and the Gemini model suite. It manages property evaluation, valuation confidence metrics, and shared vector memory.

## Architecture

- **Location**: `packages/agents-core/src/vertex-agent.ts`, `apps/agents/vertex-omni-agent/`
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
