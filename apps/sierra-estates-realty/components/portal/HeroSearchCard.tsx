'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import {
  Search, MapPin, Home, Bed, DollarSign, SlidersHorizontal, ArrowRight, Check
} from 'lucide-react';

interface HeroSearchCardProps {
  onSearch?: (filters: {
    tab: 'buy' | 'rent' | 'new';
    compound: string;
    type: string;
    beds: string;
    price: string;
  }) => void;
}

const COMPOUNDS_LIST = [
  'Hyde Park', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)',
  'Villette (SODIC)', 'Palm Hills Katameya', 'Swan Lake Residences',
  'Katameya Dunes', 'Uptown Cairo', 'Taj City', 'Sarai', 'Al Burouj'
];

export default function HeroSearchCard({ onSearch }: HeroSearchCardProps) {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'new'>('buy');
  const [selectedCompound, setSelectedCompound] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');
  const [maxPrice, setMaxPrice] = useState('all');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({
        tab: activeTab,
        compound: selectedCompound,
        type: propertyType,
        beds: bedrooms,
        price: maxPrice
      });
    } else {
      const params = new URLSearchParams();
      if (activeTab) params.set('mode', activeTab === 'buy' ? 'sale' : activeTab);
      if (selectedCompound) params.set('compound', selectedCompound);
      if (propertyType !== 'all') params.set('type', propertyType);
      if (bedrooms !== 'all') params.set('beds', bedrooms);
      if (maxPrice !== 'all') params.set('price', maxPrice);
      router.push(`/properties?${params.toString()}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#0b1329]/80 backdrop-blur-xl border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 text-white transition-all duration-300">
      {/* Search Mode Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'buy'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>{t.tabBuy}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rent')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'rent'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>{t.tabRent}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'new'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>{t.tabNew}</span>
        </button>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Compound / Location */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-compound" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.fLoc}</span>
          </label>
          <select
            id="search-compound"
            value={selectedCompound}
            onChange={(e) => setSelectedCompound(e.target.value)}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none transition-colors"
          >
            <option value="" className="bg-[#0b1329] text-slate-300">
              {isAr ? 'جميع كمبوندات القاهرة الجديدة' : 'All New Cairo Compounds'}
            </option>
            {COMPOUNDS_LIST.map((cpd) => (
              <option key={cpd} value={cpd} className="bg-[#0b1329] text-white">
                {cpd}
              </option>
            ))}
          </select>
        </div>

        {/* Property Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-type" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.fType}</span>
          </label>
          <select
            id="search-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none transition-colors"
          >
            <option value="all" className="bg-[#0b1329] text-slate-300">{t.filterAll}</option>
            <option value="Villa" className="bg-[#0b1329] text-white">{t.filterVilla}</option>
            <option value="Apartment" className="bg-[#0b1329] text-white">{t.filterApt}</option>
            <option value="Townhouse" className="bg-[#0b1329] text-white">{t.filterTown}</option>
            <option value="Penthouse" className="bg-[#0b1329] text-white">{t.filterPent}</option>
          </select>
        </div>

        {/* Bedrooms */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-bedrooms" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Bed className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.fBeds}</span>
          </label>
          <select
            id="search-bedrooms"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none transition-colors"
          >
            <option value="all" className="bg-[#0b1329] text-slate-300">{t.filterAll}</option>
            <option value="1" className="bg-[#0b1329] text-white">1 {t.beds}</option>
            <option value="2" className="bg-[#0b1329] text-white">2 {t.beds}</option>
            <option value="3" className="bg-[#0b1329] text-white">3 {t.beds}</option>
            <option value="4" className="bg-[#0b1329] text-white">4 {t.beds}</option>
            <option value="5" className="bg-[#0b1329] text-white">5+ {t.beds}</option>
          </select>
        </div>

        {/* Max Price & Search Action */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-price" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.fPrice}</span>
          </label>
          <div className="flex gap-2">
            <select
              id="search-price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 outline-none transition-colors"
            >
              <option value="all" className="bg-[#0b1329] text-slate-300">{t.filterAll}</option>
              {activeTab === 'rent' ? (
                <>
                  <option value="20000" className="bg-[#0b1329] text-white">20,000 EGP/mo</option>
                  <option value="40000" className="bg-[#0b1329] text-white">40,000 EGP/mo</option>
                  <option value="60000" className="bg-[#0b1329] text-white">60,000 EGP/mo</option>
                  <option value="100000" className="bg-[#0b1329] text-white">100,000+ EGP/mo</option>
                </>
              ) : (
                <>
                  <option value="5000000" className="bg-[#0b1329] text-white">5,000,000 EGP</option>
                  <option value="10000000" className="bg-[#0b1329] text-white">10,000,000 EGP</option>
                  <option value="20000000" className="bg-[#0b1329] text-white">20,000,000 EGP</option>
                  <option value="35000000" className="bg-[#0b1329] text-white">35,000,000 EGP</option>
                  <option value="50000000" className="bg-[#0b1329] text-white">50,000,000+ EGP</option>
                </>
              )}
            </select>
            <button
              type="submit"
              aria-label={t.search}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{t.search}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
