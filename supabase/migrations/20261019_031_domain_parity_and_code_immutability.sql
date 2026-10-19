-- ═══════════════════════════════════════════════════════════════════════════
-- 20261019_031_domain_parity_and_code_immutability.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Origin: owner-approved Autonomous End-to-End Execution Mandate, baseline
-- audit 2026-10-19 (docs/BASELINE_AUDIT_2026-10-19.md). Three hardening items:
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
--      promise. A BEFORE UPDATE trigger now rejects code changes once a code
--      is assigned, with one explicit, auditable escape hatch: the session
--      GUC sierra.allow_code_change = 'true' (staff-initiated re-code only).
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

-- ── 3. Listing-code immutability trigger ────────────────────────────────────
-- Rejects overwriting an assigned code. Escape hatch (deliberate staff
-- re-code, e.g. merging duplicate units):
--   SET sierra.allow_code_change = 'true';  -- in that transaction/session only
CREATE OR REPLACE FUNCTION public.protect_listing_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.code IS NOT NULL
     AND NEW.code IS DISTINCT FROM OLD.code
     AND COALESCE(current_setting('sierra.allow_code_change', true), 'false') <> 'true' THEN
    RAISE EXCEPTION
      'listing code is immutable: % -> % (listing id %). Re-deriving a code after a price/description change is forbidden (mandate 2026-10-19). For a deliberate staff re-code, SET sierra.allow_code_change = ''true'' for the transaction.',
      OLD.code, NEW.code, OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_code_immutable ON public.listings;
CREATE TRIGGER trg_listings_code_immutable
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_code();

COMMENT ON FUNCTION public.protect_listing_code() IS
  'Enforces immutable human-readable listing codes once assigned. Escape hatch: session GUC sierra.allow_code_change=true (auditable staff action).';
