-- ─────────────────────────────────────────────────────────────────────────
-- Migration 036: SECURITY DEFINER search_path pinning (Supabase lint 10009)
--
-- Pins search_path on the two SECURITY DEFINER functions shipped by
-- migration 011 (inventory_os_v2) which predate the repo's search_path
-- convention (see migration 016 and the live is_staff()/is_admin()
-- pattern, both already pinned to "public, pg_temp").
--
--   · flag_stale_listings()  — freshness-SLA flagger (30-day verified units)
--   · listing_status_guard() — BEFORE UPDATE trigger guard on listings
--
-- Metadata-only hardening: function bodies are already fully
-- schema-qualified, so this changes no behavior, holds no table locks,
-- and is idempotent by nature. Fail-loudly by design: if a function is
-- missing, the ALTER must error rather than silently pass.
-- ─────────────────────────────────────────────────────────────────────────

ALTER FUNCTION public.flag_stale_listings()  SET search_path = public, pg_temp;
ALTER FUNCTION public.listing_status_guard() SET search_path = public, pg_temp;
