-- 20261120_053 — Agent LLM router (freellmapi integration)
-- FreeLLMAPI (github.com/tashfeenahmed/freellmapi) aggregates 87 free LLM
-- providers behind one OpenAI-compatible /v1 API. This migration gives the
-- Sierra Estates worker its own piece of that capability:
--   agent_llm_providers  — the routing table: every free upstream the worker
--                          may call (base URL verified from the freellmapi
--                          provider registry), priority order, health state,
--                          discovered model catalog. Rows are seeded disabled;
--                          the admin LLM Router window (tab llm_router) edits
--                          everything — keys are referenced by ENV VAR NAME
--                          only, never stored in the database.
--   agent_llm_usage_log  — one row per routing attempt (agent, provider,
--                          model, latency, tokens, status/error) so the admin
--                          window shows what each agent actually used.
-- lib/llm/agent-router.ts auto-seeds missing rows at runtime (insert-only —
-- never overwrites admin edits).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_llm_providers (
    id            BIGSERIAL PRIMARY KEY,
    slug          TEXT NOT NULL,
    label         TEXT NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'openai-compat',   -- openai-compat | gemini-openai | freellmapi-upstream | cloudflare-ai
    base_url      TEXT NOT NULL,
    api_key_env   TEXT,                                    -- comma-separated ENV VAR NAMES (never values)
    default_model TEXT,
    enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    priority      INTEGER NOT NULL DEFAULT 100,            -- lower = tried first
    models        JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{id, owned_by?}] discovered by the refresh automation
    health        JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {status, latencyMs, checkedAt, lastError}
    notes         TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_llm_providers_slug_unique UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_agent_llm_providers_enabled
    ON public.agent_llm_providers (enabled, priority);

CREATE TABLE IF NOT EXISTS public.agent_llm_usage_log (
    id               BIGSERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent            TEXT NOT NULL,            -- which Sierra agent made the call
    task             TEXT,
    provider_slug    TEXT NOT NULL,
    model            TEXT,
    status           TEXT NOT NULL DEFAULT 'ok',   -- ok | error
    latency_ms       INTEGER NOT NULL DEFAULT 0,
    prompt_tokens    INTEGER,
    completion_tokens INTEGER,
    error            TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_llm_usage_agent
    ON public.agent_llm_usage_log (agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_llm_usage_provider
    ON public.agent_llm_usage_log (provider_slug, created_at DESC);

COMMENT ON TABLE public.agent_llm_providers IS
    'Free-LLM routing table (freellmapi integration) — admin-edited, env-var key refs only.';
COMMENT ON TABLE public.agent_llm_usage_log IS
    'Per-attempt LLM routing audit (agent, provider, model, latency, tokens, status).';
