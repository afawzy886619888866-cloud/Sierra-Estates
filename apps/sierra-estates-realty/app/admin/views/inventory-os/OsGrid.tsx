'use client';
/**
 * Inventory OS — smart grid: fuzzy search, multi-filter, sortable columns,
 * CSV export, pagination. Rows open the unit drawer. Clay tokens.
 */
import React, { useMemo, useState } from 'react';
import { exportCSV } from '../admin-shared';
import { STAGE_META, TYPE_LABEL, norm, daysLeft, fmtM } from './shared';

type UnitRow = Record<string, any>;

export function OsGrid({ units, isAr, t, onOpen, loading }: {
  units: UnitRow[];
  isAr: boolean;
  t: (en: string, ar: string) => string;
  onOpen: (id: string) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [compound, setCompound] = useState('all');
  const [type, setType] = useState('all');
  const [offer, setOffer] = useState('all');
  const [sort, setSort] = useState<'price' | 'areaSqm' | 'pricePerSqm' | 'daysOnMarket' | 'dq'>('price');
  const [dir, setDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const PER = 25;

  const compounds = useMemo(
    () => Array.from(new Set(units.map((u) => u.projectName || u.compound).filter(Boolean))).sort(),
    [units]
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = units.filter((u) => {
      if (status !== 'all' && norm(u.status) !== status) return false;
      if (compound !== 'all' && (u.projectName || u.compound) !== compound) return false;
      if (type !== 'all' && (u.propertyType ?? '') !== type) return false;
      if (offer !== 'all' && (u.offerType ?? 'sale') !== offer) return false;
      if (!needle) return true;
      const hay = [
        u.unitCode, u.code, u.projectName, u.compound, u.developerName, u.developer,
        u.propertyType, u.zone, u.locationArea, u.title, u.status,
      ].map((x) => String(x ?? '').toLowerCase()).join(' ');
      return hay.includes(needle);
    });
    const key = (u: UnitRow) =>
      sort === 'price' ? Number(u.price ?? 0)
      : sort === 'areaSqm' ? Number(u.areaSqm ?? 0)
      : sort === 'pricePerSqm' ? Number(u.pricePerSqm ?? 0)
      : sort === 'daysOnMarket' ? Number(u.daysOnMarket ?? 0)
      : Number(u.dqComputed ?? u.dataQualityScore ?? 0);
    list = [...list].sort((a, b) => (key(a) - key(b)) * dir);
    return list;
  }, [units, q, status, compound, type, offer, sort, dir]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const pageRows = rows.slice(page * PER, page * PER + PER);

  const th = (label: string, key?: 'price' | 'areaSqm' | 'pricePerSqm' | 'daysOnMarket' | 'dq', w?: number) => (
    <th
      key={label}
      style={{
        padding: '9px 12px', cursor: key ? 'pointer' : 'default', whiteSpace: 'nowrap',
        color: key && sort === key ? 'var(--gold-champagne,#F5D76E)' : 'inherit', width: w,
      }}
      onClick={key ? () => { if (sort === key) setDir((d) => (d === 1 ? -1 : 1)); else { setSort(key); setDir(-1) } } : undefined}
    >
      {label}{key && sort === key ? (dir === -1 ? ' ▾' : ' ▴') : ''}
    </th>
  );

  const sel = (value: string, set: (v: string) => void, options: { v: string; l: string }[]) => (
    <select
      value={value} onChange={(e) => { set(e.target.value); setPage(0) }}
      className="chip" style={{
        cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 9,
        border: '1px solid var(--bd)', background: 'var(--surf2)', color: 'var(--tx)',
      }}
    >
      {options.map((o) => <option key={o.v} value={o.v} style={{ background: 'var(--bg-s)' }}>{o.l}</option>)}
    </select>
  );

  return (
    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* filter bar */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: '1 1 220px', minWidth: 160, display: 'flex', alignItems: 'center', gap: 8,
          borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--surf2)', padding: '7px 10px',
        }}>
          <span style={{ opacity: 0.55, fontSize: 13 }}>⌕</span>
          <input
            value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }}
            placeholder={t('Search code, compound, developer, zone…', 'ابحث بالكود أو الكمبوند أو المطور…')}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--tx)', fontSize: 12.5, minWidth: 0 }}
          />
          {q && <button onClick={() => setQ('')} style={{ border: 'none', background: 'none', color: 'var(--tx-f)', cursor: 'pointer', fontSize: 12 }}>✕</button>}
        </div>
        {sel(status, setStatus, [
          { v: 'all', l: t('All statuses', 'كل الحالات') },
          ...Object.keys(STAGE_META).map((k) => ({ v: k, l: isAr ? STAGE_META[k].ar : STAGE_META[k].en })),
        ])}
        {sel(compound, setCompound, [{ v: 'all', l: t('All compounds', 'كل الكمبوندات') }, ...compounds.map((c) => ({ v: c, l: c }))])}
        {sel(type, setType, [
          { v: 'all', l: t('All types', 'كل الأنواع') },
          ...Object.keys(TYPE_LABEL).map((k) => ({ v: k, l: isAr ? TYPE_LABEL[k].ar : TYPE_LABEL[k].en })),
        ])}
        {sel(offer, setOffer, [
          { v: 'all', l: t('Sale + Rent', 'بيع + إيجار') },
          { v: 'sale', l: t('Sale', 'بيع') },
          { v: 'rent', l: t('Rent', 'إيجار') },
        ])}
        <span style={{ fontSize: 11, color: 'var(--tx-f)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {rows.length} / {units.length} {t('units', 'وحدة')}
        </span>
        <button
          className="chip" style={{ cursor: 'pointer', fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 9, borderColor: 'color-mix(in srgb, var(--gold-luxury) 45%, transparent)', color: 'var(--gold-champagne)' }}
          onClick={() => exportCSV(
            rows.map((u) => ({
              unit_code: u.unitCode ?? u.code ?? '', compound: u.projectName ?? u.compound ?? '',
              developer: u.developerName ?? u.developer ?? '', type: u.propertyType ?? '',
              offer: u.offerType ?? 'sale', bedrooms: u.bedrooms ?? 0, area_sqm: u.areaSqm ?? 0,
              price_egp: u.price ?? 0, egp_per_sqm: u.pricePerSqm ?? 0, status: norm(u.status),
              dq: u.dqComputed ?? u.dataQualityScore ?? 0, days_live: u.daysOnMarket ?? 0,
            })),
            `sierra-inventory-${new Date().toISOString().slice(0, 10)}.csv`
          )}
        >⤓ CSV</button>
      </div>

      {/* table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>{t('Loading inventory…', 'جارٍ تحميل المخزون…')}</div>
      ) : pageRows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>
          {t('No units match these filters.', 'لا توجد وحدات مطابقة.')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 940 }}>
            <thead>
              <tr style={{ textAlign: 'start', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>
                {th(t('Unit', 'الوحدة'))}
                {th(t('Compound', 'الكمبوند'))}
                {th(t('Specs', 'المواصفات'))}
                {th(t('Price', 'السعر'), 'price')}
                {th('EGP/m²', 'pricePerSqm')}
                {th(t('Area', 'المساحة'), 'areaSqm')}
                {th('DQ', 'dq')}
                {th(t('Live', 'معروض'), 'daysOnMarket')}
                {th(t('Status', 'الحالة'))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => {
                const id = String(u.id);
                const st = norm(u.status);
                const m = STAGE_META[st] ?? STAGE_META.draft;
                const dl = daysLeft(u.reservedUntil);
                const dq = Number(u.dqComputed ?? u.dataQualityScore ?? 0);
                return (
                  <tr
                    key={id} onClick={() => onOpen(id)}
                    style={{ borderTop: '1px solid var(--bd)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surf2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--gold-champagne,#F5D76E)', whiteSpace: 'nowrap' }}>
                      {u.unitCode || u.code || id.slice(0, 8)}
                      {u.stale ? <span title={t('Freshness SLA breached', 'تجاوز مهلة التحديث')} style={{ marginInlineStart: 6, color: 'var(--amber)', fontSize: 10 }}>⚠</span> : null}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{u.projectName || u.compound || '—'}</div>
                      <div style={{ fontSize: 10.5, opacity: 0.55 }}>{u.developerName || u.developer || ''}{u.zone ? ` · ${u.zone}` : ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px', opacity: 0.85, whiteSpace: 'nowrap' }}>
                      {isAr ? (TYPE_LABEL[u.propertyType]?.ar ?? u.propertyType) : (TYPE_LABEL[u.propertyType]?.en ?? u.propertyType)}
                      {' · '}{u.bedrooms ?? 0}BR{' · '}{Math.round(Number(u.areaSqm ?? 0))}m²
                      <div style={{ fontSize: 10.5, opacity: 0.55 }}>{u.finishingType ? (isAr ? 'تشطيب' : 'finish') + ': ' + String(u.finishingType).replace(/_/g, ' ') : ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {u.offerType === 'rent' ? `${fmtM(u.price)}/${u.priceCurrency === 'USD' ? 'yr' : t('mo', 'ش')}` : fmtM(u.price)}
                    </td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
                      {u.pricePerSqm ? Math.round(Number(u.pricePerSqm)).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{Math.round(Number(u.areaSqm ?? 0))}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 42, height: 5, borderRadius: 99, background: 'var(--surf2)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${dq}%`, height: '100%',
                            background: dq >= 80 ? 'var(--emerald)' : dq >= 60 ? 'var(--gold-luxury)' : dq >= 40 ? 'var(--amber)' : 'var(--red)',
                          }} />
                        </div>
                        <span style={{ fontSize: 10.5, fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{dq}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {st === 'reserved' && dl !== null ? (
                        <span style={{ fontWeight: 800, color: dl <= 5 ? 'var(--red,#E63946)' : 'var(--gold-champagne,#F5D76E)' }}>{dl}d {t('left', 'متبقٍ')}</span>
                      ) : (
                        <span style={{ opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>{u.daysOnMarket ?? 0}d</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', padding: '3px 9px', borderRadius: 99,
                        color: m.color, border: `1px solid color-mix(in srgb, ${m.color} 45%, transparent)`,
                        background: `color-mix(in srgb, ${m.color} 10%, transparent)`,
                      }}>{isAr ? m.ar : m.en}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--bd)', fontSize: 12 }}>
          <button className="chip" style={{ cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--tx-m)' }}>{page + 1} / {pages}</span>
          <button className="chip" style={{ cursor: page >= pages - 1 ? 'default' : 'pointer', opacity: page >= pages - 1 ? 0.4 : 1 }} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>›</button>
        </div>
      )}
    </div>
  );
}
