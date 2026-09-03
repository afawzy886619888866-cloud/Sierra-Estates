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
