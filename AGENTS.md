# Agent Instructions · ierra (`Sierra`)

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
- **Remember** via the Remember command (`/remember`) for non-phase memory checkpoints.

**Important**: Never chain MCD phases. If you complete an EVALUATE phase, you MUST halt tool execution, present your findings and ask the user to authorize `/contract`, which must be authored as milestone-bound board cards via DB/API. Once you complete a CONTRACT phase, you MUST halt tool execution and explicitly wait for the user to authorize the next phase.

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
- **ingest-listings** → [.agents/workflows/ingest-listings.md](.agents/workflows/ingest-listings.md)

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
| Create card | POST | `/api/cards` | `boardId`, `milestoneId`, `listId`, `title`; opt: `priority` (P0-P3), `kind` (task|bug) |
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
```
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


## Agent Registry, I/O Contracts & Critical Invariants

Centralized prompt contracts live in [`prompts/index.ts`](./prompts/index.ts) (mirrored in `apps/sierra-estates-realty/lib/prompts/index.ts`), unified agent handlers live in [`agents/index.ts`](./agents/index.ts), core validators live in [`core/index.ts`](./core/index.ts), and automation status definitions live in [`automations/index.ts`](./automations/index.ts).

| Agent | Role | Prompt ID | Trigger Condition | Input Contract | Output Schema (Zod / Type) |
|---|---|---|---|---|---|
| **PropertyParserAgent** | Extracts structured Arabic/English unit data & owner vs broker source | `property-parser` | WhatsApp group chat paste/stream, Telegram intake, sheet import | `{ rawText, source?, defaultPhone? }` | `PropertyListingExtractionSchema` |
| **UnitCoderAgent** | Generates canonical `SE-<COMP>-<S\|R>-<AREA>-<SUFFIX>` codes | `unit-coder` | Post-extraction or `/add-listing` / `/easy-listing` submit | `{ compound, mode, areaSqm?, phone?, unitNumber? }` | `UnitCodeValidationSchema` |
| **InventoryMatcherAgent** | Matches client requests against available units & computes arbitrage | `inventory-matcher` | New `/request`, `/api/inquiries`, or group demand message | `{ requestId, zone, mode, budgetEgp, candidates }` | `InventoryMatchResultSchema` |
| **LeadQualifierAgent** | Scores lead intent (`HIGH`/`MEDIUM`/`LOW`) & drafts Arabic WhatsApp greeting | `lead-qualifier` | Website inquiry, viewing request, campaign voucher capture | `{ leadId, name, zone, budget }` | `LeadQualificationSchema` |
| **WhatsAppDispatcherAgent** | Generates public group unit reply + private admin phone forward | `owner-reply-classifier` | Group match or closed-loop owner reply webhook | `{ unitCode, compound, unitType, mode, contactPhone, channelSource }` | `{ publicGroupMessage, privateAdminForward, adminRecipient }` |
| **CareerEvaluatorAgent** | Evaluates `/career` candidates across Sales & Admin tracks (`Tier A/B/C`) | `career-evaluator` | `POST /api/careers/apply` or Admin Career Sheet sync | `{ applicationId, role, experienceYears, hasVehicle, achievements }` | `CareerEvaluationSchema` |

### Critical System Invariants (Never Violate)
1. **Public Group Contact Privacy Lock:** `WhatsAppDispatcherAgent` (`formatPublicGroupAutoReply`) MUST restrict WhatsApp group auto-replies strictly to unit details and `unitCode` — NEVER expose owner or broker phone numbers in public/group chats. Forward confidential phone numbers privately ONLY to `01092048333` (`AGENCY_HELPLINE`).
2. **Phone & Unit Deduplication Lock:** All incoming phones must pass through `normalizeEgyptianPhone()` (`core/deduplication.ts`) into 11-digit `01xxxxxxxxx` format and be keyed with canonical compound + area bucket (`buildUnitDedupKey`) before database upsert or Google Sheets append.
3. **Rent Ceiling & Commission Guard:** Rental units use monthly EGP rates (`<= 400,000 EGP`); resale listings store full EGP price. Standard brokerage commission rates and AVM pricing estimates must never be silently fabricated.
4. **Online Spreadsheet Mirrors:** Every customer inquiry (`/request`, `/api/inquiries`, `/api/viewing-requests`) syncs to `Client_Requests` and every job/employee submission (`/career`, `/api/careers/apply`) syncs to `Career_Applications`, both viewable and editable inside `/admin` -> Online Spreadsheet (`RequestsSpreadsheetView`).
5. **No Silent Failures:** All LLM outputs must be validated with `validatePromptOutput(promptId, payload)`, and missing required environment secrets must surface explicitly via `validateEnv()` (`core/env-validator.ts`).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->


---

# Sierra Estates — Platform Agent Guide (Module 1–5 Revision, 2026-11-15)

## Core rules

1. **Supabase is the sole system of record.** Google Sheets tabs are mirrors. A failed Supabase write fails the request — never fake success (`local-*` ids are forbidden; the old dev fallbacks in `/api/inquiries` and `/api/careers/apply` were removed).
2. **No fabricated data** — matchers/feeds return empty sets when sources are unreachable.
3. **Phone normalization**: every intake surface uses `apps/sierra-estates-realty/lib/utils/phone.ts` (`normalizeEgyptianPhone` → `+20XXXXXXXXXX`, Arabic-Indic digits handled; invalid → rejected).
4. **Canonical unit codes**: `lib/server/unit-codes.ts` — `SE-SL/SE-RNT-[AREA]-[SERIAL]`, gazetteer area codes (`HYD`, `MVI`, `MVD`, `PK`…), deterministic serials (re-ingest never mints a second identity). Never random codes.
5. **Telegram HTML escaping** — values pass through `escapeTelegramHtml` (re-exported by `lib/services/TelegramNotifier.ts`).
6. **Honest side effects** — sheet/Telegram writes report `ok:false` + error on failure; no silent `ok:true`.

## Key modules added in this revision

| Concern | File(s) |
| --- | --- |
| Client Request pipeline (Module 2) | `lib/services/ClientRequestPipeline.ts`, `lib/actions/client-request.ts`, `app/api/admin/client-requests/route.ts` |
| Careers pipeline (Module 3) | `lib/actions/career-application.ts`, `components/client/CareerApplicationForm.tsx`, `app/(site)/career/CareerPage.tsx` |
| Add Listing pipeline (Module 4) | `lib/services/AddListingPipeline.ts`, `app/api/listings/add/route.ts`, `components/client/PublicAddListingForm.tsx`, `components/admin/command-center/QuickAddListingDrawer.tsx` |
| Google Sheets v4 writer | `lib/services/GoogleSheetsV4Service.ts` (tab auto-create, append, update-by-key) |
| Telegram notifier | `lib/services/TelegramNotifier.ts` (role lanes: hr / sales_advisor / team_leader / ceo / general) |
| Phone utils | `lib/utils/phone.ts` |

## End-to-end data flow

```
ingestion (web forms / WhatsApp / Telegram / cron)
  → AI parsing (Gemini) & unit coding (unit-codes.ts)
  → dedup (phone + compound + unit-no./BUA ±5% — AddListingPipeline.findDuplicateListing)
  → Supabase persistence (packages/db, service-role)
  → Google Sheets sync (GoogleSheetsV4Service + Apps Script bridge for owner tabs/Drive)
  → Telegram 1-to-1 & group notifications (TelegramNotifier role lanes)
```

## Cache revalidation contract (admin inventory mutations)

`bustInventoryCache()` + `revalidateTag('inventory', 'max')` + `revalidatePath('/admin…')` —
reference implementation in `app/api/listings/add/route.ts` and `app/api/admin/listings/[id]/route.ts`.

## Migrations (this revision)

- `supabase/migrations/20261115_046_client_requests_pipeline.sql` — `client_requests` table + RLS, career scorecard columns (`role_applied`, `work_mode`, `experience_years`, `brokerage`, `cv_file_path`, `scorecard_rating`, `stage`, `stage_notes`), storage buckets (`property-media`, `career-applications`), `whatsapp_lead_sessions` DDL backfill.
- `supabase/migrations/20261115_047_units_views_reproducible.sql` — `units`/`real_available_units` views DDL, `listings.floor`/`listings.availability` + availability↔status trigger, dedup indexes.

## Environment

`.env.example` is canonical. New keys: `GOOGLE_SERVICE_ACCOUNT_KEY` (raw/base64 service-account JSON), `GOOGLE_SHEET_ID`, tab overrides (`CLIENT_REQUESTS_TAB`…), `TELEGRAM_HR_CHAT_ID`, `TELEGRAM_GENERAL_CHAT_ID`.
