'use client';
/**
 * Sierra Estates — Properties listing (port of properties.html).
 * Real Firestore `properties` (fallback to kit data), type + mode filters,
 * sorted by AI score. framer-motion card entrances via PropertyCard.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Nav, Topbar, Footer, PropertyCard, Reveal, SierraConcierge, useT } from './ui';
import { FALLBACK_LISTINGS, fetchListings, Listing } from './portalData';

type TypeFilter = 'all' | 'Villa' | 'Apartment' | 'Town' | 'Pent';
type ModeFilter = 'all' | 'sale' | 'rent';

export default function PropertiesPortal() {
  const { t, locale } = useT();
  const isAr = locale === 'ar';
  const [listings, setListings] = useState<Listing[]>(FALLBACK_LISTINGS);
  const [fType, setFType] = useState<TypeFilter>('all');
  const [fMode, setFMode] = useState<ModeFilter>('all');

  useEffect(() => {
    let cancelled = false;
    fetchListings(48).then((live) => { if (!cancelled && live.length) setListings(live); });
    return () => { cancelled = true; };
  }, []);

  const list = useMemo(
    () => listings.filter((p) => {
      if (fType !== 'all') {
        if (fType === 'Town' && p.type !== 'Twin House' && p.type !== 'Townhouse') return false;
        else if (fType === 'Pent' && p.type !== 'Penthouse' && p.type !== 'Duplex') return false;
        else if (fType !== 'Town' && fType !== 'Pent' && p.type !== fType) return false;
      }
      return fMode === 'all' || p.mode === fMode;
    }).sort((a, b) => b.ai - a.ai),
    [listings, fType, fMode],
  );


  const typeChips: [TypeFilter, string][] = [
    ['all', t('filterAll')], ['Villa', t('filterVilla')], ['Apartment', t('filterApt')],
    ['Town', t('filterTown')], ['Pent', t('filterPent')],
  ];
  const modeChips: [ModeFilter, string][] = [
    ['all', t('modeAll')], ['sale', t('modeSale')], ['rent', t('modeRent')],
  ];

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav active="props" />
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs"><Link href="/">{t('crumbHome')}</Link><span className="sep">/</span><span>{t('navProps')}</span></div>
          <h1>{t('propsTit')}</h1>
          <p className="sub">{t('propsSub')}</p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <Reveal className="toolbar">
            {typeChips.map(([k, label]) => (
              <button key={k} type="button" className={`chip${fType === k ? ' on' : ''}`} onClick={() => setFType(k)}>{label}</button>
            ))}
            <span className="chip-sep" />
            {modeChips.map(([k, label]) => (
              <button key={k} type="button" className={`chip${fMode === k ? ' on' : ''}`} onClick={() => setFMode(k)}>{label}</button>
            ))}
            <span className="count"><b>{list.length}</b> {t('results')}</span>
          </Reveal>
          {list.length ? (
            <div className="grid-props">
              {list.map((p, i) => <PropertyCard key={p.id} p={p} index={i} />)}
            </div>
          ) : (
            <div className="empty">—</div>
          )}
        </div>
      </section>

      <Footer />
      <SierraConcierge />
    </div>
  );
}
