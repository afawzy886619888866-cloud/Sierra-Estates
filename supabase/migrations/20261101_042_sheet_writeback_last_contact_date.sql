-- ============================================================================
-- Migration 042 — SHEET WRITE-BACK COLUMN RECONCILIATION
-- ============================================================================
-- The owner-outreach sheet write-back route (app/api/sync/sheet-webhook,
-- mirroring scripts/GoogleAppsScript_SierraEstates_Unified_Engine.gs) has
-- been failing silently on EVERY phone-matched update:
--
--   1. it updated public.listings.last_contact_date — a column that never
--      existed on the deployed table (42703 on every UPDATE);
--   2. it matched rows with `phone` / `mobile` — columns that do not exist
--      either (the real column is owner_phone), so the SELECT errored
--      before any row could ever match.
--
-- This migration adds the missing column (additive, idempotent). The column
-- references are fixed in the companion code change (same commit).
-- ============================================================================

alter table public.listings
  add column if not exists last_contact_date text;

comment on column public.listings.last_contact_date is
'Last owner-contact date (dd/MM/yyyy string) written back by the Google Sheets outreach sync (/api/sync/sheet-webhook).';
