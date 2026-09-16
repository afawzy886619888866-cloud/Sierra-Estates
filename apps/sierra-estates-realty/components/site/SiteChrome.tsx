'use client';

/**
 * High-End Luxury Nav + Mobile Bottom Bar
 * Designed with glassmorphism, gold accents in dark mode, and precision typography.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Languages, Home, Building2, Map, Sparkles, Phone, BriefcaseBusiness,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export type ActiveNav = 'home' | 'cpds' | 'best' | 'net' | 'contact' | 'projects' | 'career' | null;

export default function SiteChrome({ active = null }: { active?: ActiveNav }) {
  const { t, theme, toggleTheme, toggleLang, lang } = useSite();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const act = (k: ActiveNav) => (active === k ? 'active' : undefined);
  const isAr = lang === 'ar';
  const cairoPlazaHref = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const careerHref = isAr ? '/ar/career' : '/career';

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="main-nav">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Sierra Estates Homepage">
            <span className="mark logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-mark.png" alt="Sierra Estates" />
            </span>
            <span>
              <b>Sierra Estates</b>
              <small>{t('brandSub')}</small>
            </span>
          </Link>

          <div className="menu">
            <Link href="/" className={act('home')}>{t('navHome')}</Link>
            <Link href="/compounds" className={act('cpds')}>{t('navCpds')}</Link>
            <Link href="/properties" className={act('best')}>{t('navBest')}</Link>
            <Link href="/net" className={act('net')} style={active === 'net' ? { color: '#e9c176', fontWeight: 700 } : undefined}>
              {isAr ? 'رادار الوحدات' : 'Listing Net'}
            </Link>
            <Link href={cairoPlazaHref} className={act('projects')}>{t('navProjects')}</Link>
            <Link href={careerHref} className={act('career')}>{t('navCareer')}</Link>
            <Link href={isAr ? '/ar/notebookllm' : '/notebookllm'}>{isAr ? 'بنك المعلومات' : 'Info Bank'}</Link>
            <Link href="/#contact" className={act('contact')}>{t('navContact')}</Link>
          </div>

          <div className="nav-right">
            <Link href="/add-listing" className="add-listing-btn" title={t('addListingNote')}>
              <span className="al-text">{t('addListing')}</span>
              <span className="al-note">{t('addListingNote')}</span>
            </Link>
            <Link href="/#contact" className="req-now-btn" title={t('reqNote')}>
              <span className="req-text">{t('reqNow')}</span>
              <span className="req-note">{t('reqNote')}</span>
            </Link>
            
            {/* High-End Theme Switcher */}
            <button
              className="nav-control-pill nav-theme-pill"
              id="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? (isAr ? 'التبديل إلى الوضع الفاتح' : 'Switch to Light Mode') : (isAr ? 'التبديل إلى الوضع الداكن' : 'Switch to Dark Mode')}
            >
              {theme === 'dark' ? <Sun className="i sun-i" /> : <Moon className="i moon-i" />}
              <span className="pill-text">{theme === 'dark' ? (isAr ? 'فاتح' : 'Light') : (isAr ? 'داكن' : 'Dark')}</span>
            </button>

            {/* High-End Language Switcher */}
            <button
              className="nav-control-pill nav-lang-pill"
              id="lang-toggle"
              type="button"
              onClick={toggleLang}
              aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
              title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Languages className="i lang-i" />
              <span className="pill-text">{isAr ? 'English' : 'عربي'}</span>
              <span className="pill-badge">{isAr ? 'EN' : 'AR'}</span>
            </button>
          </div>
        </div>
      </nav>

      <nav className="bottom-nav">
        <Link href="/" className={`bn-item${active === 'home' ? ' active' : ''}`}>
          <Home className="i" /><span>{t('navHome')}</span>
        </Link>
        <Link href="/properties" className={`bn-item${active === 'best' ? ' active' : ''}`}>
          <Building2 className="i" /><span>{t('navBest')}</span>
        </Link>
        <Link href="/compounds" className={`bn-item${active === 'cpds' ? ' active' : ''}`}>
          <Map className="i" /><span>{t('navCpds')}</span>
        </Link>
        <Link href={cairoPlazaHref} className={`bn-item${active === 'projects' ? ' active' : ''}`}>
          <BriefcaseBusiness className="i" /><span>{t('navProjects')}</span>
        </Link>
        <Link href={careerHref} className={`bn-item${active === 'career' ? ' active' : ''}`}>
          <Sparkles className="i" /><span>{t('navCareer')}</span>
        </Link>
        <Link href="/#contact" className={`bn-item${active === 'contact' ? ' active' : ''}`}>
          <Phone className="i" /><span>{t('navContact')}</span>
        </Link>
      </nav>
    </>
  );
}

