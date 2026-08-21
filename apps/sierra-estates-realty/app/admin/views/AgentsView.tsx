'use client';
import React from 'react';

export default function AgentsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const agents = [
    { name: 'Sierra Bot', role: 'Main AI Concierge', status: 'Online', load: '94%', color: 'text-cyan-400' },
    { name: 'Laila / Lola', role: 'Bilingual Specialist', status: 'Online', load: '87%', color: 'text-blue-400' },
    { name: 'Stage-9 Closer', role: 'Deal & Contract Engine', status: 'Online', load: '71%', color: 'text-emerald-400' },
    { name: 'OpenClaw Architect', role: 'System & Code Runner', status: 'Online', load: '65%', color: 'text-purple-400' },
    { name: 'The Curator', role: 'S3-S5 Valuation Engine', status: 'Online', load: '68%', color: 'text-amber-400' },
    { name: 'The Scribe', role: 'S1-S2 Parser', status: 'Idle', load: '12%', color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'أسطول الوكلاء الأذكياء · التحكم والتشغيل' : 'Agent Fleet Management'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'مراقبة حالة وحِمل كل وكيل ذكي وإعادة التشغيل' : 'Real-time telemetry, load balancing, and dispatch status for all intelligent agents.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <span className={`font-bold ${agent.color}`}>{agent.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${
                agent.status === 'Online'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {agent.status}
              </span>
            </div>
            <div className="text-xs text-slate-400">{agent.role}</div>
            <div className="text-xs text-slate-300 font-mono mt-2">Current Load: {agent.load}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
