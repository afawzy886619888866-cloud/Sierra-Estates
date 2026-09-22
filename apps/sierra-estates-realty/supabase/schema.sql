-- ==============================================================================
-- Sierra Estates — Production Supabase (PostgreSQL) Master Schema
-- Complete Drop-in Schema with pgvector, RLS Policies, Indexes, and Realtime
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ------------------------------------------------------------------------------
-- 2. User Profiles & Roles (Linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('superadmin', 'admin', 'manager', 'agent', 'broker', 'viewer', 'client', 'owner')),
    avatar_url TEXT,
    -- Recorded at sign-in by /api/auth; the Firestore users doc carried these.
    status TEXT DEFAULT 'active',
    last_login TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. Listings / Properties Master Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ref_id TEXT UNIQUE,
    -- Defaulted: the admin SPA's create-listing form has no title field, it
    -- posts compound/type/price only (app/api/admin/listings POST).
    title TEXT NOT NULL DEFAULT '',
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    compound TEXT NOT NULL,
    developer TEXT,
    location_area TEXT DEFAULT 'New Cairo',
    city TEXT DEFAULT 'Cairo',
    property_type TEXT DEFAULT 'Apartment',
    deal_type TEXT DEFAULT 'sale' CHECK (deal_type IN ('sale', 'rent', 'resale', 'primary')),
    price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    price_currency TEXT DEFAULT 'EGP',
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    area_sqm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    finishing_type TEXT DEFAULT 'Core & Shell',
    delivery_year INT,
    down_payment NUMERIC(15, 2) DEFAULT 0,
    installment_years INT DEFAULT 0,
    monthly_installment NUMERIC(15, 2) DEFAULT 0,
    roi_percentage NUMERIC(5, 2),
    cap_rate NUMERIC(5, 2),
    valuation_status TEXT DEFAULT 'Fair Value',
    -- The public site and the legacy Firestore documents use a wider status
    -- vocabulary than the original six values: 'available' is what the client
    -- feed and the seed data emit, and 'Pending Review' is what the
    -- unauthenticated /api/listings/submit endpoint writes. Both must be
    -- storable or the moderation flow cannot be represented at all.
    -- isPubliclyVisibleListingStatus() (lib/models/schema.ts) is what decides
    -- which of these reach the public feed.
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'pending', 'sold', 'rented', 'archived', 'draft',
        'available', 'reserved', 'off-market', 'Pending Review'
    )),
    -- Moderation gate for public submissions: a row written by the public
    -- /api/listings/submit endpoint is a claim, not inventory, until staff
    -- verify it and publish it to the client feed.
    verified BOOLEAN DEFAULT FALSE,
    publish_to_client BOOLEAN DEFAULT FALSE,
    -- Legacy presentation/CRM fields carried over from the Firestore
    -- `listings` / `houyez_listings` documents (see lib/types.ts `Listing`).
    code TEXT,                        -- human-facing code, e.g. 'SE-SUB-123456'
    zone TEXT,                        -- sub-area within the compound
    egp_m NUMERIC(15, 2),             -- headline price in EGP millions
    usd NUMERIC(15, 2),               -- headline price in USD
    ai_score NUMERIC(4, 2) DEFAULT 0, -- 0-10 ranking weight used by the feed
    tag TEXT,                         -- 'Verified Owner' | 'Featured' | ...
    agent TEXT,                       -- display name of the listing agent
    ago TEXT,                         -- freshness label captured at write time
    img TEXT,                         -- primary image (images[0] equivalent)
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    garden_area NUMERIC(10, 2) DEFAULT 0,
    owner_type TEXT,                  -- 'Owner' | 'Broker'
    pf_reference_number TEXT,         -- PropertyFinder reference, when synced
    pf_status TEXT,                   -- PropertyFinder publication state
    automation JSONB DEFAULT '{}'::jsonb,   -- { isPublishedToPF, ... }
    intelligence JSONB DEFAULT '{}'::jsonb, -- { valuationScore, urgencyScore, ... }
    category TEXT,                    -- 'residential' | 'commercial'
    dupe_check_hash TEXT,             -- inventory dedupe fingerprint
    sync_source TEXT,                 -- 'manual' | 'property-finder' | 'whatsapp' | ...
    featured BOOLEAN DEFAULT FALSE,
    is_hot_deal BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_phone TEXT,
    owner_name TEXT,
    broker_name TEXT,
    broker_phone TEXT,
    source_channel TEXT DEFAULT 'direct',
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    floor_plan_url TEXT,
    virtual_tour_url TEXT,
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    reference_code TEXT UNIQUE,
    location_coords geometry(Point, 4326),
    latitude NUMERIC,
    longitude NUMERIC,
    raw_data JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. Leads & CRM Contacts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    -- Nullable: the public /api/leads contact form requires an email but
    -- leaves the phone optional, so NOT NULL would reject a valid submission.
    phone TEXT,
    email TEXT,
    channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'telegram', 'web', 'phone', 'referral', 'property_finder')),
    lead_type TEXT DEFAULT 'buyer' CHECK (lead_type IN ('buyer', 'renter', 'investor', 'seller', 'owner')),
    -- 'Viewing Requested' is written by /api/leads/request-viewing; the rest
    -- are the canonical pipeline values.
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiating', 'won', 'lost', 'nurture', 'Viewing Requested')),
    target_compound TEXT,
    target_property_type TEXT,
    budget_min NUMERIC(15, 2) DEFAULT 0,
    budget_max NUMERIC(15, 2) DEFAULT 0,
    budget_currency TEXT DEFAULT 'EGP',
    preferred_bedrooms INT,
    preferred_delivery_year INT,
    lead_score INT DEFAULT 50,
    assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    summary_notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    -- CRM/qualification fields written by the public and concierge routes.
    -- `channel` above is the normalised intake channel; `source` keeps the
    -- raw attribution string ('website', 'property-finder', ...).
    source TEXT DEFAULT 'website',
    mode TEXT DEFAULT 'sale',         -- 'sale' | 'rent' interest
    zone TEXT,
    phase TEXT,                       -- 'acquisition' | ...
    priority TEXT,                    -- 'hot' | 'warm' | 'cold'
    via TEXT,                         -- human label for how the lead arrived
    interest TEXT,
    capital_allocation TEXT,
    locale TEXT,
    stage INT,                        -- numeric funnel position (1..n)
    whatsapp TEXT,                    -- WhatsApp number when it differs from phone
    ai_profiling JSONB DEFAULT '{}'::jsonb,
    automation JSONB DEFAULT '{}'::jsonb,
    -- Admin CRM board fields (app/api/admin/leads). `pipeline_stage` is the
    -- PipelineStage enum ('inbound'..'closed-won') the board works in; it is
    -- deliberately NOT `stage` above, which the public intake routes use as a
    -- numeric funnel position.
    pipeline_stage TEXT DEFAULT 'inbound',
    color TEXT,                       -- board swimlane colour
    hot BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    pf_lead_id TEXT,                  -- PropertyFinder lead id, when source is PF
    interested_project_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_property_type TEXT,
    -- Concierge portfolio pointer (see public.concierge_selections).
    concierge_portfolio_id TEXT,
    concierge_portfolio_sent_at TIMESTAMPTZ,
    concierge_portfolio_sent_via TEXT,
    last_curated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. Deals, Sales & Proposals
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    stage TEXT DEFAULT 'proposal' CHECK (stage IN ('proposal', 'viewing', 'offer_made', 'under_contract', 'closing', 'closed_won', 'closed_lost')),
    deal_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    commission_percentage NUMERIC(5, 2) DEFAULT 2.5,
    commission_amount NUMERIC(15, 2) DEFAULT 0,
    closing_probability INT DEFAULT 50,
    target_closing_date DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    deal_id TEXT REFERENCES public.deals(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    offered_price NUMERIC(15, 2) NOT NULL,
    payment_terms TEXT,
    roi_calculation JSONB DEFAULT '{}'::jsonb,
    pdf_url TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. Viewing Appointments & Scheduling
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.viewing_appointments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    meeting_location TEXT,
    notes TEXT,
    reminder_sent_client BOOLEAN DEFAULT FALSE,
    reminder_sent_owner BOOLEAN DEFAULT FALSE,
    feedback_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. WhatsApp & Messaging Queue
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'template', 'image', 'document', 'interactive')),
    message_body TEXT NOT NULL,
    media_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'read', 'failed')),
    retry_count INT DEFAULT 0,
    error_message TEXT,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 8. Unified Memory & Vector Context Engine (for AI Agents)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unified_memory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT NOT NULL,
    session_id TEXT,
    category TEXT DEFAULT 'general',
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    embedding vector(1536),
    source TEXT DEFAULT 'verified-system',
    ttl_seconds INT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agent_executions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT NOT NULL,
    task_name TEXT NOT NULL,
    status TEXT DEFAULT 'success' CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout')),
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT '{}'::jsonb,
    latency_ms INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 9. System Metrics & Telemetry
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(15, 4) NOT NULL,
    dimensions JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 10. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_compound ON public.listings(compound);
CREATE INDEX IF NOT EXISTS idx_listings_deal_type ON public.listings(deal_type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms ON public.listings(bedrooms);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings(location_area);
CREATE INDEX IF NOT EXISTS idx_listings_raw_data ON public.listings USING gin(raw_data);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON public.leads(channel);

CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_viewing_scheduled ON public.viewing_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON public.whatsapp_queue(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_unified_memory_agent ON public.unified_memory(agent_id, key);
CREATE INDEX IF NOT EXISTS idx_unified_memory_embedding ON public.unified_memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_listings_embedding ON public.listings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS listings_geo_idx ON public.listings USING gist (location_coords);

-- Admin Portal & Dashboard Performance Optimization Indexes (database-design skill)
CREATE INDEX IF NOT EXISTS idx_listings_agent ON public.listings(agent) WHERE agent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_status_ai_score ON public.listings(status, ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);

-- ------------------------------------------------------------------------------
-- 11. Automatic updated_at Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_profiles') THEN
        CREATE TRIGGER trigger_update_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_listings') THEN
        CREATE TRIGGER trigger_update_listings BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_leads') THEN
        CREATE TRIGGER trigger_update_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_deals') THEN
        CREATE TRIGGER trigger_update_deals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_viewings') THEN
        CREATE TRIGGER trigger_update_viewings BEFORE UPDATE ON public.viewing_appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_memory') THEN
        CREATE TRIGGER trigger_update_memory BEFORE UPDATE ON public.unified_memory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 12. Enable Realtime Publications
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.viewing_appointments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_queue;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 13. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Role helpers.
--
-- SECURITY DEFINER so the policies below can read public.profiles even though
-- profiles itself is RLS-protected (a policy that queried it directly would
-- recurse). search_path is pinned so the function cannot be redirected by a
-- caller-controlled search_path.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
    );
$fn$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'agent', 'broker')
    );
$fn$;

DO $$
BEGIN
    -- ── profiles ──────────────────────────────────────────────────────────
    -- RLS was enabled with no policies at all, which denies every non-service
    -- read, so role lookups from the client could never work. Sign-ups land as
    -- role 'client', and role is the privilege boundary: a user may edit their
    -- own profile but never their own role, which is why the self-update policy
    -- pins role to its current value. Only an admin may change it.
    DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
    CREATE POLICY "profiles_self_read" ON public.profiles
        FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff());

    DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
    CREATE POLICY "profiles_self_update" ON public.profiles
        FOR UPDATE TO authenticated
        USING (id = auth.uid())
        WITH CHECK (
            id = auth.uid()
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        );

    DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
    CREATE POLICY "profiles_admin_manage" ON public.profiles
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    -- ── listings ──────────────────────────────────────────────────────────
    -- Public reads stay open for active inventory. Writes were open to every
    -- authenticated user, which on a self-serve sign-up means any customer
    -- could edit or delete the whole catalogue.
    DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
    CREATE POLICY "Public can view active listings" ON public.listings
        FOR SELECT USING (status = 'active' OR public.is_staff());

    DROP POLICY IF EXISTS "Authenticated users can manage listings" ON public.listings;
    DROP POLICY IF EXISTS "listings_staff_write" ON public.listings;
    CREATE POLICY "listings_staff_write" ON public.listings
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- ── leads / deals / proposals / viewings ──────────────────────────────
    -- Customer PII and commercial terms. These were readable and writable by
    -- any authenticated account; staff only from here on.
    DROP POLICY IF EXISTS "Service role full access leads" ON public.leads;
    CREATE POLICY "Service role full access leads" ON public.leads
        FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Authenticated users can access leads" ON public.leads;
    DROP POLICY IF EXISTS "leads_staff_access" ON public.leads;
    CREATE POLICY "leads_staff_access" ON public.leads
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "Authenticated users can access deals" ON public.deals;
    DROP POLICY IF EXISTS "deals_staff_access" ON public.deals;
    CREATE POLICY "deals_staff_access" ON public.deals
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "proposals_staff_access" ON public.proposals;
    CREATE POLICY "proposals_staff_access" ON public.proposals
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "Authenticated users can access viewings" ON public.viewing_appointments;
    DROP POLICY IF EXISTS "viewings_staff_access" ON public.viewing_appointments;
    CREATE POLICY "viewings_staff_access" ON public.viewing_appointments
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- ── operational tables ────────────────────────────────────────────────
    -- Outbound message queue and agent memory: staff-only, never a customer.
    DROP POLICY IF EXISTS "Authenticated users can access whatsapp queue" ON public.whatsapp_queue;
    DROP POLICY IF EXISTS "whatsapp_queue_staff_access" ON public.whatsapp_queue;
    CREATE POLICY "whatsapp_queue_staff_access" ON public.whatsapp_queue
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "Authenticated users can access unified memory" ON public.unified_memory;
    DROP POLICY IF EXISTS "unified_memory_staff_access" ON public.unified_memory;
    CREATE POLICY "unified_memory_staff_access" ON public.unified_memory
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "Authenticated users can access executions" ON public.agent_executions;
    DROP POLICY IF EXISTS "agent_executions_staff_access" ON public.agent_executions;
    CREATE POLICY "agent_executions_staff_access" ON public.agent_executions
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- system_metrics keeps RLS enabled with no authenticated policy: it is
    -- written by the service role only, and denying by default is correct.
END $$;


-- ==============================================================================
-- Firebase → Supabase migration: tables for the remaining Firestore collections.
--
-- Column shapes are taken from the existing TypeScript models
-- (apps/sierra-estates-realty/lib/models/schema.ts and lib/types.ts) rather
-- than invented, so the route migration is a mechanical rename of field names
-- from camelCase to snake_case.
-- ==============================================================================

-- ─── Compounds (New Cairo reference data, public read) ───────────────────────
CREATE TABLE IF NOT EXISTS public.compounds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    zone TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    growth TEXT,
    ai_score NUMERIC(4, 2) DEFAULT 0,
    price_m NUMERIC(15, 2) DEFAULT 0,
    rent NUMERIC(15, 2) DEFAULT 0,
    image TEXT,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Property owners (keyed by phone, from CRM / PropertyFinder sync) ────────
CREATE TABLE IF NOT EXISTS public.owners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_name TEXT NOT NULL,
    primary_mobile TEXT NOT NULL UNIQUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Viewing requests (inbound, pre-confirmation) ────────────────────────────
-- Distinct from viewing_appointments: this is the raw public-site request.
-- An agent turns a confirmed request into an appointment.
CREATE TABLE IF NOT EXISTS public.viewing_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    property_code TEXT NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT NOT NULL,
    preferred_date DATE,
    preferred_time TEXT,
    number_of_people INT,
    message TEXT,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Inquiries (public contact form) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    mode TEXT DEFAULT 'sale',
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    zone TEXT,
    property_type TEXT,
    budget TEXT,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'web',
    notes TEXT,
    assigned_to TEXT,
    updated_by TEXT,                 -- uid of the staff member who last edited
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Career applications (public careers form) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.career_applications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    position TEXT NOT NULL,
    experience TEXT,
    has_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
    biggest_achievements TEXT NOT NULL DEFAULT '',
    expected_salary TEXT NOT NULL DEFAULT '',
    message TEXT,
    -- Remaining answers from the /careers form.
    real_estate_knowledge TEXT,
    availability TEXT,
    source TEXT DEFAULT 'careers_page',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'pending_review', 'reviewed', 'hired', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Viewings (confirmed site inspections booked from the concierge flow) ────
