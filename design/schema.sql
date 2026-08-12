-- ═══════════════════════════════════════════════════════════════════════════
-- Sierra Estates — Supabase Schema + Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════════════════
--
--  HOW TO DEPLOY:
--  1. Go to your Supabase project dashboard
--  2. Open SQL Editor (left sidebar)
--  3. Click "New query"
--  4. Paste this entire file
--  5. Click "Run" (▶ button)
--
--  This creates all tables + enables RLS + sets policies.
--  Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable UUID extension ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Compounds ───
CREATE TABLE IF NOT EXISTS compounds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  zone        TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  coords      TEXT,
  growth      TEXT,
  ai_score    DOUBLE PRECISION DEFAULT 8.5,
  price_m     DOUBLE PRECISION,
  rent        INTEGER,
  image       TEXT,
  featured    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Listings ───
CREATE TABLE IF NOT EXISTS listings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE,
  compound    TEXT,
  zone        TEXT,
  type        TEXT,
  beds        INTEGER,
  bath        INTEGER,
  area        INTEGER,
  egp_m       DOUBLE PRECISION,
  usd         INTEGER,
  ai_score    DOUBLE PRECISION,
  tag         TEXT,
  mode        TEXT DEFAULT 'sale',
  agent       TEXT,
  ago         TEXT,
  img         TEXT,
  status      TEXT DEFAULT 'available',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Units (per-compound inventory) ───
CREATE TABLE IF NOT EXISTS units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound    TEXT NOT NULL,
  code        TEXT,
  type        TEXT,
  beds        INTEGER,
  bath        INTEGER,
  area        INTEGER,
  floor       TEXT,
  egp_m       DOUBLE PRECISION,
  usd         INTEGER,
  ai_score    DOUBLE PRECISION,
  status      TEXT DEFAULT 'available',
  delivery    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agents ───
CREATE TABLE IF NOT EXISTS agents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  avatar      TEXT,
  rating      DOUBLE PRECISION DEFAULT 5.0,
  listings_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inquiries (from index.html form) ───
CREATE TABLE IF NOT EXISTS inquiries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  mode        TEXT DEFAULT 'buy',
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  zone        TEXT,
  type        TEXT,
  budget      TEXT,
  status      TEXT DEFAULT 'new',
  source      TEXT DEFAULT 'website'
);

-- ─── Career applications (from career.html form) ───
CREATE TABLE IF NOT EXISTS career_applications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  position    TEXT,
  experience  TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'new'
);

-- ─── Leads (from Property Finder webhook) ───
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  source      TEXT DEFAULT 'property_finder',
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  compound    TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'new'
);

-- ─── Users (admin profiles — used for RLS role checks) ───
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  role        TEXT DEFAULT 'viewer',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
--  ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE compounds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
--  HELPER FUNCTION: is_admin()
--  Checks if the current auth user has role='admin' in users table.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
--  RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "compounds_public_read" ON compounds;
DROP POLICY IF EXISTS "compounds_admin_write" ON compounds;
DROP POLICY IF EXISTS "listings_public_read" ON listings;
DROP POLICY IF EXISTS "listings_admin_write" ON listings;
DROP POLICY IF EXISTS "units_public_read" ON units;
DROP POLICY IF EXISTS "units_admin_write" ON units;
DROP POLICY IF EXISTS "agents_public_read" ON agents;
DROP POLICY IF EXISTS "agents_admin_write" ON agents;
DROP POLICY IF EXISTS "inquiries_public_create" ON inquiries;
DROP POLICY IF EXISTS "inquiries_admin_read" ON inquiries;
DROP POLICY IF EXISTS "inquiries_admin_update" ON inquiries;
DROP POLICY IF EXISTS "career_public_create" ON career_applications;
DROP POLICY IF EXISTS "career_admin_read" ON career_applications;
DROP POLICY IF EXISTS "career_admin_update" ON career_applications;
DROP POLICY IF EXISTS "leads_admin_all" ON leads;
DROP POLICY IF EXISTS "leads_webhook_insert" ON leads;
DROP POLICY IF EXISTS "users_self_read" ON users;
DROP POLICY IF EXISTS "users_admin_write" ON users;

-- ─── Compounds: public read, admin write ───
CREATE POLICY "compounds_public_read" ON compounds
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "compounds_admin_write" ON compounds
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─── Listings: public read, admin write ───
CREATE POLICY "listings_public_read" ON listings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "listings_admin_write" ON listings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─── Units: public read, admin write ───
CREATE POLICY "units_public_read" ON units
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "units_admin_write" ON units
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─── Agents: public read, admin write ───
CREATE POLICY "agents_public_read" ON agents
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "agents_admin_write" ON agents
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─── Inquiries: ANYONE can create, admin can read/update ───
CREATE POLICY "inquiries_public_create" ON inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "inquiries_admin_read" ON inquiries
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "inquiries_admin_update" ON inquiries
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ─── Career applications: ANYONE can create, admin can read/update ───
CREATE POLICY "career_public_create" ON career_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "career_admin_read" ON career_applications
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "career_admin_update" ON career_applications
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "leads_webhook_insert" ON leads
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Users: self read, admin write ───
CREATE POLICY "users_self_read" ON users
  FOR SELECT TO authenticated USING (auth.uid() = id OR is_admin());
CREATE POLICY "users_admin_write" ON users
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
--  INDEXES (for performance)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_compounds_name ON compounds(name);
CREATE INDEX IF NOT EXISTS idx_compounds_zone ON compounds(zone);
CREATE INDEX IF NOT EXISTS idx_listings_compound ON listings(compound);
CREATE INDEX IF NOT EXISTS idx_listings_mode ON listings(mode);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);
CREATE INDEX IF NOT EXISTS idx_units_compound ON units(compound);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
--  REALTIME (enable for compounds + listings)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE compounds REPLICA IDENTITY FULL;
ALTER TABLE listings  REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE compounds;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;

-- ═══════════════════════════════════════════════════════════════════════════
--  DONE — schema ready!
--  Next steps:
--  1. Edit supabase-config.js with your project URL + anon key
--  2. Set SIERRA_SUPABASE_ENABLED = true
--  3. Open seed-supabase.html to populate the tables
--  4. Create your admin user (run in SQL Editor after first sign-up):
--      INSERT INTO users (id, email, name, role)
--      VALUES ('YOUR-AUTH-UID', 'your@email.com', 'Ahmed', 'admin');
-- ═══════════════════════════════════════════════════════════════════════════
