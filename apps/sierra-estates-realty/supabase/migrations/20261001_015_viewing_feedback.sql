-- ═══════════════════════════════════════════════════════════════════════════
-- 20261001_015_viewing_feedback.sql — Phase 9 (POST-VIEWING FEEDBACK)
--
-- Adds the feedback layer on top of the canonical viewing lifecycle
-- (migration 014: pending_approval → scheduled → completed | cancelled | no_show):
--
--   1. viewings.survey_token  — capability token minted when an agent marks a
--      viewing completed; the client's survey link carries it. The public
--      survey endpoint validates the token SERVER-SIDE (service-role lookup,
--      no anon-visible rows), so RLS never has to expose feedback rows.
--   2. public.viewing_feedback — ONE row per viewing (UNIQUE(viewing_id)) with
--      three sides:
--        · sales report      (unit accuracy, client reaction, price reaction,
--                             objections, interest level, next action, notes)
--        · client survey     (rating 1-5, comment, would-recommend)
--        · manager review    (pending_review → approved | needs_changes)
--
-- NON-DESTRUCTIVE: new table + new nullable columns only; no drops, no
-- rewrites of existing rows. Idempotent (IF NOT EXISTS / ON CONFLICT DO
-- NOTHING / DROP POLICY IF EXISTS + CREATE POLICY).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Survey capability token on the canonical viewing row. ────────────────
ALTER TABLE public.viewings
    ADD COLUMN IF NOT EXISTS survey_token   TEXT,
    ADD COLUMN IF NOT EXISTS survey_sent_at TIMESTAMPTZ;

-- A token identifies exactly one viewing (minted once at completion).
CREATE UNIQUE INDEX IF NOT EXISTS uq_viewings_survey_token
    ON public.viewings(survey_token)
    WHERE survey_token IS NOT NULL;

-- ── 2. The feedback row (sales report + client survey + manager review). ──
CREATE TABLE IF NOT EXISTS public.viewing_feedback (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    viewing_id   TEXT NOT NULL REFERENCES public.viewings(id) ON DELETE CASCADE,
    lead_id      TEXT REFERENCES public.leads(id) ON DELETE SET NULL,

    -- Sales-side post-viewing report (filled by the showing agent).
    unit_accuracy   TEXT
        CHECK (unit_accuracy IN ('exact', 'minor_diff', 'major_diff', 'misrepresented')),
    client_reaction TEXT
        CHECK (client_reaction IN ('very_positive', 'positive', 'neutral', 'negative')),
    price_reaction  TEXT
        CHECK (price_reaction IN ('accepted', 'slightly_high', 'too_high', 'not_discussed')),
    objections      JSONB DEFAULT '[]'::jsonb,   -- [{ category, note? }]
    interest_level  TEXT
        CHECK (interest_level IN ('hot', 'warm', 'cold', 'lost')),
    next_action     TEXT
        CHECK (next_action IN ('second_viewing', 'offer', 'renegotiate_price',
                               'follow_up', 'nurture', 'archive')),
    notes           TEXT,
    submitted_by    TEXT,                         -- actor uid/email from session guard
    submitted_at    TIMESTAMPTZ,

    -- Client survey (token-gated public submission; NULL until submitted).
    client_rating      INT CHECK (client_rating BETWEEN 1 AND 5),
    client_comment     TEXT,
    would_recommend    BOOLEAN,
    survey_submitted_at TIMESTAMPTZ,

    -- Manager combined-analysis review.
    review_status  TEXT DEFAULT 'pending_review'
        CHECK (review_status IN ('pending_review', 'approved', 'needs_changes')),
    manager_notes  TEXT,
    reviewed_by    TEXT,
    reviewed_at    TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    UNIQUE (viewing_id)
);

CREATE INDEX IF NOT EXISTS idx_viewing_feedback_lead
    ON public.viewing_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_viewing_feedback_review_status
    ON public.viewing_feedback(review_status);

-- ── 3. RLS: staff-only. No anon/authenticated public policy on purpose — ────
--    the client survey is submitted through the server-side token-gated
--    endpoint (the token itself is the capability), so the table is never
--    exposed to anonymous clients.
ALTER TABLE public.viewing_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viewing_feedback_staff_access" ON public.viewing_feedback;
CREATE POLICY "viewing_feedback_staff_access" ON public.viewing_feedback
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

COMMENT ON TABLE public.viewing_feedback IS
    'Phase 9 post-viewing feedback: one row per viewing. Sales report + token-gated client survey + manager combined review. Survey tokens live on viewings.survey_token (minted at completion).';
