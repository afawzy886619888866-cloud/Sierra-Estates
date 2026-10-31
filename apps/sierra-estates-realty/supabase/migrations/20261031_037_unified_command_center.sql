-- ============================================================================
-- Migration 037 — UNIFIED ADMIN COMMAND CENTER
-- ============================================================================
-- Powers the command-center routes added under app/admin/ (overview, pipeline,
-- properties, leads, bots, applicants) and the public verified showcase:
--
--   1. listings.freshness_score  — 0..100 inventory freshness discipline.
--      Public verified showcase requires freshness_score >= 90 (spec target).
--      Score decays 2 points per day since updated_at (floor 20): 5 days = 90,
--      30 days = 40 — aligned with migration 011's 30-day stale SLA.
--   2. listings.se_code          — the canonical Sierra Estates inventory
--      code, UNIQUE when present. Backfilled from the legacy code /
--      reference_code columns (one row per code — no duplicate keys created).
--   3. public.webhook_logs        — unified inbound webhook observability for
--      /api/webhooks/whatsapp and /api/telegram/webhook (source, payload,
--      signature validity, processing status, latency). Staff-only read,
--      written by the service-role route handlers, streamed over Realtime so
--      the /admin/bots operations desk tails it live.
--   4. career_applications.cv_url — recruitment CV link inspected by
--      /admin/applicants.
--   5. public.applicants          — security_invoker VIEW aliasing
--      career_applications, so the command center reads one source of truth
--      under the spec's "applicants" name (public insert stays on the base
--      table; staff read flows through the base table's RLS).
--
-- Design rules honoured: 100% additive & idempotent (safe to re-run), no
-- fabricated data (§21 — freshness is derived from updated_at, never invented),
-- no destructive changes to the listing status state machine from migrations
-- 011/035 (verified/stale/sold toggles ride the existing publish_status,
-- stale BOOLEAN and guarded status transitions). Every statement referencing
-- columns introduced by other migrations is guarded by a catalog check, so
-- this file applies cleanly on schema.sql-only databases as well.
-- ============================================================================

-- ─── 1. Inventory freshness score ──────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS freshness_score INTEGER DEFAULT 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_freshness_score_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_freshness_score_check
      CHECK (freshness_score IS NULL OR (freshness_score >= 0 AND freshness_score <= 100));
  END IF;
END $$;

COMMENT ON COLUMN public.listings.freshness_score IS
  'Inventory freshness 0..100 (command center). 100 = updated today; decays 2/day (floor 20). Public verified showcase requires >= 90. Recomputed by public.refresh_all_listing_freshness().';

