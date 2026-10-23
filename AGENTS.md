# Agent Instructions · Sierra (`Sierra`)

This project uses the MCD protocol for deterministic AI alignment and safety.

## Protocol Entrance

Before performing any task, the agent must identify the current phase and load the appropriate command from `.amphion/control-plane/mcd/`.

## Core References

- [Governance Guardrails](.amphion/control-plane/GUARDRAILS.md)
- [MCD Playbook](.amphion/control-plane/MCD_PLAYBOOK.md)

## Workflow

1. **Research** via the Evaluate command.
2. **Plan** via the Contract command.
3. **Build** via the Execute command.
4. **Finalize** via the Closeout command.

## Utility Commands

- **Help** via the Help command (`/help`): [HELP.md](.amphion/control-plane/mcd/HELP.md) (authority: `.amphion/control-plane/MCD_HELP_SOURCE.md`).
- **Remember** via the Remember command (`/remember`): [REMEMBER.md](.amphion/control-plane/mcd/REMEMBER.md) for non-phase memory checkpoints.

**Important**: Never chain MCD phases. If you complete an EVALUATE phase, you MUST halt tool execution, present your findings and ask the user to authorize `/contract`, which must be authored as milestone-bound board cards via DB/API. Once you complete a CONTRACT phase, you MUST halt tool execution and explicitly wait for the user to authorize the next phase.

## Owner-Approved Autonomous Execution Mandate (2026-10-19) — Scoped Exception

The repository owner issued a written **Autonomous End-to-End Execution Mandate**
(Owner Acquisition → Verified Inventory → Connected Systems → Property Finder →
Notifications). Its authoritative records live in
`docs/obsidian-vault/Active-Execution-Mandate.md`,
`docs/obsidian-vault/Active Execution Plan.md`, and
`docs/BASELINE_AUDIT_2026-10-19.md`.

**Within the mandate's scope** (the primary operating loop it describes and the
repairs it requires), the phase-halt rule above is superseded: the executing
agent may evaluate → contract → execute → closeout autonomously in one run,
without halting for per-phase authorization, because the mandate itself is the
standing authorization. Phase gates are recorded in the Active Execution Plan /
Active-Execution-Mandate memory files instead.

**Outside the mandate's scope**, the MCD phase-stop rule above applies
unchanged. The exception covers THIS mandate only; any unrelated task reverts
to the standard MCD phase-halt workflow.

**Constraints that apply WITHOUT exception:**

1. **No fabricated Command Deck records.** If the Command Deck API is
   unreachable (resolve the port from `.amphion/config.json`, default 8888),
   do NOT fabricate board records, SQLite writes, or filesystem substitutes.
   Report via repository files (docs/, worklog) and say so — a missing board
   state is honest, a fabricated one is not.
2. **No fabricated data** (§21 no-fabrication policy stands).
3. Mandate-scope changes to production data still require the normal
   verification gates (lint / type-check / test:ci / RLS tests).

## Workflow Routing

To invoke a slash command, read the corresponding workflow file:

- **evaluate** → [.agents/workflows/evaluate.md](.agents/workflows/evaluate.md)
- **contract** → [.agents/workflows/contract.md](.agents/workflows/contract.md)
- **execute** → [.agents/workflows/execute.md](.agents/workflows/execute.md)
- **closeout** → [.agents/workflows/closeout.md](.agents/workflows/closeout.md)
- **help** → [.agents/workflows/help.md](.agents/workflows/help.md)
- **remember** → [.agents/workflows/remember.md](.agents/workflows/remember.md)
- **docs** → [.agents/workflows/docs.md](.agents/workflows/docs.md)
- **bug** → [.agents/workflows/bug.md](.agents/workflows/bug.md)

## Product Manager Experience

1. **Proactive Guidance**: If the user starts a session without a specific request, proactively ask them if they want to improve their Project Charter / PRD, or if they have an idea to start the first MCD cycle.
2. **Observability**: Always keep the Command Deck updated by creating/updating contract cards in the active milestone.

## Command Deck API

**ALL board writes MUST use the Command Deck API. Direct SQLite writes, Python scripts, and filesystem substitutes are non-canonical and violate GUARDRAILS write-boundary policy.**

Resolve API location:

1. Read `port` from `.amphion/config.json`.
2. If `port` is missing or config.json does not exist, run `/amphion` to configure the workspace.
3. Base URL is `http://127.0.0.1:{resolvedPort}`.

All write operations use MCP bridge tools when available. Tool schemas carry full payload definitions (enum, required fields, constraints) — no need to call conventions before writes.

If MCP tools are unavailable, fall back to the REST API:

| Action | Method | Route | Required Fields |
|---|---|---|---|
| Read state | GET | `/api/state` | — |
| Find (board map) | GET | `/api/find` | — (optional: `?q=`, `?milestoneId=`, `?list=`) |
| Create chart | POST | `/api/charts` | `boardId`, `title`; opt: `markdown`, `description` |
| Create milestone | POST | `/api/milestones` | `boardId`, `title`, `code` |
| Create card | POST | `/api/cards` | `boardId`, `milestoneId`, `listId`, `title`; opt: `priority` (P0-P3), `kind` (task\|bug) |
| Update card | PATCH | `/api/cards/{id}` | `boardId`; opt: `listId`, `title`, `priority`, `kind` |
| Move card | POST | `/api/cards/{id}/move` | `listId` |
| Delete card | DELETE | `/api/cards/{id}` | — |
| Write findings | POST | `/api/milestones/{id}/artifacts` | `boardId`, `artifactType:findings`, `title`, `summary`, `body` |
| Write outcomes | POST | `/api/milestones/{id}/artifacts` | `boardId`, `artifactType:outcomes`, `title`, `summary`, `body` |
| Write memory | POST | `/api/memory/events` | `memoryKey`, `value`, `sourceType`, `eventType:upsert` |
| Query memory | GET | `/api/memory/query` | `?q=` (key prefix) |

## Discrete Context Windows

Each MCD contract card is a discrete context window. Treat each card as an isolated task.

**Task start (fresh session):**

1. `GET /api/find` (or `GET /api/state`) to resolve active board + milestone.
2. `GET /api/memory/query?key=task.{issueNumber}.handoff` to load prior handoff state if it exists.

**Task completion (before ending session):**

```http
POST /api/memory/events
{
  "memoryKey": "task.{issueNumber}.handoff",
  "eventType": "upsert",
  "sourceType": "verified-system",
  "bucket": "ref",
  "ttlSeconds": 604800,
  "value": {
    "issueNumber": "...",
    "cardTitle": "...",
    "completedAt": "...",
    "outcomeArtifactId": "... or null",
    "summary": "1-2 sentence completion summary",
    "residualNotes": "anything the next session should know"
  }
}
```

<!-- BEGIN AWS Agent Toolkit rules -->
## AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If a deployment URL returns a Vercel Deployment Protection 401/403, retry the same URL with `vercel curl <url>`; don't disable protection or manage bypass secrets manually
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
