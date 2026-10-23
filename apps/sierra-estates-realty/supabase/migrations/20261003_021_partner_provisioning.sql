-- ═══════════════════════════════════════════════════════════════════════════
-- 021_partner_provisioning.sql — merger partner + superadmin logins
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose : Provision the 5 portal accounts end-to-end through the database
--           path, so partner logins work the moment this migration is applied
--           — no Vercel env change, no PARTNER_ACCOUNTS dependency.
--
--           PARTNER  admin1@sierra-estates.net   New Cairo + Madinaty
--           PARTNER  adminsierra75@gmail.com     rest of portfolio (66 names)
--           ADMIN    admin@sierra-estates.net    superadmin
--           ADMIN    a.fawzy8866@gmail.com       superadmin
--           ADMIN    sierrablue8866@gmail.com    superadmin
--
-- Login flow (app/api/auth Path A): Supabase password grant → token →
-- profiles.role (partner scope from profiles.metadata.partner_scope).
--
-- Design  : 100% IDEMPOTENT — safe to re-run; converges to exactly this
--           state. Runs after 019 in the chain but self-heals the role
--           CHECK so it also works if 019 has not been applied yet.
--           auth.users provisioning is ARBITER-FREE (UPDATE-then-INSERT):
--           this project's auth.users has no single-column unique index on
--           email and the postgres role cannot create one (auth schema owned
--           by supabase_auth_admin — "must be owner of table users"), so
--           ON CONFLICT (email) cannot infer an arbiter. UPDATE-then-INSERT
--           has identical semantics: only password + confirmation are
--           touched on existing accounts, so a Google-linked account keeps
--           its identity. Safe under the applier's advisory lock (no
--           concurrent runs).
--
-- SECURITY: the password is stored as a PRE-COMPUTED bcrypt hash (cost 10)
--           — no plaintext credential appears in this file, and the hash is
--           one-way. The password itself follows the owner's rule: same as
--           the Property Finder API credentials. Rotate by re-running with a
--           new hash (or via Supabase dashboard → Authentication → Users).
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Ensure 'partner' is in the profiles.role vocabulary (same healing logic
--    as 019; no-op when 019 already applied)
-- ───────────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────────
-- 2) auth.users — create-or-repassword the 5 accounts (bcrypt, confirmed)
--    ARBITER-FREE + GENERATED-COLUMN AWARE (see header): on newer GoTrue,
--    auth.users.email is GENERATED ALWAYS (lowercased) and the real input
--    column has a different name — writing to a generated column fails with
--    "cannot insert a non-DEFAULT value". The provisioning below discovers
--    the real source column from the generation expression at runtime and
--    writes THERE, case-insensitively. UPDATE-then-INSERT preserves the
--    original semantics: existing accounts (incl. Google-linked) only get
--    password + confirmation + updated_at.
-- ───────────────────────────────────────────────────────────────────────────
DO $provision$
DECLARE
  pw       TEXT := '$2b$10$McsxbSG2EeboXT.vdgw0uu7lH7v0ee1QTeISkmw5F54kE029JaNiy';
  emails   TEXT[] := ARRAY[
    'admin1@sierra-estates.net',
    'adminsierra75@gmail.com',
    'admin@sierra-estates.net',
    'a.fawzy8866@gmail.com',
    'sierrablue8866@gmail.com'
  ];
  names    TEXT[] := ARRAY[
    'Kamilia Admin',
    'Sierra Admin',
    'Sierra Estates Executive Admin',
    'Ahmed Fawzy',
    'Sierra Blu Owner'
  ];
  v_generated BOOLEAN;
  v_src       TEXT;
  v_found     BIGINT;
  i           INT;
