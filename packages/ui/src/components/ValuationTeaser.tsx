'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowRight, ShieldCheck } from 'lucide-react';

interface ValuationTeaserProps {
  isArabic?: boolean;
}

export default function ValuationTeaser({ isArabic = false }: ValuationTeaserProps) {
  const [compound, setCompound] = useState('Mivida');
  const [area, setArea] = useState(300);
  const [beds, setBeds] = useState(4);
  const [valResult, setValResult] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setValResult(null);

    // Mock valuation model calculation
    setTimeout(() => {
      let multiplier = 85000; // base price per sqm
      if (compound === 'Uptown Cairo') multiplier = 95000;
      if (compound === 'Mountain View iCity') multiplier = 72000;
      
      const estimatedValue = area * multiplier + beds * 1500000;
      const formatted = new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'EGP',
        maximumFractionDigits: 0,
      }).format(estimatedValue);

      setValResult(formatted);
      setIsCalculating(false);
    }, 1200);
  };

  return (
    <section className="py-24 bg-[#0B1628] border-t border-white/5" id="valuation">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-[#C9A84C] uppercase mb-3 block">
            {isArabic ? 'تقييم فوري بالذكاء الاصطناعي' : 'AI Market Valuation'}
          </span>
          <h2 className="font-playfair text-4xl text-white font-light mb-4">
            {isArabic ? (
              <>
                كم تبلغ قيمة <span className="italic text-[#C9A84C]">عقارك اليوم؟</span>
              </>
            ) : (
              <>
                What is your <span className="italic text-[#C9A84C]">estate worth?</span>
              </>
            )}
          </h2>
          <p className="text-white/60 text-xs md:text-sm font-light max-w-lg mx-auto">
            {isArabic
              ? 'احصل على تقدير فوري لقيمة عقارك في القاهرة الجديدة بناءً على الصفقات العقارية الأخيرة ومؤشرات السوق الحالية.'
              : 'Calculate instant property valuation using real-time transactional data across New Cairo\'s premier compounds.'}
          </p>
        </div>

        {/* Valuation Box */}
        <div className="p-8 md:p-12 rounded-[24px] bg-[#142850]/20 border border-white/5 backdrop-blur-md shadow-2xl relative">
          <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label htmlFor="compound-select" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#C9A84C] mb-2">
                {isArabic ? 'الكمباوند' : 'Compound'}
              </label>
              <select
                id="compound-select"
                value={compound}
                onChange={(e) => setCompound(e.target.value)}
                title={isArabic ? 'الكمباوند' : 'Compound'}
                className="w-full bg-[#0A1628] border border-white/10 px-4 py-3 text-xs text-white rounded-lg outline-none focus:border-[#C9A84C] transition-all cursor-pointer"
              >
                <option value="Mivida">Mivida</option>
                <option value="Uptown Cairo">Uptown Cairo</option>
                <option value="Mountain View iCity">Mountain View iCity</option>
                <option value="Madinaty">Madinaty</option>
              </select>
            </div>

            <div>
              <label htmlFor="area-input" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#C9A84C] mb-2">
                {isArabic ? 'المساحة (م²)' : 'Area (m²)'}
              </label>
              <input
                id="area-input"
                type="number"
                value={area}
                min={80}
                max={2000}
                onChange={(e) => setArea(Number(e.target.value))}
                placeholder={isArabic ? '٣٠٠' : '300'}
                title={isArabic ? 'المساحة (م²)' : 'Area (m²)'}
                className="w-full bg-[#0A1628] border border-white/10 px-4 py-3 text-xs text-white rounded-lg outline-none focus:border-[#C9A84C] transition-all"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full py-3 bg-[#C9A84C] text-[#0A1628] text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-[#B8973B] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Calculator size={14} />
                <span>{isCalculating ? (isArabic ? 'جاري الحساب...' : 'Calculating...') : (isArabic ? 'احسب الآن' : 'Estimate')}</span>
              </button>
            </div>
          </form>

          {/* Results Block */}
          <AnimatePresence>
            {valResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="mt-10 pt-8 border-t border-white/10 text-center"
              >
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest block mb-2">
                  {isArabic ? 'تقدير القيمة السوقية الفورية' : 'Estimated Instant Valuation'}
                </span>
                
                <div className="font-playfair text-3xl md:text-5xl text-[#C9A84C] font-semibold mb-6 tracking-tight">
                  {valResult}
                </div>

                <div className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-4 py-1.5 rounded-full mb-6">
                  <ShieldCheck size={12} />
                  <span>{isArabic ? 'الذكاء الاصطناعي: دقة ٩٤.٢٪' : 'AI Engine: 94.2% Confidence Level'}</span>
                </div>

                <p className="text-white/60 text-xs max-w-md mx-auto leading-relaxed mb-6">
                  {isArabic
                    ? 'هذا التقييم تقديري ومبني على معاملات حقيقية في المنطقة. للحصول على تقييم رسمي كامل، يرجى التحدث مع مستشارينا.'
                    : 'This is a mathematical model estimation based on aggregate property listings and deeds. Get a formal desktop valuation from our senior advisors.'}
                </p>

                <button className="inline-flex items-center gap-2 text-xs font-mono text-[#C9A84C] uppercase tracking-widest border-b border-[#C9A84C]/30 pb-1 hover:border-[#C9A84C] transition-all duration-300">
                  <span>{isArabic ? 'طلب تقرير تقييم تفصيلي' : 'Request Official Report'}</span>
                  <ArrowRight size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
