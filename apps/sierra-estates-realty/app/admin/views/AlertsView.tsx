'use client';
import React from 'react';

export default function AlertsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'مركز التنبيهات الذكية · الإشعارات الحرجة' : 'System Alerts & Threshold Warnings'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'تنبيهات فورية عند تجاوز حدود التسعير أو العملاء الساخنين' : 'Immediate escalations for AVM price deviations, high-value leads, or sync errors.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-300">
              {isAr ? 'تنبيه انحراف السعر: وحدة في قطامية ديونز' : 'AVM Deviation Alert: Katameya Dunes Unit'}
            </div>
            <p className="text-xs text-amber-200/70 mt-1">
              Asking price is 28% below median compound market value. Urgent review recommended.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 px-2 py-1 bg-amber-900/50 rounded">PRIORITY: HIGH</span>
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-cyan-300">
              {isAr ? 'عميل ساخن VIP: طلب معاينة فورية في ميفيدا' : 'VIP Hot Lead: Instant Viewing Request Mivida'}
            </div>
            <p className="text-xs text-cyan-200/70 mt-1">
              Lead Ahmed Al-Rashid requested 4:00 PM viewing tomorrow. Assigned to VIP Closer.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-2 py-1 bg-cyan-900/50 rounded">ACTION REQUIRED</span>
        </div>
      </div>
    </div>
  );
}
