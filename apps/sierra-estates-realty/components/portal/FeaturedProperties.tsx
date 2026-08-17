'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import PropertyCard, { PropertyItem } from './PropertyCard';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

const DEFAULT_PROPERTIES: PropertyItem[] = [
  {
    id: 'hp-01',
    title: 'Standalone Signature Villa',
    titleAr: 'فيلا مستقلة فاخرة بإطلالة مباشرة على السنترال بارك',
    location: 'Hyde Park · New Cairo',
    locationAr: 'هايد بارك · التجمع الخامس',
    code: 'HP-VL-04',
    type: 'Villa',
    beds: 5,
    baths: 5,
    area: 480,
    priceLabel: 'EGP 28.5M',
    usdEstimate: '$570,000',
    aiScore: 96,
    isOwner: true,
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=85',
  },
  {
    id: 'mv-02',
    title: 'Modern Twin House with Private Roof',
    titleAr: 'توين هاوس مودرن مع رووف خاص وحديقة',
    location: 'Mountain View iCity · New Cairo',
    locationAr: 'ماونتن فيو آي سيتي · القاهرة الجديدة',
    code: 'MV-TH-02',
    type: 'Townhouse',
    beds: 4,
    baths: 3,
    area: 280,
    priceLabel: 'EGP 15.5M',
    usdEstimate: '$310,000',
    aiScore: 92,
    isOwner: true,
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=85',
  },
  {
    id: 'mvd-03',
    title: 'Prime Garden Apartment in Mivida',
    titleAr: 'شقة فاخرة بحديقة خاصة في ميفيدا إعمار',
    location: 'Mivida · Emaar',
    locationAr: 'ميفيدا · إعمار مصر',
    code: 'MVD-AP-11',
    type: 'Apartment',
    beds: 3,
    baths: 2,
    area: 145,
    priceLabel: 'EGP 6.8M',
    usdEstimate: '$136,000',
    aiScore: 94,
    isOwner: true,
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=85',
  },
  {
    id: 'eo-04',
    title: 'Panoramic Penthouse with Sky Terrace',
    titleAr: 'بنتهاوس بانورامي بتراس سماوي واسع',
    location: 'Eastown · SODIC',
    locationAr: 'إيست تاون · سودIC',
    code: 'EO-PH-09',
    type: 'Penthouse',
    beds: 4,
    baths: 4,
    area: 310,
    priceLabel: 'EGP 18.2M',
    usdEstimate: '$364,000',
    aiScore: 95,
    isOwner: false,
    img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85',
  },
  {
    id: 'vlt-05',
    title: 'Luxury Townhouse in Villette',
    titleAr: 'تاون هاوس راقي في كمبوند فيليت',
    location: 'Villette · SODIC',
    locationAr: 'فيليت · سوديك',
    code: 'VLT-TH-07',
    type: 'Townhouse',
    beds: 3,
    baths: 3,
    area: 260,
    priceLabel: 'EGP 13.9M',
    usdEstimate: '$278,000',
    aiScore: 91,
    isOwner: true,
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85',
  },
  {
    id: 'kd-06',
    title: 'Golf View Standalone Palace',
    titleAr: 'قصر مستقل بإطلالة بانورامية على ملاعب الجولف',
    location: 'Katameya Dunes · New Cairo',
    locationAr: 'قطامية ديونز · التجمع الخامس',
    code: 'KD-PL-01',
    type: 'Villa',
    beds: 6,
    baths: 7,
    area: 750,
    priceLabel: 'EGP 55.0M',
    usdEstimate: '$1,100,000',
    aiScore: 98,
    isOwner: false,
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85',
  },
];

interface FeaturedPropertiesProps {
  properties?: PropertyItem[];
  onScheduleClick?: (property: PropertyItem) => void;
}

export default function FeaturedProperties({
  properties = DEFAULT_PROPERTIES,
  onScheduleClick,
}: FeaturedPropertiesProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const [activeCategory, setActiveCategory] = useState<'All' | 'Villa' | 'Apartment' | 'Townhouse' | 'Penthouse'>('All');

  const filtered = activeCategory === 'All'
    ? properties
    : properties.filter((p) => p.type.toLowerCase() === activeCategory.toLowerCase());

  return (
    <section id="properties" className="py-16 sm:py-24 bg-[#080d1a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.eyeList}</span>
            </div>
            <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
              {t.featTit}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              {t.featSub}
            </p>
          </div>

          {/* View All Link */}
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors group self-start md:self-auto"
          >
            <span>{t.viewAll}</span>
            {isAr ? (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {[
            { id: 'All', label: t.filterAll },
            { id: 'Villa', label: t.filterVilla },
            { id: 'Apartment', label: t.filterApt },
            { id: 'Townhouse', label: t.filterTown },
            { id: 'Penthouse', label: t.filterPent },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onScheduleClick={onScheduleClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
