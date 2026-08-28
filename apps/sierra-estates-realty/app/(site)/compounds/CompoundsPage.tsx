'use client';

/** Port of deploy/compounds.html. */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search, RotateCcw, Compass } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { motionTokens } from '@/lib/site/motionTokens';
import type { MapCompound } from '@/components/site/CompoundsMap';

const CompoundsMap = dynamic(() => import('@/components/site/CompoundsMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 460, color: 'var(--muted)', fontSize: 13 }}>
      Loading map…
    </div>
  ),
});

const TYPES = ['all', 'Apartment', 'Villa', 'Townhouse', 'Twin House'];
const BEDS = [0, 1, 2, 3, 4, 5];

export default function CompoundsPage() {
  const { t, isAr } = useSite();
  const reduce = useReducedMotion();
  const all = HZDATA.compounds as MapCompound[];
  const featured = HZDATA.featured as string[];
  const imgs = HZDATA.compoundImgs as Record<string, string>;

  const [q, setQ] = useState('');
  const [zone, setZone] = useState('all');
  const [type, setType] = useState('all');
  const [beds, setBeds] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const zones = useMemo(
    () => ['all', ...Array.from(new Set(all.map((c) => c.z)))],
    [all]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((c) => {
      if (needle && !c.n.toLowerCase().includes(needle)) return false;
      if (zone !== 'all' && c.z !== zone) return false;
      return true;
    });
  }, [all, q, zone]);

  const units = useMemo(() => {
    if (!selected) return [];
    const list: any[] = (HZDATA as any).unitsFor?.(selected) || [];
    return list.filter((u) => {
      if (type !== 'all' && u.type !== type) return false;
      if (beds && u.beds < beds) return false;
      return true;
    });
  }, [selected, type, beds]);

  function reset() {
    setQ(''); setZone('all'); setType('all'); setBeds(0); setSelected(null);
  }

  return (
    <SiteShell active="cpds">
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <span>{t('navCpds')}</span>
          </div>
          <h1>{t('cpdsTit')}</h1>
          <p className="sub">{t('cpdsSub')}</p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          {/* Filter bar */}
          <div className="af-bar rv" id="af-bar">
            <div className="af-search">
              <Search className="i" />
              <input
                type="text"
                id="cpd-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchCpdPh')}
              />
              {q && (
                <button className="cs-clear" type="button" aria-label="Clear" onClick={() => setQ('')}>×</button>
              )}
            </div>

            <div className="af-group">
              <span className="af-label">{t('afType')}</span>
              <div className="af-chips" id="af-type">
                {TYPES.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    className={`af-chip${type === tp ? ' on' : ''}`}
                    onClick={() => setType(tp)}
                  >
                    {tp === 'all' ? (isAr ? 'الكل' : 'All') : tp}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{t('afBeds')}</span>
              <div className="af-chips" id="af-beds">
                {BEDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`af-chip${beds === b ? ' on' : ''}`}
                    onClick={() => setBeds(b)}
                  >
                    {b === 0 ? (isAr ? 'الكل' : 'Any') : `${b}+`}
                  </button>
                ))}
              </div>
            </div>

            <button className="af-clear" type="button" onClick={reset}>
              <RotateCcw style={{ width: 14, height: 14 }} /> {isAr ? 'إعادة ضبط' : 'Reset'}
            </button>

            <span className="af-count">
              <b>{filtered.length}</b> {isAr ? 'كمبوند' : 'compounds'}
            </span>
          </div>

          {/* Zone & Yield chips */}
          <div className="zone-chips" id="zone-chips">
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                className={`af-chip${zone === z ? ' on' : ''}`}
                onClick={() => setZone(z)}
              >
                {z === 'all' ? (isAr ? 'كل المناطق' : 'All zones') : z}
              </button>
            ))}
            <span style={{ borderLeft: '1px solid var(--line)', margin: '0 4px' }} />
            <button
              type="button"
              className="af-chip"
              style={{ color: '#34D399' }}
              onClick={() => {}}
            >
              💎 {isAr ? 'عائد استثماري مرتفع (>8%)' : 'High Yield (>8%)'}
            </button>
            <button
              type="button"
              className="af-chip"
              style={{ color: '#FCD34D' }}
              onClick={() => {}}
            >
              📈 {isAr ? 'نمو رأسمالي سنوي (>20%)' : 'High Growth (>20%)'}
            </button>
          </div>

          {/* Luxury Amenity Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {[
              { id: 'golf', labelEn: '⛳ Golf Course', labelAr: '⛳ ملاعب جولف' },
              { id: 'school', labelEn: '🏫 Int. School', labelAr: '🏫 مدارس دولية' },
              { id: 'lagoon', labelEn: '🏊 Private Lagoon', labelAr: '🏊 لاجون خاص' },
              { id: 'club', labelEn: '🎾 Club House', labelAr: '🎾 نوادي رياضية' },
            ].map((amenity) => (
              <span
                key={amenity.id}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isAr ? amenity.labelAr : amenity.labelEn}
              </span>
            ))}
          </div>

          {/* Map + intel panel */}
          <div className="map-shell rv">
            <div id="cpd-map">
              <CompoundsMap
                compounds={filtered}
                featured={featured}
                selectedName={selected}
                onSelectAction={setSelected}
              />
            </div>
            <div className="intel" id="intel-panel">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected ?? '__hint__'}
                  initial={reduce ? false : { opacity: 0, y: motionTokens.distance.sm }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 1 } : { opacity: 0, y: -motionTokens.distance.sm }}
                  transition={{
                    duration: reduce ? 0 : motionTokens.duration.fast,
                    ease: motionTokens.easing.smooth,
                  }}
                >
                  {!selected ? (
                    <div className="hint" id="intel-hint">
                      <Compass className="i" />
                      <p>{t('mapHint')}</p>
                    </div>
                  ) : (
                    <div id="intel-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, marginBottom: 2 }}>{selected}</h3>
                          <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                            {units.length} {isAr ? 'وحدة متاحة' : 'units available'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCompareMode((prev) => !prev)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            background: compareMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: compareMode ? '#93c5fd' : '#cbd5e1',
                            border: '1px solid var(--line)',
                            cursor: 'pointer',
                          }}
                        >
                          ⚖️ {isAr ? 'مقارنة' : 'Compare'}
                        </button>
                      </div>

                      {/* Side-by-Side Comparison Box */}
                      {compareMode && (
                        <div
                          style={{
                            marginBottom: 12,
                            padding: 12,
                            borderRadius: 12,
                            background: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            fontSize: 11,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700 }}>
                            <span style={{ color: '#93c5fd' }}>{selected}</span>
                            <span style={{ color: '#fca5a5' }}>vs Hyde Park</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, textAlign: 'center' }}>
                            <div style={{ padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                              <span style={{ color: 'var(--muted)', fontSize: 10 }}>Avg Price/m²</span>
                              <div style={{ fontWeight: 700, color: '#93c5fd' }}>64.5K EGP</div>
                            </div>
                            <div style={{ padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                              <span style={{ color: 'var(--muted)', fontSize: 10 }}>Avg Price/m²</span>
                              <div style={{ fontWeight: 700, color: '#fca5a5' }}>58.2K EGP</div>
                            </div>
                            <div style={{ padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                              <span style={{ color: 'var(--muted)', fontSize: 10 }}>Rental Yield</span>
                              <div style={{ fontWeight: 700, color: '#34d399' }}>8.4%</div>
                            </div>
                            <div style={{ padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                              <span style={{ color: 'var(--muted)', fontSize: 10 }}>Rental Yield</span>
                              <div style={{ fontWeight: 700, color: '#34d399' }}>7.9%</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compound Investment Highlights Bar */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 6,
                          marginBottom: 12,
                          padding: 10,
                          borderRadius: 10,
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--line)',
                          fontSize: 11,
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>{isAr ? 'متوسط السعر/م²' : 'Avg Price/m²'}</span>
                          <strong style={{ color: 'var(--accent, #5FC9FF)', fontFamily: 'var(--mono)' }}>64,500 EGP</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>{isAr ? 'العائد التأجيري' : 'Net Yield'}</span>
                          <strong style={{ color: '#34D399', fontFamily: 'var(--mono)' }}>8.4%</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 10 }}>{isAr ? 'النمو السنوي' : 'YoY Growth'}</span>
                          <strong style={{ color: '#FCD34D', fontFamily: 'var(--mono)' }}>+24%</strong>
                        </div>
                      </div>

                      {/* 12-Month Price Trend SVG Micro-Sparkline */}
                      <div
                        style={{
                          marginBottom: 12,
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: 'rgba(2, 6, 23, 0.4)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>
                            {isAr ? 'منحنى السعر (12 شهر)' : '12M Price Trajectory'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', fontFamily: 'var(--mono)' }}>
                            ↗ +24.8% EGP/m²
                          </span>
                        </div>
                        <svg width="100" height="24" viewBox="0 0 100 24" fill="none">
                          <path
                            d="M0 20 L20 17 L40 18 L60 12 L80 14 L100 4"
                            stroke="#34D399"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M0 20 L20 17 L40 18 L60 12 L80 14 L100 4 L100 24 L0 24 Z"
                            fill="rgba(52, 211, 153, 0.15)"
                          />
                        </svg>
                      </div>

                      {/* Master Plan Zones & Phases */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                          {isAr ? 'مخطط المراحل والأحياء' : 'Master Plan Phases & Zones'}
                        </span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {['Phase 1 (Delivered)', 'Park Residences', 'Lagoon Quarter', 'Clubhouse Villas'].map((phase, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: idx === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: idx === 0 ? '#93c5fd' : '#cbd5e1',
                                border: '1px solid var(--line)',
                                fontFamily: 'var(--mono)',
                              }}
                            >
                              {phase}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {units.slice(0, 12).map((u) => (
                          <div
                            key={u.code}
                            style={{
                              display: 'flex', justifyContent: 'space-between', gap: 10,
                              padding: '10px 12px', borderRadius: 10,
                              border: '1px solid var(--line)', background: 'var(--surface-2, var(--bg))',
                              fontSize: 12.5,
                            }}
                          >
                            <span>
                              <b style={{ fontFamily: 'var(--mono)' }}>{u.code}</b>
                              <span style={{ color: 'var(--muted)' }}> · {u.type} · {u.beds}🛏 · {u.area} m²</span>
                            </span>
                            <b>{u.mode === 'rent' ? `$${u.usd?.toLocaleString?.() ?? u.usd}/mo` : `EGP ${u.egpM}M`}</b>
                          </div>
                        ))}
                        {!units.length && (
                          <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                            {isAr ? 'لا توجد وحدات مطابقة للفلاتر.' : 'No units match the current filters.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Compound cards */}
          <Reveal className="sec-head">
            <div>
              <h2>{t('cpdTit')}</h2>
              <p>{t('cpdSub')}</p>
            </div>
          </Reveal>

          <div className="grid-comp">
            {filtered.map((c, i) => (
              <button
                key={c.n}
                type="button"
                className={`comp rv d${(i % 4) + 1} ${selected === c.n ? 'is-active' : ''}`}
                onClick={() => {
                  setSelected(c.n);
                  document.getElementById('cpd-map')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                style={{ border: 0, padding: 0, cursor: 'pointer', textAlign: 'start' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgs[c.n] || imgs['Mivida']} alt={c.n} loading="lazy" />
                <div className="co-scrim" />
                <div className="co-count">AI {c.ai.toFixed(1)} · {c.g}</div>
                <div className="co-body">
                  <h4>{c.n}</h4>
                  <span>{c.z} · EGP {c.priceM}M avg</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
