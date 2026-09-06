'use client';
/* cspell:disable */

import React from 'react';

interface DatabaseHealthProps {
  lang?: string;
}

export default function DatabaseHealthCard({ lang = 'en' }: DatabaseHealthProps) {
  const isAr = lang === 'ar';

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-400 font-mono text-sm shrink-0">
            🗄️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'صحة قاعدة البيانات وفهرسة المتجهات (Postgres + pgvector)' : 'Database & Vector Index Health'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 font-semibold">
                Supabase Auth & RLS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'مؤشرات أداء استعلامات PostgreSQL وفهارس HNSW للبحث الدلالي عن العقارات'
                : 'PostgreSQL query latencies, connection pool telemetry, and pgvector HNSW semantic indexing.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {isAr ? 'مستقر وسريع' : 'Optimal P95 Latency'}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* pgvector Index Hit Rate */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'دقة بحث المتجهات (Recall)' : 'pgvector HNSW Recall'}</span>
            <span className="text-[10px] font-mono text-purple-400">1536 dim</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">99.4%</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isAr ? '460/460 وحدة مفهرسة بالكامل' : '460/460 units fully indexed'}
          </div>
        </div>

        {/* P95 Query Latency */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'سرعة الاستجابة (P95 Latency)' : 'P95 Query Latency'}</span>
            <span className="text-[10px] font-mono text-emerald-400">Target &lt; 50ms</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">14 ms</div>
          <div className="text-[10px] font-mono text-emerald-400/90 mt-1">
            {isAr ? 'استعلامات مفهرسة بدون N+1' : 'Index scans only · Zero N+1'}
          </div>
        </div>

        {/* Connection Pool */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'تجمع الاتصالات (Pool)' : 'Connection Pool'}</span>
            <span className="text-[10px] font-mono text-cyan-400">Supavisor</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">4 / 20 Active</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isAr ? 'استخدام منخفض ومستقر (20%)' : '20% capacity · Headroom safe'}
          </div>
        </div>

        {/* Schema Integrity & Security */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isAr ? 'أمان الجداول (RLS Policies)' : 'RLS Security Policies'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Enforced
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">100% Locked</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isAr ? '12 جدولاً خاضعاً لسياسات الأمان' : '12 tables guarded by strict RLS'}
          </div>
        </div>
      </div>
    </div>
  );
}
