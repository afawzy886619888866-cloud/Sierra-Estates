# 01 — Gravity Memory pipeline (logic spec)

**Source (arc):** `sierra-blu-platform/02_Data_Ingestion/final_integration.py`, `16_Investigation_Report/data_pipeline_audit.py`, `16_Investigation_Report/sierra_bot_audit.py`
**Code preserved verbatim in:** `FUTURE_PLAN/blocked-code/` (does NOT run — missing dependency)
**Blocker:** all three import `memory.gravity_core.GravityMemory` from a `11_Core_Intelligence/` package that exists in neither arc nor Sierra-Deploy. Also missing project deps: `gspread`; `sierra_bot_audit.py` additionally needs `config.SIERRA_PERSONA`.

## The logic worth keeping

**A. final_integration.py — "Data Ingestion v-final"**
1. Load property spreadsheet data via pandas.
2. Push structured records to Firestore via firebase_admin.
3. Enrich records with Gemini (`google.generativeai`).
4. Write every ingestion event into GravityMemory so the bot "remembers" what entered the system and when.

**B. data_pipeline_audit.py — "Pipeline V5.0, fuzzy-logic ingestion"**
1. Pull raw rows from Google Sheets (gspread).
2. Fuzzy-parse Arabic/English mixed listing text with regex heuristics (price, compound, bedrooms).
3. Deduplicate against previously-seen records held in GravityMemory.
4. Emit an audit report of rejected/ambiguous rows.

**C. sierra_bot_audit.py — "SIERRA MASTER BOT V12 audit"**
Instantiates SierraBot(persona=SIERRA_PERSONA, memory=GravityMemory) and runs a self-audit: memory recall counts, persona consistency, response-latency sampling.

## GravityMemory interface (reconstructed from call sites)
- `GravityMemory(path_or_config)` — persistent store
- `.remember(event: dict)` / `.recall(query, k)` — write / semantic read
- `.seen(record_hash) -> bool` — dedupe check

## Apply-when
- Option 1: locate `11_Core_Intelligence/` on F:\arc or a local disk → wire as `packages/gravity-memory` and un-block all three scripts.
- Option 2: reimplement the interface above on top of the EXISTING `packages/open-memory` (preferred — avoids a new memory system). ~1 day of work: adapter class + swap import.

**Modern equivalents already in repo:** `/api/cron/ingest-from-sheets` + `SheetsIntegrationService` + `listing-normalize.ts` cover A/B partially, but WITHOUT the memory-backed dedupe (step B3) — that idea is the genuinely new part.
