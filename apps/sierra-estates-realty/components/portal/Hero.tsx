'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import HeroSearchCard from './HeroSearchCard';
import { Sparkles, ShieldCheck, Building2, ChevronDown, Award } from 'lucide-react';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85',
    titleEn: 'Luxury Living Reimagined in New Cairo',
    titleAr: 'الحياة الفاخرة برؤية جديدة في القاهرة الجديدة',
    tagEn: 'Direct Owner Resale & Prime Rentals',
    tagAr: 'إعادة بيع مباشر من المالك وإيجارات مميزة',
  },
  {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=85',
    titleEn: 'AI-Valued Homes Across 29 Premier Compounds',
    titleAr: 'عقارات مقيّمة بالذكاء الاصطناعي في 29 كمبوند',
    tagEn: 'Mivida · Hyde Park · Mountain View · SODIC',
    tagAr: 'ميفيدا · هايد بارك · ماونتن فيو · سوديك',
  },
  {
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=85',
    titleEn: 'Zero Guesswork. 100% Verified Real Estate.',
    titleAr: 'بدون تخمين. عقارات موثقة 100% ميدانياً.',
    tagEn: 'Licensed Brokers · Instant WhatsApp Viewing',
    tagAr: 'وسطاء مرخصون · معاينة فورية عبر واتساب',
  },
];

export default function Hero() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <section className="relative min-h-[90vh] sm:min-h-[85vh] flex flex-col justify-between pt-8 pb-12 overflow-hidden bg-[#070c18]">
      {/* Background Slideshow Images */}
      {SLIDES.map((s, index) => (
        <div
          key={s.image}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } transition-transform duration-10000`}
        >
          <Image
            src={s.image}
            alt="Sierra Estates Luxury Properties"
            fill
            priority={index === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Layered Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/70 to-[#080d1a]/40" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#080d1a]/50 to-[#080d1a]/90" />
        </div>
      ))}

      {/* Hero Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full my-auto flex flex-col items-center text-center z-10">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-5 shadow-lg backdrop-blur-md animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{isAr ? slide.tagAr : slide.tagEn}</span>
        </div>

        {/* Main H1 Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white max-w-4xl leading-[1.15] mb-4 drop-shadow-md">
          {isAr ? slide.titleAr : slide.titleEn}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl font-normal mb-8 text-balance">
          {t.heroSub}
        </p>

        {/* Embedded Search Card */}
        <div className="w-full max-w-4xl mb-8">
          <HeroSearchCard />
        </div>

        {/* Live Stat Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto text-slate-300 text-xs sm:text-sm">
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>{t.q1}</span>
          </div>
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{t.q2}</span>
          </div>
          <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t.q3}</span>
          </div>
        </div>
      </div>

      {/* Slide Indicators & Scroll Prompt */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-6">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
        <a
          href="#properties"
          aria-label="Scroll to featured properties"
          className="text-slate-400 hover:text-amber-400 transition-colors animate-bounce p-1"
        >
          <ChevronDown className="w-5 h-5" />
        </a>
      </div>
    </section>
  );
}
