'use client';

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

      {/* Omnichannel SLA Trackers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span className="text-cyan-400">100% SLA met</span>
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
      </div>

      {/* Live Terminal Log Stream */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Live System Stream</span>
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
                    ? 'text-cyan-400'
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
    </div>
  );
}
