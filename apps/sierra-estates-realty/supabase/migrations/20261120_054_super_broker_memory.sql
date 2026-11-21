-- 20261120_054 — Super Broker Memory (the Soul)
-- One united memory spine for the whole brokerage: every engine and agent
-- (OpenClaw, harness, WhatsApp station, curator, scribe, availability,
-- price-index, admin) writes what it learns into broker_memory_entries and
-- recalls from the same spine before acting — so the operation thinks as one
-- broker, not many disconnected tools.
--   broker_memory_entries  — episodic/semantic entries (observation, insight,
--                            fact, event, reflection) with importance,
--                            dedupe key, recall bookkeeping.
--   broker_memory_digests  — consolidated digests produced by the
--                            memory-consolidation automation, which routes an
--                            LLM summary through the free-provider LLM router
--                            (lib/llm/agent-router.ts) when any provider is
--                            enabled, and stores a stats-only digest when
--                            none is.
-- Recall ranking is done app-side (lib/memory/broker-soul.ts): term overlap ×
-- importance × recency decay — no extension dependencies.
-- Service-role access only (admin/agent APIs); RLS enabled with no anon
-- policies so public keys read nothing.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.broker_memory_entries (
    id               BIGSERIAL PRIMARY KEY,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kind             TEXT NOT NULL DEFAULT 'observation',  -- observation | insight | fact | event | reflection | digest
    scope            TEXT NOT NULL DEFAULT 'global',       -- global | client | unit | owner | broker | agent
    agent            TEXT NOT NULL DEFAULT 'unknown',      -- engine/agent that wrote it
    subject          TEXT,                                 -- entity key, e.g. 'unit:PH-12', 'sheet:inventory'
    content          TEXT NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- structured extras (no secrets, no raw phone numbers)
    importance       SMALLINT NOT NULL DEFAULT 3,          -- 1..5 (5 = core broker knowledge)
    confidence       NUMERIC(3,2) NOT NULL DEFAULT 0.80,   -- 0..1
    source           TEXT,                                 -- origin pointer, e.g. 'whatsapp', 'cron/price-index'
    dedupe_key       TEXT,                                 -- sha1(agent+kind+subject+content) — idempotent writes
    status           TEXT NOT NULL DEFAULT 'active',       -- active | archived
    recall_count     INTEGER NOT NULL DEFAULT 0,
    last_recalled_at TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,                          -- optional TTL
    CONSTRAINT broker_memory_entries_kind_chk CHECK (kind IN ('observation','insight','fact','event','reflection','digest')),
    CONSTRAINT broker_memory_entries_scope_chk CHECK (scope IN ('global','client','unit','owner','broker','agent')),
    CONSTRAINT broker_memory_entries_importance_chk CHECK (importance BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX IF NOT EXISTS broker_memory_entries_dedupe_key_unique
    ON public.broker_memory_entries (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broker_memory_kind
    ON public.broker_memory_entries (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_memory_scope_subject
    ON public.broker_memory_entries (scope, subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_memory_importance
    ON public.broker_memory_entries (importance DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_memory_status_created
    ON public.broker_memory_entries (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.broker_memory_digests (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period       TEXT NOT NULL DEFAULT 'day',        -- day | week
    period_start DATE NOT NULL,
    digest       TEXT NOT NULL,
    insights     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{text, tag?}] distilled by the consolidator
    stats        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- counts, agents, kinds covered
    provider     TEXT,                                -- router provider used ('none' when no LLM available)
    model        TEXT,
    entry_count  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT broker_memory_digests_period_unique UNIQUE (period, period_start)
);
CREATE INDEX IF NOT EXISTS idx_broker_memory_digests_created
    ON public.broker_memory_digests (created_at DESC);

ALTER TABLE public.broker_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_memory_digests ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: reads/writes go through the worker's
-- service-role client only (same posture as agent_llm_providers, migration 053).

COMMENT ON TABLE public.broker_memory_entries IS
    'Super Broker Memory spine — every engine/agent remembers and recalls here (lib/memory/broker-soul.ts).';
COMMENT ON TABLE public.broker_memory_digests IS
    'Consolidated Soul digests produced by the memory-consolidation automation (LLM-routed or stats-only).';
