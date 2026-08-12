'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Sparkles, Search, MessageCircle, Globe } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const isAr = locale === 'ar';

  const toggleLanguage = () => {
    setLocale(isAr ? 'en' : 'ar');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-t border-amber-500/20 px-3 py-2 shadow-2xl">
      <div className="flex items-center justify-between text-[11px] font-mono">
        
        {/* Compounds Map Link */}
        <Link 
          href="/map" 
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            pathname === '/map' 
              ? 'text-amber-400 bg-amber-500/10 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-5 h-5 text-amber-400" />
          <span>{isAr ? 'الخريطة' : 'Map'}</span>
        </Link>

        {/* Best Listings Link */}
        <Link 
          href="/#featured" 
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            pathname === '/' 
              ? 'text-amber-400 bg-amber-500/10 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{isAr ? 'أهم العقارات' : 'Best Deals'}</span>
        </Link>

        {/* Search & Filter Link */}
        <Link 
          href="/properties" 
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
            pathname.startsWith('/properties') 
              ? 'text-amber-400 bg-amber-500/10 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5 text-amber-400" />
          <span>{isAr ? 'بحث' : 'Search'}</span>
        </Link>

        {/* AI WhatsApp Link */}
        <a 
          href="https://wa.me/201061399688"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition"
        >
          <MessageCircle className="w-5 h-5 text-emerald-400" />
          <span>{isAr ? 'المساعد' : 'AI Help'}</span>
        </a>

        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-slate-300 hover:bg-slate-800 transition"
        >
          <Globe className="w-5 h-5 text-amber-400" />
          <span className="font-bold">{isAr ? 'EN' : 'عربي'}</span>
        </button>

      </div>
    </div>
  );
}
