'use client';

/**
 * High-End Luxury Nav + Mobile Bottom Bar
 * Designed with glassmorphism, gold accents in dark mode, and precision typography.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sun,
  Moon,
  Languages,
  Home,
  Building2,
  Map,
  Sparkles,
  Phone,
  BriefcaseBusiness,
  Menu,
  X,
  PlusCircle,
  Radar,
  BookOpen,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export type ActiveNav = 'home' | 'cpds' | 'best' | 'net' | 'contact' | 'projects' | 'career' | null;

export default function SiteChrome({ active = null }: { active?: ActiveNav }) {
  const { t, theme, toggleTheme, toggleLang, lang } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer on ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const act = (k: ActiveNav) => (active === k ? 'active' : undefined);
  const isAr = lang === 'ar';
  const cairoPlazaHref = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const careerHref = isAr ? '/ar/career' : '/career';
  const infoBankHref = isAr ? '/ar/notebookllm' : '/notebookllm';

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
            <Link href={infoBankHref}>{isAr ? 'بنك المعلومات' : 'Info Bank'}</Link>
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

            {/* Mobile Hamburger Menu Toggle */}
            <button
              className="mobile-nav-toggle"
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
              {...(mobileMenuOpen ? { 'aria-expanded': true } : { 'aria-expanded': false })}
              title={mobileMenuOpen ? 'Close Menu' : 'Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="i" style={{ width: 22, height: 22 }} /> : <Menu className="i" style={{ width: 22, height: 22 }} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-Out Luxury Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'قائمة التنقل' : 'Navigation Menu'}
        >
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="drawer-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo-mark.png" alt="Sierra Estates" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                <div>
                  <b style={{ color: '#e9c176', fontSize: 16, display: 'block' }}>Sierra Estates</b>
                  <small style={{ color: '#94a3b8', fontSize: 11 }}>{t('brandSub')}</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="drawer-close-btn"
                aria-label="Close menu"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div className="mobile-drawer-links">
              <Link href="/" className={`mobile-drawer-link${active === 'home' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Home className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navHome')}</span>
              </Link>
              <Link href="/compounds" className={`mobile-drawer-link${active === 'cpds' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Map className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navCpds')}</span>
              </Link>
              <Link href="/properties" className={`mobile-drawer-link${active === 'best' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Building2 className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navBest')}</span>
              </Link>
              <Link href="/net" className={`mobile-drawer-link${active === 'net' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Radar className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{isAr ? 'رادار اصطياد وتأكيد الوحدات' : 'Listing Net Radar'}</span>
              </Link>
              <Link href={cairoPlazaHref} className={`mobile-drawer-link${active === 'projects' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <BriefcaseBusiness className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navProjects')}</span>
              </Link>
              <Link href={careerHref} className={`mobile-drawer-link${active === 'career' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Sparkles className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navCareer')}</span>
              </Link>
              <Link href={infoBankHref} className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <BookOpen className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{isAr ? 'بنك معلومات القاهرة الجديدة' : 'Info Bank (AI Briefings)'}</span>
              </Link>
              <Link href="/add-listing" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <PlusCircle className="i" style={{ width: 18, height: 18, color: '#10b981' }} />
                <span>{t('addListing')}</span>
              </Link>
              <Link href="/#contact" className={`mobile-drawer-link${active === 'contact' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Phone className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navContact')}</span>
              </Link>
            </div>

            <div className="mobile-drawer-footer">
              <Link
                href="/#contact"
                className="btn btn-pri"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  minHeight: 46,
                  textDecoration: 'none',
                }}
              >
                <span>{t('reqNow')}</span>
              </Link>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 44,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {theme === 'dark' ? <Sun style={{ width: 16, height: 16, color: '#e9c176' }} /> : <Moon style={{ width: 16, height: 16, color: '#e9c176' }} />}
                  <span>{theme === 'dark' ? (isAr ? 'الوضع الفاتح' : 'Light Mode') : (isAr ? 'الوضع الداكن' : 'Dark Mode')}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleLang}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 44,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Languages style={{ width: 16, height: 16, color: '#e9c176' }} />
                  <span>{isAr ? 'English' : 'عربي'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

