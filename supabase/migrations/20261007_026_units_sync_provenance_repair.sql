-- =====================================================================
-- 20261007_026_units_sync_provenance_repair.sql
-- =====================================================================
-- §21 no-fabrication sweep part 3: units-sync provenance repair
--
-- Problem:
--   1. Workflow 08 (units-sync) stamped verified_at = now() on every
--      sheets-units row it upserted, and auto-promoted "available" rows
--      straight to PUBLISHABLE. Those stamps are manufactured provenance:
--      no human ever verified these units — the audit found 178
--      sheets-units rows carrying a non-NULL verified_at while
--      verified_by and source_verified_at were 100% NULL.
--   2. Under §21 and the Phase 6 rule (sheet sync is data ingestion
--      only; the 8-condition verification gate — policy 020 — is the
--      sole path to PUBLISHABLE), unearned stamps and publishability
--      must be repaired.
--
-- Corrective Action:
--   1. Erase the manufactured verification stamps on sheet-sourced rows.
--   2. Demote sheet-sourced rows that were auto-promoted to PUBLISHABLE
--      back to REVIEW_REQUIRED.
--
-- Ongoing prevention is code-side (workflows/08-units-sync/sync.js):
--   after this migration the workflow never writes verified_at /
--   verified_by / source_verified_at, and never promotes a row to
--   PUBLISHABLE from sheet availability.
--
-- NOTE: applied to the live project on 2026-10-07 surgically via the
--   Supabase Management API (advisory lock 940011, single transaction)
--   and ledgered in public.schema_migrations before this file landed in
--   git — the runtime applier therefore skips it as already applied.
--   Both UPDATEs are idempotent (guarded WHERE clauses), so a re-run on
--   a fresh environment is a safe no-op.
-- =====================================================================

-- 1. Erase manufactured verification stamps on sheet-sourced rows
UPDATE public.listings
SET verified_at = NULL,
    verified_by = NULL,
    source_verified_at = NULL
WHERE sync_source = 'sheets-units'
  AND (verified_at IS NOT NULL
       OR verified_by IS NOT NULL
       OR source_verified_at IS NOT NULL);

-- 2. Demote unearned publishability on sheet-sourced rows
UPDATE public.listings
SET publish_status = 'REVIEW_REQUIRED'
WHERE sync_source = 'sheets-units'
  AND publish_status = 'PUBLISHABLE';
