-- 20261003_022_no_fabrication_defaults.sql
-- §21 no-fabrication sweep (database level)
--
-- The legacy schema draft shipped column DEFAULTs on public.listings that
-- INVENT property facts whenever an INSERT omitted them:
--   location_area   DEFAULT 'New Cairo'     (invented location)
--   city            DEFAULT 'Cairo'         (invented city)
--   property_type   DEFAULT 'Apartment'     (invented unit type)
--   deal_type       DEFAULT 'sale'          (invented deal type)
--   finishing_type  DEFAULT 'Core & Shell'  (invented finishing spec)
--   valuation_status DEFAULT 'Fair Value'   (invented valuation verdict)
--
-- §21 of the activation protocol forbids fabricated data: an unknown fact
-- must surface as NULL (or an explicit 'Unknown' marker at the edge), never
-- silently materialize as a plausible-looking default that staff then have
-- to fact-check. Every runtime write path (easy-listing, listings/submit,
-- admin listings, inventory ingestion) already supplies these columns
-- explicitly from parsed data, so the defaults only ever fire for exactly
-- the rows whose data is missing — i.e. they fabricate precisely when they
-- must not.
--
-- ALTER COLUMN ... DROP DEFAULT is idempotent: it is a no-op for columns
-- that never carried (or already lost) the default, so this migration is
-- safe whether or not the live table still has the draft defaults.
--
-- Deliberately KEPT (not property-fact fabrication):
--   price/bedrooms/bathrooms/area_sqm DEFAULT 0      — numeric unknown sentinel
--   price_currency DEFAULT 'EGP'                     — platform currency convention
--   status DEFAULT 'active'                          — workflow state (publish gate
--                                                      filters on publish_status)

ALTER TABLE public.listings
  ALTER COLUMN location_area    DROP DEFAULT,
  ALTER COLUMN city             DROP DEFAULT,
  ALTER COLUMN property_type    DROP DEFAULT,
  ALTER COLUMN deal_type        DROP DEFAULT,
  ALTER COLUMN finishing_type   DROP DEFAULT,
  ALTER COLUMN valuation_status DROP DEFAULT;
