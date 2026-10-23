-- ═══════════════════════════════════════════════════════════════════════════
-- 20261003_020a_upsert_target_probe_and_guard.sql — pre-021 dependency repair
-- ═══════════════════════════════════════════════════════════════════════════
-- Context:
--   20261003_021_partner_provisioning.sql provisions the 5 portal accounts.
--   Its original auth.users upsert relied on ON CONFLICT (email), which
--   requires a single-column unique index on auth.users(email). This project
--   has none (older GoTrue), and the role that applies migrations (postgres)
--   CANNOT create one: auth schema is owned by supabase_auth_admin
--   ("must be owner of table users"). DDL on auth is unreachable from every
--   postgres-context path (runtime applier, SQL Editor).
--
--   Therefore 021 was edited (it had never been applied — its transactions
--   rolled back both times and it holds no schema_migrations record) to use
--   an arbiter-free UPDATE-then-INSERT with identical semantics. This file
--   runs BEFORE 021 and:
--
--     1. PROVES the applier role may write auth.users — via a zero-residue
--        probe: a valid row is inserted inside a plpgsql subtransaction that
--        immediately raises to roll itself back. No data persists. If the
--        role lacks DML, this file halts the chain with a loud, explicit
--        error instead of letting 021 die mid-provisioning.
--     2. GUARDS public.profiles(id) — ensures the baseline PRIMARY KEY the
--        upserts' ON CONFLICT (id) requires actually exists (no-op when it
--        does).
--
-- Naming (do NOT re-date):
--   Sorts between 20261002_020_public_publish_gate.sql and
--   20261003_021_partner_provisioning.sql.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Zero-residue DML probe on auth.users ------------------------------------
DO $probe$
DECLARE
  dml_allowed BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated',
      'sierra-migration-probe@invalid.local', 'probe-not-a-real-hash',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"probe":true}'::jsonb, now(), now()
    );
    -- We got past the privilege system: discard the probe row by rolling
    -- back ONLY this subtransaction.
    RAISE EXCEPTION 'probe-rollback';
  EXCEPTION
    WHEN raise_exception THEN
      dml_allowed := true;            -- insert was permitted; row rolled back
    WHEN insufficient_privilege THEN
      dml_allowed := false;           -- postgres may not write auth.users
    WHEN OTHERS THEN
      dml_allowed := true;            -- failed after the privilege check
  END;
  IF NOT dml_allowed THEN
    RAISE EXCEPTION
      'postgres role cannot write auth.users (insufficient_privilege). \
       Provision the 5 portal accounts via the Supabase Auth Admin API instead, \
       then re-run the applier; 021''s public.profiles sections remain safe to apply.';
  END IF;
END
$probe$;

-- 2) public.profiles(id): ensure the baseline PRIMARY KEY exists -------------
DO $repair$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class     t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname  = 'public'
      AND t.relname  = 'profiles'
      AND c.contype  = 'p'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END
$repair$;
