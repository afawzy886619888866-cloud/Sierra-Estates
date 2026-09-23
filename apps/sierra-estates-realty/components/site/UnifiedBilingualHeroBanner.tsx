'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Cpu, ShieldCheck, CheckCircle2,
  Copy, Check, Sparkles, Smartphone, Monitor, Presentation,
  ArrowRight, ArrowLeft, Layers
} from 'lucide-react';

export type BannerFormat = 'desktop' | 'mobile' | 'billboard';
export type BannerMode = 'side-by-side' | 'en' | 'ar';

export interface BannerData {
  en: {
    headline: string;
    subhead: string;
    body: string;
    badges: string[];
    desktop: {
      top: string;
      center: string;
      footer: string;
    };
    mobile: {
      header: string;
      body: string;
      tag: string;
    };
    billboard: {
      primary: string;
      sub: string;
      tagline: string;
    };
  };
  ar: {
    headline: string;
    subhead: string;
    body: string;
    badges: string[];
    desktop: {
      top: string;
      center: string;
      footer: string;
    };
    mobile: {
      header: string;
      body: string;
      tag: string;
    };
    billboard: {
      primary: string;
      sub: string;
      tagline: string;
    };
  };
}

export const UNIFIED_BANNER_CONTENT: BannerData = {
  en: {
    headline: "EGYPT’S #1 AI-DRIVEN REAL ESTATE ECOSYSTEM",
    subhead: "The Only Specialized Network for Resale and Rentals Dominating New Cairo, The 5th Settlement, Madinaty, Shorouk, and Rehab",
    body: "Powered by proprietary AI and a robust alliance of 500+ real estate firms and 1,500+ certified brokers to guarantee East Cairo's most competitive opportunities at accurate pricing.",
    badges: [
      "500+ Partner Agencies",
      "1,500+ Certified Brokers",
      "Proprietary AI Pricing"
    ],
    desktop: {
      top: "EGYPT’S #1 AI-DRIVEN REAL ESTATE ECOSYSTEM",
      center: "The Definitive Network for Resale & Rentals Dominating New Cairo, The 5th Settlement, Madinaty, Shorouk, and Rehab.",
      footer: "500+ Partner Agencies | 1,500+ Certified Brokers | Instant AI Verification"
    },
    mobile: {
      header: "EGYPT’S #1 AI PROPTECH ENGINE",
      body: "Resale & Rentals Dominating New Cairo, Madinaty, Shorouk & Rehab.",
      tag: "Powered by AI • 500+ Agencies • 1,500+ Brokers"
    },
    billboard: {
      primary: "EGYPT’S #1 AI REAL ESTATE ECOSYSTEM",
      sub: "Dominating Resale & Rentals in New Cairo, The 5th Settlement, Madinaty, Shorouk & Rehab",
      tagline: "Best Deals. Verified Prices. Guaranteed Opportunities."
    }
  },
  ar: {
    headline: "أول محرك ذكاء اصطناعي عقاري متكامل في مصر",
    subhead: "الشبكة الأكثر تخصصاً في الإيجار وإعادة البيع.. السيطرة الكاملة على القاهرة الجديدة، التجمع الخامس، مدينتي، الشروق، والرحاب",
    body: "بفضل الذكاء الاصطناعي وشبكتنا المكونة من أكثر من 500 شركة عقارية و1,500 وسيط معتمد؛ نضمن لك الوصول لأفضل الفرص الحصرية وأدق الأسعار في شرق القاهرة بضغطة زر واحدة.",
    badges: [
      "+500 شركة شريكة",
      "+1,500 وسيط معتمد",
      "أدق تسعير بذكاء اصطناعي"
    ],
    desktop: {
      top: "أول محرك ذكاء اصطناعي عقاري متكامل في مصر",
      center: "الشبكة الأكثر تخصصاً في الإيجار وإعادة البيع.. السيطرة الكاملة على القاهرة الجديدة، التجمع الخامس، مدينتي، الشروق، والرحاب.",
      footer: "+500 شركة شريكة | +1,500 وسيط معتمد | تحقق فوري بالذكاء الاصطناعي"
    },
    mobile: {
      header: "المحرك العقاري الأول بالذكاء الاصطناعي في مصر",
      body: "إيجار وإعادة بيع.. السيطرة الكاملة على القاهرة الجديدة، مدينتي، الشروق والرحاب.",
      tag: "مدعوم بالذكاء الاصطناعي • +500 شركة • +1,500 وسيط"
    },
    billboard: {
      primary: "أول منظومة عقارية بالذكاء الاصطناعي في مصر",
      sub: "السيطرة على الإيجار وإعادة البيع في القاهرة الجديدة، التجمع الخامس، مدينتي، الشروق والرحاب",
      tagline: "أفضل الصفقات. أسعار موثقة. فرص مضمونة."
    }
  }
};

