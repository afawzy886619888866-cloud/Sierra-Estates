'use client';
/**
 * Sierra Estates — Inventory portal.
 * Split list + live Leaflet map driven by the owner-inventory Google Sheet via
 * /api/inventory. Filter by listing mode, availability, type and location; the
 * map and the list stay in sync with the current selection.
 *
 * The map is dynamically imported (ssr:false) because Leaflet needs `window`.
 */
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Nav, Topbar, Footer, Reveal, SierraConcierge, useT } from './ui';
import { IconSearch, IconMouseClick, IconMapPin } from './icons';
import type { InventoryResponse, InventoryStatus, InventoryUnit } from '@/lib/inventory/types';

const InventoryMap = dynamic(() => import('@/components/client/InventoryMap'), {
  ssr: false,
  loading: () => <div className="mini-map" style={{ height: 560, borderRadius: 10, background: 'var(--soft,#f1f5f9)' }} />,
});

type ModeFilter = 'all' | 'rent' | 'sale';
type StatusFilter = 'all' | InventoryStatus;

const STATUS_CHIPS: [StatusFilter, string, string][] = [
  ['available', 'Available', '#16a34a'],
  ['follow_up', 'Follow up', '#d97706'],
  ['no_answer', 'Pending', '#64748b'],
  ['unavailable', 'Unavailable', '#9ca3af'],
];

export default function InventoryPortal() {
  const { locale } = useT();
  const isAr = locale === 'ar';

  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [statuses, setStatuses] = useState<Set<StatusFilter>>(new Set(['available']));
  const [location, setLocation] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/inventory', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: InventoryResponse) => {
        if (alive) setData(d);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const locations = useMemo(() => {
    const set = new Map<string, number>();
    (data?.units ?? []).forEach((u) => set.set(u.location, (set.get(u.location) ?? 0) + 1));
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.units ?? []).filter((u) => {
      if (mode !== 'all' && u.mode !== mode) return false;
      if (statuses.size && !statuses.has(u.status)) return false;
      if (location !== 'all' && u.location !== location) return false;
      if (q) {
        const hay = [u.location, u.propertyType, u.code, u.zone, u.furnished, u.comment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, query, mode, statuses, location]);

  const toggleStatus = (s: StatusFilter) =>
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const availableCount = useMemo(
    () => (data?.units ?? []).filter((u) => u.status === 'available').length,
    [data],
  );

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav active="inv" />

      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="sep">/</span>
            <span>{isAr ? 'المخزون' : 'Inventory'}</span>
          </div>
          <h1>{isAr ? 'خريطة المخزون' : 'Live Inventory Map'}</h1>
          <p className="sub">
            {isAr
              ? 'كل الوحدات المتاحة للإيجار والبيع في القاهرة الجديدة، على الخريطة مباشرة.'
              : 'Every rent & resale unit across New Cairo, plotted live on the map.'}
          </p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          {/* Toolbar */}
          <Reveal className="cpd-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="cpd-search">
              <IconSearch size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? 'ابحث بالكمبوند أو الكود…' : 'Search compound, code, type…'}
              />
            </div>

            <div className="zone-chips">
              {(['all', 'rent', 'sale'] as ModeFilter[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`zchip${mode === m ? ' on' : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m === 'all' ? (isAr ? 'الكل' : 'All') : m === 'rent' ? (isAr ? 'إيجار' : 'Rent') : (isAr ? 'بيع' : 'Sale')}
                </button>
              ))}
            </div>

            <div className="zone-chips">
              {STATUS_CHIPS.map(([s, label, color]) => (
                <button
                  key={s}
                  type="button"
                  className={`zchip${statuses.has(s) ? ' on' : ''}`}
                  onClick={() => toggleStatus(s)}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      marginInlineEnd: 6,
                    }}
                  />
                  {label}
                </button>
              ))}
            </div>

            <select
              className="zchip"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="all">{isAr ? 'كل المناطق' : 'All locations'}</option>
              {locations.map(([loc, n]) => (
                <option key={loc} value={loc}>
                  {loc} ({n})
                </option>
              ))}
            </select>
          </Reveal>

          {/* Status line */}
          <div style={{ margin: '10px 2px 18px', color: 'var(--muted)', fontSize: 13 }}>
            {loading
              ? isAr ? 'جارٍ التحميل…' : 'Loading inventory…'
              : error
                ? isAr ? 'تعذّر تحميل المخزون.' : 'Could not load inventory.'
                : (
                  <>
                    <b style={{ color: 'var(--ink)' }}>{filtered.length}</b>{' '}
                    {isAr ? 'وحدة معروضة' : 'units shown'} · {availableCount}{' '}
                    {isAr ? 'متاحة' : 'available'}
                    {data?.source === 'snapshot' && (
                      <span style={{ marginInlineStart: 8, opacity: 0.7 }}>
                        · {isAr ? 'نسخة مخزّنة' : 'cached snapshot'}
                      </span>
                    )}
                  </>
                )}
          </div>

          {/* Map + list */}
          <div
            className="map-shell"
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 24, alignItems: 'stretch' }}
          >
            <InventoryMap units={filtered} selectedId={selectedId} onSelect={(u) => setSelectedId(u.id)} />

            <aside
              className="intel"
              style={{ height: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {filtered.length === 0 && !loading ? (
                <div
                  className="hint"
                  style={{ margin: 'auto 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--muted)' }}
                >
                  <IconMouseClick size={26} />
                  <span>{isAr ? 'لا توجد وحدات مطابقة' : 'No units match these filters'}</span>
                </div>
              ) : (
                filtered.map((u) => (
                  <UnitRow
                    key={u.id}
                    u={u}
                    selected={u.id === selectedId}
                    onSelect={() => setSelectedId(u.id)}
                  />
                ))
              )}
            </aside>
          </div>
        </div>
      </section>

      <Footer />
      <SierraConcierge />
    </div>
  );
}

const STATUS_DOT: Record<InventoryStatus, string> = {
  available: '#16a34a',
  follow_up: '#d97706',
  no_answer: '#64748b',
  unavailable: '#9ca3af',
};

function UnitRow({ u, selected, onSelect }: { u: InventoryUnit; selected: boolean; onSelect: () => void }) {
  const facts = [u.beds ? `${u.beds} bd` : null, u.area ? `${u.area} m²` : null, u.propertyType]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      type="button"
      onClick={onSelect}
      className="cpd-card"
      style={{
        textAlign: 'start',
        cursor: 'pointer',
        outline: selected ? '2px solid var(--pri, #00aeff)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontSize: 15, color: 'var(--ink)' }}>{u.priceLabel}</b>
        <span
          style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: STATUS_DOT[u.status], whiteSpace: 'nowrap' }}
        >
          {u.statusLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 12.5, margin: '4px 0' }}>
        <IconMapPin size={13} />
        {u.location}
        <span style={{ marginInlineStart: 6, padding: '1px 6px', borderRadius: 6, background: 'var(--soft,#f1f5f9)', fontSize: 10.5, textTransform: 'uppercase' }}>
          {u.mode === 'rent' ? 'Rent' : 'Sale'}
        </span>
      </div>
      {facts && <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{facts}</div>}
      {u.code && (
        <div style={{ marginTop: 4, font: '600 11px/1 ui-monospace, monospace', color: 'var(--muted)' }}>{u.code}</div>
      )}
    </button>
  );
}
