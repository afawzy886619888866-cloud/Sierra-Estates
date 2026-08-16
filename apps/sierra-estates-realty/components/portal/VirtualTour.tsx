'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import { Compass, Play, Maximize2, Building, Award, ShieldCheck } from 'lucide-react';

export default function VirtualTour() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const [activeTour, setActiveTour] = useState(false);

  return (
    <section id="tour" className="py-16 sm:py-24 bg-[#0a1122] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.eyeTour}</span>
          </div>
          <h2 className="font-serif font-black text-2xl sm:text-4xl text-white tracking-tight">
            {t.tourTit}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            {t.tourSub}
          </p>
        </div>

        {/* Tour Viewer Container */}
        <div className="relative aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-slate-950 shadow-2xl mb-12">
          {activeTour ? (
            <iframe
              src="https://my.matterport.com/show/?m=JGPnGda658x&play=1"
              title="Sierra Estates 3D Virtual Tour"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="relative w-full h-full">
              <Image
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85"
                alt="Virtual 3D Tour Preview"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <button
                  onClick={() => setActiveTour(true)}
                  aria-label="Start 3D Tour"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all duration-300 mb-4 group"
                >
                  <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current translate-x-0.5" />
                </button>
                <h3 className="font-serif font-bold text-lg sm:text-2xl text-white">
                  {isAr ? 'انقر لبدء الجولة التفاعلية 360°' : 'Click to Launch 360° Interactive Tour'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-2">
                  {isAr
                    ? 'تجول في جميع الغرف، قس المساحات بالأمتار، واستكشف تفاصيل التشطيب في فيلا هايد بارك.'
                    : 'Explore all living spaces, inspect finishings, and measure floor dimensions in Hyde Park Villa.'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-300 font-semibold bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'متوافق مع الهواتف ونظارات VR' : 'Full HD · Mobile & VR Ready'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real Estate Market Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 sm:p-6 text-center">
            <Building className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <span className="font-serif font-black text-2xl sm:text-3xl text-white block">1,240+</span>
            <span className="text-xs text-slate-400 mt-1 block">{t.stat1}</span>
          </div>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 sm:p-6 text-center">
            <Compass className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <span className="font-serif font-black text-2xl sm:text-3xl text-white block">29</span>
            <span className="text-xs text-slate-400 mt-1 block">{t.stat2}</span>
          </div>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 sm:p-6 text-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <span className="font-serif font-black text-2xl sm:text-3xl text-white block">45+</span>
            <span className="text-xs text-slate-400 mt-1 block">{t.stat3}</span>
          </div>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 sm:p-6 text-center">
            <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <span className="font-serif font-black text-2xl sm:text-3xl text-white block">EGP 1.8B+</span>
            <span className="text-xs text-slate-400 mt-1 block">{t.stat4}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
