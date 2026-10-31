-- Minimal stand-in for the Supabase platform objects schema.sql assumes, so the
-- schema can be applied to a plain Postgres for testing.
--
-- pgvector is not assumed present: run-rls-tests.sh rewrites `vector(N)` to the
-- stub domain below and drops the hnsw indexes. Everything else — every table,
-- constraint, function and policy — is exercised exactly as written.
-- Roles are cluster-wide, so they may already exist from a previous run.
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);

CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

CREATE DOMAIN vector AS TEXT;
