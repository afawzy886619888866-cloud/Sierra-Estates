-- ═══════════════════════════════════════════════════════════════════════════
-- 20261003_020b_baseline_repair_profiles_columns.sql — baseline drift repair
-- ═══════════════════════════════════════════════════════════════════════════
-- Problem:
--   20261003_021_partner_provisioning.sql (sections 4/5) writes
--   public.profiles (..., status, ...) — `status` is declared in the
--   canonical baseline (supabase/schema.sql, profiles: status TEXT) but the
--   live table predates it, exactly like dupe_check_hash on listings
--   (repaired by 20260928_baseline_repair). `last_login` (baseline
--   TIMESTAMPTZ) is missing live too. INSERTs referencing the missing
--   columns abort 021 and strand 022 behind it.
--
-- Fix:
--   Add the two missing baseline columns exactly as schema.sql declares
--   them — with ONE deliberate deviation: status is added WITHOUT the
--   baseline's DEFAULT 'active'. A default that materializes a workflow
--   state nobody set is fabricated data (§21 / Rule B; the same class of
--   default 022 removes from listings). Existing rows keep NULL = not set
--   (unknown); 021 sets 'active' explicitly for the accounts it provisions.
--
-- Safety:
--   100% additive & idempotent; no rows touched; no policy changes.
--   Naming sorts between 020a (probe/guard) and 021 — do NOT re-date.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status     TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.status IS
  'Account workflow state (baseline drift repair; added WITHOUT the baseline default per no-fabrication rule). NULL = not set.';
COMMENT ON COLUMN public.profiles.last_login IS
  'Last successful login timestamp (baseline drift repair). NULL = never observed.';
