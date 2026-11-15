-- Sierra Estates — Add LightGBM Ad Scoring & Tier Columns to properties
-- Drop into: supabase/migrations/20261115_add_ai_scoring_columns.sql

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lead_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS score_tier TEXT NOT NULL DEFAULT 'tier_2_search_only',
  ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMPTZ;

-- Index for fast sorting of top-performing ads & tier filtering in admin/workflows
CREATE INDEX IF NOT EXISTS idx_properties_ai_score_desc
  ON public.properties (ai_score DESC, score_tier);

-- Note: Ensure your public client-portal view (e.g. public_properties_view)
-- continues to expose ONLY non-PII columns and excludes owner_name / owner_phone.