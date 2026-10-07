'use client';
/* cspell:disable */

import React, { useState, useMemo } from 'react';

interface LogEntry {
  id: string;
  type: 'info' | 'warn' | 'agent' | 'pubsub';
  text: string;
  timestamp: string;
}

// ANTI-FABRICATION (§21 wave 5): six fabricated log lines (invented AVM
// valuations, a fake workflow run, a lead assignment naming a demo person)
// were previously streamed here as live telemetry. Real log lines must come
// from the actual telemetry pipeline — until it is wired in, the stream
// stays honestly empty.
const LOG_ENTRIES: LogEntry[] = [];

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
      {/* §21: these trackers previously displayed fabricated figures (an
          invented in-flight count, a fake 100% SLA, a made-up message rate
          and a fictitious verification percentage). They now render honest
          placeholders until live telemetry is wired in (KPI_DATA pattern). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>WHATSAPP BOT SLA</span>
            <span className="text-slate-500">Awaiting telemetry</span>
          </div>
          <div className="text-xl font-bold text-white">&mdash;</div>
          <p className="text-[11px] text-slate-500">Live value appears when the bot telemetry feed is connected</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>VIP VIEWING QUEUE</span>
            <span className="text-slate-500">Awaiting telemetry</span>
          </div>
          <div className="text-xl font-bold text-white">&mdash;</div>
          <p className="text-[11px] text-slate-500">Live value appears when the viewing scheduler is connected</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>PUBSUB DISPATCH</span>
            <span className="text-slate-500">Awaiting telemetry</span>
          </div>
          <div className="text-xl font-bold text-white">&mdash;</div>
          <p className="text-[11px] text-slate-500">Live value appears when the event bus is connected</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>INVENTORY HEALTH</span>
            <span className="text-slate-500">Awaiting telemetry</span>
          </div>
          <div className="text-xl font-bold text-white">&mdash;</div>
          <p className="text-[11px] text-slate-500">Live value appears when the inventory auditor is connected</p>
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
          {filteredLogs.length === 0 ? (
            <div
              data-testid="telemetry-empty-state"
              className="py-8 text-center text-slate-500"
            >
              {isAr
                ? 'لا توجد سجلات تتبع حقيقية حالياً — ستظهر هنا عند اتصال خط التتبع الفعلي.'
                : 'No real telemetry logged yet — entries appear here once the telemetry pipeline is connected.'}
            </div>
          ) : (
            filteredLogs.map((log) => (
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
            ))
          )}
        </div>
      </div>

      {/* Real-Time Inbound WhatsApp Lead Activity Stream */}
      {/* §21: this panel previously showed three fabricated inbound leads
          (invented names, phones, budgets and AI status labels) behind a
          pulsing "Live Cloud Feed · Active" indicator. It now renders an
          honest empty state until the real inbound feed is connected. */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-600"></span>
            </span>
            <h3 className="text-sm font-bold text-white">
              {isAr ? 'البث المباشر للرسائل والعملاء المحتملين' : 'Real-Time Inbound WhatsApp & Lead Ingestion Stream'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-semibold">
            {isAr ? 'بانتظار اتصال البث الفعلي' : 'Awaiting live feed connection'}
          </span>
        </div>

        <div
          data-testid="inbound-feed-empty-state"
          className="py-10 rounded-xl bg-slate-950 border border-slate-800/80 text-center space-y-2"
        >
          <div className="text-slate-300 text-sm font-semibold">
            {isAr ? 'لا توجد رسائل واردة حقيقية حالياً' : 'No real inbound activity yet'}
          </div>
          <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'ستظهر هنا الرسائل الواردة الفعلية من واتساب وقنوات الاستيعاب عند تشغيلها — لا يتم اختراع عملاء تجريبيين.'
              : 'Real inbound WhatsApp and lead-ingestion messages will appear here once the channels are live — demo leads are never invented.'}
          </p>
        </div>
      </div>
    </div>
  );
}
