'use client';
import React from 'react';

export default function DeepInsightsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'الرؤى العميقة · تحليلات السوق' : 'Deep Market Insights & AVM Trends'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'تحليل أسعار كمبوندات التجمع الخامس ومعدلات العائد الاستثماري' : 'Compound price trajectories, rental yields, and AI-driven capital appreciation models.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-semibold text-white">Mountain View iCity</h3>
          <div className="text-xl font-bold text-cyan-400 mt-1">EGP 11.2M Avg</div>
          <div className="text-xs text-emerald-400 mt-1">+24% YoY Appreciation</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-semibold text-white">Hyde Park New Cairo</h3>
          <div className="text-xl font-bold text-cyan-400 mt-1">EGP 18.5M Avg</div>
          <div className="text-xs text-emerald-400 mt-1">+22% YoY Appreciation</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-semibold text-white">Uptown Cairo</h3>
          <div className="text-xl font-bold text-cyan-400 mt-1">EGP 9.4M Avg</div>
          <div className="text-xs text-emerald-400 mt-1">+31% YoY Appreciation</div>
        </div>
      </div>
    </div>
  );
}
