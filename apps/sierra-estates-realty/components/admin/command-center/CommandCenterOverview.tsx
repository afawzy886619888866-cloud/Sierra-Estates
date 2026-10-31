'use client';

/**
 * SIERRA ESTATES — UNIFIED ADMIN COMMAND CENTER · MAIN OVERVIEW DASHBOARD
 *
 * The hub of /admin: the five real-time KPI widgets (Total Deals Value,
 * Active Leads, Verified Properties, Inventory Freshness Score %, Active Bot
 * Status) fed by /api/admin/overview, the command navigation that reaches
 * every operational surface (pipeline, properties, leads, bots, applicants
 * and the legacy Intelligence OS portal at /admin/console), the deals
 * pipeline value strip, the operational activity feed and the 24h webhook
 * ledger stats. Auto-refreshes every 30s; every number comes from Supabase —
 * an empty deployment renders honest zeros, never demo data.
 */
import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  ClipboardList,
  Gem,
  Home,
  KanbanSquare,
  Radio,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Webhook,
} from 'lucide-react';
import {
  CcButton,
  CcCard,
  CcEmpty,
  CcError,
  CcKpi,
  CcPageShell,
  CcPill,
  CcRealtimeBadge,
  CcSkeletonGrid,
  CcUnauthorized,
  formatCurrency,
  formatNumber,
  timeAgo,
  useAdminApi,
} from '@/components/admin/command-center/ui';
import { DEAL_STAGES, CLOSED_STAGES } from '@/lib/server/deal-stages';

interface OverviewKpis {
  totalDealsValue: number;
  activeDealsCount: number;
  closedWonValue: number;
  activeLeads: number;
  newLeads7d: number;
  hotLeads: number;
  verifiedProperties: number;
  totalListings: number;
  staleListings: number;
  inventoryFreshnessScore: number;
  freshOver90: number;
  bots: { total: number; enabled: number; active: number; erroring: number };
}

interface OverviewData {
  generatedAt: string;
  kpis: OverviewKpis;
  pipelineByStage: { stage: string; value: number; count: number }[];
  botStatuses: { id: string; status: string; enabled: boolean; lastPulse: number | null }[];
  recentActivity: Record<string, unknown>[];
  webhookStats: {
    last24h: { total: number; whatsapp: number; telegram: number; errors: number };
  };
}

const NAV_SECTIONS: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    href: '/admin/pipeline',
    title: 'CRM Pipeline',
    desc: '10-stage drag-and-drop board · Realtime CDC on deals & leads',
    icon: <KanbanSquare className="h-5 w-5" />,
  },
  {
    href: '/admin/properties',
    title: 'Inventory & Freshness',
    desc: 'Verified / stale / sold toggles · se_code uniqueness · freshness ≥ 90%',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/admin/leads',
    title: 'Leads & AI Matchmaker',
    desc: 'Lead scoring · pgvector semantic matches · recommendation dispatch',
    icon: <Users className="h-5 w-5" />,
  },
  {
    href: '/admin/bots',
    title: 'AI COO · 10-Bot Desk',
    desc: 'Webhook ledger · raw scrape data · Scribe, Curator & Stage-9 Closer',
    icon: <Bot className="h-5 w-5" />,
  },
  {
    href: '/admin/applicants',
    title: 'Recruitment',
    desc: 'Applicant workflow · CV inspection · candidate onboarding',
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    href: '/admin/console',
    title: 'Intelligence OS Console',
    desc: 'Legacy full portal — workflows, viewings, contracts, memory brain',
    icon: <ClipboardList className="h-5 w-5" />,
  },
];

