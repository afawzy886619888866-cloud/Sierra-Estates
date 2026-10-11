-- ═══════════════════════════════════════════════════════════════════
-- 027 — OWNER LISTING INTAKE (Phase 2 + Phase 3)
--
-- One durable, reviewable lifecycle for owner-submitted units:
--   RECEIVED → PARSING → NEEDS_INFORMATION / NEEDS_CODE →
--   REVIEW_REQUIRED → (staff) HUMAN_VERIFIED → PUBLISHABLE → PUBLISHED
-- plus DUPLICATE / FAILED retryable states.
--
-- Why: the old August-owner path asked owners for missing fields BEFORE any
-- durable write existed, so a follow-up reply was re-parsed as a brand-new
-- message (no merge), every complete message created TWO listings rows, and
-- no message-id idempotency existed anywhere.
--
-- Additive only — no existing table or applied migration is altered.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. The intake lifecycle record ──
CREATE TABLE IF NOT EXISTS public.owner_listing_intakes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-visible, stable code reused across retries and replies.
  intake_code     TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'RECEIVED',
  -- RECEIVED | PARSING | NEEDS_INFORMATION | NEEDS_CODE | REVIEW_REQUIRED |
  -- HUMAN_VERIFIED | PUBLISHABLE | PUBLISHED | DUPLICATE | FAILED
  source          TEXT NOT NULL,                     -- whatsapp-august-owners | whatsapp-dm | telegram | web | sheet
  sender_phone    TEXT NOT NULL,
  group_id        TEXT,
  -- Extraction results (null = unknown; never fabricated defaults).
  extracted       JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields  TEXT[] NOT NULL DEFAULT '{}',
  media_urls      TEXT[] NOT NULL DEFAULT '{}',
  raw_text        TEXT,
  -- Canonical inventory linkage (written exactly once).
  -- NOTE: public.listings.id is TEXT in the live schema (see migration 011's
  -- header note — the inventory tables predate the migration ledger and use
  -- TEXT primary keys), so the FK column is TEXT to match. A UUID column here
  -- makes CREATE TABLE fail with "foreign key constraint ... cannot be
  -- implemented" on first real apply.
  unit_id         TEXT REFERENCES public.listings (id) ON DELETE SET NULL,
  listing_code    TEXT,
  dupe_check_hash TEXT,
  -- Duplicate linkage.
  duplicate_of    UUID REFERENCES public.owner_listing_intakes (id) ON DELETE SET NULL,
  -- Retryable failure state.
  last_error      TEXT,
  attempt         INT NOT NULL DEFAULT 0,
  -- Reviewer provenance (staff-only; owner replies never populate these).
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_listing_intakes_code
  ON public.owner_listing_intakes (intake_code);

-- An owner has at most ONE open intake needing information: follow-up
-- replies merge into it instead of creating a second unit.
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_listing_intakes_open_per_sender
  ON public.owner_listing_intakes (sender_phone)
  WHERE state IN ('NEEDS_INFORMATION', 'NEEDS_CODE');

CREATE INDEX IF NOT EXISTS idx_owner_listing_intakes_state
  ON public.owner_listing_intakes (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_listing_intakes_sender
  ON public.owner_listing_intakes (sender_phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_listing_intakes_unit
  ON public.owner_listing_intakes (unit_id);

-- Cross-source duplicate detection: same fingerprint never creates a
-- second canonical unit.
CREATE INDEX IF NOT EXISTS idx_owner_listing_intakes_dupe_hash
  ON public.owner_listing_intakes (dupe_check_hash)
  WHERE dupe_check_hash IS NOT NULL;

COMMENT ON TABLE public.owner_listing_intakes IS
  'Durable owner listing intake lifecycle — a record exists BEFORE the owner is asked for missing fields; replies merge into the same intake.';

-- ── 2. Inbound event ledger (idempotency for ALL intake sources) ──
CREATE TABLE IF NOT EXISTS public.owner_inbound_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,                       -- whatsapp | telegram | web | sheet
  message_id    TEXT,                                -- provider message id (OpenWA data.id / Telegram update_id)
  sender        TEXT NOT NULL,
  group_id      TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Raw content is kept for the audit trail but redacted on read paths;
  -- never logged to platform logs (PII rule).
  raw_excerpt   TEXT,
  has_media     BOOLEAN NOT NULL DEFAULT false,
  media_count   INT NOT NULL DEFAULT 0,
  intake_id     UUID REFERENCES public.owner_listing_intakes (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per provider message id per source: replayed webhooks are
-- rejected at the database level, not only in application code.
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_inbound_events_source_message
  ON public.owner_inbound_events (source, message_id)
  WHERE message_id IS NOT NULL;

-- ── 3. Telegram update idempotency (Phase 6) ──
CREATE TABLE IF NOT EXISTS public.telegram_processed_updates (
  update_id   BIGINT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind        TEXT
);

COMMENT ON TABLE public.telegram_processed_updates IS
  'Processed Telegram update_id ledger — replayed updates are skipped instead of re-executing commands and intakes.';

-- ── 4. RLS: service-role writes, staff reads ──
ALTER TABLE public.owner_inbound_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_listing_intakes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_processed_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owner_inbound_events' AND policyname = 'staff_read_owner_inbound_events') THEN
    CREATE POLICY staff_read_owner_inbound_events ON public.owner_inbound_events
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                AND p.role IN ('superadmin','admin','manager','auditor'))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owner_listing_intakes' AND policyname = 'staff_read_owner_listing_intakes') THEN
    CREATE POLICY staff_read_owner_listing_intakes ON public.owner_listing_intakes
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                AND p.role IN ('superadmin','admin','manager','auditor'))
      );
  END IF;
END $$;
