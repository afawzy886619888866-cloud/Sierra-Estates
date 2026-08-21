# @sierra-estates/ai-agent-sdk

Unified TypeScript SDK for interacting with Sierra Estates agents, memory engines, and Pub/Sub pipelines.

## Features
- Standard `BaseAgent` class with built-in telemetry, timeouts, and error handling.
- `MemoryClient` for querying and writing episodic/semantic project memory.
- `SierraAgentClient` for orchestrating ad-hoc tasks and receiving structured responses.

## Usage

```typescript
import { SierraAgentClient } from '@sierra-estates/ai-agent-sdk';

const client = new SierraAgentClient();
const response = await client.runTask({
  agentId: 'vertex_omni',
  prompt: 'Value 4-bed penthouse in Uptown Cairo',
  memoryTags: ['valuation', 'uptown-cairo'],
});

console.log(response.data);
```
