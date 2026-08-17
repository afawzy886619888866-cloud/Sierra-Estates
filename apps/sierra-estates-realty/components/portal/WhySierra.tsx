'use client';

import React from 'react';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import {
  Radar, Calculator, Users, ShieldCheck, Sparkles,
  Award
} from 'lucide-react';

export default function WhySierra() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const pillars = [
    {
      icon: Radar,
      title: t.w1t,
      desc: t.w1s,
      tag: isAr ? 'تحليل يومي لـ 1,200+ وحدة' : '1,200+ Units Scanned Daily',
    },
    {
      icon: Calculator,
      title: t.w2t,
      desc: t.w2s,
      tag: isAr ? 'دقة تسعير بدون مبالغة' : 'Live Multi-Compound Benchmarks',
    },
    {
      icon: Users,
      title: t.w3t,
      desc: t.w3s,
      tag: isAr ? 'إتمام الصفقات خلال 48 ساعة' : '48h Match-to-Contract Speed',
    },
    {
      icon: ShieldCheck,
      title: t.w4t,
      desc: t.w4s,
      tag: isAr ? 'معاينة ميدانية موثقة' : '100% On-Site Verified',
    },
  ];

  return (
    <section id="why-sierra" className="py-16 sm:py-24 bg-[#0a1122] border-b border-white/10 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.eyeWhy}</span>
          </div>
          <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
            {t.whyTit}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
            {t.whySub}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-[#0f172a] hover:bg-[#141e36] border border-white/10 hover:border-amber-500/30 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-amber-400/80 block mb-2">
                    {p.tag}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Proof Strip */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">
                {isAr ? 'عقارات بدون عمولة خفية أو وسطاء غير مرخصين' : 'Direct Verified Listings · Zero Broker Overcharging'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'جميع الصفقات تتم وفق معايير جهاز تنظيم السوق العقاري وبإشراف مستشارين قانونيين.'
                  : 'All transactions adhere to Egyptian regulatory standards with licensed broker oversight.'}
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/201092048333"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            {isAr ? 'تحدث مع مستشار معتمد' : 'Speak to an Advisor'}
          </a>
        </div>
      </div>
    </section>
  );
}
