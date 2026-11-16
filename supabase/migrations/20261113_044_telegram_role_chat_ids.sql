-- ============================================================================
-- Migration 044 — TELEGRAM ROLE CHAT IDS (3-way dispatch enablement)
-- ============================================================================
-- The 3-way stakeholder dispatch in /api/viewing-requests reads
-- TELEGRAM_CEO_CHAT_ID / TELEGRAM_TEAM_LEADER_CHAT_ID /
-- TELEGRAM_SALES_ADVISOR_CHAT_ID from the environment. Those ids can only be
-- discovered AFTER each stakeholder has messaged the bot once (Telegram
-- chat ids are not knowable in advance), and the only capture path before
-- this migration was "operator reads the /start reply in the bot chat and
-- pastes the id into GitHub secrets + a redeploy". That never happened, so
-- the dispatch has been honestly skipping all three roles since 2026-11-12.
--
-- This migration adds a durable, database-first source of truth:
--
--   public.telegram_role_chats   one row per staff ROLE, holding the chat id
--                                the role's operator registered themselves
--                                via the bot (/staffsetup <role>), plus an
--                                optional display name and a verification
--                                state.
--
-- Resolution order at dispatch time (lib/server/telegram-role-chats.ts):
--   1. explicit env override  (TELEGRAM_*_CHAT_ID — ops escape hatch)
--   2. this table             (self-registered, DB is source of truth)
--   3. honest skip            (same contract the route already reports)
--
-- Security posture (mirrors webhook_logs, migration 037):
--   · writes happen through the service-role client (webhook route, admin
--     API) which bypasses RLS — no public write path by design;
--   · staff-only read via public.is_staff();
--   · self-registration is restricted by the webhook handler to the
--     configured staff Telegram user ids (TELEGRAM_STAFF_USER_IDS); the
--     table itself stays service-role-writable only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_role_chats (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role           TEXT NOT NULL UNIQUE
                 CHECK (role IN ('ceo', 'team_leader', 'sales_advisor')),
  chat_id        TEXT NOT NULL CHECK (length(btrim(chat_id)) > 0),
  display_name   TEXT,
  registered_by  BIGINT,                     -- Telegram user id of the
                                             -- operator who ran /staffsetup
  verified       BOOLEAN NOT NULL DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.telegram_role_chats IS
  'Self-registered Telegram chat ids per staff ROLE for the 3-way viewing dispatch (CEO / Team Leader / Sales Advisor). Written by /staffsetup through the telegram webhook (service-role) and by /api/admin/telegram-role-chats; staff-only read. Env vars TELEGRAM_*_CHAT_ID override per dispatch.';

COMMENT ON COLUMN public.telegram_role_chats.role IS
  'Staff role key: ceo | team_leader | sales_advisor (mirrors the dispatch roster in /api/viewing-requests).';
COMMENT ON COLUMN public.telegram_role_chats.chat_id IS
  'Telegram chat id (or @channel) the role registered via /staffsetup.';
COMMENT ON COLUMN public.telegram_role_chats.registered_by IS
  'Telegram user id that ran /staffsetup (audit trail; restricted to TELEGRAM_STAFF_USER_IDS by the webhook handler).';
COMMENT ON COLUMN public.telegram_role_chats.verified IS
  'True once a test send (admin console or /staffsetup echo) reached the chat.';

-- Keep the automatic timestamp honest (repo-wide handle_updated_at, schema.sql §11).
DROP TRIGGER IF EXISTS trg_telegram_role_chats_updated ON public.telegram_role_chats;
CREATE TRIGGER trg_telegram_role_chats_updated
  BEFORE UPDATE ON public.telegram_role_chats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.telegram_role_chats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "telegram_role_chats_staff_read" ON public.telegram_role_chats;
  CREATE POLICY "telegram_role_chats_staff_read" ON public.telegram_role_chats
    FOR SELECT TO authenticated USING (public.is_staff());
END $$;

-- Inserts/updates happen through the service-role client only.

GRANT SELECT ON public.telegram_role_chats TO authenticated;
GRANT ALL ON public.telegram_role_chats TO service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_role_chats;
  EXCEPTION
    WHEN duplicate_object THEN NULL;  -- already streamed
    WHEN undefined_object THEN NULL;  -- publication absent (non-Supabase test hosts)
  END;
END $$;
