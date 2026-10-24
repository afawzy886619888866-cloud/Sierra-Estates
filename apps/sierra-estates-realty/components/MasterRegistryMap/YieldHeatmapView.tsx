import React, { useState, useMemo } from 'react';
import { Compound, COMPOUNDS, UNIT_LISTINGS } from './registryData';
import { 
  TrendingUp, 
  Flame, 
  Calculator, 
  Filter, 
  MapPin, 
  ArrowRight, 
  DollarSign, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Clock,
  Building,
  Table2,
  Map,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface YieldHeatmapViewProps {
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onSelectCompoundToExcel: (compound: Compound) => void;
  onViewOnMap: (compound: Compound) => void;
}

// Helper to parse max rental yield percentage from string e.g. "8.4% - 9.8%" -> 9.8
function parseYieldMax(rangeStr: string): number {
  const parts = rangeStr.split('-');
  if (parts.length > 1) {
    const num = parseFloat(parts[1].replace('%', '').trim());
    return isNaN(num) ? 9.0 : num;
  }
  const single = parseFloat(rangeStr.replace('%', '').trim());
  return isNaN(single) ? 9.0 : single;
}

function parseYieldMin(rangeStr: string): number {
  const parts = rangeStr.split('-');
  const num = parseFloat(parts[0].replace('%', '').trim());
  return isNaN(num) ? 8.0 : num;
}

export const YieldHeatmapView: React.FC<YieldHeatmapViewProps> = ({
  lang,
  isDarkMode,
  onSelectCompoundToExcel,
  onViewOnMap,
}) => {
  const isAr = lang === 'ar';

  const [minYieldFilter, setMinYieldFilter] = useState<number>(7.5);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>(COMPOUNDS[0].id);
  const [calculatorBudgetEgp, setCalculatorBudgetEgp] = useState<number>(18000000);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'ranking' | 'calculator'>('heatmap');

  // Compute yield metrics for all compounds
  const compoundsWithYield = useMemo(() => {
    return COMPOUNDS.map(c => {
      const minYield = parseYieldMin(c.rentalYieldRange);
      const maxYield = parseYieldMax(c.rentalYieldRange);
      const avgYield = +( (minYield + maxYield) / 2 ).toFixed(2);
      
      // Tier classification
      let tier: 'high' | 'core' | 'luxury';
      let tierColor = '#0EA5E9'; // Electric Cyan
      if (avgYield >= 9.8) {
        tier = 'high';
        tierColor = '#10B981'; // Emerald
      } else if (avgYield >= 8.8) {
        tier = 'core';
        tierColor = '#0EA5E9'; // Cyan
      } else {
        tier = 'luxury';
        tierColor = '#F59E0B'; // Champagne Gold
      }

      return {
        ...c,
        minYield,
        maxYield,
        avgYield,
        tier,
        tierColor,
      };
    });
  }, []);

  // Filtered compounds
  const filteredCompounds = useMemo(() => {
    return compoundsWithYield.filter(c => {
      const matchYield = c.maxYield >= minYieldFilter;
      const matchZone = selectedZone === 'all' || 
        c.zoneEn.toLowerCase().includes(selectedZone.toLowerCase()) ||
        c.zoneAr.includes(selectedZone);
      return matchYield && matchZone;
    }).sort((a, b) => b.avgYield - a.avgYield);
  }, [compoundsWithYield, minYieldFilter, selectedZone]);

  const activeCompound = useMemo(() => {
    return compoundsWithYield.find(c => c.id === selectedCompoundId) || compoundsWithYield[0];
  }, [compoundsWithYield, selectedCompoundId]);

  // Investment calculations
  const calculatedMetrics = useMemo(() => {
    const yieldPct = activeCompound.avgYield;
    const annualRentEgp = Math.round((calculatorBudgetEgp * yieldPct) / 100);
    const monthlyRentEgp = Math.round(annualRentEgp / 12);
    const monthlyRentUsd = Math.round(monthlyRentEgp / 49);
    const fiveYearAppreciation = Math.round(calculatorBudgetEgp * 0.72); // ~12% annualized appreciation
    const totalRoi5Years = annualRentEgp * 5 + fiveYearAppreciation;
    const paybackYears = +(100 / yieldPct).toFixed(1);

    return {
      yieldPct,
      annualRentEgp,
      monthlyRentEgp,
      monthlyRentUsd,
      fiveYearAppreciation,
      totalRoi5Years,
      paybackYears,
    };
  }, [activeCompound, calculatorBudgetEgp]);

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 py-6 transition-colors ${
      isDarkMode ? 'text-stone-100' : 'text-stone-900'
    }`}>
      
      {/* Header Section styled in Sierra Estates Identity Colors */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-cyan-500/20 dark:border-cyan-400/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-cyan-500" />
            <span>{isAr ? 'محرك تحليل العوائد الاستثمارية' : 'RENTAL YIELD HEATMAP & ROI ENGINE'}</span>
            <span>·</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">sierra-estates.net</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-cinzel text-stone-900 dark:text-white">
            {isAr ? 'خريطة العوائد الإيجارية لمشروعات القاهرة الجديدة' : 'New Cairo Rental Yield Heatmap'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
            {isAr 
              ? 'تحليل حراري بياني دقيق لعوائد الإيجار السنوية عبر كافة مشروعات القاهرة الجديدة والمربع الذهبي، مدعوم بنموذج تقييم العقارات الذكي من سيرّا العقارية.'
              : 'Precision thermal visualization of annualized rental yields across New Cairo & Golden Square enclaves, mapped to real market lease data and automated valuation signals.'
            }
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-right">
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 uppercase block">
              {isAr ? 'متوسط عائد القاهرة الجديدة' : 'Avg New Cairo Yield'}
            </span>
            <span className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
              9.42%
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 uppercase block">
              {isAr ? 'أعلى عائد مسجل' : 'Peak Enclave Yield'}
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              11.5%
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Control Toolbar */}
      <div className={`mt-4 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-4 text-xs transition-colors ${
        isDarkMode 
          ? 'bg-[#070E1A] border-cyan-900/30 shadow-md' 
          : 'bg-[#FAF8F5] border-[#E6DEC8] shadow-xs'
      }`}>
        
        {/* View Switcher Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-stone-200/70 dark:bg-stone-900/80">
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'heatmap'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-cyan-500'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isAr ? 'الخريطة الحرارية' : 'Visual Heatmap'}</span>
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-cyan-500'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isAr ? 'ترتيب أعلى العوائد' : 'Yield Rankings'}</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'calculator'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-cyan-500'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{isAr ? 'حاسبة التدفق النقدي' : 'ROI Simulator'}</span>
          </button>
        </div>

        {/* Zone Selector */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-mono text-[11px] uppercase">
            {isAr ? 'المنطقة:' : 'Zone:'}
          </span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:outline-hidden focus:border-cyan-500"
          >
            <option value="all">{isAr ? 'جميع المناطق (18)' : 'All Master Enclaves'}</option>
            <option value="Golden Square">{isAr ? 'المربع الذهبي' : 'Golden Square'}</option>
            <option value="Suez">{isAr ? 'محور طريق السويس' : 'Suez Road Axis'}</option>
            <option value="South">{isAr ? 'التسعين الجنوبي والسخنة' : 'South 90th & Sokhna'}</option>
            <option value="Eastern">{isAr ? 'التوسعات الشرقية والمستقبل' : 'Eastern Growth Corridor'}</option>
          </select>
        </div>

        {/* Min Yield Filter Slider */}
        <div className="flex items-center gap-3">
          <span className="text-stone-400 font-mono text-[11px] uppercase whitespace-nowrap">
            {isAr ? 'الحد الأدنى للعائد:' : 'Min Yield:'}
          </span>
          <input
            type="range"
            min="7.5"
            max="11.0"
            step="0.5"
            value={minYieldFilter}
            onChange={(e) => setMinYieldFilter(parseFloat(e.target.value))}
            className="w-24 sm:w-32 accent-cyan-500 cursor-pointer"
          />
          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 min-w-[42px]">
            &ge; {minYieldFilter}%
          </span>
        </div>

      </div>

      {/* Primary Tab Content */}
      <div className="mt-6">
        
        {/* TAB 1: VISUAL GEOGRAPHIC HEATMAP BOARD */}
        {activeTab === 'heatmap' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Visual Heatmap Board Container */}
            <div className={`relative w-full rounded-2xl overflow-hidden border-2 shadow-2xl p-4 sm:p-6 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-[#070E1A] border-cyan-500/30' 
                : 'bg-[#FAF8F5] border-[#B8860B]/40'
            }`}>
              
              {/* Inner Framing Line */}
              <div className="absolute inset-1.5 rounded-xl border border-cyan-500/20 pointer-events-none" />

              {/* Top Heatmap Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel font-bold text-sm tracking-wide">
                    {isAr ? 'مستويات العوائد الإيجارية السنوية (Cap Rate)' : 'New Cairo Cap Rate Spectrum'}
                  </span>
                </div>

                {/* Legend Chips */}
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span>&gt; 10.0% ({isAr ? 'عائد استثنائي' : 'Ultra High'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                    <span>9.0% - 9.9% ({isAr ? 'عائد ممتاز' : 'Prime Growth'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <span>8.0% - 8.9% ({isAr ? 'عائد متوازن فاخر' : 'Core Luxury'})</span>
                  </div>
                </div>
              </div>

              {/* Interactive Cartographic Thermal Matrix (Relative Geodetic Grid) */}
              <div className="relative w-full aspect-[16/9] min-h-[460px] rounded-xl overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-[#060B14] via-[#091427] to-[#040810] flex items-center justify-center p-4">
                
                {/* Background Coordinate Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 1000 562.5">
                  <defs>
                    <radialGradient id="aucHeatGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Concentric rings from AUC */}
                  <circle cx="500" cy="285" r="80" fill="url(#aucHeatGlow)" stroke="#0EA5E9" strokeWidth="0.8" strokeDasharray="3 3" />
                  <circle cx="500" cy="285" r="160" fill="none" stroke="#0EA5E9" strokeWidth="0.8" opacity="0.4" />
                  <circle cx="500" cy="285" r="240" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.3" />
                  <circle cx="500" cy="285" r="340" fill="none" stroke="#0EA5E9" strokeWidth="0.6" strokeDasharray="5 5" opacity="0.2" />

                  {/* Highway Spine Guides */}
                  <path d="M 200 450 C 400 350 600 280 800 200" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
                  <path d="M 300 240 C 500 285 700 320 900 320" fill="none" stroke="#0EA5E9" strokeWidth="1.2" opacity="0.4" />
                </svg>

                {/* Central AUC Marker */}
                <div 
                  style={{ left: '50%', top: '50.7%' }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center animate-ping" />
                  <span className="text-[9px] font-mono font-bold text-cyan-300 mt-1 uppercase tracking-wider bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                    AUC Hub (30.0197° N)
                  </span>
                </div>

                {/* Render Thermal Compound Nodes */}
                {filteredCompounds.map(c => {
                  const isSelected = c.id === selectedCompoundId;
                  
                  // Halo sizing based on yield
                  const haloSize = Math.round(c.avgYield * 7.5);
                  
                  return (
                    <div
                      key={c.id}
                      style={{
                        left: `${c.xPct}%`,
                        top: `${c.yPct}%`,
                      }}
                      onClick={() => setSelectedCompoundId(c.id)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-transform duration-200 hover:scale-115"
                    >
                      {/* Thermal Radiant Aura */}
                      <div 
                        style={{
                          width: `${haloSize}px`,
                          height: `${haloSize}px`,
                          backgroundColor: c.tierColor,
                          boxShadow: `0 0 25px ${c.tierColor}`,
                        }}
                        className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 group-hover:opacity-60 transition-opacity animate-pulse"
                      />

                      {/* Main Node Pill */}
                      <div className={`relative px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all ${
                        isSelected 
                          ? 'border-white bg-black/90 scale-110 shadow-cyan-500/50' 
                          : 'border-cyan-500/40 bg-black/75 hover:border-cyan-300'
                      }`}>
                        <span 
                          style={{ backgroundColor: c.tierColor }}
                          className="w-2 h-2 rounded-full shrink-0" 
                        />
                        <span className="font-mono font-bold text-[11px] text-white">
                          {c.avgYield}%
                        </span>
                        <span className="hidden sm:inline font-sans text-[10px] text-stone-300 max-w-[80px] truncate">
                          {c.code}
                        </span>
                      </div>

                      {/* Floating Tooltip Preview */}
                      <div className="absolute bottom-[115%] left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none min-w-[170px] z-30 animate-fade-in">
                        <div className="p-2.5 rounded-lg bg-[#081224]/95 border border-cyan-400 text-white shadow-2xl text-center text-xs backdrop-blur-md">
                          <div className="font-cinzel font-bold text-xs">
                            {c.nameEn}
                          </div>
                          <div className="text-[10px] text-cyan-300 font-mono">
                            Yield: {c.rentalYieldRange}
                          </div>
                          <div className="text-[10px] text-stone-300 font-mono mt-0.5">
                            Rent: EGP {(c.startingRentEgp / 1000).toFixed(0)}k/mo
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {/* Bottom Left Watermark */}
                <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-cyan-500/30 backdrop-blur-xs text-[10px] font-mono text-stone-300">
                  <span className="text-cyan-400 font-bold">sierra-estates.net</span>
                  <span>·</span>
                  <span>Thermal Cap-Rate Model</span>
                </div>

              </div>

            </div>

            {/* Selected Compound Drilldown & Quick Actions */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#070E1A] border-cyan-500/30' : 'bg-white border-[#E6DEC8]'
            }`}>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-cinzel font-bold text-lg text-stone-900 dark:text-white">
                        {activeCompound.nameEn}
                      </h3>
                      <span className="text-xs font-cairo font-semibold text-amber-600 dark:text-amber-400">
                        {activeCompound.nameAr}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        № {activeCompound.indexNumber}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                      {isAr ? activeCompound.descriptionAr : activeCompound.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Metric Summary Pills */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'عائد الإيجار السنوي' : 'Cap Rate Yield'}</span>
                    <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">
                      {activeCompound.rentalYieldRange}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'سعر المتر / البيع' : 'Starting Resale'}</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                      EGP {(activeCompound.startingPriceEgp / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'الإيجار الشهري المتوقع' : 'Expected Rent'}</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      EGP {(activeCompound.startingRentEgp / 1000).toFixed(0)}k/mo
                    </span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectCompoundToExcel(activeCompound)}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'عرض شيت الإكسيل' : 'Open in Excel'}</span>
                  </button>
                  <button
                    onClick={() => onViewOnMap(activeCompound)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-cyan-500/20 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-all cursor-pointer border border-stone-300 dark:border-stone-700"
                  >
                    <Map className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{isAr ? 'تحديد على الماستر بلان' : 'Locate on Map'}</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: YIELD RANKINGS & LEADERBOARD */}
        {activeTab === 'ranking' && (
          <div className="space-y-4 animate-fade-in">
            <div className={`overflow-x-auto rounded-2xl border shadow-xl ${
              isDarkMode ? 'border-cyan-500/30 bg-[#070E1A]' : 'border-[#E6DEC8] bg-white'
            }`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b font-mono uppercase text-[11px] ${
                    isDarkMode ? 'bg-[#0B1528] text-cyan-300 border-stone-800' : 'bg-[#F4EFE6] text-stone-700 border-[#E6DEC8]'
                  }`}>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isAr ? 'المشروع' : 'Compound & Developer'}</th>
                    <th className="py-3 px-4">{isAr ? 'المنطقة' : 'Zone'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'نطاق العائد السنوي' : 'Yield Range'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'متوسط العائد' : 'Avg Cap Rate'}</th>
                    <th className="py-3 px-4 text-right">{isAr ? 'يبدأ البيع من' : 'Starting Price'}</th>
                    <th className="py-3 px-4 text-right">{isAr ? 'يبدأ الإيجار من' : 'Monthly Rent'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono text-[11px]">
                  {filteredCompounds.map((c, idx) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-cyan-500/5 transition-colors cursor-pointer ${
                        c.id === selectedCompoundId ? 'bg-cyan-500/10' : ''
                      }`}
                      onClick={() => setSelectedCompoundId(c.id)}
                    >
                      <td className="py-3 px-4 font-bold text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-stone-900 dark:text-stone-100">
                        <div>{c.nameEn}</div>
                        <div className="text-[10px] text-stone-400 font-mono font-normal">{c.developerEn}</div>
                      </td>
                      <td className="py-3 px-4 font-sans text-stone-500 dark:text-stone-400">
                        {c.zoneEn}
                      </td>
                      <td className="py-3 px-4 text-center text-stone-700 dark:text-stone-300">
                        {c.rentalYieldRange}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          style={{ color: c.tierColor }}
                          className="font-extrabold text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20"
                        >
                          {c.avgYield}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                        EGP {(c.startingPriceEgp / 1000000).toFixed(1)}M
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        EGP {(c.startingRentEgp / 1000).toFixed(0)}k/mo
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCompoundToExcel(c);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                        >
                          {isAr ? 'فتح الشيت' : 'Excel Units'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ROI & CASHFLOW SIMULATOR */}
        {activeTab === 'calculator' && (
          <div className="space-y-6 animate-fade-in">
            <div className={`p-6 rounded-2xl border shadow-xl ${
              isDarkMode ? 'bg-[#070E1A] border-cyan-500/30' : 'bg-white border-[#E6DEC8]'
            }`}>
              
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-stone-200 dark:border-stone-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-stone-900 dark:text-white">
                    {isAr ? 'حاسبة العوائد والتدفق النقدي الاستثماري' : 'Sierra Estates Smart Yield & Cashflow Simulator'}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                    Targeted AVM Investment Yield Modeling · sierra-estates.net
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Inputs Column */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      {isAr ? 'اختر المشروع الاستثماري:' : 'Selected Investment Enclave:'}
                    </label>
                    <select
                      value={selectedCompoundId}
                      onChange={(e) => setSelectedCompoundId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:outline-hidden focus:border-cyan-500"
                    >
                      {compoundsWithYield.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} ({c.zoneEn}) — Cap Rate: {c.avgYield}%
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-stone-700 dark:text-stone-300">
                        {isAr ? 'مبلغ الاستثمار المستهدف:' : 'Target Capital Allocation:'}
                      </span>
                      <span className="font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                        EGP {calculatorBudgetEgp.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5000000"
                      max="60000000"
                      step="1000000"
                      value={calculatorBudgetEgp}
                      onChange={(e) => setCalculatorBudgetEgp(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                      <span>5M EGP</span>
                      <span>30M EGP</span>
                      <span>60M EGP</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-stone-600 dark:text-stone-300 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-600 dark:text-cyan-400">
                      <Info className="w-4 h-4" />
                      <span>{isAr ? 'معايير حساب العائد' : 'Model Methodology'}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {isAr
                        ? 'تعتمد التقديرات على أسعار الإيجار الفعلية المسجلة في عقود 2025/2026 بالقاهرة الجديدة، مع خصم مصاريف الصيانة والإدارة التقديرية، واحتساب متوسط الزيادة السنوية في القيمة السوقية للعقار.'
                        : 'Calculations reference executed 2025/2026 lease contracts across New Cairo, net of normalized service charges, factored with 12% projected compound capital appreciation.'
                      }
                    </p>
                  </div>
                </div>

                {/* Outputs Column */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-[#091427] to-[#040810] border border-cyan-500/40 text-white space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
                    <span className="font-mono text-xs text-cyan-300 uppercase tracking-wider">
                      {isAr ? 'صافي العائد السنوي المتوقع' : 'Projected Net Cap Rate'}
                    </span>
                    <span className="font-mono font-extrabold text-2xl text-emerald-400">
                      {calculatedMetrics.yieldPct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">
                        {isAr ? 'التدفق الشهري الإيجاري' : 'Monthly Cashflow'}
                      </span>
                      <span className="text-base font-extrabold text-cyan-300 font-mono">
                        EGP {calculatedMetrics.monthlyRentEgp.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500 block mt-0.5">
                        &approx; ${calculatedMetrics.monthlyRentUsd.toLocaleString()} USD
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">
                        {isAr ? 'الدخل السنوي الإجمالي' : 'Annual Gross Rent'}
                      </span>
                      <span className="text-base font-extrabold text-emerald-300 font-mono">
                        EGP {calculatedMetrics.annualRentEgp.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">
                        {isAr ? 'فترة استرداد رأس المال' : 'Capital Payback'}
                      </span>
                      <span className="text-base font-extrabold text-amber-300 font-mono">
                        {calculatedMetrics.paybackYears} {isAr ? 'سنوات' : 'Years'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">
                        {isAr ? 'العائد التراكمي (5 سنوات)' : '5-Yr Total Projected Return'}
                      </span>
                      <span className="text-base font-extrabold text-white font-mono">
                        EGP {calculatedMetrics.totalRoi5Years.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCompoundToExcel(activeCompound)}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Table2 className="w-4 h-4" />
                    <span>{isAr ? 'تصفح وحدات المشروع المتاحة في الإكسيل' : 'View Available Units for this Enclave'}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
};
