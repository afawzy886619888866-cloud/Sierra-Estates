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
    role TEXT DEFAULT 'client' CHECK (role IN ('superadmin', 'admin', 'agent', 'broker', 'client', 'owner')),
    avatar_url TEXT,
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
    title TEXT NOT NULL,
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
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'rented', 'archived', 'draft')),
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
    phone TEXT NOT NULL,
    email TEXT,
    channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'telegram', 'web', 'phone', 'referral', 'property_finder')),
    lead_type TEXT DEFAULT 'buyer' CHECK (lead_type IN ('buyer', 'renter', 'investor', 'seller', 'owner')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiating', 'won', 'lost', 'nurture')),
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
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'hired', 'rejected')),
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
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    rating NUMERIC(4, 2) DEFAULT 0,
    listings_count INT DEFAULT 0,
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
        'contracts', 'agents_registry', 'bot_commands', 'workflows'
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

