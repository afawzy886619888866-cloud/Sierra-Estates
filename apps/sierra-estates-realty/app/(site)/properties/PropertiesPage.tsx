'use client';

/** Port of deploy/properties.html. */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building, Radar, Grid } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import ListingNetMap from '@/components/site/ListingNetMap';
import { useSite } from '@/lib/site/SiteContext';
import { useReveal } from '@/lib/site/useReveal';
import { HZDATA } from '@/lib/site/data';

type TypeFilter = 'all' | 'Villa' | 'Apartment' | 'Town' | 'Pent';
type ModeFilter = 'all' | 'sale' | 'rent';
type SortBy = 'ai' | 'price-asc' | 'price-desc' | 'area-desc';
type ViewMode = 'radar' | 'catalog';

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
  const [fCompound, setFCompound] = useState<string>('');
  const [fSegment, setFSegment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('ai');
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const type = params.get('type');
    const compound = params.get('compound');
    const segment = params.get('segment');
    const view = params.get('view');

    if (mode === 'sale' || mode === 'rent') setFMode(mode);
    if (type === 'Villa' || type === 'Apartment' || type === 'Town' || type === 'Pent') setFType(type);
    if (compound) setFCompound(compound);
    if (segment) setFSegment(segment);
    if (view === 'catalog') setViewMode('catalog');
  }, []);

  const listings: CardListing[] = useMemo(() => {
    if (fCompound) {
      const units: any[] = (HZDATA as any).unitsFor?.(fCompound) || [];
      return units.map((u: any, idx: number) => ({
        id: idx + 1,
        code: u.code || `SE-${String(idx + 1).padStart(4, '0')}`,
        cmp: fCompound,
        zone: u.zone || '5th Settlement',
        type: u.type || 'Apartment',
        beds: Number(u.beds || 3),
        bath: Number(u.bath || 2),
        area: Number(u.area || 160),
        egpM: Number(u.egpM || 8.5),
        usd: Number(u.usd || 1800),
        ai: Number(u.ai || 9.0),
        tag: u.tag || (u.mode === 'rent' ? 'Verified Rent' : 'Verified Sale'),
        mode: u.mode || 'sale',
        agent: u.agent || 'Sierra Direct Advisor',
        ago: 'Verified Master Sync',
        img: u.img,
        segment: u.segment,
      }));
    }
    return HZDATA.listings as CardListing[];
  }, [fCompound]);

  const sorted = useMemo(() => {
    const filtered = listings.filter(
      (p) =>
        matchType(p, fType) &&
        (fMode === 'all' || p.mode === fMode) &&
        (fSegment === 'all' || !('segment' in p) || (p as any).segment === fSegment)
    );
    return filtered.slice().sort((a, b) => {
      if (sortBy === 'ai') return b.ai - a.ai;
      if (sortBy === 'price-asc') return (a.egpM || a.usd) - (b.egpM || b.usd);
      if (sortBy === 'price-desc') return (b.egpM || b.usd) - (a.egpM || a.usd);
      if (sortBy === 'area-desc') return b.area - a.area;
      return 0;
    });
  }, [listings, fType, fMode, fSegment, sortBy]);

  useReveal([fType, fMode, fCompound, fSegment, sortBy]);

  return (
    <SiteShell active="best">
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navProps')}</span>
            {fCompound && (
              <>
                <span className="sep">/</span>
                <span style={{ color: 'var(--accent, #0284c7)', fontWeight: 700 }}>{fCompound}</span>
              </>
            )}
          </div>
          <h1>{fCompound ? `${fCompound} Properties` : t('propsTit')}</h1>
          <p className="sub">
            {fCompound
              ? `Live master inventory units for ${fCompound} across verified owners and partner brokers.`
              : t('propsSub')}
          </p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          {fCompound && (
            <div
              style={{
                marginBottom: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                borderRadius: 999,
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <span>Compound: <strong>{fCompound}</strong></span>
              {fSegment !== 'all' && <span>· Segment: <strong>{fSegment.replace(/_/g, ' ')}</strong></span>}
              <button
                type="button"
                onClick={() => {
                  setFCompound('');
                  setFSegment('all');
                  window.history.replaceState({}, '', '/properties');
                }}
                style={{
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 11,
                  marginLeft: 4,
                }}
                title="Clear compound filter"
              >
                ×
              </button>
            </div>
          )}

          {/* Radar Net View vs Catalog Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: viewMode === 'radar' ? '1px solid #c99436' : '1px solid rgba(255,255,255,0.15)',
                background: viewMode === 'radar' ? 'linear-gradient(135deg, #002b4b, #00192e)' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'radar' ? '#e9c176' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'radar' ? '0 4px 14px rgba(201, 148, 54, 0.2)' : 'none',
              }}
            >
              <Radar size={16} />
              <span>رادار شبكة الوحدات والخريطة (Listing Net & Map)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: viewMode === 'catalog' ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.15)',
                background: viewMode === 'catalog' ? 'linear-gradient(135deg, #002b4b, #00192e)' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'catalog' ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Grid size={16} />
              <span>القائمة الكلاسيكية (Classic Catalog)</span>
            </button>
          </div>

          {viewMode === 'radar' ? (
            <ListingNetMap />
          ) : (
            <>
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
          </>
        )}
        </div>
      </section>
    </SiteShell>
  );
}
