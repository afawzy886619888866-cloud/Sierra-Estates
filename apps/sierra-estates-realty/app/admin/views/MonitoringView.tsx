'use client';
import React from 'react';

export default function MonitoringView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'البث المباشر للعمليات · المراقبة' : 'Live Operations Monitoring'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'متابعة سجلات المهام وتدفق الأحداث في الوقت الفعلي' : 'Real-time telemetry stream across OpenClaw, WhatsApp bot, and AVM ingestion.'}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 max-h-96 overflow-y-auto">
        <div className="text-emerald-400">[INFO] AI Orchestrator running workflow wf-listing-175581002</div>
        <div className="text-cyan-400">[INFO] Scribe Agent parsed listing SE-HYP-VLA-0040-2026 (Hyde Park Villa)</div>
        <div className="text-purple-400">[INFO] Vertex Omni generated AVM valuation: EGP 35,000,000 (Confidence: 94%)</div>
        <div className="text-emerald-400">[INFO] Recommendation published to topic [ai.recommendations]</div>
      </div>
    </div>
  );
}
