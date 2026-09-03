-- ==============================================================================
-- Sierra Estates — Production Supabase (PostgreSQL) Master Schema
-- Complete Drop-in Schema with pgvector, RLS Policies, Indexes, and Realtime
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

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
    DROP POLICY IF EXISTS "viewing_requests_public_insert" ON public.viewing_requests;
    CREATE POLICY "viewing_requests_public_insert" ON public.viewing_requests
        FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
    DROP POLICY IF EXISTS "viewing_requests_staff_access" ON public.viewing_requests;
    CREATE POLICY "viewing_requests_staff_access" ON public.viewing_requests
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- Booked viewings carry the lead's identity: staff only, no public read.
    -- /api/leads/request-viewing is public but writes through the service role.
    DROP POLICY IF EXISTS "viewings_staff_access" ON public.viewings;
    CREATE POLICY "viewings_staff_access" ON public.viewings
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    -- A concierge portfolio is shared with the lead as a link, so it is
    -- readable without an account; only staff (or the service role) write it.
    DROP POLICY IF EXISTS "concierge_selections_public_read" ON public.concierge_selections;
    CREATE POLICY "concierge_selections_public_read" ON public.concierge_selections
        FOR SELECT TO anon, authenticated USING (TRUE);
    DROP POLICY IF EXISTS "concierge_selections_staff_write" ON public.concierge_selections;
    CREATE POLICY "concierge_selections_staff_write" ON public.concierge_selections
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "inquiries_public_insert" ON public.inquiries;
    CREATE POLICY "inquiries_public_insert" ON public.inquiries
        FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
    DROP POLICY IF EXISTS "inquiries_staff_access" ON public.inquiries;
    CREATE POLICY "inquiries_staff_access" ON public.inquiries
        FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "career_applications_public_insert" ON public.career_applications;
    CREATE POLICY "career_applications_public_insert" ON public.career_applications
        FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
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
