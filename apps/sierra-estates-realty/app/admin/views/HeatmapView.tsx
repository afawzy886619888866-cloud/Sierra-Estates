'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Compass, 
  Filter,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { CompoundHeatmapMetric, COMPOUNDS_HEATMAP_DATA } from '@/lib/services/compounds-heatmap-data';

export function HeatmapView() {
  const [compounds, setCompounds] = useState<CompoundHeatmapMetric[]>(COMPOUNDS_HEATMAP_DATA);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'capRate' | 'priceSqm' | 'appreciation' | 'inventory'>('capRate');
  const [selectedCompound, setSelectedCompound] = useState<CompoundHeatmapMetric | null>(COMPOUNDS_HEATMAP_DATA[0]);
  const [_loading, setLoading] = useState<boolean>(false);
  const [marketStats, setMarketStats] = useState({ avgCapRate: 12.5, avgPricePerSqm: 75850 });

  const zones = ['all', 'Golden Square', 'South 90th St', 'Suez Road', '1st Settlement', 'Northern Extension'];

  React.useEffect(() => {
    async function loadHeatmapData() {
      try {
        setLoading(true);
        const query = selectedZone !== 'all' ? `?zone=${encodeURIComponent(selectedZone)}` : '';
        const res = await fetch(`/api/analytics/compounds-heatmap${query}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.compounds)) {
          setCompounds(data.compounds);
          if (data.averageMarketCapRate) {
            setMarketStats({
              avgCapRate: data.averageMarketCapRate,
              avgPricePerSqm: data.averagePricePerSqm || 75850,
            });
          }
          if (data.compounds.length > 0) {
            setSelectedCompound((prev) => prev || data.compounds[0]);
          }
        }
      } catch (err) {
        console.warn('Using local fallback for heatmap data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHeatmapData();
  }, [selectedZone]);

  const filteredCompounds = [...compounds]
    .filter(c => selectedZone === 'all' || c.zone.toLowerCase().includes(selectedZone.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'capRate') return b.rentalCapRate - a.rentalCapRate;
      if (sortBy === 'priceSqm') return b.avgPricePerSqm - a.avgPricePerSqm;
      if (sortBy === 'appreciation') return b.fiveYearAppreciation - a.fiveYearAppreciation;
      return b.activeInventoryCount - a.activeInventoryCount;
    });

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              New Cairo Investment Yield & Capital Heatmap
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                2026 Live Benchmarks
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Real-time rental Cap Rates, price per square meter, and 5-year capital appreciation models across top New Cairo developments.
            </p>
          </div>
        </div>

        {/* Global Key Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-right">
            <div className="text-[11px] text-slate-400">Average Cap Rate</div>
            <div className="text-lg font-bold text-emerald-400">{marketStats.avgCapRate}% p.a.</div>
          </div>
          <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-right">
            <div className="text-[11px] text-slate-400">Market Avg / m²</div>
            <div className="text-lg font-bold text-amber-400">{marketStats.avgPricePerSqm.toLocaleString()} EGP</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Zone:
          </span>
          {zones.map(z => (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap ${
                selectedZone === z
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {z === 'all' ? 'All Zones (جميع المناطق)' : z}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="capRate">Rental Cap Rate (العائد الإيجاري)</option>
            <option value="priceSqm">Price / m² (سعر المتر)</option>
            <option value="appreciation">5-Year Growth (النمو الرأسمالي)</option>
            <option value="inventory">Active Inventory (عدد الوحدات)</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Compound Cards + Detailed Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compound Heatmap Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompounds.map((c) => {
            const isSelected = selectedCompound?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCompound(c)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-xl ${
                  isSelected
                    ? 'bg-slate-850/90 border-emerald-500/60 shadow-xl shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight">{c.name}</h3>
                    <div className="text-xs text-slate-400 font-arabic">{c.nameAr}</div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {c.investmentTier}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {c.zone}
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Cap Rate</div>
                    <div className="text-sm font-bold text-emerald-400">{c.rentalCapRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Price / m²</div>
                    <div className="text-sm font-bold text-amber-300">{Math.round(c.avgPricePerSqm / 1000)}k</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">5Y Growth</div>
                    <div className="text-sm font-bold text-[#E9C176]">+{c.fiveYearAppreciation}%</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center text-[11px] text-slate-400">
                  <span>{c.activeInventoryCount} Active Units</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    {c.recommendation}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Compound Deep Inspection Panel */}
        <div className="lg:col-span-4 space-y-6">
          {selectedCompound ? (
            <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl space-y-6 sticky top-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" /> Comprehensive Compound Intelligence
                </div>
                <h2 className="text-xl font-bold text-white">{selectedCompound.name}</h2>
                <div className="text-xs text-slate-400">{selectedCompound.nameAr} • {selectedCompound.zone}</div>
              </div>

              {/* Deep Financials */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Average Unit Resale:</span>
                  <span className="text-sm font-bold text-amber-400">{selectedCompound.avgResalePrice.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Average Monthly Rent:</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedCompound.avgRentalPriceMonthly.toLocaleString()} EGP / mo</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Liquidity Score:</span>
                  <span className="text-sm font-bold text-[#E9C176]">{selectedCompound.liquidityScore} / 10</span>
                </div>
              </div>

              {/* 5-Year Capital Gain Projection */}
              <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-emerald-500/20 space-y-2">
                <div className="text-xs font-semibold text-white flex items-center justify-between">
                  <span>5-Year Capital Appreciation:</span>
                  <span className="text-emerald-400 font-bold">+{selectedCompound.fiveYearAppreciation}%</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Historical CAGR and New Cairo master-plan expansion data indicate strong price resilience and prime tenant demand.
                </p>
              </div>

              {/* Quick Action */}
              <button
                onClick={() => window.open(`/compounds`, '_blank')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                <Building2 className="w-4 h-4" />
                Browse {selectedCompound.name} Units in Catalog
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">Select a compound to inspect metrics.</div>
          )}
        </div>
      </div>
    </div>
  );
}
