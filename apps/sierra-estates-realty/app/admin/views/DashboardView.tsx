'use client';

import React, { useState, useMemo } from 'react';

interface ActivityFeedItem {
  id: string;
  timestamp: string;
  agent: string;
  event: { en: string; ar: string };
  compound: string;
  badge: string;
}

const RECENT_ACTIVITIES: ActivityFeedItem[] = [
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

export default function DashboardView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const metrics = useMemo(() => {
    switch (timeRange) {
      case '7d':
        return { catalog: '1,547', catalogGrowth: '+4% this week', leads: '92', leadsGrowth: '+14 new', volume: 'EGP 142M', volumeGrowth: '+3.1%' };
      case '90d':
        return { catalog: '1,547', catalogGrowth: '+28% this quarter', leads: '740', leadsGrowth: '+112 closed', volume: 'EGP 1.84B', volumeGrowth: '+18.4%' };
      case 'all':
        return { catalog: '1,547', catalogGrowth: 'Historical Peak', leads: '2,480', leadsGrowth: '+620 closed', volume: 'EGP 5.2B', volumeGrowth: 'All-time' };
      case '30d':
      default:
        return { catalog: '1,547', catalogGrowth: '+12% this week', leads: '284', leadsGrowth: '+8 new today', volume: 'EGP 14.8M', volumeGrowth: '+5.2% MoM' };
    }
  }, [timeRange]);

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
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              {isAr ? 'نشاط الأسطول المباشر (Fleet Telemetry)' : 'Live Agent Fleet Telemetry'}
            </h3>
            <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              LIVE SYNC
            </span>
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
    </div>
  );
}
