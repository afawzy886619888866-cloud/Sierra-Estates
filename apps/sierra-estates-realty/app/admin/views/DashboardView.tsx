'use client';
import React from 'react';

export default function DashboardView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'لوحة القيادة الرئيسية · نظام الذكاء' : 'Executive Dashboard · Intelligence OS'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'نظرة عامة حية على أداء الأسطول والصفقات والمخزون' : 'Live overview of agent fleet performance, active deals, and inventory telemetry.'}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-full">
            ● {isAr ? 'النظام متصل ومتكامل' : 'Systems Operational'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'إجمالي العقارات' : 'Active Catalog'}</div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">1,547</div>
          <div className="text-xs text-emerald-400 mt-1">+12% this week</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'العملاء النشطين' : 'Active Leads'}</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">284</div>
          <div className="text-xs text-emerald-400 mt-1">+8 new today</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'متوسط قيمة الصفقة' : 'Avg Deal Value'}</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">EGP 14.8M</div>
          <div className="text-xs text-emerald-400 mt-1">+5.2% MoM</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{isAr ? 'دقة الذكاء الاصطناعي' : 'AI Match Precision'}</div>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">98.4%</div>
          <div className="text-xs text-emerald-400 mt-1">AVM Tier 1 Verified</div>
        </div>
      </div>
    </div>
  );
}
