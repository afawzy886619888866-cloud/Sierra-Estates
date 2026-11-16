# IMPLEMENTATION ROADMAP — Sierra Blu

**Date:** 2026-09-29 · Derived from `CURRENT_STATE_REPORT.md` + `DATA_GAP_REPORT.md`.
**Principle:** data first → kill fabrication → wire the real journey → test as a client → only then automate/intelligence.

---

## Phase 1 — MASTER INVENTORY / DATA AUDIT (P0, IN PROGRESS)

**Objective:** Make the inventory trustworthy, classified, scored, and deduplicated — without touching the live DB.

**Tasks:**
1. Build `scripts/data-audit/` pipeline (Python, persisted): parse XLSX (all 7 sheets) + 2 root TSVs.
2. Normalize: compounds (AR/EN gazetteer), areas, property types, deal types (sale/rent/resale → sale|rent), furnishing, currency, phones (float → E.164 `+20…`), WhatsApp URLs, bedrooms/baths.
3. Deduplicate: fingerprint = hash(compound_norm + property_type + deal_type + beds + area±10% + price±5%); detect cross-segment duplicates (broker vs owner).
4. Classify: `OWNER_DIRECT / BROKER / PARTNER / UNKNOWN` from Segment/Channel + source.
5. Freshness: `last_verified_at` = source sheet date where known, else import timestamp; buckets 0-7 Fresh / 8-30 Aging / 31-60 Stale / 60+ Verification Required.
6. Quality score 0-100: completeness (40%), price validity (20%), location validity (10%), photos (10%), freshness (10%), source reliability (10%).
7. Publishability status: PUBLISHABLE / REVIEW_REQUIRED / INCOMPLETE / STALE / EXPIRED / DUPLICATE.

**Deliverables:** `/data/MASTER_INVENTORY_V1.csv` + `.xlsx`, `/docs/DATA_DICTIONARY.md`, `DATA_QUALITY_REPORT.md`, `DUPLICATE_REPORT.md`, `MISSING_DATA_REPORT.md`, `STALE_LISTINGS_REPORT.md`.

**Acceptance:** every input row accounted for (seen/valid/invalid/duplicate/rejected); 0 unexplained row loss; report totals reconcile.

## Phase 1.5 — KILL FABRICATION (P0)

**Objective:** No path can present invented property data to a client (Master Rule 5).

**Tasks:**
1. Delete `FALLBACK_INVENTORY` from `packages/whatsapp-shared/src/property-matcher.js` → return explicit empty + "no matching units, want us to source one?" Arabic/English message.
2. Replace `agents-core/property-matcher.ts` fictional-persona prompt with DB-grounded instruction + refusal rule.
3. Remove `openclaw.ts` invented defaults (price 35k/12.5M, area 200, beds 3) → mark record INCOMPLETE instead.
4. Remove `/api/internal/chat` canned reply → honest "AI not configured".
5. `sanitizeUnit` (PropertiesPage): stop fabricating aiScore/lat/lng/price → filter or flag records instead.
6. Remove `SEED_LISTINGS` from public fallback chain (`/api/matches`, `/api/listings`) → API returns empty + explicit header, never fake data.
7. Remove `LEADS_DATA` demo leads + fake admin KPIs; remove demo voice transcript in whatsapp webhook; remove fake realtime-green-dot.

**Acceptance:** grep-verified no fabricated-inventory path; API 200 with empty result (not 500) when DB empty.

## Phase 2 — INGESTION PIPELINE (P0)

**Tasks:** extend `sync-all-to-supabase-and-map.mjs` (reuse!) to consume the Phase-1 canonical CSV (not the raw XLSX): parse → normalize → validate → dedupe (single fingerprint) → quality score → upsert `onConflict:'ref_id'` → import report (seen/valid/invalid/inserted/updated/duplicated/rejected). Idempotent re-runs. TSV importer added. Fix column drift (strip status; use actual live column set).

**Acceptance:** re-run produces 0 new duplicates; report reconciles; live row count = canonical valid rows.

## Phase 3 — DATABASE ACTIVATION (P1)