BEGIN
  -- Is auth.users.email a GENERATED ALWAYS column?
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'auth.users'::regclass
      AND attname  = 'email'
      AND attisdropped = false
      AND attgenerated <> ''
  ) INTO v_generated;

  IF v_generated THEN
    -- Discover the real source column from the generation expression
    -- (expected shape: lower(<source>)); fall back to the GoTrue standard
    -- name email_field, then hard-fail loudly if it does not exist.
    BEGIN
      SELECT (regexp_match(pg_get_expr(d.adbin, d.adrelid),
                           'lower\(\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\)'))[1]
        INTO v_src
      FROM pg_attrdef d
      WHERE d.adrelid = 'auth.users'::regclass
        AND d.adnum   = (SELECT attnum FROM pg_attribute
                         WHERE attrelid = 'auth.users'::regclass
                           AND attname = 'email' AND attgenerated <> '');
    EXCEPTION WHEN OTHERS THEN
      v_src := NULL;
    END;
    IF COALESCE(v_src, '') = '' THEN
      v_src := 'email_field';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_attribute
                   WHERE attrelid = 'auth.users'::regclass
                     AND attname  = v_src
                     AND attisdropped = false) THEN
      RAISE EXCEPTION
        'auth.users.email is GENERATED but source column % was not found — inspect the auth schema', v_src;
    END IF;
  ELSE
    v_src := 'email';
  END IF;

  FOR i IN 1..coalesce(array_length(emails, 1), 0) LOOP
    EXECUTE format(
      'UPDATE auth.users
          SET encrypted_password = $1,
              email_confirmed_at = COALESCE(email_confirmed_at, now()),
              updated_at         = now()
        WHERE %I = $2',
      v_src)
    USING pw, lower(emails[i]);
    GET DIAGNOSTICS v_found = ROW_COUNT;

    IF v_found = 0 THEN
      EXECUTE format(
        'INSERT INTO auth.users (
           instance_id, id, aud, role, %I, encrypted_password,
           email_confirmed_at, created_at, updated_at,
           raw_app_meta_data, raw_user_meta_data
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6, now(), now(), now(), $7, $8)',
        v_src)
      USING
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated',
        lower(emails[i]), pw,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', names[i]);
    END IF;
  END LOOP;
END
$provision$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) auth.identities — email identity rows for any account that has none
--    (modern GoTrue expects these; no-op when they already exist)
--    NOTE: auth.identities.email may ALSO be GENERATED (derived from
--    identity_data, same GoTrue lowercase scheme) — writing it explicitly
--    fails with "cannot insert a non-DEFAULT value". The insert below omits
--    the column when it is generated; identity_data already carries the
--    email so the generated value computes identically.
-- ───────────────────────────────────────────────────────────────────────────
DO $identities$
DECLARE
  v_generated BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'auth.identities'::regclass
      AND attname  = 'email'
      AND attisdropped = false
      AND attgenerated <> ''
  ) INTO v_generated;

  IF v_generated THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    SELECT gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', now(), now(), now()
    FROM auth.users u
    WHERE u.email IN (
      'admin1@sierra-estates.net', 'adminsierra75@gmail.com',
      'admin@sierra-estates.net',  'a.fawzy8866@gmail.com',
      'sierrablue8866@gmail.com'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
    );
  ELSE
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, email,
      last_sign_in_at, created_at, updated_at
    )
    SELECT gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', u.email, now(), now(), now()
    FROM auth.users u
    WHERE u.email IN (
      'admin1@sierra-estates.net', 'adminsierra75@gmail.com',
      'admin@sierra-estates.net',  'a.fawzy8866@gmail.com',
      'sierrablue8866@gmail.com'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
    );
  END IF;
END
$identities$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) public.profiles — partner rows (role + portfolio scope)
--
--    Scope lists are IDENTICAL to the validated PARTNER_ACCOUNTS JSON
--    (validated 22/22 against the repo's real auth code):
--      Kamilia → New Cairo + Madinaty          (~5,741 units, 48%)
--      Sierra  → everything else, 66-name list  (~6,202 units, 52%)
--    Matching is name-based, case-insensitive, bidirectional-substring.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, role, status, metadata, created_at, updated_at)
SELECT u.id, u.email, 'Kamilia Admin', 'partner', 'active',
       jsonb_build_object(
         'partner_scope',
         '{"developers":[],"compounds":["New Cairo","Madinaty"]}'::jsonb
       ),
       now(), now()
FROM auth.users u WHERE u.email = 'admin1@sierra-estates.net'
ON CONFLICT (id) DO UPDATE SET
  role      = 'partner',
  status    = 'active',
  metadata  = public.profiles.metadata
             || jsonb_build_object(
                  'partner_scope',
                  '{"developers":[],"compounds":["New Cairo","Madinaty"]}'::jsonb
                ),
  updated_at = now();

