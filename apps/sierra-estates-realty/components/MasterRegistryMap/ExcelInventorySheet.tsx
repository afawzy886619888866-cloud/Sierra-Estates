import React, { useState, useMemo } from 'react';
import { UnitListing, Compound, UNIT_LISTINGS, COMPOUNDS } from './registryData';
import { UnitComparisonModal } from './UnitComparisonModal';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Maximize2, 
  Calculator,
  Building,
  Check,
  ChevronDown,
  Sparkles,
  Layers,
  MapPin,
  TrendingUp,
  CheckSquare,
  Square,
  Scale,
  Trash2
} from 'lucide-react';

interface ExcelInventorySheetProps {
  selectedCompound: Compound | null;
  onSelectCompound: (compound: Compound) => void;
  onSelectUnit: (unit: UnitListing) => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
}

export const ExcelInventorySheet: React.FC<ExcelInventorySheetProps> = ({
  selectedCompound,
  onSelectCompound,
  onSelectUnit,
  lang,
  isDarkMode,
}) => {
  const isAr = lang === 'ar';

  const [activePurpose, setActivePurpose] = useState<'All' | 'Resale' | 'Rent'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string }>({ row: 1, col: 'A' });
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'rent-desc' | 'bua-desc' | 'ppm-asc' | 'code'>('code');
  const [showClearBlueprint, setShowClearBlueprint] = useState(true);

  // Compare Units State (up to 3 units)
  const [compareUnits, setCompareUnits] = useState<UnitListing[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Active compound ID filter
  const currentCompoundId = selectedCompound ? selectedCompound.id : 'all';

  const handleCompoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'all') {
      onSelectCompound(COMPOUNDS[0]);
    } else {
      const found = COMPOUNDS.find(c => c.id === val);
      if (found) onSelectCompound(found);
    }
  };

  // Toggle compare unit selection
  const toggleCompareUnit = (unit: UnitListing) => {
    setCompareUnits(prev => {
      const exists = prev.some(u => u.id === unit.id);
      if (exists) {
        return prev.filter(u => u.id !== unit.id);
      } else {
        if (prev.length >= 3) {
          // If already 3, replace the oldest or show notification
          return [...prev.slice(1), unit];
        }
        return [...prev, unit];
      }
    });
  };

  const removeFromCompare = (unitId: string) => {
    setCompareUnits(prev => prev.filter(u => u.id !== unitId));
  };

  const clearCompare = () => {
    setCompareUnits([]);
  };

  // Filter units
  const units = useMemo(() => {
    return UNIT_LISTINGS.filter(u => {
      const matchCompound = currentCompoundId === 'all' || u.compoundId === currentCompoundId;
      const matchPurpose = activePurpose === 'All' 
        || (activePurpose === 'Resale' && (u.purpose === 'Resale' || u.purpose === 'Both'))
        || (activePurpose === 'Rent' && (u.purpose === 'Rent' || u.purpose === 'Both'));
      const matchSearch = u.unitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.compoundNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.typeEn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCompound && matchPurpose && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.resalePriceEgp - b.resalePriceEgp;
      if (sortBy === 'price-desc') return b.resalePriceEgp - a.resalePriceEgp;
      if (sortBy === 'rent-desc') return b.monthlyRentEgp - a.monthlyRentEgp;
      if (sortBy === 'bua-desc') return b.buaM2 - a.buaM2;
      if (sortBy === 'ppm-asc') {
        const ppmA = a.buaM2 > 0 ? a.resalePriceEgp / a.buaM2 : 0;
        const ppmB = b.buaM2 > 0 ? b.resalePriceEgp / b.buaM2 : 0;
        return ppmA - ppmB;
      }
      return a.unitCode.localeCompare(b.unitCode);
    });
  }, [currentCompoundId, activePurpose, searchQuery, sortBy]);

  // Aggregate statistics for formula bar and status bar
  const stats = useMemo(() => {
    if (units.length === 0) return { avgResale: 0, avgRent: 0, totalAssets: 0, avgYield: 0, avgPpm: 0 };
    const totalAssets = units.reduce((acc, u) => acc + u.resalePriceEgp, 0);
    const avgResale = totalAssets / units.length;
    const avgRent = units.reduce((acc, u) => acc + u.monthlyRentEgp, 0) / units.length;
    const avgYield = units.reduce((acc, u) => acc + u.rentalYieldPct, 0) / units.length;
    const totalBua = units.reduce((acc, u) => acc + u.buaM2, 0);
    const avgPpm = totalBua > 0 ? totalAssets / totalBua : 0;
    return { avgResale, avgRent, totalAssets, avgYield, avgPpm };
  }, [units]);

  const exportExcel = () => {
    const headers = ['Row', 'Unit Code', 'Compound', 'Typology', 'BUA (m²)', 'Price/m² (EGP)', 'Land (m²)', 'Bedrooms', 'Bathrooms', 'Purpose', 'Resale Price (EGP)', 'Monthly Rent (EGP)', 'Yield %', 'Status', 'Handover'];
    const rows = units.map((u, i) => [
      i + 1,
      u.unitCode,
      u.compoundNameEn,
      u.typeEn,
      u.buaM2,
      u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0,
      u.landM2,
      u.bedrooms,
      u.bathrooms,
      u.purpose,
      u.resalePriceEgp,
      u.monthlyRentEgp,
      `${u.rentalYieldPct}%`,
      u.statusEn,
      u.deliveryYear
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sierra_Estates_Inventory_${selectedCompound?.nameEn || 'Registry'}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-2 sm:px-4 py-6 transition-colors ${
      isDarkMode ? 'text-stone-100' : 'text-stone-900'
    }`}>
      
      {/* EXCEL SHEET WINDOW CONTAINER */}
      <div className={`rounded-xl border-2 shadow-2xl overflow-hidden transition-all duration-300 ${
        isDarkMode 
          ? 'bg-[#060D18] border-cyan-500/30 shadow-black/80' 
          : 'bg-white border-[#B8860B]/40 shadow-xl'
      }`}>
        
        {/* 1. Authentic Excel Ribbon Header with Sierra Estates Palette */}
        <div className={`text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md ${
          isDarkMode 
            ? 'bg-gradient-to-r from-[#0F1D36] via-[#16294A] to-[#0A1526] border-b border-cyan-500/30' 
            : 'bg-[#107C41]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs border border-white/30">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide font-cinzel">
                  SIERRA ESTATES · MASTER REGISTRY WORKBOOK.XLSX
                </span>
                <span className="px-2 py-0.2 rounded-xs bg-black/40 text-[10px] font-mono uppercase text-cyan-300 border border-cyan-500/30">
                  Sheet: {selectedCompound?.nameEn || 'All Compounds'}
                </span>
                <span className="text-[10px] font-mono text-amber-300 hidden sm:inline">
                  sierra-estates.net
                </span>
              </div>
              <div className="text-[10px] opacity-85 font-mono">
                {isAr ? 'سجل الحصر التنفيذي لوحدات الإيجار وإعادة البيع بالقاهرة الجديدة 2026' : 'Executive Master Real Estate Registry & Valuation Matrix 2026'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compare Units Trigger Button */}
            <button
              onClick={() => {
                if (compareUnits.length === 0 && units.length > 0) {
                  setCompareUnits(units.slice(0, Math.min(units.length, 3)));
                }
                setIsCompareModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title={isAr ? 'مقارنة مواصفات وسعر المتر لـ 3 وحدات' : 'Compare up to 3 units side-by-side'}
            >
              <Scale className="w-3.5 h-3.5 text-cyan-200" />
              <span>{isAr ? `مقارنة الوحدات (${compareUnits.length}/3)` : `Compare Units (${compareUnits.length}/3)`}</span>
            </button>

            <button
              onClick={() => setShowClearBlueprint(!showClearBlueprint)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showClearBlueprint ? (isAr ? 'إخفاء المخطط' : 'Hide Blueprint') : (isAr ? 'إظهار المخطط' : 'Show Blueprint')}</span>
            </button>

            <button
              onClick={exportExcel}
              className="px-3.5 py-1.5 rounded-md text-xs font-bold bg-white text-stone-900 hover:bg-stone-100 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isAr ? 'تصدير إكسيل .CSV' : 'Download .XLSX'}</span>
            </button>
          </div>
        </div>

        {/* 2. Excel Functional Formula & Ribbon Sub-Bar */}
        <div className={`p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b ${
          isDarkMode 
            ? 'bg-[#0B1528] border-stone-800' 
            : 'bg-[#F3F2F1] border-stone-300'
        }`}>
          
          {/* Compound Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-500 font-bold uppercase text-[11px]">
              {isAr ? 'المشروع:' : 'Compound:'}
            </span>
            <select
              value={currentCompoundId}
              onChange={handleCompoundChange}
              className="px-3 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-semibold text-xs text-stone-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
            >
              {COMPOUNDS.map(c => (
                <option key={c.id} value={c.id}>
                  № {c.indexNumber < 10 ? `0${c.indexNumber}` : c.indexNumber} · {c.nameEn} ({c.zoneEn})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Filter (including Price per M²) */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-500 font-bold uppercase text-[11px]">
              {isAr ? 'ترتيب حسب:' : 'Sort:'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:outline-hidden focus:border-cyan-500"
            >
              <option value="code">{isAr ? 'رمز الوحدة' : 'Unit Code'}</option>
              <option value="ppm-asc">{isAr ? 'سعر المتر: من الأقل للأعلى' : 'Price/M²: Lowest to Highest'}</option>
              <option value="price-asc">{isAr ? 'السعر الإجمالي: تصاعدي' : 'Total Price: Low to High'}</option>
              <option value="price-desc">{isAr ? 'السعر الإجمالي: تنازلي' : 'Total Price: High to Low'}</option>
              <option value="rent-desc">{isAr ? 'الإيجار: الأعلى' : 'Rent: Highest'}</option>
              <option value="bua-desc">{isAr ? 'المساحة المبنية: الأكبر' : 'BUA: Largest'}</option>
            </select>
          </div>

          {/* Purpose Tabs (Rent / Resale / All) */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-stone-200 dark:bg-stone-800">
            {(['All', 'Resale', 'Rent'] as const).map(p => (
              <button
                key={p}
                onClick={() => setActivePurpose(p)}
                className={`px-3 py-1 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                  activePurpose === p
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                {p === 'All' ? (isAr ? 'الكل (إيجار وبيع)' : 'All (Rent & Resale)') : p === 'Resale' ? (isAr ? 'إعادة بيع فقط' : 'Resale Only') : (isAr ? 'إيجار فقط' : 'Rent Only')}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالخلية أو الرمز...' : 'Filter cell or unit...'}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-hidden focus:border-cyan-500"
            />
          </div>
        </div>

        {/* 3. Formula Address Bar */}
        <div className={`border-b px-3 py-1.5 flex items-center gap-3 text-xs font-mono ${
          isDarkMode ? 'bg-[#080E1A] border-stone-800' : 'bg-[#FAF9F8] border-stone-200'
        }`}>
          <div className="px-2 py-0.5 rounded-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 font-bold text-cyan-600 dark:text-cyan-400">
            {selectedCell.col}{selectedCell.row}
          </div>
          <div className="text-stone-400 italic">fx</div>
          <div className="text-stone-700 dark:text-stone-300 flex-1 truncate">
            =VALUATION.COMPARE("{selectedCompound?.nameEn || 'VILLETTE'}", PPM_AVG={Math.round(stats.avgPpm)}, UNITS={units.length})
          </div>
          <div className="text-[11px] text-stone-500 font-sans hidden sm:block">
            {units.length} rows loaded · Avg EGP {Math.round(stats.avgPpm).toLocaleString()}/m²
          </div>
        </div>

        {/* 4. Split Layout: High-Clarity Master Plan Blueprint + Metrics */}
        {showClearBlueprint && selectedCompound && (
          <div className={`p-4 border-b ${
            isDarkMode ? 'bg-[#070E1A] border-stone-800' : 'bg-[#F5F8F6] border-emerald-900/20'
          }`}>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              
              {/* Clear Blueprint Graphic */}
              <div className={`w-full lg:w-1/2 rounded-xl overflow-hidden border p-3 shadow-inner ${
                isDarkMode ? 'bg-[#040913] border-cyan-500/30' : 'bg-white border-emerald-600/40'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono text-cyan-700 dark:text-cyan-300 mb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedCompound.nameEn} · CLEAR MASTER PLAN BLUEPRINT</span>
                  </span>
                  <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
                    SCALE: 1:5,000 ARCHITECTURAL
                  </span>
                </div>

                {/* SVG Clear Master Plan Diagram */}
                <div className="relative w-full aspect-[21/9] rounded-lg bg-gradient-to-br from-cyan-950/20 via-sky-950/10 to-stone-900/20 flex items-center justify-center overflow-hidden border border-dashed border-cyan-500/30">
                  <svg className="w-full h-full p-2" viewBox="0 0 600 240">
                    <rect x="20" y="20" width="560" height="200" rx="16" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeDasharray="6 4" />
                    <line x1="20" y1="120" x2="580" y2="120" stroke="#c8961a" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
                    <line x1="300" y1="20" x2="300" y2="220" stroke="#c8961a" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
                    <ellipse cx="300" cy="120" rx="60" ry="35" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.5" />
                    <text x="300" y="115" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">CENTRAL LAGOON & CLUBHOUSE</text>
                    <text x="300" y="130" textAnchor="middle" fill="#d4af37" fontSize="9" fontFamily="JetBrains Mono">{selectedCompound.zoneEn}</text>
                  </svg>
                </div>
              </div>

              {/* Compound Financial Metrics */}
              <div className="w-full lg:w-1/2 flex flex-col justify-between gap-3 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between pb-1 mb-2 border-b border-stone-200 dark:border-stone-800">
                    <span className="font-cinzel font-bold text-sm text-stone-900 dark:text-white">
                      {selectedCompound.nameEn} ({selectedCompound.nameAr})
                    </span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                      {selectedCompound.developerEn}
                    </span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 font-sans text-xs line-clamp-2">
                    {isAr ? selectedCompound.descriptionAr : selectedCompound.descriptionEn}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div className="p-2 rounded-md bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'عائد الإيجار' : 'Yield Range'}</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      {selectedCompound.rentalYieldRange}
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'متوسط سعر المتر' : 'Avg Price/M²'}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      EGP {Math.round(stats.avgPpm).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'يبدأ الإيجار من' : 'Starting Rent'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      EGP {(selectedCompound.startingRentEgp / 1000).toFixed(0)}k/mo
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 block">{isAr ? 'المسافة إلى AUC' : 'Drive to AUC'}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {selectedCompound.driveTimeToAucMin} min
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 5. Authentic Excel Data Table Grid */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs">
          <table className="w-full text-left border-collapse select-none">
            
            {/* Excel Column Letters Header */}
            <thead className={`sticky top-0 z-20 text-[11px] font-bold border-b-2 ${
              isDarkMode 
                ? 'bg-[#0F1D36] text-stone-300 border-stone-700' 
                : 'bg-[#E1DFDD] text-stone-700 border-stone-300'
            }`}>
              <tr>
                {/* Checkbox Compare Select Column */}
                <th className="w-12 py-2 text-center border-r border-stone-300 dark:border-stone-700 text-cyan-600 dark:text-cyan-400">
                  <span className="text-[9px] text-stone-400 block font-mono">VS</span>
                  <CheckSquare className="w-3.5 h-3.5 mx-auto" />
                </th>
                {/* Row Number Header Cell */}
                <th className="w-10 py-2 text-center bg-[#D2D0CE] dark:bg-[#121E31] border-r border-stone-300 dark:border-stone-700 text-stone-500 font-mono text-[10px]">
                  #
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700">
                  <span className="text-[9px] text-stone-400 block">A</span>
                  {isAr ? 'رمز الوحدة' : 'Unit Code'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 font-sans">
                  <span className="text-[9px] text-stone-400 block font-mono">B</span>
                  {isAr ? 'المشروع' : 'Compound'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 font-sans">
                  <span className="text-[9px] text-stone-400 block font-mono">C</span>
                  {isAr ? 'النوع Typology' : 'Typology'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right">
                  <span className="text-[9px] text-stone-400 block">D</span>
                  BUA m²
                </th>
                {/* HIGHLIGHTED: Price Per M² Column */}
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right text-cyan-600 dark:text-cyan-400 bg-cyan-500/10">
                  <span className="text-[9px] text-stone-400 block">E</span>
                  {isAr ? 'سعر المتر EGP/m²' : 'Price / M²'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right">
                  <span className="text-[9px] text-stone-400 block">F</span>
                  Land m²
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-center">
                  <span className="text-[9px] text-stone-400 block">G</span>
                  Bed/Bath
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-center">
                  <span className="text-[9px] text-stone-400 block">H</span>
                  {isAr ? 'الغرض' : 'Purpose'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right text-emerald-800 dark:text-emerald-400">
                  <span className="text-[9px] text-stone-400 block">I</span>
                  {isAr ? 'الإيجار الشهري' : 'Monthly Rent'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right text-amber-800 dark:text-amber-400">
                  <span className="text-[9px] text-stone-400 block">J</span>
                  {isAr ? 'سعر إعادة البيع' : 'Resale Price'}
                </th>
                <th className="py-2 px-3 border-r border-stone-300 dark:border-stone-700 text-right">
                  <span className="text-[9px] text-stone-400 block">K</span>
                  Yield %
                </th>
                <th className="py-2 px-3 text-center">
                  <span className="text-[9px] text-stone-400 block">L</span>
                  Action
                </th>
              </tr>
            </thead>

            {/* Excel Row Data with Authentic Row Numbers */}
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-[#0C1524]">
              {units.map((unit, index) => {
                const rowNum = index + 1;
                const isSelectedRow = selectedCell.row === rowNum;
                const isCheckedForCompare = compareUnits.some(u => u.id === unit.id);
                const pricePerM2 = unit.buaM2 > 0 ? Math.round(unit.resalePriceEgp / unit.buaM2) : 0;

                return (
                  <tr
                    key={unit.id}
                    onClick={() => {
                      setSelectedCell({ row: rowNum, col: 'A' });
                    }}
                    onDoubleClick={() => onSelectUnit(unit)}
                    className={`hover:bg-cyan-500/10 transition-colors cursor-cell group ${
                      isCheckedForCompare 
                        ? 'bg-cyan-500/15' 
                        : isSelectedRow 
                          ? 'bg-emerald-500/15' 
                          : ''
                    }`}
                  >
                    {/* Checkbox Compare Column */}
                    <td 
                      className="w-12 py-2 text-center border-r border-stone-200 dark:border-stone-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isCheckedForCompare}
                        onChange={() => toggleCompareUnit(unit)}
                        disabled={!isCheckedForCompare && compareUnits.length >= 3}
                        className="w-4 h-4 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                        title={
                          isCheckedForCompare 
                            ? 'Remove from comparison' 
                            : compareUnits.length >= 3 
                              ? 'Maximum 3 units selected' 
                              : 'Select unit to compare'
                        }
                      />
                    </td>

                    {/* Row Number Index */}
                    <td className="w-10 py-2.5 text-center bg-[#F3F2F1] dark:bg-[#111C2E] border-r border-stone-200 dark:border-stone-800 text-stone-500 font-mono text-[11px] font-bold">
                      {rowNum}
                    </td>

                    {/* Col A: Unit Code */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {unit.unitCode}
                    </td>

                    {/* Col B: Compound */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-sans font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {unit.compoundNameEn}
                    </td>

                    {/* Col C: Typology */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 font-sans text-stone-700 dark:text-stone-300 whitespace-nowrap">
                      {unit.typeEn}
                    </td>

                    {/* Col D: BUA */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums text-stone-800 dark:text-stone-200">
                      {unit.buaM2} m²
                    </td>

                    {/* Col E: Price Per M² (Highlighted) */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-500/5">
                      EGP {pricePerM2.toLocaleString()}
                    </td>

                    {/* Col F: Land */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums text-stone-800 dark:text-stone-200">
                      {unit.landM2 > 0 ? `${unit.landM2} m²` : '—'}
                    </td>

                    {/* Col G: Bed/Bath */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-center tabular-nums text-stone-600 dark:text-stone-400">
                      {unit.bedrooms}B / {unit.bathrooms}B
                    </td>

                    {/* Col H: Purpose */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                        unit.purpose === 'Rent'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : unit.purpose === 'Resale'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                      }`}>
                        {unit.purpose}
                      </span>
                    </td>

                    {/* Col I: Monthly Rent */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      EGP {unit.monthlyRentEgp.toLocaleString()}
                    </td>

                    {/* Col J: Resale Price */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      EGP {(unit.resalePriceEgp / 1000000).toFixed(1)}M
                    </td>

                    {/* Col K: Yield */}
                    <td className="py-2 px-3 border-r border-stone-200 dark:border-stone-800 text-right tabular-nums font-bold text-stone-800 dark:text-stone-200">
                      {unit.rentalYieldPct}%
                    </td>

                    {/* Col L: Actions */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectUnit(unit)}
                          className="px-2 py-1 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                          title="Inspect Unit Specs"
                        >
                          {isAr ? 'المواصفات' : 'Inspect'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompareUnit(unit);
                          }}
                          className={`px-2 py-1 rounded-sm text-[10px] font-bold cursor-pointer transition-colors shadow-xs ${
                            isCheckedForCompare
                              ? 'bg-cyan-600 text-white'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-cyan-500/20'
                          }`}
                          title="Toggle Compare"
                        >
                          {isCheckedForCompare ? '✓ VS' : '+ VS'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Floating Unit Comparison Dock (Appears when units selected) */}
        {compareUnits.length > 0 && (
          <div className="bg-[#0A1526] text-white px-4 py-3 border-t-2 border-cyan-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-300">
                <Scale className="w-4 h-4 text-cyan-400" />
                <span>
                  {isAr 
                    ? `الوحدات المحددة للمقارنة (${compareUnits.length}/3):` 
                    : `Selected for Comparison (${compareUnits.length}/3):`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {compareUnits.map(u => {
                  const ppm = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;
                  return (
                    <div 
                      key={u.id} 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono"
                    >
                      <span className="font-bold text-amber-300">{u.unitCode}</span>
                      <span className="text-stone-300">({u.buaM2}m² · EGP {ppm.toLocaleString()}/m²)</span>
                      <button
                        onClick={() => removeFromCompare(u.id)}
                        className="text-stone-400 hover:text-rose-400 ml-1 cursor-pointer font-bold"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-stone-950 font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'مقارنة المواصفات وسعر المتر الآن' : 'Compare Side-by-Side (Price/M²)'}</span>
              </button>
              <button
                onClick={clearCompare}
                className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            </div>
          </div>
        )}

        {/* 6. Authentic Excel Status Bar (Bottom summary calculation strip) */}
        <div className={`text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
          isDarkMode ? 'bg-[#08101E]' : 'bg-[#107C41]'
        }`}>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-bold text-cyan-300">READY</span>
            <span>|</span>
            <span>COUNT: {units.length}</span>
            <span>|</span>
            <span>AVG YIELD: {stats.avgYield.toFixed(1)}%</span>
            <span>|</span>
            <span>AVG PRICE/M²: EGP {Math.round(stats.avgPpm).toLocaleString()}</span>
            <span>|</span>
            <span>AVG RESALE: EGP {(stats.avgResale / 1000000).toFixed(1)}M</span>
          </div>

          <div className="flex items-center gap-3">
            <span>TOTAL VALUE: EGP {(stats.totalAssets / 1000000).toFixed(1)}M</span>
            <span>·</span>
            <span className="text-cyan-300 font-bold">SIERRA ESTATES</span>
          </div>
        </div>

      </div>

      {/* Side-by-Side Unit Comparison Modal */}
      {isCompareModalOpen && (
        <UnitComparisonModal
          units={compareUnits.length > 0 ? compareUnits : units.slice(0, Math.min(units.length, 3))}
          onClose={() => setIsCompareModalOpen(false)}
          onRemoveUnit={removeFromCompare}
          onBookViewing={(unit) => {
            setIsCompareModalOpen(false);
            onSelectUnit(unit);
          }}
          lang={lang}
          isDarkMode={isDarkMode}
        />
      )}

    </div>
  );
};
