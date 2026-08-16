'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/I18nContext';
import { Sparkles, Calculator, Target, TrendingUp, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function IntelligenceEngine() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [calcBudget, setCalcBudget] = useState(15000000);
  const [calcRentMonthly, setCalcRentMonthly] = useState(85000);
  const calcAppreciation = 18;

  const annualRent = calcRentMonthly * 12;
  const grossYield = ((annualRent / calcBudget) * 100).toFixed(1);
  const projectedTotalReturn = (Number(grossYield) + calcAppreciation).toFixed(1);

  return (
    <section id="insights" className="py-16 sm:py-24 bg-[#0a1120] border-b border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isAr ? 'محركات الذكاء العقاري' : 'PropTech AI Engines'}</span>
          </div>
          <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
            {isAr ? 'أدوات التحليل المالي والتقييم الفوري' : 'Automated Valuation & ROI Forecaster'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            {isAr
              ? 'اتخذ قراراتك الاستثمارية بناءً على خوارزميات الذكاء الاصطناعي التي تقارن الأسعار الحقيقية عبر 29 كمبوند.'
              : 'Benchmark your purchase or rental yield against verified historical comps across New Cairo.'}
          </p>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1: Smart Match AI */}
          <div className="bg-[#0f172a] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                <Target className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold block mb-1">
                {isAr ? 'مطابقة ذكية للوحدات' : 'NEURAL MATCHING'}
              </span>
              <h3 className="font-serif font-bold text-xl text-white mb-3">
                {isAr ? 'مستشار المطابقة الذكي' : 'Smart Match Opportunity Engine'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                {isAr
                  ? 'أدخل ميزانيتك والموقع المفضل ليقوم الذكاء الاصطناعي بفرز أكثر من 1,200 وحدة واقتراح أفضل 3 صفقات مناسبة.'
                  : 'Specify your budget and lifestyle preferences. Our neural matching algorithm surfaces the top 3 high-probability deals instantly.'}
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'تحليل نمط المعيشة والخدمات' : 'Compound amenities & lifestyle scoring'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'تنبيهات فورية بالوحدات المباشرة' : 'Direct owner price drop alerts'}</span>
                </li>
              </ul>
            </div>

            <a
              href="https://wa.me/201092048333?text=Hello%20Sierra%20Estates%2C%20I%20want%20to%20run%20a%20Smart%20Match%20for%20my%20property%20search."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>{isAr ? 'بدء البحث الذكي' : 'Run Smart Match'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </a>
          </div>

          {/* Card 2: Interactive ROI Forecaster */}
          <div className="bg-gradient-to-b from-[#131d36] to-[#0f172a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              {isAr ? 'حاسبة تفاعلية' : 'Interactive'}
            </div>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold block mb-1">
                {isAr ? 'حاسبة العائد الاستثماري' : 'ROI CALCULATOR'}
              </span>
              <h3 className="font-serif font-bold text-xl text-white mb-4">
                {isAr ? 'حاسبة العائد والنمو الرأسمالي' : 'Yield & Capital Growth Modeler'}
              </h3>

              {/* Interactive Sliders */}
              <div className="space-y-4 text-xs mb-6">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>{isAr ? 'قيمة العقار' : 'Property Value'}:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {(calcBudget / 1000000).toFixed(1)}M EGP
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4000000"
                    max="50000000"
                    step="500000"
                    value={calcBudget}
                    onChange={(e) => setCalcBudget(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>{isAr ? 'الإيجار الشهري المتوقع' : 'Monthly Rent'}:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {(calcRentMonthly / 1000).toFixed(0)}k EGP/mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="250000"
                    step="5000"
                    value={calcRentMonthly}
                    onChange={(e) => setCalcRentMonthly(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Result KPI Box */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 grid grid-cols-2 gap-2 text-center mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'العائد الإيجاري' : 'Rental Yield'}</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{grossYield}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'إجمالي العائد السنوي' : 'Total 1-Yr Return'}</span>
                    <span className="text-base font-bold text-amber-300 font-mono">+{projectedTotalReturn}%</span>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={`https://wa.me/201092048333?text=Hello%20Sierra%2C%20I%20calculated%20a%20property%20budget%20of%20${(calcBudget/1000000).toFixed(1)}M%20with%20projected%20return%20of%20${projectedTotalReturn}%25.%20Please%20send%20matching%20units.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <span>{isAr ? 'طلب خطة استثمارية تفصيلية' : 'Request Investor Portfolio'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </a>
          </div>

          {/* Card 3: AVM Property Evaluator */}
          <div className="bg-[#0f172a] border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-purple-400 font-bold block mb-1">
                {isAr ? 'تقييم عقاري آلي' : 'AVM VALUATION'}
              </span>
              <h3 className="font-serif font-bold text-xl text-white mb-3">
                {isAr ? 'تقييم العقار العادل (AVM)' : 'Instant Automated Valuation'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                {isAr
                  ? 'هل ترغب في بيع عقارك أو التأكد من السعر العادل قبل الشراء؟ خوارزمية التقييم تمنحك تقريراً مقارناً لآخر الصفقات المنفذة.'
                  : 'Selling or buying? Our Automated Valuation Model computes the fair market bracket based on verified registered sales.'}
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'مقارنة دقيقة لسعر المتر بالكمبوند' : 'Exact per-sqm compound benchmarking'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isAr ? 'تقرير تسعير رسمي خلال دقيقة' : 'Instant PDF Valuation report'}</span>
                </li>
              </ul>
            </div>

            <a
              href="https://wa.me/201092048333?text=Hello%20Sierra%20Estates%2C%20I%20would%20like%20a%20free%20AVM%20property%20valuation%20for%20my%20unit."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>{isAr ? 'طلب تقييم مجاني لعقارك' : 'Request Free Valuation'}</span>
              {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
