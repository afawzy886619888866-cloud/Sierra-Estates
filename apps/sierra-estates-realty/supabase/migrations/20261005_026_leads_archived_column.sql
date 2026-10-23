-- 20261005_026_leads_archived_column.sql
--
-- FIXES: CRON /api/cron/lead-timers failing with:
--   [supabase:list leads] column leads.archived does not exist
--
-- Aligns public.leads with canonical supabase/schema.sql:178:
--   archived BOOLEAN DEFAULT FALSE,
--   hot BOOLEAN DEFAULT FALSE
--
-- Idempotent: safe to re-run.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hot BOOLEAN DEFAULT FALSE;

UPDATE public.leads SET archived = FALSE WHERE archived IS NULL;
UPDATE public.leads SET hot = FALSE WHERE hot IS NULL;

-- Reload Supabase PostgREST schema cache so REST queries see the new columns immediately.
NOTIFY pgrst, 'reload schema';
