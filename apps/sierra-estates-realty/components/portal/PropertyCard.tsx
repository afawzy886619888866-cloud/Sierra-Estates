'use client';

import React from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import {
  Bed, Bath, Maximize2, MapPin, Sparkles, ShieldCheck,
  Calendar, Phone, Award
} from 'lucide-react';

export interface PropertyItem {
  id: string | number;
  title: string;
  titleAr?: string;
  location: string;
  locationAr?: string;
  code: string;
  type: string;
  beds: number;
  baths: number;
  area: number;
  priceLabel: string;
  usdEstimate?: string;
  aiScore: number;
  img: string;
  isOwner?: boolean;
  badge?: string | null;
  badgeColor?: string;
  description?: string;
  finishing?: string;
  delivery?: string;
}

interface PropertyCardProps {
  property: PropertyItem;
  onScheduleClick?: (property: PropertyItem) => void;
}

export default function PropertyCard({ property, onScheduleClick }: PropertyCardProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const title = isAr && property.titleAr ? property.titleAr : property.title;
  const location = isAr && property.locationAr ? property.locationAr : property.location;
  const whatsappMsg = encodeURIComponent(
    `Hello Sierra Estates, I am interested in property ${property.code}: ${property.title} in ${property.location} (${property.priceLabel}).`
  );

  return (
    <div className="group bg-[#0d152a] hover:bg-[#111c38] border border-white/10 hover:border-amber-500/40 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <Image
          src={property.img}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d152a] via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          {property.isOwner ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 shadow-md">
              <Award className="w-3 h-3" />
              <span>{isAr ? 'مباشر من المالك' : 'Direct Owner'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/90 text-white shadow-md">
              <ShieldCheck className="w-3 h-3" />
              <span>{isAr ? 'معتمد' : 'Verified'}</span>
            </span>
          )}

          {/* AI Score Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>AI {property.aiScore}/100</span>
          </span>
        </div>

        {/* Unit Code pill */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/60 backdrop-blur-md text-slate-300 border border-white/10">
            {property.code}
          </span>
        </div>
      </div>

      {/* Property Details Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between gap-4">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium mb-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Title */}
          <h3 className="font-serif font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors line-clamp-1 mb-2">
            {title}
          </h3>

          {/* Specifications Grid */}
          <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-white/10 text-slate-300 text-xs">
            <div className="flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{property.beds} {t.beds}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bath className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{property.baths} {t.baths}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{property.area} m²</span>
            </div>
          </div>
        </div>

        {/* Price & Action Row */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-xs text-slate-400 block">{isAr ? 'السعر المطلوب' : 'Asking Price'}</span>
              <span className="font-serif font-black text-lg sm:text-xl text-amber-300">
                {property.priceLabel}
              </span>
            </div>
            {property.usdEstimate && (
              <span className="text-xs text-slate-400 font-mono">
                ~ {property.usdEstimate}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onScheduleClick?.(property)}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.schedule}</span>
            </button>
            <a
              href={`https://wa.me/201092048333?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.wa}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
