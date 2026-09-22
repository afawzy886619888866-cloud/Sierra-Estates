'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';

interface LogEntry {
  id: string;
  type: 'info' | 'warn' | 'agent' | 'pubsub';
  text: string;
  timestamp: string;
}

const LOG_ENTRIES: LogEntry[] = [
  { id: 'log-1', type: 'info', text: '[INFO] AI Orchestrator running workflow wf-listing-175581002', timestamp: '12:04:02' },
  { id: 'log-2', type: 'agent', text: '[INFO] Scribe Agent parsed listing SE-HYP-VLA-0040-2026 (Hyde Park Villa)', timestamp: '12:04:05' },
  { id: 'log-3', type: 'agent', text: '[INFO] Vertex Omni generated AVM valuation: EGP 35,000,000 (Confidence: 94%)', timestamp: '12:04:09' },
  { id: 'log-4', type: 'pubsub', text: '[INFO] Recommendation published to topic [ai.recommendations]', timestamp: '12:04:12' },
  { id: 'log-5', type: 'info', text: '[INFO] Omnichannel Lead Router assigned lead Sara Mohamed to Concierge VIP Pool', timestamp: '12:04:18' },
  { id: 'log-6', type: 'warn', text: '[WARN] Rate limit throttle window reached 65% capacity on WhatsApp Sandbox', timestamp: '12:04:22' },
];

export default function MonitoringView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [filterType, setFilterType] = useState<'all' | 'info' | 'warn' | 'agent' | 'pubsub'>('all');

  const filteredLogs = useMemo(() => {
    if (filterType === 'all') return LOG_ENTRIES;
    return LOG_ENTRIES.filter((l) => l.type === filterType);
  }, [filterType]);

  return (
    <div className="space-y-6" data-testid="monitoring-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'البث المباشر للعمليات · المراقبة' : 'Live Operations Monitoring'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'متابعة سجلات المهام وتدفق الأحداث في الوقت الفعلي' : 'Real-time telemetry stream across OpenClaw, WhatsApp bot, and AVM ingestion.'}
          </p>
        </div>
      </div>

      {/* Omnichannel SLA & Health Trackers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>WHATSAPP BOT SLA</span>
            <span className="text-emerald-400">&lt; 1.2s avg</span>
          </div>
          <div className="text-xl font-bold text-white">18 In Flight</div>
          <p className="text-[11px] text-slate-500">Auto-responding with localized property brochures</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>VIP VIEWING QUEUE</span>
            <span className="text-[#E9C176]">100% SLA met</span>
          </div>
          <div className="text-xl font-bold text-white">4 Scheduled</div>
          <p className="text-[11px] text-slate-500">Mivida &amp; Katameya Dunes viewings for tomorrow</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>PUBSUB DISPATCH</span>
            <span className="text-purple-400">Zero Loss</span>
          </div>
          <div className="text-xl font-bold text-white">482 msg / min</div>
          <p className="text-[11px] text-slate-500">Active event bus sync across broker instances</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>INVENTORY HEALTH</span>
            <span className="text-amber-400">98.4% Verified</span>
          </div>
          <div className="text-xl font-bold text-white">528 Active</div>
          <p className="text-[11px] text-slate-500">High-res photos &amp; AVM price audited</p>
        </div>
      </div>

      {/* Live Terminal Log Stream */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Live System Stream</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sierra-telemetry-logs-${Date.now()}.json`;
                  a.click();
                }}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition-colors"
              >
                📥 JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  const txt = filteredLogs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
                  const blob = new Blob([txt], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sierra-telemetry-logs-${Date.now()}.txt`;
                  a.click();
                }}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition-colors"
              >
                📥 TXT
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {(['all', 'info', 'agent', 'pubsub', 'warn'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2 py-0.5 rounded text-[11px] uppercase transition-colors ${
                  filterType === ft
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              <span
                className={
                  log.type === 'warn'
                    ? 'text-amber-400'
                    : log.type === 'agent'
                    ? 'text-[#E9C176]'
                    : log.type === 'pubsub'
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }
              >
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Inbound WhatsApp Lead Activity Stream */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'البث المباشر للرسائل والعملاء المحتملين' : 'Real-Time Inbound WhatsApp & Lead Ingestion Stream'}
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
            {isAr ? 'متصل بالشبكة السحابية' : 'Live Cloud Feed · Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'lead-act-1',
              name: 'Dr. Tarek Fouad',
              phone: '+201098887766',
              compound: 'Mountain View iCity',
              budget: '28.5M EGP',
              aiStatus: 'QUALIFIED_VIP',
              time: 'Just now',
              message: 'طلب تفاصيل فيلا مستقلة مع حديقة للمعاينة غداً',
            },
            {
              id: 'lead-act-2',
              name: 'Nadia El-Gohary',
              phone: '+201012345678',
              compound: 'Katameya Dunes',
              budget: '$850K USD',
              aiStatus: 'USD_BUYER_HIGH_FIT',
              time: '2 mins ago',
              message: 'Interested in golf-front standalone properties for cash settlement',
            },
            {
              id: 'lead-act-3',
              name: 'Eng. Amr Soliman',
              phone: '+201155443322',
              compound: 'Hyde Park',
              budget: '18M EGP',
              aiStatus: 'INVESTOR_HIGH_YIELD',
              time: '5 mins ago',
              message: 'استفسار عن أعلى عائد إيجاري متاح لشقق 3 غرف',
            },
          ].map((lead) => (
            <div
              key={lead.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2 text-xs"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-white">{lead.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {lead.aiStatus}
                  </span>
                </div>
                <div className="text-[11px] text-[#E9C176] font-mono mt-0.5">{lead.phone}</div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                  {lead.compound} · <span className="text-amber-300">{lead.budget}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 italic line-clamp-2">
                  &ldquo;{lead.message}&rdquo;
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500">
                <span>{lead.time}</span>
                <span className="text-emerald-400 font-medium cursor-pointer hover:underline">
                  {isAr ? 'فتح المحادثة ↗' : 'Open WhatsApp ↗'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
