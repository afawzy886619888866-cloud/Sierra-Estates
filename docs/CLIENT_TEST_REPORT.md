# CLIENT TEST REPORT — Phase 7 (First Real Client Test)

> **Status:** COMPLETED (engine-level) / BLOCKED (bot-conversation level — credentials)
> **Date:** 2026-09-29 · **Executor:** Lead AI Software Architect session
> **Test artifact:** `apps/sierra-estates-realty/__tests__/client-journey-personas.test.ts` (7/7 PASS)
> **Journey log dir:** `/tests/client-journey/`

---

## 1. Scope honestly stated

The full client journey is DATA → DISCOVERY → QUALIFICATION → MATCHING → SELECTION → VIEWING → FEEDBACK → FOLLOW-UP → NEGOTIATION → CONTRACT → CLOSING. This run covers **MATCHING** end-to-end against **real inventory** (all 8,486 unique, non-duplicate units from the Phase 1 master audit, `data/MASTER_INVENTORY_V1.csv`) plus the `/matches` page contract. The QUALIFICATION stage (WhatsApp bot conversation) requires the Gemini API key and WhatsApp infrastructure — not available in this session; recorded as blocked, not skipped silently.

Two data sets were used, per Master Rule 5:

| Set | Definition | Size | Use |
|---|---|---|---|
| Engine-QA set | every unique non-duplicate real unit | 8,486 | scoring correctness under real data distribution |
| Client-facing set | `publish_status = PUBLISHABLE` | **0** | what a real client would legally see today |

The client-facing set is empty because the Phase 1 audit found **0 publishable units** (91.5% never verified, only 36% plausibly-valid prices). Until the verification campaign runs, any "match" shown to a live client would be fabricated — the tests assert this state is represented honestly, never papered over.

## 2. Personas executed

| Persona | Ask | Result | Verdict |
|---|---|---|---|
| **A — exact** | 3BR apartment, sale, ~15M EGP | Real matches found; every normal result within budget cap and bedroom floor; no unflagged violator | ✅ PASS |
| **B — vague** | "something nice in New Cairo" (minimal constraints) | ≤3 results, all compliant or explicitly flagged | ✅ PASS |
| **C — international EN** | villa buyer relocating from Dubai, 4BR, New Cairo | Same hard-constraint contract as AR clients; compliant results only | ✅ PASS |
| **D — no-match** | 1BR chalet, sale, Shorouk, 500k EGP | No fabricated matches; compliant results satisfy hard constraints; property type (soft) never claimed as matched when it isn't | ✅ PASS |
| **E — contradictory** | 4BR villa, Madinaty, ≤50k EGP/month | Every over-budget villa surfaces ONLY as a flagged alternative with visible violation reason | ✅ PASS |
| Global invariant | random budget/beds sweeps | No hard-constraint violator EVER returns as a normal (unflagged) result | ✅ PASS |

## 3. Failures found & fixed (P0)

1. **P0 — budget was soft, not hard (fixed this phase).** The pre-Phase-5/6 engine scored budget as "±25% full marks" — a listing 50% over budget could still rank #1 as a *normal* result. Persona A/E would have exposed this on the old engine. Fixed by `lib/server/match-scoring.ts`: budget is now a **ceiling**; violators can only appear as explicitly flagged alternatives, and only when compliant results cannot fill the limit (3). Verified by `match-scoring.test.ts` (8 tests).
2. **P1 — minimum bedrooms was soft (fixed this phase).** A 2-bedroom could outrank a 4-bedroom for a family asking for 4+. Now a hard floor.
3. **Test-side correction (not an engine defect):** Persona D initially asserted property-type equality for compliant results; the master spec defines type as a *soft preference* (hard = budget cap, location, min bedrooms, rent/sale). The test now asserts type mismatches never earn a "matches preference" reason instead.

## 4. Phase 5 profile gap-fill (same session)

The bot's qualification extraction (`WhatsAppConversationalService`) captured compound/unitType/budget/urgency but dropped **bedrooms, furnishing, move-in date, nationality, special requirements**. Schema and prompt now extract the full master-spec set, explicitly split into hard constraints vs soft preferences, with "never invent unstated values" instructions. `ClientProfile` (agents-core) extended to match. Live bot E2E verification pending Gemini key.

## 5. Blocked items (credentials required)

| Item | Blocker | Unblocks |
|---|---|---|
| Bot conversation personas A–E (AR/EN/mixed) | `GEMINI_API_KEY` not in env | QUALIFICATION stage of the journey |
| Live `/api/matches` against Supabase | service key not in env | HTTP-level persona replay |
| Viewing flow E2E | requires running site + DB | Phase 8 acceptance |

## 6. Acceptance

Phase 7 engine-level acceptance is **MET**: every result is traceable to a real sourced unit, hard constraints are never violated silently, and the empty publishable set is presented honestly. The P0/P1 defects found were fixed before proceeding (no known failures remain open at the engine level).
