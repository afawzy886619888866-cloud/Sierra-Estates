'use client';
/**
 * Inventory OS — analytics: compound value matrix, DQ distribution,
 * type / offer mix and delivery pipeline. Pure CSS bars on clay tokens,
 * computed client-side from the v_inventory_os feed.
 */
import React, { useMemo } from 'react';
import { TYPE_LABEL, norm, fmtM } from './shared';

type UnitRow = Record<string, any>;

const BAR_COLORS = [
  'var(--gold-luxury,#D4AF37)', 'var(--gold-lt,#E9C176)', 'var(--emerald,#34D399)',
  'var(--purple,#A78BFA)', 'var(--amber,#F59E0B)', 'var(--gold-champagne,#F5D76E)',
  'var(--blue,#1E88D9)', '#F472B6',
];

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card fade-up" style={{ padding: '16px 18px' }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{title}</h3>
      {sub && <p style={{ margin: '3px 0 12px', fontSize: 11.5, opacity: 0.6 }}>{sub}</p>}
      {children}
    </div>
  );
}

export function OsAnalytics({ units, isAr, t, onOpen }: {
  units: UnitRow[];
  isAr: boolean;
  t: (en: string, ar: string) => string;
  onOpen: (id: string) => void;
}) {
  const data = useMemo(() => {
    // compound matrix
    const byCompound = new Map<string, { value: number; units: number; perSqm: number[]; live: number; ids: string[] }>();
    const byType = new Map<string, number>();
    const byDelivery = new Map<string, number>();
    const dq = { critical: 0, weak: 0, fair: 0, good: 0, excellent: 0 };
    for (const u of units) {
      const c = u.projectName || u.compound || '—';
      const e = byCompound.get(c) ?? { value: 0, units: 0, perSqm: [], live: 0, ids: [] };
      e.value += Number(u.price ?? 0);
      e.units += 1;
      e.ids.push(String(u.id));
      if (norm(u.status) === 'published') e.live += 1;
      if (Number(u.pricePerSqm) > 0) e.perSqm.push(Number(u.pricePerSqm));
      byCompound.set(c, e);

      byType.set(String(u.propertyType ?? 'other'), (byType.get(String(u.propertyType ?? 'other')) ?? 0) + 1);
      const yr = u.deliveryYear ? String(u.deliveryYear) : t('TBD', 'غير محدد');
      byDelivery.set(yr, (byDelivery.get(yr) ?? 0) + 1);

      const score = Math.round(Number(u.dqComputed ?? u.dataQualityScore ?? 0));
      if (score >= 85) dq.excellent += 1;
      else if (score >= 70) dq.good += 1;
      else if (score >= 55) dq.fair += 1;
      else if (score >= 40) dq.weak += 1;
      else dq.critical += 1;
    }
    const compounds = [...byCompound.entries()]
      .map(([name, e]) => ({ name, ...e, avgPerSqm: e.perSqm.length ? Math.round(e.perSqm.reduce((s, x) => s + x, 0) / e.perSqm.length) : 0 }))
      .sort((a, b) => b.value - a.value);
    return { compounds, byType: [...byType.entries()].sort((a, b) => b[1] - a[1]), byDelivery: [...byDelivery.entries()].sort(), dq };
  }, [units, t]);

  const maxVal = Math.max(1, ...data.compounds.map((c) => c.value));
  const totalUnits = Math.max(1, units.length);
  const saleCount = units.filter((u) => (u.offerType ?? 'sale') === 'sale').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
      {/* compound value matrix */}
      <Panel
        title={t('🏢 Compound Value Matrix', '🏢 مصفوفة قيمة الكمبوندات')}
        sub={t('Portfolio value by compound — click a row to open its top unit', 'قيمة المحفظة لكل كمبوند — انقر صفًا لفتح أفضل وحدة')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.compounds.slice(0, 9).map((c, i) => (
            <button
              key={c.name} onClick={() => onOpen(c.ids[0])}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(90px, 150px) 1fr auto', gap: 10, alignItems: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'start', padding: 0, color: 'inherit',
              }}
              title={t('Open top unit', 'فتح الوحدة')}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {String(i + 1).padStart(2, '0')} {c.name}
              </span>
              <span style={{ height: 14, borderRadius: 7, background: 'var(--surf2)', overflow: 'hidden', position: 'relative' }}>
                <span style={{
                  position: 'absolute', inset: 0, width: `${(c.value / maxVal) * 100}%`,
                  background: `linear-gradient(90deg, ${BAR_COLORS[i % BAR_COLORS.length]}, ${BAR_COLORS[i % BAR_COLORS.length]}66)`,
                  borderRadius: 7,
                }} />
              </span>
              <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', textAlign: 'end', whiteSpace: 'nowrap' }}>
                <strong>{fmtM(c.value)}</strong>
                <span style={{ opacity: 0.55 }}> · {c.units}u · {c.avgPerSqm ? `${(c.avgPerSqm / 1000).toFixed(0)}k/m²` : '—'}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>

      {/* DQ distribution */}
      <Panel
        title={t('🛡️ Data Quality Distribution', '🛡️ توزيع جودة البيانات')}
        sub={t('DQ-aware inventory: critical units are hidden from Best Units until fixed', 'الوحدات الحرجة تُستثنى من «أفضل الوحدات» حتى إصلاحها')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {([
            ['excellent', '85–100', 'var(--emerald)', t('Excellent', 'ممتازة')],
            ['good', '70–84', 'var(--gold-luxury)', t('Good', 'جيدة')],
            ['fair', '55–69', 'var(--gold-lt)', t('Fair', 'مقبولة')],
            ['weak', '40–54', 'var(--amber)', t('Weak', 'ضعيفة')],
            ['critical', '0–39', 'var(--red)', t('Critical', 'حرجة')],
          ] as const).map(([k, range, color, label]) => {
            const v = data.dq[k];
            return (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '92px 54px 1fr 40px', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
                <span style={{ fontSize: 10, opacity: 0.55, fontVariantNumeric: 'tabular-nums' }}>{range}</span>
                <span style={{ height: 12, borderRadius: 6, background: 'var(--surf2)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${(v / totalUnits) * 100}%`, background: color, borderRadius: 6 }} />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* type mix + offer split */}
      <Panel title={t('🏘️ Portfolio Mix', '🏘️ توزيع المحفظة')} sub={t('Units by property type and offer', 'الوحدات حسب النوع والعرض')}>
        <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          {data.byType.map(([k, v], i) => (
            <span key={k} title={`${isAr ? (TYPE_LABEL[k]?.ar ?? k) : (TYPE_LABEL[k]?.en ?? k)}: ${v}`} style={{
              width: `${(v / totalUnits) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length],
              borderInlineEnd: '2px solid var(--bg-s)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {data.byType.map(([k, v], i) => (
            <span key={k} className="chip" style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: BAR_COLORS[i % BAR_COLORS.length] }} />
              {isAr ? (TYPE_LABEL[k]?.ar ?? k) : (TYPE_LABEL[k]?.en ?? k)} · {v}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--surf2)', padding: '8px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-f)' }}>{t('For Sale', 'للبيع')}</div>
            <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{saleCount}</div>
          </div>
          <div style={{ borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--surf2)', padding: '8px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-f)' }}>{t('For Rent', 'للإيجار')}</div>
            <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{units.length - saleCount}</div>
          </div>
        </div>
      </Panel>

      {/* delivery pipeline */}
      <Panel title={t('📅 Delivery Pipeline', '📅 خط التسليم')} sub={t('Units by handover year', 'الوحدات حسب سنة التسليم')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.byDelivery.map(([yr, v]) => {
            const max = Math.max(...data.byDelivery.map(([, x]) => x));
            return (
              <div key={yr} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 34px', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{yr}</span>
                <span style={{ height: 12, borderRadius: 6, background: 'var(--surf2)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${(v / max) * 100}%`, background: 'linear-gradient(90deg, var(--gold-lt), var(--gold-luxury))', borderRadius: 6 }} />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
