'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import { Building2, Sparkles, ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react';

const TOP_COMPOUNDS = [
  {
    name: 'Hyde Park New Cairo',
    nameAr: 'هايد بارك القاهرة الجديدة',
    developer: 'Hyde Park Developments',
    developerAr: 'هايد بارك للتطوير',
    units: 48,
    startPrice: 'EGP 9.5M',
    growth: '+22%',
    aiScore: 9.8,
    img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=85',
  },
  {
    name: 'Mivida',
    nameAr: 'ميفيدا إعمار',
    developer: 'Emaar Misr',
    developerAr: 'إعمار مصر',
    units: 36,
    startPrice: 'EGP 8.2M',
    growth: '+28%',
    aiScore: 9.6,
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=85',
  },
  {
    name: 'Mountain View iCity',
    nameAr: 'ماونتن فيو آي سيتي',
    developer: 'DMG Mountain View',
    developerAr: 'دار المعمار جروب',
    units: 52,
    startPrice: 'EGP 6.5M',
    growth: '+24%',
    aiScore: 9.4,
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85',
  },
  {
    name: 'Eastown',
    nameAr: 'إيست تاون سوديك',
    developer: 'SODIC',
    developerAr: 'شركة سوديك',
    units: 29,
    startPrice: 'EGP 7.8M',
    growth: '+19%',
    aiScore: 9.3,
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=85',
  },
  {
    name: 'Villette',
    nameAr: 'فيليت سوديك',
    developer: 'SODIC',
    developerAr: 'شركة سوديك',
    units: 24,
    startPrice: 'EGP 12.0M',
    growth: '+21%',
    aiScore: 9.5,
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=85',
  },
  {
    name: 'Palm Hills Katameya',
    nameAr: 'بالم هيلز قطامية',
    developer: 'Palm Hills',
    developerAr: 'بالم هيلز للتعمير',
    units: 31,
    startPrice: 'EGP 14.5M',
    growth: '+26%',
    aiScore: 9.7,
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=85',
  },
];

export default function CompoundsPreview() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  return (
    <section id="compounds" className="py-16 sm:py-24 bg-[#080d1a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.eyeCpd}</span>
            </div>
            <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
              {t.cpdTit}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              {t.cpdSub}
            </p>
          </div>

          <Link
            href="/compounds"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors group self-start md:self-auto"
          >
            <span>{t.allCpds}</span>
            {isAr ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </Link>
        </div>

        {/* Compound Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOP_COMPOUNDS.map((cpd) => {
            const name = isAr ? cpd.nameAr : cpd.name;
            const dev = isAr ? cpd.developerAr : cpd.developer;
            return (
              <Link
                key={cpd.name}
                href={`/properties?compound=${encodeURIComponent(cpd.name)}`}
                className="group relative aspect-[16/11] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-amber-500/50 shadow-xl transition-all duration-300 flex flex-col justify-end p-5 sm:p-6"
              >
                {/* Image & Gradient */}
                <Image
                  src={cpd.img}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-108 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent" />

                {/* Top Overlay Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 backdrop-blur-md text-slate-200 border border-white/10">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>{cpd.growth} YoY</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/90 text-slate-950">
                    <Sparkles className="w-3 h-3" />
                    <span>AI {cpd.aiScore}</span>
                  </span>
                </div>

                {/* Bottom Details */}
                <div className="relative z-10">
                  <span className="text-xs text-amber-400/90 font-medium block">
                    {dev}
                  </span>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-white group-hover:text-amber-300 transition-colors">
                    {name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-300 mt-3 pt-2.5 border-t border-white/15">
                    <span>{cpd.units} {isAr ? 'وحدة متاحة' : 'Units Available'}</span>
                    <span className="font-bold text-amber-300 font-serif">
                      {isAr ? `تبدأ من ${cpd.startPrice}` : `From ${cpd.startPrice}`}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
