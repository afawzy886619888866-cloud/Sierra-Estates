'use client';

import React, { useState, useMemo } from 'react';

interface AuditEvent {
  id: string;
  timestamp: string;
  category: 'auth' | 'memory' | 'api' | 'rbac';
  description: string;
  actor: string;
  decision: 'ALLOW' | 'DENY' | 'FLAG';
}

const AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'aud-1',
    timestamp: '2026-08-23 21:15:02',
    category: 'memory',
    description: 'engine_memory write authorized for agent: vertex_omni',
    actor: 'agent:vertex_omni',
    decision: 'ALLOW',
  },
  {
    id: 'aud-2',
    timestamp: '2026-08-23 21:12:44',
    category: 'auth',
    description: 'Admin session token validated for UID: admin-01',
    actor: 'user:admin-01',
    decision: 'ALLOW',
  },
  {
    id: 'aud-3',
    timestamp: '2026-08-23 20:58:19',
    category: 'rbac',
    description: 'Role escalation attempt to super_admin blocked',
    actor: 'user:guest-broker-3',
    decision: 'DENY',
  },
  {
    id: 'aud-4',
    timestamp: '2026-08-23 20:45:00',
    category: 'api',
    description: 'PropertyFinder webhook signature verified with SHA256 HMAC',
    actor: 'service:webhook_gateway',
    decision: 'ALLOW',
  },
  {
    id: 'aud-5',
    timestamp: '2026-08-23 20:10:11',
    category: 'memory',
    description: 'Lead context TTL refresh: lead_ahmed_alrashid_state',
    actor: 'agent:concierge_lead',
    decision: 'ALLOW',
  },
];

export default function SecurityView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'auth' | 'memory' | 'api' | 'rbac'>('all');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'ALLOW' | 'DENY'>('all');

  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS.filter((log) => {
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      if (decisionFilter !== 'all' && log.decision !== decisionFilter) return false;
      return true;
    });
  }, [categoryFilter, decisionFilter]);

  return (
    <div className="space-y-6" data-testid="security-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز الأمان والامتثال · سجل التدقيق وRBAC' : 'Security, RBAC & Audit Trails'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'مراجعة صلاحيات الوصول، مفاتيح API، ومحاولات المصادقة لسياق الذكاء الاصطناعي'
              : 'Access control enforcement, secret rotation policy, and verifiable engine audit records.'}
          </p>
        </div>
      </div>

      {/* Security Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-mono">RBAC POLICY STATUS</span>
          <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <span>Enforced & Active</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-slate-500">Least privilege role mapping on Supabase & APIs</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-mono">API SECRETS ROTATION</span>
          <div className="text-lg font-bold text-[#E9C176]">Valid (Next in 24d)</div>
          <p className="text-[11px] text-slate-500">Supabase, Resend, and AI Provider keys</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-mono">AGENT RUNTIME ISOLATION</span>
          <div className="text-lg font-bold text-purple-400">Zero Trust Context</div>
          <p className="text-[11px] text-slate-500">Isolated memory stores per tenant/client</p>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="text-base font-semibold text-slate-200">
            {isAr ? 'سجل التدقيق الحي (Immutable Trail)' : 'Live Engine & Access Audit Trail'}
          </h3>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-[#C8961A]"
            >
              <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
              <option value="auth">Auth & Session</option>
              <option value="memory">Agent Memory</option>
              <option value="api">API Webhooks</option>
              <option value="rbac">RBAC Enforce</option>
            </select>

            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-[#C8961A]"
            >
              <option value="all">{isAr ? 'الكل (ALLOW/DENY)' : 'All Decisions'}</option>
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
            </select>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-2 text-xs font-mono">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#E9C176] shrink-0">[{log.timestamp}]</span>
                <span className="text-slate-400 shrink-0 uppercase text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {log.category}
                </span>
                <span className="text-slate-200">{log.description}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <span className="text-slate-500 text-[11px]">{log.actor}</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    log.decision === 'ALLOW'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {log.decision}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
