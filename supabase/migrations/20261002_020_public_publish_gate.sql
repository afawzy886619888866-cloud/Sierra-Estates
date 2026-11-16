-- ============================================================================
-- Migration 020 — PUBLIC PUBLISH GATE (activation plan Phase D)
-- ============================================================================
-- The public client must see ONLY publish_status = 'PUBLISHABLE' inventory.
-- Before this migration the public RLS policy gated on status alone, so every
-- 'active' row — including unverified units — was publicly readable, and the
-- app-level /api/listings queries matched that behavior.
--
-- Changes (both reversible, no data is touched):
--   1. listings public SELECT policy now requires
--      (status = 'active' AND publish_status = 'PUBLISHABLE') OR is_staff()
--   2. get_listings_near_capital() radius search filters publish_status too.
--
-- Staff/admin access is preserved via public.is_staff(); the service-role
-- client bypasses RLS entirely, so internal/admin surfaces are unaffected.
-- ============================================================================

-- 1. Public visibility policy -------------------------------------------------
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings"
    ON public.listings
    FOR SELECT
    USING (
        (
            status = 'active'
            AND publish_status = 'PUBLISHABLE'
        )
        OR public.is_staff()
    );

COMMENT ON POLICY "Public can view active listings" ON public.listings IS
'Activation plan Phase D: the anonymous public may only read verified PUBLISHABLE units; staff retain full read access.';

-- 2. Proximity search gate ----------------------------------------------------
CREATE OR REPLACE FUNCTION get_listings_near_capital(capital_lat numeric, capital_lng numeric, radius_meters numeric)
RETURNS SETOF public.listings AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.listings
  WHERE location_coords IS NOT NULL
    AND ST_DWithin(
      location_coords,
      ST_SetSRID(ST_MakePoint(capital_lng::float8, capital_lat::float8), 4326)::geography,
      radius_meters::float8
    )
    AND (status = 'available' OR status = 'active')
    AND publish_status = 'PUBLISHABLE';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_listings_near_capital IS
'Public radius search: returns only PUBLISHABLE units (Phase D publish gate).';
