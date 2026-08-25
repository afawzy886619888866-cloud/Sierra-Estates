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

          {/* Zone chips */}
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
                      <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, marginBottom: 4 }}>{selected}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 12 }}>
                        {units.length} {isAr ? 'وحدة متاحة' : 'units available'}
                      </p>
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
                onClick={() => setSelected(c.n)}
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
