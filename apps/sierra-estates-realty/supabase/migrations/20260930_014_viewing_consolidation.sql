-- ═══════════════════════════════════════════════════════════════════════════
-- 20260930_014_viewing_consolidation.sql — Phase 8 (VIEWING)
--
-- Consolidates the three overlapping viewing tables into ONE canonical table:
--   public.viewings  (kept — richest shape: lead_id, unit_id, portfolio_id,
--                     agent_id, scheduled_at, status, location, notes)
--
--   viewing_requests     → frozen (legacy public form capture; rows copied)
--   viewing_appointments  → frozen (dead schema — no writer exists in the
--                          codebase; rows copied if any exist in prod)
--
-- NON-DESTRUCTIVE by design:
--   * viewings only GAINS columns (visitor capture + slot + attribution);
--   * legacy rows are COPIED into viewings with ON CONFLICT DO NOTHING;
--   * legacy tables are NOT dropped — they are left in place, deprecated.
--     Rollback = this migration's changes are additive; reverting the
--     migration file leaves all data intact in both old and new locations.
--
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS, ON CONFLICT DO
-- NOTHING, CREATE INDEX IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Canonical table: extend public.viewings with the request-capture
--      fields it was missing (previously only concierge flow rows had a
--      lead_id; anonymous site visitors had no path into this table). ──────
ALTER TABLE public.viewings
    ADD COLUMN IF NOT EXISTS property_code   TEXT,
    ADD COLUMN IF NOT EXISTS visitor_name    TEXT,
    ADD COLUMN IF NOT EXISTS visitor_phone   TEXT,
    ADD COLUMN IF NOT EXISTS visitor_email   TEXT,
    ADD COLUMN IF NOT EXISTS preferred_date DATE,
    ADD COLUMN IF NOT EXISTS preferred_time  TEXT,
    ADD COLUMN IF NOT EXISTS number_of_people INT,
    ADD COLUMN IF NOT EXISTS message         TEXT,
    ADD COLUMN IF NOT EXISTS source          TEXT DEFAULT 'website'
        CHECK (source IN ('website', 'whatsapp', 'admin', 'property-finder', 'concierge')),
    ADD COLUMN IF NOT EXISTS calendar_link  TEXT;

CREATE INDEX IF NOT EXISTS idx_viewings_scheduled_at ON public.viewings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_viewings_visitor_phone ON public.viewings(visitor_phone);
CREATE INDEX IF NOT EXISTS idx_viewings_status ON public.viewings(status);

-- ── 2. Copy legacy viewing_requests rows into the canonical table. ─────────
-- Status mapping: pending → pending_approval (awaiting agent confirmation);
-- confirmed → scheduled; completed stays; cancelled stays.
INSERT INTO public.viewings (
    id, property_code, visitor_name, visitor_email, visitor_phone,
    preferred_date, preferred_time, number_of_people, message,
    status, notes, source, created_at, updated_at
)
SELECT
    vr.id,
    vr.property_code,
    vr.visitor_name,
    vr.visitor_email,
    vr.visitor_phone,
    vr.preferred_date,
    vr.preferred_time,
    vr.number_of_people,
    vr.message,
    CASE vr.status
        WHEN 'pending'   THEN 'pending_approval'
        WHEN 'confirmed'  THEN 'scheduled'
        ELSE vr.status::text
    END,
    vr.message,
    'website',
    vr.created_at,
    vr.updated_at
FROM public.viewing_requests vr
ON CONFLICT (id) DO NOTHING;

-- ── 3. Copy legacy viewing_appointments rows (agent-calendar entries). ─────
-- unit_id carries the listing id; the visitor fields stay NULL (legacy rows
-- tracked people via lead_id only). Status values already match the
-- viewings CHECK except 'rescheduled', which maps to 'scheduled'.
INSERT INTO public.viewings (
    id, lead_id, unit_id, agent_id, scheduled_at, status,
    location, notes, source, created_at, updated_at
)
SELECT
    va.id,
    va.lead_id,
    va.listing_id,
    va.agent_id,
    va.scheduled_at,
    CASE va.status WHEN 'rescheduled' THEN 'scheduled' ELSE va.status::text END,
    va.meeting_location,
    COALESCE(va.feedback_notes, va.notes),
    'admin',
    va.created_at,
    va.updated_at
FROM public.viewing_appointments va
ON CONFLICT (id) DO NOTHING;

-- ── 4. Deprecation markers (comments only — no drops, no data loss). ────────
COMMENT ON TABLE public.viewing_requests IS
    'DEPRECATED 2026-09-30 (migration 014): rows copied to public.viewings; new writes go to public.viewings only. Kept for rollback safety.';
COMMENT ON TABLE public.viewing_appointments IS
    'DEPRECATED 2026-09-30 (migration 014): rows copied to public.viewings; had no active writer. Kept for rollback safety.';
COMMENT ON TABLE public.viewings IS
    'CANONICAL viewing table (Phase 8): public site requests, concierge flow, and agent scheduling all write here. Lifecycle: pending_approval → scheduled → completed | cancelled | no_show.';