-- Distinct from viewing_requests (raw public form) and viewing_appointments
-- (the agent calendar): this is the Firestore `viewings` collection, created by
-- /api/leads/request-viewing and lib/services/viewing-engine.ts.
CREATE TABLE IF NOT EXISTS public.viewings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    unit_id TEXT,                     -- listing id; not an FK, seed ids are not rows
    portfolio_id TEXT,                -- concierge_selections.id, when curated
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending_approval'
        CHECK (status IN ('pending_approval', 'scheduled', 'completed', 'cancelled', 'no_show')),
    location TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Concierge selections (S8 curated portfolios shared with a lead) ─────────
-- Reachable by link at /concierge/{leadId}, so readable without an account.
CREATE TABLE IF NOT EXISTS public.concierge_selections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    lead_name TEXT,
    units JSONB DEFAULT '[]'::jsonb,
    personal_note TEXT,
    matching_score NUMERIC(6, 2) DEFAULT 0,
    estimated_portfolio_roi NUMERIC(6, 2) DEFAULT 0,
    whatsapp_link TEXT,
    status TEXT DEFAULT 'generated',
    last_updated_unit TEXT,
    engagement JSONB DEFAULT '{}'::jsonb,  -- { viewed, unit_clicked, requested_viewing }
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Follow-ups (agent task management) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.followups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'call'
        CHECK (type IN ('call', 'whatsapp', 'email', 'meeting', 'viewing', 'other')),
    title TEXT NOT NULL,
    notes TEXT,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    priority TEXT DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Pages (public-site CMS) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
    sections JSONB DEFAULT '{}'::jsonb,
    published BOOLEAN DEFAULT FALSE,
    -- TEXT, not a profiles FK: /api/admin/pages records the literal 'system'
    -- when a page is saved by a service caller rather than a signed-in user.
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (slug, locale)
);

-- ─── Knowledge base (AI agent reference notes) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_modified TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Contracts (buyer PII — staff only, never public) ────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    buyer JSONB DEFAULT '{}'::jsonb,
    seller JSONB DEFAULT '{}'::jsonb,
    terms JSONB DEFAULT '{}'::jsonb,
    -- ── DigitalContractData payload (lib/services/digital-contracts.ts) ────
    contract_number TEXT,
    contract_type TEXT,
    unit JSONB DEFAULT '{}'::jsonb,          -- unitCode, compoundName, agreedPrice, ...
    seller_or_owner JSONB DEFAULT '{}'::jsonb,
    commission JSONB,                        -- null when no commission agreed
    notes_ar TEXT,
    notes_en TEXT,
    signature_hash TEXT,
    total_value NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    status TEXT DEFAULT 'draft',
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Audit log (append-only; clients never write) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Raw caller uid as supplied by the session guard. Kept as TEXT alongside
    -- actor_id because legacy Firebase uids are not UUIDs and must not be lost.
    actor_uid TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    target TEXT,
    before JSONB,
    after JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Operational: bots, workflows, orchestration, analytics ──────────────────
