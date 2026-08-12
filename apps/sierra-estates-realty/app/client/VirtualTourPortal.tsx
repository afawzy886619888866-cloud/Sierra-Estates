'use client';
/**
 * Sierra Estates — Virtual Tour
 * Powered by Listing3D — full-screen immersive 3D tour embed.
 * Replaces the old photo-gallery placeholder completely.
 */
import React from 'react';
import Link from 'next/link';
import { Nav, Topbar, Footer, SierraConcierge, useT } from './ui';

const LISTING3D_URL = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';

export default function VirtualTourPortal() {
  const { t, locale } = useT();
  const isAr = locale === 'ar';

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav />

      {/* Page header */}
      <header className="page-hero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('ai7t')}</span>
          </div>
          <h1>{t('tourTit')}</h1>
          <p className="sub">{t('tourNote')}</p>
        </div>
      </header>

      {/* Full-screen Listing3D embed */}
      <section style={{ padding: '0 0 48px' }}>
        <div className="wrap">
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              border: '1.5px solid rgba(233,193,118,0.18)',
              background: '#07111e',
            }}
          >
            <iframe
              src={LISTING3D_URL}
              title="Sierra Estates — 3D Virtual Tour"
              allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>

          {/* Caption bar below the tour */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 13, color: 'var(--c-gold)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                🏠 Sierra Estates — Flagship Unit · New Cairo
              </p>
              <p style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>
                Powered by Listing3D · Use mouse or touch to explore · Click ⛶ for full screen
              </p>
            </div>
            <a
              href={LISTING3D_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sec"
              style={{ fontSize: 13, padding: '8px 18px' }}
            >
              Open Full Screen ↗
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <SierraConcierge />
    </div>
  );
}
