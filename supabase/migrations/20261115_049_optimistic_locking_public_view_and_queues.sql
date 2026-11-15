-- ============================================================================
-- Migration 049: Optimistic Locking RPC, Non-PII public_properties_view &
--                Operational Queues (DLQ + Telegram Audit Log)
-- ============================================================================

-- 1. Optimistic-locking RPC so Google Sheets / Excel edits never silently
--    overwrite newer Supabase updates.
CREATE OR REPLACE FUNCTION public.rpc_update_unit_field(
  p_unit_id TEXT,
  p_expected_version INTEGER DEFAULT NULL,
  p_patch JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_updated_at TIMESTAMPTZ := NOW();
BEGIN
  IF p_unit_id IS NULL OR trim(p_unit_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_unit_id');
  END IF;

  SELECT COALESCE(version_id, 1)
    INTO v_current_version
    FROM public.listings
   WHERE id::text = p_unit_id OR code = p_unit_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF p_expected_version IS NOT NULL AND v_current_version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'version_conflict',
      'current_version', v_current_version
    );
  END IF;

  v_new_version := v_current_version + 1;

  UPDATE public.listings
     SET contact_status = COALESCE(NULLIF(p_patch->>'contact_status', ''), contact_status),
         listing_status = COALESCE(NULLIF(p_patch->>'listing_status', ''), listing_status),
         price = CASE
           WHEN (p_patch ? 'price') AND NULLIF(p_patch->>'price', '') IS NOT NULL
             THEN (p_patch->>'price')::numeric
           WHEN (p_patch ? 'price_egp') AND NULLIF(p_patch->>'price_egp', '') IS NOT NULL
             THEN (p_patch->>'price_egp')::numeric
           ELSE price
         END,
         verified_by_employee = COALESCE(NULLIF(p_patch->>'verified_by_employee', ''), verified_by_employee),
         verified_available_date = CASE
           WHEN (p_patch ? 'verified_available_date') AND NULLIF(p_patch->>'verified_available_date', '') IS NOT NULL
             THEN (p_patch->>'verified_available_date')::timestamptz
           ELSE verified_available_date
         END,
         score_tier = COALESCE(NULLIF(p_patch->>'score_tier', ''), score_tier),
         ai_score = CASE
           WHEN (p_patch ? 'ai_score') AND NULLIF(p_patch->>'ai_score', '') IS NOT NULL
             THEN (p_patch->>'ai_score')::numeric
           ELSE ai_score
         END,
         publish_status = COALESCE(NULLIF(p_patch->>'publish_status', ''), publish_status),
         version_id = v_new_version,
         updated_at = v_updated_at
   WHERE id::text = p_unit_id OR code = p_unit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'version_id', v_new_version,
    'updated_at', v_updated_at
  );
END;
$$;

-- 2. Strict non-PII public view for client portal anon reads.
--    Strictly excludes owner/broker PII columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'listings' AND c.relkind = 'r'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.public_properties_view
      WITH (security_invoker = on) AS
      SELECT
        l.id,
        l.code,
        COALESCE(l.unit_code, l.code) AS unit_code,
        l.title,
        l.title_ar,
        l.description,
        l.description_ar,
        l.compound,
        l.property_type,
        l.deal_type,
        l.finishing_type,
        l.furnishing_status,
        l.area_sqm,
        l.bedrooms,
        l.bathrooms,
        l.price AS price_egp,
        l.price_currency,
        l.images,
        l.photo_count,
        l.virtual_tour_url,
        l.ai_score,
        l.score_tier,
        l.status,
        l.publish_status,
        l.created_at,
        l.updated_at
      FROM public.listings l
      WHERE l.status IN ('active', 'available')
        AND l.publish_status = 'PUBLISHABLE'
    $view$;
    EXECUTE 'GRANT SELECT ON public.public_properties_view TO anon, authenticated';
  END IF;
END $$;

-- 3. WhatsApp Outreach Dead-Letter Queue (Phase 2)
CREATE TABLE IF NOT EXISTS public.outreach_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  unit_code TEXT,
  line_id TEXT,
  message_body TEXT,
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  backoff_hours INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_dlq_next_retry
  ON public.outreach_dead_letter_queue (status, next_retry_at);

ALTER TABLE public.outreach_dead_letter_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.outreach_dead_letter_queue;
CREATE POLICY "service_role_all" ON public.outreach_dead_letter_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Inbound Telegram Audit Log (Phase 2)
CREATE TABLE IF NOT EXISTS public.inbound_telegram_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id BIGINT,
  chat_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_telegram_audit_update_id
  ON public.inbound_telegram_audit_log (update_id);

ALTER TABLE public.inbound_telegram_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.inbound_telegram_audit_log;
CREATE POLICY "service_role_all" ON public.inbound_telegram_audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
