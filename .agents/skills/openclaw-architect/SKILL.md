---
name: openclaw-architect
description: Autonomous task execution and architectural agent for Sierra Estates. Use for running codebase analysis, executing tasks with project memory, and managing automated workflows.
---

# OpenClaw Architect Agent Skill

## Overview

OpenClaw is the autonomous AI architect and task executor for Sierra Estates. It bridges high-level developer intentions with programmatic code modifications, project memory retrieval, and multi-model execution.

## Key Capabilities

- **WhatsApp Inventory Harvester**: Uses the `whatsapp-inventory-harvester` skill to scrape and normalize listings across 19 active/archived channels and master sheets into unified inventory.
- **Task Runner**: Execute CLI and programmatic tasks using tokens configured in `.env.local`.
- **Shared Memory Integration**: Grounded in `obsidian-store.json` using `@sierra-estates/obsidian` to recall historical decisions, inventory updates, and past task executions.
- **Architectural Proposal**: Analyzes existing patterns (Next.js 16 App Router, Tailwind CSS, Turbo monorepo) before proposing changes.

## Bulk Ingestion & Harvesting Commands

```bash
# Ingest all WhatsApp channels and master sheets
npx tsx scripts/openclaw-task-runner.ts ingest:all

# Ingest direct owner groups only
npx tsx scripts/openclaw-task-runner.ts ingest:owners

# Ingest archived channels
npx tsx scripts/openclaw-task-runner.ts ingest:archive

# Reconcile unified master inventory dataset
npx tsx scripts/merge-inventory-master.ts
```

### 1. Running a Task via CLI

```bash
pnpm openclaw:task "Summarize recent listing additions and check inventory integrity"
```

### 2. Programmatic Execution in Code

The legacy Airtable constructor fields below are retained only for
compatibility with older agent package versions. They must remain empty in
production; current inventory reads and writes go through Supabase.

```typescript
import { OpenClawAgent } from '@sierra-estates/agents';

const agent = new OpenClawAgent({
  aiApiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
  // Legacy compatibility only; do not configure Airtable in production.
  airtableApiKey: '',
  airtableBaseId: '',
  airtableTableName: 'Listings',
});

// Run task with shared memory grounding
const response = await agent.queryVertexAgent("Perform estate health check");
```

## Security Guardrails

- OpenClaw must never mutate `.env`, `service-account.json`, or security rules without manual approval.
- All mutating actions are recorded to Obsidian memory with tags `['openclaw-execution']`.
