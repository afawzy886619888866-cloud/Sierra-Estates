-- ─────────────────────────────────────────────────────────────────────────
-- Migration 035: Listing Status Self-Transition & Synonym Guard
-- Allows equivalent canonical status transitions (e.g. active <-> available)
-- in public.can_transition_listing to keep the trigger aligned with TypeScript logic.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_transition_listing(from_raw TEXT, to_raw TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    -- Equivalent canonical status (self-transition or synonym) is always legal
    WHEN public.normalize_listing_status(from_raw) = public.normalize_listing_status(to_raw) THEN TRUE
    WHEN public.normalize_listing_status(from_raw) = 'draft'                THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    WHEN public.normalize_listing_status(from_raw) = 'pending_verification' THEN public.normalize_listing_status(to_raw) IN ('verified','draft','archived')
    WHEN public.normalize_listing_status(from_raw) = 'verified'             THEN public.normalize_listing_status(to_raw) IN ('published','pending_verification','archived')
    WHEN public.normalize_listing_status(from_raw) = 'published'            THEN public.normalize_listing_status(to_raw) IN ('reserved','rented','off_market','expired','pending_verification','archived')
    WHEN public.normalize_listing_status(from_raw) = 'reserved'             THEN public.normalize_listing_status(to_raw) IN ('sold','rented','published','archived')
    WHEN public.normalize_listing_status(from_raw) = 'rented'               THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN public.normalize_listing_status(from_raw) = 'off_market'           THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN public.normalize_listing_status(from_raw) = 'expired'              THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    ELSE FALSE  -- sold, archived = terminal
  END;
$$;
