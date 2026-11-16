-- ============================================================================
-- Migration 041 — CLOSE VIEW RLS BYPASS & ANON PII COLUMN SURFACE
-- ============================================================================
-- The §5.5 security review (2026-11-01) found, empirically verified against
-- the live REST API with the publishable (anon) key:
--
--   1. RLS BYPASS via owner-executed views: public.properties, public.units,
--      public.real_available_units and public.v_inventory_os are owned by
--      postgres with no security_invoker option, so queries through them
--      execute with the OWNER's privileges — the listings RLS policies never
--      apply. Verified: GET /rest/v1/properties?select=owner_phone returned
--      owner mobiles with NO status filter, and a zero-row PATCH through the
--      view returned 204 (the write executed as postgres) — i.e. anonymous
--      callers could read EVERY listing row and modify any of them.
--   2. PII COLUMNS on public rows: the "Public can view active listings"
--      policy gates ROWS, not columns — anon held table-level SELECT on
--      listings, so owner_phone / owner_name / broker_phone / raw_data were
--      readable on every active+PUBLISHABLE row (2,173 of 10,865 public rows
--      carry owner_phone).
--
-- Fix — 100% security-additive (no data changes, no policy changes):
--   A. security_invoker = on for the four passthrough views → the calling
--      role's RLS applies. service_role keeps full access via BYPASSRLS
--      (guardian workflows, Sheets sync, admin routes are unaffected).
--   B. REVOKE ALL on those views from anon AND authenticated (public signup
--      is enabled, so authenticated is effectively public; staff tooling
--      reads via service-role server routes).
--   C. Column-level SELECT on public.listings for anon/authenticated: the
--      public surface keeps every public-safe column — including all columns
--      the portal, map, search, feeds and photo-request routes select and
--      filter on — and loses only owner/broker contact, raw payloads and
--      internal sales-ops columns:
--      owner_id, owner_phone, owner_name, broker_name, broker_phone,
--      raw_data, embedding, embedding_768, ownership_doc_ref, verified_by,
--      verified_by_employee, sourced_by_agent, status_history, sources,
--      reservation_ref, reserved_until, registry_asset_id,
--      synced_to_registry, last_registry_sync, registry_status,
--      dupe_check_hash, sync_hash, source_verified_at, agent,
--      contact_status, listing_status, verified_available_date,
--      ai_fair_price.
--
--   D. get_listings_near_capital (invoker rights, SELECT *, SETOF
--      listings) is redefined to RETURNS TABLE over exactly the granted
--      public-safe columns, so the public radius search keeps working for
--      the anon role AND the RPC can never emit owner/broker PII.
--
-- Companion code changes (same commit): the five anon-path readers were
-- switched off select('*') to explicit public-safe column lists, and
-- POST /api/inventory/request-photos now resolves owner contact through the
-- service-role client.
-- ============================================================================

-- A. Views execute as the caller → listings RLS applies.
alter view public.properties set (security_invoker = on);
alter view public.units set (security_invoker = on);
alter view public.real_available_units set (security_invoker = on);
alter view public.v_inventory_os set (security_invoker = on);

-- B. Internal views: staff/service only. (applicants already carries
--    security_invoker=on and is left untouched.)
revoke all on public.properties from anon, authenticated;
revoke all on public.units from anon, authenticated;
revoke all on public.real_available_units from anon, authenticated;
revoke all on public.v_inventory_os from anon, authenticated;

-- C. Column-level public surface on the base table.
revoke select on public.listings from anon, authenticated;

grant select (
  id, ref_id, title, title_ar, description, description_ar,
  compound, developer, location_area, city, property_type, deal_type,
  offer_type, listing_type, price, price_currency, price_per_sqm,
  bedrooms, bathrooms, area_sqm, garden_sqm, roof_sqm, terrace_sqm,
  plot_sqm, floor_number, unit_view, finishing_type, furnishing_status,
  delivery_year, delivery_quarter, down_payment, installment_years,
  monthly_installment, maintenance_fee_per_sqm, roi_percentage, cap_rate,
  valuation_status, status, publish_status, stale, featured, is_hot_deal,
  is_featured_gem, source_channel, images, img, tag, ai_score, amenities,
  floor_plan_url, virtual_tour_url, photo_count, has_floor_plan,
  has_virtual_tour, data_quality_score, freshness_score, verified,
  publish_to_client, availability, days_on_market, se_code, code, sbr_code,
  unit_code, reference_code, pf_reference_number, pf_status, project_id,
  compound_id, developer_id, latitude, longitude, location_coords,
  agent_name, automation, sync_source, last_sync_at, created_at,
  updated_at, published_at, verified_at
) on public.listings to anon, authenticated;
-- D. Public radius search RPC returns ONLY the public-safe column set
--    (same list granted to anon in part C). Invoker-rights + explicit
--    columns keep it working for the anon role after the column grants —
--    and owner/broker PII can never leave the database through it.
-- The return type changes (SETOF listings -> TABLE of public-safe columns),
-- so the function must be dropped first. Zero-downtime: both public callers
-- already treat an RPC error as their documented fallback path.
drop function if exists public.get_listings_near_capital(numeric, numeric, numeric);

