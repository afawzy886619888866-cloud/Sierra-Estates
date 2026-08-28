'use client';
import React from 'react';

export default function RoleManagerView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const roles = [
    { role: 'admin', label: 'Super Admin', access: 'Full Read/Write, Billing, Secret Rotation, Agent Dispatch' },
    { role: 'manager', label: 'Operations Manager', access: 'Catalog Write, Lead Assignment, CRM Oversight, Approvals' },
    { role: 'agent', label: 'Real Estate Broker', access: 'Lead Viewing, Contract Drafting, WhatsApp Response' },
    { role: 'auditor', label: 'Compliance Auditor', access: 'Read-Only Access to Logs, Valuations, and Audit Trails' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'إدارة الصلاحيات والأدوار · RBAC Matrix' : 'Role-Based Access Control (RBAC)'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'تحديد صلاحيات أعضاء الفريق والوكلاء الآليين' : 'Granular security policies, permission matrix, and role enforcement across Firestore and API routes.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((r) => (
          <div key={r.role} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">{r.label}</span>
              <span className="font-mono text-xs text-cyan-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">{r.role}</span>
            </div>
            <p className="text-xs text-slate-400">{r.access}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
