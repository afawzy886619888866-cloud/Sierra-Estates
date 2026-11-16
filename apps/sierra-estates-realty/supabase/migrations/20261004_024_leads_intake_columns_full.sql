-- 20261004_024_leads_intake_columns_full.sql
--
-- FIXES: public POST /api/leads returning 500 on every submission (part 2).
--
-- 023 added ai_profiling/automation/external_message_id/whatsapp, but the
-- public intake route (app/api/leads/route.ts -> insertRecord(stakeholders))
-- writes the FULL base-schema column set: zone, phase, priority, via,
-- interest, capital_allocation, locale. Older provisioned databases (built
-- before the CRM/qualification fields landed in supabase/schema.sql) are
-- missing all of them, so the insert still fails after 023.
--
-- Also issues NOTIFY pgrst, 'reload schema': 023/024 run over a direct pg
-- connection, but the app's inserts go through Supabase's PostgREST, whose
-- schema cache does not see DDL applied outside the dashboard. Without the
-- notify, PostgREST keeps answering PGRST204 even with the columns present.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + NOTIFY are safe to re-run.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS via TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS capital_allocation TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage INT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_profiling JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_message_id_unique
    ON public.leads (external_message_id)
    WHERE external_message_id IS NOT NULL;

-- Reload Supabase PostgREST schema cache so REST inserts see the new columns.
NOTIFY pgrst, 'reload schema';
