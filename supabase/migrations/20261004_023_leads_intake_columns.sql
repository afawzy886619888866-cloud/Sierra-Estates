-- 20261004_023_leads_intake_columns.sql
--
-- FIXES: public POST /api/leads returning 500 on every submission.
--
-- Root cause: app/api/leads/route.ts inserts `aiProfiling` / `automation`
-- (JSONB) into public.leads, and those columns exist only in the base
-- supabase/schema.sql. Databases provisioned before those columns were added
-- to schema.sql never receive them: CREATE TABLE IF NOT EXISTS does not alter
-- an existing table, and no migration ever added them. PostgREST therefore
-- rejects the insert ("Could not find the 'ai_profiling' column of 'leads'
-- in the schema cache") and every web lead has been 500-ing, while generic
-- writes (e.g. /api/inquiries) kept working.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_profiling JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{}'::jsonb;

-- Meta-tracking: the ingest bridge may attach a dedupe/message pointer even
-- when the column landed on older provisioned DBs (matches leads_external_message_id_unique
-- partial index in base schema).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Keep the partial unique index present on older databases too (IF NOT EXISTS).
CREATE UNIQUE INDEX IF NOT EXISTS leads_external_message_id_unique
    ON public.leads (external_message_id)
    WHERE external_message_id IS NOT NULL;
