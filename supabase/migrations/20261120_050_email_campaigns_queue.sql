-- ============================================================================
-- Migration 050: Supabase Authoritative Queue for Workflow 04 (email-sender)
-- ============================================================================
-- Replaces Google-Sheets-only campaign queueing with a durable Supabase table
-- following RLS + partial-index best practices.

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'error', 'cancelled')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_pending
  ON public.email_campaigns (created_at ASC)
  WHERE status = 'pending';

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.email_campaigns;
CREATE POLICY "service_role_all" ON public.email_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
