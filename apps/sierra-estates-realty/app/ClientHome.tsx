'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/I18nContext';
import {
  PortalChrome,
  Hero,
  MarketTicker,
  FeaturedProperties,
  WhySierra,
  CompoundsPreview,
  VirtualTour,
  SmartMap,
  IntelligenceEngine,
  QuickRequest,
  PortalFooter,
  SierraChatFab,
  PropertyItem
} from '@/components/portal';
import { X, Calendar, Phone, Bed, Bath, Maximize2, MapPin } from 'lucide-react';

export default function ClientHome() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);

  return (
    <div className={`min-h-screen bg-[#070c18] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 ${isAr ? 'font-arabic' : ''}`}>
      {/* Chrome (Header & Announcement) */}
      <PortalChrome
        activeSection="home"
        onAddListingClick={() => {
          const contactEl = document.getElementById('contact');
          contactEl?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Hero Slideshow + Search Card + Key Metrics */}
      <Hero />

      {/* Live Market Ticker */}
      <MarketTicker />

      {/* Featured Properties Showcase */}
      <FeaturedProperties onScheduleClick={(p) => setSelectedProperty(p)} />

      {/* Why Sierra Estates (Value Pillars) */}
      <WhySierra />

      {/* Compounds Preview Directory */}
      <CompoundsPreview />

      {/* 360° Virtual Tour & Stats */}
      <VirtualTour />

      {/* Spatial Intelligence & Interactive Map */}
      <SmartMap />

      {/* PropTech AI Intelligence Engine */}
      <IntelligenceEngine />

      {/* Quick Request & Lead Capture */}
      <QuickRequest />

      {/* Portal Footer & Trust Badges */}
      <PortalFooter />

      {/* Floating AI Concierge FAB */}
      <SierraChatFab />

      {/* Property Details & Viewing Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-[#0b1329] border border-amber-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-white relative">
            <button
              onClick={() => setSelectedProperty(null)}
              aria-label="Close modal"
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-mono text-amber-400 font-bold block mb-1">
              {selectedProperty.code} · {selectedProperty.type}
            </span>
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-white mb-2">
              {isAr && selectedProperty.titleAr ? selectedProperty.titleAr : selectedProperty.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-amber-400/90 mb-4">
              <MapPin className="w-3.5 h-3.5" />
              <span>{isAr && selectedProperty.locationAr ? selectedProperty.locationAr : selectedProperty.location}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 my-4 border-y border-white/10 text-slate-300 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-amber-400" />
                <span>{selectedProperty.beds} {isAr ? 'غرف' : 'Beds'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="w-4 h-4 text-amber-400" />
                <span>{selectedProperty.baths} {isAr ? 'حمامات' : 'Baths'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span>{selectedProperty.area} m²</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              {selectedProperty.description || (isAr
                ? 'وحدة فاخرة في موقع استراتيجي بالقاهرة الجديدة مع مرافق متكاملة وأعلى مستويات الأمان والخصوصية.'
                : 'Signature luxury unit in a prime New Cairo location with full amenities, 24/7 security, and high investment return potential.')}
            </p>

            <div className="flex items-baseline justify-between mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'السعر المقيم' : 'Valuation Price'}</span>
                <span className="font-serif font-black text-xl sm:text-2xl text-amber-300">
                  {selectedProperty.priceLabel}
                </span>
              </div>
              {selectedProperty.usdEstimate && (
                <span className="text-xs text-slate-400 font-mono">
                  ~ {selectedProperty.usdEstimate}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`https://wa.me/201092048333?text=${encodeURIComponent(
                  `Hello Sierra Estates, I would like to schedule a viewing for property ${selectedProperty.code} (${selectedProperty.title}) in ${selectedProperty.location}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>{isAr ? 'حجز موعد معاينة على واتساب' : 'Book Viewing via WhatsApp'}</span>
              </a>
              <a
                href="tel:+201092048333"
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'اتصال بالمستشار العقاري' : 'Call Listing Advisor'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
