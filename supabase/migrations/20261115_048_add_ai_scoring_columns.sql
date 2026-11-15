-- ============================================================================
-- Migration 048: Add LightGBM Ad Scoring, Tier & Version Columns
-- ============================================================================
-- Safely adds LightGBM ad-scoring columns (`lead_count`, `ai_score`,
-- `score_tier`, `ai_scored_at`) plus optimistic-locking `version_id` to
-- `public.listings` and (when it is a base table rather than a view)
-- `public.properties`. Idempotent across fresh & existing deployments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'listings' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.listings
      ADD COLUMN IF NOT EXISTS lead_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,1) NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS score_tier TEXT NOT NULL DEFAULT 'tier_2_search_only',
      ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS version_id INTEGER NOT NULL DEFAULT 1;

    CREATE INDEX IF NOT EXISTS idx_listings_ai_score_desc
      ON public.listings (ai_score DESC, score_tier);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'properties' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.properties
      ADD COLUMN IF NOT EXISTS lead_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,1) NOT NULL DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS score_tier TEXT NOT NULL DEFAULT 'tier_2_search_only',
      ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS version_id INTEGER NOT NULL DEFAULT 1;

    CREATE INDEX IF NOT EXISTS idx_properties_ai_score_desc
      ON public.properties (ai_score DESC, score_tier);
  END IF;
END $$;
