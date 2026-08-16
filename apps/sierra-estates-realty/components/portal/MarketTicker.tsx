'use client';

import React from 'react';
import { useI18n } from '@/lib/I18nContext';
import { TrendingUp, Sparkles, Building, Percent } from 'lucide-react';

const TICKER_ITEMS_EN = [
  { text: 'Mountain View iCity · +24% YoY Value Growth', icon: 'trend' },
  { text: 'Mivida Emaar · Average Rental Yield 8.4%', icon: 'percent' },
  { text: 'Hyde Park New Cairo · Top AI Value Score 9.8/10', icon: 'sparkle' },
  { text: 'Eastown SODIC · High Resale Demand (32 Units Listed)', icon: 'building' },
  { text: 'Villette SODIC · Net Investor ROI 8.1%', icon: 'percent' },
  { text: 'Uptown Cairo · Direct Owner Deals +31% Volume', icon: 'trend' },
];

const TICKER_ITEMS_AR = [
  { text: 'ماونتن فيو آي سيتي · نمو القيمة الرأسمالية +24%', icon: 'trend' },
  { text: 'ميفيدا إعمار · عائد إيجاري متوسط 8.4%', icon: 'percent' },
  { text: 'هايد بارك القاهرة الجديدة · تقييم الذكاء الاصطناعي 9.8/10', icon: 'sparkle' },
  { text: 'إيست تاون سوديك · طلب إعادة بيع مرتفع (32 وحدة معروضة)', icon: 'building' },
  { text: 'فيليت سوديك · صافي العائد الاستثماري 8.1%', icon: 'percent' },
  { text: 'أب تاون كايرو · صفقات مباشرة من المالك +31%', icon: 'trend' },
];

export default function MarketTicker() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const items = isAr ? TICKER_ITEMS_AR : TICKER_ITEMS_EN;
  const duplicated = [...items, ...items];

  return (
    <div className="w-full bg-[#0a1120] border-y border-white/10 py-3 overflow-hidden select-none">
      <div className="flex items-center gap-2 max-w-7xl mx-auto px-4">
        {/* Label Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 z-10">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'نبض السوق' : 'MARKET PULSE'}</span>
        </div>

        {/* Marquee Track */}
        <div className="relative w-full overflow-hidden">
          <div className="flex items-center gap-8 whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
            {duplicated.map((item, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {item.icon === 'trend' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                {item.icon === 'sparkle' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                {item.icon === 'building' && <Building className="w-3.5 h-3.5 text-blue-400" />}
                {item.icon === 'percent' && <Percent className="w-3.5 h-3.5 text-purple-400" />}
                <span>{item.text}</span>
                <span className="text-slate-600 font-bold ml-6">✦</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
