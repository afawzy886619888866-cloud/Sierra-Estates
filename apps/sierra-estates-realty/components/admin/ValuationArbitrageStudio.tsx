'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Building2,
  Sparkles,
  Zap,
  DollarSign,
  Clock,
  Layers,
} from 'lucide-react';

import { evaluatePropertyValuation, ValuationResult } from '@/lib/valuationArbitrageEngine';

export default function ValuationArbitrageStudio({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar';

  const [propertyType, setPropertyType] = useState<string>('administrative');
  const [location, setLocation] = useState<string>('Cairo Plaza, New Cairo');
  const [sizeSqm, setSizeSqm] = useState<number>(100);
  const [purchasePrice, setPurchasePrice] = useState<number>(1350000);
  const [monthlyRent, setMonthlyRent] = useState<number>(20000);
  const [areaResidentialSqmPrice, setAreaResidentialSqmPrice] = useState<number>(14000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'underground parking',
    'bank anchor',
    'near metro',
  ]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const valuation: ValuationResult = useMemo(() => {
    return evaluatePropertyValuation({
      property_type: propertyType,
      size_sqm: sizeSqm || undefined,
      location,
      offered_purchase_price: purchasePrice || undefined,
      offered_rent: monthlyRent || undefined,
      area_residential_avg_sqm_price: areaResidentialSqmPrice || undefined,
      amenities: selectedAmenities,
    });
  }, [propertyType, location, sizeSqm, purchasePrice, monthlyRent, areaResidentialSqmPrice, selectedAmenities]);

  const loadPreset = (preset: 'cairo_plaza' | 'shorouk_villa' | 'mivida_luxury') => {
    if (preset === 'cairo_plaza') {
      setPropertyType('administrative');
      setLocation('Cairo Plaza');
      setSizeSqm(100);
      setPurchasePrice(1350000);
      setMonthlyRent(20000);
      setAreaResidentialSqmPrice(14000);
      setSelectedAmenities(['underground parking', 'bank anchor', 'near metro']);
    } else if (preset === 'shorouk_villa') {
      setPropertyType('villa');
      setLocation('Shorouk Springs');
      setSizeSqm(400);
      setPurchasePrice(10500000);
      setMonthlyRent(75000);
      setAreaResidentialSqmPrice(22000);
      setSelectedAmenities(['private pool', 'underground garage']);
    } else if (preset === 'mivida_luxury') {
      setPropertyType('residential');
      setLocation('Mivida, New Cairo');
      setSizeSqm(450);
      setPurchasePrice(38000000);
      setMonthlyRent(250000);
      setAreaResidentialSqmPrice(65000);
      setSelectedAmenities(['lake view', 'private pool', 'underground parking']);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict.includes('MASSIVE ARBITRAGE')) {
      return {
        bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        icon: <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />,
        label: isAr ? '🚨 شراء فوري (فرصة مراجحة استثنائية)' : '🚨 IMMEDIATE BUY (MASSIVE ARBITRAGE)',
      };
    }
    if (verdict.includes('FAIR VALUE')) {
      return {
        bg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
        icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
        label: isAr ? '✅ شراء (سعر عادل مجدي استثمارياً)' : '✅ BUY (FAIR MARKET VALUE)',
      };
    }
    return {
      bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      label: isAr ? '❌ مبالغ فيه (تفاوض أو استئجار)' : '❌ OVERPRICED (NEGOTIATE OR RENT)',
    };
  };

  const badge = getVerdictBadge(valuation.verdict);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="valuation-arbitrage-studio">
      {/* Top Banner & Preset Quick Select */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{isAr ? 'محرك التقييم والمراجحة الاستثمارية · The Curator' : 'The Curator · Real Estate Valuation & Arbitrage OS'}</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            {isAr ? 'حاسبة التقييم الرأسمالي والمراجحة السعرية' : 'Income Capitalization & Arbitrage Discovery Engine'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {isAr
              ? 'تطبيق خوارزميات معدل الرسملة (Cap Rate)، قاعدة الاسترداد 10-12 سنة، واكتشاف المراجحة السعرية بين الإداري والسكني.'
              : 'Calculate Cap Rates, evaluate the 10-12 year payback threshold, and discover commercial-to-residential arbitrage plays.'}
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono">{isAr ? 'أمثلة سريعة:' : 'Presets:'}</span>
          <button
            type="button"
            onClick={() => loadPreset('cairo_plaza')}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-medium hover:bg-emerald-900/80 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            <span>Cairo Plaza (Arbitrage)</span>
          </button>
          <button
            type="button"
            onClick={() => loadPreset('shorouk_villa')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Shorouk Villa (Fair Value)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('mivida_luxury')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Mivida Luxury
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'بيانات العقار والمدخلات المالية' : 'Property & Financial Inputs'}</span>
            </h4>

            {/* Property Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {isAr ? 'نوع العقار والغرض' : 'Property Type / Classification'}
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="residential">Residential (Apartment, Duplex, Villa) [Cap Rate: 8-10%]</option>
                <option value="administrative">Administrative / Office Space [Cap Rate: 10-12%]</option>
                <option value="commercial">Commercial / Retail Store [Cap Rate: 12-15%]</option>
                <option value="medical">Medical Center / Clinic [Cap Rate: 10-12%]</option>
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {isAr ? 'الموقع أو الكمبوند' : 'Location / Project Name'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Cairo Plaza, New Cairo"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Area Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {isAr ? 'المساحة الإجمالية (متر مربع)' : 'Total Area (sqm)'}
              </label>
              <input
                type="number"
                value={sizeSqm || ''}
                onChange={(e) => setSizeSqm(Number(e.target.value))}
                placeholder="100"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Offered Purchase Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex justify-between">
                <span>{isAr ? 'سعر الشراء المعروض (جنيه)' : 'Offered Purchase Price (EGP)'}</span>
                {valuation.offered_price_assessment.price_per_sqm && (
                  <span className="text-cyan-400 font-mono">
                    {valuation.offered_price_assessment.price_per_sqm.toLocaleString()} EGP/m²
                  </span>
                )}
              </label>
              <input
                type="number"
                value={purchasePrice || ''}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                placeholder="1350000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Monthly Rental Income */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex justify-between">
                <span>{isAr ? 'الإيجار الشهري المتوقع / الفعلي (جنيه)' : 'Monthly Expected Rent (EGP/mo)'}</span>
                <span className="text-emerald-400 font-mono">
                  {((monthlyRent || 0) * 12).toLocaleString()} EGP/yr
                </span>
              </label>
              <input
                type="number"
                value={monthlyRent || ''}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                placeholder="20000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Area Avg Residential Sqm Price (For Arbitrage Detection) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {isAr ? 'متوسط سعر المتر السكني بالمنطقة (لكشف المراجحة)' : 'Area Avg Residential Rate (EGP/m²)'}
              </label>
              <input
                type="number"
                value={areaResidentialSqmPrice || ''}
                onChange={(e) => setAreaResidentialSqmPrice(Number(e.target.value))}
                placeholder="14000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Value-Add Amenities Checkbox Pills */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'المزايا الإضافية والرافعات القيمية (+%)' : 'Value-Add Multipliers & Structural Lifts'}</span>
                <span className="text-cyan-400 font-mono">+{valuation.investment_metrics.total_premium_lift_pct}% Lift</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'underground parking', label: '🚗 Underground Garage (+20%)' },
                  { id: 'bank anchor', label: '🏦 Bank / Anchor Tenant (+15%)' },
                  { id: 'near metro', label: '🚇 Metro / Transit (+10%)' },
                  { id: 'commercial license', label: '📜 Commercial License (+15%)' },
                  { id: 'private pool', label: '🏊 Private Pool (+10%)' },
                  { id: 'lake view', label: '🌊 Lake View (+10%)' },
                ].map((item) => {
                  const isChecked = selectedAmenities.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleAmenity(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Results & Verdict (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Verdict Card */}
          <div className={`p-6 rounded-2xl border ${badge.bg} space-y-4 shadow-xl transition-all`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {badge.icon}
                <span className="font-mono text-xs font-bold tracking-wider uppercase">AI INVESTMENT VERDICT</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-black/40 border border-white/10">
                Cap Rate Baseline: {valuation.investment_metrics.target_cap_rate_range}
              </span>
            </div>

            <div className="text-2xl font-extrabold tracking-tight text-white">
              {badge.label}
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {valuation.recommendation_summary}
            </p>

            {/* Critical Arbitrage Alert Banner */}
            {valuation.investment_metrics.arbitrage_alert && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-300 font-mono">ARBITRAGE ANOMALY DETECTED</div>
                  <div className="text-xs text-amber-200/90 leading-relaxed">
                    {valuation.investment_metrics.arbitrage_alert}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Payback Period */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>PAYBACK PERIOD</span>
              </span>
              <div className="text-xl font-black text-white font-mono">
                {valuation.investment_metrics.payback_period_years ? `${valuation.investment_metrics.payback_period_years} Yrs` : 'N/A'}
              </div>
              <span className={`text-[11px] font-semibold ${
                (valuation.investment_metrics.payback_period_years || 99) < 8
                  ? 'text-emerald-400'
                  : (valuation.investment_metrics.payback_period_years || 99) <= 12
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}>
                {(valuation.investment_metrics.payback_period_years || 99) < 8
                  ? '⚡ < 8 Yrs (Super Yield)'
                  : (valuation.investment_metrics.payback_period_years || 99) <= 12
                  ? '✅ 8-12 Yrs (Healthy)'
                  : '❌ > 13 Yrs (Low Yield)'}
              </span>
            </div>

            {/* Implied Cap Rate */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>IMPLIED CAP RATE</span>
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {valuation.offered_price_assessment.implied_cap_rate_pct ? `${valuation.offered_price_assessment.implied_cap_rate_pct}%` : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Annual Net Yield</span>
            </div>

            {/* Annual Rental Income */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>ANNUAL RENT</span>
              </span>
              <div className="text-xl font-black text-white font-mono">
                {(valuation.annual_income_generated / 1000).toLocaleString()}k
              </div>
              <span className="text-[11px] text-slate-500 font-mono">EGP / Year</span>
            </div>

            {/* Price / Sqm */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>PRICE / SQM</span>
              </span>
              <div className="text-xl font-black text-white font-mono">
                {valuation.offered_price_assessment.price_per_sqm
                  ? `${(valuation.offered_price_assessment.price_per_sqm / 1000).toFixed(1)}k`
                  : 'N/A'}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">EGP per m²</span>
            </div>
          </div>

          {/* Capitalized Fair Value Range Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'نطاق القيمة السوقية العادلة المحسوبة' : 'Calculated Fair Market Value Spectrum'}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Income Capitalization</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-mono">CONSERVATIVE VALUATION (Higher Cap Rate)</span>
                <div className="text-lg font-bold text-slate-200 font-mono">
                  {valuation.calculated_fair_value_range.conservative_cap_value.toLocaleString()} EGP
                </div>
                <div className="text-[11px] text-cyan-400">
                  With +{valuation.investment_metrics.total_premium_lift_pct}% Amenities:{' '}
                  <span className="font-bold">{valuation.calculated_fair_value_range.premium_adjusted_conservative.toLocaleString()} EGP</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-mono">OPTIMISTIC VALUATION (Lower Cap Rate)</span>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {valuation.calculated_fair_value_range.optimistic_cap_value.toLocaleString()} EGP
                </div>
                <div className="text-[11px] text-emerald-300">
                  With +{valuation.investment_metrics.total_premium_lift_pct}% Amenities:{' '}
                  <span className="font-bold">{valuation.calculated_fair_value_range.premium_adjusted_optimistic.toLocaleString()} EGP</span>
                </div>
              </div>
            </div>

            {/* Detected Premium Pills */}
            {Object.keys(valuation.investment_metrics.value_add_premiums_detected).length > 0 && (
              <div className="pt-2">
                <span className="text-xs text-slate-400 font-mono block mb-1.5">ACTIVE STRUCTURAL PREMIUMS:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(valuation.investment_metrics.value_add_premiums_detected).map(([key, label]) => (
                    <span
                      key={key}
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-800/80 text-cyan-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
