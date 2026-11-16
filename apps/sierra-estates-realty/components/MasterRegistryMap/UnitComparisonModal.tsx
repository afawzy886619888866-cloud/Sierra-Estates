'use client';
import React, { useState } from 'react';
import { UnitListing, UNIT_LISTINGS } from './registryData';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Trash2,
  Printer,
  CheckCircle2,
  Plus,
  Scale,
  Award,
  Building2,
  Maximize2,
  MessageCircle,
  Eye
} from 'lucide-react';

export const SIERRA_WHATSAPP_NUMBER = '201092048333';
export const SIERRA_DISPLAY_PHONE = '01092048333';

interface UnitComparisonModalProps {
  units: UnitListing[];
  allUnits?: UnitListing[];
  onClose: () => void;
  onRemoveUnit: (unitId: string) => void;
  onAddUnit?: (unit: UnitListing) => void;
  onInspectUnit?: (unit: UnitListing) => void;
  onBookViewing: (unit: UnitListing) => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
}

export const UnitComparisonModal: React.FC<UnitComparisonModalProps> = ({
  units,
  allUnits = UNIT_LISTINGS,
  onClose,
  onRemoveUnit,
  onAddUnit,
  onInspectUnit,
  onBookViewing,
  lang,
  isDarkMode,
}) => {
  const isAr = lang === 'ar';
  const [selectedAddUnitId, setSelectedAddUnitId] = useState<string>('');

  if (units.length === 0) return null;

  // Candidate units that are not yet in the comparison list
  const availableToAdd = allUnits.filter(u => !units.some(sel => sel.id === u.id));

  // Compute rich derived metrics for each unit
  const unitsWithMetrics = units.map((u, index) => {
    const pricePerM2 = u.buaM2 > 0 ? Math.round(u.resalePriceEgp / u.buaM2) : 0;
    const rentPerM2 = u.buaM2 > 0 ? Math.round(u.monthlyRentEgp / u.buaM2) : 0;
    const annualRentEgp = u.monthlyRentEgp * 12;
    const usdEquivalent = Math.round(u.resalePriceEgp / 49.5);
    const downPaymentEgp = Math.round((u.resalePriceEgp * (u.downPaymentPct || 10)) / 100);
    const remainingEgp = Math.max(0, u.resalePriceEgp - downPaymentEgp);
    const totalQuarters = Math.max(1, (u.installmentsYears || 1) * 4);
    const quarterlyInstallmentEgp = u.installmentsYears > 0 ? Math.round(remainingEgp / totalQuarters) : 0;
    const fiveYearProjectedEgp = Math.round(u.resalePriceEgp * 1.65);

    return {
      ...u,
      slotNumber: index + 1,
      pricePerM2,
      rentPerM2,
      annualRentEgp,
      usdEquivalent,
      downPaymentEgp,
      quarterlyInstallmentEgp,
      fiveYearProjectedEgp,
    };
  });

  // Benchmark highlights across selected units
  const validPpmList = unitsWithMetrics.map(u => u.pricePerM2).filter(p => p > 0);
  const lowestPpm = validPpmList.length > 0 ? Math.min(...validPpmList) : 0;
  const highestPpm = validPpmList.length > 0 ? Math.max(...validPpmList) : 0;

  const highestYield = unitsWithMetrics.length > 0
    ? Math.max(...unitsWithMetrics.map(u => u.rentalYieldPct))
    : 0;

  const largestBua = unitsWithMetrics.length > 0
    ? Math.max(...unitsWithMetrics.map(u => u.buaM2))
    : 0;

  const lowestTotalResale = unitsWithMetrics.length > 0
    ? Math.min(...unitsWithMetrics.map(u => u.resalePriceEgp))
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDirectWhatsApp = (unit: UnitListing) => {
    const text = isAr
      ? `مرحباً سييرا العقارية (${SIERRA_DISPLAY_PHONE})، أود الاستفسار عن الوحدة رقم ${unit.unitCode} في كمبوند ${unit.compoundNameAr} (${unit.typeAr} - المساحة ${unit.buaM2}م² - السعر ${(unit.resalePriceEgp / 1_000_000).toFixed(2)} مليون ج.م) من جدول مقارنة الوحدات.`
      : `Hello Sierra Estates (${SIERRA_DISPLAY_PHONE}), I am comparing units in the Master Registry and would like full details on Unit ${unit.unitCode} in ${unit.compoundNameEn} (${unit.typeEn}, ${unit.buaM2} m², EGP ${(unit.resalePriceEgp / 1_000_000).toFixed(2)}M).`;
    const link = document.createElement('a');
    link.href = `https://wa.me/${SIERRA_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const emptySlotsCount = Math.max(0, 3 - unitsWithMetrics.length);
  const emptySlots = Array.from({ length: emptySlotsCount }, (_, idx) => unitsWithMetrics.length + idx + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-6xl my-auto rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode 
            ? 'bg-[#060D18] border-cyan-500/40 text-stone-100 shadow-2xl shadow-black/90' 
            : 'bg-[#FAF8F5] border-[#B8860B]/40 text-stone-900 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Top Sovereign Header Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#060D18] via-[#0F1D36] to-[#060D18] text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
              <Scale className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-cinzel font-extrabold text-sm sm:text-base tracking-wider text-white">
                  {isAr ? 'مقارنة مواصفات الوحدات جنباً إلى جنب (حتى ٣ وحدات)' : 'SIERRA ESTATES · SIDE-BY-SIDE UNIT COMPARISON MATRIX'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {units.length} / 3 {isAr ? 'وحدات محددة' : 'Units Active'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-cyan-200/80 mt-0.5">
                {isAr
                  ? 'مقارنة هندسية واستثمارية شاملة للمساحات، سعر المتر، أنظمة السداد، وعوائد الإيجار السنوية'
                  : 'Architectural, spatial, and financial side-by-side specification matrix across up to 3 units'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
              title={isAr ? 'طباعة جدول المقارنة' : 'Print Comparison Matrix'}
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">{isAr ? 'طباعة المقارنة' : 'Print Matrix'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Executive Benchmark Delta Strip */}
        <div className="px-5 sm:px-6 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
            {unitsWithMetrics.length >= 2 && lowestPpm > 0 ? (
              <span>
                {isAr 
                  ? `تحليل الفروق: فارق سعر المتر بين الوحدات المختارة يبلغ ${Math.round(((highestPpm - lowestPpm) / lowestPpm) * 100)}% (الأقل: ${lowestPpm.toLocaleString()} ج.م/م²)` 
                  : `Valuation Spread: ${Math.round(((highestPpm - lowestPpm) / lowestPpm) * 100)}% price-per-m² variance across selected units (Best Value: EGP ${lowestPpm.toLocaleString()}/m²)`}
              </span>
            ) : (
              <span>
                {isAr
                  ? 'يمكنك إضافة حتى ٣ وحدات من الجدول لمقارنة كافة المواصفات الهندسية والمالية جنباً إلى جنب'
                  : 'Select up to 3 units to benchmark price-per-m², rental yield, and spatial specifications side-by-side'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div>
              <span className="text-stone-500 dark:text-stone-400">{isAr ? 'أعلى عائد إيجاري:' : 'Peak Yield:'} </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{highestYield}% / yr</span>
            </div>
            <div>
              <span className="text-stone-500 dark:text-stone-400">{isAr ? 'أكبر مساحة مبنية:' : 'Max BUA:'} </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{largestBua} m²</span>
            </div>
          </div>
        </div>

        {/* 3. Unified Side-by-Side Comparison Matrix Container */}
        <div className="p-4 sm:p-6 overflow-x-auto max-h-[78vh]">
          <div className="min-w-[820px] space-y-5">
            
            {/* TOP ROW: 3-Slot Unit Header Cards Aligned with Matrix Columns */}
            <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 items-stretch">
              {/* Left Legend Column Card */}
              <div className={`rounded-xl p-4 border flex flex-col justify-between ${
                isDarkMode
                  ? 'bg-[#091324] border-stone-800 text-stone-300'
                  : 'bg-[#F3EFE6] border-[#E2D9C5] text-stone-700'
              }`}>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-bold block mb-1">
                    {isAr ? 'مصفوفة المقارنة' : 'COMPARISON SLOTS'}
                  </span>
                  <h3 className="font-cinzel font-bold text-sm text-stone-900 dark:text-white leading-snug">
                    {isAr ? 'المواصفات الهندسية والتسعير' : 'Unit Specifications & Financial Yield'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                    {isAr
                      ? 'يتم تمييز الوحدة ذات أفضل سعر للمتر وأعلى عائد استثماري تلقائياً.'
                      : 'Best price-per-meter, highest rental yield, and largest BUA are automatically badged.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-300/60 dark:border-stone-800 space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'أفضل قيمة للمتر المربع' : 'Best Value / m² Winner'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'أعلى عائد إيجاري سنوي' : 'Highest Annual Yield'}</span>
                  </div>
                </div>
              </div>

              {/* Active Unit Cards (1 to 3) */}
              {unitsWithMetrics.map((unit) => {
                const isBestValue = unit.pricePerM2 === lowestPpm && unitsWithMetrics.length > 1;
                const isBestYield = unit.rentalYieldPct === highestYield && unitsWithMetrics.length > 1;

                return (
                  <div 
                    key={unit.id}
                    className={`relative rounded-xl p-4 border-2 transition-all flex flex-col justify-between shadow-md ${
                      isBestValue
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-emerald-500/10'
                        : isDarkMode
                          ? 'border-cyan-500/30 bg-[#0A1526]'
                          : 'border-stone-200 bg-white'
                    }`}
                  >
                    {/* Top Winner Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-300">
                        {isAr ? `وحدة #${unit.slotNumber}` : `SLOT #${unit.slotNumber}`} · {unit.unitCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveUnit(unit.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={isAr ? 'إزالة من المقارنة' : 'Remove unit'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Winner Badges Row */}
                    {(isBestValue || isBestYield) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {isBestValue && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {isAr ? 'أفضل سعر للمتر' : 'BEST VALUE / M²'}
                          </span>
                        )}
                        {isBestYield && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[9px] font-mono font-bold inline-flex items-center gap-1">
                            <Award className="w-2.5 h-2.5" />
                            {isAr ? 'أعلى عائد' : 'TOP YIELD'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Compound & Typology Title */}
                    <div className="mb-3">
                      <div className="font-cinzel font-bold text-sm text-stone-900 dark:text-white truncate">
                        {isAr ? unit.compoundNameAr : unit.compoundNameEn}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                        {isAr ? unit.typeAr : unit.typeEn} · {unit.buaM2} m²
                      </div>
                    </div>

                    {/* Hero Valuation Metric Box */}
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-amber-500/10 border border-cyan-500/30 text-center mb-3">
                      <span className="text-[9px] font-mono text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
                        {isAr ? 'سعر المتر المربع' : 'Price Per Square Meter'}
                      </span>
                      <div className="text-lg font-extrabold font-mono tabular-nums text-stone-900 dark:text-white mt-0.5">
                        EGP {unit.pricePerM2.toLocaleString()}
                        <span className="text-[10px] text-stone-400 font-normal"> /m²</span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                        {isAr ? 'الإجمالي:' : 'Total:'} EGP {(unit.resalePriceEgp / 1_000_000).toFixed(2)}M
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 mt-auto">
                      {onInspectUnit && (
                        <button
                          type="button"
                          onClick={() => onInspectUnit(unit)}
                          className="py-1.5 px-2 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-cyan-500/20 text-stone-800 dark:text-stone-200 font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer border border-stone-300 dark:border-stone-700"
                        >
                          <Eye className="w-3 h-3 text-cyan-500" />
                          <span>{isAr ? 'تفاصيل و360°' : 'ROI & 360°'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onBookViewing(unit)}
                        className={`py-1.5 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                          onInspectUnit ? '' : 'col-span-2'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{isAr ? 'حجز معاينة' : 'Book Viewing'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsApp(unit)}
                        className="col-span-2 py-1.5 px-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-500" />
                        <span>WhatsApp {SIERRA_DISPLAY_PHONE}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty Slot Placeholders (if < 3 units selected) so user can add up to 3 right in the modal */}
              {emptySlots.map((slotNum) => (
                <div
                  key={`empty-slot-${slotNum}`}
                  className={`rounded-xl p-4 border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 ${
                    isDarkMode
                      ? 'border-stone-800 bg-[#081120]/60 text-stone-400'
                      : 'border-stone-300 bg-stone-100/70 text-stone-500'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-stone-700 dark:text-stone-200">
                      {isAr ? `الخانة #${slotNum} متاحة للمقارنة` : `Comparison Slot #${slotNum} Open`}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {isAr ? 'اختر وحدة إضافية للمقارنة الثلاثية' : 'Add another unit for a 3-way side-by-side comparison'}
                    </p>
                  </div>
                  {onAddUnit && availableToAdd.length > 0 && (
                    <div className="w-full space-y-1.5">
                      <select
                        value={selectedAddUnitId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAddUnitId('');
                          const found = availableToAdd.find(u => u.id === val);
                          if (found) onAddUnit(found);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border border-cyan-500/40 bg-white dark:bg-[#0D1829] text-stone-900 dark:text-stone-100 focus:outline-hidden"
                      >
                        <option value="">
                          {isAr ? '+ اختر وحدة لإضافتها...' : '+ Select unit to compare...'}
                        </option>
                        {availableToAdd.slice(0, 40).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.unitCode} · {u.compoundNameEn} ({u.typeEn} - {u.buaM2}m²)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SPECIFICATION TABLE SECTIONS */}
            <div className={`rounded-xl border overflow-hidden ${
              isDarkMode ? 'border-stone-800 bg-[#08101E]' : 'border-stone-200 bg-white'
            }`}>
              {/* Section 1 Header: Architectural & Spatial Specs */}
              <div className="px-4 py-2.5 bg-stone-100 dark:bg-[#0D1829] border-b border-stone-200 dark:border-stone-800 text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? '١. المواصفات الهندسية والمساحات (Architectural & Spatial Specs)' : '1. Architectural & Spatial Specifications'}</span>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                {/* Compound & Enclave */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400">
                    {isAr ? 'المشروع / الكمبوند' : 'Compound Enclave'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="font-bold text-stone-900 dark:text-stone-100">
                      {isAr ? u.compoundNameAr : u.compoundNameEn}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400 font-mono">—</div>)}
                </div>

                {/* Property Typology */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400">
                    {isAr ? 'نوع العقار (Typology)' : 'Property Typology'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="font-bold text-stone-900 dark:text-stone-100">
                      {isAr ? u.typeAr : u.typeEn}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400 font-mono">—</div>)}
                </div>

                {/* Built-up Area (BUA) */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'المساحة المبنية (BUA)' : 'Built-Up Area (BUA)'}
                  </div>
                  {unitsWithMetrics.map(u => {
                    const isLargest = u.buaM2 === largestBua && unitsWithMetrics.length > 1;
                    return (
                      <div key={u.id} className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 tabular-nums">
                        <span>{u.buaM2} m²</span>
                        {isLargest && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 text-[9px] font-bold">
                            {isAr ? 'الأكبر مساحة' : 'Largest'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Plot / Land Area */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'مساحة الأرض / الحديقة' : 'Plot / Garden Area'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="text-stone-700 dark:text-stone-300 tabular-nums">
                      {u.landM2 > 0 ? `${u.landM2} m²` : (isAr ? 'غير مطبق (شقة/بنتهاوس)' : 'N/A (Vertical Unit)')}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'عدد الغرف والحمامات' : 'Bedrooms & Bathrooms'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="text-stone-800 dark:text-stone-200 font-semibold tabular-nums">
                      {u.bedrooms} {isAr ? 'غرف نوم' : 'Beds'} · {u.bathrooms} {isAr ? 'حمامات' : 'Baths'}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Finishing Specification */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400">
                    {isAr ? 'مستوى التشطيب' : 'Finishing Specification'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="text-stone-800 dark:text-stone-200 font-medium">
                      {isAr ? u.finishingAr : u.finishingEn}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400 font-mono">—</div>)}
                </div>

                {/* Handover / Delivery Year */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'سنة الاستلام وحالة الجاهزية' : 'Delivery & Readiness'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="text-stone-800 dark:text-stone-200 flex items-center gap-2">
                      <span className="font-bold">{u.deliveryYear}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-sans">
                        {isAr ? u.statusAr : u.statusEn}
                      </span>
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>
              </div>

              {/* Section 2 Header: Valuation, Pricing & ROI Metrics */}
              <div className="px-4 py-2.5 bg-stone-100 dark:bg-[#0D1829] border-y border-stone-200 dark:border-stone-800 text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? '٢. التقييم المالي، أنظمة السداد، والعائد الاستثماري (Valuation & Yield Matrix)' : '2. Valuation, Payment Plan & Investment Yield Matrix'}</span>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                {/* Total Resale Price (EGP & USD) */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'سعر إعادة البيع (EGP / USD)' : 'Total Resale Price'}
                  </div>
                  {unitsWithMetrics.map(u => {
                    const isLowestPrice = u.resalePriceEgp === lowestTotalResale && unitsWithMetrics.length > 1;
                    return (
                      <div key={u.id} className="tabular-nums">
                        <div className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                          EGP {u.resalePriceEgp.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          ≈ ${u.usdEquivalent.toLocaleString()} USD
                          {isLowestPrice && (
                            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              · {isAr ? 'أقل إجمالي' : 'Lowest Entry'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Price Per M² (Highlighted) */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors font-mono items-center">
                  <div className="font-bold text-cyan-700 dark:text-cyan-300 font-sans flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span>{isAr ? 'سعر المتر المربع (EGP/m²)' : 'Price / M² Efficiency'}</span>
                  </div>
                  {unitsWithMetrics.map(u => {
                    const isLowest = u.pricePerM2 === lowestPpm && unitsWithMetrics.length > 1;
                    return (
                      <div key={u.id} className="tabular-nums">
                        <span className={`font-extrabold text-sm ${
                          isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-white'
                        }`}>
                          EGP {u.pricePerM2.toLocaleString()} / m²
                        </span>
                        {unitsWithMetrics.length > 1 && lowestPpm > 0 && (
                          <span className={`block text-[10px] font-bold ${
                            isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {isLowest
                              ? (isAr ? '✓ الأفضل قيمة للمتر' : '✓ Best Price/m² Baseline')
                              : `+${Math.round(((u.pricePerM2 - lowestPpm) / lowestPpm) * 100)}% ${isAr ? 'مقارنة بالأقل' : 'above baseline'}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Monthly & Annual Rent */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'الدخل الإيجاري (شهري / سنوي)' : 'Rental Income (Mo / Yr)'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="tabular-nums">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        EGP {u.monthlyRentEgp.toLocaleString()} / mo
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">
                        EGP {u.annualRentEgp.toLocaleString()} / yr ({u.rentPerM2} EGP/m²)
                      </div>
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Annual Rental Yield % */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'عائد الإيجار السنوي (Cap Rate)' : 'Gross Rental Yield (Cap Rate)'}
                  </div>
                  {unitsWithMetrics.map(u => {
                    const isTopYield = u.rentalYieldPct === highestYield && unitsWithMetrics.length > 1;
                    return (
                      <div key={u.id} className="flex items-center gap-2 tabular-nums">
                        <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {u.rentalYieldPct}%
                        </span>
                        {isTopYield && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[9px] font-bold">
                            ✓ {isAr ? 'الأعلى عائداً' : 'Highest Yield'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* Payment Plan & Quarterly Installment */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'نظام السداد والأقساط' : 'Payment Terms & Schedule'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="tabular-nums">
                      {u.downPaymentPct > 0 && u.installmentsYears > 0 ? (
                        <>
                          <div className="font-bold text-stone-800 dark:text-stone-200">
                            {u.downPaymentPct}% Down · {u.installmentsYears} Years
                          </div>
                          <div className="text-[10px] text-stone-500 dark:text-stone-400">
                            Down: EGP {(u.downPaymentEgp / 1_000_000).toFixed(2)}M · Qtr: EGP {u.quarterlyInstallmentEgp.toLocaleString()}
                          </div>
                        </>
                      ) : (
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {isAr ? 'كاش / استلام فوري' : 'Cash / Immediate Transfer'}
                        </div>
                      )}
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>

                {/* 5-Year Projected Asset Value */}
                <div className="grid grid-cols-[200px_repeat(3,minmax(190px,1fr))] gap-3 p-3 hover:bg-stone-500/5 transition-colors font-mono items-center">
                  <div className="font-semibold text-stone-500 dark:text-stone-400 font-sans">
                    {isAr ? 'القيمة المتوقعة بعد ٥ سنوات' : '5-Year Projected Value'}
                  </div>
                  {unitsWithMetrics.map(u => (
                    <div key={u.id} className="tabular-nums">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        EGP {(u.fiveYearProjectedEgp / 1_000_000).toFixed(2)}M
                      </span>
                      <span className="block text-[10px] text-stone-500">
                        +65% {isAr ? 'نمو رأسمالي متوقع' : 'est. corridor appreciation'}
                      </span>
                    </div>
                  ))}
                  {emptySlots.map(s => <div key={s} className="text-stone-400">—</div>)}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 4. Modal Footer with Authorized Contact & Actions */}
        <div className="px-6 py-4 bg-stone-100 dark:bg-[#040810] border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-stone-500 font-mono text-[11px]">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">SIERRA ESTATES NEW CAIRO</span>
            <span>·</span>
            <span>{isAr ? `الخط الساخن المعتمد: ${SIERRA_DISPLAY_PHONE}` : `Authorized Advisory Desk: ${SIERRA_DISPLAY_PHONE}`}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة PDF' : 'Save / Print PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold cursor-pointer transition-colors"
            >
              {isAr ? 'إغلاق المقارنة' : 'Close Comparison'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
