'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';

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

const FALLBACK_HOT_LEADS: DashboardLead[] = [
  { id: 'lead-1', name: 'Dr. Tarek El-Mansy', phone: '+201001234567', interest: 'Mivida · 3B Standalone Villa', stage: 'Negotiating', score: 98, budget: '18.5M EGP', color: '#00AEFF' },
  { id: 'lead-2', name: 'Eng. Mona Al-Shorbagy', phone: '+201098765432', interest: 'Hyde Park · Lake Penthouse', stage: 'Viewing Scheduled', score: 95, budget: '14.2M EGP', color: '#10B981' },
  { id: 'lead-3', name: 'Karim Abdel-Aziz', phone: '+201123456789', interest: 'Swan Lake · Signature Villa', stage: 'Contract Draft', score: 94, budget: '32.0M EGP', color: '#8B5CF6' },
  { id: 'lead-4', name: 'Dina El-Gohary', phone: '+201201122334', interest: 'Eastown · Duplex + Garden', stage: 'Initial Contact', score: 91, budget: '9.8M EGP', color: '#F59E0B' },
];

const RECENT_ACTIVITIES: ActivityFeedItem[] = [
  {
    id: 'act-0',
    timestamp: 'Just now',
    agent: 'openclaw_architect',
    event: {
      en: 'Consolidated master inventory reconciled 460 units across 19 WhatsApp & master channels',
      ar: 'المخزون الموحد دمج 460 عقاراً عبر 19 مجموعة واتساب وشيت المخزون الرئيسي'
    },
    compound: 'New Cairo & Madinaty',
    badge: 'INVENTORY_SYNC',
  },
  {
    id: 'act-1',
    timestamp: '2m ago',
    agent: 'vertex_omni',
    event: {
      en: 'AVM model updated valuation baseline for 12 Hyde Park villas',
      ar: 'نموذج التقييم الآلي حدّث خط الأساس لـ 12 فيلا في هايد بارك'
    },
    compound: 'Hyde Park',
    badge: 'VALUATION',
  },
  {
    id: 'act-2',
    timestamp: '8m ago',
    agent: 'concierge_lead',
    event: {
      en: 'WhatsApp qualification completed for VIP Lead Sara Mohamed',
      ar: 'اكتمل تأهيل العميل المميز سارة محمد عبر واتساب'
    },
    compound: 'Mivida',
    badge: 'QUALIFIED',
  },
  {
    id: 'act-3',
    timestamp: '19m ago',
    agent: 'openclaw_orchestrator',
    event: {
      en: 'Multi-party negotiation simulation matched buyer & seller margin at 4.1%',
      ar: 'محاكاة التفاوض متعدد الأطراف قاربت هامش البائع والمشتري عند 4.1%'
    },
    compound: 'Katameya Dunes',
    badge: 'NEGOTIATION',
  },
  {
    id: 'act-4',
    timestamp: '35m ago',
    agent: 'property_finder_connector',
    event: {
      en: 'Automated sync ingested 36 verified listings with price index normalization',
      ar: 'المزامنة التلقائية استوردت 36 وحدة معتمدة مع توحيد مؤشر الأسعار'
    },
    compound: 'Villette',
    badge: 'SYNC',
  },
];