create or replace function public.get_listings_near_capital(
  capital_lat numeric, capital_lng numeric, radius_meters numeric
)
returns table (
  id text,
  ref_id text,
  title text,
  title_ar text,
  description text,
  description_ar text,
  compound text,
  developer text,
  location_area text,
  city text,
  property_type text,
  deal_type text,
  offer_type text,
  listing_type text,
  price numeric,
  price_currency text,
  price_per_sqm numeric,
  bedrooms integer,
  bathrooms integer,
  area_sqm numeric,
  garden_sqm numeric,
  roof_sqm numeric,
  terrace_sqm numeric,
  plot_sqm numeric,
  floor_number integer,
  unit_view text,
  finishing_type text,
  furnishing_status text,
  delivery_year integer,
  delivery_quarter text,
  down_payment numeric,
  installment_years integer,
  monthly_installment numeric,
  maintenance_fee_per_sqm numeric,
  roi_percentage numeric,
  cap_rate numeric,
  valuation_status text,
  status text,
  publish_status text,
  stale boolean,
  featured boolean,
  is_hot_deal boolean,
  is_featured_gem boolean,
  source_channel text,
  images text[],
  img text,
  tag text,
  ai_score numeric,
  amenities text[],
  floor_plan_url text,
  virtual_tour_url text,
  photo_count integer,
  has_floor_plan boolean,
  has_virtual_tour boolean,
  data_quality_score integer,
  freshness_score integer,
  verified boolean,
  publish_to_client boolean,
  availability text,
  days_on_market integer,
  se_code text,
  code text,
  sbr_code text,
  unit_code text,
  reference_code text,
  pf_reference_number text,
  pf_status text,
  project_id text,
  compound_id text,
  developer_id text,
  latitude double precision,
  longitude double precision,
  agent_name text,
  automation jsonb,
  sync_source text,
  last_sync_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  verified_at timestamptz
)
language plpgsql
stable
as $function$
begin
  return query
  select
    l.id,
    l.ref_id,
    l.title,
    l.title_ar,
    l.description,
    l.description_ar,
    l.compound,
    l.developer,
    l.location_area,
    l.city,
    l.property_type,
    l.deal_type,
    l.offer_type,
    l.listing_type,
    l.price,
    l.price_currency,
    l.price_per_sqm,
    l.bedrooms,
    l.bathrooms,
    l.area_sqm,
    l.garden_sqm,
    l.roof_sqm,
    l.terrace_sqm,
    l.plot_sqm,
    l.floor_number,
    l.unit_view,
    l.finishing_type,
    l.furnishing_status,
    l.delivery_year,
    l.delivery_quarter,
    l.down_payment,
    l.installment_years,
    l.monthly_installment,
    l.maintenance_fee_per_sqm,
    l.roi_percentage,
    l.cap_rate,
    l.valuation_status,
    l.status,
    l.publish_status,
    l.stale,
    l.featured,
    l.is_hot_deal,
    l.is_featured_gem,
    l.source_channel,
    l.images,
    l.img,
    l.tag,
    l.ai_score,
    l.amenities,
    l.floor_plan_url,
    l.virtual_tour_url,
    l.photo_count,
    l.has_floor_plan,
    l.has_virtual_tour,
    l.data_quality_score,
    l.freshness_score,
    l.verified,
    l.publish_to_client,
    l.availability,
    l.days_on_market,
    l.se_code,
    l.code,
    l.sbr_code,
    l.unit_code,
    l.reference_code,
    l.pf_reference_number,
    l.pf_status,
    l.project_id,
    l.compound_id,
    l.developer_id,
    l.latitude,
    l.longitude,
    l.agent_name,
    l.automation,
    l.sync_source,
    l.last_sync_at,
    l.created_at,
    l.updated_at,
    l.published_at,
    l.verified_at
  from public.listings l
  where l.location_coords is not null
    and st_dwithin(
      l.location_coords,
      st_setsrid(st_makepoint(capital_lng::float8, capital_lat::float8), 4326)::geography,
      radius_meters::float8
    )
    and (l.status = 'available' or l.status = 'active')
    and l.publish_status = 'PUBLISHABLE';
end;
$function$;

comment on function public.get_listings_near_capital is
'Public radius search: returns only PUBLISHABLE units (Phase D publish gate) and only the anon-granted public-safe columns (migration 041 — no owner/broker PII, no raw_data).';
