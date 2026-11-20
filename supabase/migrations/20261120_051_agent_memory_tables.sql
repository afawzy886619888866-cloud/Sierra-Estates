-- 20261120_051 — Agent memory persistence (unified_memory + agent_executions)
-- packages/memory-engine's SupabaseMemoryStore has written to these tables
-- since its introduction, but they only existed in supabase/schema.sql —
-- never as a numbered migration — so live databases lacked them and every
-- write silently degraded into a console.warn. This migration makes agent
-- memory persistence real in production.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.unified_memory (
    id          BIGSERIAL PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    key         TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    value       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unified_memory_agent_key_unique UNIQUE (agent_id, key)
);
CREATE INDEX IF NOT EXISTS idx_unified_memory_category
    ON public.unified_memory (category);

CREATE TABLE IF NOT EXISTS public.agent_executions (
    id             BIGSERIAL PRIMARY KEY,
    agent_name     TEXT NOT NULL,
    task_name      TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'success',
    input_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    latency_ms     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent
    ON public.agent_executions (agent_name, created_at DESC);

COMMENT ON TABLE public.unified_memory IS
    'Agent profiles + context snapshots (packages/memory-engine SupabaseMemoryStore; onConflict agent_id,key).';
COMMENT ON TABLE public.agent_executions IS
    'Agent execution logs (packages/memory-engine SupabaseMemoryStore.appendExecution).';
