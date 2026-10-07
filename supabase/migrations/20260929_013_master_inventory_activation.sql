-- ═══════════════════════════════════════════════════════════════════════════
-- 013_master_inventory_activation.sql — Sierra Blu Phase 2/3
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose : Activate the canonical MASTER_INVENTORY_V1 data model on the live
--           listings table and repair two audit findings (B5, B6):
--             B5  match_listings_gemini referenced a non-existent
--                 `embedding_768` column (real column: `embedding vector(1536)`)
--             B6  broker_sessions RLS policy lacked `TO service_role`, making
--                 the table effectively public read/write
-- Design  : 100% ADDITIVE & IDEMPOTENT — safe to re-run on production.
-- Depends : supabase/schema.sql (baseline) + 011_inventory_os_v2 (data_quality_score,
--           verified_at, stale). All guarded with IF NOT EXISTS / OR REPLACE.
-- Consumed by: scripts/data-audit/import-master-inventory.mjs (Phase 2 importer)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LISTINGS — freshness / availability / publishability columns
--    (source-verified ≠ staff-verified: verified_at stays staff-only)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_verified_at TIMESTAMPTZ,  -- when the SOURCE last evidenced this unit
  ADD COLUMN IF NOT EXISTS availability       TEXT,        -- available | pending | not_available | unknown
  ADD COLUMN IF NOT EXISTS publish_status     TEXT;        -- PUBLISHABLE | REVIEW_REQUIRED | INCOMPLETE | STALE | EXPIRED | DUPLICATE

COMMENT ON COLUMN public.listings.source_verified_at IS 'Recency of the source data (sheet date), NOT staff verification — see verified_at.';
COMMENT ON COLUMN public.listings.publish_status     IS 'Master-inventory publishability cascade (Phase 1 pipeline).';

CREATE INDEX IF NOT EXISTS idx_listings_publish_status    ON public.listings (publish_status);
CREATE INDEX IF NOT EXISTS idx_listings_availability      ON public.listings (availability);
CREATE INDEX IF NOT EXISTS idx_listings_source_verified   ON public.listings (source_verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_data_quality      ON public.listings (data_quality_score);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. DEDUPLICATION STANDARD — one fingerprint, one index (audit B9)
--    Partial unique index: legacy rows with NULL hash are unaffected (Postgres
--    unique indexes allow multiple NULLs); any ingest path that sets
--    dupe_check_hash becomes duplicate-proof at the database level.
-- ─────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_dupe_check_hash
  ON public.listings (dupe_check_hash)
  WHERE dupe_check_hash IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. FIX B5 — the Gemini embedding pipeline (generate-supabase-embeddings.ts
--    + wire-and-seed-supabase.mjs) writes 768-dim vectors to `embedding_768`,
--    but that column never existed in any schema → every write silently
--    failed. Add the column the generators already target; match_listings_gemini
--    then works exactly as designed (768-dim).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS embedding_768 vector(768);

CREATE INDEX IF NOT EXISTS idx_listings_embedding_768
  ON public.listings USING ivfflat (embedding_768 vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON COLUMN public.listings.embedding_768 IS 'Gemini gemini-embedding-001 (outputDimensionality 768) vectors — written by scripts/generate-supabase-embeddings.ts.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. FIX B6 — broker_sessions: fold into the canonical migration chain with a
--    corrected policy (TO service_role instead of public USING(true))
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_sessions (
    id              BIGSERIAL PRIMARY KEY,
    session_id      TEXT UNIQUE NOT NULL,
    messages        JSONB NOT NULL DEFAULT '[]',
    profile         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_sessions_session_id ON public.broker_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_broker_sessions_updated    ON public.broker_sessions (updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_broker_session_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS broker_sessions_updated ON public.broker_sessions;
CREATE TRIGGER broker_sessions_updated
  BEFORE UPDATE ON public.broker_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_broker_session_ts();

ALTER TABLE public.broker_sessions ENABLE ROW LEVEL SECURITY;

-- corrected policy: service role only (the original infra/ version applied to
-- every role because it lacked the TO clause)
DROP POLICY IF EXISTS "service_role_all" ON public.broker_sessions;
CREATE POLICY "service_role_all" ON public.broker_sessions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. FRESHNESS MAINTENANCE — schedule flag_stale_listings (011) via pg_cron
--    when available; harmless no-op comment if the extension is absent.
-- ─────────────────────────────────────────────────────────────────────────
-- SELECT cron.schedule('flag-stale-listings', '15 3 * * *',
--   'SELECT public.flag_stale_listings();');
