-- ═══════════════════════════════════════════════════════════════════════════
-- Sierra Estates — INVENTORY OS v2 · Additive Migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose : Normalize the inventory data model for the Egyptian market:
--           unit identity, payment plans, price history, status audit trail,
--           canonical status vocabulary, verification (2023 transparency rule).
-- Design  : 100% ADDITIVE & IDEMPOTENT — no destructive changes, safe to run
--           on the live production Supabase project. Existing columns keep
--           working; new columns default to NULL/0 until backfilled.
-- Order   : run AFTER supabase/schema.sql (appends to the same conventions).
-- Author  : Inventory OS v2 upgrade (see docs/INVENTORY_OS_BLUEPRINT.md)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. UNIT IDENTITY — link listings to projects/developers (FK-safe, additive)
-- ─────────────────────────────────────────────────────────────────────────
-- NOTE: live projects/compounds/developers use TEXT primary keys (verified
-- against the production table), so the FK columns are TEXT to match.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS unit_code       TEXT,
  ADD COLUMN IF NOT EXISTS project_id      TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compound_id     TEXT REFERENCES public.compounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS developer_id    TEXT REFERENCES public.developers(id) ON DELETE SET NULL;

UPDATE public.listings l
  SET project_id = p.id
  FROM public.projects p
  WHERE l.project_id IS NULL
    AND (TRIM(LOWER(l.compound)) = TRIM(LOWER(p.name))
      OR TRIM(LOWER(l.compound)) = TRIM(LOWER(COALESCE(p.name_ar, p.name))));

UPDATE public.listings l
  SET compound_id = c.id
  FROM public.compounds c
  WHERE l.compound_id IS NULL
    AND TRIM(LOWER(l.compound)) = TRIM(LOWER(c.name));

UPDATE public.listings l
  SET developer_id = d.id
  FROM public.developers d
  WHERE l.developer_id IS NULL
    AND TRIM(LOWER(COALESCE(l.developer, ''))) = TRIM(LOWER(d.name));

