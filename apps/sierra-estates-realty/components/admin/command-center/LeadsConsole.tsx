'use client';

/**
 * SIERRA ESTATES — LEADS & AI MATCHMAKER HUB (/admin/leads)
 *
 * Demand-side command center: the lead book with lead_score, source and
 * channel filters; the AI Matchmaker trigger (POST /api/matching?leadId=)
 * running the semantic property matching engine; and the recommendation
 * dispatch (POST /api/admin/leads/[id]/recommendations) that curates the top
 * matches into a luxury WhatsApp portfolio and queues it through the
 * production dispatch pipeline. Leads link straight into the pipeline board.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Brain,
  Flame,
  KanbanSquare,
  Search,
  Send,
  Users,
} from 'lucide-react';
import {
  CcButton,
  CcCard,
  CcEmpty,
  CcError,
  CcField,
  CcKpi,
  CcModal,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcScorePill,
  CcSpinner,
  CcUnauthorized,
  formatCurrency,
  mutateApi,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';
import { CRM_STAGE_META } from '@/lib/crm-stages';

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  pipelineStage: string;
  score: number;
  hot: boolean;
  archived: boolean;
  interest: string;
  notes: string;
  channel: string | null;
  targetCompound: string | null;
  budgetMax: number | null;
  aiProfiling: {
    topMatches?: { unitId: string; matchScore: number; matchReason?: string }[];
    lastMatchRunAt?: string;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface LeadsResponse {
  leads: LeadRow[];
  count: number;
}

const SOURCE_FILTERS = ['all', 'website', 'whatsapp', 'telegram', 'property-finder', 'property_finder'];

function stageLabel(stage: string): string {
  return CRM_STAGE_META.find((m) => m.id === stage)?.label ?? stage;
}

export default function LeadsConsole() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [openLead, setOpenLead] = useState<LeadRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data, loading, error, unauthorized, reload, setData } = useAdminApi<LeadsResponse>(
    '/api/admin/leads?limit=500',
  );

  const leads = useMemo(() => {
    const all = data?.leads ?? [];
    const needle = search.trim().toLowerCase();
    return all.filter((lead) => {
      if (source !== 'all' && lead.source !== source) return false;
      if (!needle) return true;
      return [lead.name, lead.phone, lead.email, lead.targetCompound, lead.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, search, source]);

  const stats = useMemo(() => {
    const all = data?.leads ?? [];
    const active = all.filter((l) => !l.archived);
    return {
      total: all.length,
      active: active.length,
      hot: active.filter((l) => l.hot || l.score >= 80).length,
      matched: active.filter((l) => (l.aiProfiling?.topMatches?.length ?? 0) > 0).length,
    };
  }, [data]);

  async function runMatchmaker(lead: LeadRow) {
    setBusyId(lead.id);
    setNotice(null);
    try {
      const res = await mutateApi(`/api/matching?leadId=${encodeURIComponent(lead.id)}`, 'POST');
      if (res.ok) {
        const matches = (res.body.matches as { unitId: string; matchScore: number; matchReason?: string }[]) ?? [];
        setNotice({
          tone: 'ok',
          text: `Matchmaker: ${matches.length} semantic matches for ${lead.name}.`,
        });
        // Patch the open modal + table from the response — no full refetch.
        const patched: LeadRow = {
          ...lead,
          aiProfiling: {
            ...(lead.aiProfiling ?? {}),
            topMatches: matches,
            lastMatchRunAt: new Date().toISOString(),
          },
        };
        if (openLead?.id === lead.id) setOpenLead(patched);
        setData((current) => ({
          leads: (current?.leads ?? []).map((l) => (l.id === lead.id ? patched : l)),
          count: current?.count ?? 0,
        }));
      } else {
        setNotice({ tone: 'err', text: String(res.body.error ?? 'Matchmaker run failed.') });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function dispatchRecommendations(lead: LeadRow) {
    setBusyId(lead.id);
    setNotice(null);
    try {
      const res = await mutateApi(`/api/admin/leads/${lead.id}/recommendations`, 'POST');
      if (res.ok) {
        setNotice({
          tone: 'ok',
          text: `Portfolio dispatched to ${lead.name} via the WhatsApp queue (${res.body.dispatched ?? 0} matches).`,
        });
      } else {
        setNotice({ tone: 'err', text: String(res.body.error ?? 'Dispatch failed.') });
      }
    } finally {
      setBusyId(null);
    }
  }

  if (unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Leads & AI Matchmaker">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  const openMatches = openLead?.aiProfiling?.topMatches ?? [];

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="Leads & AI Matchmaker"
      subtitle="The demand book — lead scoring, semantic property matching and curated recommendation dispatch, one hub for the whole funnel."
      actions={
        <>
          <CcRealtimeBadge connected={!error && !loading} />
          <Link href="/admin/pipeline" className="cc-btn cc-btn-gold no-underline">
            <KanbanSquare className="h-4 w-4" aria-hidden /> Pipeline Board
          </Link>
          <Link href="/admin" className="cc-btn cc-btn-ghost no-underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Overview
          </Link>
        </>
      }
    >
      {error && !data ? (
        <CcError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <CcSpinner label="Loading the demand book" />
      ) : (
        <>
          <section aria-label="Lead summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CcKpi label="Leads (window)" value={String(stats.total)} sub="Newest 500 by intake" icon={<Users className="h-5 w-5" />} tone="gold" />
            <CcKpi label="Active" value={String(stats.active)} sub="Not archived" tone="azure" />
            <CcKpi label="Hot" value={String(stats.hot)} sub="Flagged or score ≥ 80" icon={<Flame className="h-5 w-5" />} tone="gold" />
            <CcKpi label="With Matches" value={String(stats.matched)} sub="AI matchmaker has scored them" icon={<Brain className="h-5 w-5" />} tone="green" />
          </section>

          <CcCard className="mt-6 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f5f3ec]/30" aria-hidden />
                <input
                  className="cc-input pl-9"
                  placeholder="Search name, phone, email, compound…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search leads"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      source === s
                        ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                        : 'border-white/10 bg-white/[0.03] text-[#f5f3ec]/55 hover:border-white/25'
                    }`}
                  >
                    {s === 'all' ? 'All sources' : s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </CcCard>

          {notice && (
            <div
              className={`mt-4 rounded-xl border px-4 py-2.5 text-xs ${
                notice.tone === 'ok'
                  ? 'border-emerald-soft/40 bg-emerald-soft/10 text-emerald-soft'
                  : 'border-ruby-soft/40 bg-ruby-soft/10 text-[#ff8b95]'
              }`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          <CcCard className="mt-4 overflow-hidden">
            <div className="cc-scroll max-h-[62vh] overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#0a192f]/95 backdrop-blur">
                  <tr className="text-[0.64rem] uppercase tracking-[0.14em] text-[#f5f3ec]/40">
                    <th className="px-4 py-3 font-semibold">Lead</th>
                    <th className="px-4 py-3 font-semibold">Stage</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Matches</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const matchCount = lead.aiProfiling?.topMatches?.length ?? 0;
                    return (
                      <tr
                        key={lead.id}
                        className={`cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.02] ${
                          busyId === lead.id ? 'opacity-50' : ''
                        }`}
                        onClick={() => setOpenLead(lead)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#f5f3ec]/90">
                            {lead.name}
                            {lead.hot && <Flame className="ml-1.5 inline h-3.5 w-3.5 text-gold-400" aria-label="Hot lead" />}
                          </p>
                          <p className="mt-0.5 text-[0.66rem] text-[#f5f3ec]/40">
                            {lead.phone || lead.email || '—'}
                            {lead.targetCompound ? ` · ${lead.targetCompound}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <CcPill tone={lead.pipelineStage === 'closed-won' ? 'green' : 'neutral'}>
                            {stageLabel(lead.pipelineStage)}
                          </CcPill>
                        </td>
                        <td className="px-4 py-3">
                          <CcScorePill score={lead.score} />
                        </td>
                        <td className="px-4 py-3 text-[0.72rem] text-[#f5f3ec]/60">
                          {lead.source}
                          {lead.channel ? ` / ${lead.channel}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          {matchCount > 0 ? (
                            <CcPill tone="green">{matchCount} matched</CcPill>
                          ) : (
                            <span className="text-[0.68rem] text-[#f5f3ec]/30">not matched</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[0.7rem] text-[#f5f3ec]/50">
                          {timeAgo(lead.updatedAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <CcButton
                              variant="gold"
                              onClick={() => runMatchmaker(lead)}
                              disabled={busyId === lead.id}
                              loading={busyId === lead.id}
                            >
                              <Brain className="h-4 w-4" aria-hidden /> Match
                            </CcButton>
                            <CcButton
                              variant="ghost"
                              onClick={() => dispatchRecommendations(lead)}
                              disabled={busyId === lead.id}
                            >
                              <Send className="h-4 w-4" aria-hidden /> Dispatch
                            </CcButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <CcEmpty
                          title="No leads match this filter"
                          hint="Intake flows (website, WhatsApp, Telegram, Property Finder) will populate the book."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CcCard>
        </>
      )}

      {/* ── Lead detail + matches modal ────────────────────────────────────── */}
      <CcModal
        open={openLead !== null}
        onClose={() => setOpenLead(null)}
        title={openLead?.name ?? 'Lead'}
        subtitle={`Stage: ${openLead ? stageLabel(openLead.pipelineStage) : '—'} · score ${openLead?.score ?? '—'} · ${timeAgo(openLead?.updatedAt)}`}
        wide
      >
        {openLead && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <dl>
                <CcField label="Phone">{openLead.phone || '—'}</CcField>
                <CcField label="Email">{openLead.email || '—'}</CcField>
                <CcField label="Source">{openLead.source}{openLead.channel ? ` / ${openLead.channel}` : ''}</CcField>
                <CcField label="Stage">{stageLabel(openLead.pipelineStage)}</CcField>
                <CcField label="Budget max">
                  {openLead.budgetMax ? formatCurrency(openLead.budgetMax) : '—'}
                </CcField>
                <CcField label="Target compound">{openLead.targetCompound ?? '—'}</CcField>
                <CcField label="Created">{timeAgo(openLead.createdAt)}</CcField>
                <CcField label="Last match run">
                  {openLead.aiProfiling?.lastMatchRunAt
                    ? timeAgo(openLead.aiProfiling.lastMatchRunAt)
                    : 'never'}
                </CcField>
              </dl>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                Brief
              </p>
              <p className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-relaxed text-[#f5f3ec]/70">
                {openLead.interest || openLead.notes || 'No brief captured.'}
              </p>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5f3ec]/40">
                  AI Matchmaker results
                </p>
                <div className="flex gap-1.5">
                  <CcButton variant="gold" onClick={() => runMatchmaker(openLead)} loading={busyId === openLead.id}>
                    <Brain className="h-4 w-4" aria-hidden /> Re-run
                  </CcButton>
                  <CcButton
                    variant="ghost"
                    onClick={() => dispatchRecommendations(openLead)}
                    disabled={busyId === openLead.id}
                  >
                    <Send className="h-4 w-4" aria-hidden /> Dispatch
                  </CcButton>
                </div>
              </div>
              <ul className="cc-scroll max-h-72 space-y-2 overflow-y-auto">
                {openMatches.map((match) => (
                  <li key={match.unitId} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="cc-num text-[0.7rem] text-[#f5f3ec]/60">{match.unitId.slice(0, 8)}…</span>
                      <CcPill tone={match.matchScore >= 85 ? 'green' : 'gold'}>
                        {Math.round(match.matchScore)}% match
                      </CcPill>
                    </div>
                    {match.matchReason && (
                      <p className="mt-1.5 text-[0.68rem] leading-relaxed text-[#f5f3ec]/50">
                        {match.matchReason}
                      </p>
                    )}
                  </li>
                ))}
                {openMatches.length === 0 && (
                  <li className="rounded-xl border border-white/[0.06] p-4 text-center text-[0.68rem] text-[#f5f3ec]/35">
                    No matches yet — run the matchmaker to score this brief against the verified
                    inventory.
                  </li>
                )}
              </ul>
              <Link href="/admin/pipeline" className="cc-btn cc-btn-ghost mt-4 w-full no-underline">
                <KanbanSquare className="h-4 w-4" aria-hidden /> Move this lead on the board
              </Link>
            </div>
          </div>
        )}
      </CcModal>
    </CcPageShell>
  );
}
