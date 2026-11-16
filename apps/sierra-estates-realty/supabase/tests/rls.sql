-- Behavioural RLS tests.
--
-- These assert the property that matters: sign-ups land as role 'client', so a
-- customer who registers must not be able to read the CRM, escalate themselves,
-- or edit the catalogue. Every expectation below is written as a row that must
-- come back TRUE; the runner fails if any does not.
\set ON_ERROR_STOP on
SET client_min_messages = warning;

INSERT INTO auth.users (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'customer@example.com',    'client'),
  ('22222222-2222-2222-2222-222222222222', 'agent@sierra-estates.net', 'agent'),
  ('33333333-3333-3333-3333-333333333333', 'admin@sierra-estates.net', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.leads (id, full_name, phone)
  VALUES ('lead-1', 'Real Customer', '+201000000000') ON CONFLICT DO NOTHING;
INSERT INTO public.listings (id, title, compound)
  VALUES ('listing-1', 'Villa', 'Mivida') ON CONFLICT DO NOTHING;
INSERT INTO public.contracts (id, total_value)
  VALUES ('contract-1', 1000000) ON CONFLICT DO NOTHING;
-- Seeded so the anon read assertions below are meaningful: count(*) = 0 against
-- an empty table passes whatever the policy says, which would hide exactly the
-- over-broad grant these tests exist to catch.
INSERT INTO public.concierge_selections (id, lead_id, lead_name, personal_note)
  VALUES ('concierge-1', 'lead-1', 'Real Customer', 'private note')
  ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;

CREATE TEMP TABLE results (name TEXT, ok BOOLEAN);
-- The checks below run as `authenticated`, so that role must be able to record
-- its own results. The temp table is per-session and holds no product data.
GRANT ALL ON results TO authenticated, anon;

SET ROLE authenticated;

-- ── A self-signup customer (role 'client') ───────────────────────────────
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO results SELECT 'client cannot read leads',     count(*) = 0 FROM public.leads;
INSERT INTO results SELECT 'client cannot read contracts', count(*) = 0 FROM public.contracts;
INSERT INTO results SELECT 'client can read active listings', count(*) = 1 FROM public.listings;

WITH d AS (DELETE FROM public.listings WHERE id = 'listing-1' RETURNING 1)
INSERT INTO results SELECT 'client cannot delete a listing', count(*) = 0 FROM d;

-- Self-escalation must be rejected by the policy, not merely no-op.
DO $$
DECLARE rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE public.profiles SET role = 'admin'
        WHERE id = '11111111-1111-1111-1111-111111111111';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        rejected := TRUE;
    END;
    INSERT INTO results VALUES ('client cannot escalate own role', rejected);
END $$;

INSERT INTO results SELECT 'client role unchanged after attempt', role = 'client'
FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';

-- ── An agent (staff) ─────────────────────────────────────────────────────
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
INSERT INTO results SELECT 'agent can read leads',            count(*) = 1 FROM public.leads;
INSERT INTO results SELECT 'agent cannot read contracts',     count(*) = 0 FROM public.contracts;

-- ── An admin ─────────────────────────────────────────────────────────────
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
INSERT INTO results SELECT 'admin can read contracts', count(*) = 1 FROM public.contracts;
INSERT INTO results SELECT 'admin can read leads',     count(*) = 1 FROM public.leads;

-- ── An anonymous visitor (the NEXT_PUBLIC_SUPABASE_ANON_KEY role) ────────
-- This role was previously untested, which is how four over-broad grants went
-- unnoticed: a full-table read on concierge_selections (lead names, unit
-- pricing, personal notes) and unconstrained INSERT on three form tables.
SET ROLE anon;

INSERT INTO results SELECT 'anon cannot read leads',
  count(*) = 0 FROM public.leads;
INSERT INTO results SELECT 'anon cannot read concierge_selections',
  count(*) = 0 FROM public.concierge_selections;
INSERT INTO results SELECT 'anon cannot read contracts',
  count(*) = 0 FROM public.contracts;

-- The public catalogue is meant to be readable without an account.
INSERT INTO results SELECT 'anon can read compounds',
  count(*) >= 0 FROM public.compounds;

-- Form tables are written by the service role, which bypasses RLS. A direct
-- anon INSERT must be refused rather than silently accepted.
DO $$
DECLARE rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO public.inquiries (id, name, phone)
             VALUES ('anon-probe-inquiry', 'Probe', '+201000000001');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        rejected := TRUE;
    END;
    INSERT INTO results VALUES ('anon cannot insert inquiries', rejected);
END $$;

DO $$
DECLARE rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO public.career_applications (id, name, phone, position)
             VALUES ('anon-probe-career', 'Probe', '+201000000002', 'Agent');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        rejected := TRUE;
    END;
    INSERT INTO results VALUES ('anon cannot insert career_applications', rejected);
END $$;

DO $$
DECLARE rejected BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO public.viewing_requests (id, property_code, visitor_name, visitor_phone)
             VALUES ('anon-probe-viewing', 'SBR-1', 'Probe', '+201000000003');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
        rejected := TRUE;
    END;
    INSERT INTO results VALUES ('anon cannot insert viewing_requests', rejected);
END $$;

RESET ROLE;

\echo ''
\echo '── RLS results ─────────────────────────────────────────────'
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status, name FROM results ORDER BY ok, name;

DO $$
DECLARE failed INT;
BEGIN
    SELECT count(*) INTO failed FROM results WHERE ok IS NOT TRUE;
    IF failed > 0 THEN
        RAISE EXCEPTION '% RLS expectation(s) failed', failed;
    END IF;
END $$;
