'use client';
/* eslint-disable @next/next/no-img-element */
/**
 * Sierra Estates — 3D Explorer portal.
 *
 * Pairs the react-three-fiber compound city with the portal's filters: pick
 * sale vs rent, drag the max-price slider, and the scene re-renders with only
 * the compounds in budget. Selecting a tower reveals the units for that
 * compound, each linking through to its own property page.
 *
 * The Canvas is dynamically imported (ssr:false) — three.js needs `window`,
 * and this keeps the ~600KB 3D bundle off every other route.
 */
import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Nav, Topbar, Footer, Reveal, SierraConcierge, useT } from './ui';
import { IconMapPin, IconSearch } from './icons';
import { COMPOUNDS, FALLBACK_LISTINGS, priceLabel, type Compound } from './portalData';
import type { PriceMode } from './three/CompoundCity3D';
import { priceOf, priceText } from './three/CompoundCity3D';

const CompoundCity3D = dynamic(() => import('./three/CompoundCity3D'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 560,
        borderRadius: 10,
        background: 'linear-gradient(180deg,#0d1a29,#060c14)',
        display: 'grid',
        placeItems: 'center',
        color: '#8aa4c0',
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      Loading 3D map…
    </div>
  ),
});

/** Ceiling for each slider, derived from the dataset so it never clips a compound. */
function ceilingFor(mode: PriceMode): number {
  return Math.max(...COMPOUNDS.map((c) => priceOf(c, mode)));
}

