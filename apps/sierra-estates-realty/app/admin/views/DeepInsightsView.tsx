'use client';

import React, { useState, useMemo } from 'react';

interface CompoundTrend {
  id: string;
  name: string;
  region: 'new-cairo' | 'sheikh-zayed' | 'north-coast';
  avgPrice: string;
  appreciation: string;
  rentalYield: string;
  pricePerSqm: string;
  demandIndex: 'VERY HIGH' | 'HIGH' | 'STABLE';
}

const COMPOUND_TRENDS: CompoundTrend[] = [
  {
    id: 'cmp-1',
    name: 'Mountain View iCity',
    region: 'new-cairo',
    avgPrice: 'EGP 11.2M Avg',
    appreciation: '+24% YoY Appreciation',
    rentalYield: '8.8% Net Yield',
    pricePerSqm: 'EGP 58,000 / m²',
    demandIndex: 'VERY HIGH',
  },
  {
    id: 'cmp-2',
    name: 'Hyde Park New Cairo',
    region: 'new-cairo',
    avgPrice: 'EGP 18.5M Avg',
    appreciation: '+22% YoY Appreciation',
    rentalYield: '7.9% Net Yield',
    pricePerSqm: 'EGP 64,500 / m²',
    demandIndex: 'VERY HIGH',
  },
  {
    id: 'cmp-3',
    name: 'Uptown Cairo',
    region: 'new-cairo',
    avgPrice: 'EGP 9.4M Avg',
    appreciation: '+31% YoY Appreciation',
    rentalYield: '9.5% Net Yield',
    pricePerSqm: 'EGP 72,000 / m²',
    demandIndex: 'VERY HIGH',
  },
  {
    id: 'cmp-4',
    name: 'Allegria Sheikh Zayed',
    region: 'sheikh-zayed',
    avgPrice: 'EGP 24.0M Avg',
    appreciation: '+19% YoY Appreciation',
    rentalYield: '7.4% Net Yield',
    pricePerSqm: 'EGP 69,000 / m²',
    demandIndex: 'HIGH',
  },
  {
    id: 'cmp-5',
    name: 'Marassi North Coast',
    region: 'north-coast',
    avgPrice: 'EGP 32.5M Avg',
    appreciation: '+38% YoY Appreciation',
    rentalYield: '14.2% Seasonal Yield',
    pricePerSqm: 'EGP 115,000 / m²',
    demandIndex: 'VERY HIGH',
  },
];

export default function DeepInsightsView({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'new-cairo' | 'sheikh-zayed' | 'north-coast'>('all');

  const filteredTrends = useMemo(() => {
    if (selectedRegion === 'all') return COMPOUND_TRENDS;
    return COMPOUND_TRENDS.filter((c) => c.region === selectedRegion);
  }, [selectedRegion]);

  return (
    <div className="space-y-6" data-testid="deep-insights-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? 'الرؤى العميقة · تحليلات السوق' : 'Deep Market Insights & AVM Trends'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr ? 'تحليل أسعار كمبوندات التجمع الخامس ومعدلات العائد الاستثماري' : 'Compound price trajectories, rental yields, and AI-driven capital appreciation models.'}
          </p>
        </div>

        {/* Region Filter */}
        <div className="flex gap-1.5 overflow-x-auto bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['all', 'new-cairo', 'sheikh-zayed', 'north-coast'] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                selectedRegion === reg
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {reg === 'all' && (isAr ? 'جميع المناطق' : 'All Regions')}
              {reg === 'new-cairo' && (isAr ? 'القاهرة الجديدة' : 'New Cairo')}
              {reg === 'sheikh-zayed' && (isAr ? 'الشيخ زايد' : 'Sheikh Zayed')}
              {reg === 'north-coast' && (isAr ? 'الساحل الشمالي' : 'North Coast')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Compound Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTrends.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {item.demandIndex}
                </span>
              </div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{item.avgPrice}</div>
              <div className="text-xs text-emerald-400 mt-1">{item.appreciation}</div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
              <span className="text-purple-300 font-mono">{item.rentalYield}</span>
              <span className="text-slate-400 font-mono">{item.pricePerSqm}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
