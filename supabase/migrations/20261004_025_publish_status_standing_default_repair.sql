-- =====================================================================
-- 20261004_025_publish_status_standing_default_repair.sql
-- =====================================================================
-- §21 no-fabrication sweep part 2: standing default repair & provenance demotion
--
-- Problem:
--   1. listings.publish_status on the live database carried an unledgered
--      DEFAULT 'PUBLISHABLE' constraint, which automatically backfilled all
--      pre-existing rows with 'PUBLISHABLE' and caused any newly inserted unit
--      to silently inherit 'PUBLISHABLE' without verification.
--   2. Provenance audit (Phase 2 Step 0) proved that 0 of the 15,755 rows
--      currently marked PUBLISHABLE carry any genuine verification timestamp
--      (source_verified_at or verified_at are 100% NULL), and only 1.66% carry
--      photos (largely Unsplash stock images).
--   3. Under §21 and Rule B (unknown = UNKNOWN, never fabricated; unearned
--      verification must not pass the publish gate), these rows cannot remain
--      PUBLISHABLE.
--
-- Corrective Action:
--   1. Drop the standing default so new rows land as NULL (unclassified / unknown).
--   2. Demote unverified inventory from PUBLISHABLE to REVIEW_REQUIRED,
--      strictly preserving any row that carries genuine verification signals
--      (source_verified_at IS NOT NULL OR verified_at IS NOT NULL).
-- =====================================================================

-- 1. Drop the standing default constraint
ALTER TABLE public.listings
  ALTER COLUMN publish_status DROP DEFAULT;

-- 2. Demote unverified inventory to REVIEW_REQUIRED
UPDATE public.listings
SET publish_status = 'REVIEW_REQUIRED'
WHERE publish_status = 'PUBLISHABLE'
  AND source_verified_at IS NULL
  AND verified_at IS NULL;

COMMENT ON COLUMN public.listings.publish_status IS
  'Master-inventory publishability cascade (025 default-dropped). NULL = unclassified; REVIEW_REQUIRED = pending human verification. Gated by policy 020.';
