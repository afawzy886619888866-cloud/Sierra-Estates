# @sierra-estates/ai-orchestrator

Multi-agent coordination, workflow DAG scheduling, and Pub/Sub event bridge for Sierra Estates PropTech platform.

## Architecture
- **Agent Coordinator**: Fleet health, registration, and concurrency limiter.
- **Workflow Runner**: Step-by-step sequential & DAG multi-agent execution pipeline.
- **PubSub Broker**: GCP Cloud Pub/Sub with automatic Redis/In-Memory fallback for local development.

## Usage

```typescript
import { AIOrchestrator, pubsub } from '@sierra-estates/ai-orchestrator';

const orchestrator = new AIOrchestrator();
const result = await orchestrator.orchestrateListingPipeline({
  rawText: 'Villa Hyde Park 450m2 35M EGP',
  source: 'whatsapp_group',
});

// Subscribe to recommendations
pubsub.subscribe('ai.recommendations', (msg) => {
  console.log('New recommendation received:', msg.payload);
});
```