export default function CommandCenterOverview() {
  const { data, loading, error, unauthorized, reload } = useAdminApi<OverviewData>(
    '/api/admin/overview',
  );

  // Periodic refresh — the overview is a wallboard.
  useEffect(() => {
    const id = setInterval(reload, 30_000);
    return () => clearInterval(id);
  }, [reload]);

  if (unauthorized) {
    return (
      <CcPageShell eyebrow="Sierra Estates · Command Center" title="Unified Overview">
        <CcUnauthorized />
      </CcPageShell>
    );
  }

  const k = data?.kpis;
  const maxStageValue = Math.max(1, ...(data?.pipelineByStage ?? []).map((s) => s.value));

  return (
    <CcPageShell
      eyebrow="Sierra Estates · Unified Admin Command Center"
      title="Command Overview"
      subtitle="Every operational surface of sierra-estates.net in one glass console — deals, demand, inventory freshness and the AI agent fleet, live from Supabase."
      actions={
        <>
          <CcRealtimeBadge connected={!error && !loading} />
          <CcButton variant="gold" onClick={reload} loading={loading}>
            <Activity className="h-4 w-4" aria-hidden /> Refresh
          </CcButton>
        </>
      }
    >
      {error && !data ? (
        <CcError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <CcSkeletonGrid count={5} />
      ) : !k ? null : (
        <>
          {/* ── The five KPI widgets ─────────────────────────────────────── */}
          <section aria-label="Headline KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CcKpi
              label="Total Deals Value"
              value={formatCurrency(k.totalDealsValue)}
              sub={`${formatNumber(k.activeDealsCount)} active · ${formatCurrency(k.closedWonValue, 'EGP')} won`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="gold"
              href="/admin/pipeline"
            />
            <CcKpi
              label="Active Leads"
              value={formatNumber(k.activeLeads)}
              sub={`+${formatNumber(k.newLeads7d)} new (7d) · ${formatNumber(k.hotLeads)} hot (score ≥ 80)`}
              icon={<Users className="h-5 w-5" />}
              tone="azure"
              href="/admin/leads"
            />
            <CcKpi
              label="Verified Properties"
              value={formatNumber(k.verifiedProperties)}
              sub={`${formatNumber(k.staleListings)} stale of ${formatNumber(k.totalListings)} listings`}
              icon={<Gem className="h-5 w-5" />}
              tone="green"
              href="/admin/properties"
            />
            <CcKpi
              label="Inventory Freshness"
              value={`${k.inventoryFreshnessScore}%`}
              sub={`${formatNumber(k.freshOver90)} listings at ≥ 90% freshness`}
              icon={<Sparkles className="h-5 w-5" />}
              tone={k.inventoryFreshnessScore >= 90 ? 'green' : k.inventoryFreshnessScore >= 60 ? 'gold' : 'neutral'}
              progress={k.inventoryFreshnessScore}
              href="/admin/properties"
            />
            <CcKpi
              label="Active Bot Status"
              value={`${k.bots.active}/${Math.max(k.bots.total, k.bots.enabled) || 0}`}
              sub={
                k.bots.erroring > 0
                  ? `${k.bots.erroring} erroring — investigate on the desk`
                  : k.bots.active > 0
                    ? 'Agent fleet operational'
                    : 'Fleet idle — trigger a workflow on the desk'
              }
              icon={<Bot className="h-5 w-5" />}
              tone={k.bots.erroring > 0 ? 'neutral' : k.bots.active > 0 ? 'green' : 'gold'}
              href="/admin/bots"
            />
          </section>

          {/* ── Command navigation ────────────────────────────────────────── */}
          <section aria-label="Command navigation" className="mt-8">
            <h2 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#f5f3ec]/40">
              Command Surfaces
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {NAV_SECTIONS.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="cc-glass cc-glass-hover group flex items-start gap-4 p-5 no-underline"
                >
                  <span className="mt-0.5 rounded-xl border border-gold-500/25 bg-gold-500/10 p-2.5 text-gold-400 transition group-hover:border-gold-500/50">
                    {section.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#f5f3ec]">{section.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#f5f3ec]/50">
                      {section.desc}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* ── Deals pipeline strip ─────────────────────────────────────── */}
            <CcCard className="p-6 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5f3ec]/60">
                  Deal Value by Stage
                </h2>
                <Link href="/admin/pipeline" className="text-xs text-gold-400 no-underline hover:text-gold-300">
                  Open pipeline →
                </Link>
              </div>
              <div className="space-y-3">
                {(data?.pipelineByStage ?? []).map((row) => {
                  const closed = (CLOSED_STAGES as readonly string[]).includes(row.stage);
                  const pct = Math.round((row.value / maxStageValue) * 100);
                  return (
                    <div key={row.stage} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-right text-[0.7rem] font-medium uppercase tracking-wide text-[#f5f3ec]/45">
                        {row.stage.replace(/_/g, ' ')}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-lg bg-white/[0.04]">
                        <div
                          className="flex h-full items-center justify-end rounded-lg pr-2 transition-all duration-700"
                          style={{
                            width: `${Math.max(pct, row.value > 0 ? 6 : 0)}%`,
                            background: closed
                              ? 'linear-gradient(90deg, rgba(52,211,153,0.35), rgba(52,211,153,0.15))'
                              : 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.16))',
                            border: closed ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(212,175,55,0.4)',
                          }}
                        >
                          {row.value > 0 && (
                            <span className="cc-num text-[0.65rem] font-semibold text-[#f5f3ec]/85">
                              {formatCurrency(row.value, '')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="cc-num w-10 text-right text-[0.7rem] text-[#f5f3ec]/40">
                        {row.count}
                      </span>
                    </div>
                  );
                })}
                {(!data?.pipelineByStage || data.pipelineByStage.length === 0) && (
                  <CcEmpty title="No deals yet" hint="Create deals from the pipeline board or the CRM." />
                )}
              </div>
              <p className="mt-4 text-[0.68rem] text-[#f5f3ec]/35">
                {DEAL_STAGES.length}-stage deal vocabulary · gold = active pipeline · green = closed
              </p>
            </CcCard>

            {/* ── Activity + webhook ledger ────────────────────────────────── */}
            <div className="space-y-6">
              <CcCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5f3ec]/60">
                    Operational Feed
                  </h2>
                  <Radio className="h-4 w-4 text-gold-500/60" aria-hidden />
                </div>
                <ul className="cc-scroll max-h-72 space-y-3 overflow-y-auto pr-1">
                  {(data?.recentActivity ?? []).map((row, idx) => (
                    <li key={String(row.id ?? idx)} className="border-b border-white/[0.05] pb-3 last:border-0">
                      <p className="text-xs leading-relaxed text-[#f5f3ec]/75">
                        {String(row.text ?? row.description ?? '—')}
                      </p>
                      <p className="mt-1 text-[0.65rem] text-[#f5f3ec]/35">
                        {timeAgo(row.createdAt)} · {String(row.type ?? 'activity')}
                      </p>
                    </li>
                  ))}
                  {(!data?.recentActivity || data.recentActivity.length === 0) && (
                    <CcEmpty title="No activity yet" hint="Bot runs and inventory events will appear here." />
                  )}
                </ul>
              </CcCard>

              <CcCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5f3ec]/60">
                    Webhooks · 24h
                  </h2>
                  <Webhook className="h-4 w-4 text-gold-500/60" aria-hidden />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'WhatsApp', value: data?.webhookStats.last24h.whatsapp ?? 0, tone: 'green' as const },
                    { label: 'Telegram', value: data?.webhookStats.last24h.telegram ?? 0, tone: 'azure' as const },
                    { label: 'Errors', value: data?.webhookStats.last24h.errors ?? 0, tone: 'red' as const },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                      <p className="cc-num text-lg font-semibold text-[#f5f3ec]">{formatNumber(stat.value)}</p>
                      <div className="mt-1.5 flex justify-center">
                        <CcPill tone={stat.tone}>{stat.label}</CcPill>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.65rem] text-[#f5f3ec]/35">
                  Inbound ledger (migration 037) · {formatNumber(data?.webhookStats.last24h.total ?? 0)} events ·
                  tailed live on the bot desk
                </p>
              </CcCard>
            </div>
          </div>

          <p className="mt-8 text-center text-[0.65rem] text-[#f5f3ec]/25">
            Sierra Estates · Unified Admin Command Center · data as of{' '}
            {data ? new Date(data.generatedAt).toLocaleTimeString('en-GB') : '—'}
          </p>
        </>
      )}
    </CcPageShell>
  );
}
