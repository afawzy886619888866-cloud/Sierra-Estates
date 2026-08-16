'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import {
  Phone, Mail, MapPin, ShieldCheck,
  Send, Lock
} from 'lucide-react';

export default function PortalFooter() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  return (
    <footer className="bg-[#050811] text-slate-400 border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Column 1: Brand & Bio */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 p-0.5">
                <div className="w-full h-full bg-[#080d1a] rounded-[10px] flex items-center justify-center">
                  <span className="font-serif font-black text-amber-300 text-base">SE</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg text-white">SIERRA ESTATES</span>
                <span className="text-[10px] tracking-wider uppercase text-amber-400 font-medium -mt-1">
                  {t.brandSub}
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              {t.footBlurb}
            </p>
            <div className="flex flex-col gap-2 text-xs text-slate-300 mt-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t.fAddr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a href="tel:+201092048333" dir="ltr" className="hover:text-amber-300 transition-colors">
                  +2 0109 204 8333
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a href="mailto:Info@sierra-estates.net" className="hover:text-amber-300 transition-colors">
                  Info@sierra-estates.net
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="flex flex-col gap-3 text-xs sm:text-sm">
            <h4 className="font-serif font-bold text-white uppercase tracking-wider text-xs mb-1">
              {t.fExplore}
            </h4>
            <Link href="/properties?mode=sale" className="hover:text-amber-300 transition-colors">{t.fBuy}</Link>
            <Link href="/properties?mode=rent" className="hover:text-amber-300 transition-colors">{t.fRent}</Link>
            <Link href="/compounds" className="hover:text-amber-300 transition-colors">{t.fCpds}</Link>
            <Link href="/map" className="hover:text-amber-300 transition-colors">{isAr ? 'خريطة القاهرة المباشرة' : 'Live Map'}</Link>
            <Link href="/virtual-tour" className="hover:text-amber-300 transition-colors">{isAr ? 'جولة 360° افتراضية' : '360° Virtual Tour'}</Link>
          </div>

          {/* Column 3: Company */}
          <div className="flex flex-col gap-3 text-xs sm:text-sm">
            <h4 className="font-serif font-bold text-white uppercase tracking-wider text-xs mb-1">
              {t.fCompany}
            </h4>
            <Link href="/#why-sierra" className="hover:text-amber-300 transition-colors">{t.fAbout}</Link>
            <Link href="/careers" className="hover:text-amber-300 transition-colors">{t.fCareers}</Link>
            <Link href="/#insights" className="hover:text-amber-300 transition-colors">{t.navAI}</Link>
            <Link href="/#contact" className="hover:text-amber-300 transition-colors">{t.fContact}</Link>
          </div>

          {/* Column 4: Newsletter / Updates */}
          <div className="flex flex-col gap-3 text-xs sm:text-sm">
            <h4 className="font-serif font-bold text-white uppercase tracking-wider text-xs mb-1">
              {t.footNews}
            </h4>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'اشترك للحصول على أحدث الفرص والعروض المباشرة من الملاك فور تسجيلها.'
                : 'Receive weekly off-market deals and verified price drop alerts directly.'}
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2 mt-1">
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  placeholder="your.email@example.com"
                  className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAr ? 'اشتراك مجاني' : 'Subscribe'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Regulatory & Security Trust Strip */}
        <div className="border-t border-white/10 pt-8 pb-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {isAr ? 'مرخص رسمياً من RERA' : 'RERA Licensed Brokerage'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Lock className="w-4 h-4 text-amber-400" />
              {isAr ? 'حماية بيانات مشفرة SSL 256-bit' : '256-bit SSL Encrypted'}
            </span>
          </div>

          <p>{t.rights}</p>
        </div>
      </div>
    </footer>
  );
}
