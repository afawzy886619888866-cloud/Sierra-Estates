-- ============================================================================
-- 20261115_047_units_views_reproducible.sql
--
-- Module 5 — reproducible DDL for the `units` surface + Module-4 columns.
--
-- public.units and public.real_available_units are long-lived VIEWS over
-- public.listings (migration 041 flipped them to security_invoker), but
-- their CREATE VIEW DDL never existed in the repo — a fresh Supabase project
-- cannot reproduce the schema. This migration creates them idempotently so
-- the app's reads work on a fresh database.
--
-- 2026-11-16: view bodies regenerated verbatim from the live project
-- (pg_get_viewdef) — the previous hand-written bodies referenced
-- listings.zone / listings.garden_area, columns that do not exist (the
-- district lives in location_area and the garden size in garden_sqm; see
-- migration 011 for the same aliasing rule), so a fresh replay would fail.
-- No data changes. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.units — the app-vocabulary view over listings
-- (definition mirrors the live project exactly)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'units'
    ) THEN
        EXECUTE $view$
            SELECT id,
    ref_id,
    title,
    title_ar,
    description,
    description_ar,
    compound,
    developer,
    location_area,
    city,
    property_type,
    deal_type,
    price,
    price_currency,
    bedrooms,
    bathrooms,
    area_sqm,
    finishing_type,
    delivery_year,
    down_payment,
    installment_years,
    monthly_installment,
    roi_percentage,
    cap_rate,
    valuation_status,
    status,
    featured,
    is_hot_deal,
    owner_id,
    owner_phone,
    owner_name,
    broker_name,
    broker_phone,
    source_channel,
    images,
    floor_plan_url,
    virtual_tour_url,
    amenities,
    raw_data,
    embedding,
    created_at,
    updated_at,
    embedding_768,
    code,
    pf_reference_number,
    pf_status,
    automation,
    sync_hash,
    sync_source,
    last_sync_at,
    agent_name,
    furnishing_status,
    registry_asset_id,
    synced_to_registry,
    last_registry_sync,
    registry_status,
    sbr_code,
    price_per_sqm,
    latitude,
    longitude,
    location_coords,
    reference_code,
    unit_code,
    project_id,
    compound_id,
    developer_id,
    offer_type,
    listing_type,
    garden_sqm,
    roof_sqm,
    terrace_sqm,
    plot_sqm,
    floor_number,
    unit_view,
    maintenance_fee_per_sqm,
    delivery_quarter,
    verified_at,
    verified_by,
    ownership_doc_ref,
    published_at,
    reserved_until,
    reservation_ref,
    days_on_market,
    photo_count,
    has_floor_plan,
    has_virtual_tour,
    data_quality_score,
    stale,
    publish_status,
    dupe_check_hash,
    source_verified_at,
    availability,
    sources,
    status_history
   FROM listings
        $view$;
        EXECUTE 'ALTER VIEW public.units SET (security_invoker = on)';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- public.real_available_units — the verified-available mirror view
-- (definition mirrors the live project exactly: rows are those whose
-- listing_status = 'Available' AND contact_status = 'Verified Available')
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'real_available_units'
    ) THEN
        EXECUTE $view$
            SELECT id,
    code,
    unit_code,
    se_code,
    contact_status,
    listing_status,
    verified_available_date,
    deal_type,
    compound,
    property_type,
    area_sqm,
    bedrooms,
    bathrooms,
    floor_number,
    furnishing_status,
    finishing_type,
    price,
    ai_fair_price,
    is_featured_gem,
    owner_name,
    owner_phone,
    availability,
    sourced_by_agent,
    verified_by_employee,
    images,
    photo_count,
    source_channel,
    created_at,
    updated_at
   FROM listings
  WHERE listing_status = 'Available'::text AND contact_status = 'Verified Available'::text
        $view$;
        EXECUTE 'ALTER VIEW public.real_available_units SET (security_invoker = on)';
        EXECUTE 'GRANT SELECT ON public.real_available_units TO authenticated';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Module-4 columns the Add-Listing flow writes: the base listings table
-- already carries floor/down_payment/installment_years/monthly_installment;
-- ensure they exist on older deployments too, plus the availability
-- vocabulary (Available | Reserved | Sold/Rented).
-- ---------------------------------------------------------------------------

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS floor TEXT,
    ADD COLUMN IF NOT EXISTS availability TEXT
        CHECK (availability IS NULL OR availability IN ('Available', 'Reserved', 'Sold/Rented'));

-- Availability ↔ status coherence for quick-add writes: map the
-- user-facing availability vocabulary onto the canonical status values
-- (staff can still override status directly afterwards).
CREATE OR REPLACE FUNCTION public.sync_listings_availability_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.availability IS NOT NULL THEN
        IF NEW.availability = 'Sold/Rented' AND NEW.status NOT IN ('sold', 'rented') THEN
            NEW.status := CASE WHEN NEW.deal_type = 'rent' THEN 'rented' ELSE 'sold' END;
        ELSIF NEW.availability = 'Reserved' AND NEW.status NOT IN ('reserved') THEN
            NEW.status := 'reserved';
        ELSIF NEW.availability = 'Available' AND NEW.status IN ('sold', 'rented', 'reserved') THEN
            NEW.status := 'available';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_listings_availability ON public.listings;
CREATE TRIGGER trg_listings_availability
    BEFORE INSERT OR UPDATE OF availability ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.sync_listings_availability_status();

-- ---------------------------------------------------------------------------
-- Indexes the dedup lookup (phone + compound) and the request matcher lean on.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_listings_owner_phone ON public.listings (owner_phone);
CREATE INDEX IF NOT EXISTS idx_listings_broker_phone ON public.listings (broker_phone);
CREATE INDEX IF NOT EXISTS idx_listings_status_publish ON public.listings (status, publish_status);

-- ============================================================================
-- Done. Companion code: lib/services/AddListingPipeline.ts (Module 4).
-- ============================================================================