**Tasks:**
1. Consolidate schema: fold 011 + 012 + broker_sessions into `supabase/schema.sql`; delete stale root `schema.sql` (or replace with pointer).
2. Fix `broker_sessions` policy (`TO service_role`), remove mock-admin auth path.
3. Add missing columns to `listings`: `owner_type`, `last_verified_at`, `availability`, `quality_score` (or apply 011's `data_quality_score`), `publish_status`.
4. Standardize dedupe: backfill `listing_fingerprint` unique index (concurrently, dedupe first).
5. Fix `match_listings_gemini` (drop or point at real column); fix CI `branches: ain]`; fix `test:rls` path.
6. Column-level diff live DB vs repo before/after (extend `verify-supabase-connection.ts`).

**Acceptance:** schema applies idempotently; RLS suite passes; no PGRST204 on importers.

## Phase 4 — WEBSITE ACTIVATION (P0)

**Tasks:** stop shipping 6.5MB snapshot in bundle → `/properties` fetches paginated `/api/inventory` (server-side first paint); property detail by id endpoint (single row); wire `/matches` page to real `/api/matches`; wire viewing request UI to existing `/api/leads/request-viewing`; fix CRM stage persistence (PATCH); surface the web concierge site-wide (reuse `/api/chat`); move `/api/inventory` off service-role.

**Acceptance:** HOME → SEARCH → DETAILS → BOT → MATCHES → VIEWING REQUEST works with real DB data, no snapshot fallback on fresh clone.

## Phase 5 — BOT MVP (P0 — mostly exists)

**Tasks:** verify Laila FSM against the required profile (location, deal_type, property_type, budget, bedrooms, furnishing, move_in_date, nationality, special_requirements); fill gaps (furnishing question, nationality capture); ensure hard-constraint extraction (budget max, location, min beds, sale-vs-rent) vs soft prefs (view, finishing, pool…); Arabic/English/mixed.

**Acceptance:** Test A–E personas from the master spec pass on real inventory.

## Phase 6 — MATCHING ENGINE (P0)

**Tasks:** unify on the deterministic hard-filter + soft-rank scorer (budget 40/beds 20/type 15/zone 15/freshness+quality 10 — configurable weights via `system_config`); wire bot shortlist + `/api/matches` + `/matches` page to it; owner-direct boost configurable; response shape: property, match_score, match_reasons, matched_constraints, unmatched_preferences, availability.

**Acceptance:** never returns a hard-constraint violator except explicitly flagged "alternatives"; every result traceable to a DB row.

## Phase 7 — FIRST REAL CLIENT TEST (P0 gate)

**Tasks:** scripted personas A–E (exact / vague / international EN / no-match / contradictory 4BR villa Madinaty ≤50k); record every failure in `/tests/client-journey/` + `docs/CLIENT_TEST_REPORT.md`; fix P0/P1 found before continuing.

## Phase 8 — VIEWING (P1)

Consolidate 3 viewing tables → one; wire public flow PROPERTY → REQUEST → SLOT → (link or real Google Calendar API if creds exist) → WhatsApp confirmation → reminder; keep Telegram internal alerts.

## Phase 9 — POST-VIEWING FEEDBACK (P1)

Feedback forms (sales: unit accuracy, client reaction, price reaction, objections, interest, next action; client survey), combined analysis view for manager approval.

## Phase 10 — CRM PIPELINE (P1)

Single status vocabulary across the 4 overlapping ones; transition audit (`orchestration_history` + `audit_logs` already exist — reuse); fix stage persistence; lead automation timers.

## Phase 11 — AUTOMATION (P1 → after manual proof)

Unify crons (move off Hobby limits → EC2/GHA); schedule `flag_stale_listings` + `whatsapp-dispatch`; retryable + observable automations (DLQ exists: `failed_orchestrations`).

## Phase 12 — ADMIN CONTROL CENTER (P2)

Reuse `/api/admin/dashboard`; add inventory-freshness, duplicates, needs-verification widgets; remove fake KPIs.

## Phase 13 — QA + SECURITY (P1 continuous)

Data QA suite (runs Phase-1 pipeline as tests), bot QA matrix (AR/EN/mixed/vague/contradictory), matching QA, integration QA, security sweep (B12 browser bearer, service-role usage, webhook HMAC, secrets scan — never print secrets).

## Phase 14 — PRODUCTION READINESS (gate)

Per master spec §14 checklist; deploy gates honest (`pnpm deploy:check` re-run after fixes).

## Phase 15 — ADVANCED INTELLIGENCE (P3, POSTPONED)

Semantic search via existing pgvector only when inventory verified + usage justifies; market intelligence, investment advisor, virtual tours — all postponed per master rule.

---

## Immediate execution order (next 5 work blocks)

1. ✅ Phase 0 audit reports (this repo, docs/)
2. ▶ Phase 1 data pipeline + 7 deliverables
3. Phase 1.5 fabrication kill (code changes, testable by grep + unit tests)
4. Phase 2 importer unification + dry-run report (DB write only after column-level diff passes)
5. Phase 4 website wiring + Phase 7 client-journey test on local dev
