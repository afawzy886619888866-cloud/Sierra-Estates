'use client';

/**
 * Nav + mobile bottom bar — port of chromeHTML() in deploy/shared.js.
 * Class names match shared.css so the original styling applies unchanged.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sun, Moon, Languages, Home, Building2, Map, Sparkles, Phone, BriefcaseBusiness,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export type ActiveNav = 'home' | 'cpds' | 'best' | 'contact' | 'projects' | null;

export default function SiteChrome({ active = null }: { active?: ActiveNav }) {
  const { t, theme, toggleTheme, toggleLang } = useSite();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const act = (k: ActiveNav) => (active === k ? 'active' : undefined);

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="main-nav">
        <div className="wrap">
          <Link href="/" className="brand">
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
            <Link href="/cairo-plaza" className={act('projects')}>{t('navProjects')}</Link>
            <Link href="/#contact" className={act('contact')}>{t('navContact')}</Link>
          </div>

          <div className="nav-right">
            <Link href="/add-listing" className="add-listing-btn">
              <span className="al-text">{t('addListing')}</span>
              <span className="al-note">{t('addListingNote')}</span>
            </Link>
            <Link href="/#contact" className="req-now-btn">
              <span className="req-text">{t('reqNow')}</span>
              <span className="req-note">{t('reqNote')}</span>
            </Link>
            <button className="tb-toggle" id="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="i" /> : <Moon className="i" />}
            </button>
            <button className="tb-toggle" id="lang-toggle" type="button" onClick={toggleLang} aria-label="Toggle language">
              <Languages className="i" />
              <span>{t('langBtn')}</span>
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
        <Link href="/cairo-plaza" className={`bn-item${active === 'projects' ? ' active' : ''}`}>
          <BriefcaseBusiness className="i" /><span>{t('navProjects')}</span>
        </Link>
        <Link href="/#ai" className="bn-item">
          <Sparkles className="i" /><span>{t('navAI')}</span>
        </Link>
        <Link href="/#contact" className={`bn-item${active === 'contact' ? ' active' : ''}`}>
          <Phone className="i" /><span>{t('navContact')}</span>
        </Link>
      </nav>
    </>
  );
}
