-- ═══════════════════════════════════════════════════════════════════
-- 029 — INTAKE CORRELATION + EVENT STATE MACHINE (P0 3A/3B/3C)
--
-- 3B: an owner may submit SEVERAL different units at the same time. The
-- partial unique index "one open intake per sender" made the second
-- concurrent submission CRASH (unique violation → webhook 500, message
-- lost). Reply correlation is now code/context-based in the service
-- (explicit intake code → quoted-message context → single unambiguous
-- open intake → durable AMBIGUOUS_REPLY state for staff). Deduplication
-- protection is NOT lost: it lives in
--   · uq_owner_inbound_events_source_message (event ledger),
--   · uq_owner_listing_intakes_code (stable intake codes),
--   · dupe_check_hash lookups (cross-source fingerprints).
--
-- 3C: the inbound event ledger gets a durable processing state machine
--   RECEIVED → PROCESSING → COMPLETED        (terminal, replay returns prior result)
--   FAILED                                   (retryable; resume, never blocked)
-- with attempt counters, error classification, lease/lock semantics and
-- the resulting intake + canonical unit persisted on the event row.
-- A ledger outage now fails CLOSED (no side effects) in the service.
--
-- Additive only — no existing column is altered or dropped; the dropped
-- index is a PARTIAL unique index introduced by 027 that is replaced by a
-- service-level correlation design (documented rollback below).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Event ledger state machine ──
ALTER TABLE public.owner_inbound_events
  ADD COLUMN IF NOT EXISTS state        TEXT NOT NULL DEFAULT 'RECEIVED',
  ADD COLUMN IF NOT EXISTS attempts     INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error   TEXT,
  ADD COLUMN IF NOT EXISTS lease_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS result       JSONB,
  ADD COLUMN IF NOT EXISTS unit_id      TEXT;

COMMENT ON COLUMN public.owner_inbound_events.state IS
  'RECEIVED | PROCESSING | COMPLETED | FAILED — FAILED is retryable; COMPLETED replays return the stored result without re-executing side effects.';

CREATE INDEX IF NOT EXISTS idx_owner_inbound_events_state
  ON public.owner_inbound_events (state, received_at DESC);

-- Resolve any in-flight claim left by a crashed worker so a retry can resume.
UPDATE public.owner_inbound_events
   SET state = 'FAILED',
       last_error = COALESCE(last_error, 'lease expired — resumed by migration 029')
 WHERE state = 'PROCESSING';

-- ── 2. Allow concurrent open intakes per sender ──
-- Drop the partial unique index that limited one open intake per sender.
DROP INDEX IF EXISTS public.uq_owner_listing_intakes_open_per_sender;

-- Correlation safety replaces it:
--   · stable intake codes stay unique (uq_owner_listing_intakes_code);
--   · the event ledger stays replay-proof;
--   · ambiguous replies land in a durable AMBIGUOUS_REPLY state for staff
--     instead of being merged into an arbitrary intake.

-- ── 3. New intake lifecycle states (documented; column is unconstrained TEXT) ──
--   UNASSIGNED_MEDIA  — media-only event with no unambiguous intake match;
--                       durably stored, awaiting staff correlation.
--   AMBIGUOUS_REPLY   — listing-shaped reply whose target intake could not be
--                       resolved (several open intakes); queued for staff.
-- (No ALTER needed — owner_listing_intakes.state is a free TEXT column.)

-- ── ROLLBACK ──
-- Recreate the old partial index (only if no owner legitimately holds
-- multiple open intakes):
--   CREATE UNIQUE INDEX uq_owner_listing_intakes_open_per_sender
--     ON public.owner_listing_intakes (sender_phone)
--     WHERE state IN ('NEEDS_INFORMATION','NEEDS_CODE');
-- The new event columns are nullable/defaulted and can be dropped:
--   ALTER TABLE public.owner_inbound_events
--     DROP COLUMN IF EXISTS state, DROP COLUMN IF EXISTS attempts,
--     DROP COLUMN IF EXISTS last_error, DROP COLUMN IF EXISTS lease_until,
--     DROP COLUMN IF EXISTS processed_at, DROP COLUMN IF EXISTS result,
--     DROP COLUMN IF EXISTS unit_id;