-- Freshness from a timestamp: 100 - 2*days, floored at 20.
CREATE OR REPLACE FUNCTION public.compute_listing_freshness(p_updated_at TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(20, 100 - 2 * COALESCE(FLOOR(EXTRACT(EPOCH FROM (NOW() - p_updated_at)) / 86400)::INT, 0))::INT;
$$;

-- Backfill every row once (idempotent: only rows without a score are touched).
UPDATE public.listings
   SET freshness_score = public.compute_listing_freshness(updated_at)
 WHERE freshness_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_freshness_score ON public.listings(freshness_score);

-- Composite gate index — only when the publish_status column (migration 013)
-- is present, so a schema.sql-only database still applies cleanly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'publish_status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_fresh_verify_gate
               ON public.listings (freshness_score, publish_status)
               WHERE publish_status = ''PUBLISHABLE''';
  END IF;
END $$;

-- Full recompute used by the Curator workflow and /admin/properties.
-- The 30-day stale SLA mirrors migration 011's flag_stale_listings() on the
-- raw status vocabulary (guarded on the `stale` column existing). Returns
-- stats so the console renders honest numbers.
CREATE OR REPLACE FUNCTION public.refresh_all_listing_freshness()
RETURNS TABLE (refreshed BIGINT, avg_freshness NUMERIC, fresh_over_90 BIGINT, stale_flagged BIGINT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_refreshed   BIGINT;
  v_stale_count BIGINT := 0;
  v_avg         NUMERIC;
  v_over_90     BIGINT;
BEGIN
  UPDATE public.listings
     SET freshness_score = public.compute_listing_freshness(updated_at)
   WHERE freshness_score IS DISTINCT FROM public.compute_listing_freshness(updated_at);
  GET DIAGNOSTICS v_refreshed = ROW_COUNT;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'stale'
  ) THEN
    UPDATE public.listings
       SET stale = TRUE
     WHERE stale = FALSE
       AND status IN ('active', 'available', 'verified', 'published')
       AND updated_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_stale_count = ROW_COUNT;
  END IF;

  SELECT COALESCE(ROUND(AVG(freshness_score)), 0), COUNT(*) FILTER (WHERE freshness_score >= 90)
    INTO v_avg, v_over_90
    FROM public.listings
   WHERE freshness_score IS NOT NULL;

  RETURN QUERY SELECT v_refreshed, v_avg, v_over_90, v_stale_count;
END;
$$;

COMMENT ON FUNCTION public.refresh_all_listing_freshness IS
  'Command center Curator action: recompute listings.freshness_score from updated_at and apply the 30-day stale SLA. Returns (refreshed, avg_freshness, fresh_over_90, stale_flagged).';

-- ─── 2. Canonical se_code (UNIQUE Sierra Estates inventory code) ───────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS se_code TEXT;

COMMENT ON COLUMN public.listings.se_code IS
  'Canonical Sierra Estates inventory code (e.g. SE-SUB-123456). UNIQUE when present; backfilled from legacy code/reference_code.';

-- Backfill: one owner per code so the unique index can never fail on legacy
-- duplicates (DISTINCT ON keeps the earliest row per code, by created_at).
UPDATE public.listings l
   SET se_code = src.code
  FROM (
    SELECT DISTINCT ON (TRIM(COALESCE(c.code, c.reference_code)))
           c.id,
           TRIM(COALESCE(c.code, c.reference_code)) AS code
      FROM public.listings c
     WHERE COALESCE(c.code, c.reference_code) IS NOT NULL
       AND TRIM(COALESCE(c.code, c.reference_code)) <> ''
    ORDER BY TRIM(COALESCE(c.code, c.reference_code)), c.created_at ASC
  ) AS src
 WHERE l.id = src.id
   AND l.se_code IS NULL;

-- Partial unique index: enforces uniqueness for every SET value while any
-- number of rows may still have NULL (not yet coded).
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_se_code_unique
  ON public.listings (se_code)
  WHERE se_code IS NOT NULL;

-- ─── 3. Unified webhook observability ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source          TEXT NOT NULL CHECK (source IN ('whatsapp', 'telegram', 'other')),
  event_type      TEXT,
  external_id     TEXT,
  payload         JSONB DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN,
  status          TEXT DEFAULT 'received'
                  CHECK (status IN ('received', 'processed', 'duplicate', 'rejected', 'error')),
  error           TEXT,
  latency_ms      INT,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.webhook_logs IS
  'Inbound webhook ledger for /api/webhooks/whatsapp and /api/telegram/webhook — the /admin/bots operations desk tails this live over Realtime. Written by service-role route handlers; staff-only read.';

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source  ON public.webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status  ON public.webhook_logs(status);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "webhook_logs_staff_read" ON public.webhook_logs;
  CREATE POLICY "webhook_logs_staff_read" ON public.webhook_logs
    FOR SELECT TO authenticated USING (public.is_staff());
END $$;

-- Inserts happen through the service-role client (webhook route handlers),
-- which bypasses RLS; no anon/authenticated write policy by design.

GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Recruitment: CV link ───────────────────────────────────────────────
ALTER TABLE public.career_applications
  ADD COLUMN IF NOT EXISTS cv_url TEXT;

COMMENT ON COLUMN public.career_applications.cv_url IS
  'Candidate CV / portfolio link (public careers form, inspected in /admin/applicants).';

-- ─── 5. applicants VIEW (spec alias over career_applications) ──────────────
-- security_invoker = the caller's own RLS rights on career_applications apply:
-- staff read flows through "career_applications_staff_access", the public
-- intake keeps INSERTing into the base table directly.
CREATE OR REPLACE VIEW public.applicants
WITH (security_invoker = on) AS
SELECT * FROM public.career_applications;

COMMENT ON VIEW public.applicants IS
  'Command-center alias for public.career_applications (single source of truth for recruitment). Reads are subject to the base table''s RLS via security_invoker.';

GRANT SELECT ON public.applicants TO authenticated;

-- ─── 6. Realtime for the applicants desk ───────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.career_applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
