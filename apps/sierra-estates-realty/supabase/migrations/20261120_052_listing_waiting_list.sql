-- ════════════════════════════════════════════════════════════════════
-- 052 — LISTING WAITING LIST (WhatsApp Station intake staging)
-- ════════════════════════════════════════════════════════════════════
-- Destination table for the WhatsApp Station skill
-- (packages/whatsapp-station): every listing scraped from broker WhatsApp
-- groups / USB phone exports lands here FIRST as a private staging row.
--
-- Approval flow (admin "Listing Waiting List" window):
--   PENDING ──approve──▶ APPROVED (unit created in public.listings,
--                                  publish gate decides PF ad)
--          ──reject───▶ REJECTED
--   APPROVED + PF ad accepted ─▶ IMPORTED (listing_id stamped)
--
-- PRIVACY LOCK: broker/owner phone numbers are NEVER stored in full.
-- Only broker_phone_masked (last-7, e.g. ***48333) and the canonical
-- confidential contact 01092048333 survive; raw_message keeps whatever
-- the broker already wrote in the group, but full numbers found inside
-- are masked by the extraction engine before insert.
--
-- RAG: embedding vector(768) matches the Gemini embedding-001
-- dimension used by listings.embedding_768 (see
-- apps/sierra-estates-realty/lib/server/gemini-embeddings.ts) so the
-- waiting-list triage UI can suggest similar live inventory.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists vector;

create table if not exists public.listing_waiting_list (
    id                    uuid primary key default gen_random_uuid(),
    code                  text unique,                          -- SE-WA-XXXXXX station code
    source                text not null default 'whatsapp_group'
                          check (source in ('whatsapp_group','usb_import','manual')),
    group_name            text not null default '',
    broker_name           text not null default '',
    broker_phone_masked   text not null default '',             -- last-7 only, privacy lock
    raw_message           text not null default '',
    extracted             jsonb not null default '{}'::jsonb,   -- compound/type/price/area/rooms...
    status                text not null default 'PENDING'
                          check (status in ('PENDING','APPROVED','REJECTED','IMPORTED')),
    dedup_hash            text not null unique,                 -- sha256(group+sender+body)
    listing_id            text references public.listings(id) on delete set null,
    rag_text              text not null default '',             -- canonical text sent to the embedder
    embedding             vector(768),
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    approved_at           timestamptz,
    approved_by           text
);

create index if not exists idx_lwl_status      on public.listing_waiting_list (status, created_at desc);
create index if not exists idx_lwl_group       on public.listing_waiting_list (group_name);
create index if not exists idx_lwl_embedding   on public.listing_waiting_list
    using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── RLS: staff-only staging (never public) ──────────────────────────
alter table public.listing_waiting_list enable row level security;

drop policy if exists lwl_staff_read  on public.listing_waiting_list;
drop policy if exists lwl_staff_write on public.listing_waiting_list;

create policy lwl_staff_read  on public.listing_waiting_list
    for select using (public.is_staff());
create policy lwl_staff_write on public.listing_waiting_list
    for all    using (public.is_staff()) with check (public.is_staff());

-- ── Station skills registry: which broker groups each line watches ──
create table if not exists public.whatsapp_station_groups (
    id           uuid primary key default gen_random_uuid(),
    group_name   text not null,
    broker_names text not null default '',      -- comma-separated brokers to attribute
    line         text not null default 'line-1',-- OpenWA gateway line
    active       boolean not null default true,
    created_at   timestamptz not null default now(),
    unique (group_name, line)
);

alter table public.whatsapp_station_groups enable row level security;
drop policy if exists wsg_staff_all on public.whatsapp_station_groups;
create policy wsg_staff_all on public.whatsapp_station_groups
    for all using (public.is_staff()) with check (public.is_staff());

-- Seed the broker groups already watched by workflow 01 (SCRAPER_GROUPS).
insert into public.whatsapp_station_groups (group_name, broker_names, line, active)
values
    ('مجموعة وسطاء التجمع', 'ايمان', 'line-1', true),
    ('عقارات القاهرة الجديدة', '', 'line-1', true),
    ('وسطاء شرق القاهرة', '', 'line-1', true),
    ('وسطاء التجمع والحي', '', 'line-1', true)
on conflict (group_name, line) do nothing;

-- ── Cosine similarity RPC for waiting-list triage (RAG) ────────────
-- Mirrors match_listings_gemini semantics but over the waiting list:
-- "which live inventory looks like this raw broker message?"
create or replace function public.match_waiting_list_gemini(
    query_embedding vector(768),
    match_threshold double precision default 0.5,
    match_count      int default 5
)
returns table (id uuid, code text, group_name text, raw_message text,
               extracted jsonb, status text, similarity double precision)
language sql stable as $$
    select wl.id, wl.code, wl.group_name, wl.raw_message, wl.extracted, wl.status,
           1 - (wl.embedding <=> match_waiting_list_gemini.query_embedding) as similarity
    from public.listing_waiting_list wl
    where wl.embedding is not null
      and 1 - (wl.embedding <=> match_waiting_list_gemini.query_embedding) >= match_waiting_list_gemini.match_threshold
    order by wl.embedding <=> match_waiting_list_gemini.query_embedding
    limit least(match_waiting_list_gemini.match_count, 50);
$$;