export default function ExplorePortal() {
  const { locale } = useT();
  const isAr = locale === 'ar';

  const [mode, setMode] = useState<PriceMode>('sale');
  const [maxPrice, setMaxPrice] = useState<number>(() => ceilingFor('sale'));
  const [zone, setZone] = useState('all');
  const [selected, setSelected] = useState<Compound | null>(null);

  const ceiling = useMemo(() => ceilingFor(mode), [mode]);

  const zones = useMemo(
    () => ['all', ...Array.from(new Set(COMPOUNDS.map((c) => c.z))).sort()],
    []
  );

  // Switching sale/rent resets the slider to that mode's ceiling — otherwise a
  // sale-scale value (35) would filter out every rental (1300+).
  const switchMode = (next: PriceMode) => {
    setMode(next);
    setMaxPrice(ceilingFor(next));
    setSelected(null);
  };

  const visible = useMemo(
    () =>
      COMPOUNDS.filter(
        (c) => priceOf(c, mode) <= maxPrice && (zone === 'all' || c.z === zone)
      ),
    [mode, maxPrice, zone]
  );

  // Units for the selected compound. Local listings are matched loosely because
  // listing.cmp uses short names ("Hyde Park") vs compound.n ("Hyde Park New Cairo").
  const units = useMemo(() => {
    if (!selected) return [];
    const base = selected.n.split(' (')[0];
    return FALLBACK_LISTINGS.filter(
      (l) =>
        l.mode === mode &&
        (l.cmp === selected.n || base.startsWith(l.cmp) || l.cmp.startsWith(base))
    );
  }, [selected, mode]);

  const priceUnitLabel =
    mode === 'sale' ? (isAr ? 'مليون جنيه' : 'EGP M') : isAr ? 'دولار/شهر' : 'USD/mo';

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav active="explore" />

      <main className="explore-main">
        <section className="wrap" style={{ paddingTop: 28, paddingBottom: 12 }}>
          <Reveal>
            <span className="eyebrow">
              {isAr ? 'مستكشف ثلاثي الأبعاد' : '3D compound explorer'}
            </span>
            <h1 style={{ margin: '8px 0 6px' }}>
              {isAr ? 'استكشف القاهرة الجديدة بالسعر' : 'Explore New Cairo by price'}
            </h1>
            <p className="sub" style={{ maxWidth: 720 }}>
              {isAr
                ? 'كل برج هو كمبوند — ارتفاعه ولونه يعكسان السعر. اسحب للتدوير، واضغط على أي برج لعرض وحداته.'
                : 'Every tower is a compound — its height and colour track the price. Drag to orbit, click a tower to see its units.'}
            </p>
          </Reveal>
        </section>

        {/* Filters */}
        <section className="wrap explore-controls">
          <div className="seg" role="group" aria-label="Listing mode">
            <button
              type="button"
              className={mode === 'sale' ? 'on' : ''}
              onClick={() => switchMode('sale')}
            >
              {isAr ? 'بيع' : 'Resale'}
            </button>
            <button
              type="button"
              className={mode === 'rent' ? 'on' : ''}
              onClick={() => switchMode('rent')}
            >
              {isAr ? 'إيجار' : 'Rent'}
            </button>
          </div>

          <label className="explore-slider">
            <span>
              {isAr ? 'أقصى سعر' : 'Max price'}:{' '}
              <b>
                {mode === 'sale'
                  ? `EGP ${maxPrice}M`
                  : `$${Math.round(maxPrice).toLocaleString('en-US')}`}
              </b>{' '}
              <small>{priceUnitLabel}</small>
            </span>
            <input
              type="range"
              min={Math.min(...COMPOUNDS.map((c) => priceOf(c, mode)))}
              max={ceiling}
              step={mode === 'sale' ? 0.5 : 100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Maximum price"
            />
          </label>

          <label className="explore-zone">
            <span>{isAr ? 'المنطقة' : 'Zone'}</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z === 'all' ? (isAr ? 'كل المناطق' : 'All zones') : z}
                </option>
              ))}
            </select>
          </label>

          <span className="explore-count">
            <IconMapPin size={14} /> {visible.length}{' '}
            {isAr ? 'كمبوند' : visible.length === 1 ? 'compound' : 'compounds'}
          </span>
        </section>

        {/* 3D scene + detail rail */}
        <section className="wrap explore-grid">
          <div className="explore-canvas">
            {visible.length === 0 ? (
              <div className="explore-empty">
                <IconSearch size={22} />
                <p>
                  {isAr
                    ? 'لا توجد كمبوندات ضمن هذا السعر — ارفع الحد الأقصى.'
                    : 'No compounds in this budget — raise the max price.'}
                </p>
              </div>
            ) : (
              <CompoundCity3D
                compounds={visible}
                mode={mode}
                selected={selected}
                onSelect={setSelected}
              />
            )}
          </div>

          <aside className="explore-rail">
            {!selected ? (
              <div className="explore-hint">
                <h3>{isAr ? 'اختر كمبوند' : 'Pick a compound'}</h3>
                <p>
                  {isAr
                    ? 'اضغط على أي برج في الخريطة لعرض وحداته وأسعارها.'
                    : 'Click any tower on the map to list its units and prices.'}
                </p>
                <ul className="explore-legend">
                  <li>
                    <i style={{ background: 'linear-gradient(135deg,#e9c176,#c8961a)' }} />
                    {isAr ? 'الأعلى سعرًا' : 'Highest priced'}
                  </li>
                  <li>
                    <i style={{ background: '#16324f' }} />
                    {isAr ? 'الأقل سعرًا' : 'Lowest priced'}
                  </li>
                </ul>
              </div>
            ) : (
              <div className="explore-detail">
                <h3>{selected.n}</h3>
                <p className="explore-zone-tag">
                  <IconMapPin size={13} /> {selected.z}
                </p>

                <div className="explore-stats">
                  <div>
                    <small>{isAr ? 'السعر' : 'Price'}</small>
                    <b>{priceText(selected, mode)}</b>
                  </div>
                  <div>
                    <small>{isAr ? 'النمو' : 'Growth'}</small>
                    <b>{selected.g}</b>
                  </div>
                  <div>
                    <small>{isAr ? 'تقييم AI' : 'AI score'}</small>
                    <b>{selected.ai}</b>
                  </div>
                </div>

                <h4>
                  {isAr ? 'الوحدات المتاحة' : 'Available units'}{' '}
                  <span>({units.length})</span>
                </h4>

                {units.length === 0 ? (
                  <p className="explore-none">
                    {isAr
                      ? 'لا توجد وحدات مدرجة حاليًا لهذا الكمبوند بهذا النوع.'
                      : 'No units listed for this compound in this mode yet.'}
                  </p>
                ) : (
                  <ul className="explore-units">
                    {units.map((u) => (
                      <li key={u.id}>
                        <Link href={`/property/${u.id}`}>
                          <img src={u.img} alt={`${u.type} in ${u.cmp}`} loading="lazy" />
                          <div>
                            <b>
                              {u.type} · {u.beds}
                              {isAr ? ' غرف' : ' bd'}
                            </b>
                            <small>
                              {u.area} m² · {u.code}
                            </small>
                            <span className="explore-price">{priceLabel(u)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="explore-actions">
                  <Link className="btn btn-pri" href="/properties">
                    {isAr ? 'كل الوحدات' : 'All units'}
                  </Link>
                  <Link className="btn btn-ghost" href="/compounds">
                    {isAr ? 'تفاصيل الكمبوند' : 'Compound detail'}
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <SierraConcierge />
      <Footer />
    </div>
  );
}
