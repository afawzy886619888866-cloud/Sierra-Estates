-- 20261002_019c_baseline_repair_listings_publish_status.sql
-- =====================================================================
-- Baseline drift repair #2 (companion to 20260928_baseline_repair_dupe_check_hash.sql).
--
-- PROVEN by fresh-DB rebuild simulation (2026-10-04, Postgres 17.11 lab):
--   * public.listings.publish_status is referenced by 20261002_020_public_publish_gate.sql
--     (RLS policy + get_listings_near_capital rewrite) and by supabase/schema.sql RLS blocks,
--     but is declared ONLY ad hoc on the live database. Neither schema.sql's listings
--     definition nor any migration ever creates it.
--   * Consequence without this repair: fresh-environment rebuilds fail at migration 020
--     ("column publish_status does not exist") — the same failure class that halted 013.
--
-- Purely additive + idempotent:
--   * On LIVE: column already exists -> no-op (no data touched, all 15,754 rows keep
--     their existing values; nothing is forced to PUBLISHABLE — Rule B respected).
--   * On FRESH: column appears as NULL for every row = "not yet classified" (honest
--     unknown); RLS 020 then correctly hides all rows from anon until explicitly
--     classified. No default is invented.
-- Sort position: after 20261002_019_partner_accounts, before 20261002_020_public_publish_gate.
-- =====================================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS publish_status TEXT;

COMMENT ON COLUMN public.listings.publish_status IS
  'Publish gate classification (baseline drift repair #2). NULL = not yet classified (unknown, Rule B). Public visibility requires status=''active'' AND publish_status=''PUBLISHABLE'' (policy 020).';
