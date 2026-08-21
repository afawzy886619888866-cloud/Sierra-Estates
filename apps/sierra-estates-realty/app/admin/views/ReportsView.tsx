'use client';
import React from 'react';

export default function ReportsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'التقارير التحليلية · التصدير' : 'Executive Reports & Analytics'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'توليد تقارير دورية عن أداء الوسطاء والمبيعات والتقييمات العقارية' : 'Automated valuation audits, monthly deal summaries, and broker KPI performance exports.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700">
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-md">
            {isAr ? 'توليد تقرير PDF' : 'Generate PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="font-semibold text-white">Q2 2026 Fleet Intelligence & Valuation Audit</div>
          <p className="text-xs text-slate-400">Generated on 2026-08-20 · Includes 1,547 listings evaluated by Vertex AI.</p>
          <div className="text-xs text-cyan-400 font-mono">Status: Ready for Download</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="font-semibold text-white">August Deal Conversion & Revenue Pipeline</div>
          <p className="text-xs text-slate-400">Generated today · 97 closed deals totaling EGP 601M in gross volume.</p>
          <div className="text-xs text-cyan-400 font-mono">Status: Ready for Download</div>
        </div>
      </div>
    </div>
  );
}