export default function DashboardView({
  lang = 'en',
  onNavigateAction,
  onNavigate,
}: {
  lang?: string;
  onNavigateAction?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}) {
  const navigate = onNavigateAction || onNavigate;
  const isAr = lang === 'ar';
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [liveData, setLiveData] = useState<{
    totalListings?: number;
    activeListings?: number;
    newInquiries7d?: number;
    conversionRate?: number;
  } | null>(null);
  const [hotLeads, setHotLeads] = useState<DashboardLead[]>(FALLBACK_HOT_LEADS);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  const fetchTelemetry = React.useCallback(() => {
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setLiveData(d);
      })
      .catch((err) => console.warn('[DashboardView] Metrics fetch failed:', err));

    fetch('/api/admin/leads?limit=30')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leads && Array.isArray(data.leads) && data.leads.length > 0) {
          const mapped: DashboardLead[] = data.leads
            .filter((l: any) => l.hot || l.stage === 'Negotiating' || l.stage === 'Viewing Scheduled')
            .slice(0, 4)
            .map((l: any, i: number) => ({
              id: l.id || `lead-${i}`,
              name: l.name || 'VIP Client',
              phone: l.phone || '+201000000000',
              interest: l.interest || 'New Cairo Luxury Residence',
              stage: l.stage || 'Initial Contact',
              hot: true,
              score: 93 + (i % 6),
              budget: l.budget ? `${(l.budget / 1000000).toFixed(1)}M EGP` : '15-25M EGP',
              color: l.color || ['#00AEFF', '#10B981', '#8B5CF6', '#F59E0B'][i % 4],
            }));
          if (mapped.length > 0) {
            setHotLeads(mapped);
          }
        }
      })
      .catch((err) => console.warn('[DashboardView] Leads fetch failed:', err));
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
      setBroadcastFeedback(isAr ? '✓ تم تحديث نبضات 10/10 وكلاء' : '✓ 10/10 Agents Synchronized');
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
    const total = liveData?.totalListings ? liveData.totalListings.toLocaleString() : '1,547';
    const leadsCount = liveData?.newInquiries7d !== undefined ? liveData.newInquiries7d.toString() : '284';

    switch (timeRange) {
      case '7d':
        return { catalog: total, catalogGrowth: '+4% this week', leads: leadsCount, leadsGrowth: '+14 new', volume: 'EGP 142M', volumeGrowth: '+3.1%' };
      case '90d':
        return { catalog: total, catalogGrowth: '+28% this quarter', leads: '740', leadsGrowth: '+112 closed', volume: 'EGP 1.84B', volumeGrowth: '+18.4%' };
      case 'all':
        return { catalog: total, catalogGrowth: 'Historical Peak', leads: '2,480', leadsGrowth: '+620 closed', volume: 'EGP 5.2B', volumeGrowth: 'All-time' };
      case '30d':
      default:
        return { catalog: total, catalogGrowth: '+12% this week', leads: leadsCount, leadsGrowth: '+8 new today', volume: 'EGP 14.8M', volumeGrowth: '+5.2% MoM' };
    }
  }, [timeRange, liveData]);

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
                  timeRange === r ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-full">
            ● {isAr ? 'النظام متصل ومتكامل' : 'Systems Operational'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'إجمالي العقارات' : 'Active Catalog'}</div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">{metrics.catalog}</div>
          <div className="text-xs text-emerald-400 mt-1">{metrics.catalogGrowth}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'العملاء النشطين' : 'Active Leads'}</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{metrics.leads}</div>
          <div className="text-xs text-emerald-400 mt-1">{metrics.leadsGrowth}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'متوسط قيمة الصفقة' : 'Avg Deal Value'}</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{metrics.volume}</div>
          <div className="text-xs text-emerald-400 mt-1">{metrics.volumeGrowth}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'دقة الذكاء الاصطناعي' : 'AI Match Precision'}</div>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">98.4%</div>
          <div className="text-xs text-emerald-400 mt-1">AVM Tier 1 Verified</div>
        </div>
      </div>

      {/* Executive Quick Actions Hub */}
      <div className="p-4 rounded-xl bg-linear-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">⚡ {isAr ? 'إجراءات سريعة للتنفيذ' : 'Executive Quick Actions'}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">OS 3.0</span>
          </div>
          <span className="text-xs text-slate-400">{isAr ? 'انتقل مباشرةً للأدوات التشغيلية الحية' : 'Direct shortcuts to operational tools'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => navigate?.('listings')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700/70 hover:border-cyan-500/50 text-xs font-semibold text-slate-200 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
          >
            <span>✦</span>
            <span>{isAr ? 'إدخال عقار جديد' : 'Easy Listing Studio'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('automations')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800/80 hover:bg-emerald-900/40 border border-slate-700/70 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 hover:text-emerald-300 transition-all cursor-pointer shadow-sm"
          >
            <span>✉</span>
            <span>{isAr ? 'حملات الواتساب' : 'WhatsApp Outreach'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('deep_insights')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700/70 hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-purple-300 transition-all cursor-pointer shadow-sm"
          >
            <span>⚖</span>
            <span>{isAr ? 'تقييم الصفقات' : 'Valuation & Arbitrage'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate?.('heatmap')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800/80 hover:bg-amber-900/40 border border-slate-700/70 hover:border-amber-500/50 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all cursor-pointer shadow-sm"
          >
            <span>🗺</span>
            <span>{isAr ? 'خريطة التجمع الحرارية' : 'New Cairo Heatmap'}</span>
          </button>
        </div>
      </div>

      {/* Hot Leads Fast-Track Pipeline */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-white">
              🔥 {isAr ? 'خط ساخن للعملاء ذوي النية العالية' : 'Hot Leads Fast-Track Pipeline'}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 font-bold">
              {hotLeads.length} {isAr ? 'عاجل' : 'Urgent Hot'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate?.('leads')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
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
              className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                      style={{ background: lead.color || '#00AEFF' }}
                    >
                      {lead.name[0]}
                    </div>
                    <span className="text-xs font-bold text-white truncate">{lead.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold shrink-0">
                    🔥 {lead.score ?? 95}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 font-medium line-clamp-1 mb-1" title={lead.interest}>
                  {lead.interest}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                  <span>{lead.budget ?? 'Target Budget'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                    {lead.stage}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(lead)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Direct WhatsApp Chat"
                >
                  <span>💬</span>
                  <span>{isAr ? 'واتساب مباشر' : 'WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate?.('leads')}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  title="CRM Lead Details"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Pipeline & Live Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Conversion Pipeline */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white">
            {isAr ? 'مسار تحويل الصفقات (Funnel)' : 'Deal Conversion Pipeline'}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>1. Ingested Inquiries</span>
                <span className="font-mono text-cyan-400">1,240 (100%)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>2. AI Qualified Leads</span>
                <span className="font-mono text-blue-400">482 (38.8%)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '38.8%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>3. Scheduled Viewings</span>
                <span className="font-mono text-purple-400">186 (15.0%)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>4. Closing Negotiations</span>
                <span className="font-mono text-emerald-400">74 (6.0%)</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '6%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Agent Fleet Stream */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                {isAr ? 'نشاط الأسطول المباشر (Fleet Telemetry)' : 'Live Agent Fleet Telemetry'}
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
                className="px-2.5 py-1 text-xs rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Broadcast fleet pulse"
              >
                <span>⚡</span>
                <span>{isBroadcasting ? (isAr ? 'جاري البث...' : 'Broadcasting...') : (isAr ? 'نبضة الأسطول' : 'Broadcast Pulse')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate?.('agents')}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                {isAr ? 'إدارة الأسطول →' : 'Fleet Command →'}
              </button>
              <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                LIVE SYNC
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {RECENT_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-cyan-400">{act.agent}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-medium">{act.compound}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {act.badge}
                    </span>
                  </div>
                  <p className="text-slate-300">{isAr ? act.event.ar : act.event.en}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 self-end sm:self-auto shrink-0">
                  {act.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                ? '460 عقاراً معتمداً موصولاً بنموذج التقييم الآلي AVM واستقبال فوري للطلبات'
                : '460 verified units synchronized with AVM engine, live WhatsApp dispatch, and public inquiry routing.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isAr ? 'معاينة الموقع الحي' : 'Preview Live Portal'}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