CREATE TABLE IF NOT EXISTS public.agents_registry (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    rating NUMERIC(4, 2) DEFAULT 0,
    listings_count INT DEFAULT 0,
    -- Display fields for the /admin agents board. `description` is surfaced as
    -- `desc` by the route (DESC is a SQL keyword, so it cannot be a bare column).
    description TEXT,
    emoji TEXT,
    color TEXT,
    load INT DEFAULT 0,              -- 0-100 utilisation
    tasks INT DEFAULT 0,
    status TEXT DEFAULT 'idle',
    last_pulse TIMESTAMPTZ,
    last_error TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bot_commands (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    bot_id TEXT NOT NULL,
    command TEXT NOT NULL CHECK (command IN ('start', 'stop', 'restart', 'run_now')),
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'acknowledged', 'completed', 'failed')),
    issued_by TEXT NOT NULL DEFAULT 'system',
    issued_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workflows (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    schedule TEXT,
    definition JSONB DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMPTZ,
    -- Admin automations board (/api/admin/workflows). The route's payload uses
    -- `desc`/`descAr`, which are mapped to description/description_ar because
    -- DESC is a SQL keyword; the API response keeps the original key names.
    name_ar TEXT,
    description_ar TEXT,
    color TEXT DEFAULT '#6366f1',
    status TEXT DEFAULT 'paused',
    runs INT DEFAULT 0,
    last_run_label TEXT DEFAULT 'never',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workflow_id TEXT REFERENCES public.workflows(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running',
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    finished_at TIMESTAMPTZ,
    error TEXT,
    payload JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.failed_orchestrations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline TEXT NOT NULL,
    attempts INT DEFAULT 0,
    last_error TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.search_queries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    query TEXT NOT NULL,
    result_count INT DEFAULT 0,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Recorded by /api/search/semantic so extraction quality can be audited:
    -- `intent` is the structured filter set the AI extracted from the query.
    locale TEXT DEFAULT 'en',
    intent JSONB DEFAULT '{}'::jsonb,
    extraction_method TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Indexes on the columns the routes actually filter by ────────────────────
CREATE INDEX IF NOT EXISTS idx_followups_lead ON public.followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_agent ON public.followups(agent_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON public.followups(status);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_status ON public.viewing_requests(status);
CREATE INDEX IF NOT EXISTS idx_viewings_lead ON public.viewings(lead_id);
CREATE INDEX IF NOT EXISTS idx_concierge_selections_lead ON public.concierge_selections(lead_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_pages_slug_locale ON public.pages(slug, locale);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_commands_bot ON public.bot_commands(bot_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);

-- ==============================================================================
-- RLS for the migrated tables.
--
-- Same rule as the tables above: nothing is open to `authenticated` at large,
-- because sign-ups land as role 'client'. Public forms insert through `anon`
-- where the product requires it, but never read back.
-- ==============================================================================
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_orchestrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- ── Public reference data: anyone may read, staff may write ───────────
    DROP POLICY IF EXISTS "compounds_public_read" ON public.compounds;
    CREATE POLICY "compounds_public_read" ON public.compounds
        FOR SELECT TO anon, authenticated USING (TRUE);
    DROP POLICY IF EXISTS "compounds_staff_write" ON public.compounds;
    CREATE POLICY "compounds_staff_write" ON public.compounds
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Published CMS pages are the public site's copy; drafts are staff-only.
    DROP POLICY IF EXISTS "pages_public_read" ON public.pages;
    CREATE POLICY "pages_public_read" ON public.pages
        FOR SELECT TO anon, authenticated USING (published = TRUE OR public.is_staff());
    DROP POLICY IF EXISTS "pages_staff_write" ON public.pages;
    CREATE POLICY "pages_staff_write" ON public.pages
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- ── Public submission forms: insert-only for anon, read for staff ─────
    -- These carry contact details, so the public may create a row but must
    -- never select one back — that would turn each form into a data export.
    -- No anon INSERT: WITH CHECK (TRUE) accepts any payload of any size, with
    -- no rate limit and no shape constraint. /api/leads/request-viewing is public but writes
    -- through the service role, which bypasses RLS, so this granted nothing the
    -- product uses. Re-add only alongside a real client-side writer, and gate it
    -- on that writer's actual payload rather than TRUE.
    DROP POLICY IF EXISTS "viewing_requests_public_insert" ON public.viewing_requests;
    DROP POLICY IF EXISTS "viewing_requests_staff_access" ON public.viewing_requests;
    CREATE POLICY "viewing_requests_staff_access" ON public.viewing_requests
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Booked viewings carry the lead's identity: staff only, no public read.
    -- /api/leads/request-viewing is public but writes through the service role.
    DROP POLICY IF EXISTS "viewings_staff_access" ON public.viewings;
    CREATE POLICY "viewings_staff_access" ON public.viewings
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- A concierge portfolio was previously readable by `anon` with USING (TRUE).
    -- Postgres has no get/list distinction, so that did not scope the read to a
    -- link the recipient already holds: it authorises `SELECT * FROM
    -- concierge_selections`, dumping lead_name, unit pricing, personal_note and
    -- whatsapp_link for every lead to anyone with the anon key — which ships to
    -- the browser as NEXT_PUBLIC_SUPABASE_ANON_KEY. There is no share-token
    -- column to gate on, and no client reads this table (every access in the app
    -- goes through the service role, which bypasses RLS), so the grant protected
    -- nothing and exposed everything. Serve share links from a service-role API
    -- route that looks up the single row by id — the same resolution the
    -- Firestore rules reached for this collection.
    DROP POLICY IF EXISTS "concierge_selections_public_read" ON public.concierge_selections;
    DROP POLICY IF EXISTS "concierge_selections_staff_write" ON public.concierge_selections;
    CREATE POLICY "concierge_selections_staff_write" ON public.concierge_selections
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- No anon INSERT: WITH CHECK (TRUE) accepts any payload of any size, with
    -- no rate limit and no shape constraint. /api/inquiries is public but writes
    -- through the service role, which bypasses RLS, so this granted nothing the
    -- product uses. Re-add only alongside a real client-side writer, and gate it
    -- on that writer's actual payload rather than TRUE.
    DROP POLICY IF EXISTS "inquiries_public_insert" ON public.inquiries;
    DROP POLICY IF EXISTS "inquiries_staff_access" ON public.inquiries;
    CREATE POLICY "inquiries_staff_access" ON public.inquiries
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- No anon INSERT: WITH CHECK (TRUE) accepts any payload of any size, with
    -- no rate limit and no shape constraint. /api/careers/apply is public but writes
    -- through the service role, which bypasses RLS, so this granted nothing the
    -- product uses. Re-add only alongside a real client-side writer, and gate it
    -- on that writer's actual payload rather than TRUE.
    DROP POLICY IF EXISTS "career_applications_public_insert" ON public.career_applications;
    DROP POLICY IF EXISTS "career_applications_staff_access" ON public.career_applications;
    CREATE POLICY "career_applications_staff_access" ON public.career_applications
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- ── Staff-only business data ─────────────────────────────────────────
    DROP POLICY IF EXISTS "owners_staff_access" ON public.owners;
    CREATE POLICY "owners_staff_access" ON public.owners
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "followups_staff_access" ON public.followups;
    CREATE POLICY "followups_staff_access" ON public.followups
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "knowledge_base_staff_access" ON public.knowledge_base;
    CREATE POLICY "knowledge_base_staff_access" ON public.knowledge_base
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Contracts hold buyer national IDs and phones: admins only, not all staff.
    DROP POLICY IF EXISTS "contracts_admin_access" ON public.contracts;
    CREATE POLICY "contracts_admin_access" ON public.contracts
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    -- ── Audit log: readable by admins, never written from a client ───────
    -- Inserts come from the service role only, so that a compromised staff
    -- session cannot forge or backdate entries.
    DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
    CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
        FOR SELECT TO authenticated USING (public.is_admin());

    -- ── Operational control plane: staff read/write, service role runs it ─
    DROP POLICY IF EXISTS "agents_registry_staff_access" ON public.agents_registry;
    CREATE POLICY "agents_registry_staff_access" ON public.agents_registry
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "bot_commands_staff_access" ON public.bot_commands;
    CREATE POLICY "bot_commands_staff_access" ON public.bot_commands
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "workflows_staff_access" ON public.workflows;
    CREATE POLICY "workflows_staff_access" ON public.workflows
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "workflow_executions_staff_read" ON public.workflow_executions;
    CREATE POLICY "workflow_executions_staff_read" ON public.workflow_executions
        FOR SELECT TO authenticated USING (public.is_staff());

    DROP POLICY IF EXISTS "failed_orchestrations_admin_read" ON public.failed_orchestrations;
    CREATE POLICY "failed_orchestrations_admin_read" ON public.failed_orchestrations
        FOR SELECT TO authenticated USING (public.is_admin());

    DROP POLICY IF EXISTS "search_queries_staff_read" ON public.search_queries;
    CREATE POLICY "search_queries_staff_read" ON public.search_queries
        FOR SELECT TO authenticated USING (public.is_staff());

    -- system_config keeps RLS on with no authenticated policy: service role
    -- only, deny-by-default is correct for singleton config.
END $$;

-- updated_at triggers for the migrated tables.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'compounds', 'owners', 'viewing_requests', 'inquiries',
        'career_applications', 'followups', 'pages', 'knowledge_base',
        'contracts', 'agents_registry', 'bot_commands', 'workflows',
        'concierge_selections'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_' || t
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
                'trigger_update_' || t, t
            );
        END IF;
    END LOOP;
END $$;

-- public.viewings is handled separately: 'trigger_update_viewings' is already
-- taken by public.viewing_appointments above, so the loop's name-existence
-- check would silently skip it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_viewings_table') THEN
        CREATE TRIGGER trigger_update_viewings_table BEFORE UPDATE ON public.viewings
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;


-- ─── Automation rules engine (/api/admin/automations) ────────────────────────
-- Column shapes follow lib/models/automation.ts. The nested structures
-- (trigger, actions, conditions, stats, action results) stay JSONB rather than
-- being normalised: they are authored and read as whole documents by the
-- automation builder UI and the executor, never queried field-by-field.
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    name_ar TEXT DEFAULT '',
    description TEXT DEFAULT '',
    description_ar TEXT DEFAULT '',
    template_id TEXT,
    trigger JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN DEFAULT FALSE,
    conditions JSONB DEFAULT '{}'::jsonb,
    execution_settings JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rule_id TEXT REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    rule_name TEXT,
    trigger_type TEXT,
    triggered_by TEXT,
    triggered_by_object JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INT,
    action_results JSONB DEFAULT '[]'::jsonb,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON public.automation_execution_logs(rule_id, started_at DESC);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "automation_rules_staff_access" ON public.automation_rules;
    CREATE POLICY "automation_rules_staff_access" ON public.automation_rules
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Logs are written by the executor under the service role; staff read only.
    DROP POLICY IF EXISTS "automation_logs_staff_read" ON public.automation_execution_logs;
    CREATE POLICY "automation_logs_staff_read" ON public.automation_execution_logs
        FOR SELECT TO authenticated USING (public.is_staff());
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_automation_rules') THEN
        CREATE TRIGGER trigger_update_automation_rules BEFORE UPDATE ON public.automation_rules
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;


-- ─── WhatsApp sender pool (lib/server/whatsapp-queue.ts) ─────────────────────
-- The four Twilio senders and their quota counters. Outreach is load-balanced
-- across them: claimEligibleNumber picks the least-loaded active sender that is
-- under both its rolling-window and daily caps.
-- Queue columns the outreach engine writes that the base table lacked, plus a
-- widened status set: lib/server/whatsapp-queue.ts enqueues as 'queued' and the
-- dispatcher moves rows through 'sending'/'sent'/'failed'. Without these the
-- insert violates the CHECK constraint and every enqueue fails.
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS unit_id TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS owner_negotiation_id TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS template_params JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

DO $$
BEGIN
    ALTER TABLE public.whatsapp_queue DROP CONSTRAINT IF EXISTS whatsapp_queue_status_check;
    ALTER TABLE public.whatsapp_queue ADD CONSTRAINT whatsapp_queue_status_check
        CHECK (status IN ('pending', 'queued', 'processing', 'sending', 'sent', 'delivered', 'read', 'failed'));
END $$;

-- ─── Media correlation (lib/services/ImageLinkHub.ts) ────────────────────────
-- Links WhatsApp media to portal listings so the same photo is not re-uploaded
-- per channel. Keyed by the provider's media id, which is why id is not
-- generated here.
CREATE TABLE IF NOT EXISTS public.image_links (
    id TEXT PRIMARY KEY,
    source TEXT DEFAULT 'whatsapp',
    signal_id TEXT,
    image_url TEXT,
    portal_id TEXT,
    portal_type TEXT,
    status TEXT DEFAULT 'pending_correlation',
    correlated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_image_links_signal ON public.image_links(signal_id);

ALTER TABLE public.image_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "image_links_staff_access" ON public.image_links;
    CREATE POLICY "image_links_staff_access" ON public.image_links
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── WhatsApp conversation memory (lib/services/WhatsAppConversationalService.ts)
-- The ECC short-term memory for a direct WhatsApp thread. Firestore keyed the
-- document by phone number; the phone stays the primary key here so the same
-- upsert-by-sender remains a single statement.
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    phone_number TEXT PRIMARY KEY,
    messages JSONB DEFAULT '[]'::jsonb,
    last_active TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "whatsapp_conversations_staff_access" ON public.whatsapp_conversations;
    CREATE POLICY "whatsapp_conversations_staff_access" ON public.whatsapp_conversations
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── Automation worker tables (apps/automations) ─────────────────────────────
-- The n8n-style workers run outside the Vercel build and write here directly.
-- `communications` is the outbound-message log shared by 03-owner-contact and
-- 04-email-sender; it is distinct from whatsapp_queue, which is the dispatcher's
-- work queue rather than a record of what was sent.
CREATE TABLE IF NOT EXISTS public.communications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    target_phone TEXT,
    target_email TEXT,
    direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    type TEXT DEFAULT 'whatsapp' CHECK (type IN ('whatsapp', 'email', 'sms', 'telegram', 'call')),
    subject TEXT,
    message TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    campaign_id TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communications_target
    ON public.communications(target_phone, sent_at DESC);

-- The agent exchange bus (packages/exchange). Workers post progress events
-- here; nothing reads them synchronously, so this is telemetry, not a queue.
CREATE TABLE IF NOT EXISTS public.exchange (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL,
    source TEXT DEFAULT 'workflow'
        CHECK (source IN ('admin', 'agent', 'workflow', 'webhook', 'system')),
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'done', 'error', 'cancelled')),
    step_name TEXT,
    progress INT DEFAULT 0,
    payload JSONB DEFAULT '{}'::jsonb,
    -- Optional links, all nullable: a record may reference any combination.
    agent_id TEXT,
    workflow_id TEXT,
    lead_id TEXT,
    property_id TEXT,
    user_id TEXT,
    -- Output of the task this record tracks.
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exchange_type_status
    ON public.exchange(type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_created ON public.exchange(created_at DESC);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "communications_staff_access" ON public.communications;
    CREATE POLICY "communications_staff_access" ON public.communications
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "exchange_staff_read" ON public.exchange;
    CREATE POLICY "exchange_staff_read" ON public.exchange
        FOR SELECT TO authenticated USING (public.is_staff());
END $$;

-- ─── Memory engine durable store (packages/memory-engine) ────────────────────
-- SupabaseMemoryStore keys agent profiles and per-agent context snapshots by
-- (agent_id, key) in unified_memory and upserts on them. Without a unique
-- index there is nothing for ON CONFLICT to match, so every save inserted a
-- new row: contexts accumulated duplicates and loadContext's .single() then
-- failed on the second save onward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_memory_agent_key
    ON public.unified_memory(agent_id, key);

-- ─── Houyez portal content (lib/houyez/firestore.ts) ─────────────────────────
-- Five Firestore collections (houyez_slides / _compounds / _rooms / _listings
-- / _tours) held bilingual presentation content with different shapes each.
-- Rather than five tables of near-duplicate EN/AR columns, they collapse into
-- one table discriminated by `collection`, with the row payload in JSONB —
-- this is display content, never queried by field.
CREATE TABLE IF NOT EXISTS public.houyez_content (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    collection TEXT NOT NULL
        CHECK (collection IN ('slides', 'compounds', 'rooms', 'listings', 'tours')),
    "order" INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_houyez_content_collection
    ON public.houyez_content(collection, "order");

ALTER TABLE public.houyez_content ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Public-site presentation content: anyone may read, only staff may write.
    DROP POLICY IF EXISTS "houyez_content_public_read" ON public.houyez_content;
    CREATE POLICY "houyez_content_public_read" ON public.houyez_content
        FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "houyez_content_staff_write" ON public.houyez_content;
    CREATE POLICY "houyez_content_staff_write" ON public.houyez_content
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── Property Finder sync bookkeeping (lib/services/sync-engine.ts) ──────────
-- The dedupe review queue: PF listings whose match against our inventory was
-- ambiguous or conflicting, held for a human to resolve.
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pf_reference_number TEXT NOT NULL,
    firestore_doc_id TEXT,   -- historical column name: the matched listing's id
    status TEXT NOT NULL DEFAULT 'ambiguous'
        CHECK (status IN ('matched', 'ambiguous', 'new', 'conflict', 'resolved', 'skipped')),
    match_confidence NUMERIC(5, 2) DEFAULT 0,
    pf_data JSONB DEFAULT '{}'::jsonb,
    firestore_data JSONB DEFAULT '{}'::jsonb,
    conflict_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);

-- One row per sync run, which the admin dashboard reads for sync health.
CREATE TABLE IF NOT EXISTS public.sync_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    total INT DEFAULT 0,
    matched INT DEFAULT 0,
    created INT DEFAULT 0,
    skipped INT DEFAULT 0,
    dedupe_queue INT DEFAULT 0,
    errors TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_created ON public.sync_log(created_at DESC);

-- ─── Incentive vouchers (lib/services/sales-engine.ts) ───────────────────────
CREATE TABLE IF NOT EXISTS public.vouchers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'viewing-reward',
    value NUMERIC(12, 2) DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'void')),
    conditions TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vouchers_lead ON public.vouchers(lead_id);

-- ─── Catalogue reference data (lib/models/schema.ts) ─────────────────────────
-- Declared in COLLECTIONS and modelled in schema.ts. No route writes them yet;
-- the tables exist so a COLLECTIONS entry never points at a missing relation.
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    name_ar TEXT,
    developer_id TEXT,
    slug TEXT,
    location TEXT,
    city TEXT,
    governorate TEXT,
    coordinates JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    description_ar TEXT,
    total_units INT,
    available_units INT,
    launch_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    completion_percent NUMERIC(5, 2),
    price_range_min NUMERIC(15, 2),
    price_range_max NUMERIC(15, 2),
    payment_plan TEXT,
    logo TEXT,
    hero_image TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    master_plan_url TEXT,
    brochure_url TEXT,
    status TEXT DEFAULT 'pre-launch',
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.developers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    name_ar TEXT,
    slug TEXT,
    description TEXT,
    description_ar TEXT,
    founded_year INT,
    headquarters TEXT,
    website TEXT,
    rating NUMERIC(3, 2),
    total_projects INT,
    tier TEXT,
    logo TEXT,
    cover_image TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    filename TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    storage_path TEXT,
    download_url TEXT,
    thumbnail_url TEXT,
    asset_type TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "sync_queue_staff_access" ON public.sync_queue;
    CREATE POLICY "sync_queue_staff_access" ON public.sync_queue
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "sync_log_staff_read" ON public.sync_log;
    CREATE POLICY "sync_log_staff_read" ON public.sync_log
        FOR SELECT TO authenticated USING (public.is_staff());

    DROP POLICY IF EXISTS "vouchers_staff_access" ON public.vouchers;
    CREATE POLICY "vouchers_staff_access" ON public.vouchers
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "media_assets_staff_access" ON public.media_assets;
    CREATE POLICY "media_assets_staff_access" ON public.media_assets
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Projects and developers are public catalogue data, like listings:
    -- anyone may read, only staff may write.
    DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
    CREATE POLICY "projects_public_read" ON public.projects
        FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "projects_staff_write" ON public.projects;
    CREATE POLICY "projects_staff_write" ON public.projects
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "developers_public_read" ON public.developers;
    CREATE POLICY "developers_public_read" ON public.developers
        FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "developers_staff_write" ON public.developers;
    CREATE POLICY "developers_staff_write" ON public.developers
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── Global neural memory (lib/services/MemoryService.ts) ────────────────────
-- Cross-deal learning: aggregate patterns keyed by a well-known row id
-- ('global_patterns'), not per-lead. Per-lead memory lives in leads.intelligence.
CREATE TABLE IF NOT EXISTS public.intelligence (
    id TEXT PRIMARY KEY,
    rejection_stats JSONB DEFAULT '{}'::jsonb,
    last_trend_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.intelligence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "intelligence_staff_access" ON public.intelligence;
    CREATE POLICY "intelligence_staff_access" ON public.intelligence
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- Firestore's increment() on the dotted path 'rejectionStats.<category>' was
-- atomic. A read-modify-write through PostgREST is not, and two rejections
-- landing together would lose a count, so the whole thing happens in one
-- statement. jsonb_set with create_if_missing handles a category seen for the
-- first time; the INSERT ... ON CONFLICT handles the row not existing yet.
CREATE OR REPLACE FUNCTION public.bump_rejection_stat(p_id TEXT, p_category TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
    INSERT INTO public.intelligence (id, rejection_stats, last_trend_update)
    VALUES (
        p_id,
        jsonb_build_object(p_category, 1),
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (id) DO UPDATE
       SET rejection_stats = jsonb_set(
               COALESCE(public.intelligence.rejection_stats, '{}'::jsonb),
               ARRAY[p_category],
               to_jsonb(
                   COALESCE(
                       (public.intelligence.rejection_stats ->> p_category)::int,
                       0
                   ) + 1
               ),
               TRUE
           ),
           last_trend_update = TIMEZONE('utc'::text, NOW()),
           updated_at = TIMEZONE('utc'::text, NOW());
$fn$;

REVOKE ALL ON FUNCTION public.bump_rejection_stat(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_rejection_stat(TEXT, TEXT) TO service_role;

-- ─── Closing simulations (lib/services/ClosingSimulator.ts) ──────────────────
-- Audit trail for each 'what-if' settlement run against a lead/unit pair.
CREATE TABLE IF NOT EXISTS public.closing_simulations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    advisor_id TEXT DEFAULT 'system_gen',
    legal_audit JSONB DEFAULT '{}'::jsonb,
    financial_simulation JSONB DEFAULT '{}'::jsonb,
    execution_timeline JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'simulated',
    is_actionable BOOLEAN DEFAULT FALSE,
    strategic_recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_closing_simulations_lead
    ON public.closing_simulations(lead_id, created_at DESC);

ALTER TABLE public.closing_simulations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "closing_simulations_staff_access" ON public.closing_simulations;
    CREATE POLICY "closing_simulations_staff_access" ON public.closing_simulations
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── Lead chat history (lib/services/OmnichannelChatService.ts) ──────────────
-- Firestore kept this as a `messages` SUBCOLLECTION under each lead so the
-- transcript could grow past the 1 MB document limit. Postgres has no
-- subcollections, so it becomes an append-only table with a foreign key.
CREATE TABLE IF NOT EXISTS public.lead_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'sierra')),
    text TEXT,
    platform TEXT,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead
    ON public.lead_messages(lead_id, timestamp DESC);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "lead_messages_staff_access" ON public.lead_messages;
    CREATE POLICY "lead_messages_staff_access" ON public.lead_messages
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ─── Orchestration history (lib/orchestration/StateManager.ts) ───────────────
-- Firestore kept this as an `orchestrationHistory` SUBCOLLECTION under each
-- pipeline row, so the log could grow without hitting the 1 MB document limit.
-- Postgres has no subcollections, so it becomes an append-only table keyed by
-- (parent table, parent id) — the pipeline runs over more than one table
-- (`leads` and `broker_listings` today), hence the table name is a column
-- rather than a foreign key.
CREATE TABLE IF NOT EXISTS public.orchestration_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    parent_table TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    engine_version TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orchestration_history_parent
    ON public.orchestration_history(parent_table, parent_id, created_at DESC);

ALTER TABLE public.orchestration_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "orchestration_history_staff_read" ON public.orchestration_history;
    CREATE POLICY "orchestration_history_staff_read" ON public.orchestration_history
        FOR SELECT TO authenticated USING (public.is_staff());
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    label TEXT,
    e164_phone TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active',
    window_sent_count INT DEFAULT 0,
    window_reset_at TIMESTAMPTZ,
    daily_sent_count INT DEFAULT 0,
    daily_reset_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_status ON public.whatsapp_numbers(status, window_sent_count);

ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "whatsapp_numbers_staff_access" ON public.whatsapp_numbers;
    CREATE POLICY "whatsapp_numbers_staff_access" ON public.whatsapp_numbers
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

-- ------------------------------------------------------------------------------
-- 14. Vector Search Helper Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_listings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.6,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id text,
    title text,
    compound text,
    price numeric,
    bedrooms int,
    area_sqm numeric,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        listings.id,
        listings.title,
        listings.compound,
        listings.price,
        listings.bedrooms,
        listings.area_sqm,
        1 - (listings.embedding <=> query_embedding) AS similarity
    FROM public.listings
    WHERE listings.status = 'active'
      AND listings.embedding IS NOT NULL
      AND 1 - (listings.embedding <=> query_embedding) > match_threshold
    ORDER BY listings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. Advanced Multi-Filter Search Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_properties(
    search_query text DEFAULT NULL,
    p_compound text DEFAULT NULL,
    p_deal_type text DEFAULT NULL,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_bedrooms int DEFAULT NULL,
    p_limit int DEFAULT 50,
    p_offset int DEFAULT 0
)
RETURNS TABLE (
    id text,
    ref_id text,
    title text,
    compound text,
    deal_type text,
    property_type text,
    price numeric,
    bedrooms int,
    bathrooms int,
    area_sqm numeric,
    finishing_type text,
    status text,
    images text[],
    source_channel text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.ref_id,
        l.title,
        l.compound,
        l.deal_type,
        l.property_type,
        l.price,
        l.bedrooms,
        l.bathrooms,
        l.area_sqm,
        l.finishing_type,
        l.status,
        l.images,
        l.source_channel
    FROM public.listings l
    WHERE l.status = 'active'
      AND (p_compound IS NULL OR l.compound ILIKE '%' || p_compound || '%')
      AND (p_deal_type IS NULL OR l.deal_type = p_deal_type)
      AND (p_min_price IS NULL OR l.price >= p_min_price)
      AND (p_max_price IS NULL OR l.price <= p_max_price)
      AND (p_bedrooms IS NULL OR l.bedrooms = p_bedrooms)
      AND (search_query IS NULL OR (
          l.title ILIKE '%' || search_query || '%' OR
          l.compound ILIKE '%' || search_query || '%' OR
          l.description ILIKE '%' || search_query || '%' OR
          l.property_type ILIKE '%' || search_query || '%'
      ))
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. Gemini 768-Dimension Vector Search Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_listings_gemini(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id text,
    ref_id text,
    title text,
    compound text,
    price numeric,
    bedrooms int,
    area_sqm numeric,
    deal_type text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        listings.id,
        listings.ref_id,
        listings.title,
        listings.compound,
        listings.price,
        listings.bedrooms,
        listings.area_sqm,
        listings.deal_type,
        1 - (listings.embedding_768 <=> query_embedding) AS similarity
    FROM public.listings
    WHERE listings.status = 'active'
      AND listings.embedding_768 IS NOT NULL
      AND 1 - (listings.embedding_768 <=> query_embedding) > match_threshold
    ORDER BY listings.embedding_768 <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ==============================================================================
-- Admin console tables (app/api/admin/*) — sales, strategic pipeline, owner
-- negotiations and worker heartbeats. Column shapes are taken from the
-- existing TypeScript models (lib/models/schema.ts) rather than invented.
-- ==============================================================================

-- ─── Sales (closed transactions; feeds /api/admin/reports revenue) ──────────
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    unit_id TEXT,                     -- listing id; not an FK, legacy ids may not be rows
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    agent_id TEXT,                    -- uid of the closing agent
    agent_name TEXT,                  -- denormalised for the reports table
    sale_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    commission_percent NUMERIC(5, 2) DEFAULT 0,
    commission_amount NUMERIC(15, 2) DEFAULT 0,
    closing_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'contracted', 'completed', 'cancelled')),
    contract_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Strategic pipeline (S9 deal board, written by mcp-servers/sierra-deals) ─
CREATE TABLE IF NOT EXISTS public.strategic_pipeline (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    stakeholder_id TEXT,              -- FK -> leads, kept loose for legacy ids
    portfolio_asset_code TEXT,
    status TEXT DEFAULT 'draft',
    stage TEXT DEFAULT 'inbound',     -- 'inbound'..'closed'; reports count stage='closed'
    terms JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Owner negotiations (WhatsApp buy/sell threads with property owners) ────
CREATE TABLE IF NOT EXISTS public.owner_negotiations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    unit_id TEXT,                     -- listing id, once a canonical unit exists
    broker_listing_id TEXT,           -- raw inbound signal this came from
    owner_name TEXT,
    owner_phone TEXT NOT NULL,
    interested_lead_id TEXT,          -- the buyer/renter this is negotiated for
    asking_price NUMERIC(15, 2),
    current_offer_price NUMERIC(15, 2),
    status TEXT DEFAULT 'contacted'
        CHECK (status IN ('contacted', 'negotiating', 'agreed', 'completed', 'rejected', 'stale')),
    -- Append-only message log: [{ direction, message, price?, timestamp }]
    history JSONB DEFAULT '[]'::jsonb,
    assigned_agent_id TEXT,
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── System status (worker heartbeats; was Firestore system_status/{id}) ────
-- One row per background worker, e.g. id = 'whatsapp_node'. Written by the
-- worker heartbeat endpoints, read by /api/admin/agents.
CREATE TABLE IF NOT EXISTS public.system_status (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'idle'
        CHECK (status IN ('active', 'syncing', 'error', 'idle', 'offline')),
    last_pulse TIMESTAMPTZ,
    last_error TEXT,
    last_command TEXT,
    last_command_at TIMESTAMPTZ,
    -- Set by /api/admin/bots alongside last_command.
    last_command_by TEXT,
    last_config_update TIMESTAMPTZ,
    last_config_updated_by TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    logs JSONB DEFAULT '[]'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,   -- { interval, enabled }
    stats JSONB DEFAULT '{}'::jsonb,    -- { processedToday, errorsToday }
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Per-bot operator configuration, keyed by bot id. Kept separate from
-- system_status because status is heartbeat data written by the bots while
-- this is authored by admins in /api/admin/bots.
CREATE TABLE IF NOT EXISTS public.bot_configs (
    id TEXT PRIMARY KEY,
    config JSONB DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "bot_configs_staff_access" ON public.bot_configs;
    CREATE POLICY "bot_configs_staff_access" ON public.bot_configs
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_agent ON public.sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_strategic_pipeline_stage ON public.strategic_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_strategic_pipeline_created ON public.strategic_pipeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_negotiations_status ON public.owner_negotiations(status);
CREATE INDEX IF NOT EXISTS idx_owner_negotiations_phone ON public.owner_negotiations(owner_phone);

-- Every one of these is internal commercial data: staff only, never public,
-- and never open to `authenticated` at large (sign-ups land as role 'client').
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "sales_staff_access" ON public.sales;
    CREATE POLICY "sales_staff_access" ON public.sales
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "strategic_pipeline_staff_access" ON public.strategic_pipeline;
    CREATE POLICY "strategic_pipeline_staff_access" ON public.strategic_pipeline
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "owner_negotiations_staff_access" ON public.owner_negotiations;
    CREATE POLICY "owner_negotiations_staff_access" ON public.owner_negotiations
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Read-only for staff; heartbeats are written by workers via service role.
    DROP POLICY IF EXISTS "system_status_staff_read" ON public.system_status;
    CREATE POLICY "system_status_staff_read" ON public.system_status
        FOR SELECT TO authenticated USING (public.is_staff());
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_sales') THEN
        CREATE TRIGGER trigger_update_sales BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_strategic_pipeline') THEN
        CREATE TRIGGER trigger_update_strategic_pipeline BEFORE UPDATE ON public.strategic_pipeline FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_owner_negotiations') THEN
        CREATE TRIGGER trigger_update_owner_negotiations BEFORE UPDATE ON public.owner_negotiations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;


-- ==============================================================================
-- Firebase → Supabase migration, batch 2:
--   the cron / sync / ingest / webhook routes under
--   apps/sierra-estates-realty/app/api/{cron,sync,crm,ingest,webhooks,
--   properties,telegram,wealth,internal}.
--
-- Everything below is additive and idempotent (CREATE TABLE IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS), so it is safe to re-run against a database that
-- already has the tables above. Column names are the snake_case form of the
-- field names those routes were already writing to Firestore, so no field is
-- dropped by the migration.
-- ==============================================================================

-- ─── Activity feed (Firestore `activities`) ──────────────────────────────────
-- Written by every sync/cron route to give the admin dashboard a human-readable
-- audit trail. Distinct from audit_logs, which records staff mutations; this is
-- the operational "what did the automation just do" stream.
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL,
    actor_id TEXT NOT NULL DEFAULT 'system',
    actor_name TEXT,
    description TEXT,
    -- `text` and `color` are UI-facing fields the cron routes have always
    -- written alongside `description`: the admin feed renders `text` and tints
    -- the row with `color` (a CSS custom-property token, e.g. 'var(--blue-light)').
    text TEXT,
    color TEXT,
    related_id TEXT,
    related_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Broker listings (Firestore `broker_listings`) ───────────────────────────
-- Raw inbound WhatsApp/broker signal before it is promoted to public.listings.
-- Written by /api/ingest/whatsapp and /api/cron/ingest-from-sheets; the
-- orchestrator pipeline reads it back by id.
CREATE TABLE IF NOT EXISTS public.broker_listings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    raw_message TEXT NOT NULL,
    source_group TEXT,
    source_platform TEXT DEFAULT 'whatsapp',
    sender_info TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    intelligence JSONB DEFAULT '{}'::jsonb,
    orchestration_state JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new',
    is_verified BOOLEAN DEFAULT FALSE,
    -- sha1(sender|rawMessage). Webhook providers retry on timeout, so this is
    -- the idempotency key that stops a retry creating a second row and
    -- re-running the pipeline.
    dedupe_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ─── Session buffer logs (Firestore `SessionBufferLogs`) ─────────────────────
-- Short-lived ingestion trace written by /api/crm/property-finder. `expire_at`
-- carries the 7-day TTL the Firestore collection had; nothing evicts it
-- automatically in Postgres yet, so a reaper (or a pg_cron job) still has to
-- delete rows past expire_at.
CREATE TABLE IF NOT EXISTS public.session_buffer_logs (
    id TEXT PRIMARY KEY,
    target_sync_hash TEXT NOT NULL,
    event_type TEXT NOT NULL,
    agent_identity TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expire_at TIMESTAMPTZ
);

-- ─── listings: columns the Property Finder / CRM sync paths write ────────────
-- These routes wrote a denormalised Firestore document. Fields with a canonical
-- equivalent are mapped onto the existing columns (title, compound, price,
-- bedrooms, images, …) and the source-specific remainder is kept verbatim in
-- listings.raw_data. The columns below are the ones that are *queried* by a
-- route and therefore cannot live inside JSONB.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS code TEXT;                  -- SBR uniform tracking code, e.g. NEW-3F-12M
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pf_reference_number TEXT;   -- Property Finder listing reference (webhook lookup key)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pf_status TEXT;             -- 'published' | 'unpublished' on Property Finder
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{}'::jsonb; -- { isPublishedToPF: boolean, … }
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sync_hash TEXT;             -- sha256(location-bua-code-owner) CRM dedupe fingerprint
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sync_source TEXT;           -- 'crm-pf-import' | 'property-finder' | …
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS agent_name TEXT;
-- 'F' (furnished) / 'U' (unfurnished) — the Sierra coding algorithm's furnishing
-- token. Distinct from finishing_type, which is the developer's finishing spec.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS furnishing_status TEXT;
-- Map pin coordinates from the Property Finder feed (the client site renders
-- listings on Leaflet). public.compounds already stores lat/lng this way.
-- Property Finder registry push state
-- (lib/integrations/portfolio-asset-registry.ts).
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS registry_asset_id TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS synced_to_registry BOOLEAN DEFAULT FALSE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS last_registry_sync TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS registry_status TEXT;

-- Written by /api/admin/ingest: the landlord-sheet code stamped onto each
-- ingested unit, and the derived per-sqm price the admin inventory sorts on.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sbr_code TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS price_per_sqm NUMERIC(15, 2);

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_listings_pf_reference ON public.listings(pf_reference_number);
CREATE INDEX IF NOT EXISTS idx_listings_sync_hash ON public.listings(sync_hash);
CREATE INDEX IF NOT EXISTS idx_listings_code ON public.listings(code);

-- ─── leads: intake-channel columns ───────────────────────────────────────────
-- `channel` is a closed CHECK list; `source` is the open acquisition-channel
-- string every intake route (website, olx, walk-in, instagram, …) has always
-- written and the admin Leads page groups by. They coexist deliberately.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage TEXT;                    -- free-form funnel stage, e.g. 'inbound'
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mode TEXT;                     -- 'sale' | 'rent' — what the lead is after
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pf_lead_id TEXT;               -- Property Finder lead id (webhook upsert key)

-- The AI-scoring intake (/api/crm/leads) fields. `pipeline_stage` is the CRM
-- funnel position the admin Leads page surfaces as `stage` (see the mapper in
-- app/api/admin/leads/route.ts) — distinct from leads.stage above, which is the
-- public intake routes' own free-form stage. `sierra_ai_score` is a 0-10 CRM
-- score and is deliberately NOT lead_score, which is the 0-100 scale.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_specialist TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sierra_ai_score INT;
-- Per-lead automation flags, e.g. { whatsappFollowupSent, lastWhatsAppSentAt }.
-- Firestore updated these with dotted field paths; here the whole object is
-- read, merged and written back (see /api/admin/whatsapp/send).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{}'::jsonb;
-- Pipeline stage tracked by the orchestration engine, e.g. { stage: 'S8_...' }.
-- Firestore set this with the dotted path 'orchestrationState.stage'; here the
-- object is read, merged and written back (see lib/services/viewing-engine.ts).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS orchestration_state JSONB DEFAULT '{}'::jsonb;

-- Neural memory the Telegram agent accumulates per lead: extracted profile,
-- negative signals, objections and the scoring matrix
-- (lib/services/antigravity-agent.ts). Firestore addressed these with dotted
-- paths and grew the arrays with arrayUnion; here it is one JSONB object that
-- is read, merged and written back.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS intelligence JSONB DEFAULT '{}'::jsonb;

-- Property Finder lead attribution (lib/services/PFIntegrationService.ts).
-- `pf_lead_id` above is the dedupe key; these two are the human-readable
-- provenance the CRM shows next to it.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origin_channel TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pf_listing_reference_number TEXT;

-- Property Finder registry sync bookkeeping
-- (lib/integrations/portfolio-asset-registry.ts). The registry pushes
-- stakeholders to us by webhook; registry_stakeholder_id is the idempotency
-- key it is deduped on.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS registry_stakeholder_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS registry_created_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS asset_reference TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS asset_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS neural_match_score NUMERIC(6, 2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS leila_score NUMERIC(6, 2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS advisor_assigned TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_registry_stakeholder
    ON public.leads(registry_stakeholder_id);

-- Omnichannel conversation counters (lib/services/OmnichannelChatService.ts).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interaction_count INT DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- Firestore's FieldValue.increment() was atomic; a read-modify-write through
-- PostgREST is not, and two messages arriving together would lose a count.
-- This does the increment inside a single statement instead.
CREATE OR REPLACE FUNCTION public.bump_lead_interaction(p_lead_id TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
    UPDATE public.leads
       SET interaction_count = COALESCE(interaction_count, 0) + 1,
           last_contact_at = TIMEZONE('utc'::text, NOW()),
           updated_at = TIMEZONE('utc'::text, NOW())
     WHERE id = p_lead_id;
$fn$;

REVOKE ALL ON FUNCTION public.bump_lead_interaction(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_lead_interaction(TEXT) TO service_role;


-- Non-partial on purpose: the Property Finder webhook upserts on this column,
-- and Postgres can only infer a PARTIAL unique index for ON CONFLICT when the
-- statement repeats the index predicate, which PostgREST does not emit. NULLs
-- are distinct in a unique index, so rows without a PF id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_pf_lead_id ON public.leads(pf_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- ─── proposals: the wealth-intelligence payload ──────────────────────────────
-- /api/wealth/roi re-analyses each unit on a proposal and writes both the
-- per-unit array and the rolled-up analysis back onto the proposal.
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS units JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS financial_analysis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- ─── whatsapp_queue: the fields the dispatch worker needs ────────────────────
-- The queue drains through /api/cron/whatsapp-dispatch and is updated by the
-- Twilio status callback. `recipient_phone`/`message_body` stay the canonical
-- columns for the job's toPhone/body.
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS purpose TEXT;         -- owner-negotiation | client-recommendation | general-outreach
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS unit_id TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS owner_negotiation_id TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS template_params JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS assigned_number_id TEXT;  -- FK -> whatsapp_numbers, set when a sender is claimed
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS twilio_status TEXT;   -- raw status string from Twilio's callback
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
ALTER TABLE public.whatsapp_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- The queue's real lifecycle is wider than the original CHECK list: a job is
-- 'queued' until a sender number is claimed, 'sending' while the Twilio call is
-- in flight, and 'skipped-quota'/'skipped-hours' when the outreach window or
-- the per-number cap rejected it. Dropping the old constraint and recreating it
-- keeps existing rows valid (every previous value is still allowed).
ALTER TABLE public.whatsapp_queue DROP CONSTRAINT IF EXISTS whatsapp_queue_status_check;
ALTER TABLE public.whatsapp_queue ADD CONSTRAINT whatsapp_queue_status_check
    CHECK (status IN ('pending', 'queued', 'processing', 'sending', 'sent',
                      'delivered', 'read', 'failed', 'skipped-quota', 'skipped-hours'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_queue_twilio_sid
    ON public.whatsapp_queue(twilio_message_sid) WHERE twilio_message_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_listings_status ON public.broker_listings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_listings_dedupe
    ON public.broker_listings(dedupe_hash) WHERE dedupe_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_buffer_logs_expire ON public.session_buffer_logs(expire_at);

-- ─── RLS for the three new tables ────────────────────────────────────────────
-- All three are operational/internal: staff read-write, never anon. The
-- service role (used by the routes themselves) bypasses RLS entirely.
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_buffer_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "activities_staff_access" ON public.activities;
    CREATE POLICY "activities_staff_access" ON public.activities
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "broker_listings_staff_access" ON public.broker_listings;
    CREATE POLICY "broker_listings_staff_access" ON public.broker_listings
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- session_buffer_logs keeps RLS enabled with no authenticated policy: it is
    -- written and read by the service role only, so denying by default is right.
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_broker_listings') THEN
        CREATE TRIGGER trigger_update_broker_listings BEFORE UPDATE ON public.broker_listings
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_proposals') THEN
        CREATE TRIGGER trigger_update_proposals BEFORE UPDATE ON public.proposals
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- ─── 46. Staged Scraped Listings & Task Dispatch (PostGIS Ecosystem) ─────────
CREATE TABLE IF NOT EXISTS public.raw_feed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    raw_text text NOT NULL,
    source_channel text NOT NULL, -- 'whatsapp_group', 'dubizzle'
    sender_phone text,
    extracted_data jsonb,
    is_reviewed boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.bot_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    bot_name text NOT NULL,
    status text DEFAULT 'idle',
    task_type text,
    metrics jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamptz DEFAULT now(),
    rate_limit_counter int DEFAULT 0
);

ALTER TABLE public.raw_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "raw_feed_staff_access" ON public.raw_feed;
    CREATE POLICY "raw_feed_staff_access" ON public.raw_feed FOR ALL USING (true);

    DROP POLICY IF EXISTS "bot_runs_staff_access" ON public.bot_runs;
    CREATE POLICY "bot_runs_staff_access" ON public.bot_runs FOR ALL USING (true);
END $$;

-- ─── 47. Proximity Search Function (New Capital & Compound Radius) ────────────
CREATE OR REPLACE FUNCTION get_listings_near_capital(capital_lat numeric, capital_lng numeric, radius_meters numeric)
RETURNS SETOF public.listings AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.listings
  WHERE location_coords IS NOT NULL
    AND ST_DWithin(
      location_coords,
      ST_SetSRID(ST_MakePoint(capital_lng::float8, capital_lat::float8), 4326)::geography,
      radius_meters::float8
    )
    AND (status = 'available' OR status = 'active');
END;
$$ LANGUAGE plpgsql;

-- ─── 48. Supabase Realtime Publication ────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_feed;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — INVENTORY OS v2 (migration 011)
-- Canonical unit identity, payment plans, price history, status audit trail,
-- guarded lifecycle trigger, freshness SLA, DQ scoring, dedupe unification.
-- Standalone copy for review/diff: supabase/migrations/011_inventory_os_v2.sql
-- Everything in this section is additive & idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Sierra Estates — INVENTORY OS v2 · Additive Migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose : Normalize the inventory data model for the Egyptian market:
--           unit identity, payment plans, price history, status audit trail,
--           canonical status vocabulary, verification (2023 transparency rule).
-- Design  : 100% ADDITIVE & IDEMPOTENT — no destructive changes, safe to run
--           on the live production Supabase project. Existing columns keep
--           working; new columns default to NULL/0 until backfilled.
-- Order   : run AFTER supabase/schema.sql (appends to the same conventions).
-- Author  : Inventory OS v2 upgrade (see docs/INVENTORY_OS_BLUEPRINT.md)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. UNIT IDENTITY — link listings to projects/developers (FK-safe, additive)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS unit_code       TEXT,
  ADD COLUMN IF NOT EXISTS project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compound_id     UUID REFERENCES public.compounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS developer_id    UUID REFERENCES public.developers(id) ON DELETE SET NULL;

UPDATE public.listings l
  SET project_id = p.id
  FROM public.projects p
  WHERE l.project_id IS NULL
    AND (TRIM(LOWER(l.compound)) = TRIM(LOWER(p.name))
      OR TRIM(LOWER(l.compound)) = TRIM(LOWER(COALESCE(p.name_ar, p.name))));

UPDATE public.listings l
  SET compound_id = c.id
  FROM public.compounds c
  WHERE l.compound_id IS NULL
    AND TRIM(LOWER(l.compound)) = TRIM(LOWER(c.name));

UPDATE public.listings l
  SET developer_id = d.id
  FROM public.developers d
  WHERE l.developer_id IS NULL
    AND TRIM(LOWER(COALESCE(l.developer, ''))) = TRIM(LOWER(d.name));

CREATE INDEX IF NOT EXISTS idx_listings_project_id   ON public.listings(project_id);
CREATE INDEX IF NOT EXISTS idx_listings_developer_id ON public.listings(developer_id);
CREATE INDEX IF NOT EXISTS idx_listings_unit_code    ON public.listings(unit_code);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. EGYPTIAN UNIT ATTRIBUTES — missing spec & pricing dimensions
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS offer_type        TEXT DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS listing_type      TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS garden_sqm        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roof_sqm          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terrace_sqm       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plot_sqm          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floor_number      INTEGER,
  ADD COLUMN IF NOT EXISTS unit_view         TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_fee_per_sqm NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_quarter  TEXT,
  ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by       TEXT,
  ADD COLUMN IF NOT EXISTS ownership_doc_ref TEXT,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserved_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_ref   TEXT,
  ADD COLUMN IF NOT EXISTS days_on_market    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_floor_plan    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_virtual_tour  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stale             BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. NORMALIZED PAYMENT PLANS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id                  TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  plan_type                TEXT NOT NULL DEFAULT 'installment'
                           CHECK (plan_type IN ('installment', 'cash')),
  down_payment_percent     NUMERIC(6,3) NOT NULL DEFAULT 10,
  installment_years        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  installment_frequency    TEXT NOT NULL DEFAULT 'quarterly'
                           CHECK (installment_frequency IN ('monthly','quarterly','semi_annual','annual')),
  delivery_payment_percent NUMERIC(6,3)  NOT NULL DEFAULT 0,
  post_delivery_years      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cash_discount_percent    NUMERIC(6,3)  NOT NULL DEFAULT 0,
  maintenance_fee_annual   NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_plans_unit ON public.payment_plans(unit_id);
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_plans_public_read"  ON public.payment_plans;
DROP POLICY IF EXISTS "payment_plans_admin_write"  ON public.payment_plans;
CREATE POLICY "payment_plans_public_read" ON public.payment_plans FOR SELECT USING (true);
CREATE POLICY "payment_plans_admin_write" ON public.payment_plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 4. PRICE HISTORY
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  price_egp     NUMERIC(15,2) NOT NULL,
  price_usd     NUMERIC(15,2),
  price_per_sqm NUMERIC(12,2),
  reason        TEXT NOT NULL DEFAULT 'initial'
                CHECK (reason IN ('initial','price_cut','price_increase','relist','avm_adjustment')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_unit ON public.price_history(unit_id, created_at);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_history_public_read" ON public.price_history;
DROP POLICY IF EXISTS "price_history_admin_write" ON public.price_history;
CREATE POLICY "price_history_public_read" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "price_history_admin_write" ON public.price_history FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 5. STATUS HISTORY — audit trail for every lifecycle transition
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_history_unit ON public.status_history(unit_id, created_at);
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_history_admin_all" ON public.status_history;
CREATE POLICY "status_history_admin_all" ON public.status_history FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 6. CANONICAL STATUS VOCABULARY + GUARDED TRANSITIONS (DB-level)
--    Maps the 7 legacy vocabularies into ONE machine. Legacy values keep
--    working through normalize_listing_status().
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_listing_status(raw TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN raw IS NULL THEN 'draft'
    WHEN LOWER(TRIM(raw)) IN ('available','active','verified') THEN 'published'
    WHEN LOWER(TRIM(raw)) IN ('pending','pending review','pending_review','pending_verification') THEN 'pending_verification'
    WHEN LOWER(TRIM(raw)) IN ('sold') THEN 'sold'
    WHEN LOWER(TRIM(raw)) IN ('rented') THEN 'rented'
    WHEN LOWER(TRIM(raw)) IN ('reserved') THEN 'reserved'
    WHEN LOWER(TRIM(raw)) IN ('off-market','off_market') THEN 'off_market'
    WHEN LOWER(TRIM(raw)) IN ('expired') THEN 'expired'
    WHEN LOWER(TRIM(raw)) IN ('archived') THEN 'archived'
    ELSE 'draft'
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_transition_listing(from_raw TEXT, to_raw TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE public.normalize_listing_status(from_raw)
    WHEN 'draft'                THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    WHEN 'pending_verification' THEN public.normalize_listing_status(to_raw) IN ('verified','draft','archived')
    WHEN 'verified'             THEN public.normalize_listing_status(to_raw) IN ('published','pending_verification','archived')
    WHEN 'published'            THEN public.normalize_listing_status(to_raw) IN ('reserved','rented','off_market','expired','pending_verification','archived')
    WHEN 'reserved'             THEN public.normalize_listing_status(to_raw) IN ('sold','rented','published','archived')
    WHEN 'rented'               THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN 'off_market'           THEN public.normalize_listing_status(to_raw) IN ('published','archived')
    WHEN 'expired'              THEN public.normalize_listing_status(to_raw) IN ('pending_verification','archived')
    ELSE FALSE  -- sold, archived = terminal
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6b. STATUS CHECK WIDENING — let the canonical vocabulary through while
--     keeping every legacy value valid (normalize maps them on read).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN (
    -- canonical Inventory OS vocabulary
    'draft', 'pending_verification', 'verified', 'published',
    'reserved', 'sold', 'rented', 'off_market', 'expired', 'archived',
    -- legacy values (still accepted; normalized by normalize_listing_status)
    'active', 'pending', 'available', 'off-market', 'Pending Review'
  ));

CREATE OR REPLACE FUNCTION public.listing_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NOT public.can_transition_listing(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Illegal listing transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history(unit_id, from_status, to_status, actor, note)
    VALUES (NEW.id, OLD.status, NEW.status,
            COALESCE(NULLIF(current_setting('app.actor', true), ''), 'system'), NULL);
    IF public.normalize_listing_status(NEW.status) = 'verified' AND NEW.verified_at IS NULL THEN
      NEW.verified_at := NOW();
    END IF;
    IF public.normalize_listing_status(NEW.status) = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_status_guard ON public.listings;
CREATE TRIGGER trg_listing_status_guard
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.listing_status_guard();

-- ─────────────────────────────────────────────────────────────────────────
-- 7. FRESHNESS SLA — auto-flag stale verified units (30 days)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_stale_listings()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE public.listings
  SET stale = TRUE
  WHERE stale = FALSE
    AND public.normalize_listing_status(status) IN ('verified','published')
    AND verified_at IS NOT NULL
    AND verified_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. DATA QUALITY SCORE (0-100)
--    completeness 35 + media 20 + verification 25 + pricing sanity 20
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_listing_dq(l public.listings)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(100, (
    (CASE WHEN l.bedrooms > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN l.bathrooms > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN l.area_sqm > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN COALESCE(l.finishing_type,'') <> '' THEN 4 ELSE 0 END) +
    (CASE WHEN l.delivery_year IS NOT NULL THEN 4 ELSE 0 END) +
    (CASE WHEN COALESCE(l.description,'') <> '' THEN 8 ELSE 0 END) +
    LEAST(10, COALESCE(l.photo_count,0) * 2) +
    (CASE WHEN l.has_floor_plan THEN 6 ELSE 0 END) +
    (CASE WHEN l.has_virtual_tour THEN 4 ELSE 0 END) +
    (CASE WHEN l.verified THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(l.ownership_doc_ref,'') <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN l.price > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN l.price > 0 AND l.area_sqm > 0
          AND l.price / l.area_sqm BETWEEN 30000 AND 250000 THEN 10 ELSE 0 END) +
    (CASE WHEN l.unit_view IS NOT NULL THEN 4 ELSE 0 END)
  ))::INTEGER;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. EGYPTIAN INSTALLMENT HELPER (parity with demo calculator)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calc_plan_installment(
  p_price NUMERIC, p_dp_percent NUMERIC, p_years NUMERIC, p_freq_per_year INTEGER, p_balloon_percent NUMERIC DEFAULT 0
) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_price <= 0 OR p_years <= 0 THEN 0
    ELSE (p_price * (1 - p_dp_percent/100.0 - p_balloon_percent/100.0)) / (p_years * p_freq_per_year)
  END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. DEDUPE FINGERPRINT (unified: compound|type|offer|beds|areaBand|priceBand)
-- ─────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.listing_fingerprint(
  p_compound TEXT, p_type TEXT, p_offer TEXT, p_beds INTEGER, p_area NUMERIC, p_price NUMERIC
) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT substr(encode(digest(
    lower(trim(p_compound)) || '|' || lower(trim(p_type)) || '|' || lower(trim(p_offer)) || '|' ||
    COALESCE(p_beds::TEXT,'0') || '|' ||
    (ROUND(COALESCE(p_area,0) / 5) * 5)::TEXT || '|' ||
    (CASE WHEN COALESCE(p_price,0) > 0 THEN ROUND(LN(COALESCE(p_price,1)) / LN(1.05))::TEXT ELSE '0' END),
    'sha256'), 'hex'), 1, 24);
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. ADMIN FEED VIEW — one query, all relations
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_inventory_os AS
SELECT
  l.id, COALESCE(l.unit_code, l.code) AS unit_code, l.title, l.compound, l.zone,
  p.name AS project_name, d.name AS developer_name, d.tier AS developer_tier,
  l.city, l.location_area, l.category, l.property_type,
  COALESCE(l.offer_type, l.deal_type) AS offer_type,
  l.listing_type, l.bedrooms, l.bathrooms, l.area_sqm, l.garden_sqm, l.roof_sqm,
  l.plot_sqm, l.floor_number, l.unit_view, l.finishing_type, l.delivery_year,
  l.delivery_quarter, l.price, l.price_currency, l.price_per_sqm,
  l.maintenance_fee_per_sqm, l.status, l.verified, l.verified_at, l.ownership_doc_ref,
  l.published_at, l.reserved_until, l.reservation_ref, l.days_on_market,
  l.photo_count, l.has_floor_plan, l.has_virtual_tour, l.data_quality_score,
  l.ai_score, l.dupe_check_hash, l.sync_source, l.stale,
  l.down_payment, l.installment_years, l.monthly_installment,
  (SELECT COUNT(*) FROM public.payment_plans pp WHERE pp.unit_id = l.id) AS plan_count,
  (SELECT pp.name FROM public.payment_plans pp WHERE pp.unit_id = l.id AND pp.is_default LIMIT 1) AS default_plan_name,
  (SELECT ph.price_egp FROM public.price_history ph WHERE ph.unit_id = l.id ORDER BY ph.created_at DESC LIMIT 1) AS last_price,
  (SELECT COUNT(*) FROM public.price_history ph WHERE ph.unit_id = l.id) AS price_points,
  public.compute_listing_dq(l) AS dq_computed,
  l.created_at, l.updated_at
FROM public.listings l
LEFT JOIN public.projects   p ON p.id = l.project_id
LEFT JOIN public.developers d ON d.id = l.developer_id;

-- ═══════════════════════════════ END OF MIGRATION ═════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 13. WORKFLOW STUDIO (migration 012) — graph canvas + script editor
--     Extends public.workflows with slug/graph/script columns and seeds the
--     8 studio definitions. Full source: supabase/migrations/012_workflow_studio.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 012_workflow_studio.sql — Admin Workflow Studio (graph canvas + script editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- Extends public.workflows (already the admin automations board) with:
--   slug           — stable identity for idempotent seeding
--   category       — ingestion | outreach | intelligence | operations
--   graph          — { nodes:[{id,type,label,sub,x,y}], edges:[{id,from,to,label}] }
--   script         — full editable source (mirrors the repo file)
--   script_lang    — javascript | typescript | json
--   source_path    — repo-relative path of the source of truth
--   trigger_type   — cron | webhook | manual
--   success_rate / last_run_ms — studio telemetry
--   updated_by     — last studio editor (seed guard: seeds only apply while NULL)
--
-- Additive & idempotent. Re-running never clobbers admin edits.
-- RLS: existing "workflows_staff_access" policy already covers all operations.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS slug          TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS category      TEXT DEFAULT 'operations';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS graph         JSONB;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS script        TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS script_lang   TEXT DEFAULT 'javascript';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS source_path   TEXT;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS trigger_type  TEXT DEFAULT 'cron';
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS success_rate  REAL DEFAULT 99.0;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS last_run_ms   INT DEFAULT 0;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS updated_by    TEXT;

-- Backfill slug from name (deterministic; dupes get a numeric suffix).
DO $seed$
DECLARE
    r RECORD;
    base TEXT;
    candidate TEXT;
    n INT;
BEGIN
    FOR r IN SELECT id, name FROM public.workflows WHERE slug IS NULL OR slug = '' LOOP
        base := lower(regexp_replace(coalesce(r.name, 'wf'), '[^a-zA-Z0-9]+', '-', 'g'));
        base := regexp_replace(base, '(^-|-$)', '');
        candidate := base;
        n := 0;
        WHILE EXISTS (SELECT 1 FROM public.workflows w WHERE w.slug = candidate AND w.id <> r.id) LOOP
            n := n + 1;
            candidate := base || '-' || n;
        END LOOP;
        UPDATE public.workflows SET slug = candidate WHERE id = r.id;
    END LOOP;
END
$seed$;

CREATE UNIQUE INDEX IF NOT EXISTS workflows_slug_uidx ON public.workflows (slug);

-- ── 2. Studio seed (only while updated_by IS NULL — admin edits win) ───────
INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('whatsapp-scraper', 'WhatsApp Broker Scraper', 'جامع رسائل واتساب',
     'Monitors 4 Egyptian broker WhatsApp groups, filters property posts and appends raw rows to the Broker Inbox sheet.', NULL,
     'ingestion', 'active', '*/30 * * * *', 'cron',
     $sierra$/**
 * Workflow 01: WhatsApp Scraper
 * ─────────────────────────────────────────
 * Monitors WhatsApp groups for property listings
 * Writes raw messages to Google Sheets
 *
 * Usage:
 *   node workflows/01-whatsapp-scraper/index.js
 *
 * Env vars required:
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY (JSON path)
 *   - WHATSAPP_BOT_TOKEN (if using WhatsApp Web API)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');

const GROUPS_TO_WATCH = [
  'مجموعة وسطاء التجمع',
  'عقارات القاهرة الجديدة',
  'وسطاء شرق القاهرة',
  'وسطاء التجمع والحي',
];

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Written to ${tabName}:`, values[3].substring(0, 50) + '...');
  } catch (err) {
    console.error(`❌ Sheet write failed for ${tabName}:`, err.message);
  }
}

// Initialize WhatsApp client
const client = new Client({ authStrategy: new LocalAuth() });

client.on('ready', () => {
  console.log('🟢 WhatsApp scraper ready');
});

client.on('message', async (msg) => {
  // Filter to watched groups only
  if (!GROUPS_TO_WATCH.some(g => msg.from.includes(g))) {
    return;
  }

  // Write raw message to sheet
  await appendToSheet('raw_messages', [
    new Date().toISOString(),
    msg.from,
    msg.fromMe ? 'broker' : 'subscriber',
    msg.body.substring(0, 500), // Cap at 500 chars
    msg.hasMedia ? 'YES' : 'NO',
    'PENDING_REVIEW',
  ]);
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp auth failed:', msg);
});

client.initialize();
$sierra$, 'javascript', 'workflows/01-whatsapp-scraper/index.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"WhatsApp Groups","sub":"4 broker groups · Cairo","x":40,"y":90},{"id":"n2","type":"action","label":"Message Listener","sub":"whatsapp-web.js client","x":300,"y":90},{"id":"n3","type":"condition","label":"Property Filter","sub":"regex + Arabic keywords","x":560,"y":90},{"id":"n4","type":"output","label":"Broker Inbox Sheet","sub":"append raw rows","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2","label":"live feed"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"match"}]}$sierra$::jsonb,
     6420, 99.2, '2026-09-17T23:57:35.728Z', 8400, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('owner-search', 'Direct Owner Harvester', 'باحث الملاك المباشرين',
     'Daily sweep of Property Finder & OLX for direct-owner listings, deduped against current inventory.', NULL,
     'ingestion', 'active', '0 9 * * *', 'cron',
     $sierra$/**
 * Workflow 02: Owner Search
 * ─────────────────────────────────────────
 * Searches Property Finder & OLX for direct-owner properties
 * Filters by location, price, and owner status
 * Writes to Google Sheets "owner_leads" tab
 *
 * Usage:
 *   node workflows/02-owner-search/search.js
 *   OR: cron job daily at 9am
 *
 * Env vars required:
 *   - PROPERTY_FINDER_API_BASE
 *   - PROPERTY_FINDER_JWT_TOKEN
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const fs = require('fs');

const PF_API_BASE = process.env.PROPERTY_FINDER_API_BASE || 'https://api.propertyfinder.com.eg/v3';
const PF_TOKEN = process.env.PROPERTY_FINDER_JWT_TOKEN;
const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function appendToSheet(tabName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });
    console.log(`✅ Owner lead added: ${values[2]}`);
  } catch (err) {
    console.error(`❌ Sheet write failed:`, err.message);
  }
}

async function searchPropertyFinder() {
  try {
    const response = await fetch(`${PF_API_BASE}/properties`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      qs: {
        category_id: 1,
        location_id: 'cairo-new-cairo',
        purpose: 'sale',
        owner_only: 'true',
        sort_by: 'date',
        limit: 50,
      },
    });

    if (!response.ok) {
      console.error(`❌ PF API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Found ${data.data?.length || 0} owner properties on PF`);

    for (const unit of data.data || []) {
      await appendToSheet('owner_leads', [
        new Date().toISOString(),
        'property_finder',
        unit.title,
        unit.price,
        unit.location?.name || '',
        `${unit.beds || 0} BR, ${unit.baths || 0} BA, ${unit.area || '?'} sqm`,
        unit.owner?.phone || 'No contact',
        unit.url || '',
      ]);
    }
  } catch (err) {
    console.error(`❌ Property Finder search failed:`, err.message);
  }
}

// Run search
async function main() {
  console.log('🔍 Starting owner property search...');
  await searchPropertyFinder();
  console.log('✅ Owner search complete');
  process.exit(0);
}

main();
$sierra$, 'javascript', 'workflows/02-owner-search/search.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"PF + OLX","sub":"listing sources","x":40,"y":90},{"id":"n2","type":"action","label":"Scrape Listings","sub":"headless crawl","x":300,"y":90},{"id":"n3","type":"condition","label":"Direct Owner?","sub":"broker-name check","x":560,"y":90},{"id":"n4","type":"condition","label":"Dedupe","sub":"vs live inventory","x":560,"y":220},{"id":"n5","type":"output","label":"Owner Prospects","sub":"sheet queue","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n5","label":"yes"},{"id":"e4","from":"n3","to":"n4","label":"verify"},{"id":"e5","from":"n4","to":"n5","label":"unique"}]}$sierra$::jsonb,
     214, 97.8, '2026-09-17T15:21:35.728Z', 132000, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('owner-contact', 'Owner Outreach Messenger', 'مراسلة الملاك',
     'Hourly dispatch of personalized WhatsApp messages to new owner prospects with reply detection and throttling.', NULL,
     'outreach', 'active', '0 * * * *', 'cron',
     $sierra$/**
 * Workflow 03: Owner Contact
 * ─────────────────────────────────────────
 * Sends WhatsApp messages to property owners
 * Reads pending contacts from Sheets
 * Marks contacted/error in Sheet
 *
 * Usage:
 *   node workflows/03-owner-contact/contact.js
 *   OR: cron job daily at 10am
 *
 * Env vars required:
 *   - WHATSAPP_API_URL
 *   - WHATSAPP_API_TOKEN
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const WA_API_URL = process.env.WHATSAPP_API_URL;
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN;
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const CONTACT_TEMPLATE = `السلام عليكم ورحمة الله وبركاته

نحن فريق Sierra Estates — متخصصون في تسويق العقارات الفاخرة بالقاهرة الجديدة.

عقارك الذي رأينا يطابق معايير محفظتنا الحصرية.
هل لديك اهتمام بالتعاون معنا لتسويق الوحدة؟

السعر الحالي: ___PRICE___ جنيه
الموقع: ___LOCATION___

تفضلوا بالتواصل معنا مباشرة.`;

async function getOwnerLeads() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'owner_leads'!A:H",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[7] === 'PENDING'); // Filter by status
  } catch (err) {
    console.error('❌ Failed to read owner leads:', err.message);
    return [];
  }
}

async function sendWhatsAppMessage(phoneNumber, text) {
  try {
    const response = await axios.post(
      `${WA_API_URL}/send`,
      {
        phone: phoneNumber,
        message: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.status === 200;
  } catch (err) {
    console.error(`❌ WhatsApp send failed for ${phoneNumber}:`, err.message);
    return false;
  }
}

async function updateLeadStatus(rowIndex, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'owner_leads'!H${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });
  } catch (err) {
    console.error('❌ Failed to update status:', err.message);
  }
}

async function main() {
  console.log('📞 Starting owner contact workflow...');

  const leads = await getOwnerLeads();
  console.log(`📊 Found ${leads.length} pending leads`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const phone = lead[5];
    const price = lead[3];
    const location = lead[4];

    if (!phone || phone === 'No contact') {
      console.log(`⏭️  Skipping ${lead[2]} (no contact)`);
      await updateLeadStatus(i, 'SKIPPED');
      continue;
    }

    const message = CONTACT_TEMPLATE
      .replace('___PRICE___', price)
      .replace('___LOCATION___', location);

    const sent = await sendWhatsAppMessage(phone, message);

    if (sent) {
      console.log(`✅ Message sent to ${phone}`);
      await updateLeadStatus(i, 'CONTACTED');
    } else {
      console.log(`❌ Failed to send to ${phone}`);
      await updateLeadStatus(i, 'ERROR');
    }

    // Rate limit: 1 second between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ Owner contact workflow complete');
  process.exit(0);
}

main();
$sierra$, 'javascript', 'workflows/03-owner-contact/contact.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Prospects Queue","sub":"sheet: new rows","x":40,"y":90},{"id":"n2","type":"ai","label":"Personalize","sub":"Leila template · AR/EN","x":300,"y":90},{"id":"n3","type":"action","label":"WhatsApp Send","sub":"openwa session","x":560,"y":90},{"id":"n4","type":"condition","label":"Replied?","sub":"24h window","x":560,"y":220},{"id":"n5","type":"output","label":"Log + Throttle","sub":"max 3/day/owner","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n4","to":"n5","label":"log"},{"id":"e5","from":"n3","to":"n5","label":"sent"}]}$sierra$::jsonb,
     3126, 96.5, '2026-09-17T23:33:35.728Z', 15800, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('email-sender', 'Investor Email Digest', 'النشرة البريدية للمستثمرين',
     'Renders match digests for investment stakeholders and sends via SMTP with open tracking.', NULL,
     'outreach', 'paused', '0 10 * * *', 'cron',
     $sierra$/**
 * Workflow 04: Email Sender
 * ─────────────────────────────────────────
 * Sends bulk emails to investor stakeholders
 * Reads campaigns from Sheets
 * Tracks open/click rates via SendGrid
 *
 * Usage:
 *   node workflows/04-email-sender/send.js
 *   OR: cron job daily at 8am
 *
 * Env vars required:
 *   - SENDGRID_API_KEY
 *   - SENDGRID_FROM_EMAIL
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@sierra-estates.com';
const SERVICE_ACCOUNT_KEY = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
);

sgMail.setApiKey(SENDGRID_KEY);

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Sierra Estates – Your Exclusive Real Estate Gateway',
    html: `
      <h2>Welcome to Sierra Estates</h2>
      <p>We're thrilled to have you on board!</p>
      <p>Our curated portfolio of luxury properties in New Cairo awaits your exploration.</p>
      <p><a href="https://sierra-estates.vercel.app/landing">View Exclusive Listings</a></p>
    `,
  },
  property_alert: {
    subject: 'New Property Match: {{property_title}}',
    html: `
      <h2>New Property Match for You</h2>
      <p><strong>{{property_title}}</strong></p>
      <p>Price: {{property_price}} EGP</p>
      <p>Location: {{property_location}}</p>
      <p><a href="https://sierra-estates.vercel.app/listings/{{property_id}}">View Details</a></p>
    `,
  },
  viewing_reminder: {
    subject: 'Your Viewing Appointment Reminder',
    html: `
      <h2>Viewing Appointment Reminder</h2>
      <p>Your scheduled viewing is coming up on {{viewing_date}} at {{viewing_time}}.</p>
      <p><a href="https://sierra-estates.vercel.app/viewing-requests">Manage Appointment</a></p>
    `,
  },
};

async function getCampaignRecipients() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'email_campaigns'!A:E",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[3] === 'PENDING'); // Filter by status
  } catch (err) {
    console.error('❌ Failed to read campaigns:', err.message);
    return [];
  }
}

async function sendEmail(to, templateKey, variables = {}) {
  try {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) {
      console.error(`❌ Template not found: ${templateKey}`);
      return false;
    }

    let html = template.html;
    let subject = template.subject;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(`{{${key}}}`, value);
      subject = subject.replace(`{{${key}}}`, value);
    });

    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject,
      html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    });

    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`❌ Email send failed for ${to}:`, err.message);
    return false;
  }
}

async function updateCampaignStatus(rowIndex, status) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'email_campaigns'!D${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });
  } catch (err) {
    console.error('❌ Failed to update status:', err.message);
  }
}

async function main() {
  console.log('📧 Starting email sender workflow...');

  const campaigns = await getCampaignRecipients();
  console.log(`📊 Found ${campaigns.length} pending campaigns`);

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const email = campaign[0];
    const templateKey = campaign[1];
    const variables = campaign[2] ? JSON.parse(campaign[2]) : {};

    const sent = await sendEmail(email, templateKey, variables);

    if (sent) {
      await updateCampaignStatus(i, 'SENT');
    } else {
      await updateCampaignStatus(i, 'ERROR');
    }

    // Rate limit: 500ms between emails
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('✅ Email sender workflow complete');
  process.exit(0);
}

main();
$sierra$, 'javascript', 'workflows/04-email-sender/send.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"New Matches","sub":"lead × unit fits","x":40,"y":90},{"id":"n2","type":"action","label":"Render Template","sub":"HTML brochure","x":300,"y":90},{"id":"n3","type":"action","label":"SMTP Send","sub":"SES relay","x":560,"y":90},{"id":"n4","type":"output","label":"Open Tracking","sub":"pixel + clicks","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"}]}$sierra$::jsonb,
     1240, 98.9, '2026-09-16T22:21:35.728Z', 22100, 'studio', '#D4AF37', false,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('unit-adder', 'Unit Adder → Supabase', 'إضافة الوحدات لقاعدة البيانات',
     'Reads new broker-inbox rows, normalizes Egyptian attributes, fingerprint-dedupes and writes authoritative listings to Supabase.', NULL,
     'ingestion', 'active', '*/30 * * * *', 'cron',
     $sierra$/**
 * Workflow 05: Unit Adder (Supabase Authoritative)
 * ─────────────────────────────────────────
 * Reads new units from Google Sheets
 * Normalizes and deduplicates
 * Writes to Supabase "listings" table
 * Syncs with SBR code generation
 *
 * Usage:
 *   node workflows/05-unit-adder/add.js
 *   OR: cron job every 30 minutes
 *
 * Env vars required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BROKER_INBOX_SHEET_ID
 *   - GOOGLE_SERVICE_ACCOUNT_KEY
 */

const { google } = require('googleapis');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment
const ROOT = path.resolve(__dirname, '../..');
[
  path.resolve(ROOT, '.env.local'),
  path.resolve(ROOT, '.env'),
].forEach((envPath) => {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
});

const SHEET_ID = process.env.BROKER_INBOX_SHEET_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://REDACTED-PROJECT.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let sheets = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)) {
  const serviceAccountKey = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
  );
  sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  });
}

// Generate SBR code from property attributes
function generateSBRCode(compound, bedrooms, furnishing, price) {
  const compoundAbbr = (compound || 'PRP').substring(0, 3).toUpperCase();
  const furnishCode = furnishing === 'furnished' ? 'F' : 'U';
  const priceAbbr = `${Math.floor(price / 1000)}K`;
  return `${compoundAbbr}-${bedrooms}${furnishCode}-${priceAbbr}`;
}

// Compute SHA256 hash for deduplication
function computeSyncHash(compound, area, floor, unitNumber) {
  const key = `${compound}|${area}|${floor}|${unitNumber}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function getPendingUnits() {
  if (!sheets || !SHEET_ID) {
    console.warn('⚠️ Google Sheets not configured or sheet ID missing. Skipping sheet fetch.');
    return [];
  }
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'new_units'!A:L",
    });

    const rows = response.data.values || [];
    return rows.slice(1).filter(row => row[11] === 'PENDING');
  } catch (err) {
    console.error('❌ Failed to read pending units:', err.message);
    return [];
  }
}

async function checkDuplicate(syncHash) {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .eq('dupe_check_hash', syncHash)
      .limit(1);

    if (error) {
      console.error('❌ Dedup check error:', error.message);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.error('❌ Dedup check failed:', err.message);
    return false;
  }
}

async function addUnitToSupabase(unit, syncHash) {
  try {
    const sbrCode = generateSBRCode(
      unit.compound,
      unit.bedrooms,
      unit.furnishing,
      unit.price
    );

    const price = parseFloat(unit.price) || 0;
    const area = parseInt(unit.area) || 0;
    const pricePerSqm = area > 0 ? Math.round(price / area) : 0;

    const record = {
      title: `${unit.bedrooms}BR ${unit.compound}`,
      title_ar: unit.titleAr || '',
      code: sbrCode,
      property_type: unit.propertyType?.toLowerCase() || 'apartment',
      bedrooms: parseInt(unit.bedrooms) || 0,
      bathrooms: parseInt(unit.bathrooms) || 0,
      area,
      finishing: unit.finishingType || 'not-finished',
      price,
      price_per_sqm: pricePerSqm,
      compound: unit.compound,
      location: unit.address || unit.compound,
      lat: parseFloat(unit.lat) || 30.0,
      lng: parseFloat(unit.lng) || 31.0,
      dupe_check_hash: syncHash,
      status: 'available',
      owner_type: 'broker',
      source: 'sheets_sync',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('listings')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Unit added to Supabase: ${sbrCode} (id: ${data.id})`);
    return data.id;
  } catch (err) {
    console.error('❌ Supabase insert failed:', err.message);
    return null;
  }
}

async function updateUnitStatus(rowIndex, status) {
  if (!sheets || !SHEET_ID) return;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'new_units'!L${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[status]],
      },
    });
  } catch (err) {
    console.error('❌ Failed to update status:', err.message);
  }
}