CREATE INDEX IF NOT EXISTS idx_listings_project_id   ON public.listings(project_id);
CREATE INDEX IF NOT EXISTS idx_listings_developer_id ON public.listings(developer_id);
CREATE INDEX IF NOT EXISTS idx_listings_unit_code    ON public.listings(unit_code);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. EGYPTIAN UNIT ATTRIBUTES — missing spec & pricing dimensions
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS offer_type        TEXT DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS listing_type      TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS garden_sqm        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roof_sqm          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terrace_sqm       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plot_sqm          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floor_number      INTEGER,
  ADD COLUMN IF NOT EXISTS unit_view         TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_fee_per_sqm NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_quarter  TEXT,
  ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by       TEXT,
  ADD COLUMN IF NOT EXISTS ownership_doc_ref TEXT,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserved_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_ref   TEXT,
  ADD COLUMN IF NOT EXISTS days_on_market    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_floor_plan    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_virtual_tour  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stale             BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. NORMALIZED PAYMENT PLANS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id                  TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  plan_type                TEXT NOT NULL DEFAULT 'installment'
                           CHECK (plan_type IN ('installment', 'cash')),
  down_payment_percent     NUMERIC(6,3) NOT NULL DEFAULT 10,
  installment_years        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  installment_frequency    TEXT NOT NULL DEFAULT 'quarterly'
                           CHECK (installment_frequency IN ('monthly','quarterly','semi_annual','annual')),
  delivery_payment_percent NUMERIC(6,3)  NOT NULL DEFAULT 0,
  post_delivery_years      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cash_discount_percent    NUMERIC(6,3)  NOT NULL DEFAULT 0,
  maintenance_fee_annual   NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_plans_unit ON public.payment_plans(unit_id);
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_plans_public_read"  ON public.payment_plans;
DROP POLICY IF EXISTS "payment_plans_admin_write"  ON public.payment_plans;
CREATE POLICY "payment_plans_public_read" ON public.payment_plans FOR SELECT USING (true);
CREATE POLICY "payment_plans_admin_write" ON public.payment_plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 4. PRICE HISTORY
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  price_egp     NUMERIC(15,2) NOT NULL,
  price_usd     NUMERIC(15,2),
  price_per_sqm NUMERIC(12,2),
  reason        TEXT NOT NULL DEFAULT 'initial'
                CHECK (reason IN ('initial','price_cut','price_increase','relist','avm_adjustment')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_unit ON public.price_history(unit_id, created_at);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_history_public_read" ON public.price_history;
DROP POLICY IF EXISTS "price_history_admin_write" ON public.price_history;
CREATE POLICY "price_history_public_read" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "price_history_admin_write" ON public.price_history FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 5. STATUS HISTORY — audit trail for every lifecycle transition
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_history_unit ON public.status_history(unit_id, created_at);
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_history_admin_all" ON public.status_history;
CREATE POLICY "status_history_admin_all" ON public.status_history FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 6. CANONICAL STATUS VOCABULARY + GUARDED TRANSITIONS (DB-level)
--    Maps the 7 legacy vocabularies into ONE machine. Legacy values keep
--    working through normalize_listing_status().
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_listing_status(raw TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN raw IS NULL THEN 'draft'
    WHEN LOWER(TRIM(raw)) IN ('available','active','verified') THEN 'published'
    WHEN LOWER(TRIM(raw)) IN ('pending','pending review','pending_review','pending_verification') THEN 'pending_verification'
    WHEN LOWER(TRIM(raw)) IN ('sold') THEN 'sold'
    WHEN LOWER(TRIM(raw)) IN ('rented') THEN 'rented'
    WHEN LOWER(TRIM(raw)) IN ('reserved') THEN 'reserved'
    WHEN LOWER(TRIM(raw)) IN ('off-market','off_market') THEN 'off_market'
    WHEN LOWER(TRIM(raw)) IN ('expired') THEN 'expired'
    WHEN LOWER(TRIM(raw)) IN ('archived') THEN 'archived'
    ELSE 'draft'
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_transition_listing(from_raw TEXT, to_raw TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE public.normalize_listing_status(from_raw)
    WHEN 'draft'                THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    WHEN 'pending_verification' THEN public.normalize_listing_status(to_raw) IN ('verified','draft','archived')
    WHEN 'verified'             THEN public.normalize_listing_status(to_raw) IN ('published','pending_verification','archived')
    WHEN 'published'            THEN public.normalize_listing_status(to_raw) IN ('reserved','rented','off_market','expired','pending_verification','archived')
    WHEN 'reserved'             THEN public.normalize_listing_status(to_raw) IN ('sold','rented','published','archived')
    WHEN 'rented'               THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN 'off_market'           THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN 'expired'              THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    ELSE FALSE  -- sold, archived = terminal
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6b. STATUS CHECK WIDENING — let the canonical vocabulary through while
--     keeping every legacy value valid (normalize maps them on read).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN (
    -- canonical Inventory OS vocabulary
    'draft', 'pending_verification', 'verified', 'published',
    'reserved', 'sold', 'rented', 'off_market', 'expired', 'archived',
    -- legacy values (still accepted; normalized by normalize_listing_status)
    'active', 'pending', 'available', 'off-market', 'Pending Review'
  ));

CREATE OR REPLACE FUNCTION public.listing_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NOT public.can_transition_listing(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Illegal listing transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history(unit_id, from_status, to_status, actor, note)
    VALUES (NEW.id, OLD.status, NEW.status,
            COALESCE(NULLIF(current_setting('app.actor', true), ''), 'system'), NULL);
    IF public.normalize_listing_status(NEW.status) = 'verified' AND NEW.verified_at IS NULL THEN
      NEW.verified_at := NOW();
    END IF;
    IF public.normalize_listing_status(NEW.status) = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_status_guard ON public.listings;
CREATE TRIGGER trg_listing_status_guard
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listing_status_guard();

-- ─────────────────────────────────────────────────────────────────────────
-- 7. FRESHNESS SLA — auto-flag stale verified units (30 days)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_stale_listings()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE public.listings
  SET stale = TRUE
  WHERE stale = FALSE
    AND public.normalize_listing_status(status) IN ('verified','published')
    AND verified_at IS NOT NULL
    AND verified_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. DATA QUALITY SCORE (0-100)
--    completeness 35 + media 20 + verification 25 + pricing sanity 20
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_listing_dq(l public.listings)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(100, (
    (CASE WHEN l.bedrooms > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN l.bathrooms > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN l.area_sqm > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN COALESCE(l.finishing_type,'') <> '' THEN 4 ELSE 0 END) +
    (CASE WHEN l.delivery_year IS NOT NULL THEN 4 ELSE 0 END) +
    (CASE WHEN COALESCE(l.description,'') <> '' THEN 8 ELSE 0 END) +
    LEAST(10, COALESCE(l.photo_count,0) * 2) +
    (CASE WHEN l.has_floor_plan THEN 6 ELSE 0 END) +
    (CASE WHEN l.has_virtual_tour THEN 4 ELSE 0 END) +
    (CASE WHEN l.verified_at IS NOT NULL THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(l.ownership_doc_ref,'') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN l.price > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN l.price > 0 AND l.area_sqm > 0
          AND l.price / l.area_sqm BETWEEN 30000 AND 250000 THEN 10 ELSE 0 END) +
    (CASE WHEN l.unit_view IS NOT NULL THEN 4 ELSE 0 END)
  ))::INTEGER;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. EGYPTIAN INSTALLMENT HELPER (parity with demo calculator)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calc_plan_installment(
  p_price NUMERIC, p_dp_percent NUMERIC, p_years NUMERIC, p_freq_per_year INTEGER, p_balloon_percent NUMERIC DEFAULT 0
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_price <= 0 OR p_years <= 0 THEN 0
    ELSE (p_price * (1 - p_dp_percent/100.0 - p_balloon_percent/100.0)) / (p_years * p_freq_per_year)
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. DEDUPE FINGERPRINT (unified: compound|type|offer|beds|areaBand|priceBand)
-- ─────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.listing_fingerprint(
  p_compound TEXT, p_type TEXT, p_offer TEXT, p_beds INTEGER, p_area NUMERIC, p_price NUMERIC
) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT substr(encode(digest(
    lower(trim(p_compound)) || '|' || lower(trim(p_type)) || '|' || lower(trim(p_offer)) || '|' ||
    COALESCE(p_beds::TEXT,'0') || '|' ||
    (ROUND(COALESCE(p_area,0) / 5) * 5)::TEXT || '|' ||
    (CASE WHEN COALESCE(p_price,0) > 0 THEN ROUND(LN(COALESCE(p_price,1)) / LN(1.05))::TEXT ELSE '0' END),
    'sha256'), 'hex'), 1, 24);
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. ADMIN FEED VIEW — one query, all relations
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_inventory_os AS
SELECT
  l.id, COALESCE(l.unit_code, l.code) AS unit_code, l.title, l.compound,
  -- live table has no `zone` column: the district lives in location_area
  l.location_area AS zone,
  p.name AS project_name, d.name AS developer_name, d.tier AS developer_tier,
  l.city, l.location_area,
  -- live table has no `category` column (property_type covers it)
  NULL::text AS category, l.property_type,
  COALESCE(l.offer_type, l.deal_type) AS offer_type,
  l.listing_type, l.bedrooms, l.bathrooms, l.area_sqm, l.garden_sqm, l.roof_sqm,
  l.plot_sqm, l.floor_number, l.unit_view, l.finishing_type, l.delivery_year,
  l.delivery_quarter, l.price, l.price_currency, l.price_per_sqm,
  l.maintenance_fee_per_sqm, l.status,
  -- live table has no `verified` boolean: derive from verified_at (2023 rule)
  (l.verified_at IS NOT NULL) AS verified, l.verified_at, l.ownership_doc_ref,
  l.published_at, l.reserved_until, l.reservation_ref, l.days_on_market,
  l.photo_count, l.has_floor_plan, l.has_virtual_tour, l.data_quality_score,
  -- live table has neither ai_score nor dupe_check_hash; placeholders keep
  -- the view shape stable for consumers (UI does not read them)
  NULL::integer AS ai_score, NULL::text AS dupe_check_hash, l.sync_source, l.stale,
  l.down_payment, l.installment_years, l.monthly_installment,
  (SELECT COUNT(*) FROM public.payment_plans pp WHERE pp.unit_id = l.id) AS plan_count,
  (SELECT pp.name FROM public.payment_plans pp WHERE pp.unit_id = l.id AND pp.is_default LIMIT 1) AS default_plan_name,
  (SELECT ph.price_egp FROM public.price_history ph WHERE ph.unit_id = l.id ORDER BY ph.created_at DESC LIMIT 1) AS last_price,
  (SELECT COUNT(*) FROM public.price_history ph WHERE ph.unit_id = l.id) AS price_points,
  public.compute_listing_dq(l) AS dq_computed,
  l.created_at, l.updated_at
FROM public.listings l
LEFT JOIN public.projects   p ON p.id = l.project_id
LEFT JOIN public.developers d ON d.id = l.developer_id;

-- ═══════════════════════════════ END OF MIGRATION ═════════════════════════
