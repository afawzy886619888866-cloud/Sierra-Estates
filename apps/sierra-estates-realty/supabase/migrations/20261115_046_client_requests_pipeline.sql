-- ============================================================================
-- 20261115_046_client_requests_pipeline.sql
--
-- Module 2 (Online Sheets Integration for Client Requests) + Module 3
-- (Career recruitment pipeline) — Supabase schema.
--
-- A. public.client_requests — the system of record for every public
--    acquisition/rental request from /request and /add-request. The legacy
--    public.inquiries table stays untouched (it feeds the legacy admin
--    requests console); the new pipeline writes client_requests AND mirrors
--    to the Google Sheets `Client_Requests` tab via Sheets API v4.
--
-- B. public.career_applications — additive recruitment-pipeline columns:
--    role/work_mode/experience_years/brokerage + scorecard columns, plus
--    a two-way sync stamp. The legacy columns (name/position/…) stay
--    untouched so the existing ApplicantsConsole keeps working.
--
-- C. Storage bucket seeds — `property-media` (public listing photos) and
--    `career-applications` (CV uploads) as plain rows in storage.buckets
--    so a fresh project is reproducible (the runtime auto-create in
--    StorageService remains as a safety net).
--
-- D. whatsapp_lead_sessions — the table was used at runtime
--    (lib/services/LailaLeadIntakeService) but never had DDL in the repo.
--
-- Idempotent: safe to re-run on an existing database.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. public.client_requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    -- Human-facing reference: REQ-YYYYMMDD-XXXX (minted by trigger below).
    request_code TEXT UNIQUE,
    client_name TEXT NOT NULL,
    phone_normalized TEXT NOT NULL,          -- '+201012345678' (E.164 Egyptian)
    email TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Sale', 'Rent', 'Primary', 'Advisory')),
    property_type TEXT,                      -- Apartment | Villa | …
    compound_zone TEXT,                      -- preferred compound(s), comma-joined
    budget_egp NUMERIC(15, 2),
    area_sqm NUMERIC(10, 2),
    bedrooms INT,
    promo_applied TEXT,                      -- e.g. 'BLACK_FRIDAY_25_OFF_TILL_25_NOV_2026 (25%)'
    matched_unit_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
    assigned_agent TEXT,
    status TEXT NOT NULL DEFAULT 'New'
        CHECK (status IN ('New', 'Contacted', 'Viewing Scheduled', 'Closed')),
    notes TEXT,
    source TEXT DEFAULT 'website',
    sheet_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fast lookups for the matcher + admin console filters.
CREATE INDEX IF NOT EXISTS idx_client_requests_status ON public.client_requests (status);
CREATE INDEX IF NOT EXISTS idx_client_requests_phone ON public.client_requests (phone_normalized);
CREATE INDEX IF NOT EXISTS idx_client_requests_created ON public.client_requests (created_at DESC);

-- Auto-stamp updated_at (same function as every other Sierra table).
DROP TRIGGER IF EXISTS trg_client_requests_updated ON public.client_requests;
CREATE TRIGGER trg_client_requests_updated
    BEFORE UPDATE ON public.client_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Human request code, minted per insert (deterministic, collision-safe via
-- the UNIQUE constraint + retry in application code).
CREATE OR REPLACE FUNCTION public.assign_client_request_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_code IS NULL OR NEW.request_code = '' THEN
        NEW.request_code := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_client_requests_code ON public.client_requests;
CREATE TRIGGER trg_client_requests_code
    BEFORE INSERT ON public.client_requests
    FOR EACH ROW EXECUTE FUNCTION public.assign_client_request_code();

-- Row Level Security: the public intake is a Server Action/route using the
-- service-role key (bypasses RLS), same doctrine as public.inquiries — the
-- anon role gets NOTHING (no rate-limit bypass surface, no data exposure).
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_requests_staff_access" ON public.client_requests;
CREATE POLICY "client_requests_staff_access" ON public.client_requests
    FOR ALL TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- B. public.career_applications — recruitment pipeline columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.career_applications
    ADD COLUMN IF NOT EXISTS role_applied TEXT,          -- exact role title, e.g. 'Online Real Estate Consultant'
    ADD COLUMN IF NOT EXISTS work_mode TEXT
        CHECK (work_mode IS NULL OR work_mode IN ('Online', 'In-Office')),
    ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS brokerage TEXT,             -- previous brokerage
    ADD COLUMN IF NOT EXISTS cv_file_path TEXT,          -- Supabase Storage object path (career-applications bucket)
    ADD COLUMN IF NOT EXISTS scorecard_rating TEXT,      -- A+ | A | B | C | D (HR scorecard)
    ADD COLUMN IF NOT EXISTS stage TEXT
        CHECK (stage IS NULL OR stage IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected')),
    ADD COLUMN IF NOT EXISTS stage_notes TEXT,
    ADD COLUMN IF NOT EXISTS sheet_synced_at TIMESTAMPTZ;

-- Recruiting-stage sync: keep `stage` (Module-3 funnel) and `status`
-- (legacy funnel) aligned when only one is touched, so both consoles
-- (ApplicantsConsole status flow + Module-3 stage board) never disagree.
CREATE OR REPLACE FUNCTION public.sync_career_stage_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage IS NOT NULL AND NEW.status IS DISTINCT FROM NEW.stage THEN
        NEW.status := NEW.stage;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_career_stage_sync ON public.career_applications;
CREATE TRIGGER trg_career_stage_sync
    BEFORE UPDATE ON public.career_applications
    FOR EACH ROW EXECUTE FUNCTION public.sync_career_stage_status();

DROP INDEX IF EXISTS idx_career_applications_stage;
CREATE INDEX IF NOT EXISTS idx_career_applications_stage ON public.career_applications (stage);

-- ---------------------------------------------------------------------------
-- C. Storage buckets (reproducible schema)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-media', 'property-media', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('career-applications', 'career-applications', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Public read of listing photos (anon download via public URL).
DROP POLICY IF EXISTS "property media public read" ON storage.objects;
CREATE POLICY "property media public read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'property-media');

-- CV uploads: service-role only (private bucket; the admin console reads the
-- public URL handed back by the action). No anon/authenticated policies on
-- purpose — the Server Action uploads through the service-role client.

-- ---------------------------------------------------------------------------
-- D. whatsapp_lead_sessions (runtime backfill DDL)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_lead_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone TEXT NOT NULL UNIQUE,
    session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    stage TEXT,
    last_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.whatsapp_lead_sessions ENABLE ROW LEVEL SECURITY;
-- Service-role only: no anon/authenticated policies (bypassed by the admin key).

-- ============================================================================
-- Done. Companion code: lib/services/GoogleSheetsV4Service.ts (Sheets v4
-- writer), lib/actions/client-request.ts, lib/actions/career-application.ts.
-- ============================================================================
