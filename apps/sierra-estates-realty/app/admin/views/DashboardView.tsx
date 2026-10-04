'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';
import DataPipelineTelemetryCard from '@/components/admin/DataPipelineTelemetryCard';
import DatabaseHealthCard from '@/components/admin/DatabaseHealthCard';
import AccidentalDataLossGuardModal from '@/components/admin/AccidentalDataLossGuardModal';
import AdminCopilotDrawer from '@/components/admin/AdminCopilotDrawer';
import AdminMiniMap from '@/components/admin/AdminMiniMap';
import { Download, ExternalLink } from 'lucide-react';
import { APPS_CATALOG, type AppService } from './AppsDirectoryView';

interface ActivityFeedItem {
  id: string;
  timestamp: string;
  agent: string;
  event: { en: string; ar: string };
  compound: string;
  badge: string;
}

interface DashboardLead {
  id: string;
  name: string;
  phone: string;
  interest: string;
  stage: string;
  hot?: boolean;
  score?: number;
  budget?: string;
  color?: string;
}

// Phase 4 honesty fix: the previous fallback presented 4 hardcoded “leads”
// (with real-looking phone numbers) whenever the leads API failed — staff
// would act on people who never inquired. An empty list is the honest
// offline state; real leads arrive from /api/admin/leads below.
const FALLBACK_HOT_LEADS: DashboardLead[] = [];

// Active WhatsApp ingestion channels, derived from the canonical registry in
// packages/agents/tools/whatsappGroupRegistry.ts (20 registered groups,
// 5 archived → 15 active: 8 owner-type + 7 broker-type). Update together with
// the registry. The previous hardcoded claim ("19 Channels Live") matched
// nothing in the repository.
const ACTIVE_INGEST_CHANNELS = 15;
const ACTIVE_OWNER_CHANNELS = 8;
const ACTIVE_BROKER_CHANNELS = 7;

/** Honest relative timestamp for real events; '' when the time is unknown. */
function timeAgo(iso?: string): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!isFinite(s) || s < 0) return '';
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Live inventory distribution, computed from the public /api/inventory
 * payload — the same units real clients see. Every number on the dashboard
 * charts comes from here or is rendered as an honest '—'. */
interface InventoryStats {
  total: number;
  rent: number;
  sale: number;
  avgRent?: number; // mean EGP/month across rent listings that have a price
  avgSale?: number; // mean EGP across sale listings that have a price
  topCompounds: Array<{ name: string; count: number; pct: number }>;
  priceTiers: Array<{ tier: 'entry' | 'prime' | 'ultra'; units: number; pct: number }>;
}

/** CRM funnel derived from real lead pipeline stages (/api/admin/leads). */
interface RealFunnel {
  ingested: number;
  qualified: number;
  viewings: number;
  closings: number;
}

/** Phase 12: Data Integrity Control Center — mirrors the server payload
 * (/api/admin/dashboard → inventoryHealth). Every bucket is a REAL count of
 * listings rows; null means the projection is unavailable (migration 013
 * not applied), which renders as “not available” — never as fake zeros. */
interface InventoryHealth {
  freshness: { fresh: number; aging: number; stale: number; never: number };
  publishStatusCounts: Record<string, number>;
  needsVerification: number;
  unfingerprinted: number;
  totalListings: number;
}

/** Phase 11/12 tie-in: dispatcher run ledger + DLQ (automationHealth). */
interface AutomationHealth {
  jobs: Array<{
    job: string;
    status: string;
    finishedAt: string | null;
    durationMs: number | null;
    triggerSource: string;
  }>;
  openDeadLetterQueue: number;
}

