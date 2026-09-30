-- Restrict internal ingestion and bot-run tables to staff.
--
-- These tables are written by workers through service_role, which bypasses
-- RLS. Dashboard access, when needed, is limited to authenticated staff.
-- Keeping the role explicit is important: USING (true) without TO applies to
-- PUBLIC and can expose the table to every role with table grants.

ALTER TABLE public.raw_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raw_feed_staff_access" ON public.raw_feed;
DROP POLICY IF EXISTS "Service role and staff can manage raw_feed" ON public.raw_feed;
CREATE POLICY "raw_feed_staff_access" ON public.raw_feed
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "bot_runs_staff_access" ON public.bot_runs;
DROP POLICY IF EXISTS "Service role and staff can manage bot_runs" ON public.bot_runs;
CREATE POLICY "bot_runs_staff_access" ON public.bot_runs
    FOR ALL TO authenticated
    USING (public.is_staff()) WITH CHECK (public.is_staff());
