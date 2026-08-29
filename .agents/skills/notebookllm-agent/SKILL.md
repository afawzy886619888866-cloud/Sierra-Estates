---
name: notebookllm-agent
description: Grounded multi-source research, citation verification, study guide creation, and NotebookLM-style Audio Overview podcast briefing generation for Sierra Estates.
---

# NotebookLM Grounded Knowledge & Audio Briefing Skill

## Overview

The `notebookllm-agent` provides Google NotebookLM capabilities specifically tailored for Sierra Estates real estate intelligence:

1. **Strict Source Grounding & Citation Verification**: Query across multiple heterogeneous real estate documents (developer PDF brochures, compound masterplans, Excel inventory archives, WhatsApp owner negotiations, and contracts) with direct verbatim citation attribution.
2. **Audio Overview Generation**: Automatically generate 2-person Deep Dive podcast scripts (Host & Financial Analyst) discussing compound yields, payment structures, and market arbitrage.
3. **Investment Memorandum & Study Guide Synthesis**: Distill complex 50-page developer agreements and payment matrices into executive memos.

## TypeScript Architecture

- **Engine**: [`NotebookLMEngine`](file:///h:/last/Main/SE-Vercel-deploy-main/packages/agents-core/src/notebookllm-engine.ts)
- **Export**: `@sierra-estates/agents-core`

## Usage Examples

### 1. Grounded Q&A with Citation Provenance

```typescript
import { NotebookLMEngine, SourceDocument } from '@sierra-estates/agents-core';

const engine = new NotebookLMEngine();

const sources: SourceDocument[] = [
  {
    id: 'mivida-brochure-2026',
    title: 'Emaar Mivida Masterplan & Resale Guideline',
    type: 'pdf',
    content: 'Mivida standalone villas in Crescent Park average 120,000 EGP per sqm with immediate delivery...',
  },
  {
    id: 'hyde-park-excel-inventory',
    title: 'Hyde Park New Cairo Master Inventory',
    type: 'excel',
    content: 'Unit HP-VL-01: 480 sqm villa listed at 28.5M EGP (59,375 EGP/sqm). Owner open to 10% cash discount.',
  }
];

const result = await engine.queryGroundedSources(
  sources,
  'Compare the price per square meter between Mivida Crescent Park and Hyde Park villas.'
);

console.log('Answer:', result.answer);
console.log('Direct Citations:', result.citations);
console.log('Grounding Score:', result.groundingScore);
```

### 2. Generate an Audio Overview Podcast Script

```typescript
import { NotebookLMEngine } from '@sierra-estates/agents-core';

const engine = new NotebookLMEngine();

const episode = await engine.generateAudioOverview(
  sources,
  'Golden Square vs 5th Settlement Villa Yield Arbitrage'
);

console.log('Podcast Title:', episode.title);
console.log('Dialogue Turns:', episode.script);
```
