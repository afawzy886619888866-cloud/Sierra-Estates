---
name: openclaw-architect
description: Unified Antigravity ↔ OpenClaw bridge (Windows / Microsoft PC Manager PCMClawUbuntu + C:\Users\Sierr\.openclaw). Delegates human-like executive tasks, WhatsApp harvesting, Stage-9 closing, RAG queries, Memory sync, and Harness evaluations to OpenClaw.
---

# OpenClaw Architect & Human-Executive Bridge Skill

## Architecture: Antigravity + OpenClaw Division of Labor
- **Antigravity (Lean IDE & Architecture Brain):** Owns codebase architecture, TypeScript/Next.js engineering, Supabase migrations, Cloudflare Workers, and MCD protocol governance.
- **OpenClaw (Autonomous Human-Like Operator — 62 Skills):** Owns Windows / Microsoft PC Manager (`PCMClawUbuntu` WSL2 + `C:\Users\Sierr\.openclaw`) autonomous operations, natural Egyptian Arabic/English client & owner proxy (`human-executive-proxy`), 24/7 WhatsApp harvesting (`whatsapp-inventory-harvester`), Stage-9 closing (`sierra-closer-agent`), Cairo AVM valuation (`real-estate-valuation-analyzer`), and 4-Engine runtime execution.

## MCP Bridge (`openclaw` server — `scripts/openclaw-mcp-server.mjs`)
Registered in both `.mcp.json` and `C:\Users\Sierr\.gemini\config\mcp_config.json`:
1. `openclaw_status` — Verifies PC Manager WSL2 (`PCMClawUbuntu`), `C:\Users\Sierr\.openclaw` hub, 62 skills, 4-Engine wiring, and local daemons (`:2785`, `:2786`, `:2790`, `:5678`, `:8000`).
2. `openclaw_delegate_task` — Delegates autonomous or human-proxy tasks to OpenClaw (routes to `PCMClawUbuntu` when running, with seamless fallback to `scripts/openclaw-task-runner.ts`).
3. `openclaw_rag_query` — Searches live New Cairo inventory (`real-listings.json` / Supabase) with automatic owner-phone privacy lock.
4. `openclaw_memory_rw` — Reads/writes shared episodic memory across `C:\Users\Sierr\.openclaw\memory\episodic.jsonl` and `packages/obsidian/obsidian-store.json`.
5. `openclaw_harness_eval` — Validates draft messages and listings against Sierra invariants (public group privacy lock, rent ceiling `<= 400,000 EGP/mo`).
6. `openclaw_skills_catalog` — Lists all 62 external and Sierra skills available inside OpenClaw.
7. `openclaw_pc_sync` — Mirrors `SOUL.md`, `USER.md`, and all 62 skills into `PCMClawUbuntu` (`~/.openclaw`).

## 4-Engine Wiring
- **Engine 1 (Memory):** `packages/obsidian/obsidian-store.json` + `C:\Users\Sierr\.openclaw\memory\episodic.jsonl` + ECC Memory Engine.
- **Engine 2 (RAG & GIS):** Supabase Postgres (`listings`, `real_available_units`) + `apps/sierra-estates-realty/data/real-listings.json` + `sierra-map-agent`.
- **Engine 3 (Harness & Valuation):** `packages/deepseek-harness` + `real-estate-valuation-analyzer` + invariant gates.
- **Engine 4 (Workflows & Closer):** OpenWA (`:2785`), Workflow Runner (`:2786`), Admin Bridge (`:2790`), n8n (`:5678`), Sierra Webhook (`:8000`).

## CLI Commands
```bash
pnpm openclaw:task "Summarize recent listing additions and check inventory integrity"
npx tsx scripts/openclaw-task-runner.ts ingest:all
npx tsx scripts/openclaw-task-runner.ts ingest:owners
```

## Security Guardrails
- Never expose owner/broker phone numbers in public/group chats (route privately to `01092048333` only).
- Never mutate `.env`, `service-account.json`, or security rules without explicit approval.
- Record all delegated executions to shared episodic memory (`openclaw-execution`).
