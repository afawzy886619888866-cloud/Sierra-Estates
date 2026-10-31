-- ============================================================================
-- Migration 039 — INVENTORY CONSOLE IMG/TAG RECONCILIATION
-- ============================================================================
-- Companion to 038. The Inventory & Freshness console's read path
-- (app/api/admin/properties GET) and write path (app/api/admin/properties/[id])
-- also speak the base schema's Firestore-compat vocabulary for two render
-- columns:
--   listings.img  — primary image (base schema: "images[0] equivalent")
--   listings.tag  — listing tag ('Verified Owner' | 'Featured' | ...)
-- The registry-shaped production listings table carries `images text[]`
-- (the photo array) but never received img/tag — the base CREATE TABLE
-- IF NOT EXISTS was a no-op against the already-existing table, so nothing
-- ever added them.
--
-- Symptom: even after 038, GET /api/admin/properties?bucket=all&limit=300
-- still returns 500 (PostgREST 42703 on listings.img): all three SELECT
-- projections in the route include img, and the route's pre-migration
-- fallback regexes only cover se_code / freshness_score / verified /
-- publish_to_client — not img.
--
-- This migration restores the contract, additively and idempotently:
--   1. listings.img — TEXT (base schema type).
--   2. listings.tag — TEXT (base schema type).
--   3. Backfill img from the first element of the images array so the two
--      vocabularies agree on day one. Derives strictly from existing values
--      — no fabricated data; explicit values are never overwritten.
--
-- Design rules honoured: 100% additive & idempotent (safe to re-run), no
-- destructive changes, no fabricated data.
-- ============================================================================

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS img TEXT;

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS tag TEXT;

-- Backfill: primary image = first photo in the images array (Postgres arrays
-- are 1-indexed). Guarded so it only lifts rows that actually have photos.
UPDATE public.listings
   SET img = images[1]
 WHERE img IS NULL
   AND images IS NOT NULL
   AND array_length(images, 1) > 0;