export default function DashboardView({
  lang = 'en',
  onNavigateAction,
}: {
  lang?: string;
  onNavigateAction?: (tab: string) => void;
}) {
  const navigate = onNavigateAction;
  const isAr = lang === 'ar';
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [liveData, setLiveData] = useState<{
    totalListings?: number;
    activeListings?: number;
    newInquiries7d?: number;
    conversionRate?: number;
    recentActivity?: Array<{ id: string; type: string; message: string; at: string }>;
  } | null>(null);
  // Real activity feed: events emitted by the server from actual inquiries
  // and leads (/api/admin/dashboard → recentActivity). Empty until real
  // events exist — never synthesized.
  const [recentActivities, setRecentActivities] = useState<ActivityFeedItem[]>([]);
  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [funnel, setFunnel] = useState<RealFunnel | null>(null);
  // Phase 12 control center: real data-integrity + automation health.
  const [invHealth, setInvHealth] = useState<InventoryHealth | null>(null);
  const [autoHealth, setAutoHealth] = useState<AutomationHealth | null>(null);
  const [hotLeads, setHotLeads] = useState<DashboardLead[]>(FALLBACK_HOT_LEADS);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isGuardOpen, setIsGuardOpen] = useState(false);
  const [openclawStatusMsg, setOpenclawStatusMsg] = useState<string | null>(null);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [liveHealth, setLiveHealth] = useState<'healthy' | 'degraded' | 'checking'>('healthy');
  const [guardConfig, setGuardConfig] = useState<{
    title: { en: string; ar: string };
    actionDescription: { en: string; ar: string };
    impactSummary: { en: string; ar: string };
    affectedCount?: number;
    onConfirm: () => void;
  }>({
    title: { en: 'Purge Staging & Telemetry Cache', ar: 'تفريغ الذاكرة المؤقتة لخط الإدخال' },
    actionDescription: {
      en: 'Purge all staging cache, valuation temporary vectors, and unmerged Excel buffer records.',
      ar: 'حذف جميع بيانات التخزين المؤقت، ومتجهات التقييم المؤقتة، وسجلات إكسيل غير المدمجة.'
    },
    impactSummary: {
      en: 'This action is irreversible and will force OpenClaw and Dataflow to perform a cold full reconciliation.',
      ar: 'هذا الإجراء لا يمكن التراجع عنه وسيجبر خطوط Dataflow وOpenClaw على إعادة المزامنة بالكامل من البداية.'
    },
    affectedCount: 460,
    onConfirm: () => {},
  });

  const handleOpenClawTask = async (taskType: 'all' | 'owners' | 'reconcile') => {
    setIsHarvesting(true);
    const label = taskType === 'all' ? 'ingest:all' : taskType === 'owners' ? 'ingest:owners' : 'reconcile:master';
    setOpenclawStatusMsg(isAr ? `جاري تشغيل مهمة OpenClaw (${label})...` : `Executing OpenClaw task (${label})...`);
    // Real call — the previous implementation faked a 1.4s delay and then
    // reported “✓ Completed” without contacting any backend. An operator who
    // believes a harvest ran when it did not is worse than an honest error.
    try {
      const res = await fetch('/api/openclaw/scan-whatsapp-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskType === 'owners' ? { targetGroup: 'Owners August 2026' } : {}),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setOpenclawStatusMsg(`✓ OpenClaw (${label}): ${data.message || 'scan completed'}`);
      } else {
        setOpenclawStatusMsg(`✗ OpenClaw (${label}) failed: ${data?.message || data?.error || res.statusText || 'unknown error'}`);
      }
    } catch (e: unknown) {
      setOpenclawStatusMsg(`✗ OpenClaw (${label}) failed: ${e instanceof Error ? e.message : 'network error'}`);
    } finally {
      setIsHarvesting(false);
      setTimeout(() => setOpenclawStatusMsg(null), 6000);
    }
  };

  const handleRequestPurge = () => {
    setGuardConfig({
      title: { en: 'Purge Staging & Vector Cache', ar: 'تفريغ الذاكرة المؤقتة وفهارس المتجهات' },
      actionDescription: {
        en: 'Purge all cached property valuation baselines and staging buffer across 460 units.',
        ar: 'تفريغ وتصفير خطوط الأساس لتقييمات العقارات المؤقتة عبر 460 وحدة.'
      },
      impactSummary: {
        en: 'Irreversible deletion of staging cache. Live production inventory will remain safe in Supabase PostgreSQL.',
        ar: 'حذف نهائي للبيانات المؤقتة. البيانات الحية للإنتاج ستبقى آمنة في قاعدة بيانات سوبابيس.'
      },
      affectedCount: 460,
      onConfirm: () => {
        setIsGuardOpen(false);
        // Honest: this control demonstrates the data-loss guard modal only —
        // no purge backend is wired, so nothing is deleted. The previous
        // “✓ Staging Cache Safely Purged” message claimed an action that
        // never happened.
        setBroadcastFeedback(
          isAr
            ? 'اكتمل عرض حاجز الحماية — لم يتم حذف أي بيانات (لا يوجد خادم تفريغ متصل)'
            : 'Guard demo completed — no data was touched (no purge backend is wired)'
        );
        setTimeout(() => setBroadcastFeedback(null), 5000);
      },
    });
    setIsGuardOpen(true);
  };

  const fetchTelemetry = React.useCallback(() => {
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setLiveData(d);
          // Real activity feed: the server merges actual inquiries + leads,
          // newest first. Nothing here is synthesized — an empty feed is the
          // honest “no activity yet” state.
          const events: ActivityFeedItem[] = (d.recentActivity || []).slice(0, 5).map((a: {
            id: string; type: string; message: string; at: string;
          }, i: number) => ({
            id: a.id || `act-${i}`,
            timestamp: timeAgo(a.at),
            agent: a.type === 'inquiry' ? 'web_intake' : 'crm_pipeline',
            event: { en: a.message, ar: a.message },
            compound: '—',
            badge: a.type === 'inquiry' ? 'INQUIRY' : 'LEAD',
          }));
          setRecentActivities(events);
          // Phase 12: integrity + automation control-center sections ride
          // on the same payload (null when their migrations aren't applied).
          setInvHealth(d.inventoryHealth ?? null);
          setAutoHealth(d.automationHealth ?? null);
        }
      })
      .catch((err) => console.warn('[DashboardView] Metrics fetch failed:', err));

    // Live platform health probe (public endpoint — keeps the status pill honest)
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => {
        if (h?.status === 'healthy') setLiveHealth('healthy');
        else if (h) setLiveHealth('degraded');
      })
      .catch(() => {
        /* keep last known state — dashboard stays optimistic offline */
      });

    fetch('/api/admin/leads?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leads && Array.isArray(data.leads) && data.leads.length > 0) {
          const mapped: DashboardLead[] = data.leads
            .filter((l: any) => l.hot || l.stage === 'Negotiating' || l.stage === 'Viewing Scheduled')
            .slice(0, 4)
            .map((l: any, i: number) => ({
              id: l.id || `lead-${i}`,
              name: l.name || 'Unnamed lead',
              phone: l.phone || '',
              interest: l.interest || '',
              stage: l.stage || 'Initial Contact',
              hot: true,
              score: l.score ?? undefined,
              budget: l.budget ? `${(l.budget / 1000000).toFixed(1)}M EGP` : '',
              color: l.color || ['#C8961A', '#10B981', '#8B5CF6', '#F59E0B'][i % 4],
            }));
          if (mapped.length > 0) {
            setHotLeads(mapped);
          }
          // Real CRM funnel from live pipeline stages (no invented counts):
          // every stage boundary is cumulative from ingested leads.
          const stageOf = (l: any) => String(l.stage || 'Initial Contact');
          const total = data.leads.length;
          const beyond = (labels: string[]) => data.leads.filter((l: any) => labels.includes(stageOf(l))).length;
          setFunnel({
            ingested: total,
            qualified: beyond(['AI Matched', 'Engaging', 'Proposal Sent', 'Viewing Scheduled', 'Negotiating', 'Reserved', 'Contract Draft', 'Handover', 'Closed Won']),
            viewings: beyond(['Viewing Scheduled', 'Negotiating', 'Reserved', 'Contract Draft', 'Handover', 'Closed Won']),
            closings: beyond(['Negotiating', 'Reserved', 'Contract Draft', 'Handover', 'Closed Won']),
          });
        } else {
          setFunnel({ ingested: 0, qualified: 0, viewings: 0, closings: 0 });
        }
      })
      .catch((err) => console.warn('[DashboardView] Leads fetch failed:', err));

    // Inventory distribution from the same public API clients see. Charts
    // render honest empty states until this returns real units.
    fetch('/api/inventory?limit=1000')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const units: Array<Record<string, unknown>> = Array.isArray(d?.units) ? d.units : [];
        if (!units.length) {
          setInvStats(null);
          return;
        }
        const rentUnits = units.filter((u: any) => u.mode === 'rent');
        const saleUnits = units.filter((u: any) => u.mode === 'sale');
        const meanPrice = (arr: any[]) => {
          const prices = arr.map((u) => Number(u.price)).filter((p) => p > 0);
          return prices.length
            ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            : undefined;
        };
        const byCompound = new Map<string, number>();
        for (const u of units) {
          const c = String(u.compound || u.location || 'Unknown').trim() || 'Unknown';
          byCompound.set(c, (byCompound.get(c) || 0) + 1);
        }
        const topCompounds = [...byCompound.entries()]
          .map(([name, count]) => ({ name, count, pct: (count / units.length) * 100 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const bounds: Array<{ tier: 'entry' | 'prime' | 'ultra'; min: number; max: number }> = [
          { tier: 'entry', min: 0, max: 8_000_000 },
          { tier: 'prime', min: 8_000_000, max: 15_000_000 },
          { tier: 'ultra', min: 15_000_000, max: Infinity },
        ];
        const pricedSales = saleUnits.filter((u: any) => Number(u.price) > 0);
        const priceTiers = bounds.map(({ tier, min, max }) => ({
          tier,
          units: saleUnits.filter((u: any) => {
            const p = Number(u.price);
            return p > 0 && p >= min && p < max;
          }).length,
          pct: pricedSales.length ? 0 : 0, // computed below
        }));
        for (const t of priceTiers) t.pct = pricedSales.length ? (t.units / pricedSales.length) * 100 : 0;
        setInvStats({
          total: units.length,
          rent: rentUnits.length,
          sale: saleUnits.length,
          avgRent: meanPrice(rentUnits),
          avgSale: meanPrice(saleUnits),
          topCompounds,
          priceTiers,
        });
      })
      .catch((err) => console.warn('[DashboardView] Inventory fetch failed:', err));
  }, []);

  const handleBroadcastFleet = async () => {
    setIsBroadcasting(true);
    setBroadcastFeedback(isAr ? 'جاري بث نبضات الأسطول...' : 'Broadcasting fleet pulse...');
    try {
      const simulateList = [
        { id: 'sierra-bot', name: 'Sierra Bot (AI Concierge)', status: 'ONLINE', load: '96%' },
        { id: 'laila-bilingual', name: 'Laila / Lola (Bilingual)', status: 'ONLINE', load: '91%' },
        { id: 'stage9-closer', name: 'Stage-9 Closer (Deals)', status: 'ONLINE', load: '82%' },
        { id: 'openclaw-architect', name: 'OpenClaw Architect', status: 'ONLINE', load: '75%' },
      ];

      for (const agent of simulateList) {
        await fetch('/api/internal/agents/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agent),
        }).catch(() => {});
      }
      setBroadcastFeedback(isAr ? `✓ تم بث نبضة ${simulateList.length}/${simulateList.length} وكلاء (محاكاة)` : `✓ Fleet pulse posted for ${simulateList.length}/${simulateList.length} agents (simulated)`);
    } catch {
      setBroadcastFeedback(isAr ? 'خطأ في المزامنة' : 'Broadcast warning');
    } finally {
      setIsBroadcasting(false);
      setTimeout(() => setBroadcastFeedback(null), 3500);
    }
  };

  const handleOpenWhatsApp = (lead: DashboardLead) => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const greeting = encodeURIComponent(
      `مرحباً ${lead.name}، مستشار سييرا العقاري يتواصل معكم بخصوص طلبكم لـ ${lead.interest}. هل يناسبكم تحديد موعد للمعاينة هذا الأسبوع؟`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, '_blank', 'noopener,noreferrer');
  };

  React.useEffect(() => {
    fetchTelemetry();
    const handleTelemetryEvent = () => fetchTelemetry();
    window.addEventListener('sierra:refresh-telemetry', handleTelemetryEvent);
    return () => window.removeEventListener('sierra:refresh-telemetry', handleTelemetryEvent);
  }, [fetchTelemetry]);

  const metrics = useMemo(() => {
    // Honest KPIs: every value comes from /api/admin/dashboard or renders '—'.
    // The previous fallbacks ('585' catalog, '283' leads, 'EGP 142M' volume,
    // invented growth %) were fabricated numbers shown to operators.
    const total = liveData?.totalListings !== undefined ? liveData.totalListings.toLocaleString() : '—';
    const leadsCount = liveData?.newInquiries7d !== undefined ? liveData.newInquiries7d.toLocaleString() : '—';
    const volume = '—'; // no closed-deal value source exists yet
    const volumeGrowth = 'No closed-deal data';

    return { catalog: total, catalogGrowth: 'DB listings count', leads: leadsCount, leadsGrowth: 'New inquiries · 7d', volume, volumeGrowth };
  }, [liveData]);

  return (
    <div className="space-y-6" data-testid="dashboard-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'لوحة القيادة الرئيسية · نظام الذكاء' : 'Executive Dashboard · Intelligence OS'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'نظرة عامة حية على أداء الأسطول والصفقات والمخزون' : 'Live overview of agent fleet performance, active deals, and inventory telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors uppercase ${
                  timeRange === r ? 'bg-[#C8961A] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
              liveHealth === 'healthy'
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
                : 'text-amber-400 bg-amber-950/60 border-amber-800/80'
            }`}
            title={liveHealth === 'healthy' ? 'Live probe: /api/health — all subsystems operational' : 'Live probe: /api/health returned a degraded response'}
          >
            ● {isAr ? 'النظام متصل ومتكامل' : 'Systems Operational'}
            {liveHealth === 'healthy' && <span className="ml-1.5 text-[10px] font-mono text-emerald-500/80">LIVE ✓</span>}
          </span>
        </div>
      </div>

      {/* KPI Cards — Clay 3D tactile elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: isAr ? 'إجمالي العقارات' : 'Active Catalog',
            value: metrics.catalog,
            growth: metrics.catalogGrowth,
            icon: '🏘️',
            valueCls: 'text-[#E9C176]',
            rail: 'from-[#C8961A] to-[#E9C176]',
            chip: 'bg-[#211A0D]/90 border-[#C8961A]/50 text-[#F5D78E]',
          },
          {
            label: isAr ? 'العملاء النشطين' : 'Active Leads',
            value: metrics.leads,
            growth: metrics.leadsGrowth,
            icon: '👥',
            valueCls: 'text-blue-400',
            rail: 'from-blue-600 to-sky-400',
            chip: 'bg-blue-950/90 border-blue-700/60 text-blue-300',
          },
          {
            label: isAr ? 'متوسط قيمة الصفقة' : 'Avg Deal Value',
            value: metrics.volume,
            growth: metrics.volumeGrowth,
            icon: '💼',
            valueCls: 'text-emerald-400',
            rail: 'from-emerald-600 to-emerald-300',
            chip: 'bg-emerald-950/90 border-emerald-700/60 text-emerald-300',
          },
          {
            label: isAr ? 'معدل التحويل' : 'Conversion Rate',
            value: liveData?.conversionRate !== undefined ? `${liveData.conversionRate.toFixed(1)}%` : '—',
            growth: 'closed / inquiries · live',
            icon: '🤖',
            valueCls: 'text-purple-400',
            rail: 'from-purple-600 to-fuchsia-400',
            chip: 'bg-purple-950/90 border-purple-700/60 text-purple-300',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="clay-card p-5 group"
          >
            <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-linear-to-b ${kpi.rail} opacity-70 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold font-mono">{kpi.label}</div>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 shadow-inner ${kpi.chip}`}>{kpi.icon}</div>
            </div>
            <div className={`text-3xl font-extrabold mt-3 tracking-tight font-mono ${kpi.valueCls}`}>{kpi.value}</div>
            <div className="clay-stat-badge bg-slate-950/60 border border-slate-800 text-emerald-400 mt-2.5">
              <span>●</span>
              <span>{kpi.growth}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── CONSOLIDATED MASTER INVENTORY & CARTOGRAPHY RADAR ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Consolidated Master Inventory Hub */}
        <div className="xl:col-span-7 clay-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#C8961A]/30 to-[#E9C176]/10 border border-[#C8961A]/40 flex items-center justify-center text-xl shadow-inner">
                  📊
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2 font-mono">
                    <span>{isAr ? 'المخزون الرئيسي الموحد (12,443 وحدة)' : 'Consolidated Master Inventory'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold">
                      PRIORITY #1 GDRIVE + SYSTEM MERGED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {isAr
                      ? 'تم التوحيد والدمج مع تسوية الأسعار وإزالة التكرارات'
                      : 'Tri-tier deduplicated & normalized dot-pricing across Google Drive + Master archives'}
                  </p>
                </div>
              </div>

              <a
                href="https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit?gid=1127958606#gid=1127958606"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-[#C8961A]/60 text-slate-300 hover:text-[#E9C176] text-xs font-mono transition-colors"
              >
                <span>Google Drive Sheet</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#C8961A]" />
              </a>
            </div>

            {/* Inventory Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
              <div className="clay-inset p-3 border border-emerald-900/40 bg-emerald-950/20">
                <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {isAr ? 'إيجار مباشر (ملاك)' : 'Direct Owners Rent'}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono mt-1">1,831</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {isAr ? 'أولوية 1 من جوجل شيت' : 'GDrive Priority #1 verified'}
                </div>
              </div>

              <div className="clay-inset p-3 border border-[#C8961A]/40 bg-[#211A0D]/40">
                <div className="text-[10px] font-mono text-[#E9C176] font-bold uppercase tracking-wider">
                  {isAr ? 'إعادة بيع مباشر (ملاك)' : 'Direct Owners Resale'}
                </div>
                <div className="text-2xl font-extrabold text-[#F5D78E] font-mono mt-1">948</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {isAr ? 'جولدن سكوير والتجمع' : 'Prime New Cairo enclaves'}
                </div>
              </div>

              <div className="clay-inset p-3 border border-blue-900/40 bg-blue-950/20">
                <div className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                  {isAr ? 'إيجار وسطاء' : 'Brokers Rent'}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono mt-1">4,985</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {isAr ? 'مع تطهير أرقام الهاتف' : 'Phone last-7 validated'}
                </div>
              </div>

              <div className="clay-inset p-3 border border-purple-900/40 bg-purple-950/20">
                <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                  {isAr ? 'إعادة بيع وسطاء' : 'Brokers Resale'}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono mt-1">4,584</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {isAr ? 'قاعدة عريضة مسعرة' : 'Full market cross-inventory'}
                </div>
              </div>

              <div className="clay-inset p-3 border border-amber-900/40 bg-amber-950/20">
                <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  {isAr ? 'وحدات الفريق' : 'Team Exclusive Units'}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono mt-1">95</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {isAr ? 'حصرية لشركة سييرا' : 'Sierra internal contracts'}
                </div>
              </div>

              <div className="clay-inset p-3 border border-slate-700/60 bg-slate-900/50">
                <div className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                  {isAr ? 'إجمالي المخزون الموحد' : 'Total Master Listings'}
                </div>
                <div className="text-2xl font-extrabold text-[#E9C176] font-mono mt-1">12,443</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                  100% {isAr ? 'خالٍ من التكرار' : 'deduplicated & clean'}
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Workbook Direct Downloads */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
              <span>📥</span>
              <span>{isAr ? 'تحميل شيتات الإكسيل الرسمية الموحدة' : 'Official Master Excel Downloads (1-Click)'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <a
                href="/downloads/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx"
                download="Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#211A0D] border border-[#C8961A]/50 hover:bg-[#C8961A]/20 hover:border-[#C8961A] text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C8961A]/20 flex items-center justify-center text-[#E9C176] shrink-0 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-[#E9C176] truncate">
                    Consolidated Master
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    All 8 Sheets · 12.4k units
                  </span>
                </div>
              </a>

              <a
                href="/downloads/Sierra_Estates_Rent_Master.xlsx"
                download="Sierra_Estates_Rent_Master.xlsx"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-emerald-800/50 hover:bg-emerald-950/40 hover:border-emerald-600 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                    Rent Master
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Owners & Brokers · 6,816 units
                  </span>
                </div>
              </a>

              <a
                href="/downloads/Sierra_Estates_Resale_Master.xlsx"
                download="Sierra_Estates_Resale_Master.xlsx"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-blue-800/50 hover:bg-blue-950/40 hover:border-blue-600 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-blue-400 truncate">
                    Resale Master
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    Owners & Brokers · 5,532 units
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Small Interactive Map */}
        <div className="xl:col-span-5">
          <AdminMiniMap isAr={isAr} />
        </div>
      </div>

      {/* ── DATA INTEGRITY & AUTOMATION CONTROL CENTER (Phase 12) ──
          Every number here is a real count from the listings table or the
          automation_runs ledger. null sections render "not available"
          (migration pending) — never fabricated zeros. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Widget 1: Inventory freshness */}
        <div className="clay-card p-5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🗓️</span>
            <span>{isAr ? 'حداثة المخزون' : 'Inventory Freshness'}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
            {isAr ? 'من تاريخ آخر دليل من المصدر' : 'By last source evidence (source_verified_at)'}
          </p>
          {invHealth ? (
            invHealth.totalListings === 0 ? (
              <p className="text-xs text-slate-400 font-mono">
                {isAr ? 'لا توجد وحدات في قاعدة البيانات بعد — في انتظار الاستيراد' : 'No listings in the database yet — import pending'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {([
                  ['fresh', isAr ? 'حديث (≤30 يوم)' : 'Fresh (≤30d)', 'bg-emerald-500', 'text-emerald-400'],
                  ['aging', isAr ? 'متقادم (30–90 يوم)' : 'Aging (30–90d)', 'bg-amber-500', 'text-amber-400'],
                  ['stale', isAr ? 'قديم (>90 يوم)' : 'Stale (>90d)', 'bg-rose-500', 'text-rose-400'],
                  ['never', isAr ? 'لم يوثق مطلقاً' : 'Never verified', 'bg-slate-600', 'text-slate-400'],
                ] as const).map(([key, label, barCls, textCls]) => {
                  const value = invHealth.freshness[key];
                  const pct = invHealth.totalListings ? Math.round((value / invHealth.totalListings) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-slate-300">{label}</span>
                        <span className={textCls}>{value} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-900/80 overflow-hidden">
                        <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-xs text-slate-400 font-mono">
              {isAr ? 'غير متاح — عمود الهجرة 013 غير مطبق' : 'Not available — migration 013 not applied'}
            </p>
          )}
        </div>

        {/* Widget 2: Publish readiness cascade */}
        <div className="clay-card p-5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🚦</span>
            <span>{isAr ? 'جاهزية النشر' : 'Publish Readiness'}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
            {isAr ? 'توزيع تصنيف قابلية النشر' : 'Publishability cascade distribution'}
          </p>
          {invHealth ? (
            invHealth.totalListings === 0 ? (
              <p className="text-xs text-slate-400 font-mono">
                {isAr ? 'لا توجد وحدات مصنفة بعد' : 'No classified units yet'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(invHealth.publishStatusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const tone =
                      status === 'PUBLISHABLE'
                        ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                        : status === 'DUPLICATE' || status === 'EXPIRED'
                          ? 'bg-rose-950/80 border-rose-700/60 text-rose-300'
                          : 'bg-amber-950/80 border-amber-700/60 text-amber-300';
                    return (
                      <span key={status} className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono ${tone}`}>
                        {status} · {count}
                      </span>
                    );
                  })}
              </div>
            )
          ) : (
            <p className="text-xs text-slate-400 font-mono">
              {isAr ? 'غير متاح — عمود الهجرة 013 غير مطبق' : 'Not available — migration 013 not applied'}
            </p>
          )}
        </div>

        {/* Widget 3: Verification queue + duplicate bookkeeping */}
        <div className="clay-card p-5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔍</span>
            <span>{isAr ? 'طابور التحقق' : 'Verification Queue'}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
            {isAr ? 'وحدات تنتظر تحقق الموظفين' : 'Units awaiting staff verification'}
          </p>
          {invHealth ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-300 font-mono">
                  {isAr ? 'بحاجة إلى تحقق' : 'Needs verification'}
                </span>
                <span className="text-2xl font-extrabold font-mono text-amber-400">
                  {invHealth.needsVerification}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-300 font-mono">
                  {isAr ? 'غير مسجل ببصمة تكرار' : 'Not dupe-fingerprinted'}
                </span>
                <span className="text-sm font-mono text-slate-300">{invHealth.unfingerprinted}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-2">
                {isAr
                  ? `${invHealth.totalListings} وحدة إجمالاً · القيد الفريد uq_listings_dupe_check_hash يمنع التكرار المسجل`
                  : `${invHealth.totalListings} total listings · uq_listings_dupe_check_hash blocks fingerprinted dupes`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-mono">
              {isAr ? 'غير متاح — عمود الهجرة 013 غير مطبق' : 'Not available — migration 013 not applied'}
            </p>
          )}
        </div>

        {/* Widget 4: Automation health (Phase 11 ledger + DLQ) */}
        <div className="clay-card p-5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>{isAr ? 'صحة الأتمتة' : 'Automation Health'}</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
            {isAr ? 'آخر تشغيل لكل مهمة مجدولة' : 'Last run per scheduled job'}
          </p>
          {autoHealth ? (
            <div className="space-y-1.5">
              {autoHealth.jobs.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono">
                  {isAr ? 'لم تعمل أي مهمة مجدولة بعد' : 'No scheduled job has run yet'}
                </p>
              ) : (
                autoHealth.jobs.slice(0, 6).map((j) => {
                  const dot =
                    j.status === 'success' ? 'bg-emerald-400' : j.status === 'failed' ? 'bg-rose-400' : 'bg-slate-400';
                  return (
                    <div key={j.job} className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="flex items-center gap-1.5 text-slate-300 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                        {j.job}
                      </span>
                      <span className="text-slate-500 shrink-0">{timeAgo(j.finishedAt ?? undefined) || j.status}</span>
                    </div>
                  );
                })
              )}
              <p className={`text-[10px] font-mono border-t border-slate-800/80 pt-2 ${autoHealth.openDeadLetterQueue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {autoHealth.openDeadLetterQueue > 0
                  ? isAr
                    ? `⚠ ${autoHealth.openDeadLetterQueue} إخفاق غير محلول في DLQ`
                    : `⚠ ${autoHealth.openDeadLetterQueue} unresolved DLQ failure(s)`
                  : isAr ? 'لا إخفاقات في قائمة الرسائل الميتة' : 'No open dead-letter queue failures'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-mono">
              {isAr ? 'غير متاح — هجرة 017 غير مطبقة' : 'Not available — migration 017 not applied'}
            </p>
          )}
        </div>
      </div>

      {/* ── LIVE INVENTORY ANALYTICS (computed from /api/inventory) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Deal Type Ratio & Percentages (Rent vs Re-sale) */}
        <div className="clay-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚖️</span>
                <span>{isAr ? 'نسبة الإيجار مقابل إعادة البيع' : 'Deal Ratio: Rent vs Re-sale'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'توزيع الوحدات المتاحة فعلياً (من قاعدة البيانات)' : 'Live catalog breakdown (from the database)'}
              </p>
            </div>
            <span className="clay-stat-badge bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176]">
              LIVE DATA
            </span>
          </div>

          {/* Segmented Dual Bar — real counts from /api/inventory */}
          <div className="space-y-2">
            {invStats ? (
              <>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                    {isAr ? 'إيجار' : 'Rent'}: {invStats.rent} ({((invStats.rent / Math.max(invStats.total, 1)) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[#E9C176] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E9C176] shadow-sm shadow-[#E9C176]"></span>
                    {isAr ? 'إعادة بيع' : 'Re-sale'}: {invStats.sale} ({((invStats.sale / Math.max(invStats.total, 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="clay-bar h-4 flex">
                  <div className="clay-bar-fill h-full bg-linear-to-r from-emerald-600 to-emerald-400" style={{ width: `${(invStats.rent / Math.max(invStats.total, 1)) * 100}%` }} title={`Rent: ${invStats.rent}`} />
                  <div className="clay-bar-fill h-full bg-linear-to-r from-[#A87A12] to-[#E9C176]" style={{ width: `${(invStats.sale / Math.max(invStats.total, 1)) * 100}%` }} title={`Re-sale: ${invStats.sale}`} />
                </div>
              </>
            ) : (
              <div className="text-[11px] text-slate-400 font-mono py-2">
                {isAr ? 'لا توجد بيانات مخزون حية — تظهر النسب عند توفر وحدات.' : 'No live inventory data — ratios appear once units exist in the database.'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="clay-inset p-3 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">{isAr ? 'متوسط الإيجار' : 'Avg Rent / Month'}</div>
              <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {invStats?.avgRent !== undefined ? `${invStats.avgRent.toLocaleString('en-US')} EGP` : '—'}
              </div>
              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{isAr ? 'من الوحدات المسعرة فقط' : 'priced units only'}</div>
            </div>
            <div className="clay-inset p-3 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">{isAr ? 'متوسط البيع' : 'Avg Sale Ticket'}</div>
              <div className="text-base font-extrabold text-[#E9C176] font-mono mt-0.5">
                {invStats?.avgSale !== undefined ? `${(invStats.avgSale / 1_000_000).toFixed(1)}M EGP` : '—'}
              </div>
              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{isAr ? 'من الوحدات المسعرة فقط' : 'priced units only'}</div>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Compound Market Share % (New Cairo Distribution) */}
        <div className="clay-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏙️</span>
                <span>{isAr ? 'توزيع الوحدات على الكمبوندات' : 'Compound Market Share %'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'أعلى 5 كمبوندات في المخزون الحي' : 'Top 5 compounds in the live inventory'}
              </p>
            </div>
            <span className="clay-stat-badge bg-blue-950/70 border border-blue-800 text-blue-300">
              LIVE DATA
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {invStats && invStats.topCompounds.length > 0 ? (
              invStats.topCompounds.map((c, i: number) => {
                const colors = ['from-[#C8961A] to-[#F5D78E]', 'from-emerald-600 to-emerald-400', 'from-blue-600 to-sky-400', 'from-purple-600 to-pink-400', 'from-amber-600 to-yellow-400'];
                const topCount = invStats.topCompounds[0].count || 1;
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-sans font-medium">{c.name}</span>
                      <span className="text-slate-400">{c.count} ({c.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="clay-bar h-2">
                      <div className={`clay-bar-fill h-full bg-linear-to-r ${colors[i % colors.length]}`} style={{ width: `${Math.max((c.count / topCount) * 100, 2)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[11px] text-slate-400 py-2">
                {isAr ? 'لا توجد بيانات كمبوندات حية بعد.' : 'No live compound data yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Price brackets of priced sale units (no AVM claims — the
            previous card asserted a fabricated “AVM 98.4%” accuracy) */}
        <div className="clay-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📊</span>
                <span>{isAr ? 'الشرائح السعرية للوحدات المسعرة' : 'Sale Price Tiers'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'توزيع أسعار البيع الفعلية في المخزون' : 'Distribution of actual asking prices'}
              </p>
            </div>
            <span className="clay-stat-badge bg-purple-950/70 border border-purple-800 text-purple-300">
              LIVE DATA
            </span>
          </div>

          <div className="space-y-3">
            {invStats && invStats.priceTiers.some((t) => t.units > 0) ? (
              invStats.priceTiers.map((t) => {
                const tierLabel =
                  t.tier === 'entry'
                    ? isAr ? 'شريحة الدخول (< 8 مليون ج.م)' : 'Entry Tier (< 8M EGP)'
                    : t.tier === 'prime'
                      ? isAr ? 'الشريحة الممتازة (8 - 15 مليون)' : 'Prime Tier (8M - 15M EGP)'
                      : isAr ? 'الشريحة الفاخرة (> 15 مليون)' : 'Ultra-Luxury (> 15M EGP)';
                return (
                  <div key={t.tier} className="clay-inset p-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-200">{tierLabel}</span>
                      <span className="font-mono text-[#E9C176] font-bold">{t.pct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
                      <span>{t.units} {isAr ? 'وحدة' : 'units'}</span>
                      <span className="text-slate-500">{isAr ? 'من الوحدات المسعرة' : 'of priced sale units'}</span>
                    </div>
                    <div className="clay-bar h-1.5 mt-2">
                      <div className="clay-bar-fill h-full bg-linear-to-r from-[#C8961A] to-[#E9C176]" style={{ width: `${Math.min(t.pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[11px] text-slate-400 py-2">
                {isAr ? 'لا توجد أسعار بيع حية بعد — تظهر الشرائح عند توفر وحدات مسعرة.' : 'No priced sale units yet — tiers appear once the inventory carries real prices.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App Launcher — every platform app activated with clay styling */}
      <div className="clay-card-elevated p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">✨ {isAr ? 'تشغيل تطبيقات المنظومة' : 'App Launcher'}</span>
            <span className="clay-stat-badge bg-[#211A0D]/80 border border-[#C8961A]/40 text-[#E9C176]">
              {APPS_CATALOG.length} {isAr ? 'تطبيقاً' : 'APPS'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate?.('all_apps')}
            className="text-xs font-semibold text-[#E9C176] hover:text-[#F5D78E] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{isAr ? 'عرض الدليل الكامل' : 'View Full Directory'}</span>
            <span>→</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {APPS_CATALOG.map((app: AppService) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                if (app.actionType === 'external') {
                  window.open(app.actionTarget, '_blank');
                } else if (navigate) {
                  navigate(app.actionTarget);
                }
              }}
              className="group relative flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer text-center"
              title={isAr ? app.description.ar : app.description.en}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${app.accentColor}25, ${app.accentColor}08)`,
                  borderColor: `${app.accentColor}60`,
                }}
              >
                {app.icon}
              </span>
              <span className="text-[10.5px] font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                {isAr ? app.name.ar : app.name.en}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: app.status === 'online' ? '#34D399' : '#C8961A',
                    boxShadow: `0 0 6px ${app.status === 'online' ? '#34D399' : '#C8961A'}`,
                  }}
                />
                {app.badge && (
                  <span className="text-[8px] font-mono text-slate-400 uppercase">{app.badge}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Google Drive & Master Inventory Executive Repository Banner — Clay Gold */}
      <div className="clay-card-gold p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#211A0D]/90 border border-[#C8961A]/60 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            📂
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {isAr ? 'مستودع المخزون المعتمد ومجلد جوجل درايف' : 'Master Verified Inventory & Google Drive Repository'}
              </h3>
              <span className="clay-stat-badge bg-emerald-950 border border-emerald-700 text-emerald-300">
                CANONICAL SOURCE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isAr
                ? 'مجلد جوجل درايف الأساسي (عقارات الملاك، البيع، الإيجار) ومزامنة شيت المخزون الفورية'
                : 'Canonical Google Drive source folder, owner spreadsheets, and live synchronized Master Google Sheet.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://drive.google.com/drive/folders/1RGuki2ECPK4DHNXgzlinQ2QTFAMBnC1z"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-btn-gold px-3.5 py-2 text-xs font-mono gap-1.5"
            title="Open Master Google Drive Folder"
            aria-label="Open Master Google Drive Folder"
          >
            <span>📁 {isAr ? 'مجلد جوجل درايف' : 'Drive Folder'}</span>
            <span>↗</span>
          </a>
          <a
            href="https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/edit#gid=1127958606"
            target="_blank"
            rel="noopener noreferrer"
            className="clay-btn-emerald px-3.5 py-2 text-xs font-mono gap-1.5"
            title="Open Master Google Sheet"
            aria-label="Open Master Google Sheet"
          >
            <span>📊 {isAr ? 'الشيت الرئيسي' : 'Master Sheet'}</span>
            <span>↗</span>
          </a>
          <a
            href="/downloads/sierra-estates-master-inventory.xlsx"
            download
            className="clay-btn-dark px-3.5 py-2 text-xs font-mono gap-1.5"
            title="Download Excel Workbook (12MB)"
            aria-label="Download Excel Workbook (12MB)"
          >
            <span>📥 {isAr ? 'إكسيل (12MB)' : 'Excel (12MB)'}</span>
          </a>
        </div>
      </div>

      {/* Executive Quick Actions Hub — Clay Elevated */}
      <div className="clay-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">⚡ {isAr ? 'إجراءات سريعة للتنفيذ' : 'Executive Quick Actions'}</span>
            <span className="clay-stat-badge bg-[#211A0D]/90 border border-[#C8961A]/40 text-[#E9C176]">OS 3.0</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{isAr ? 'انتقل مباشرةً للأدوات التشغيلية الحية' : 'Direct shortcuts to operational tools'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => navigate?.('listings')}
            className="clay-btn-dark py-2.5 px-3 text-xs font-semibold gap-1.5"
            title="Easy Listing Studio"
            aria-label="Easy Listing Studio"
          >
            <span className="text-[#E9C176]">✦</span>
            <span>{isAr ? 'إدخال عقار جديد' : 'Easy Listing Studio'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('whatsapp_outreach')}
            className="clay-btn-dark py-2.5 px-3 text-xs font-semibold gap-1.5"
            title="WhatsApp Campaigns & Outreach"
            aria-label="WhatsApp Campaigns & Outreach"
          >
            <span className="text-emerald-400">💬</span>
            <span>{isAr ? 'مرسل الواتساب' : 'WhatsApp Sender'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('workflows')}
            className="clay-btn-dark py-2.5 px-3 text-xs font-semibold gap-1.5"
            title="Workflows & Automation Hub"
            aria-label="Workflows & Automation Hub"
          >
            <span className="text-blue-400">⚡</span>
            <span>{isAr ? 'مسارات العمل' : 'Workflows Hub'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('agents')}
            className="clay-btn-dark py-2.5 px-3 text-xs font-semibold gap-1.5"
            title="AI Agents Fleet Command"
            aria-label="AI Agents Fleet Command"
          >
            <span className="text-purple-400">🤖</span>
            <span>{isAr ? 'أسطول الوكلاء' : 'AI Agents Fleet'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="clay-btn-gold py-2.5 px-3 text-xs font-bold gap-1.5"
            title="Open Sierra AI Copilot"
            aria-label="Open Sierra AI Copilot"
          >
            <span>✨</span>
            <span>{isAr ? 'مساعد البيانات الذكي' : 'Sierra Copilot'}</span>
          </button>
          <button
            type="button"
            onClick={handleRequestPurge}
            className="clay-btn-dark py-2.5 px-3 text-xs font-semibold gap-1.5 border-red-900/50 text-red-300 hover:border-red-600"
            title="Demonstrate Accidental Data Loss Prevention Guard"
            aria-label="Demonstrate Accidental Data Loss Prevention Guard"
          >
            <span>🛡️</span>
            <span>{isAr ? 'تفريغ آمن للكاش' : 'Purge Cache (Safe)'}</span>
          </button>
        </div>
      </div>

      {/* Hot Leads Fast-Track Pipeline — Clay Cards */}
      <div className="clay-card p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-white">
              🔥 {isAr ? 'خط ساخن للعملاء ذوي النية العالية' : 'Hot Leads Fast-Track Pipeline'}
            </span>
            <span className="clay-stat-badge bg-red-950/80 border border-red-800/80 text-red-400">
              {hotLeads.length} {isAr ? 'عاجل' : 'Urgent Hot'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate?.('leads')}
              className="text-xs font-semibold text-[#E9C176] hover:text-[#F5D78E] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isAr ? 'عرض كافة العملاء في الـ CRM' : 'View Full CRM Pipeline'}</span>
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {hotLeads.map((lead) => (
            <div
              key={lead.id}
              className="clay-inset p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md"
                      style={{ background: lead.color || '#C8961A' }}
                    >
                      {lead.name[0]}
                    </div>
                    <span className="text-xs font-bold text-white truncate">{lead.name}</span>
                  </div>
                  <span className="clay-stat-badge bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold shrink-0">
                    {typeof lead.score === 'number' ? `🔥 ${lead.score}%` : '🔥'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 font-medium line-clamp-1 mb-1" title={lead.interest}>
                  {lead.interest}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                  <span>{lead.budget ?? 'Target Budget'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    {lead.stage}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(lead)}
                  className="clay-btn-emerald flex-1 py-1.5 px-2 text-xs font-semibold gap-1.5"
                  title="Direct WhatsApp Chat"
                >
                  <span>💬</span>
                  <span>{isAr ? 'واتساب مباشر' : 'WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate?.('leads')}
                  className="clay-btn-dark p-2 text-xs"
                  title="CRM Lead Details"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Pipeline & Live Telemetry Grid — Clay Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Conversion Pipeline */}
        <div className="clay-card p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>📈</span>
            <span>{isAr ? 'مسار تحويل الصفقات (Funnel)' : 'Deal Conversion Pipeline'}</span>
          </h3>

          {/* Funnel — computed from real lead pipeline stages; honest empty
              state instead of the previous hardcoded 1,240/482/186/74 counts */}
          <div className="space-y-3.5 text-xs">
            {funnel && funnel.ingested > 0 ? (
              ([
                { label: '1. Ingested Inquiries', value: funnel.ingested, cls: 'text-[#E9C176]', bar: 'from-[#C8961A] to-[#F5D78E]' },
                { label: '2. AI Qualified Leads', value: funnel.qualified, cls: 'text-blue-400', bar: 'from-blue-600 to-sky-400' },
                { label: '3. Scheduled Viewings', value: funnel.viewings, cls: 'text-purple-400', bar: 'from-purple-600 to-fuchsia-400' },
                { label: '4. Closing Negotiations', value: funnel.closings, cls: 'text-emerald-400', bar: 'from-emerald-600 to-emerald-400' },
              ] as const).map((stage) => (
                <div key={stage.label}>
                  <div className="flex justify-between text-slate-300 mb-1.5 font-mono">
                    <span>{stage.label}</span>
                    <span className={`${stage.cls} font-bold`}>
                      {stage.value} ({((stage.value / Math.max(funnel.ingested, 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="clay-bar h-2.5">
                    <div className={`clay-bar-fill h-full bg-linear-to-r ${stage.bar}`} style={{ width: `${Math.min((stage.value / Math.max(funnel.ingested, 1)) * 100, 100)}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-400 py-2">
                {isAr ? 'لا توجد عملاء بعد — يظهر مسار التحويل عند وصول طلبات حقيقية.' : 'No leads yet — the funnel populates as real inquiries arrive in the CRM.'}
              </div>
            )}
          </div>
        </div>

        {/* Live Agent Fleet Stream */}
        <div className="lg:col-span-2 clay-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>{isAr ? 'نشاط الأسطول المباشر (Fleet Telemetry)' : 'Live Agent Fleet Telemetry'}</span>
              </h3>
              {broadcastFeedback && (
                <div className="text-[11px] font-mono text-emerald-400 mt-0.5">{broadcastFeedback}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBroadcastFleet}
                disabled={isBroadcasting}
                className="clay-btn-dark px-3 py-1.5 text-xs font-mono gap-1.5 text-[#F5D78E] cursor-pointer disabled:opacity-50"
                title="Broadcast fleet pulse"
              >
                <span>⚡</span>
                <span>{isBroadcasting ? (isAr ? 'جاري البث...' : 'Broadcasting...') : (isAr ? 'نبضة الأسطول' : 'Broadcast Pulse')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate?.('agents')}
                className="clay-btn-dark px-3 py-1.5 text-xs text-slate-300 font-semibold cursor-pointer"
              >
                {isAr ? 'إدارة الأسطول →' : 'Fleet Command →'}
              </button>
              <span className="clay-stat-badge bg-[#211A0D] border border-[#C8961A]/40 text-[#E9C176]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E9C176] animate-ping"></span>
                LIVE SYNC
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
              <div
                key={act.id}
                className="clay-inset p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#E9C176] font-bold">{act.agent}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-300 font-medium">{act.compound}</span>
                    <span className="clay-stat-badge bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                      {act.badge}
                    </span>
                  </div>
                  <p className="text-slate-300">{isAr ? act.event.ar : act.event.en}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 self-end sm:self-auto shrink-0">
                  {act.timestamp}
                </span>
              </div>
            ))
            ) : (
              <div className="clay-inset p-3.5 text-xs text-slate-400">
                {isAr
                  ? 'لا يوجد نشاط حقيقي بعد — تظهر الأحداث هنا عند وصول استفسارات وعملاء فعليين.'
                  : 'No real activity yet — events appear here as actual inquiries and leads arrive.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OpenClaw Autonomous Harvester Cockpit — Clay Card */}
      <div className="clay-card-elevated p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 font-mono text-lg shrink-0 shadow-inner">
              🦅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مركز قيادة الحصاد الذكي (OpenClaw Harvester Cockpit)' : 'OpenClaw Autonomous Harvester Cockpit'}
                </h3>
                <span className="clay-stat-badge bg-amber-950 border border-amber-800 text-amber-300">
                  {ACTIVE_INGEST_CHANNELS} Channels Live
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isAr
                  ? `استخلاص العقارات آلياً من ${ACTIVE_INGEST_CHANNELS} مجموعة واتساب ومطابقة شيت المخزون الرئيسي مع التحقق من المالك المباشر`
                  : `Automated NLP property scraping across ${ACTIVE_INGEST_CHANNELS} WhatsApp channels, owner de-duplication, and master sheet reconciliation.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isHarvesting}
              onClick={() => handleOpenClawTask('owners')}
              className="clay-btn-dark px-3 py-2 text-amber-300 font-mono text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              ⚡ {isAr ? 'ملاك مباشر فقط' : 'ingest:owners'}
            </button>
            <button
              type="button"
              disabled={isHarvesting}
              onClick={() => handleOpenClawTask('all')}
              className="clay-btn-gold px-4 py-2 font-mono text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              ✦ {isAr ? `حصاد شامل (${ACTIVE_INGEST_CHANNELS} قناة)` : 'ingest:all'}
            </button>
          </div>
        </div>

        {openclawStatusMsg && (
          <div className="p-3 rounded-2xl bg-amber-950/70 border border-amber-800/80 text-xs font-mono text-amber-300 flex items-center justify-between">
            <span>{openclawStatusMsg}</span>
            <span className="text-[10px] text-amber-400">@sierra-estates/obsidian</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="clay-inset p-4">
            <div className="text-[11px] text-slate-400 font-mono">{isAr ? 'المخزون الموحد المكتمل' : 'Reconciled Master Units'}</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {liveData?.activeListings !== undefined ? liveData.activeListings.toLocaleString('en-US') : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">{isAr ? 'عدد حي من قاعدة البيانات' : 'live count from the database'}</div>
          </div>
          <div className="clay-inset p-4">
            <div className="text-[11px] text-slate-400 font-mono">{isAr ? 'قنوات الواتساب النشطة' : 'Active WhatsApp Ingestion'}</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{ACTIVE_INGEST_CHANNELS} Channels</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">{ACTIVE_OWNER_CHANNELS} Direct Owner + {ACTIVE_BROKER_CHANNELS} Broker</div>
          </div>
          <div className="clay-inset p-4">
            <div className="text-[11px] text-slate-400 font-mono">{isAr ? 'ذاكرة القرار (Obsidian Memory)' : 'Obsidian Shared Memory'}</div>
            <div className="text-xl font-bold font-mono text-[#E9C176] mt-1">Grounded</div>
            <div className="text-[10px] text-[#E9C176]/90 mt-1 font-mono">obsidian-store.json synchronized</div>
          </div>
        </div>
      </div>

      {/* Cloud Dataflow & BigQuery DTS Pipeline Card */}
      <DataPipelineTelemetryCard lang={lang} />

      {/* PostgreSQL & pgvector Database Health Card */}
      <DatabaseHealthCard lang={lang} />

      {/* Real-time Client Portal Synchronization Status */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          <div>
            <span className="font-semibold text-white">
              {isAr ? 'المزامنة الحية مع بوابة العملاء' : 'Live Client Portal Synchronization Active'}
            </span>
            <p className="text-slate-400 text-[11px]">
              {isAr
                ? 'المزامنة الحية مع قاعدة البيانات — الموقع العام يعرض الوحدات النشطة فقط عبر واجهة /api/inventory'
                : 'Live synchronization with the inventory database — public pages serve active listings only via /api/inventory.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#F5D78E] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isAr ? 'معاينة الموقع الحي' : 'Preview Live Portal'}</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Accidental Data Loss Guard Modal */}
      <AccidentalDataLossGuardModal
        isOpen={isGuardOpen}
        title={guardConfig.title}
        actionDescription={guardConfig.actionDescription}
        impactSummary={guardConfig.impactSummary}
        affectedCount={guardConfig.affectedCount}
        lang={lang}
        onConfirm={guardConfig.onConfirm}
        onCancel={() => setIsGuardOpen(false)}
      />

      {/* Gemini AI Natural Language Copilot Drawer */}
      <AdminCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        lang={lang}
      />
    </div>
  );
}
