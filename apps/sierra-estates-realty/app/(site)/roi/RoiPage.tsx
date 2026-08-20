'use client';

/** Port of deploy/roi.html — ROI forecaster over the compound table. */
import React, { useMemo, useState } from 'react';
import AiToolPage from '@/components/site/AiToolPage';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

interface Row { n: string; z: string; priceM: number; rent: number; ai: number; g: string }

export default function RoiPage() {
  const { isAr } = useSite();
  const compounds = HZDATA.compounds as Row[];

  const [horizon, setHorizon] = useState(5);
  const [zone, setZone] = useState('all');

  const zones = useMemo(() => ['all', ...Array.from(new Set(compounds.map((c) => c.z)))], [compounds]);

  const ranked = useMemo(() => {
    return compounds
      .filter((c) => zone === 'all' || c.z === zone)
      .map((c) => {
        const growth = parseFloat(String(c.g).replace(/[^\d.]/g, '')) || 0;
        const annualRent = c.rent * 12;                 // USD/yr
        const priceUsd = (c.priceM * 1_000_000) / 50;   // rough EGP→USD
        const yieldPct = priceUsd ? (annualRent / priceUsd) * 100 : 0;
        const projected = c.priceM * Math.pow(1 + growth / 100, horizon);
        const totalReturn = ((projected - c.priceM) / c.priceM) * 100 + yieldPct * horizon;
        return { ...c, growth, yieldPct, projected, totalReturn };
      })
      .sort((a, b) => b.totalReturn - a.totalReturn);
  }, [compounds, zone, horizon]);

  const top = ranked.slice(0, 12);

  return (
    <AiToolPage
      crumb={isAr ? 'توقّع العائد' : 'ROI Forecaster'}
      title={isAr ? 'توقّع عائد الاستثمار' : 'ROI Forecaster'}
      sub={
        isAr
          ? 'رتّب كمبوندات القاهرة الجديدة حسب العائد المتوقع — نمو رأس المال زائد العائد الإيجاري.'
          : 'Rank New Cairo compounds by projected return — capital growth plus rental yield.'
      }
    >
      <section className="block">
        <div className="wrap">
          <div className="af-bar rv">
            <div className="af-group">
              <span className="af-label">{isAr ? 'المدة' : 'Horizon'}</span>
              <div className="af-chips">
                {[3, 5, 7, 10].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`af-chip${horizon === h ? ' on' : ''}`}
                    onClick={() => setHorizon(h)}
                  >
                    {h} {isAr ? 'سنوات' : 'yrs'}
                  </button>
                ))}
              </div>
            </div>
            <div className="af-group">
              <span className="af-label">{isAr ? 'المنطقة' : 'Zone'}</span>
              <div className="af-chips">
                {zones.map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={`af-chip${zone === z ? ' on' : ''}`}
                    onClick={() => setZone(z)}
                  >
                    {z === 'all' ? (isAr ? 'الكل' : 'All') : z}
                  </button>
                ))}
              </div>
            </div>
            <span className="af-count"><b>{ranked.length}</b> {isAr ? 'كمبوند' : 'compounds'}</span>
          </div>

          <Reveal className="roi-table">
            <div className="roi-table-head">
              <h3>{isAr ? 'أعلى عائد متوقع' : 'Highest projected return'}</h3>
              <span className="live">{isAr ? 'مباشر' : 'Live'}</span>
            </div>
            {top.map((c, i) => (
              <div className="roi-row" key={c.n}>
                <span className="roi-rank">{i + 1}</span>
                <div>
                  <div className="roi-comp">{c.n}</div>
                  <div className="roi-zone">{c.z}</div>
                </div>
                <div>
                  <div className="roi-comp">EGP {c.priceM}M → {c.projected.toFixed(1)}M</div>
                  <div className="roi-zone">
                    {isAr ? 'نمو' : 'growth'} {c.g} · {isAr ? 'عائد' : 'yield'} {c.yieldPct.toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <b style={{ color: '#1e8b7a', fontSize: 16 }}>+{c.totalReturn.toFixed(0)}%</b>
                  <div className="roi-zone">{horizon}{isAr ? ' سنوات' : 'y total'}</div>
                </div>
              </div>
            ))}
          </Reveal>

          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 14, maxWidth: '70ch' }}>
            {isAr
              ? 'التقديرات إرشادية ومبنية على متوسطات السوق ومعدلات النمو المعلنة، وليست نصيحة استثمارية.'
              : 'Projections are indicative, based on published growth rates and market averages — not investment advice.'}
          </p>
        </div>
      </section>
    </AiToolPage>
  );
}
