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
-- No data changes. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.units — the app-vocabulary view over listings (beds/bath/area/type/mode)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'units'
    ) THEN
        EXECUTE $view$
            CREATE VIEW public.units AS
            SELECT
                l.id,
                l.code,
                l.ref_id,
                l.title,
                l.title_ar,
                l.description,
                l.compound,
                l.developer,
                l.zone,
                l.city,
                l.property_type,
                l.deal_type,
                l.price,
                l.price_currency,
                l.bedrooms,
                l.bathrooms,
                l.area_sqm,
                l.garden_area,
                l.finishing_type,
                l.floor,
                l.status,
                l.publish_status,
                l.verified,
                l.publish_to_client,
                l.owner_name,
                l.owner_phone,
                l.broker_name,
                l.broker_phone,
                l.agent,
                l.img,
                l.photos,
                l.images,
                l.latitude,
                l.longitude,
                l.created_at,
                l.updated_at
            FROM public.listings l
        $view$;
        EXECUTE 'ALTER VIEW public.units SET (security_invoker = on)';
        EXECUTE 'GRANT SELECT ON public.units TO authenticated';
        -- anon gets nothing on units (PII-bearing view; public reads go
        -- through the listings column grants of migration 041).
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- public.real_available_units — the verified-available mirror view
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'real_available_units'
    ) THEN
        EXECUTE $view$
            CREATE VIEW public.real_available_units AS
            SELECT
                l.id,
                l.code,
                l.compound,
                l.property_type,
                l.deal_type,
                l.area_sqm,
                l.bedrooms,
                l.bathrooms,
                l.price,
                l.finishing_type,
                l.status,
                l.owner_name,
                l.owner_phone,
                l.img,
                l.created_at,
                l.updated_at
            FROM public.listings l
            WHERE l.status IN ('active', 'available')
              AND l.publish_status = 'PUBLISHABLE'
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
