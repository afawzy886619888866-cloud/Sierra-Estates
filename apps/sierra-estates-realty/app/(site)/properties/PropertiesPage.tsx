'use client';

/** Port of deploy/properties.html. */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { useSite } from '@/lib/site/SiteContext';
import { useReveal } from '@/lib/site/useReveal';
import { HZDATA } from '@/lib/site/data';

type TypeFilter = 'all' | 'Villa' | 'Apartment' | 'Town' | 'Pent';
type ModeFilter = 'all' | 'sale' | 'rent';
type SortBy = 'ai' | 'price-asc' | 'price-desc' | 'area-desc';

const TYPE_CHIPS: { v: TypeFilter; k: string }[] = [
  { v: 'all', k: 'filterAll' },
  { v: 'Villa', k: 'filterVilla' },
  { v: 'Apartment', k: 'filterApt' },
  { v: 'Town', k: 'filterTown' },
  { v: 'Pent', k: 'filterPent' },
];

const MODE_CHIPS: { v: ModeFilter; k: string }[] = [
  { v: 'all', k: 'modeAll' },
  { v: 'sale', k: 'modeSale' },
  { v: 'rent', k: 'modeRent' },
];

function matchType(p: CardListing, fType: TypeFilter) {
  if (fType === 'all') return true;
  if (fType === 'Town') return p.type === 'Twin House' || p.type === 'Townhouse';
  if (fType === 'Pent') return p.type === 'Penthouse' || p.type === 'Duplex';
  return p.type === fType;
}

export default function PropertiesPage() {
  const { t } = useSite();
  const [fType, setFType] = useState<TypeFilter>('all');
  const [fMode, setFMode] = useState<ModeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('ai');

  const listings = HZDATA.listings as CardListing[];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const type = params.get('type');
    if (mode === 'sale' || mode === 'rent') setFMode(mode);
    if (type === 'Villa' || type === 'Apartment' || type === 'Town' || type === 'Pent') setFType(type);
  }, []);

  const sorted = useMemo(() => {
    const filtered = listings.filter(
      (p) => matchType(p, fType) && (fMode === 'all' || p.mode === fMode)
    );
    return filtered.slice().sort((a, b) => {
      if (sortBy === 'ai') return b.ai - a.ai;
      if (sortBy === 'price-asc') return (a.egpM || a.usd) - (b.egpM || b.usd);
      if (sortBy === 'price-desc') return (b.egpM || b.usd) - (a.egpM || a.usd);
      if (sortBy === 'area-desc') return b.area - a.area;
      return 0;
    });
  }, [listings, fType, fMode, sortBy]);

  useReveal([fType, fMode, sortBy]);

  return (
    <SiteShell active="best">
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navProps')}</span>
          </div>
          <h1>{t('propsTit')}</h1>
          <p className="sub">{t('propsSub')}</p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <div className="toolbar rv">
            <div className="chip-group" id="type-chips">
              {TYPE_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={`chip${fType === c.v ? ' on' : ''}`}
                  onClick={() => setFType(c.v)}
                >
                  {t(c.k)}
                </button>
              ))}
            </div>

            <span className="chip-sep" />

            <div className="chip-group" id="mode-chips">
              {MODE_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={`chip${fMode === c.v ? ' on' : ''}`}
                  onClick={() => setFMode(c.v)}
                >
                  {t(c.k)}
                </button>
              ))}
            </div>

            <div className="toolbar-right">
              <select
                className="sort-select"
                id="sort-select"
                aria-label="Sort listings"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="ai">Sort: AI Score ↓</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="area-desc">Area: Largest First</option>
              </select>
              <span className="count-badge">
                <b id="res-count">{sorted.length}</b> <span>{t('results')}</span>
              </span>
            </div>
          </div>

          {sorted.length > 0 ? (
            <div className="grid-props" id="all-grid">
              {sorted.map((p, i) => (
                <PropertyCard key={p.id} p={p} i={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state" id="empty-state">
              <Building style={{ width: 44, height: 44, opacity: 0.35, marginBottom: 12 }} />
              <h3>No properties match your current filters</h3>
              <p>Try selecting a different property type or clearing mode filters.</p>
              <button
                className="btn btn-navy"
                type="button"
                style={{ marginTop: 18 }}
                onClick={() => { setFType('all'); setFMode('all'); }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
