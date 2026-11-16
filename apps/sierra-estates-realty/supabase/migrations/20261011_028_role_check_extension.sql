-- ═══════════════════════════════════════════════════════════════════
-- 028 — ROLE CHECK EXTENSION + PENDING ACCESS STATUS (Phase 7)
--
-- Adds the six missing canonical roles from the master execution command
-- (operations_manager, inventory_manager, marketing_manager, sales_manager,
-- sales_agent, auditor) to the SAME profiles.role column — no disconnected
-- vocabulary. super_admin maps to the existing `superadmin`; admin and
-- partner already exist. Adds `pending` to profiles.status for the Google
-- OAuth access-approval lifecycle (an authenticated-but-unapproved account
-- is visible in the admin queue as pending, never silently granted).
--
-- Additive: the CHECK constraints are replaced with strictly-wider versions.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN (
      'superadmin', 'admin', 'operations_manager', 'inventory_manager',
      'marketing_manager', 'sales_manager', 'sales_agent', 'auditor',
      'manager', 'agent', 'broker', 'viewer', 'client', 'owner', 'partner'
    )
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check CHECK (
    status IN ('pending', 'active', 'suspended', 'deleted')
  );

COMMENT ON COLUMN public.profiles.status IS 'pending = authenticated Google account awaiting super-admin approval (least-privilege); active/suspended/deleted enforced on every protected route and re-checked per session.';

-- Approval audit trail: an access request / approval / denial is a durable,
-- queryable event — not a log line.
CREATE TABLE IF NOT EXISTS public.access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  auth_uid      TEXT,
  provider      TEXT NOT NULL DEFAULT 'google',
  state         TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | denied
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by    TEXT,
  decided_at    TIMESTAMPTZ,
  granted_role  TEXT,
  note          TEXT,
  notified      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_access_requests_state
  ON public.access_requests (state, requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_access_requests_open_email
  ON public.access_requests (email)
  WHERE state = 'pending';

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'access_requests' AND policyname = 'staff_read_access_requests') THEN
    CREATE POLICY staff_read_access_requests ON public.access_requests
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                AND p.role IN ('superadmin','admin','auditor'))
      );
  END IF;
END $$;
