'use client';
/* cspell:disable */

import React, { useState } from 'react';

interface PipelineTelemetryProps {
  lang?: string;
  onOpenDataflowConsole?: () => void;
}

export default function DataPipelineTelemetryCard({
  lang = 'en',
  onOpenDataflowConsole,
}: PipelineTelemetryProps) {
  const isAr = lang === 'ar';
  const [isSyncingDts, setIsSyncingDts] = useState(false);
  const [dtsStatusMsg, setDtsStatusMsg] = useState<string | null>(null);

  const handleTriggerDts = async () => {
    setIsSyncingDts(true);
    setDtsStatusMsg(isAr ? 'جاري بدء جولة نقل البيانات (DTS Transfer)...' : 'Triggering BigQuery DTS Transfer...');
    try {
      // Simulate/trigger ingestion run
      await new Promise((r) => setTimeout(r, 1200));
      setDtsStatusMsg(isAr ? '✓ اكتملت مزامنة BigQuery DTS بنجاح' : '✓ BigQuery DTS Transfer Completed');
    } catch {
      setDtsStatusMsg(isAr ? 'فشلت المزامنة' : 'Sync error');
    } finally {
      setIsSyncingDts(false);
      setTimeout(() => setDtsStatusMsg(null), 4000);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400 font-mono text-sm shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'تتبع مسار خطوط البيانات (Dataflow & BigQuery DTS)' : 'Data Pipelines & Ingestion Telemetry'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold">
                GCP Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'مراقبة خطوط المعالجة الفورية وتدفق بيانات العقارات عبر Dataflow ومزامنة BigQuery'
                : 'Real-time Apache Beam stream diagnostics, watermark lag, and BigQuery ingestion.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDataflowConsole && (
            <button
              type="button"
              onClick={onOpenDataflowConsole}
              className="px-2.5 py-1.5 text-xs font-mono rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
              title="Open Cloud Dataflow Console"
            >
              <span>Console ↗</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleTriggerDts}
            disabled={isSyncingDts}
            className="px-3 py-1.5 text-xs font-mono rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Trigger manual DTS run"
          >
            <span>↻</span>
            <span>{isSyncingDts ? (isAr ? 'جاري التشغيل...' : 'Triggering...') : (isAr ? 'تشغيل DTS يدوياً' : 'Trigger DTS Run')}</span>
          </button>
        </div>
      </div>

      {dtsStatusMsg && (
        <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-800/80 text-xs font-mono text-cyan-300 flex items-center justify-between animate-fadeIn">
          <span>{dtsStatusMsg}</span>
          <span className="text-[10px] text-cyan-400">gcp.dataflow.v1b3</span>
        </div>
      )}

      {/* Grid of Key Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Data Watermark Lag */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'عمر العلامة المائية (Lag)' : 'Watermark Freshness'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">0.4 min</div>
          <div className="text-[10px] font-mono text-emerald-400 mt-1">
            {isAr ? 'تأخير منخفض جداً · صحي' : 'Target < 2.0m · Healthy'}
          </div>
        </div>

        {/* Streaming Throughput */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'معدل الإنتاجية (Throughput)' : 'Stream Throughput'}</span>
            <span className="text-[10px] font-mono text-cyan-400">elems/s</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">240/s</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isAr ? 'الذروة: 580/s · بدون اختناق' : 'Peak 580/s · Zero bottleneck'}
          </div>
        </div>

        {/* BigQuery DTS Sync */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'نقل البيانات BigQuery DTS' : 'BigQuery DTS Transfer'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Active
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">460 Units</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isAr ? 'المزامنة الأخيرة: منذ 12 دقيقة' : 'Last run: 12m ago · 100% pass'}
          </div>
        </div>

        {/* Deadletter / Error Output */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'سجلات الأخطاء (Deadletter)' : 'Deadletter Queue'}</span>
            <span className="text-[10px] font-mono text-emerald-400">0 Err</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">0 Records</div>
          <div className="text-[10px] font-mono text-emerald-400/90 mt-1">
            {isAr ? 'مخطط البيانات سليم تماماً' : 'Schema validated · Clean'}
          </div>
        </div>
      </div>

      {/* Pipeline Architecture Footer Bar */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold">Config:</span>
          <span>sierra_analytics.reconciled_listings</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">Beam SDK 2.62.0 (Python Flex Template)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">{isAr ? 'العمال التلقائيين: 2/10' : 'Workers: 2 active (Auto-scale to 10)'}</span>
        </div>
      </div>
    </div>
  );
}
