'use client';
import React from 'react';
import { Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

interface EditorialRibbonProps {
  isDarkMode: boolean;
  lang: 'en' | 'ar';
}

export const EditorialRibbon: React.FC<EditorialRibbonProps> = ({ isDarkMode, lang }) => {
  const isAr = lang === 'ar';

  return (
    <div className={`w-full py-2.5 px-4 border-b transition-colors ${
      isDarkMode 
        ? 'bg-[#040812] border-amber-900/30 text-stone-200' 
        : 'bg-[#F2ECE1] border-[#DFD5BF] text-stone-900'
    }`}>
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
        
        {/* User Required Header String */}
        <div className="flex items-center gap-2 text-center md:text-left">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <h2 className="font-extrabold tracking-wide uppercase text-xs sm:text-sm font-cinzel text-stone-900 dark:text-amber-300">
            {isAr 
              ? 'أفضل مخطط للقاهرة الجديدة 2026 في مصر للإيجار وإعادة البيع — سيرّا العقارية'
              : 'Best Plan for New Cairo 2026 in Egypt for Rent and Resale — by Sierra Estates'
            }
          </h2>
        </div>

        {/* Live Market Indicators (Clean unboxed metadata) */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">{isAr ? 'عائد الإيجار السنوي:' : 'Avg Rental Yield:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">9.4%</span>
          </div>

          <span className="text-stone-300 dark:text-stone-700">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">{isAr ? 'المربع الذهبي:' : 'Golden Square:'}</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">Verified Allocations</span>
          </div>

          <span className="text-stone-300 dark:text-stone-700">·</span>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-stone-400">{isAr ? 'المركز الإشعاعي:' : 'Hub:'}</span>
            <span className="font-bold">AUC 30.0197° N</span>
          </div>

          <span className="hidden md:inline text-stone-300 dark:text-stone-700">·</span>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px]">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {isAr ? 'دمج النسختين الليلية والتحريرية · دقة فيكتور لا نهائية' : 'Merged Dark & Light · Infinite Vector HD'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
