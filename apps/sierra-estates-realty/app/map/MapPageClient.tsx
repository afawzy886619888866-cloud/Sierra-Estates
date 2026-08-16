'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import { NEW_CAIRO_COMPOUNDS, CompoundLocation } from '@/components/Maps/compounds-data';
import MobileBottomNav from '@/components/client/MobileBottomNav';
import { MapPin, Globe, Camera, MessageCircle, ArrowLeft, Check, X } from 'lucide-react';

const LiveMap = dynamic<{ mode?: 'dark' | 'light'; onSelectCompound?: (c: CompoundLocation) => void; selectedCode?: string | null }>(
  () => import('@/components/Maps/LiveMap'),
  { ssr: false }
);

interface Unit {
  id: string;
  code: string;
  compound: string;
  title: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  price?: number;
  currency?: string;
  furnishedLabel?: string;
  images?: string[];
}

export default function StandaloneMapPage() {
  const { locale, setLocale } = useI18n();
  const isAr = locale === 'ar';

  const [selectedCompound, setSelectedCompound] = useState<CompoundLocation | null>(NEW_CAIRO_COMPOUNDS[0]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoRequestSent, setPhotoRequestSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedCompound) {
      setUnits([]);
      return;
    }

    const controller = new AbortController();
    const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
    const selectedNames = [selectedCompound.nameEn, selectedCompound.nameAr].map(normalize).filter(Boolean);
    setLoading(true);

    fetch('/api/inventory', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Inventory API returned ${response.status}`);
        return response.json() as Promise<{ units?: Array<Record<string, unknown>> }>;
      })
      .then((payload) => {
        const rows = Array.isArray(payload.units) ? payload.units : [];
        const fetched: Unit[] = rows
          .filter((row) => {
            const names = [row.location, row.rawLocation, row.zone].map(normalize);
            return selectedNames.some((selected) => names.some((name) => name.includes(selected) || selected.includes(name)));
          })
          .slice(0, 20)
          .map((row, index) => {
            const compound = String(row.location || selectedCompound.nameEn);
            const code = String(row.code || row.id || `${selectedCompound.code}-${index + 1}`);
            const type = String(row.propertyType || (isAr ? 'عقار' : 'Property'));
            return {
              id: String(row.id || code),
              code,
              compound,
              title: `${type} in ${compound}`,
              bedrooms: typeof row.beds === 'number' ? row.beds : undefined,
              bathrooms: undefined,
              area: typeof row.area === 'number' ? row.area : undefined,
              price: typeof row.price === 'number' && row.price > 0 ? row.price : undefined,
              currency: 'EGP',
              furnishedLabel: String(row.furnished || (isAr ? 'غير محدد' : 'Not specified')),
              images: [],
            } satisfies Unit;
          });
        setUnits(fetched);
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== 'AbortError') {
          console.warn('Live inventory fetch error', error);
          setUnits([]);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [isAr, selectedCompound]);

  const handleRequestPhotos = (unit: Unit) => {
    setPhotoRequestSent(prev => ({ ...prev, [unit.code]: true }));
    const msg = encodeURIComponent(isAr
      ? `مرحبًا، أريد طلب صور الوحدة ${unit.code} في ${unit.compound}.`
      : `Hello Sierra Estates Agent, please request photos for unit ${unit.code} in ${unit.compound}.`);
    window.open(`https://wa.me/201092048333?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative font-sans">
      
      {/* Top Header Navigation */}
      <header className="h-16 bg-[#030712]/90 backdrop-blur-xl border-b border-amber-500/20 px-4 md:px-8 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-amber-400 font-bold tracking-wider text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>SIERRA ESTATES</span>
          </Link>
          <span className="hidden sm:inline-block text-xs text-slate-500 font-mono">|</span>
          <span className="hidden sm:inline-block text-xs text-slate-300 font-mono uppercase">{isAr ? 'خريطة كمبوندات القاهرة الجديدة' : 'New Cairo Compounds Map'}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-400 hover:bg-slate-800 transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? 'English' : 'عربي'}</span>
          </button>

          <a
            href="https://wa.me/201061399688"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition uppercase shadow-lg shadow-amber-500/20"
          >
            {isAr ? 'اطلب عقار' : 'Request Property'}
          </a>
        </div>
      </header>

      {/* Main Map Body Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-visible lg:overflow-hidden min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
        
        {/* Compound Selection Sidebar (Desktop & Scrollable Mobile Bar) */}
        <div className="w-full lg:w-80 bg-[#040711] border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-3 z-20 flex-shrink-0 overflow-y-auto max-h-[28vh] lg:max-h-none">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{isAr ? 'الكمبوندات (17 كمبوند)' : 'New Cairo Compounds'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {NEW_CAIRO_COMPOUNDS.map(c => {
              const isSelected = selectedCompound?.code === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCompound(c)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium">{isAr ? c.nameAr : c.nameEn}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{c.developer}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                    {c.unitsCount} units
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="flex-1 h-[52vh] min-h-[320px] lg:h-full lg:min-h-0 relative z-10">
          <LiveMap
            mode="dark"
            selectedCode={selectedCompound?.code}
            onSelectCompound={(c) => setSelectedCompound(c)}
          />
        </div>

        {/* Selected Compound Drawer (Units List) */}
        {selectedCompound && (
          <div className="w-full lg:w-96 bg-[#030712]/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-slate-800 p-5 space-y-4 z-20 flex-shrink-0 overflow-y-auto max-h-[36vh] lg:max-h-none shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isAr ? selectedCompound.nameAr : selectedCompound.nameEn}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedCompound.developer} • {selectedCompound.unitsCount} {isAr ? 'وحدة' : 'units'}</p>
              </div>
              <button onClick={() => setSelectedCompound(null)} className="text-slate-500 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                {isAr ? 'جاري تحميل الوحدات المتاحة…' : 'Loading available units…'}
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-8 text-xs leading-6 text-slate-400">
                {isAr ? 'لا توجد وحدات حية لهذا الكمبوند حاليًا. يمكنك إرسال استفسار للمستشار.' : 'No live units are available for this compound yet. You can still send an inquiry to an advisor.'}
              </div>
            ) : (
              <div className="space-y-3">
                {units.map(unit => {
                  const hasPhotos = unit.images && unit.images.length > 0;
                  const requested = photoRequestSent[unit.code];

                  return (
                    <div key={unit.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-amber-500/40 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {unit.code}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1">{unit.title}</h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {unit.bedrooms} BR • {unit.area} sqm • {unit.furnishedLabel}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          {unit.price ? unit.price.toLocaleString() : 'TBD'} {unit.currency}
                        </span>
                      </div>

                      {/* Photo Status & Request Photo Button */}
                      <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                        {hasPhotos ? (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{isAr ? 'صور موثّقة متاحة' : 'Verified photos available'}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestPhotos(unit)}
                            disabled={requested}
                            className={`px-3 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition ${
                              requested 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                            }`}
                          >
                            <Camera className="w-3 h-3" />
                            <span>{requested ? (isAr ? '✓ تم إرسال الطلب للمستشار' : '✓ Request sent to agent') : (isAr ? '📷 اطلب صور العقار' : '📷 Request property photos')}</span>
                          </button>
                        )}

                        <a
                          href={`https://wa.me/201092048333?text=${encodeURIComponent(isAr ? `أنا مهتم بالوحدة ${unit.code} في ${unit.compound}` : `I am interested in unit ${unit.code} in ${unit.compound}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>{isAr ? 'استفسر' : 'Inquire'}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile Sticky Bottom Nav Bar */}
      <MobileBottomNav />
    </div>
  );
}
