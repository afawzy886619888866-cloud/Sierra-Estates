-- broker_sessions: persistent RAG memory per client session
-- Stores conversation history + extracted client profile (budget, compound, intent)

CREATE TABLE IF NOT EXISTS broker_sessions (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT UNIQUE NOT NULL,
  messages        JSONB NOT NULL DEFAULT '[]',
  profile         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_broker_sessions_session_id ON broker_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_broker_sessions_updated ON broker_sessions (updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_broker_session_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS broker_sessions_updated ON broker_sessions;
CREATE TRIGGER broker_sessions_updated
  BEFORE UPDATE ON broker_sessions
  FOR EACH ROW EXECUTE FUNCTION update_broker_session_ts();

-- RLS: service role only (B6 fix: original lacked TO clause -> effectively public).
-- Canonical version lives in supabase/migrations/20260929_013_master_inventory_activation.sql
ALTER TABLE broker_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON broker_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- TTL cleanup: auto-purge sessions older than 90 days (run via pg_cron or manual)
-- SELECT cron.schedule('cleanup-old-sessions', '0 2 * * *',
--   'DELETE FROM broker_sessions WHERE updated_at < NOW() - INTERVAL ''90 days''');
