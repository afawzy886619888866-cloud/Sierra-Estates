'use client';

/**
 * SIERRA ESTATES — CRM 10-STAGE PIPELINE BOARD (/admin/pipeline)
 *
 * The command center's demand funnel: every lead as a draggable card across
 * the canonical 10-stage pipeline (leads.pipeline_stage — migration 016
 * vocabulary, lib/crm-stages.ts). Dragging a card PATCHes the lead through
 * /api/admin/leads/[id], which the DB-level trigger_leads_status_sync /
 * audit_lead_stage_transition triggers turn into a derived status change plus
 * an orchestration_history transition record.
 *
 * Supabase Realtime CDC: one channel, two postgres_changes subscriptions —
 * `deals` (per the command-center contract) and `leads` (the board's own
 * table) — so cards and deal chips update the instant any surface (webhook
 * intake, the legacy SPA, a colleague) mutates them. Deal chips open the
 * linked Lead and Property detail modals (GET /api/admin/properties/[id]).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Flame,
  Handshake,
  Phone,
} from 'lucide-react';
import {
  CcButton,
  CcError,
  CcField,
  CcModal,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcScorePill,
  CcSpinner,
  CcUnauthorized,
  formatCurrency,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';
import {
  CRM_STAGE_META,
  isCrmPipelineStage,
  type CrmPipelineStage,
} from '@/lib/crm-stages';
import { leadStageToLabel } from '@/lib/server/admin-spa-mappers';
import { DEAL_STAGES } from '@/lib/server/deal-stages';

// ─── Types (API contracts) ─────────────────────────────────────────────────

interface BoardLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  interest: string;
  stage: string;
  pipelineStage: string;
  score: number;
  hot: boolean;
  archived: boolean;
  notes: string;
  channel: string | null;
  targetCompound: string | null;
  budgetMax: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface BoardDeal {
  id: string;
  leadId: string | null;
  listingId: string | null;
  stage: string;
  dealValue: number;
  closingProbability: number;
  commissionAmount: number;
  targetClosingDate: string | null;
  notes: string;
  client: { id: string; name: string; phone: string; source: string | null } | null;
  listing: { id: string; code: string | null; compound: string | null; title: string | null; status: string | null } | null;
  updatedAt: string | null;
}

interface PropertyDetail {
  id: string;
  seCode: string | null;
  code: string | null;
  title: string;
  compound: string | null;
  developer: string | null;
  propertyType: string | null;
  dealType: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  status: string | null;
  publishStatus: string | null;
  stale: boolean | null;
  freshnessScore: number | null;
  agent: string | null;
  img: string | null;
  updatedAt: string | null;
}

// ─── Board ─────────────────────────────────────────────────────────────────

export default function PipelineBoard() {
  const leadsApi = useAdminApi<{ leads: BoardLead[]; count: number }>(
    '/api/admin/leads?limit=500',
  );
  const dealsApi = useAdminApi<{ deals: BoardDeal[]; count: number }>(
    '/api/admin/deals?limit=500',
  );

  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [deals, setDeals] = useState<BoardDeal[]>([]);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // Lead modal state
  const [openLead, setOpenLead] = useState<BoardLead | null>(null);
  // Property modal state
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [propertyLoading, SetPropertyLoading] = useState(false);

  useEffect(() => setLeads(leadsApi.data?.leads ?? []), [leadsApi.data]);
  useEffect(() => setDeals(dealsApi.data?.deals ?? []), [dealsApi.data]);

  // ── Supabase Realtime CDC (deals + leads) ────────────────────────────────
  const reloadLeadsRef = useRef(leadsApi.reload);
  const reloadDealsRef = useRef(dealsApi.reload);
  useEffect(() => {
    reloadLeadsRef.current = leadsApi.reload;
    reloadDealsRef.current = dealsApi.reload;
  });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return undefined;

    let disposed = false;
    // Typed loosely on purpose: the client is created dynamically so this
    // component carries no static @supabase/ssr import weight until realtime
    // is actually configured.
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const client = createBrowserClient(supabaseUrl, supabaseKey);

        // Debounced reloads: bursts of CDC events (bulk bot runs, webhook
        // storms) coalesce into one refetch instead of a thundering herd.
        let leadsTimer: ReturnType<typeof setTimeout> | null = null;
        let dealsTimer: ReturnType<typeof setTimeout> | null = null;

        const channel = client
          .channel('command-center-pipeline')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leads' },
            () => {
              if (disposed) return;
              if (leadsTimer) clearTimeout(leadsTimer);
              leadsTimer = setTimeout(() => reloadLeadsRef.current(), 450);
            },
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'deals' },
            () => {
              if (disposed) return;
              if (dealsTimer) clearTimeout(dealsTimer);
              dealsTimer = setTimeout(() => reloadDealsRef.current(), 450);
            },
          )
          .subscribe((status) => {
            if (disposed) return;
            setRealtimeOn(status === 'SUBSCRIBED');
          });

        cleanup = () => {
          if (leadsTimer) clearTimeout(leadsTimer);
          if (dealsTimer) clearTimeout(dealsTimer);
          try {
            void client.removeChannel(channel);
          } catch {
            // Socket already gone — nothing to reclaim.
          }
        };
      } catch {
        setRealtimeOn(false);
      }
    })();

    return () => {
      disposed = true;
      setRealtimeOn(false);
      cleanup?.();
    };
  }, []);

  // ── Derived groupings ────────────────────────────────────────────────────
  const dealsByLead = useMemo(() => {
    const map = new Map<string, BoardDeal[]>();
    for (const deal of deals) {
      if (!deal.leadId) continue;
      const list = map.get(deal.leadId) ?? [];
      list.push(deal);
      map.set(deal.leadId, list);
    }
    return map;
  }, [deals]);

  const byStage = useMemo(() => {
    const map = new Map<CrmPipelineStage, BoardLead[]>();
    for (const stage of CRM_STAGE_META) map.set(stage.id, []);
    for (const lead of leads) {
      if (lead.archived) continue;
      const stage = isCrmPipelineStage(lead.pipelineStage)
        ? lead.pipelineStage
        : (isCrmPipelineStage(lead.stage) ? lead.stage : 'inbound');
      map.get(stage)?.push(lead);
    }
    return map;
  }, [leads]);

  const pipelineValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
        .reduce((sum, d) => sum + (d.dealValue || 0), 0),
    [deals],
  );

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, draggableId } = result;
      if (!destination) return;
      const targetStage = destination.droppableId;
      if (!isCrmPipelineStage(targetStage)) return;

      const lead = leads.find((l) => l.id === draggableId);
      if (!lead || lead.pipelineStage === targetStage) return;

      // Optimistic move, rollback on failure.
      const previous = lead.pipelineStage;
      setLeads((current) =>
        current.map((l) => (l.id === lead.id ? { ...l, pipelineStage: targetStage } : l)),
      );
      setBusyLeadId(lead.id);
      setDragError(null);

      try {
        const res = await fetch(`/api/admin/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          // The SPA seam speaks stage LABELS; lib/server/admin-spa-mappers
          // maps them back onto the canonical pipeline_stage column.
          body: JSON.stringify({ stage: leadStageToLabel(targetStage) }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Move failed (${res.status})`);
        }
        reloadLeadsRef.current();
      } catch (err) {
        setLeads((current) =>
          current.map((l) => (l.id === lead.id ? { ...l, pipelineStage: previous } : l)),
        );
        setDragError(err instanceof Error ? err.message : 'Move failed — rolled back.');
      } finally {
        setBusyLeadId(null);
      }
    },
    [leads],
  );

  const openProperty = useCallback(async (listingId: string) => {
    SetPropertyLoading(true);
    setProperty(null);
    try {
      const res = await fetch(`/api/admin/properties/${listingId}`, { cache: 'no-store' });
      const body = (await res.json()) as { row?: PropertyDetail; error?: string };
      if (!res.ok || !body.row) throw new Error(body.error ?? 'Failed to load property');
      setProperty(body.row);
    } catch (err) {
      setDragError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      SetPropertyLoading(false);
    }
  }, []);

  if (leadsApi.unauthorized || dealsApi.unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="CRM Pipeline">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  const openLeadDeals = openLead ? (dealsByLead.get(openLead.id) ?? []) : [];

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="CRM Pipeline · 10 Stages"
      subtitle="The canonical demand funnel (leads.pipeline_stage). Drag a card to advance a lead — every move is audited into orchestration_history and streamed back over Realtime CDC."
      actions={
        <>
          <CcRealtimeBadge connected={realtimeOn} />
          <span className="cc-num rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-[0.7rem] font-semibold text-gold-300">
            {formatCurrency(pipelineValue, 'EGP')} active
          </span>
          <CcButton variant="gold" onClick={() => { leadsApi.reload(); dealsApi.reload(); }} loading={leadsApi.loading || dealsApi.loading}>
            Refresh
          </CcButton>
          <Link href="/admin" className="cc-btn cc-btn-ghost no-underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Overview
          </Link>
        </>
      }
    >
      {leadsApi.error && !leadsApi.data ? (
        <CcError message={leadsApi.error} onRetry={leadsApi.reload} />
      ) : leadsApi.loading && !leadsApi.data ? (
        <CcSpinner label="Loading the funnel" />
      ) : (
        <>
          {dragError && (
            <div className="mb-4 rounded-xl border border-ruby-soft/40 bg-ruby-soft/10 px-4 py-2.5 text-xs text-[#ff8b95]" role="alert">
              {dragError}
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="cc-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
              {CRM_STAGE_META.map((meta) => {
                const stageLeads = byStage.get(meta.id) ?? [];
                return (
                  <section
                    key={meta.id}
                    className={`cc-stage-column cc-stage-${meta.tone} flex w-[268px] shrink-0 flex-col`}
                    aria-label={`${meta.label} stage column`}
                  >
                    <header className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
                      <div>
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] opacity-60">
                          {meta.short}
                        </p>
                        <h2 className="text-sm font-semibold text-[#f5f3ec]">{meta.label}</h2>
                      </div>
                      <span className="cc-num rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[0.68rem] text-[#f5f3ec]/70">
                        {stageLeads.length}
                      </span>
                    </header>
                    <p className="px-3.5 pb-2 text-[0.62rem] leading-relaxed text-[#f5f3ec]/35" title={meta.blurb}>
                      {meta.blurb}
                    </p>
                    <Droppable droppableId={meta.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`cc-scroll min-h-[120px] flex-1 space-y-2 overflow-y-auto px-2.5 pb-3 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-gold-500/[0.06]' : ''
                          }`}
                          style={{ maxHeight: 'calc(100vh - 340px)' }}
                        >
                          {provided.placeholder}
                          {stageLeads.map((lead, index) => {
                            const leadDeals = dealsByLead.get(lead.id) ?? [];
                            return (
                              <Draggable
                                key={lead.id}
                                draggableId={lead.id}
                                index={index}
                                disableInteractiveElementBlocking
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <button
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    onClick={() => setOpenLead(lead)}
                                    className={`w-full rounded-xl border border-white/[0.08] bg-[#0a192f]/85 p-3 text-left transition-colors hover:border-gold-500/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60 ${
                                      dragSnapshot.isDragging ? 'cc-card-dragging' : ''
                                    } ${busyLeadId === lead.id ? 'opacity-50' : ''}`}
                                    style={dragProvided.draggableProps.style}
                                    aria-label={`Open ${lead.name} details`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="truncate text-[0.8rem] font-semibold text-[#f5f3ec]">
                                        {lead.name}
                                      </p>
                                      {lead.hot && <Flame className="h-3.5 w-3.5 shrink-0 text-gold-400" aria-label="Hot lead" />}
                                    </div>
                                    <p className="mt-1 truncate text-[0.66rem] text-[#f5f3ec]/45">
                                      {lead.phone || lead.email || lead.source}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      <CcScorePill score={lead.score} />
                                      {lead.source === 'property-finder' && <CcPill tone="amber">PF</CcPill>}
                                    </div>
                                    {leadDeals.length > 0 && (
                                      <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
                                        <Handshake className="h-3 w-3 text-emerald-soft/80" aria-hidden />
                                        <span className="cc-num text-[0.62rem] text-emerald-soft/90">
                                          {formatCurrency(
                                            leadDeals
                                              .filter((d) => d.stage !== 'closed_lost')
                                              .reduce((s, d) => s + (d.dealValue || 0), 0),
                                            '',
                                          )}
                                        </span>
                                        <span className="text-[0.6rem] text-[#f5f3ec]/35">
                                          · {leadDeals.length} deal{leadDeals.length > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                )}
                              </Draggable>
                            );
                          })}
                          {stageLeads.length === 0 && (
                            <p className="py-6 text-center text-[0.66rem] text-[#f5f3ec]/25">
                              Drop a lead here
                            </p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </section>
                );
              })}
            </div>
          </DragDropContext>

          <p className="mt-2 text-[0.66rem] text-[#f5f3ec]/30">
            {DEAL_STAGES.length}-stage deal vocabulary follows leads through proposals and closings —
            deal chips update live from the <span className="cc-num">deals</span> CDC stream.
          </p>
        </>
      )}

      {/* ── Lead detail modal ─────────────────────────────────────────────── */}
      <CcModal
        open={openLead !== null}
        onClose={() => setOpenLead(null)}
        title={openLead?.name ?? 'Lead'}
        subtitle={`Stage: ${openLead?.pipelineStage ?? '—'} · ${timeAgo(openLead?.updatedAt)}`}
        wide
      >
        {openLead && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <dl>
              <CcField label="Phone">{openLead.phone || '—'}</CcField>
              <CcField label="Email">{openLead.email || '—'}</CcField>
              <CcField label="Source">{openLead.source}</CcField>
              <CcField label="Channel">{openLead.channel ?? '—'}</CcField>
              <CcField label="Lead score">
                <CcScorePill score={openLead.score} />
              </CcField>
              <CcField label="Target compound">{openLead.targetCompound ?? '—'}</CcField>
              <CcField label="Budget max">
                {openLead.budgetMax ? formatCurrency(openLead.budgetMax) : '—'}
              </CcField>
              <CcField label="Created">{timeAgo(openLead.createdAt)}</CcField>
            </dl>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                Interest & notes
              </p>
              <p className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-relaxed text-[#f5f3ec]/70">
                {openLead.interest || openLead.notes || 'No notes captured.'}
              </p>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                Linked deals ({openLeadDeals.length})
              </p>
              <ul className="cc-scroll mt-2 max-h-40 space-y-2 overflow-y-auto">
                {openLeadDeals.map((deal) => (
                  <li
                    key={deal.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CcPill tone={deal.stage === 'closed_won' ? 'green' : deal.stage === 'closed_lost' ? 'red' : 'gold'}>
                        {deal.stage.replace(/_/g, ' ')}
                      </CcPill>
                      <span className="cc-num text-xs font-semibold text-[#f5f3ec]">
                        {formatCurrency(deal.dealValue)}
                      </span>
                    </div>
                    {deal.listing && (
                      <button
                        onClick={() => {
                          if (deal.listingId) {
                            setOpenLead(null);
                            void openProperty(deal.listingId);
                          }
                        }}
                        className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-gold-500/25 bg-gold-500/[0.07] px-2.5 py-1.5 text-left text-[0.68rem] text-gold-300 transition hover:border-gold-500/50"
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          {deal.listing.code ?? deal.listing.title ?? deal.listing.compound ?? 'View property'}
                        </span>
                        <ExternalLink className="ml-auto h-3 w-3 shrink-0" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
                {openLeadDeals.length === 0 && (
                  <li className="py-3 text-center text-[0.68rem] text-[#f5f3ec]/30">
                    No deals linked yet
                  </li>
                )}
              </ul>
              <a
                href={`/admin/leads?q=${encodeURIComponent(openLead.name)}`}
                className="cc-btn cc-btn-ghost mt-4 w-full no-underline"
              >
                <Phone className="h-4 w-4" aria-hidden /> Work this lead in the hub
              </a>
            </div>
          </div>
        )}
      </CcModal>

      {/* ── Property detail modal ─────────────────────────────────────────── */}
      <CcModal
        open={property !== null || propertyLoading}
        onClose={() => setProperty(null)}
        title={property?.title || property?.seCode || property?.code || 'Property'}
        subtitle={property ? `${property.compound ?? '—'} · updated ${timeAgo(property.updatedAt)}` : 'Loading…'}
        wide
      >
        {propertyLoading || !property ? (
          <CcSpinner label="Loading property" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <dl>
              <CcField label="SE code">{property.seCode ?? property.code ?? '—'}</CcField>
              <CcField label="Compound">{property.compound ?? '—'}</CcField>
              <CcField label="Developer">{property.developer ?? '—'}</CcField>
              <CcField label="Type">
                {property.propertyType ?? '—'} · {property.dealType ?? '—'}
              </CcField>
              <CcField label="Price">
                <span className="cc-num">{formatCurrency(property.price)}</span>
              </CcField>
              <CcField label="Layout">
                {property.bedrooms ?? '—'} bed · {property.bathrooms ?? '—'} bath ·{' '}
                {property.areaSqm ?? '—'} sqm
              </CcField>
            </dl>
            <dl>
              <CcField label="Status">
                <CcPill tone={property.status === 'sold' ? 'red' : 'gold'}>{property.status ?? '—'}</CcPill>
              </CcField>
              <CcField label="Publish gate">{property.publishStatus ?? '—'}</CcField>
              <CcField label="Stale">{property.stale ? 'Yes' : 'No'}</CcField>
              <CcField label="Freshness">
                <CcPill tone={(property.freshnessScore ?? 0) >= 90 ? 'green' : (property.freshnessScore ?? 0) >= 60 ? 'amber' : 'red'}>
                  {property.freshnessScore ?? '—'}%
                </CcPill>
              </CcField>
              <CcField label="Agent">{property.agent ?? '—'}</CcField>
              <CcField label="Updated">{timeAgo(property.updatedAt)}</CcField>
            </dl>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`/admin/properties?q=${encodeURIComponent(property?.seCode ?? property?.code ?? '')}`} className="cc-btn cc-btn-ghost no-underline">
            Manage in Inventory Console
          </a>
        </div>
      </CcModal>
    </CcPageShell>
  );
}
