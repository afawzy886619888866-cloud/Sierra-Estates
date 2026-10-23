-- ═══════════════════════════════════════════════════════════════════════════
-- 20260928_baseline_repair_dupe_check_hash.sql — schema-baseline drift repair
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem:
--   20260929_013_master_inventory_activation.sql creates the partial unique
--   index uq_listings_dupe_check_hash ON public.listings (dupe_check_hash),
--   but that column is declared ONLY in the canonical baseline
--   (supabase/schema.sql line 100: "dupe_check_hash TEXT"). No migration in
--   the chain ever adds it, and the live table predates that baseline line.
--   011_inventory_os_v2 documents the gap explicitly ("live table has neither
--   ai_score nor dupe_check_hash", NULL::text placeholder in the view).
--   Result: the runtime applier (/api/cron/apply-migrations) halts at 013
--   with `column "dupe_check_hash" does not exist`, blocking 014–022 behind
--   it — including the Phase D publish gate (020) and the §21 defaults sweep
--   (022).
--
-- Fix:
--   Declare the baseline column exactly as schema.sql does (TEXT, nullable).
--   Existing rows keep NULL = "not yet fingerprinted" — the honest unknown
--   state (Rule B / §21: unknown = UNKNOWN, never fabricated). No default,
--   no backfill, no row changes; the partial unique index added by 013
--   constrains only future rows that set the hash.
--
-- Why this filename (do NOT re-date):
--   The applier applies files in LEXICOGRAPHIC order and halts on first
--   failure. 013 failed and is therefore NOT recorded in schema_migrations
--   (its transaction rolled back), so it retries on the next run. To run
--   BEFORE that retry, this repair must sort between
--   20260924_rls_hardening.sql and 20260929_013_master_inventory_activation.sql
--   — hence the back-dated 20260928_ prefix. This mirrors the repo's own
--   precedent of folding infra/supabase/migrations/20260928_broker_sessions.sql
--   into the canonical chain (013 §4).
--
-- Safety:
--   100% additive & idempotent (safe to re-run). Touches no already-applied
--   migration, no policy, no data. ai_score is deliberately NOT added here:
--   no migration, index, or view depends on it (011 already null-guards it).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS dupe_check_hash TEXT;

COMMENT ON COLUMN public.listings.dupe_check_hash IS
  'Inventory dedupe fingerprint (schema.sql baseline drift repair). NULL = not yet fingerprinted (unknown, Rule B); uniqueness enforced by uq_listings_dupe_check_hash (013).';
