-- Migration 045: Atomic cross-worker owner outreach deduplication claims
-- Prevents 09-owner-outreach, 13-paced-outreach, or parallel lanes from ever
-- sending to the same phone number twice, even across separate containers.

CREATE TABLE IF NOT EXISTS public.owner_outreach_claims (
  phone TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'outreach',
  listing_code TEXT,
  session_name TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_outreach_claims IS
  'Atomic one-row-per-phone claim lock for owner WhatsApp outreach. Primary key on canonical phone (201xxxxxxxxx) guarantees zero duplicate sends across all workflows and containers.';

CREATE INDEX IF NOT EXISTS idx_owner_outreach_claims_claimed_at
  ON public.owner_outreach_claims (claimed_at DESC);

ALTER TABLE public.owner_outreach_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_outreach_claims_staff_read" ON public.owner_outreach_claims;
CREATE POLICY "owner_outreach_claims_staff_read" ON public.owner_outreach_claims
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- Backfill all historically contacted non-dry-run numbers
INSERT INTO public.owner_outreach_claims (phone, source, listing_code, session_name, claimed_at)
SELECT DISTINCT ON (phone)
  phone,
  COALESCE(host_side, 'historical_log'),
  listing_code,
  session_name,
  sent_at
FROM public.owner_outreach_log
WHERE dry_run = false
  AND phone IS NOT NULL
  AND phone <> ''
ORDER BY phone, sent_at ASC
ON CONFLICT (phone) DO NOTHING;
