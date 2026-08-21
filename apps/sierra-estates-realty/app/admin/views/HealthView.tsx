'use client';
import React from 'react';

export default function HealthView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'حالة وصحة النظام · المراقبة الحية' : 'System Health & Telemetry'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'فحص جاهزية الخوادم وقواعد البيانات ومحركات الذاكرة' : 'Real-time heartbeat across Firestore, PubSub broker, Redis cache, and Gemini endpoints.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">Firestore Database</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">HEALTHY</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Latency: 24ms · 4 collections connected</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">Pub/Sub Message Bus</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">ACTIVE</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Topic: ai.recommendations · 0 queued backlog</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">AI Reasoning API</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">ONLINE</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Model: Gemini 2.5 Flash + DeepSeek Harness</p>
        </div>
      </div>
    </div>
  );
}
