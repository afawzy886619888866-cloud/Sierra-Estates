'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { UnitListing, UNIT_LISTINGS, COMPOUNDS } from './registryData';
import { 
  X, 
  ShieldCheck, 
  TrendingUp,
  Printer,
  BarChart3,
  Calculator,
  RotateCcw,
  Compass,
  Eye
} from 'lucide-react';

interface UnitDetailModalProps {
  unit: UnitListing | null;
  onClose: () => void;
  lang: 'en' | 'ar';
  isDarkMode: boolean;
  onBookViewing: (unit: UnitListing) => void;
}

interface MonthlyPoint {
  monthEn: string;
  monthAr: string;
  unitTotalEgp: number;
  compoundAvgTotalEgp: number;
  unitPsmEgp: number;
  compoundAvgPsmEgp: number;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({
  unit,
  onClose,
  lang,
  isDarkMode,
  onBookViewing,
}) => {
  const [chartMetric, setChartMetric] = useState<'total' | 'psm'>('total');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(5); // Default to latest month (Oct)
  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState<boolean>(false);

  // Interactive ROI Calculator State
  const [customMonthlyRent, setCustomMonthlyRent] = useState<number>(unit?.monthlyRentEgp || 150000);
  const [annualMaintenanceEgp, setAnnualMaintenanceEgp] = useState<number>(
    unit ? Math.round(unit.monthlyRentEgp * 12 * 0.08) : 140000
  );
  const [occupancyPct, setOccupancyPct] = useState<number>(95);
  const [annualEscalationPct, setAnnualEscalationPct] = useState<number>(12);
  const [horizonYears, setHorizonYears] = useState<number>(5);

  // Sync ROI calculator defaults when a new unit is selected
  useEffect(() => {
    if (unit) {
      setCustomMonthlyRent(unit.monthlyRentEgp);
      setAnnualMaintenanceEgp(Math.round(unit.monthlyRentEgp * 12 * 0.08));
      setOccupancyPct(95);
      setAnnualEscalationPct(12);
      setHorizonYears(5);
    }
  }, [unit]);

  const isAr = lang === 'ar';

  // Compute 6-month historical trajectory for Selected Unit vs. Compound Average
  const priceHistoryData = useMemo(() => {
    if (!unit) return null;

    const compoundUnits = UNIT_LISTINGS.filter(u => u.compoundId === unit.compoundId);
    const compoundObj = COMPOUNDS.find(c => c.id === unit.compoundId);

    const currentUnitTotal = unit.resalePriceEgp;
    const currentUnitPsm = Math.round(unit.resalePriceEgp / Math.max(unit.buaM2, 1));

    const currentCompoundAvgTotal = compoundUnits.length > 0
      ? Math.round(compoundUnits.reduce((acc, u) => acc + u.resalePriceEgp, 0) / compoundUnits.length)
      : Math.round(currentUnitTotal * 0.94);

    const currentCompoundAvgPsm = compoundUnits.length > 0
      ? Math.round(compoundUnits.reduce((acc, u) => acc + (u.resalePriceEgp / Math.max(u.buaM2, 1)), 0) / compoundUnits.length)
      : (compoundObj?.avgMeterPriceEgp || Math.round(currentUnitPsm * 0.95));

    // Deterministic seed from unit ID so each unit has a realistic, consistent 6-month curve
    const seed = unit.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const unitSixMonthGrowth = 0.115 + ((seed % 7) * 0.008); // ~11.5% to 16.3% 6M growth
    const compoundSixMonthGrowth = 0.102 + ((seed % 5) * 0.006); // ~10.2% to 12.6% 6M growth

    const months = [
      { en: 'May 26', ar: 'مايو ٢٦', progress: 0.0 },
      { en: 'Jun 26', ar: 'يونيو ٢٦', progress: 0.19 },
      { en: 'Jul 26', ar: 'يوليو ٢٦', progress: 0.38 },
      { en: 'Aug 26', ar: 'أغسطس ٢٦', progress: 0.61 },
      { en: 'Sep 26', ar: 'سبتمبر ٢٦', progress: 0.82 },
      { en: 'Oct 26', ar: 'أكتوبر ٢٦', progress: 1.0 },
    ];

    const startUnitTotal = currentUnitTotal / (1 + unitSixMonthGrowth);
    const startCompoundTotal = currentCompoundAvgTotal / (1 + compoundSixMonthGrowth);

    const startUnitPsm = currentUnitPsm / (1 + unitSixMonthGrowth);
    const startCompoundPsm = currentCompoundAvgPsm / (1 + compoundSixMonthGrowth);

    const points: MonthlyPoint[] = months.map((m, idx) => {
      // Slight natural market oscillation on intermediate months
      const wave = idx === 0 || idx === 5 ? 0 : (((seed + idx * 13) % 9) - 4) * 0.0025;
      const uFactor = 1 + unitSixMonthGrowth * m.progress + wave;
      const cFactor = 1 + compoundSixMonthGrowth * m.progress + (wave * 0.5);

      return {
        monthEn: m.en,
        monthAr: m.ar,
        unitTotalEgp: idx === 5 ? currentUnitTotal : Math.round(startUnitTotal * uFactor),
        compoundAvgTotalEgp: idx === 5 ? currentCompoundAvgTotal : Math.round(startCompoundTotal * cFactor),
        unitPsmEgp: idx === 5 ? currentUnitPsm : Math.round(startUnitPsm * uFactor),
        compoundAvgPsmEgp: idx === 5 ? currentCompoundAvgPsm : Math.round(startCompoundPsm * cFactor),
      };
    });

    const unitGrowthPct = (((points[5].unitTotalEgp - points[0].unitTotalEgp) / points[0].unitTotalEgp) * 100).toFixed(1);
    const compoundGrowthPct = (((points[5].compoundAvgTotalEgp - points[0].compoundAvgTotalEgp) / points[0].compoundAvgTotalEgp) * 100).toFixed(1);

    const activeSpreadPct = chartMetric === 'total'
      ? (((currentUnitTotal - currentCompoundAvgTotal) / currentCompoundAvgTotal) * 100).toFixed(1)
      : (((currentUnitPsm - currentCompoundAvgPsm) / currentCompoundAvgPsm) * 100).toFixed(1);

    return {
      points,
      unitGrowthPct,
      compoundGrowthPct,
      activeSpreadPct: Number(activeSpreadPct),
    };
  }, [unit, chartMetric]);

  // Compute Interactive Long-Term ROI & Yield Metrics
  const roiMetrics = useMemo(() => {
    if (!unit) return null;

    const purchasePrice = Math.max(unit.resalePriceEgp, 1);
    const grossAnnualRentYear1 = customMonthlyRent * 12;
    const effectiveAnnualRentYear1 = grossAnnualRentYear1 * (occupancyPct / 100);
    const netAnnualIncomeYear1 = Math.max(0, effectiveAnnualRentYear1 - annualMaintenanceEgp);

    const grossYieldPct = (grossAnnualRentYear1 / purchasePrice) * 100;
    const netYieldPct = (netAnnualIncomeYear1 / purchasePrice) * 100;
    const paybackYears = netAnnualIncomeYear1 > 0 ? purchasePrice / netAnnualIncomeYear1 : 0;

    // Multi-year projection with annual rent escalation and modest maintenance inflation (5%/yr)
    let cumulativeNetRent = 0;
    let cumulativeGrossRent = 0;
    let cumulativeMaintenance = 0;

    const yearlySchedule: {
      year: number;
      grossRent: number;
      maintenance: number;
      netRent: number;
      cumulativeNet: number;
      annualYieldOnCost: number;
    }[] = [];

    for (let y = 1; y <= horizonYears; y++) {
      const escalationFactor = Math.pow(1 + annualEscalationPct / 100, y - 1);
      const maintFactor = Math.pow(1.05, y - 1);

      const yrGross = Math.round(grossAnnualRentYear1 * (occupancyPct / 100) * escalationFactor);
      const yrMaint = Math.round(annualMaintenanceEgp * maintFactor);
      const yrNet = Math.max(0, yrGross - yrMaint);

      cumulativeGrossRent += yrGross;
      cumulativeMaintenance += yrMaint;
      cumulativeNetRent += yrNet;

      yearlySchedule.push({
        year: y,
        grossRent: yrGross,
        maintenance: yrMaint,
        netRent: yrNet,
        cumulativeNet: cumulativeNetRent,
        annualYieldOnCost: (yrNet / purchasePrice) * 100,
      });
    }

    const totalLongTermRentalRoiPct = (cumulativeNetRent / purchasePrice) * 100;
    const avgAnnualizedNetYieldPct = totalLongTermRentalRoiPct / Math.max(horizonYears, 1);

    return {
      grossAnnualRentYear1,
      effectiveAnnualRentYear1,
      netAnnualIncomeYear1,
      grossYieldPct,
      netYieldPct,
      paybackYears,
      cumulativeNetRent,
      cumulativeGrossRent,
      cumulativeMaintenance,
      totalLongTermRentalRoiPct,
      avgAnnualizedNetYieldPct,
      yearlySchedule,
    };
  }, [unit, customMonthlyRent, annualMaintenanceEgp, occupancyPct, annualEscalationPct, horizonYears]);

  if (!unit || !priceHistoryData || !roiMetrics) return null;

  const formatCurrency = (val: number) => {
    return Math.round(val).toLocaleString('en-US');
  };

  const formatCompactEgp = (val: number) => {
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2)}M`;
    }
    if (val >= 1_000) {
      return `${(val / 1_000).toFixed(0)}K`;
    }
    return val.toString();
  };

  const downPayment = unit.resalePriceEgp * (unit.downPaymentPct / 100);
  const remaining = unit.resalePriceEgp - downPayment;
  const totalQuarters = unit.installmentsYears * 4;
  const quarterlyPayment = remaining / totalQuarters;

  // Prepare SVG chart coordinates
  const svgWidth = 560;
  const svgHeight = 185;
  const padLeft = 54;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 32;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const unitValues = priceHistoryData.points.map(p =>
    chartMetric === 'total' ? p.unitTotalEgp : p.unitPsmEgp
  );
  const compoundValues = priceHistoryData.points.map(p =>
    chartMetric === 'total' ? p.compoundAvgTotalEgp : p.compoundAvgPsmEgp
  );

  const allValues = [...unitValues, ...compoundValues];
  const minVal = Math.min(...allValues) * 0.96;
  const maxVal = Math.max(...allValues) * 1.03;
  const valRange = Math.max(maxVal - minVal, 1);

  const getX = (index: number) => padLeft + (index / (priceHistoryData.points.length - 1)) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minVal) / valRange) * plotH;

  const unitCoords = unitValues.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));
  const compoundCoords = compoundValues.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));

  const unitPath = unitCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  const compoundPath = compoundCoords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  const unitAreaPath = `${unitPath} L ${unitCoords[unitCoords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${unitCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  const activePointIndex = hoveredIndex !== null ? hoveredIndex : 5;
  const activePoint = priceHistoryData.points[activePointIndex];
  const activeUnitVal = chartMetric === 'total' ? activePoint.unitTotalEgp : activePoint.unitPsmEgp;
  const activeCompoundVal = chartMetric === 'total' ? activePoint.compoundAvgTotalEgp : activePoint.compoundAvgPsmEgp;

  const resetRoiDefaults = () => {
    setCustomMonthlyRent(unit.monthlyRentEgp);
    setAnnualMaintenanceEgp(Math.round(unit.monthlyRentEgp * 12 * 0.08));
    setOccupancyPct(95);
    setAnnualEscalationPct(12);
    setHorizonYears(5);
  };

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
              <span className="text-amber-700 dark:text-amber-400">{isAr ? unit.compoundNameAr : unit.compoundNameEn}</span>
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

          {/* Interactive Long-Term ROI & Yield Calculator */}
          <div className={`p-4 rounded-xl border transition-colors ${
            isDarkMode
              ? 'bg-[#070E1A] border-emerald-500/30'
              : 'bg-white border-emerald-600/30 shadow-xs'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>
                    {isAr
                      ? 'حاسبة العائد الاستثماري التفاعلية طويل الأجل (ROI)'
                      : 'INTERACTIVE LONG-TERM ROI & NET YIELD SIMULATOR'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                  {isAr
                    ? 'قم بتعديل القيمة الإيجارية ومصاريف الصيانة لحساب صافي العائد'
                    : 'Customize rental rate, maintenance & horizon to model long-term net yields'}
                </h4>
              </div>

              <button
                type="button"
                onClick={resetRoiDefaults}
                className="px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-500 flex items-center gap-1 cursor-pointer transition-colors"
                title={isAr ? 'إعادة الضبط للقيم الافتراضية' : 'Reset to Default Estimates'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            </div>

            {/* User Input Controls: Custom Monthly Rent, Annual Maintenance, Escalation & Horizon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              {/* Input 1: Custom Monthly Rental Rate (EGP) */}
              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-stone-800' : 'bg-stone-50/80 border-stone-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <label className="text-stone-600 dark:text-stone-300 font-semibold">
                    {isAr ? 'الإيجار الشهري المخصص (EGP):' : 'Custom Monthly Rent (EGP):'}
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {isAr ? 'السوق:' : 'Market:'} {formatCompactEgp(unit.monthlyRentEgp)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10000}
                    step={5000}
                    value={customMonthlyRent}
                    onChange={(e) => setCustomMonthlyRent(Math.max(0, Number(e.target.value)))}
                    className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs font-bold outline-none ${
                      isDarkMode
                        ? 'bg-[#050B14] border-stone-700 text-emerald-300 focus:border-emerald-400'
                        : 'bg-white border-stone-300 text-emerald-800 focus:border-emerald-600'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min={Math.round(unit.monthlyRentEgp * 0.5)}
                  max={Math.round(unit.monthlyRentEgp * 2.0)}
                  step={5000}
                  value={customMonthlyRent}
                  onChange={(e) => setCustomMonthlyRent(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Input 2: Annual Maintenance & Service Costs (EGP/yr) */}
              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-stone-800' : 'bg-stone-50/80 border-stone-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <label className="text-stone-600 dark:text-stone-300 font-semibold">
                    {isAr ? 'تكلفة الصيانة السنوية (EGP/سنة):' : 'Annual Maintenance Cost (EGP/yr):'}
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    {customMonthlyRent > 0
                      ? `${((annualMaintenanceEgp / (customMonthlyRent * 12)) * 100).toFixed(1)}% of rent`
                      : '0%'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={annualMaintenanceEgp}
                    onChange={(e) => setAnnualMaintenanceEgp(Math.max(0, Number(e.target.value)))}
                    className={`w-full px-2.5 py-1.5 rounded-md border font-mono text-xs font-bold outline-none ${
                      isDarkMode
                        ? 'bg-[#050B14] border-stone-700 text-amber-300 focus:border-amber-400'
                        : 'bg-white border-stone-300 text-amber-800 focus:border-amber-600'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.round(unit.monthlyRentEgp * 12 * 0.35)}
                  step={5000}
                  value={annualMaintenanceEgp}
                  onChange={(e) => setAnnualMaintenanceEgp(Number(e.target.value))}
                  className="w-full mt-2 accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Input 3: Annual Rent Escalation (%) & Occupancy Rate (%) */}
              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-stone-800' : 'bg-stone-50/80 border-stone-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-stone-600 dark:text-stone-300 font-semibold">
                    {isAr ? 'الزيادة السنوية للإيجار:' : 'Annual Rent Escalation:'}
                  </span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">+{annualEscalationPct}% / yr</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={annualEscalationPct}
                  onChange={(e) => setAnnualEscalationPct(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mt-1.5">
                  <span>{isAr ? 'نسبة الإشغال السنوية:' : 'Occupancy Rate:'} {occupancyPct}%</span>
                  <div className="flex gap-1">
                    {[85, 95, 100].map(occ => (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => setOccupancyPct(occ)}
                        className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer ${
                          occupancyPct === occ
                            ? 'bg-cyan-500 text-stone-950 font-bold'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                        }`}
                      >
                        {occ}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input 4: Holding Horizon Selector (Years) */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                isDarkMode ? 'bg-stone-900/70 border-stone-800' : 'bg-stone-50/80 border-stone-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="text-stone-600 dark:text-stone-300 font-semibold">
                    {isAr ? 'فترة الاستثمار (سنوات):' : 'Holding Horizon:'}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {horizonYears} {isAr ? 'سنوات' : 'Years'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 7, 10].map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setHorizonYears(yr)}
                      className={`py-1.5 rounded-md font-mono text-xs font-bold transition-all cursor-pointer border ${
                        horizonYears === yr
                          ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-2xs'
                          : isDarkMode
                            ? 'bg-[#050B14] border-stone-800 text-stone-400 hover:text-stone-200'
                            : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {yr}Y
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Output KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300 block">
                  {isAr ? 'صافي العائد (السنة ١)' : 'Year 1 Net Yield'}
                </span>
                <span className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {roiMetrics.netYieldPct.toFixed(2)}%
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {isAr ? 'إجمالي:' : 'Gross:'} {roiMetrics.grossYieldPct.toFixed(2)}%
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">
                  {isAr ? 'صافي الدخل السنوي' : 'Year 1 Net Cashflow'}
                </span>
                <span className="text-sm font-extrabold font-mono text-stone-900 dark:text-white mt-0.5 block">
                  EGP {formatCompactEgp(roiMetrics.netAnnualIncomeYear1)}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {isAr ? 'بعد الصيانة' : 'After Maint.'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <span className="text-[10px] font-mono uppercase text-amber-700 dark:text-amber-300 block">
                  {isAr ? `صافي إيجارات ${horizonYears} سنوات` : `${horizonYears}Y Cumulative Net`}
                </span>
                <span className="text-sm font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-0.5 block">
                  EGP {formatCompactEgp(roiMetrics.cumulativeNetRent)}
                </span>
                <span className="text-[10px] font-mono text-amber-700/80 dark:text-amber-400/80">
                  +{roiMetrics.totalLongTermRentalRoiPct.toFixed(1)}% {isAr ? 'من أصل السعر' : 'Total Return'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <span className="text-[10px] font-mono uppercase text-cyan-700 dark:text-cyan-300 block">
                  {isAr ? 'متوسط العائد السنوي' : `${horizonYears}Y Avg Annual ROI`}
                </span>
                <span className="text-base font-extrabold font-mono text-cyan-700 dark:text-cyan-300 mt-0.5 block">
                  {roiMetrics.avgAnnualizedNetYieldPct.toFixed(2)}% / yr
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {isAr ? 'استرداد:' : 'Payback:'} ~{roiMetrics.paybackYears > 0 ? roiMetrics.paybackYears.toFixed(1) : '—'}Y
                </span>
              </div>
            </div>

            {/* Compact Multi-Year Cashflow Progression Bar Strip */}
            <div className={`p-3 rounded-lg border text-[10px] font-mono ${
              isDarkMode ? 'bg-stone-900/50 border-stone-800' : 'bg-stone-50 border-stone-200'
            }`}>
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
                <span className="font-bold uppercase">
                  {isAr ? `جدول التدفقات النقدية الصافية (${horizonYears} سنوات)` : `${horizonYears}-YEAR NET CASHFLOW & YIELD-ON-COST PROJECTION`}
                </span>
                <span>
                  {isAr ? 'إجمالي الصيانة المخصومة:' : 'Total Maint. Deducted:'} EGP {formatCompactEgp(roiMetrics.cumulativeMaintenance)}
                </span>
              </div>
              <div className="space-y-1.5">
                {roiMetrics.yearlySchedule.map((row) => {
                  const maxNet = Math.max(...roiMetrics.yearlySchedule.map(r => r.netRent), 1);
                  const widthPct = Math.max(12, Math.round((row.netRent / maxNet) * 100));
                  return (
                    <div key={row.year} className="flex items-center gap-2">
                      <span className="w-12 text-stone-500 font-bold shrink-0">
                        {isAr ? `سنة ${row.year}` : `Year ${row.year}`}
                      </span>
                      <div className="flex-1 h-4 rounded bg-stone-200/70 dark:bg-stone-800 overflow-hidden flex items-center">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-amber-500 rounded flex items-center justify-end pr-1.5 text-[9px] font-bold text-stone-950 transition-all duration-200"
                        >
                          {row.annualYieldOnCost.toFixed(1)}%
                        </div>
                      </div>
                      <span className="w-24 text-right font-bold text-stone-800 dark:text-stone-200 shrink-0">
                        EGP {formatCompactEgp(row.netRent)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6-Month Price History Chart (Selected Unit vs. Compound Average) */}
          <div className={`p-4 rounded-xl border transition-colors ${
            isDarkMode
              ? 'bg-[#070E1A] border-amber-500/25'
              : 'bg-white border-stone-200 shadow-xs'
          }`}>
            {/* Chart Header & Metric Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {isAr
                      ? 'تطور الأسعار خلال آخر ٦ أشهر مقارنة بمتوسط الكمبوند'
                      : '6-MONTH PRICE HISTORY VS. COMPOUND AVERAGE'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                  {unit.unitCode} {isAr ? 'مقابل متوسط' : 'vs.'} {isAr ? unit.compoundNameAr : unit.compoundNameEn} ({isAr ? 'مايو – أكتوبر ٢٠٢٦' : 'May – Oct 2026'})
                </h4>
              </div>

              {/* Metric Switcher: Total Price vs Price / m² */}
              <div className={`inline-flex rounded-lg p-0.5 border text-[10px] font-mono self-start sm:self-auto ${
                isDarkMode ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setChartMetric('total')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                    chartMetric === 'total'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {isAr ? 'إجمالي السعر (EGP)' : 'Total Price (EGP)'}
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('psm')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                    chartMetric === 'psm'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {isAr ? 'سعر المتر / م²' : 'Price / m²'}
                </button>
              </div>
            </div>

            {/* 3 Summary KPIs & Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3">
              <div className={`p-2.5 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-amber-500/20' : 'bg-amber-50/50 border-amber-200/80'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    {unit.unitCode} ({isAr ? activePoint.monthAr : activePoint.monthEn})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{priceHistoryData.unitGrowthPct}% (6M)</span>
                </div>
                <div className="text-sm font-bold font-mono text-stone-900 dark:text-amber-300 mt-1">
                  EGP {formatCurrency(activeUnitVal)}{chartMetric === 'psm' ? ' / m²' : ''}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-sky-500/20' : 'bg-sky-50/50 border-sky-200/80'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                    {isAr ? 'متوسط الكمبوند' : 'Compound Avg'}
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">+{priceHistoryData.compoundGrowthPct}% (6M)</span>
                </div>
                <div className="text-sm font-bold font-mono text-stone-800 dark:text-sky-300 mt-1">
                  EGP {formatCurrency(activeCompoundVal)}{chartMetric === 'psm' ? ' / m²' : ''}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isDarkMode ? 'bg-stone-900/70 border-stone-800' : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  <span>{isAr ? 'الفارق عن المتوسط' : 'Spread vs. Compound'}</span>
                  <BarChart3 className="w-3 h-3 text-amber-500" />
                </div>
                <div className={`text-sm font-bold font-mono mt-1 ${
                  priceHistoryData.activeSpreadPct <= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {priceHistoryData.activeSpreadPct > 0 ? `+${priceHistoryData.activeSpreadPct}%` : `${priceHistoryData.activeSpreadPct}%`}{' '}
                  <span className="text-[10px] font-normal text-stone-500">
                    {priceHistoryData.activeSpreadPct <= 0
                      ? (isAr ? '(أقل من المتوسط - فرصة)' : '(Below Avg Value)')
                      : (isAr ? '(تميز الموقع والمساحة)' : '(Prime Plot Premium)')}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Dual-Series Chart */}
            <div className="relative w-full overflow-hidden pt-1">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 select-none overflow-visible"
              >
                <defs>
                  <linearGradient id="unitGoldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={isDarkMode ? 0.32 : 0.25} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const yPos = padTop + ratio * plotH;
                  const labelVal = maxVal - ratio * valRange;
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={yPos}
                        x2={svgWidth - padRight}
                        y2={yPos}
                        stroke={isDarkMode ? '#1E293B' : '#E7E5E4'}
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={yPos + 3}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="monospace"
                        fill={isDarkMode ? '#94A3B8' : '#78716C'}
                      >
                        {formatCompactEgp(labelVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Area under Selected Unit Line */}
                <path d={unitAreaPath} fill="url(#unitGoldAreaGrad)" />

                {/* Compound Average Line (Dashed Cyan) */}
                <path
                  d={compoundPath}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Selected Unit Line (Solid Gold) */}
                <path
                  d={unitPath}
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Active Hover Vertical Crosshair */}
                {activePointIndex !== null && (
                  <line
                    x1={getX(activePointIndex)}
                    y1={padTop}
                    x2={getX(activePointIndex)}
                    y2={padTop + plotH}
                    stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.7"
                  />
                )}

                {/* Data Nodes & Interactive Hit Columns */}
                {priceHistoryData.points.map((pt, i) => {
                  const uPt = unitCoords[i];
                  const cPt = compoundCoords[i];
                  const isHovered = activePointIndex === i;

                  return (
                    <g
                      key={pt.monthEn}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onClick={() => setHoveredIndex(i)}
                    >
                      {/* Invisible wide hit target for easy hover */}
                      <rect
                        x={uPt.x - plotW / 12}
                        y={padTop}
                        width={plotW / 6}
                        height={plotH + padBottom}
                        fill="transparent"
                      />

                      {/* Compound Avg Point */}
                      <circle
                        cx={cPt.x}
                        cy={cPt.y}
                        r={isHovered ? 5 : 3.5}
                        fill={isDarkMode ? '#0A1220' : '#FFFFFF'}
                        stroke="#38BDF8"
                        strokeWidth={isHovered ? 2.5 : 2}
                      />

                      {/* Selected Unit Point */}
                      <circle
                        cx={uPt.x}
                        cy={uPt.y}
                        r={isHovered ? 5.5 : 4}
                        fill="#D4AF37"
                        stroke={isDarkMode ? '#0A1220' : '#FFFFFF'}
                        strokeWidth="2"
                      />

                      {/* X-Axis Month Label */}
                      <text
                        x={uPt.x}
                        y={svgHeight - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight={isHovered ? 'bold' : 'normal'}
                        fill={
                          isHovered
                            ? (isDarkMode ? '#FBBF24' : '#B45309')
                            : (isDarkMode ? '#94A3B8' : '#78716C')
                        }
                      >
                        {isAr ? pt.monthAr : pt.monthEn}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Architectural Floor Plan Vector Mockup & 360° Virtual Tour Toggle */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-stone-500 mb-3">
              <div>
                <span className="font-bold text-stone-800 dark:text-stone-200 block">
                  {isVirtualTourOpen
                    ? (isAr ? 'جولة افتراضية تفاعلية ٣٦٠ درجة للوحدة' : '360° INTERACTIVE VIRTUAL TOUR VIEWPORT')
                    : (isAr ? 'المخطط المعماري الهندسي النموذجي' : 'TYPICAL ARCHITECTURAL FLOOR PLATE')}
                </span>
                <span className="text-[10px]">GROUND + FIRST + ROOF TERRACE · {unit.buaM2} m²</span>
              </div>

              {/* 'Virtual Tour' Toggle Button */}
              <button
                type="button"
                onClick={() => setIsVirtualTourOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                  isVirtualTourOpen
                    ? 'bg-cyan-500 text-stone-950 border-cyan-400 shadow-sm'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isVirtualTourOpen ? 'animate-spin' : ''}`} />
                <span>
                  {isVirtualTourOpen
                    ? (isAr ? 'العودة للمخطط الهندسي' : 'Show 2D Floor Plan')
                    : (isAr ? 'جولة افتراضية 360°' : 'Virtual Tour (360°)')}
                </span>
              </button>
            </div>

            {isVirtualTourOpen ? (
              /* 360-Degree Virtual Tour Iframe Placeholder */
              <div className="w-full h-64 sm:h-72 rounded-lg overflow-hidden border-2 border-cyan-500/40 bg-[#061122] relative shadow-inner animate-fade-in">
                <iframe
                  title={`360-Degree Virtual Tour - ${unit.unitCode}`}
                  src={`/virtual-tour-360.html?unit=${encodeURIComponent(unit.unitCode)}&compound=${encodeURIComponent(unit.compoundNameEn)}&bua=${unit.buaM2}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; gyroscope; fullscreen"
                />
              </div>
            ) : (
              /* Clean Architectural SVG Layout */
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
            )}
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
        <div className="px-6 py-4 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isAr ? 'طباعة البطاقة' : 'Print Spec Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVirtualTourOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md border cursor-pointer transition-colors ${
                isVirtualTourOpen
                  ? 'bg-cyan-500 text-stone-950 border-cyan-400'
                  : 'border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isAr ? 'جولة افتراضية 360°' : 'Virtual Tour'}</span>
            </button>
          </div>

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
