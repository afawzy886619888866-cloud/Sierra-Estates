'use client';
import React from 'react';

export default function SecurityView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز الأمان والامتثال · سجل التدقيق' : 'Security, RBAC & Audit Trails'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'مراجعة صلاحيات الوصول، مفاتيح API، ومحاولات المصادقة' : 'Access control enforcement, secret rotation policy, and immutable engine audit records.'}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-slate-200">{isAr ? 'سجل التدقيق الأخير' : 'Recent Security & Memory Audits'}</h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
            <span className="text-cyan-400">[2026-08-21 21:15:02]</span>
            <span className="text-slate-300">engine_memory write authorized for agent: vertex_omni</span>
            <span className="text-emerald-400">ALLOW</span>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between">
            <span className="text-cyan-400">[2026-08-21 21:12:44]</span>
            <span className="text-slate-300">Admin session token validated for UID: admin-01</span>
            <span className="text-emerald-400">ALLOW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