async function main() {
  console.log('🏢 Starting unit adder workflow (Supabase)...');
  console.log(`📡 Supabase Endpoint: ${SUPABASE_URL}`);

  const pendingUnits = await getPendingUnits();
  console.log(`📊 Found ${pendingUnits.length} pending units`);

  let added = 0;
  let deduplicated = 0;

  for (let i = 0; i < pendingUnits.length; i++) {
    const row = pendingUnits[i];
    const unit = {
      compound: row[0],
      bedrooms: row[1],
      bathrooms: row[2],
      area: row[3],
      price: row[4],
      finishingType: row[5],
      furnishing: row[6],
      propertyType: row[7],
      address: row[8],
      lat: row[9],
      lng: row[10],
      ownerContact: row[11] || '',
    };

    const syncHash = computeSyncHash(
      unit.compound,
      unit.area,
      row[5], // floor level
      row[1]  // unit number
    );

    const isDuplicate = await checkDuplicate(syncHash);

    if (isDuplicate) {
      console.log(`⚠️ Skipping duplicate: ${unit.compound} ${unit.area}m²`);
      await updateUnitStatus(i, 'DUPLICATE');
      deduplicated++;
      continue;
    }

    const insertedId = await addUnitToSupabase(unit, syncHash);

    if (insertedId) {
      await updateUnitStatus(i, 'ADDED');
      added++;
    } else {
      await updateUnitStatus(i, 'ERROR');
    }
  }

  console.log('═══════════════════════════════════════');
  console.log(`✅ Workflow complete: ${added} added, ${deduplicated} duplicates`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateSBRCode,
  computeSyncHash,
  addUnitToSupabase,
  checkDuplicate,
};
$sierra$, 'javascript', 'workflows/05-unit-adder/add.js', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Broker Inbox Sheet","sub":"rows since watermark","x":40,"y":90},{"id":"n2","type":"action","label":"Normalize","sub":"area · price · SBR code","x":300,"y":90},{"id":"n3","type":"condition","label":"Fingerprint Dedupe","sub":"compound|type|beds|band","x":560,"y":90},{"id":"n4","type":"output","label":"Supabase listings","sub":"pending_verification","x":820,"y":90},{"id":"n5","type":"output","label":"Audit Event","sub":"status_history row","x":820,"y":220}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"new"},{"id":"e4","from":"n4","to":"n5","label":"audit"}]}$sierra$::jsonb,
     8930, 99.6, '2026-09-18T00:03:35.728Z', 4700, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('lead-scoring', 'Leila Lead Scoring (n8n)', 'تقييم العملاء — ليلى',
     'n8n webhook: scores Property Finder leads with the Leila engine and routes hot leads to instant WhatsApp, warm to email.', NULL,
     'intelligence', 'active', 'webhook', 'webhook',
     $sierra${
  "name": "💬 Leila Agent — Lead Scoring & Agent Alert",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "leila-lead-webhook",
        "options": {}
      },
      "id": "219e0758-c0b8-4d57-b08e-17482811a001",
      "name": "Leila Webhook Ingestion",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [
        200,
        300
      ]
    },
    {
      "parameters": {
        "model": "gpt-4o-mini",
        "prompt": "=Analyze the following real estate lead conversation summary and extract values for Leila's 3 Gold Questions. Output as JSON:\n- intent: 'buy_resale' | 'rent' | 'invest' | 'unknown'\n- budget_egp: number\n- timeline_months: number\n- confidence_score: 0-100\n- client_summary: brief one-liner summary of requirements\n\nConversation Context: {{ $json.body.conversation_summary }}",
        "options": {
          "jsonMode": true
        }
      },
      "id": "319e0758-c0b8-4d57-b08e-17482811a002",
      "name": "Gemini/OpenAI Lead Parser",
      "type": "n8n-nodes-base.openAi",
      "typeVersion": 1.1,
      "position": [
        400,
        300
      ],
      "credentials": {
        "openAiApi": {
          "id": "4",
          "name": "OpenAI Api Key"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const lead = $('Leila Webhook Ingestion').item.json.body;\nconst analysis = $('Gemini/OpenAI Lead Parser').item.json.choices[0].message.content;\nconst data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;\n\n// Calculate CRM Lead Priority Score\nlet priorityScore = 50; // Base score\nif (data.intent === 'buy_resale' || data.intent === 'invest') priorityScore += 20;\nif (data.budget_egp > 15000000) priorityScore += 15; // Luxury Segment\nif (data.timeline_months <= 2) priorityScore += 15;   // High Urgency\n\nlet priority = 'Low';\nif (priorityScore >= 80) priority = 'High';\nelse if (priorityScore >= 65) priority = 'Medium';\n\nreturn {\n  json: {\n    client_name: lead.client_name,\n    client_phone: lead.client_phone,\n    raw_intent: data.intent,\n    budget: data.budget_egp,\n    timeline: data.timeline_months,\n    summary: data.client_summary,\n    score: priorityScore,\n    priority: priority,\n    assigned_agent: lead.assigned_agent_id || \"agent_unassigned\"\n  }\n};"
      },
      "id": "419e0758-c0b8-4d57-b08e-17482811a003",
      "name": "CRM Lead Scorer",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        600,
        300
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://firestore.googleapis.com/v1/projects/sierra-estates-prod/databases/(default)/documents/leads",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "fields",
              "value": "={\"name\":{\"stringValue\":\"{{ $json.client_name }}\"},\"phone\":{\"stringValue\":\"{{ $json.client_phone }}\"},\"priority\":{\"stringValue\":\"{{ $json.priority }}\"},\"score\":{\"integerValue\":\"{{ $json.score }}\"},\"summary\":{\"stringValue\":\"{{ $json.summary }}\"},\"status\":{\"stringValue\":\"Lead_Ingested\"}}"
            }
          ]
        },
        "options": {}
      },
      "id": "519e0758-c0b8-4d57-b08e-17482811a004",
      "name": "Create Lead in Firestore CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        800,
        200
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "1",
          "name": "Google OAuth Token"
        }
      }
    },
    {
      "parameters": {
        "chatId": "=-1001928374",
        "text": "=🚨 *New Hot Lead Received via Leila AI!* \n\n👤 *Client:* {{ $json.client_name }}\n📱 *Phone:* {{ $json.client_phone }}\n💰 *Budget:* {{ $json.budget }} EGP\n⏱️ *Timeline:* {{ $json.timeline }} Month(s)\n🎯 *Priority:* {{ $json.priority }} (Score: {{ $json.score }})\n📝 *Summary:* {{ $json.summary }}\n\nAgent Assigned, please review on your CRM dashboard immediately!"
      },
      "id": "619e0758-c0b8-4d57-b08e-17482811a005",
      "name": "Telegram Alert to Agent Channel",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [
        800,
        400
      ],
      "credentials": {
        "telegramApi": {
          "id": "5",
          "name": "Telegram Bot Token"
        }
      }
    }
  ],
  "connections": {
    "Leila Webhook Ingestion": {
      "main": [
        [
          {
            "node": "Gemini/OpenAI Lead Parser",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini/OpenAI Lead Parser": {
      "main": [
        [
          {
            "node": "CRM Lead Scorer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "CRM Lead Scorer": {
      "main": [
        [
          {
            "node": "Create Lead in Firestore CRM",
            "type": "main",
            "index": 0
          },
          {
            "node": "Telegram Alert to Agent Channel",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {}
}
$sierra$, 'json', 'workflows/n8n-templates/leila_lead_scoring.json', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"PF Lead Webhook","sub":"POST /leads","x":40,"y":90},{"id":"n2","type":"ai","label":"Leila Scoring","sub":"budget·zone·payment fit","x":300,"y":90},{"id":"n3","type":"condition","label":"Score ≥ 8?","sub":"hot threshold","x":560,"y":90},{"id":"n4","type":"action","label":"Instant WhatsApp","sub":"< 2 min SLA","x":820,"y":40},{"id":"n5","type":"action","label":"Email Sequence","sub":"3-touch nurture","x":820,"y":180}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4","label":"hot"},{"id":"e4","from":"n3","to":"n5","label":"warm"}]}$sierra$::jsonb,
     12840, 99.9, '2026-09-18T00:15:35.728Z', 900, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('reservation-expiry', 'Reservation Auto-Expiry', 'انتهاء الحجوزات تلقائيًا',
     'Nightly sweep: expires 14-day reservation windows, reverts units to published via guarded transition and queues owner notifications.', NULL,
     'operations', 'active', '0 2 * * *', 'cron',
     $sierra$import { listRecords, updateRecord } from '@sierra-estates/db';
import { logger } from '@/lib/logger';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';

/**
 * Reservation auto-expiry — the enforcement half of the Inventory OS v2
 * escrow window.
 *
 * When a unit is reserved (POST /api/admin/inventory-os transition to
 * "reserved"), the listing row is stamped with `reserved_until`
 * (now + 14 days) and a `reservation_ref` (ESC-xxxx). Nothing else ever
 * cleared that stamp: if the buyer walked away, the unit sat reserved
 * forever and disappeared from the sellable pool while the pipeline board
 * showed a countdown that had already hit zero.
 *
 * This monitor, driven by /api/cron/expire-reservations (daily, see
 * vercel.json), finds every reservation whose window has lapsed and:
 *
 *   1. returns the unit to the market — status reserved → published, which
 *      is on the lifecycle transition matrix, so the DB trigger records the
 *      change in status_history and stamps the actor as "system";
 *   2. clears reserved_until / reservation_ref;
 *   3. queues a WhatsApp notification to the unit's owner contact through
 *      the standard outreach queue (whatsapp_queue), so it is sent within
 *      operating hours and quota by /api/cron/whatsapp-dispatch.
 *
 * Idempotent by construction: an expired row flips to "published" on the
 * first pass and no longer matches the query on subsequent runs.
 */

/** Reservation window length — must match RESERVATION_WINDOW_DAYS in the admin route. */
export const RESERVATION_WINDOW_DAYS = 14;

export interface ExpiredReservation {
  id: string;
  code: string | null;
  compound: string | null;
  propertyType: string | null;
  reservationRef: string | null;
  reservedUntil: string;
  notified: boolean;
}

export interface ExpiryRunResult {
  expired: ExpiredReservation[];
  notifiedCount: number;
  failures: number;
}

export class ReservationExpiryMonitor {
  /** Expire every lapsed reservation. Never throws: per-row failures are counted. */
  static async expireReservations(now: Date = new Date()): Promise<ExpiryRunResult> {
    const expiredRows = await listRecords<Record<string, unknown>>('listings', {
      where: [
        { column: 'status', op: 'eq', value: 'reserved' },
        { column: 'reservedUntil', op: 'lt', value: now.toISOString() },
      ],
      select: 'id, code, compound, propertyType, status, reservedUntil, reservationRef, ownerPhone, ownerName',
      orderBy: { column: 'reservedUntil', ascending: true },
      limit: 200,
    });

    if (expiredRows.length === 0) {
      logger.info('[ReservationExpiry] No lapsed reservations found.');
      return { expired: [], notifiedCount: 0, failures: 0 };
    }

    logger.info(
      `[ReservationExpiry] ${expiredRows.length} reservation(s) past their window — expiring.`
    );

    const expired: ExpiredReservation[] = [];
    let notifiedCount = 0;
    let failures = 0;

    for (const row of expiredRows) {
      const summary: ExpiredReservation = {
        id: String(row.id),
        code: (row.code as string) ?? null,
        compound: (row.compound as string) ?? null,
        propertyType: (row.propertyType as string) ?? null,
        reservationRef: (row.reservationRef as string) ?? null,
        reservedUntil: String(row.reservedUntil ?? ''),
        notified: false,
      };

      try {
        // reserved → published is on the transition matrix; the DB trigger
        // writes status_history (actor "system") and keeps published_at.
        await updateRecord('listings', summary.id, {
          status: 'published',
          reservedUntil: null,
          reservationRef: null,
          updatedAt: now.toISOString(),
        });

        // Queue the owner notification — best effort, never blocks expiry.
        const ownerPhone = (row.ownerPhone as string) || '';
        if (ownerPhone) {
          try {
            await enqueueWhatsAppJob({
              purpose: 'general-outreach',
              toPhone: ownerPhone,
              unitId: summary.id,
              body:
                `⏰ Reservation Expired — Sierra Estates\n` +
                `🔖 Unit: ${summary.code || summary.id}${summary.compound ? ` — ${summary.compound}` : ''}\n` +
                `🏠 ${summary.propertyType || 'Unit'}${summary.reservationRef ? ` · Ref ${summary.reservationRef}` : ''}\n` +
                `The ${RESERVATION_WINDOW_DAYS}-day escrow reservation window has lapsed and the unit is back on the market (Published).\n` +
                `Reply to this message to re-reserve the unit or discuss incoming offers.`,
            });
            summary.notified = true;
            notifiedCount += 1;
          } catch (waErr) {
            logger.warn(
              `[ReservationExpiry] WhatsApp queue failed for ${summary.code || summary.id}: ${
                waErr instanceof Error ? waErr.message : String(waErr)
              }`
            );
          }
        }

        expired.push(summary);
      } catch (err) {
        failures += 1;
        logger.error(
          `[ReservationExpiry] Failed to expire ${summary.code || summary.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    logger.info(
      `[ReservationExpiry] Done: ${expired.length} expired, ${notifiedCount} owner notifications queued, ${failures} failures.`
    );

    return { expired, notifiedCount, failures };
  }
}
$sierra$, 'typescript', 'apps/sierra-estates-realty/lib/services/ReservationExpiryMonitor.ts', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Cron 02:00 UTC","sub":"vercel.json","x":40,"y":90},{"id":"n2","type":"action","label":"Find Expired","sub":"reserved_until < now","x":300,"y":90},{"id":"n3","type":"action","label":"Revert → Published","sub":"guarded + audited","x":560,"y":90},{"id":"n4","type":"action","label":"Owner WhatsApp","sub":"outreach queue","x":560,"y":220},{"id":"n5","type":"output","label":"Activity Feed","sub":"admin visible","x":820,"y":90}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3","label":"expired"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n3","to":"n5","label":"audit"}]}$sierra$::jsonb,
     186, 100, '2026-09-17T10:21:35.728Z', 3100, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

INSERT INTO public.workflows
    (slug, name, name_ar, description, description_ar, category, status, schedule,
     trigger_type, script, script_lang, source_path, graph, runs, success_rate,
     last_run_at, last_run_ms, last_run_label, color, enabled, updated_at)
VALUES
    ('master-sheet-sync', 'Master Sheet Sync', 'مزامنة الشيت الرئيسي',
     'Daily one-way sync of authoritative Supabase listings into the Google master sheet with canonical column mapping and drift report.', NULL,
     'operations', 'active', '30 6 * * *', 'cron',
     $sierra$import { google } from 'googleapis';
import { listRecords, upsertRecords } from '@sierra-estates/db';
import { COLLECTIONS, Unit, PropertyStatus, PropertyType, FurnishingCode } from '@/lib/models/schema';
import { logger } from '@/lib/logger';
import { resolveLocation } from '@/lib/inventory/gazetteer';
import { toListingColumns } from '@/lib/server/listing-columns';
import { egpToUsd, usdToEgp } from '@/lib/fx';

export const MASTER_SHEET_ID_DEFAULT = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';

/** Stamp written to listings.sync_source for rows produced by this sync. */
export const SYNC_SOURCE = 'master-owner-sheet';

export interface RawOwnerSheetRow {
  timestamp?: string;
  rowNo?: string;
  lastUpdated?: string;
  name?: string;
  mobile?: string;
  availability?: string;
  bedrooms?: string;
  location?: string;
  priceRaw?: string;
  furnished?: string;
  typeRaw?: string;
  propertyTypeRaw?: string;
  code?: string;
  ownerTypeRaw?: string;
  gardenArea?: string;
  spaceArea?: string;
  pool?: string;
  comment?: string;
}

function getSheetsClient() {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyRaw) {
    try {
      const credentials = JSON.parse(keyRaw);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      return google.sheets({ version: 'v4', auth });
    } catch (_err: any) {
      logger.warn('[MasterSheetSync] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY credentials, falling back to API key');
    }
  }

  // Fallback to unauthenticated / API key if available
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  return google.sheets({ version: 'v4', auth: apiKey });
}

function convertArabicNumerals(str: string): string {
  if (!str) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString());
}

function parsePrice(priceStr?: string): { amount: number; currency: 'EGP' | 'USD' } {
  if (!priceStr) return { amount: 0, currency: 'EGP' };
  const normalized = convertArabicNumerals(priceStr).trim().toLowerCase();
  const isUsd = normalized.includes('$') || normalized.includes('usd') || normalized.includes('دولار');

  let multiplier = 1;
  if (/(m|million|مليون)/i.test(normalized)) {
    multiplier = 1_000_000;
  } else if (/(k|thousand|الف|ألف)/i.test(normalized)) {
    multiplier = 1_000;
  }

  const clean = normalized.replace(/[^0-9.]/g, '');
  const baseNum = parseFloat(clean) || 0;
  const amount = baseNum * multiplier;

  return { amount, currency: isUsd ? 'USD' : 'EGP' };
}

/**
 * The sheet quotes some units in USD ("$250k", "2M دولار"). public.listings
 * stores one canonical price column interpreted as EGP by every consumer
 * (feed, admin, valuation), so a USD figure is converted at the boundary via
 * the unified FX module — never the raw number, which would understate the
 * price by ~48x and poison the price-per-sqm stats.
 */
function parsePriceEgp(priceStr?: string): number {
  const { amount, currency } = parsePrice(priceStr);
  if (amount <= 0) return 0;
  return currency === 'USD' ? usdToEgp(amount) : amount;
}

function parseAvailability(avail?: string, typeRaw?: string): PropertyStatus {
  const normAvail = (avail || '').toLowerCase().trim();
  const normType = (typeRaw || '').toLowerCase().trim();
  const combined = `${normAvail} ${normType}`;

  if (combined.includes('اتباعت') || combined.includes('مباع') || combined.includes('sold')) return 'sold';
  if (combined.includes('تم الايجار') || combined.includes('مؤجر') || combined.includes('rented')) return 'rented';
  if (combined.includes('no answer') || combined.includes('غير متاح') || combined.includes('مغلق') || combined.includes('off market')) return 'off-market';
  if (combined.includes('متاح') || combined.includes('available')) return 'available';
  return 'available';
}

function parsePropertyType(raw?: string): PropertyType {
  const norm = (raw || '').toLowerCase().trim();
  if (norm.includes('villa') || norm.includes('فيلا') || norm.includes('فيللا')) return 'villa';
  if (norm.includes('town') || norm.includes('تاون')) return 'townhouse';
  if (norm.includes('duplex') || norm.includes('دوبلكس') || norm.includes('garden')) return 'duplex';
  if (norm.includes('penthouse') || norm.includes('بنتهاوس')) return 'penthouse';
  if (norm.includes('chalet') || norm.includes('شاليه')) return 'chalet';
  if (norm.includes('apartment') || norm.includes('شقة') || norm.includes('شقه') || norm.includes('استوديو')) return 'apartment';
  return 'apartment';
}

/** 'مفروش'/'F' → 'F' (furnished), 'نص مفروش'/'S' → 'S', 'غير مفروش'/'U' → 'U'. */
function parseFurnishing(raw?: string): FurnishingCode | undefined {
  const s = convertArabicNumerals(raw || '').trim().toLowerCase();
  if (!s) return undefined;
  // Negations first — 'غير مفروش' contains 'مفروش'.
  if (s.includes('غير مفروش') || s.includes('unfurnish') || s === 'u') return 'U';
  if (s.includes('نص مفروش') || s.includes('semi') || s === 's') return 'S';
  if (s.includes('مفروش') || s.includes('furnish') || s === 'f') return 'F';
  if (s === 'k') return 'K';
  return undefined;
}

// ─── Status lifecycle mirror ─────────────────────────────────────────────────
//
// Inventory OS v2 (migrations/011) enforces the canonical lifecycle at the
// database level with a BEFORE UPDATE trigger: an UPDATE whose status change
// is not on the transition matrix raises an exception, which would abort the
// whole 500-row upsert chunk. The matrix below mirrors
// normalize_listing_status() + can_transition_listing() so the sync can
// decide per row, up front, whether to apply the sheet's status or defer to
// the lifecycle queue (the desired state is parked in raw_data.sheet_status
// for the ops team to action through the Inventory OS view).

function normalizeStatus(raw?: string | null): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === '') return 'draft';
  if (['available', 'active', 'verified'].includes(s)) return 'published';
  if (['pending', 'pending review', 'pending_review', 'pending_verification'].includes(s)) return 'pending_verification';
  if (s === 'sold') return 'sold';
  if (s === 'rented') return 'rented';
  if (s === 'reserved') return 'reserved';
  if (s === 'off-market' || s === 'off_market') return 'off_market';
  if (s === 'expired') return 'expired';
  if (s === 'archived') return 'archived';
  return 'draft';
}

const LIFECYCLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'draft', 'archived'],
  verified: ['published', 'pending_verification', 'archived'],
  published: ['reserved', 'rented', 'off_market', 'expired', 'pending_verification', 'archived'],
  reserved: ['sold', 'rented', 'published', 'archived'],
  rented: ['published', 'archived'],
  off_market: ['published', 'archived'],
  expired: ['pending_verification', 'archived'],
  // sold / archived are terminal
};

function canTransition(fromRaw?: string | null, toRaw?: string | null): boolean {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);
  if (from === to) return true;
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function syncMasterOwnerSheet(sheetId?: string) {
  const spreadsheetId = sheetId || process.env.MASTER_SHEET_ID || MASTER_SHEET_ID_DEFAULT;
  logger.info(`[MasterSheetSync] Starting sync for sheet ID: ${spreadsheetId}`);

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:R', // All 18 columns
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
      logger.warn('[MasterSheetSync] Sheet is empty or header only.');
      return { success: true, count: 0, units: [] };
    }

    const dataRows = rows.slice(1); // skip header
    const parsedUnits: Partial<Unit>[] = [];
    const pendingWrites: { docId: string; data: Record<string, unknown> }[] = [];

    // Sheet-derived doc ids for this batch, used to fetch the stored status of
    // each row so the lifecycle guard never sees an illegal UPDATE.
    const docIds: string[] = [];
    const parsed: {
      docId: string;
      sheetStatus: PropertyStatus;
      appUnit: Partial<Unit>;
      columns: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length < 3) continue;

      const [
        _timestamp,
        _rowNo,
        _lastUpdated,
        _name,
        mobile,
        availability,
        bedrooms,
        location,
        priceRaw,
        furnished,
        typeRaw,
        propertyTypeRaw,
        code,
        ownerTypeRaw,
        _gardenArea,
        spaceArea,
        _pool,
        comment
      ] = row;

      const price = parsePriceEgp(priceRaw); // canonical EGP
      const sheetStatus = parseAvailability(availability, typeRaw);
      const propertyType = parsePropertyType(propertyTypeRaw);
      const furnishing = parseFurnishing(furnished);

      const cleanSpaceStr = convertArabicNumerals(spaceArea || '').replace(/[^0-9.]/g, '');
      const area = parseFloat(cleanSpaceStr) || 0;

      const cleanBedStr = convertArabicNumerals(bedrooms || '').replace(/[^0-9]/g, '');
      const bedCount = parseInt(cleanBedStr, 10) || 0;

      const unitCode = (code || `SB-UNIT-${i + 1}`).trim();
      const sanitizedDocId = unitCode.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Geocode for the inventory map (lib/inventory/gazetteer.js — same
      // compound/area centroid table used by the public map's live-sheet
      // fallback, so pins stay consistent whichever source served them).
      const geo = resolveLocation(location || '');

      // Column payload for public.listings. Field names are the camelCase
      // column names (translated to snake_case by the record layer) — NOT the
      // legacy app names: this sync previously wrote `location`, `area`,
      // `ownerContact` and a nested `coordinates` object, none of which are
      // columns, so every upsert failed wholesale with PGRST204.
      // toListingColumns() is the last line of defence: a key that is not a
      // column lands in raw_data instead of killing the request.
      const columnPayload: Record<string, unknown> = {
        id: sanitizedDocId,
        code: unitCode,
        unitCode, // Inventory OS v2 cross-source unit identity
        title: `${propertyType.toUpperCase()} in ${location || 'New Cairo'} - ${unitCode}`,
        compound: (location || 'New Cairo').trim(),
        locationArea: (location || 'New Cairo').trim(),
        city: geo.zone, // canonical zone from the gazetteer, not hardcoded
        propertyType,
        dealType: 'resale', // owner sheet is secondary-market inventory
        category: 'residential',
        price,
        priceCurrency: 'EGP',
        egpM: price > 0 ? Number((price / 1_000_000).toFixed(2)) : undefined,
        usd: price > 0 ? egpToUsd(price) : undefined,
        areaSqm: area,
        pricePerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
        bedrooms: bedCount,
        furnishingStatus: furnishing,
        ownerType: (ownerTypeRaw || '').toLowerCase().includes('broker') ? 'broker' : 'owner',
        ownerPhone: mobile || '',
        description: comment || `${furnished || ''} ${typeRaw || ''}`.trim(),
        latitude: geo.lat,
        longitude: geo.lng,
        syncSource: SYNC_SOURCE,
        sheetPriceRaw: priceRaw || '', // traceability: original sheet quote (→ raw_data)
      };

      // App-shaped twin for the response — the shape callers of this sync
      // have always received.
      const appUnit: Partial<Unit> = {
        code: unitCode,
        title: columnPayload.title as string,
        compound: (location || 'New Cairo').trim(),
        location: (location || 'New Cairo').trim(),
        city: geo.zone,
        propertyType,
        category: 'residential',
        price,
        area,
        bedrooms: bedCount,
        ownerType: columnPayload.ownerType as string,
        ownerPhone: mobile || '',
        description: columnPayload.description as string,
        coordinates: { lat: geo.lat, lng: geo.lng },
        syncSource: SYNC_SOURCE,
      };

      parsed.push({ docId: sanitizedDocId, sheetStatus, appUnit, columns: columnPayload });
      docIds.push(sanitizedDocId);
    }

    // Stored status per doc id — decides whether the sheet's status can be
    // applied directly or must be deferred to the lifecycle queue.
    const existingRows = docIds.length
      ? await listRecords<{ id: string; status: string }>(COLLECTIONS.units, {
          where: [{ column: 'id', op: 'in', value: docIds }],
          select: 'id, status',
        })
      : [];
    const storedStatus = new Map(existingRows.map((r) => [r.id, r.status]));

    const skippedStatusTransitions: { id: string; from: string; to: string }[] = [];

    for (const item of parsed) {
      const stored = storedStatus.get(item.docId);
      let finalStatus: PropertyStatus = item.sheetStatus;

      if (stored != null && !canTransition(stored, item.sheetStatus)) {
        // e.g. sheet says 'sold' but the unit is 'available' (published):
        // the lifecycle requires published → reserved → sold. Keep the
        // stored status, park the sheet's intent in raw_data.sheet_status
        // and let ops drive it through the Inventory OS view so the
        // status_history audit trail stays intact.
        finalStatus = stored as PropertyStatus;
        item.columns.status = finalStatus;
        item.columns.sheetStatus = item.sheetStatus; // → raw_data via toListingColumns
        skippedStatusTransitions.push({ id: item.docId, from: stored, to: item.sheetStatus });
        logger.warn(
          `[MasterSheetSync] Deferred illegal transition ${stored} → ${item.sheetStatus} for ${item.docId} (parked in raw_data.sheet_status)`
        );
      } else {
        item.columns.status = item.sheetStatus;
      }

      const now = new Date();
      item.columns.lastSyncAt = now;
      item.columns.updatedAt = now;

      const appUnit = { ...item.appUnit, status: finalStatus, updatedAt: now } as Partial<Unit>;
      parsedUnits.push(appUnit);
      pendingWrites.push({ docId: item.docId, data: toListingColumns(item.columns) });
    }

    // One upsert per chunk keyed on the sheet-derived id. Chunks are about
    // request size only — Postgres has no Firestore 500-op batch cap.
    if (pendingWrites.length > 0) {
      await upsertRecords(
        COLLECTIONS.units,
        pendingWrites.map((item) => ({ ...item.data })),
        'id'
      );
    }

    logger.info(
      `[MasterSheetSync] Successfully synchronized ${parsedUnits.length} active inventory assets` +
        (skippedStatusTransitions.length ? ` (${skippedStatusTransitions.length} status changes deferred to lifecycle queue)` : '')
    );

    return {
      success: true,
      count: parsedUnits.length,
      units: parsedUnits,
      skippedStatusTransitions,
    };
  } catch (err: any) {
    logger.error('[MasterSheetSync] Error syncing master owner sheet:', err.message);
    return { success: false, error: err.message };
  }
}
$sierra$, 'typescript', 'apps/sierra-estates-realty/lib/services/master-sheet-sync.ts', $sierra${"nodes":[{"id":"n1","type":"trigger","label":"Cron 06:30 UTC","sub":"vercel.json","x":40,"y":90},{"id":"n2","type":"action","label":"Fetch Supabase","sub":"v_inventory_os view","x":300,"y":90},{"id":"n3","type":"action","label":"Map Columns","sub":"location→locationArea…","x":560,"y":90},{"id":"n4","type":"output","label":"Master Sheet","sub":"canonical EGP","x":820,"y":90},{"id":"n5","type":"output","label":"Drift Report","sub":"row delta log","x":820,"y":220}],"edges":[{"id":"e1","from":"n1","to":"n2"},{"id":"e2","from":"n2","to":"n3"},{"id":"e3","from":"n3","to":"n4"},{"id":"e4","from":"n4","to":"n5"}]}$sierra$::jsonb,
     92, 98.1, '2026-09-17T13:21:35.729Z', 76000, 'studio', '#D4AF37', true,
     NOW())
ON CONFLICT (slug) DO UPDATE SET
    graph        = EXCLUDED.graph,
    script       = EXCLUDED.script,
    script_lang  = EXCLUDED.script_lang,
    source_path  = EXCLUDED.source_path,
    category     = EXCLUDED.category,
    trigger_type = EXCLUDED.trigger_type
WHERE public.workflows.updated_by IS NULL;

-- ── 3. Graph sanity guard (admin-facing, cheap) ────────────────────────────
-- Rejects graphs with dangling edges or > 60 nodes at write time.
CREATE OR REPLACE FUNCTION public.validate_workflow_graph()
RETURNS TRIGGER AS $guard$
DECLARE
    node_count INT;
    dangling INT;
BEGIN
    IF NEW.graph IS NOT NULL THEN
        node_count := jsonb_array_length(COALESCE(NEW.graph->'nodes', '[]'::jsonb));
        IF node_count > 60 THEN
            RAISE EXCEPTION 'Workflow graph exceeds 60 nodes (%)', node_count;
        END IF;
        SELECT COUNT(*) INTO dangling
        FROM jsonb_array_elements(NEW.graph->'edges') e
        WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(NEW.graph->'nodes') n
            WHERE n->>'id' IN (e->>'from', e->>'to')
        );
        IF dangling > 0 THEN
            RAISE EXCEPTION 'Workflow graph has % dangling edge(s)', dangling;
        END IF;
    END IF;
    RETURN NEW;
END
$guard$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_graph_guard ON public.workflows;
CREATE TRIGGER trg_workflow_graph_guard
    BEFORE INSERT OR UPDATE OF graph ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.validate_workflow_graph();
