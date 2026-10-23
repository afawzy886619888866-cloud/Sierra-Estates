-- ═══════════════════════════════════════════════════════════════════════════
-- 20261002_018_easy_listing_map_sheet.sql — Easy Listing (broker MAP_SHEET)
--
-- Broker staging table for the /api/easy-listing smart routing endpoint:
--
--   Problem: Easy Listing routes AGENT/OWNER submissions into MAIN_INVENTORY
--     (public.listings, staged as 'Pending Review'), but BROKER submissions
--     must NOT touch the main inventory — they belong on the Excel "map
--     sheet" until photos arrive and a serious client appears. There was no
--     durable, auditable home for broker entries: the sheet is an export,
--     not a database, so broker units had nowhere to live before export and
--     no state column to track the photo request the bot owes the broker.
--
--   Decision: public.map_sheet_entries holds every broker submission with
--     the parsed property fields, the generated internal code
--     ([REGION]-[COMPOUND]-[UNIT_TYPE]-[FLOOR]-[AREA]M), the raw pasted text
--     (audit trail), and a photo_request_status lifecycle:
--       not_requested → requested (WhatsApp job queued by the endpoint)
--                     → received (photos attached) → completed
--     The Excel map-sheet exports read from here; promoting a row to
--     MAIN_INVENTORY later is an explicit staff action (listing_id link).
--
-- ADDITIVE & IDEMPOTENT: new table + policies that are DROP-IF-EXISTS +
-- CREATE. Nothing is dropped, renamed or back-filled.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Broker map-sheet staging table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.map_sheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_code TEXT NOT NULL,
    uploader_role TEXT NOT NULL
        CHECK (uploader_role IN ('AGENT', 'OWNER', 'BROKER')),
    uploader_name TEXT NOT NULL,
    uploader_phone TEXT NOT NULL,
    region TEXT,
    compound TEXT,
    unit_type TEXT,
    floor_label TEXT,
    area_m2 NUMERIC(10, 2),
    bedrooms INT,
    bathrooms INT,
    price_egp NUMERIC(15, 2),
    deal_type TEXT NOT NULL DEFAULT 'sale'
        CHECK (deal_type IN ('sale', 'rent')),
    raw_text TEXT,
    photo_request_status TEXT NOT NULL DEFAULT 'not_requested'
        CHECK (photo_request_status IN ('not_requested', 'requested', 'received', 'completed')),
    photo_request_queued_at TIMESTAMPTZ,
    -- Set when staff promotes a broker unit into MAIN_INVENTORY
    -- (public.listings.id) after photos + a serious client.
    listing_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Same updated_at contract as every other operational table
-- (drop-first so the migration stays re-runnable).
DROP TRIGGER IF EXISTS trigger_update_map_sheet_entries ON public.map_sheet_entries;
CREATE TRIGGER trigger_update_map_sheet_entries
    BEFORE UPDATE ON public.map_sheet_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Lookup paths used by the admin console + the Excel map-sheet export.
CREATE INDEX IF NOT EXISTS idx_map_sheet_internal_code
    ON public.map_sheet_entries(internal_code);
CREATE INDEX IF NOT EXISTS idx_map_sheet_uploader_phone
    ON public.map_sheet_entries(uploader_phone);
CREATE INDEX IF NOT EXISTS idx_map_sheet_photo_status
    ON public.map_sheet_entries(photo_request_status);
CREATE INDEX IF NOT EXISTS idx_map_sheet_created_at
    ON public.map_sheet_entries(created_at DESC);

COMMENT ON TABLE public.map_sheet_entries IS
    'Easy Listing broker staging — MAP_SHEET route. Written by /api/easy-listing (service role), read by staff + exports.';

-- ── 2. Row Level Security ───────────────────────────────────────────────────
-- Broker submissions carry the uploader's name + phone (personal data) and
-- unverified market intel: staff-only, exactly like whatsapp_queue. The
-- /api/easy-listing route writes through the service role, which bypasses
-- RLS; every interactive reader must be staff.
ALTER TABLE public.map_sheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "map_sheet_entries_staff_access" ON public.map_sheet_entries;
CREATE POLICY "map_sheet_entries_staff_access" ON public.map_sheet_entries
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