INSERT INTO public.profiles (id, email, full_name, role, status, metadata, created_at, updated_at)
SELECT u.id, u.email, 'Sierra Admin', 'partner', 'active',
       jsonb_build_object(
         'partner_scope',
         '{"developers":[],"compounds":[
            "Mivida","Mevida","Al Rehab","Eastown","East town","Hyde Park",
            "5th Settlement","Lake View Residence","Villette","Mountain View iCity",
            "Uptown Cairo","Up Town Cairo","Fifth Square","Cairo Festival City","CFC",
            "SODIC East","Galleria Moon Valley","90 Avenue","Katameya Heights","Oriana",
            "The Waterway","Katameya Dunes","El Shorouk City","Sheikh Zayed","New Capital",
            "new-capital","Swan Lake Residence","Swan Lake","Midtown","North Coast",
            "6th of October","Al Banafsaj","Al Narges","Narges","South Academy","South Academ",
            "Al Andalus","andlos","The Square","The Address East","Amorada","Second District",
            "El Patio Oro","City Gate","La Mirada","North 90th","First District",
            "Promenade Wadi Degla","Sarai","Stone Residence","Gardenia City","gardina city",
            "Jayd","Zaid","Trio Gardens","Badya","Fifth District","District 5","Taj City",
            "The Icon Residence","Village Gate","Zed East","palm-hills",
            "eypet hose elkurfenl","banfcg","other"
          ]}'::jsonb
       ),
       now(), now()
FROM auth.users u WHERE u.email = 'adminsierra75@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role      = 'partner',
  status    = 'active',
  metadata  = public.profiles.metadata
             || jsonb_build_object(
                  'partner_scope',
                  '{"developers":[],"compounds":[
                     "Mivida","Mevida","Al Rehab","Eastown","East town","Hyde Park",
                     "5th Settlement","Lake View Residence","Villette","Mountain View iCity",
                     "Uptown Cairo","Up Town Cairo","Fifth Square","Cairo Festival City","CFC",
                     "SODIC East","Galleria Moon Valley","90 Avenue","Katameya Heights","Oriana",
                     "The Waterway","Katameya Dunes","El Shorouk City","Sheikh Zayed","New Capital",
                     "new-capital","Swan Lake Residence","Swan Lake","Midtown","North Coast",
                     "6th of October","Al Banafsaj","Al Narges","Narges","South Academy","South Academ",
                     "Al Andalus","andlos","The Square","The Address East","Amorada","Second District",
                     "El Patio Oro","City Gate","La Mirada","North 90th","First District",
                     "Promenade Wadi Degla","Sarai","Stone Residence","Gardenia City","gardina city",
                     "Jayd","Zaid","Trio Gardens","Badya","Fifth District","District 5","Taj City",
                     "The Icon Residence","Village Gate","Zed East","palm-hills",
                     "eypet hose elkurfenl","banfcg","other"
                   ]}'::jsonb
                ),
  updated_at = now();

-- ───────────────────────────────────────────────────────────────────────────
-- 5) public.profiles — admin rows (superadmin).
--    Existing rows are NEVER demoted: role is only set when missing/blank.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, full_name, role, status, metadata, created_at, updated_at)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       'superadmin', 'active', '{}'::jsonb, now(), now()
FROM auth.users u
WHERE u.email IN ('admin@sierra-estates.net', 'a.fawzy8866@gmail.com', 'sierrablue8866@gmail.com')
ON CONFLICT (id) DO UPDATE SET
  role      = COALESCE(NULLIF(public.profiles.role, ''), 'superadmin'),
  status    = 'active',
  updated_at = now();

-- ───────────────────────────────────────────────────────────────────────────
-- 6) Verification (read-only)
-- ───────────────────────────────────────────────────────────────────────────
-- SELECT p.email, p.role, p.status,
--        jsonb_array_length(p.metadata->'partner_scope'->'compounds') AS scope_compound_count
-- FROM public.profiles p
-- WHERE p.email IN (
--   'admin1@sierra-estates.net', 'adminsierra75@gmail.com',
--   'admin@sierra-estates.net',  'a.fawzy8866@gmail.com',
--   'sierrablue8866@gmail.com'
-- ) ORDER BY p.role, p.email;
