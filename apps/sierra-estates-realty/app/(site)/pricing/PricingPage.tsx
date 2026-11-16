'use client';

/** Port of deploy/pricing.html — the AVM pricing engine. */
import React, { useMemo, useState } from 'react';
import AiToolPage from '@/components/site/AiToolPage';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

const TYPE_MULT: Record<string, number> = {
  Apartment: 0.32, Duplex: 0.5, 'Twin House': 0.62,
  Townhouse: 0.55, Penthouse: 0.75, Villa: 1,
};
const FINISH_MULT: Record<string, number> = {
  'Core & shell': 0.88, 'Semi-finished': 0.95, 'Fully finished': 1, Furnished: 1.07,
};

export default function PricingPage() {
  const { isAr } = useSite();
  const compounds = HZDATA.compounds as any[];

  const [compound, setCompound] = useState(compounds[0]?.n ?? '');
  const [type, setType] = useState('Apartment');
  const [area, setArea] = useState(180);
  const [finish, setFinish] = useState('Fully finished');

  const estimate = useMemo(() => {
    const c = compounds.find((x) => x.n === compound);
    if (!c) return null;
    const base = c.priceM * (TYPE_MULT[type] ?? 0.4) * (FINISH_MULT[finish] ?? 1);
    // Area scales against a nominal 200 m² reference for the type.
    const scaled = base * (area / 200);
    const low = scaled * 0.92;
    const high = scaled * 1.11;
    const perM = (scaled * 1_000_000) / Math.max(area, 1);
    return { mid: scaled, low, high, perM, ai: c.ai, zone: c.z };
  }, [compounds, compound, type, area, finish]);

  return (
    <AiToolPage
      crumb={isAr ? 'محرك التسعير' : 'AVM Pricing'}
      title={isAr ? 'محرك التسعير الآلي' : 'AVM Pricing Engine'}
      sub={
        isAr
          ? 'قدّر قيمة وحدتك مقابل مقارنات حيّة في القاهرة الجديدة — النوع، المساحة، التشطيب والكمبوند.'
          : 'Value a unit against live New Cairo comparables — compound, type, area and finishing.'
      }
    >
      <section className="block">
        <div className="wrap">
          <div className="pricing-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,.8fr)', gap: 28, alignItems: 'start' }}>
            <Reveal className="card" >
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 26 }}>
                <div className="grid" style={{ display: 'grid', gap: 16 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
                      {isAr ? 'الكمبوند' : 'Compound'}
                    </span>
                    <select value={compound} onChange={(e) => setCompound(e.target.value)}>
                      {compounds.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
                      {isAr ? 'نوع الوحدة' : 'Property type'}
                    </span>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      {Object.keys(TYPE_MULT).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
                      {isAr ? 'المساحة (م²)' : 'Area (m²)'}: <b>{area}</b>
                    </span>
                    <input
                      type="range" min={60} max={700} step={5}
                      value={area}
                      onChange={(e) => setArea(Number(e.target.value))}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
                      {isAr ? 'التشطيب' : 'Finishing'}
                    </span>
                    <select value={finish} onChange={(e) => setFinish(e.target.value)}>
                      {Object.keys(FINISH_MULT).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div style={{ background: 'var(--navy)', color: '#fff', borderRadius: 18, padding: 26 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#e9c176', marginBottom: 10 }}>
                  {isAr ? 'التقدير' : 'Estimated value'}
                </div>
                {estimate ? (
                  <>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 700, lineHeight: 1.05 }}>
                      EGP {estimate.mid.toFixed(1)}M
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 13, marginTop: 8 }}>
                      {isAr ? 'النطاق' : 'Range'}: EGP {estimate.low.toFixed(1)}M – {estimate.high.toFixed(1)}M
                    </div>
                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.16)', display: 'grid', gap: 10, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,.7)' }}>{isAr ? 'سعر المتر' : 'Per m²'}</span>
                        <b style={{ fontFamily: 'var(--mono)' }}>EGP {Math.round(estimate.perM).toLocaleString('en-US')}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,.7)' }}>{isAr ? 'المنطقة' : 'Zone'}</span>
                        <b>{estimate.zone}</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,.7)' }}>{isAr ? 'تقييم الكمبوند' : 'Compound AI score'}</span>
                        <b>{estimate.ai.toFixed(1)}</b>
                      </div>
                    </div>
                  </>
                ) : null}
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11.5, marginTop: 18 }}>
                  {isAr
                    ? 'تقدير آلي إرشادي؛ التقييم النهائي بعد المعاينة.'
                    : 'Automated indicative estimate; final valuation follows an on-site inspection.'}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </AiToolPage>
  );
}
