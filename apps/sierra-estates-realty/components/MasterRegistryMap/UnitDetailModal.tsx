import React from 'react';
import { UnitListing } from './registryData';
import { 
  X, 
  MapPin, 
  Maximize, 
  Bed, 
  Bath, 
  Calendar, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  TrendingUp,
  Printer
} from 'lucide-react';

interface UnitDetailModalProps {
  unit: UnitListing | null;
  onClose: () => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onBookViewing: (unit: UnitListing) => void;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({
  unit,
  onClose,
  lang,
  isDarkMode,
  onBookViewing,
}) => {
  if (!unit) return null;
  const isAr = lang === 'ar';

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const downPayment = unit.resalePriceEgp * (unit.downPaymentPct / 100);
  const remaining = unit.resalePriceEgp - downPayment;
  const totalQuarters = unit.installmentsYears * 4;
  const quarterlyPayment = remaining / totalQuarters;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode 
          ? 'bg-[#0A1220] border-amber-500/30 text-stone-100' 
          : 'bg-[#FAF8F5] border-amber-600/30 text-stone-900'
      }`}>
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-amber-700 dark:text-amber-400 uppercase font-semibold">
              {isAr ? 'بطاقة الوحدة الرسمية المعمارية' : 'ARCHITECTURAL UNIT SPECIFICATION DOSSIER'}
            </div>
            <div className="text-xl font-bold font-cinzel text-stone-900 dark:text-white flex items-center gap-2">
              <span>{unit.unitCode}</span>
              <span className="text-stone-400 font-normal">·</span>
              <span className="text-amber-700 dark:text-amber-400">{unit.compoundNameEn}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 text-center">
              <span className="text-[10px] font-mono uppercase text-stone-400 block">{isAr ? 'النوع' : 'Typology'}</span>
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-1 block font-cinzel">
                {unit.typeEn}
              </span>
              <span className="text-[10px] font-cairo text-stone-500">{unit.typeAr}</span>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 text-center">
              <span className="text-[10px] font-mono uppercase text-stone-400 block">{isAr ? 'مساحة المباني BUA' : 'BUA Area'}</span>
              <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                {unit.buaM2} m²
              </span>
              <span className="text-[10px] text-stone-400 font-mono">~{(unit.buaM2 * 10.764).toFixed(0)} sq ft</span>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 text-center">
              <span className="text-[10px] font-mono uppercase text-stone-400 block">{isAr ? 'مساحة الأرض' : 'Land Area'}</span>
              <span className="text-base font-bold font-mono text-stone-800 dark:text-stone-200 mt-1 block">
                {unit.landM2} m²
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Private Plot</span>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 text-center">
              <span className="text-[10px] font-mono uppercase text-stone-400 block">{isAr ? 'الغرف والحمامات' : 'Beds & Baths'}</span>
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1 block font-mono">
                {unit.bedrooms} BR · {unit.bathrooms} BA
              </span>
              <span className="text-[10px] text-stone-400">{isAr ? 'جناح رئيسي' : 'Master En-Suites'}</span>
            </div>
          </div>

          {/* Pricing & Financial Blueprint: Both Rent & Resale */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-transparent dark:from-stone-900 dark:to-stone-950">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-amber-500/20">
              
              {/* Resale Box */}
              <div className="p-3 rounded-lg bg-white/70 dark:bg-stone-850/70 border border-amber-500/30">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">
                  <span>{isAr ? 'سعر إعادة البيع (Resale)' : 'RESALE CASH PRICE'}</span>
                  <span className="px-1.5 py-0.2 rounded-xs bg-amber-500/20 font-bold">Resale</span>
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-amber-300">
                  EGP {formatCurrency(unit.resalePriceEgp)}
                </div>
                <div className="text-xs font-mono text-stone-500">
                  ${formatCurrency(unit.resalePriceUsd)} USD
                </div>
              </div>

              {/* Rent Box */}
              <div className="p-3 rounded-lg bg-white/70 dark:bg-stone-850/70 border border-emerald-500/30">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">
                  <span>{isAr ? 'الإيجار الشهري المقدر (Rent)' : 'ESTIMATED MONTHLY RENT'}</span>
                  <span className="px-1.5 py-0.2 rounded-xs bg-emerald-500/20 font-bold">Yield: {unit.rentalYieldPct}%</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  EGP {formatCurrency(unit.monthlyRentEgp)} / mo
                </div>
                <div className="text-xs font-mono text-stone-500">
                  ${formatCurrency(unit.monthlyRentUsd)} USD / month
                </div>
              </div>

            </div>

            {/* Installment breakdown */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 font-mono block">{isAr ? 'مقدم التعاقد' : 'Down Payment'} ({unit.downPaymentPct}%):</span>
                <span className="font-bold font-mono text-amber-700 dark:text-amber-300">
                  EGP {formatCurrency(downPayment)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 font-mono block">{isAr ? 'القسط ربع السنوي' : 'Quarterly Installment'}:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  EGP {formatCurrency(Math.round(quarterlyPayment))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 font-mono block">{isAr ? 'فترة السداد' : 'Tenor'}:</span>
                <span className="font-bold font-mono text-stone-800 dark:text-stone-200">
                  {unit.installmentsYears} {isAr ? 'سنوات أقساط متساوية' : 'Years Equal'}
                </span>
              </div>
            </div>
          </div>

          {/* Architectural Floor Plan Vector Mockup */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
            <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-3">
              <span>{isAr ? 'المخطط المعماري الهندسي النموذجي' : 'TYPICAL ARCHITECTURAL FLOOR PLATE'}</span>
              <span>GROUND + FIRST + ROOF TERRACE</span>
            </div>

            {/* Clean Architectural SVG Layout */}
            <div className="w-full h-44 rounded-lg bg-stone-50 dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center p-4 relative overflow-hidden">
              <svg className="w-full h-full max-w-md opacity-85" viewBox="0 0 400 160">
                <rect x="20" y="20" width="360" height="120" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
                <rect x="20" y="20" width="140" height="70" fill="none" stroke="#64748B" strokeWidth="1" strokeDasharray="2 2" />
                <text x="30" y="55" fontSize="9" fill="#94A3B8" fontFamily="monospace">RECEPTION & SALON</text>
                
                <rect x="160" y="20" width="120" height="70" fill="none" stroke="#64748B" strokeWidth="1" />
                <text x="175" y="55" fontSize="9" fill="#94A3B8" fontFamily="monospace">DINING & KITCHEN</text>

                <rect x="280" y="20" width="100" height="70" fill="none" stroke="#64748B" strokeWidth="1" />
                <text x="290" y="55" fontSize="9" fill="#94A3B8" fontFamily="monospace">GUEST SUITE</text>

                <rect x="20" y="90" width="180" height="50" fill="none" stroke="#64748B" strokeWidth="1" />
                <text x="30" y="118" fontSize="9" fill="#94A3B8" fontFamily="monospace">TERRACE & POOL DECK</text>

                <rect x="200" y="90" width="180" height="50" fill="none" stroke="#64748B" strokeWidth="1" />
                <text x="220" y="118" fontSize="9" fill="#94A3B8" fontFamily="monospace">PRIVATE LANDSCAPED GARDEN</text>
              </svg>
            </div>
          </div>

          {/* Handover & Zone Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-stone-400 font-mono block">{isAr ? 'المرحلة السكنية:' : 'Development Phase:'}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{isAr ? unit.phaseAr : unit.phaseEn}</span>
            </div>
            <div>
              <span className="text-stone-400 font-mono block">{isAr ? 'نوع التشطيب:' : 'Finishing Specification:'}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{isAr ? unit.finishingAr : unit.finishingEn}</span>
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? 'طباعة البطاقة' : 'Print Spec Sheet'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onBookViewing(unit);
            }}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wide uppercase text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-md shadow-xs cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? 'حجز معاينة الموقع الحصري' : 'Request Private Site Viewing'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
