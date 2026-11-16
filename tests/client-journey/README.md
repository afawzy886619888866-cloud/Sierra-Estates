# /tests/client-journey — Phase 7 artifacts

Executable suite: `apps/sierra-estates-realty/__tests__/client-journey-personas.test.ts`
(it lives under `__tests__/` because the app's jest config pins
`testPathPatterns=__tests__`; this directory holds the journey records.)

Full report: `docs/CLIENT_TEST_REPORT.md`

## Run log — 2026-09-29 (session 5-a)

- Personas A–E + global invariant: **7/7 PASS**
- Data: `data/MASTER_INVENTORY_V1.csv` — engine-QA set 8,486 unique real units; client-facing (PUBLISHABLE) set 0, recorded honestly.
- P0 fixed pre-run: budget ceiling now a hard constraint (was ±25% soft).
- P1 fixed pre-run: minimum bedrooms now a hard floor.
- Blocked: bot-conversation personas (Gemini key), HTTP replay (Supabase key), viewing E2E.

## Defects found (recorded per master workflow §8)

| # | Severity | Defect | Disposition |
|---|---|---|---|
| 1 | P0 | Over-budget listings could rank as normal matches | FIXED — `lib/server/match-scoring.ts` |
| 2 | P1 | Below-minimum-bedroom listings could rank as normal matches | FIXED — same |
| 3 | — | Persona-D test initially over-constrained (type is soft per spec) | TEST CORRECTED |
