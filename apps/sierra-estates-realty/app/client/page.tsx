'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Map as MapIcon,
  Table as TableIcon,
  Columns as SplitIcon,
  MessageCircle,
  Phone,
  Globe,
  ShieldCheck,
} from 'lucide-react';

// STRICT SIERRA PROTOCOL: SOLE AUTHORIZED CONTACT PHONE & WHATSAPP
const SIERRA_CONTACT_PHONE = '01092048333';
const SIERRA_WHATSAPP_PHONE = '201092048333';

// Dynamically import Leaflet 4K Engine to prevent SSR window reference errors
const SpatialMasterplanMap = dynamic(
  () => import('@/components/Maps/SpatialMasterplanMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-190 rounded-3xl bg-[#061122] border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase text-cyan-300">
          Initializing Ultra-HD 4K Canvas Map Engine…
        </span>
      </div>
    ),
  }
);

// Dynamically import Excel Inventory Sheet with luxury filtering sidebar
const ExcelInventorySheet = dynamic(
  () => import('@/components/site/ExcelInventorySheet'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-175 rounded-3xl bg-[#061122] border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase text-amber-300">
          Loading Supabase Live Inventory Grid…
        </span>
      </div>
    ),
  }
);

const FLAGSHIP_COMPOUNDS = [
  { id: 'all', nameEn: 'All New Cairo', nameAr: 'كل القاهرة الجديدة', tag: 'CORE REGISTRY' },
  { id: 'mivida', nameEn: 'Mivida', nameAr: 'ميفيدا إعمار', tag: 'EMAAR MISR' },
  { id: 'hydepark', nameEn: 'Hyde Park', nameAr: 'هايد بارك', tag: 'HYDE PARK' },
  { id: 'icity', nameEn: 'Mountain View iCity', nameAr: 'آي سيتي التجمع', tag: 'DMG / MOUNTAIN VIEW' },
  { id: 'villette', nameEn: 'Villette', nameAr: 'فيليت سوديك', tag: 'SODIC' },
  { id: 'palmhills', nameEn: 'Palm Hills', nameAr: 'بالم هيلز', tag: 'PALM HILLS' },
  { id: 'zedeast', nameEn: 'ZED East', nameAr: 'زيد إيست', tag: 'ORA DEVELOPERS' },
];

export default function ClientPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [viewMode, setViewMode] = useState<'map' | 'sheet' | 'split'>('map');
  const [selectedCompound, setSelectedCompound] = useState<string>('all');
  const [unitCount, setUnitCount] = useState<number>(12333);

  const isAr = lang === 'ar';

  useEffect(() => {
    let active = true;
    fetch('/api/inventory?limit=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.count === 'number' && data.count > 0) {
          setUnitCount(data.count);
        }
      })
      .catch(() => {
        // graceful fallback to baseline
      });
    return () => {
      active = false;
    };
  }, []);

  const compoundTarget = selectedCompound === 'all' ? null : (
    FLAGSHIP_COMPOUNDS.find((c) => c.id === selectedCompound)?.nameEn || null
  );

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        fontFamily: isAr ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif",
      }}
      className="min-h-screen bg-[#020813] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200"
    >
      {/* LUXURY TOP CLIENT HUD NAVBAR */}
      <header
        style={{
          background: 'rgba(6, 17, 34, 0.95)',
          backdropFilter: 'blur(24px)',
        }}
        className="sticky top-0 z-50 border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-2xl"
      >
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Live Sync Status */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-105 transition-transform">
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wider text-base text-white">
                    SIERRA <span className="text-amber-400">ESTATES</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/30">
                    Client Portal
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span>
                    {isAr
                      ? `مزامنة مباشرة مع Supabase · ${unitCount.toLocaleString()} وحدة موثقة`
                      : `Live Supabase Sync · ${unitCount.toLocaleString()} Verified Listings`}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-linear-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'خريطة 4K التفاعلية' : 'Ultra-HD 4K Map'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'sheet'
                  ? 'bg-linear-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'شيت إكسل الذكي' : 'Excel Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'split'
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-400/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitIcon className="w-3.5 h-3.5" />
              <span>{isAr ? 'العرض المزدوج' : 'Split View'}</span>
            </button>
          </div>

          {/* Quick Actions & Language Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Direct WhatsApp VIP (Strict 01092048333 Compliance) */}
            <a
              href={`https://wa.me/${SIERRA_WHATSAPP_PHONE}?text=${encodeURIComponent(
                isAr
                  ? 'مرحباً سييرا العقارية، أود التنسيق مع مكتب الاستشارات العقارية بخصوص وحدات التجمع الخامس المتاحة على الخريطة.'
                  : 'Hello Sierra Estates Advisory, I am connecting regarding available New Cairo units on the 4K Masterplan Map.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'واتساب VIP' : 'WhatsApp VIP'}</span>
              <span className="font-mono text-[11px] opacity-90">{SIERRA_CONTACT_PHONE}</span>
            </a>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Toggle Language / تغيير اللغة"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* COMPOUND QUICK SELECTOR BAR */}
      <div className="bg-[#040d1a] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#93c5fd]">
              {isAr ? 'الكمبوندات الرئيسية:' : 'Flagship Compounds:'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {FLAGSHIP_COMPOUNDS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCompound(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                  selectedCompound === c.id
                    ? 'bg-linear-to-r from-cyan-400 to-blue-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{isAr ? c.nameAr : c.nameEn}</span>
                <span
                  className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                    selectedCompound === c.id
                      ? 'bg-slate-950/30 text-slate-950'
                      : 'bg-slate-900 text-amber-400 border border-amber-400/20'
                  }`}
                >
                  {c.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT CANVAS */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* MAP VIEW */}
        {viewMode === 'map' && (
          <div className="w-full">
            <SpatialMasterplanMap lang={lang} />
          </div>
        )}

        {/* SHEET VIEW */}
        {viewMode === 'sheet' && (
          <div className="w-full">
            <ExcelInventorySheet
              compoundName={compoundTarget}
              isAr={isAr}
              isEmbedded={true}
            />
          </div>
        )}

        {/* SPLIT VIEW (MAP + INVENTORY SIDE-BY-SIDE ON DESKTOP) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full items-start">
            <div className="w-full sticky top-24">
              <SpatialMasterplanMap lang={lang} />
            </div>
            <div className="w-full">
              <ExcelInventorySheet
                compoundName={compoundTarget}
                isAr={isAr}
                isEmbedded={true}
              />
            </div>
          </div>
        )}
      </main>

      {/* LUXURY FOOTER WITH EXCLUSIVE AUTHORIZED HELPLINE */}
      <footer
        style={{
          background: 'rgba(4, 13, 26, 0.96)',
        }}
        className="mt-auto border-t border-slate-800/80 px-4 lg:px-8 py-6 text-xs text-slate-400"
      >
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span>© 2026 SIERRA ESTATES · NEW CAIRO LUXURY DIVISION</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'بيانات معتمدة 100%' : '100% Verified Inventory'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-amber-400" />
              <span className="font-mono font-bold text-white">{SIERRA_CONTACT_PHONE}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
