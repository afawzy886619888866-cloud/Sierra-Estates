-- ============================================================================
-- Migration 043 — VIEWING DISPATCH & GOLDEN-HOUR COLUMNS
-- ============================================================================
-- The public viewing flow (app/api/viewing-requests) used to insert a 3-way
-- dispatch roster (CEO / Team Leader / Sales Advisor) and the 60-minute
-- golden-hour follow-up deadline as four columns that existed in no schema
-- or migration — PostgREST rejected EVERY insert (PGRST204), so every public
-- viewing request returned 500.
--
-- This migration adds the four columns for real (additive, idempotent). The
-- companion code change writes them directly and only parks the roster in
-- `notes` on projects where this migration has not been applied yet.
-- ============================================================================

alter table public.viewings
  add column if not exists ceo_email text,
  add column if not exists team_leader_email text,
  add column if not exists sales_advisor_email text,
  add column if not exists golden_hour_at timestamptz;

comment on column public.viewings.ceo_email is
'CEO stakeholder email for the 3-way viewing dispatch roster (/api/viewing-requests).';
comment on column public.viewings.team_leader_email is
'Team Leader stakeholder email for the 3-way viewing dispatch roster (/api/viewing-requests).';
comment on column public.viewings.sales_advisor_email is
'Sales Advisor stakeholder email for the 3-way viewing dispatch roster (/api/viewing-requests).';
comment on column public.viewings.golden_hour_at is
'60-minute post-slot follow-up deadline (Phase 10 Golden Hour tracker; mirrored by a public.followups row).';
