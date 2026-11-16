-- ═══════════════════════════════════════════════════════════════════════════
-- Sierra Blu — 019 · PARTNER ACCOUNTS (merged-in property accounts)
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose : Support the integration-merger partner accounts: users from the
--           merged entity who sign into the admin portal and see EXACTLY
--           three workspaces — Inventory, Ad Listing, CRM — scoped to their
--           own units/numbers (developer + compound portfolio).
-- Design  : 100% ADDITIVE & IDEMPOTENT. Only the profiles.role CHECK is
--           widened ('partner' joins the vocabulary); no data changes, no
--           destructive operations, safe on the live project.
--
-- Scope   :   · role 'partner'                     — the account type
--             · profiles.metadata.partner_scope    — { developers:[], compounds:[] }
--               (JSONB — no DDL needed; written by the operator or the
--                Supabase dashboard when provisioning a partner)
--             · PARTNER_ACCOUNTS env (optional)    — email+password provisioning
--               path that needs no Supabase Auth user; see lib/server/partner-scope.ts
--
-- Enforcement is server-side at the API layer (lib/server/auth-guard.ts
-- verifyPortalRequest + per-route row scoping in lib/server/partner-scope.ts)
-- because the admin reads run through the service-role client, which bypasses
-- RLS by design. verifyAdminRequest continues to REJECT the partner role, so
-- every other admin route remains staff-only.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. WIDEN profiles.role — add 'partner' to the allowed vocabulary.
--    The live constraint name is profiles_role_check (inline CHECK default);
--    a DO block drops ANY check constraint covering the role column so this
--    also heals a project where the name drifted, then re-adds the canonical
--    one. Idempotent: the final state is identical on every run.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'superadmin', 'admin', 'manager', 'agent', 'broker',
    'viewer', 'client', 'owner', 'partner'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. PARTNER SCOPE HOME — metadata.partner_scope.
--    JSONB already exists on profiles; the canonical shape is documented here
--    for the operator. Example (set via dashboard or SQL when provisioning):
--
--    UPDATE public.profiles
--    SET metadata = jsonb_set(metadata, '{partner_scope}',
--      '{"developers":["Mountain View"],"compounds":["iCity"]}')
--    WHERE email = 'partner1@example.com';
-- ─────────────────────────────────────────────────────────────────────────
-- (No DDL required — metadata JSONB default '{}' exists on the live table.)

-- ─────────────────────────────────────────────────────────────────────────
-- 3. VERIFICATION — operator smoke check (harmless, read-only).
-- ─────────────────────────────────────────────────────────────────────────
-- SELECT role, COUNT(*) FROM public.profiles GROUP BY role ORDER BY role;
