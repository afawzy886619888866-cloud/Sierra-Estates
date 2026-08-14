# arc → Sierra-Deploy — Survey & Recovery Report

**Date:** 19 Jul 2026
**Sources:** `ahmedfawzy8866/arc` (72,181 files indexed) · `Sierra-8866/Sierra-Deploy` (34,562 files)
**Scope:** backend, bots, agents, workflows only. **No frontend file was read for merge, staged, or modified.**
**Status:** Survey complete. 5 files staged for your approval. **Nothing has been pushed.**

---

## 1. Headline finding

**arc's Sierra code is already inside Sierra-Deploy.** It was dumped there, unlabelled, under:

```
firebase/Sierra-Estates-Final/back/i-sierra-2027/{main, fix--codeql-insecure-random, preserve--backend-agents-bots-pf}/
firebase/Sierra-Estates-Final/back/sierra-2026/{main, backup-20260602, copilot--claudevigilant-carson-ajxrq}/
```

That is why `firebase/` is 296 MB. Six full branch snapshots of the ancestor repos are sitting inside your production monorepo as dead weight.

**Consequence:** most of what you wanted to "re-allocate" from arc does not need to come from arc at all. It is already in the repo — just buried in the wrong place.

---

## 2. Numbers

Starting from 72,181 arc files, filtered to backend/bot/agent/workflow code (no `.md`, no frontend, no `node_modules`/`.venv`/build output, no agent-skill scaffolding, no nested re-archives):

| Bucket | Count | Meaning |
| --- | ---: | --- |
| Candidate backend/bot/agent/workflow files | **1,128** | |
| — Byte-identical to a file already in Sierra-Deploy | **533** | Zero value. Skip. |
| — Same filename, different content | **477** | Older generations. See §3. |
| — Genuinely new filename | **118** | Mostly irrelevant. See §4. |
| **Actually worth recovering** | **5** | See §5. |

Duplicate detection used git blob SHAs — exact content matching, not guesswork.

---

## 3. The 477 "name collisions" — all older, none newer

Every collision I inspected is an **earlier generation** of a file Sierra-Deploy already has in better form. Typical case:

| arc file | Already in Sierra-Deploy |
| --- | --- |
| `sierra-blu-platform/lib/models/schema.ts` | **9 copies** already present |
| `.../lib/integrations/property-finder.ts` | **20 copies** already present |
| `.../lib/services/antigravity-agent.ts` | **13 copies** already present |
| `.../scripts/python-bots/sierra_blue_bot_implementation.py` | **7 copies** already present |
| `sierra_estatese_bot_implementation.py` | `scripts/legacy-logic-archive/` |

**Recommendation: import none of them.** Doing so would deepen the duplication problem, not fix it.

---

## 4. The 118 "new" files — 113 do not belong in this project

| Source | Files | What it actually is | Verdict |
| --- | ---: | --- | --- |
| `RuView` | 75 | WiFi DensePose / CSI pose-estimation, Tauri desktop app, Rust crates, React Native mobile | **Different product. Do not merge.** |
| `mempalace` | 23 | Standalone vector-memory library (Chroma / pgvector / Qdrant / SQLite backends) + MCP server | **Consume as a dependency, not a copy-in.** See §7. |
| `setup-node` | 7 | GitHub Action dependency licence files | Junk. |
| `sierra-estates` | 1 | `design-system/pages/api/properties.js` — legacy Pages Router | Superseded by App Router. |
| `New-folder` | 1 | `whatsapp-parser.ts` (2.6 KB) | Thinner than the existing `WhatsAppParserService.ts` (11.4 KB). Skip. |
| **Sierra backend** | **10** | The real recoveries | See §5. |

---

## 5. Staged for your approval — 5 files

Staged at their correct target paths in `staged/`. Ready to apply as one reviewable commit.

### Tier A — recovered from Sierra-Deploy's own nested archive (arc not needed)

| Target path | Size | Why |
|---|---:|---|
| `apps/sierra-estates-realty/lib/dsl/parser.ts` | 16,670 B | **The live file is a 36-byte stub.** The full DSL parser — `parseDSL`, `buildFirestoreQuery`, `applyFieldVisibility`, `groupDocuments`, `computeComparisonDelta` — exists in three places under `firebase/.../back/` and in arc. This is your single biggest piece of dropped code. |

