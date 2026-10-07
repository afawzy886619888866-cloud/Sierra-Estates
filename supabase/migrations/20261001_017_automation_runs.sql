-- ═══════════════════════════════════════════════════════════════════════════
-- 20261001_017_automation_runs.sql — Phase 11 (AUTOMATION UNIFICATION)
--
-- Observability ledger for scheduled work + DLQ lifecycle:
--
--   Problem: 10 cron endpoints exist but only 2 are scheduled by the deployed
--     vercel.json (Vercel Hobby caps crons at 2). There is no record of WHEN a
--     job last ran, whether it succeeded, or how long it took — and the DLQ
--     table (failed_orchestrations, created in the workflow-studio line) has
--     no writer and no resolution lifecycle, so a failure could never be
--     retried-with-audit or marked resolved.
--
--   Decision (roadmap Phase 11): every scheduled execution goes through the
--     /api/cron/dispatch/[job] dispatcher, which writes one automation_runs
--     row per job execution and uses this table for:
--       * dedupe      — skip a job when a fresh success exists (two independent
--                       schedulers — Vercel Cron + GitHub Actions — can both
--                       fire the same window safely);
--       * retry       — a failed run lands in failed_orchestrations; the next
--                       dispatcher invocation retries it and a later success
--                       marks prior failures resolved;
--       * audit       — staff can read the run history (Phase 12 widgets).
--
-- ADDITIVE & IDEMPOTENT: new table + one nullable column + policies that are
-- DROP-IF-EXISTS + CREATE. Nothing is dropped, renamed or back-filled.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Run ledger ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'scheduled',
    status TEXT NOT NULL
        CHECK (status IN ('success', 'failed', 'skipped')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INT,
    attempt INT NOT NULL DEFAULT 1,
    summary JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.automation_runs IS
    'One row per scheduled job execution (Phase 11 dispatcher). status=skipped means the dedupe guard saw a fresh success.';

-- Hot path: "last success for job X within N hours" (dedupe guard) and the
-- staff-facing run-history view both filter by (job, started_at).
CREATE INDEX IF NOT EXISTS idx_automation_runs_job_started
    ON public.automation_runs(job, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_failures
    ON public.automation_runs(job, started_at DESC)
    WHERE status = 'failed';

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Writes happen only from server code via the service-role client (RLS is
-- bypassed for that role); staff can read the history for auditing.
DROP POLICY IF EXISTS "automation_runs_staff_read" ON public.automation_runs;
CREATE POLICY "automation_runs_staff_read" ON public.automation_runs
    FOR SELECT TO authenticated USING (public.is_staff());

-- ── 2. DLQ lifecycle: failed_orchestrations gains a resolution marker ────────
-- The table exists since the workflow-studio migration but nothing ever
-- resolved an entry. The dispatcher upserts failures (pipeline = 'cron:<job>')
-- and marks them resolved_at when the same job later succeeds.
ALTER TABLE public.failed_orchestrations
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.failed_orchestrations.resolved_at IS
    'Set when the same pipeline later succeeded (dispatcher self-healing). NULL = still on the dead letter queue.';

CREATE INDEX IF NOT EXISTS idx_failed_orchestrations_open
    ON public.failed_orchestrations(pipeline, created_at DESC)
    WHERE resolved_at IS NULL;
