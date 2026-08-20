'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/I18nContext';
import { EN, AR } from '@/app/client/copy';
import {
  Menu, X, Globe, Phone, PlusCircle, Sparkles,
  Compass, ShieldCheck, Sun, Moon
} from 'lucide-react';

interface PortalChromeProps {
  onSignInClick?: () => void;
  activeSection?: string;
}

export default function PortalChrome({ onSignInClick: _onSignInClick, activeSection }: PortalChromeProps) {
  const { locale, setLocale } = useI18n();
  const isAr = locale === 'ar';
  const t = isAr ? AR : EN;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLocale(isAr ? 'en' : 'ar');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  return (
    <>
      {/* Top Notification Bar */}
      <aside aria-label="Announcement" className="w-full bg-[#0a1120] border-b border-amber-500/20 text-xs text-amber-200/90 py-1.5 px-4 hidden md:flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {isAr ? 'مباشر' : 'LIVE'}
          </span>
          <span>
            {isAr
              ? 'تحديثات السوق الفورية لـ 29 كمبوند في القاهرة الجديدة · تقييمات الذكاء الاصطناعي نشطة'
              : 'Real-time market intelligence for 29 New Cairo compounds · AI valuation models active'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="tel:+201092048333"
            className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span dir="ltr">+2 0109 204 8333</span>
          </a>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? 'وسطاء معتمدون من RERA' : 'RERA Licensed'}
          </span>
        </div>
      </aside>

      {/* Main Sticky Navigation */}
      <header
        className={`sticky top-0 w-full z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[#080d1a]/95 backdrop-blur-md border-b border-white/10 shadow-2xl py-3'
            : 'bg-gradient-to-b from-[#080d1a]/90 via-[#080d1a]/60 to-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-500/50 rounded-lg p-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#0b1329] rounded-[10px] flex items-center justify-center">
                <span className="font-serif font-black text-lg bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                  SE
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-amber-300 transition-colors">
                SIERRA ESTATES
              </span>
              <span className="text-[10px] tracking-wider uppercase text-amber-400/90 font-medium -mt-1">
                {t.brandSub}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === 'home'
                  ? 'text-amber-300 bg-white/5'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.navHome}
            </Link>
            <Link
              href="/properties"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all"
            >
              {t.navProps}
            </Link>
            <Link
              href="/compounds"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all"
            >
              {t.navCpds}
            </Link>
            <Link
              href="/map"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              {isAr ? 'خريطة القاهرة' : 'Live Map'}
            </Link>
            <Link
              href="/virtual-tour"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all"
            >
              {isAr ? 'جولة 3D' : '3D Virtual Tour'}
            </Link>
            <Link
              href="/#insights"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {t.navAI}
            </Link>
            <Link
              href={isAr ? '/ar/cairo-plaza/overview' : '/cairo-plaza/overview'}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'كايرو بلازا' : 'Cairo Plaza'}</span>
            </Link>
            <Link
              href="/careers"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition-all"
            >
              {isAr ? 'الوظائف' : 'Careers'}
            </Link>
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-white/5 transition-colors border border-white/10"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              aria-label="Switch Language"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-amber-300 hover:bg-white/5 transition-colors border border-white/10"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'English' : 'العربية'}</span>
            </button>

            {/* Add Listing CTA */}
            <Link
              href="/add-listing"
              className={`hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                activeSection === 'add-listing'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/20'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.addListing}</span>
            </Link>

            {/* Sign In / WhatsApp Link */}
            <a
              href="https://wa.me/201092048333"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-amber-500/40 transition-all active:scale-95"
            >
              <span>{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggleLanguage}
              aria-label="Switch Language"
              className="p-2 rounded-lg text-slate-300 border border-white/10"
            >
              <Globe className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-slate-200 hover:text-white bg-white/5 border border-white/10 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/95 backdrop-blur-xl flex flex-col pt-20 pb-6 px-6">
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="absolute top-5 right-5 p-2 rounded-lg bg-white/10 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex flex-col gap-4 text-lg font-medium text-slate-200">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10 text-amber-400 font-semibold"
            >
              {t.navHome}
            </Link>
            <Link
              href="/properties"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10"
            >
              {t.navProps}
            </Link>
            <Link
              href="/compounds"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10"
            >
              {t.navCpds}
            </Link>
            <Link
              href="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10 flex items-center justify-between"
            >
              <span>{isAr ? 'خريطة القاهرة المباشرة' : 'Live Interactive Map'}</span>
              <Compass className="w-5 h-5 text-amber-400" />
            </Link>
            <Link
              href="/virtual-tour"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10"
            >
              {isAr ? 'الجولة الافتراضية 3D' : '3D Virtual Tour'}
            </Link>
            <Link
              href="/#insights"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10 flex items-center justify-between"
            >
              <span>{t.navAI}</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </Link>
            <Link
              href={isAr ? '/ar/cairo-plaza/overview' : '/cairo-plaza/overview'}
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10 flex items-center justify-between text-amber-300 font-semibold"
            >
              <span>{isAr ? 'كايرو بلازا' : 'Cairo Plaza'}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </Link>
            <Link
              href="/careers"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10"
            >
              {isAr ? 'الوظائف' : 'Careers'}
            </Link>
            <Link
              href="/add-listing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-white/10 flex items-center justify-between text-amber-300 font-semibold"
            >
              <span>{t.addListing}</span>
              <PlusCircle className="w-4 h-4 text-amber-400" />
            </Link>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <a
              href="https://wa.me/201092048333"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-center shadow-lg"
            >
              {isAr ? 'محادثة عبر واتساب' : 'WhatsApp Concierge'}
            </a>
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>{t.rights}</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 text-slate-300"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