> ⚠️ **Do not apply blind.** The current 36-byte stub reads `export * from '@sierra-estates/db'`. Something may be importing DSL types from it and resolving to `packages/db`. Replacing it needs a consumer check + type-check first. Flagged, not assumed safe.

### Tier B — genuinely absent everywhere in Sierra-Deploy, recovered from arc

| Target path | Size | Notes |
| --- | ---: | --- |
| `apps/sierra-estates-realty/lib/services/payment-service.ts` | 4,264 B | `PaymentService` — down payments, escrow holds, Stripe. **Zero imports — drops in clean.** No payment service exists anywhere in the live app. |
| `apps/sierra-estates-realty/lib/services/pdf-export-service.ts` | 8,055 B | `PDFExportService` — proposal + investment-analysis PDFs. **Zero imports — drops in clean.** |
| `scripts/verify-backend.mjs` | 3,952 B | Backend smoke-test. Deps: `firebase-admin`, `@google/generative-ai` — both already in the workspace. |
| `apps/api/integration_config.py` | 7,213 B | Firestore / Property Finder / Vercel config dataclasses. Stdlib-only imports. Header states all secrets come from env vars — verified, no hardcoded keys. |

---

## 6. Blocked — cannot be wired without errors

Moved to `blocked/`, **not** staged. You asked for clean integration with no errors; these would break on import.

| File | Blocker |
| --- | --- |
| `final_integration.py` | `from memory.gravity_core import GravityMemory` |
| `data_pipeline_audit.py` | same, plus `gspread` (not in project deps) |
| `sierra_bot_audit.py` | same, plus `from config import SIERRA_PERSONA` |

All three import a `11_Core_Intelligence/memory/gravity_core` Python module that **does not exist in arc or in Sierra-Deploy**. The TypeScript `lib/server/gravity.ts` is unrelated. Recoverable only if you can locate that module elsewhere — possibly on `F:\arc`, which I could not read.

---

## 7. Open decision — mempalace

`mempalace` (23 new files) is a real vector-memory library: Chroma (89 KB), pgvector (59 KB), Qdrant (52 KB), SQLite-exact (40 KB) backends, plus MCP server and a full test suite.

Sierra-Deploy already has `packages/open-memory` (277 files) and `packages/memory-engine` (8 files). Copying mempalace in would create a **third** memory system.

**My recommendation:** don't copy. If mempalace is better than what you have, add it as a dependency and retire one of the existing two. That is a separate decision from this recovery, and I'd want your call before touching it.

---

## 8. Security flags

| Finding | Severity |
| --- | --- |
| `sierra-blu-platform/sierra-blu-mcp.json` contains a hardcoded OpenClaw token: `02b25ff…ec02`, in a **public** repo | **High — rotate this token.** Not staged. |
| `key-key-/` is an Android NFC elevator-key app (unrelated product) containing `debug.keystore.base64` | Medium — unrelated to Sierra; do not merge. |
| `.env.example` files across arc | Reviewed — placeholders only, no live secrets. |

---

## 9. What I could not do

- **Push to Sierra-Deploy.** Git protocol is blocked from my sandbox and the GitHub connector is unauthorized in this session. Everything here is staged locally for you to apply.
- **Read `F:\arc`.** No folder is connected. The missing `gravity_core` module may be there.
- **Complete the index of `sierra-blu-platform/back/`** (~42,000 entries) — hit GitHub's unauthenticated API rate limit. Given every other `back/` directory proved to be a nested re-archive of repos already accounted for, I judged further expansion low-value. Say the word if you want it finished.

---

## 10. Recommended next steps

1. **Rotate the OpenClaw token** in §8 — it is public right now.
2. **Approve or reject** the 5 staged files. I'd suggest two commits: the 4 clean Tier-B additions first, then `dsl/parser.ts` alone after a consumer check.
3. **Separately: purge `firebase/` and `.venv/` from Sierra-Deploy.** ~450 MB of vendored dependencies and six nested repo snapshots. That's the actual cleanup this project needs — and doing it *after* extracting `dsl/parser.ts` means nothing is lost.
4. **Decide on mempalace** (§7).

Frontend untouched throughout, per your instruction.
