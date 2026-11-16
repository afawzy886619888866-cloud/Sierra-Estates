---
name: ecc-memory-engine
description: Episodic Context Cache (ECC) and Entity Graph Memory Engine for Sierra Estates. Tracks multi-turn buyer/owner episodes, historical price reductions, and entity relationships.
---

# Episodic Context Cache (ECC) Memory Skill

## Purpose

Equips Sierra Estates agents with a 3-tier memory model:

1. **Working Memory (Hot)**: Real-time active chat session cache and active filter tracking.
2. **Episodic Memory (Warm)**: Chronological journal of price drops, negotiation rounds, and viewing feedback.
3. **Semantic Entity Graph (Cold)**: Graph of Buyers, Owners, Properties, and transaction states.

---

## Key Capabilities

### 1. Automated Price Reduction Tracking

Detects when an owner drops their asking price on a unit across WhatsApp channels and flags urgent distressed deals (`drop >= 8%`).

### 2. Buyer Profile & Matchmaking Memory

Remembers buyer budgets, preferred compounds, and bedroom requirements to automatically trigger notifications upon new inventory arrival.

### 3. Chronological Episode Journal

Stores timestamped negotiation and inspection episodes with exponential recency decay weighting.

---

## Programmatic Usage

### TypeScript and Node.js

```typescript
import { eccMemory } from '@sierra-estates/agents';

// Track an owner price reduction
const result = eccMemory.trackPriceReduction(
  'SE-MV-401',
  40000000,
  36000000,
  'WhatsApp Group #4 (Owners Direct)',
  'Ahmed Mansour'
);

console.log(result.dropPct); // 10.0%
console.log(result.isHotDeal); // true
```

### Python

```python
from ecc_memory_engine import EpisodicContextCache

ecc = EpisodicContextCache()
res = ecc.track_price_reduction("SE-MV-401", 40000000, 36000000, "Group #4")
print(res["dropPct"])  # 10.0%
```