interface Props {
  initialFormat?: BannerFormat;
  initialMode?: BannerMode;
  showControls?: boolean;
  className?: string;
}

export default function UnifiedBilingualHeroBanner({
  initialFormat = 'desktop',
  initialMode = 'side-by-side',
  showControls = true,
  className = ''
}: Props) {
  const [format, setFormat] = useState<BannerFormat>(initialFormat);
  const [mode, setMode] = useState<BannerMode>(initialMode);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const c = UNIFIED_BANNER_CONTENT;

  return (
    <div className={`unified-banner-system w-full ${className}`}>
      {/* Studio Controls Header */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6 rounded-2xl bg-[#0d1520]/80 backdrop-blur-md border border-[#c8961a]/20 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#c8961a]/20 to-[#c8961a]/5 border border-[#c8961a]/30 text-[#e9c176]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#c8961a] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Sierra Estates • Design System
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Unified Bilingual Banner Studio
              </h2>
            </div>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070c14] border border-white/10">
            <button
              onClick={() => setFormat('desktop')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                format === 'desktop'
                  ? 'bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> 1. Desktop Banner
            </button>
            <button
              onClick={() => setFormat('mobile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                format === 'mobile'
                  ? 'bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> 2. Mobile & Stories
            </button>
            <button
              onClick={() => setFormat('billboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                format === 'billboard'
                  ? 'bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Billboard className="w-3.5 h-3.5" /> 3. Outdoor Billboard
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070c14] border border-white/10">
            <button
              onClick={() => setMode('side-by-side')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'side-by-side'
                  ? 'bg-white/15 text-white shadow font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Side-by-Side Dual View
            </button>
            <button
              onClick={() => setMode('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'en'
                  ? 'bg-white/15 text-white shadow font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setMode('ar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'ar'
                  ? 'bg-white/15 text-white shadow font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      )}

      {/* RENDER FORMATS */}

      {/* 1. HERO WEB BANNER (DESKTOP / LANDSCAPE) */}
      {format === 'desktop' && (
        <div className="banner-format-desktop">
          <div className={`grid gap-6 ${mode === 'side-by-side' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            {/* English Card */}
            {(mode === 'side-by-side' || mode === 'en') && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#09121d] via-[#070d15] to-[#04080e] border border-[#c8961a]/30 p-8 md:p-10 shadow-2xl group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#c8961a]/15 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#e9c176] to-transparent opacity-80" />
                
                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c8961a]/15 border border-[#c8961a]/40 text-[#f5d78e] text-xs font-semibold tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#e9c176] animate-pulse" />
                    Top Banner
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${c.en.desktop.top}\n\n${c.en.desktop.center}\n\n${c.en.desktop.footer}`, 'desktop-en')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#e9c176] transition-colors"
                    title="Copy full copy"
                  >
                    {copiedKey === 'desktop-en' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'desktop-en' ? 'Copied!' : 'Copy Copy'}</span>
                  </button>
                </div>

                {/* Top Banner Headline */}
                <h3 className="text-xs md:text-sm font-bold tracking-widest text-[#c8961a] uppercase mb-4">
                  {c.en.desktop.top}
                </h3>

                {/* Center Display / Subhead */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-white leading-tight font-light mb-6">
                  {c.en.desktop.center}
                </h1>

                {/* Body / Punchline */}
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-8 max-w-2xl font-light">
                  {c.en.body}
                </p>

                {/* Badges / Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Building2 className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.en.badges[0]}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Users className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.en.badges[1]}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Cpu className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.en.badges[2]}</span>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="pt-6 border-t border-[#c8961a]/20 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="text-[#e9c176] font-medium tracking-wide">
                    {c.en.desktop.footer}
                  </div>
                  <Link
                    href="/compounds"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] font-bold text-xs hover:brightness-110 transition-all shadow-lg"
                  >
                    Explore Opportunities <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Arabic Card */}
            {(mode === 'side-by-side' || mode === 'ar') && (
              <div
                dir="rtl"
                className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#09121d] via-[#070d15] to-[#04080e] border border-[#c8961a]/30 p-8 md:p-10 shadow-2xl group text-right"
              >
                <div className="absolute top-0 left-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#c8961a]/15 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#e9c176] to-transparent opacity-80" />

                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c8961a]/15 border border-[#c8961a]/40 text-[#f5d78e] text-xs font-semibold tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#e9c176] animate-pulse" />
                    النسخة العربية (الرئيسية)
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${c.ar.desktop.top}\n\n${c.ar.desktop.center}\n\n${c.ar.desktop.footer}`, 'desktop-ar')}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#e9c176] transition-colors"
                    title="نسخ النص بالكامل"
                  >
                    {copiedKey === 'desktop-ar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'desktop-ar' ? 'تم النسخ!' : 'نسخ النص'}</span>
                  </button>
                </div>

                {/* Top Banner Headline */}
                <h3 className="text-xs md:text-sm font-bold tracking-wide text-[#c8961a] mb-4">
                  {c.ar.desktop.top}
                </h3>

                {/* Center Display / Subhead */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-white leading-snug font-medium mb-6">
                  {c.ar.desktop.center}
                </h1>

                {/* Body / Punchline */}
                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-8 max-w-2xl font-light">
                  {c.ar.body}
                </p>

                {/* Badges / Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Building2 className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.ar.badges[0]}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Users className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.ar.badges[1]}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm">
                    <Cpu className="w-4 h-4 text-[#c8961a] shrink-0" />
                    <span className="text-xs font-medium text-gray-200">{c.ar.badges[2]}</span>
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="pt-6 border-t border-[#c8961a]/20 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="text-[#e9c176] font-medium tracking-wide">
                    {c.ar.desktop.footer}
                  </div>
                  <Link
                    href="/compounds"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] font-bold text-xs hover:brightness-110 transition-all shadow-lg"
                  >
                    استكشف الفرص <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MOBILE & NARROW FORMATS (STORIES / APP / FEED ADS) */}
      {format === 'mobile' && (
        <div className="banner-format-mobile">
          <div className={`grid gap-8 justify-center ${mode === 'side-by-side' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}>
            {/* English Mobile Story Card */}
            {(mode === 'side-by-side' || mode === 'en') && (
              <div className="w-full max-w-[360px] mx-auto aspect-[9/16] rounded-3xl bg-gradient-to-b from-[#0a1420] via-[#070d16] to-[#020509] border-2 border-[#c8961a]/40 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#c8961a]/20 via-transparent to-transparent pointer-events-none" />
                
                {/* Story Top Indicator */}
                <div className="relative z-10">
                  <div className="flex gap-1 mb-4">
                    <div className="h-1 flex-1 bg-[#c8961a] rounded-full" />
                    <div className="h-1 flex-1 bg-[#c8961a]/40 rounded-full" />
                    <div className="h-1 flex-1 bg-[#c8961a]/40 rounded-full" />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-6">
                    <span className="font-mono text-[#c8961a] text-[10px] tracking-widest uppercase">
                      SIERRA PROPTECH
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${c.en.mobile.header}\n\n${c.en.mobile.body}\n\n${c.en.mobile.tag}`, 'mobile-en')}
                      className="p-1 text-gray-400 hover:text-white"
                      title="Copy copy"
                    >
                      {copiedKey === 'mobile-en' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="inline-block px-3 py-1 rounded-full bg-[#c8961a]/20 border border-[#c8961a]/50 text-[#f5d78e] text-[10px] font-bold tracking-wider mb-3">
                    {c.en.mobile.tag}
                  </div>

                  <h3 className="text-xl font-serif text-white font-bold leading-tight mb-4">
                    {c.en.mobile.header}
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    {c.en.mobile.body}
                  </p>
                </div>

                {/* Story Middle Graphic */}
                <div className="relative z-10 py-6 my-auto text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-[#c8961a]/20 to-[#c8961a]/5 border border-[#c8961a]/40 flex items-center justify-center shadow-lg shadow-[#c8961a]/10 mb-4">
                    <Sparkles className="w-10 h-10 text-[#e9c176]" />
                  </div>
                  <div className="text-[11px] font-mono text-[#c8961a] uppercase tracking-wider">
                    Instant AI Verification
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    500+ Agencies • 1,500+ Brokers
                  </div>
                </div>

                {/* Story Bottom CTA */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                  <Link
                    href="/compounds"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg"
                  >
                    Swipe Up to Discover <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Arabic Mobile Story Card */}
            {(mode === 'side-by-side' || mode === 'ar') && (
              <div
                dir="rtl"
                className="w-full max-w-[360px] mx-auto aspect-[9/16] rounded-3xl bg-gradient-to-b from-[#0a1420] via-[#070d16] to-[#020509] border-2 border-[#c8961a]/40 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl text-right"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#c8961a]/20 via-transparent to-transparent pointer-events-none" />
                
                {/* Story Top Indicator */}
                <div className="relative z-10">
                  <div className="flex gap-1 mb-4">
                    <div className="h-1 flex-1 bg-[#c8961a] rounded-full" />
                    <div className="h-1 flex-1 bg-[#c8961a]/40 rounded-full" />
                    <div className="h-1 flex-1 bg-[#c8961a]/40 rounded-full" />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-6">
                    <span className="font-mono text-[#c8961a] text-[10px] tracking-widest uppercase">
                      منظومة سيرا الذكية
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${c.ar.mobile.header}\n\n${c.ar.mobile.body}\n\n${c.ar.mobile.tag}`, 'mobile-ar')}
                      className="p-1 text-gray-400 hover:text-white"
                      title="نسخ النص"
                    >
                      {copiedKey === 'mobile-ar' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="inline-block px-3 py-1 rounded-full bg-[#c8961a]/20 border border-[#c8961a]/50 text-[#f5d78e] text-[10px] font-bold tracking-wide mb-3">
                    {c.ar.mobile.tag}
                  </div>

                  <h3 className="text-xl font-serif text-white font-bold leading-tight mb-4">
                    {c.ar.mobile.header}
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed font-light">
                    {c.ar.mobile.body}
                  </p>
                </div>

                {/* Story Middle Graphic */}
                <div className="relative z-10 py-6 my-auto text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-[#c8961a]/20 to-[#c8961a]/5 border border-[#c8961a]/40 flex items-center justify-center shadow-lg shadow-[#c8961a]/10 mb-4">
                    <Sparkles className="w-10 h-10 text-[#e9c176]" />
                  </div>
                  <div className="text-[11px] font-mono text-[#c8961a] tracking-wide">
                    تحقق فوري بالذكاء الاصطناعي
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    +500 شركة • +1,500 وسيط
                  </div>
                </div>

                {/* Story Bottom CTA */}
                <div className="relative z-10 pt-4 border-t border-white/10">
                  <Link
                    href="/compounds"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8961a] to-[#d8a838] text-[#070c14] font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg"
                  >
                    اسحب لأعلى للاستكشاف <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. LARGE OUTDOOR / BILLBOARD FORMAT */}
      {format === 'billboard' && (
        <div className="banner-format-billboard">
          <div className={`grid gap-6 ${mode === 'side-by-side' ? 'grid-cols-1' : 'grid-cols-1'}`}>
            {/* English Billboard */}
            {(mode === 'side-by-side' || mode === 'en') && (
              <div className="relative rounded-2xl md:rounded-3xl bg-[#04070d] border-4 border-[#1e2836] p-6 md:p-12 shadow-2xl overflow-hidden">
                {/* Outdoor Lighting Spotlight effect */}
                <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e9c176]/20 via-transparent to-transparent pointer-events-none" />
                
                {/* Billboard Structure Frame Tag */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-6 font-mono">
                  <span>BILLBOARD HIGHWAY 90 • FORMAT 14x4M</span>
                  <button
                    onClick={() => copyToClipboard(`${c.en.billboard.primary}\n${c.en.billboard.sub}\n${c.en.billboard.tagline}`, 'billboard-en')}
                    className="flex items-center gap-1 text-gray-400 hover:text-[#e9c176]"
                  >
                    {copiedKey === 'billboard-en' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'billboard-en' ? 'Copied' : 'Copy Specs'}</span>
                  </button>
                </div>

                <div className="max-w-5xl mx-auto text-center">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-[#c8961a]/15 border border-[#c8961a]/30 text-[#f5d78e] text-xs font-bold tracking-widest uppercase mb-6">
                    SIERRA ESTATES LUXURY PROPTECH
                  </div>

                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-6 drop-shadow-md">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#f5d78e] to-[#c8961a]">
                      {c.en.billboard.primary}
                    </span>
                  </h1>

                  <p className="text-base md:text-2xl text-gray-200 font-light max-w-4xl mx-auto mb-8 leading-snug">
                    {c.en.billboard.sub}
                  </p>

                  <div className="inline-flex flex-wrap items-center justify-center gap-3 md:gap-6 px-6 py-3 rounded-2xl bg-white/[0.04] border border-[#c8961a]/40 text-[#f5d78e] text-sm md:text-lg font-bold tracking-wide">
                    <span>{c.en.billboard.tagline}</span>
                  </div>
                </div>

                {/* Footer Brand Marker */}
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                  <span>500+ PARTNER AGENCIES • 1,500+ CERTIFIED BROKERS</span>
                  <span className="text-[#c8961a] font-bold">sierraestates.eg</span>
                </div>
              </div>
            )}

            {/* Arabic Billboard */}
            {(mode === 'side-by-side' || mode === 'ar') && (
              <div
                dir="rtl"
                className="relative rounded-2xl md:rounded-3xl bg-[#04070d] border-4 border-[#1e2836] p-6 md:p-12 shadow-2xl overflow-hidden text-center"
              >
                {/* Outdoor Lighting Spotlight effect */}
                <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e9c176]/20 via-transparent to-transparent pointer-events-none" />

                {/* Billboard Structure Frame Tag */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-6 font-mono">
                  <span>لوحة إعلانات الطرق الرئيسية (شارع التسعين • 14x4M)</span>
                  <button
                    onClick={() => copyToClipboard(`${c.ar.billboard.primary}\n${c.ar.billboard.sub}\n${c.ar.billboard.tagline}`, 'billboard-ar')}
                    className="flex items-center gap-1 text-gray-400 hover:text-[#e9c176]"
                  >
                    {copiedKey === 'billboard-ar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'billboard-ar' ? 'تم النسخ' : 'نسخ النص'}</span>
                  </button>
                </div>

                <div className="max-w-5xl mx-auto">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-[#c8961a]/15 border border-[#c8961a]/30 text-[#f5d78e] text-xs font-bold tracking-wide mb-6">
                    سيرا إستيتس • الذكاء الاصطناعي العقاري
                  </div>

                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 drop-shadow-md">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffffff] via-[#f5d78e] to-[#c8961a]">
                      {c.ar.billboard.primary}
                    </span>
                  </h1>

                  <p className="text-base md:text-2xl text-gray-200 font-light max-w-4xl mx-auto mb-8 leading-snug">
                    {c.ar.billboard.sub}
                  </p>

                  <div className="inline-flex flex-wrap items-center justify-center gap-3 md:gap-6 px-6 py-3 rounded-2xl bg-white/[0.04] border border-[#c8961a]/40 text-[#f5d78e] text-sm md:text-lg font-bold tracking-wide">
                    <span>{c.ar.billboard.tagline}</span>
                  </div>
                </div>

                {/* Footer Brand Marker */}
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                  <span>+500 شركة شريكة • +1,500 وسيط معتمد</span>
                  <span className="text-[#c8961a] font-bold">sierraestates.eg</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
