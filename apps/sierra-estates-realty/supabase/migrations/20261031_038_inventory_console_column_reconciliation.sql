-- ============================================================================
-- Migration 038 — INVENTORY CONSOLE COLUMN RECONCILIATION
-- ============================================================================
-- The admin Inventory & Freshness console (/admin/properties) and its write
-- path (app/api/admin/properties/[id]) speak the Firestore-compat column
-- vocabulary from the base schema: listings.verified and
-- listings.publish_to_client. Long-lived production listings tables that were
-- shaped by the sync/registry pipelines instead carry the migration-020
-- model only (publish_status / published_at / verified_at / verified_by) and
-- never received the base CREATE TABLE's column set — CREATE TABLE IF NOT
-- EXISTS is a no-op against an existing table, so nothing ever added them.
--
-- Symptom: GET /api/admin/properties?bucket=all&limit=300 returns 500
-- (PostgREST 42703 on listings.verified / listings.publish_to_client) and
-- /admin/properties renders "Failed to load inventory".
--
-- This migration restores the contract, additively and idempotently:
--
--   1. listings.verified            — BOOLEAN DEFAULT FALSE (base schema).
--   2. listings.publish_to_client   — BOOLEAN DEFAULT FALSE (base schema).
--   3. Backfill from the 020 model so the two vocabularies agree on day one:
--        verified          = (verified_at IS NOT NULL)
--        publish_to_client = (publish_status = 'PUBLISHABLE')
--      Explicit TRUEs are never demoted; the backfill only lifts rows the
--      registry model already considers verified/published.
--
-- Design rules honoured: 100% additive & idempotent (safe to re-run), no
-- destructive changes, no fabricated data (backfill derives strictly from
-- existing verified_at / publish_status values).
-- ============================================================================

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS publish_to_client BOOLEAN DEFAULT FALSE;

-- Backfill: lift rows the 020 model already marks as verified / published.
-- Guarded by the column-exists checks above; safe on databases where the
-- base schema already created these columns (the UPDATE simply re-derives
-- the same values).
UPDATE public.listings
   SET verified = TRUE
 WHERE verified IS NOT TRUE
   AND verified_at IS NOT NULL;

UPDATE public.listings
   SET publish_to_client = TRUE
 WHERE publish_to_client IS NOT TRUE
   AND publish_status = 'PUBLISHABLE';
