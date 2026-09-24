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
            <Link href="/net" className={act('net')} style={active === 'net' ? { color: '#e9c176', fontWeight: 700 } : undefined}>
              {isAr ? 'الخريطة والرادار' : 'Map & Radar'}
            </Link>
            <Link href="/compounds" className={act('cpds')}>{t('navCpds')}</Link>
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
              <Link href="/net" className={`mobile-drawer-link${active === 'net' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Radar className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{isAr ? 'الخريطة والرادار' : 'Map & Radar'}</span>
              </Link>
              <Link href="/compounds" className={`mobile-drawer-link${active === 'cpds' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Map className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('navCpds')}</span>
              </Link>
              <Link href="/add-listing" className="mobile-drawer-link" onClick={() => setMobileMenuOpen(false)}>
                <PlusCircle className="i" style={{ width: 18, height: 18, color: '#10b981' }} />
                <span>{t('addListing')}</span>
              </Link>
              <Link href="/#contact" className={`mobile-drawer-link${active === 'contact' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <Phone className="i" style={{ width: 18, height: 18, color: '#e9c176' }} />
                <span>{t('reqNow')}</span>
              </Link>

              <div style={{ margin: '14px 0 6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                <a
                  href="#site-footer"
                  className="mobile-drawer-link"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontSize: 12, opacity: 0.7 }}
                >
                  <Building2 className="i" style={{ width: 16, height: 16 }} />
                  <span>{isAr ? 'المزيد في أسفل الصفحة (المشاريع، الوظائف، بنك المعلومات)...' : 'More in Footer (Projects, Career, Info Bank)...'}</span>
                </a>
              </div>
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

      {/* Mobile Bottom Navigation Bar: Exactly Map, Compounds, Add Listing, and Request */}
      <nav className="bottom-nav">
        <Link href="/net" className={`bn-item${active === 'net' ? ' active' : ''}`} title={isAr ? 'الخريطة والرادار' : 'Map & Radar'}>
          <Radar className="i" style={active === 'net' ? { color: '#e9c176' } : undefined} />
          <span>{isAr ? 'الخريطة' : 'Map'}</span>
        </Link>
        <Link href="/compounds" className={`bn-item${active === 'cpds' ? ' active' : ''}`} title={t('navCpds')}>
          <Building2 className="i" style={active === 'cpds' ? { color: '#e9c176' } : undefined} />
          <span>{t('navCpds')}</span>
        </Link>
        <Link href="/add-listing" className="bn-item" title={t('addListing')}>
          <PlusCircle className="i" style={{ color: '#10b981' }} />
          <span>{t('addListing')}</span>
        </Link>
        <Link href="/#contact" className={`bn-item${active === 'contact' ? ' active' : ''}`} title={t('reqNow')}>
          <Phone className="i" style={{ color: '#e9c176' }} />
          <span>{t('reqNow')}</span>
        </Link>
      </nav>
    </>
  );
}

