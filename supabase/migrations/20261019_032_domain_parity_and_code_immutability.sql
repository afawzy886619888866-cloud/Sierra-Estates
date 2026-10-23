-- ═══════════════════════════════════════════════════════════════════════════
-- 20261019_032_domain_parity_and_code_immutability.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Origin: owner-approved Autonomous End-to-End Execution Mandate, baseline
-- audit 2026-10-19 (docs/BASELINE_AUDIT_2026-10-19.md). Runs AFTER
-- 20261019_031_stable_listing_codes.sql (codes minted/backfilled/repaired
-- there). Three hardening items:
--
--   1. DOMAIN-SERVICE PARITY — InventoryDomainService
--      (lib/services/inventory/) persists a Firestore-shaped document
--      (sources / statusHistory / ownershipDocRef / reservationRef /
--      fingerprint). The fingerprint now maps onto the existing
--      dupe_check_hash column (see db-adapter.ts 2026-10-19 fix), but the
--      audit trail fields have no Postgres columns, so every write from that
--      path would fail against the real schema. This migration adds them,
--      additively and idempotently.
--
--   2. FINGERPRINT BACKFILL — rows created by the domain-service path use the
--      24-hex fingerprint as their TEXT primary key but leave dupe_check_hash
--      NULL, so the database-level unique index
--      uq_listings_dupe_check_hash (migration 013) never protected them.
--      Backfill dupe_check_hash = id for exactly those rows: the DB-level
--      duplicate guard then covers EVERY ingest path uniformly.
--
--   3. LISTING CODE IMMUTABILITY — a stable human-readable listing code must
--      never change when price/description change (mandate §4 property
--      identity: permanent DB id + immutable code + independent dedup
--      fingerprint). generateSierraCode() embeds a price token, so any flow
--      that re-derives a code after a price edit would silently break the
--      promise. RECONCILED with 031: migration 031 installed its own freeze
--      trigger (trg_listings_freeze_code, no escape hatch); this migration
--      REPLACES it with a single unified BEFORE UPDATE trigger that keeps
--      one explicit, auditable escape hatch — the session GUC
--      sierra.allow_code_change = 'true' (staff-initiated re-code only).
--      One trigger, one contract — not two stacked freeze triggers.
--
-- Design: 100% ADDITIVE & IDEMPOTENT — safe to re-run on production.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Domain-service parity columns ────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sources          JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status_history   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_doc_ref TEXT,
  ADD COLUMN IF NOT EXISTS reservation_ref   TEXT;

COMMENT ON COLUMN public.listings.sources IS
  'Per-source ingestion provenance: { source: { lastSeenAt, ref } } — written by InventoryDomainService.upsertFromSource.';
COMMENT ON COLUMN public.listings.status_history IS
  'Audited lifecycle transitions: [{ from, to, at, by, note }] — written by InventoryDomainService.transition.';
COMMENT ON COLUMN public.listings.ownership_doc_ref IS
  'Egyptian ownership document reference backing a document-verified listing (2026-08-17 compliance note).';
COMMENT ON COLUMN public.listings.reservation_ref IS
  'Payment-intent reference that justifies status=reserved.';

-- ── 2. Backfill dupe_check_hash for fingerprint-id rows ─────────────────────
-- The domain-service path used the 24-hex fingerprint as the TEXT primary key;
-- for those rows the id IS the fingerprint. Safe + idempotent: only touches
-- rows whose hash is still NULL and whose id is exactly a 24-hex string.
UPDATE public.listings
   SET dupe_check_hash = id
 WHERE dupe_check_hash IS NULL
   AND id ~ '^[0-9a-f]{24}$';

-- ── 3. Listing-code immutability trigger (UNIFIED — replaces 031's) ─────────
-- Rejects overwriting an assigned code. Escape hatch (deliberate staff
-- re-code, e.g. merging duplicate units):
--   SET sierra.allow_code_change = 'true';  -- in that transaction/session only
-- Replaces 031's trg_listings_freeze_code so exactly ONE freeze trigger
-- exists, with both the WHEN-clause precision and the escape hatch.
DROP TRIGGER IF EXISTS trg_listings_freeze_code ON public.listings;

CREATE OR REPLACE FUNCTION public.protect_listing_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.code IS NOT NULL
     AND TRIM(OLD.code) <> ''
     AND NEW.code IS DISTINCT FROM OLD.code
     AND COALESCE(current_setting('sierra.allow_code_change', true), 'false') <> 'true' THEN
    RAISE EXCEPTION
      'listing code is immutable: % -> % (listing id %). Re-deriving a code after a price/description change is forbidden (mandate 2026-10-19). For a deliberate staff re-code, SET sierra.allow_code_change = ''true'' for the transaction.',
      OLD.code, NEW.code, OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_code_immutable ON public.listings;
CREATE TRIGGER trg_listings_code_immutable
  BEFORE UPDATE OF code ON public.listings
  FOR EACH ROW
  WHEN (OLD.code IS NOT NULL AND TRIM(OLD.code) <> '')
  EXECUTE FUNCTION public.protect_listing_code();

COMMENT ON FUNCTION public.protect_listing_code() IS
  'Enforces immutable human-readable listing codes once assigned. Escape hatch: session GUC sierra.allow_code_change=true (auditable staff action).';
