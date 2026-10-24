import React from 'react';
import { UnitListing, Compound } from '../data/registryData';
import { 
  X, 
  Check, 
  Sparkles, 
  Building, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  Maximize2,
  Trash2,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface UnitComparisonModalProps {
  units: UnitListing[];
  onClose: () => void;
  onRemoveUnit: (unitId: string) => void;
  onBookViewing: (unit: UnitListing) => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
}

export const UnitComparisonModal: React.FC<UnitComparisonModalProps> = ({
  units,
  onClose,
  onRemoveUnit,
  onBookViewing,
  lang,
  isDarkMode,
}) => {
  const isAr = lang === 'ar';

  if (units.length === 0) return null;

  // Compute price per meter for each unit
  const unitsWithPpm = units.map(u => {
    const pricePerM2 = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;
    const rentPerM2 = u.buaM2 > 0 ? Math.round(u.monthlyRentEgp / u.buaM2) : 0;
    return {
      ...u,
      pricePerM2,
      rentPerM2,
    };
  });

  // Find lowest price per meter
  const validPpmList = unitsWithPpm.map(u => u.pricePerM2).filter(p => p > 0);
  const lowestPpm = validPpmList.length > 0 ? Math.min(...validPpmList) : 0;
  const highestPpm = validPpmList.length > 0 ? Math.max(...validPpmList) : 0;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className={`relative w-full max-w-6xl my-auto rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode 
            ? 'bg-[#060D18] border-[#c8961a]/30 text-stone-100 shadow-2xl shadow-black/80' 
            : 'bg-[#FAF8F5] border-[#d4af37]/40 text-stone-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar with Sierra Estates Identity */}
        <div className="px-6 py-4 border-b border-cyan-500/20 dark:border-cyan-400/20 bg-gradient-to-r from-[#060D18] via-[#0F1D36] to-[#060D18] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 p-1 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel font-extrabold text-sm sm:text-base tracking-wider">
                  {isAr ? 'مقارنة مواصفات الوحدات جنباً إلى جنب' : 'SIERRA ESTATES · SPEC-BY-SPEC UNIT COMPARISON'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {units.length}/3 {isAr ? 'وحدات' : 'Units'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-cyan-200/80">
                {isAr ? 'تحليل مقارن دقيق لمساحات الوحدات، سعر المتر، وعوائد الإيجار السنوية' : 'Side-by-side valuation matrix highlighting price-per-meter efficiency and rental yields'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 transition-colors cursor-pointer"
              title={isAr ? 'طباعة المقارنة' : 'Print Comparison'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlight Banner: Price-per-Meter Delta Overview */}
        {unitsWithPpm.length >= 2 && lowestPpm > 0 && highestPpm > 0 && (
          <div className="px-6 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {isAr 
                  ? `فارق سعر المتر يصل إلى ${Math.round(((highestPpm - lowestPpm) / lowestPpm) * 100)}% بين الوحدات المختارة` 
                  : `Price-per-meter spread of ${Math.round(((highestPpm - lowestPpm) / lowestPpm) * 100)}% detected across selected units`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-stone-400">{isAr ? 'أقل سعر للمتر:' : 'Lowest Entry M²:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                EGP {lowestPpm.toLocaleString()} / m²
              </span>
            </div>
          </div>
        )}

        {/* Comparison Body Table Container */}
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[75vh]">
          <div className="min-w-[700px]">
            
            {/* Unit Cards Header (Columns) */}
            <div className={`grid gap-4 mb-6 ${
              units.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : units.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {unitsWithPpm.map((unit, idx) => {
                const isBestValue = unit.pricePerM2 === lowestPpm && unitsWithPpm.length > 1;

                return (
                  <div 
                    key={unit.id}
                    className={`relative rounded-xl p-4 border-2 transition-all shadow-md ${
                      isBestValue
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-emerald-500/20'
                        : isDarkMode
                          ? 'border-stone-800 bg-[#0A1526]/80'
                          : 'border-stone-200 bg-white'
                    }`}
                  >
                    {/* Best Value Badge */}
                    {isBestValue && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isAr ? 'أفضل قيمة للمتر' : 'BEST VALUE / M²'}</span>
                      </div>
                    )}

                    {/* Top Row: Code & Remove */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                      <div>
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          {unit.unitCode}
                        </span>
                        <div className="font-cinzel font-bold text-sm text-stone-900 dark:text-white truncate">
                          {unit.compoundNameEn}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveUnit(unit.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={isAr ? 'إزالة من المقارنة' : 'Remove from comparison'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* HERO METRIC: PRICE PER METER HIGHLIGHT */}
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-amber-500/10 border border-cyan-500/30 text-center mb-3">
                      <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
                        {isAr ? 'سعر المتر المربع (EGP/m²)' : 'Price Per Square Meter'}
                      </span>
                      <div className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900 dark:text-white mt-0.5">
                        EGP {unit.pricePerM2.toLocaleString()}
                        <span className="text-xs text-stone-400 font-normal"> / m²</span>
                      </div>
                      {unitsWithPpm.length > 1 && (
                        <div className="mt-1 text-[10px] font-mono">
                          {unit.pricePerM2 === lowestPpm ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {isAr ? 'الأقل سعراً للمتر (خط الأساس)' : 'Lowest Entry Baseline'}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              +{Math.round(((unit.pricePerM2 - lowestPpm) / lowestPpm) * 100)}% {isAr ? 'أعلى من الأقل' : 'vs lowest'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Resale & Rent Snapshot */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                      <div className="p-2 rounded bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                        <span className="text-[9px] text-stone-400 block">{isAr ? 'سعر البيع' : 'Resale'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          EGP {(unit.resalePriceEgp / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="p-2 rounded bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                        <span className="text-[9px] text-stone-400 block">{isAr ? 'الإيجار الشهري' : 'Monthly Rent'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          EGP {(unit.monthlyRentEgp / 1000).toFixed(0)}k/mo
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onBookViewing(unit)}
                      className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حجز معاينة' : 'Book Viewing'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Spec-by-Spec Comparison Rows */}
            <div className={`rounded-xl border overflow-hidden ${
              isDarkMode ? 'border-stone-800 bg-[#08101E]' : 'border-stone-200 bg-white'
            }`}>
              <div className="px-4 py-2.5 bg-stone-100 dark:bg-[#0D1829] border-b border-stone-200 dark:border-stone-800 text-xs font-mono font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                {isAr ? 'جدول مقارنة المواصفات الهندسية والاستثمارية' : 'Detailed Architectural & Investment Specifications'}
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                
                {/* Row: Property Typology */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1">
                    {isAr ? 'نوع العقار' : 'Property Typology'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="font-bold text-stone-900 dark:text-stone-100 col-span-1">
                      {isAr ? u.typeAr : u.typeEn}
                    </div>
                  ))}
                </div>

                {/* Row: BUA Built-up Area */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'المساحة المبنية (BUA)' : 'Built-up Area (BUA)'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 font-bold text-cyan-600 dark:text-cyan-400">
                      {u.buaM2} m²
                    </div>
                  ))}
                </div>

                {/* Row: Land Area */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'مساحة الأرض' : 'Plot / Land Area'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-700 dark:text-stone-300">
                      {u.landM2 > 0 ? `${u.landM2} m²` : '—'}
                    </div>
                  ))}
                </div>

                {/* Row: Price Per M² (Highlighted) */}
                <div className="grid grid-cols-4 p-3 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors font-mono">
                  <div className="font-bold text-cyan-700 dark:text-cyan-300 col-span-1 font-sans flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{isAr ? 'سعر المتر المربع (EGP/m²)' : 'Price / M² (Resale)'}</span>
                  </div>
                  {unitsWithPpm.map(u => {
                    const isLowest = u.pricePerM2 === lowestPpm && unitsWithPpm.length > 1;
                    return (
                      <div key={u.id} className="col-span-1">
                        <span className={`font-extrabold text-sm ${
                          isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-white'
                        }`}>
                          EGP {u.pricePerM2.toLocaleString()}
                        </span>
                        {isLowest && (
                          <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ {isAr ? 'الأفضل' : 'Lowest'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Row: Bedrooms / Bathrooms */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'الغرف والحمامات' : 'Bedrooms & Baths'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-700 dark:text-stone-300">
                      {u.bedrooms} {isAr ? 'غرف' : 'Beds'} · {u.bathrooms} {isAr ? 'حمامات' : 'Baths'}
                    </div>
                  ))}
                </div>

                {/* Row: Rental Yield % */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'عائد الإيجار السنوي (Cap Rate)' : 'Rental Yield (Cap Rate)'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 font-bold text-emerald-600 dark:text-emerald-400">
                      {u.rentalYieldPct}%
                    </div>
                  ))}
                </div>

                {/* Row: Monthly Rent Per M² */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'الإيجار الشهري لكل م²' : 'Rent / M² / Month'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-600 dark:text-stone-300">
                      EGP {u.rentPerM2} / m²
                    </div>
                  ))}
                </div>

                {/* Row: Handover / Delivery Year */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'سنة الاستلام' : 'Handover Year'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-700 dark:text-stone-300">
                      {u.deliveryYear}
                    </div>
                  ))}
                </div>

                {/* Row: Finishing */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1">
                    {isAr ? 'مستوى التشطيب' : 'Finishing Specification'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-800 dark:text-stone-200">
                      {isAr ? u.finishingAr : u.finishingEn}
                    </div>
                  ))}
                </div>

                {/* Row: Payment Terms */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors font-mono">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1 font-sans">
                    {isAr ? 'أنظمة السداد' : 'Payment Terms'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1 text-stone-700 dark:text-stone-300">
                      {u.downPaymentPct > 0 
                        ? `${u.downPaymentPct}% Down / ${u.installmentsYears} Yrs` 
                        : (isAr ? 'كاش / فوري' : 'Cash / Immediate')}
                    </div>
                  ))}
                </div>

                {/* Row: Availability Status */}
                <div className="grid grid-cols-4 p-3 hover:bg-stone-500/5 transition-colors">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 col-span-1">
                    {isAr ? 'حالة التوافر' : 'Availability Status'}
                  </div>
                  {unitsWithPpm.map(u => (
                    <div key={u.id} className="col-span-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {isAr ? u.statusAr : u.statusEn}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Footer with Sierra Estates Concierge Link */}
        <div className="px-6 py-4 bg-stone-100 dark:bg-[#040810] border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-500 font-mono text-[11px]">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">sierra-estates.net</span>
            <span>·</span>
            <span>Integrated with Sierra-Estates GitHub Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold cursor-pointer transition-colors"
          >
            {isAr ? 'إغلاق نافذة المقارنة' : 'Close Comparison'}
          </button>
        </div>

      </div>
    </div>
  );
};
