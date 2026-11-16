-- ═══════════════════════════════════════════════════════════════════════════
-- 20261101_040_master_inventory_operational_columns.sql
-- Mission 3 (2026-11-01): Google Sheets ↔ Supabase two-way responsive
-- architecture — operational columns backing the Master_Inventory tab
-- contract and the Real_Available_Units live view.
--
-- Column ↔ sheet mapping (workflows/14-sheets-supabase-sync/sync.js):
--   contact_status          → Contact_Status       (default 'Not Contacted Yet')
--   listing_status          → Listing_Status        (default 'Pending Verification')
--   verified_available_date → Verified_Available_Date (stamped when a unit
--                             enters Real_Available_Units)
--   ai_fair_price           → AI_Fair_Price_Benchmark (AVM engine, Bot 2)
--   is_featured_gem         → Is_Featured_Gem       (💎 GEM flag, Bot 1)
--   sourced_by_agent        → Sourced_By_Agent
--   verified_by_employee    → Verified_By_Employee
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_status TEXT
    DEFAULT 'Not Contacted Yet',
  ADD COLUMN IF NOT EXISTS listing_status TEXT
    DEFAULT 'Pending Verification',
  ADD COLUMN IF NOT EXISTS verified_available_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_fair_price NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS is_featured_gem BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sourced_by_agent TEXT,
  ADD COLUMN IF NOT EXISTS verified_by_employee TEXT;

-- Contact status vocabulary guard: keeps the operational defaults honest
-- at the row level (dropdown parity with the Master Sheet).
CREATE OR REPLACE FUNCTION public.guard_contact_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_status IS NULL THEN
    NEW.contact_status := 'Not Contacted Yet';
  END IF;
  IF NEW.listing_status IS NULL THEN
    NEW.listing_status := 'Pending Verification';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS listings_contact_status_guard ON public.listings;
CREATE TRIGGER listings_contact_status_guard
  BEFORE INSERT OR UPDATE OF contact_status, listing_status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_contact_status();

-- Real_Available_Units live view (Tab 2): ONLY units that are
-- Listing_Status = 'Available' AND Contact_Status = 'Verified Available'.
CREATE OR REPLACE VIEW public.real_available_units AS
SELECT
  id, code, unit_code, se_code,
  contact_status, listing_status, verified_available_date,
  deal_type, compound, property_type, area_sqm,
  bedrooms, bathrooms, floor_number, furnishing_status, finishing_type,
  price, ai_fair_price, is_featured_gem,
  owner_name, owner_phone, availability,
  sourced_by_agent, verified_by_employee,
  images, photo_count, source_channel,
  created_at, updated_at
FROM public.listings
WHERE listing_status = 'Available'
  AND contact_status = 'Verified Available';

-- Fast path for the Atlas Sync guardian (Bot 3) watching the live view.
CREATE INDEX IF NOT EXISTS idx_listings_real_available
  ON public.listings (verified_available_date DESC)
  WHERE listing_status = 'Available' AND contact_status = 'Verified Available';

-- Outreach segmentation support (Mission 2 paced workers):
-- rent-owning owners vs everyone else, straight off an index.
CREATE INDEX IF NOT EXISTS idx_listings_owner_phone_deal
  ON public.listings (owner_phone, deal_type)
  WHERE owner_phone IS NOT NULL AND owner_phone <> '';

-- Stamped when a unit is promoted to Verified Available.
COMMENT ON COLUMN public.listings.verified_available_date IS
  'Set when contact_status becomes Verified Available; drives the Real_Available_Units tab + view (Mission 3, 2026-11-01).';
