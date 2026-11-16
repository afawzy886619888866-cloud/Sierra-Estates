# @sierra-estates/deepseek-harness

Evaluation, benchmarking, and automated reasoning test harness for Sierra Estates AI Agent operations and real estate tasks.

## Features

- Evaluation of Real Estate AVM pricing accuracy
- Arabic negotiation and lead intent classification
- Multi-agent routing logic verification
- Lease & sales contract clause validation
- RAG & Obsidian unified memory consistency testing

## Usage

```typescript
import { DeepSeekHarness } from '@sierra-estates/deepseek-harness';

const harness = new DeepSeekHarness();
const report = await harness.runFullSuite();
console.log(`Overall Benchmark Score: ${report.overallScore * 100}%`);
```
