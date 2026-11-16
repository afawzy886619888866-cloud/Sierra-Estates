-- ═══════════════════════════════════════════════════════════════════════════
-- 20261019_033_owner_outreach_audit_log.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Origin: owner-approved Autonomous End-to-End Execution Mandate, G2 queue
-- item 4 (2026-10-19). The EC2 owner-outreach engine
-- (workflows/09-owner-outreach/outreach.js) kept its per-contact audit trail
-- in a LOCAL JSONL ledger plus a Google Sheets contact-date column — nothing
-- reached the canonical backend, so the Supabase view of "which owner was
-- contacted, when, through which line" was blind. This migration adds the
-- canonical audit table the engine now writes one row per REAL send to.
--
--   • Audit, not dedupe: the operational dedupe stays in the JSONL ledger +
--     sheet column (they must survive a Supabase outage — the engine never
--     blocks a send on this table). This table is the durable, queryable
--     system of record for compliance + analytics.
--   • §21 no-fabrication: DRY-RUN sends never write rows here. A row exists
--     only when an opt-out message was genuinely dispatched via the gateway.
--   • RLS: service-role writes only (the engine authenticates with the
--     service role, which bypasses RLS by design); authenticated staff may
--     read; anonymous gets nothing.
--
-- Design: 100% ADDITIVE & IDEMPOTENT — safe to re-run on production.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.owner_outreach_log (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Normalized Egyptian mobile (201XXXXXXXXX) — matches outreach.js normalizePhone().
    phone         TEXT NOT NULL,
    -- Sheet row's listing code at send time (may be NULL when the row had none).
    listing_code  TEXT,
    -- Which OpenWA line/session actually dispatched the message.
    session_name  TEXT,
    -- Walk direction of the claiming lane: 'top' | 'bottom'.
    direction     TEXT CHECK (direction IN ('top', 'bottom')),
    -- Host side configuration: 'split' | 'top' | 'bottom'.
    host_side     TEXT CHECK (host_side IN ('split', 'top', 'bottom')),
    -- Sheet row index (0-based) the candidate came from — reproducibility.
    sheet_row_idx INTEGER,
    -- Availability allow-list state captured at send time.
    availability  TEXT,
    -- The exact opt-out message text dispatched (compliance evidence).
    message_text  TEXT,
    -- True sends only: the engine MUST skip this table in dry-run (§21).
    dry_run       BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

COMMENT ON TABLE public.owner_outreach_log IS
    'Canonical per-contact audit trail for the owner-outreach engine (workflows/09): one row per REAL WhatsApp opt-out message dispatched. DRY-RUN sends never appear here (no-fabrication).';

CREATE INDEX IF NOT EXISTS idx_owner_outreach_log_phone
    ON public.owner_outreach_log (phone);
CREATE INDEX IF NOT EXISTS idx_owner_outreach_log_sent_at
    ON public.owner_outreach_log (sent_at DESC);

ALTER TABLE public.owner_outreach_log ENABLE ROW LEVEL SECURITY;

-- Staff can read the audit trail; only the service role writes (bypasses RLS).
DROP POLICY IF EXISTS "owner_outreach_log_staff_read" ON public.owner_outreach_log;
CREATE POLICY "owner_outreach_log_staff_read" ON public.owner_outreach_log
    FOR SELECT TO authenticated
    USING (public.is_admin());
