'use client';

/** Port of deploy/matches.html — Smart Match. */
import React, { useMemo, useState } from 'react';
import AiToolPage from '@/components/site/AiToolPage';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

export default function MatchesPage() {
  const { isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];

  const [mode, setMode] = useState<'all' | 'sale' | 'rent'>('all');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [beds, setBeds] = useState(0);
  const [budget, setBudget] = useState(40);
  const [minYield, setMinYield] = useState(0);

  const matched = useMemo(() => {
    return listings
      .filter((p) => mode === 'all' || p.mode === mode)
      .filter((p) => !beds || p.beds >= beds)
      .filter((p) => {
        if (p.mode === 'rent') return true;
        const priceInUnits = currency === 'USD' ? (p.usd ? p.usd / 1000 : (p.egpM * 1000000) / 48.65 / 1000) : p.egpM;
        return priceInUnits <= budget;
      })
      .map((p) => {
        const priceInUnits = currency === 'USD' ? (p.usd ? p.usd / 1000 : (p.egpM * 1000000) / 48.65 / 1000) : p.egpM;
        const budgetFit = p.mode === 'rent' ? 1 : Math.max(0, 1 - Math.abs(budget - priceInUnits) / Math.max(budget, 1));
        const bedFit = beds ? Math.max(0, 1 - Math.abs(p.beds - beds) / 5) : 0.8;
        const yieldFit = minYield > 0 ? (p.yield && p.yield >= minYield ? 1.0 : 0.6) : 1.0;
        const score = p.ai / 10 * 0.5 + budgetFit * 0.2 + bedFit * 0.15 + yieldFit * 0.15;
        return { p, score: Math.round(score * 100) };
      })
      .sort((a, b) => b.score - a.score);
  }, [listings, mode, currency, beds, budget, minYield]);

  return (
    <AiToolPage
      crumb={isAr ? 'المطابقة الذكية' : 'Smart Match'}
      title={isAr ? 'المطابقة الذكية' : 'Smart Match'}
      sub={
        isAr
          ? 'حدّد ميزانيتك واحتياجك، ويرتّب المحرك المعروض حسب مدى مطابقته لك.'
          : 'Set your budget and needs; the engine ranks live inventory by how well it fits.'
      }
    >
      <section className="block">
        <div className="wrap">
          <div className="af-bar rv">
            <div className="af-group">
              <span className="af-label">{isAr ? 'الغرض' : 'Looking to'}</span>
              <div className="af-chips">
                {(['all', 'sale', 'rent'] as const).map((m) => (
                  <button key={m} type="button" className={`af-chip${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                    {m === 'all' ? (isAr ? 'الكل' : 'All') : m === 'sale' ? (isAr ? 'شراء' : 'Buy') : (isAr ? 'إيجار' : 'Rent')}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'العملة' : 'Currency'}</span>
              <div className="af-chips">
                {(['EGP', 'USD'] as const).map((c) => (
                  <button key={c} type="button" className={`af-chip${currency === c ? ' on' : ''}`} onClick={() => {
                    setCurrency(c);
                    setBudget(c === 'USD' ? 800 : 40);
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'الغرف' : 'Bedrooms'}</span>
              <div className="af-chips">
                {[0, 2, 3, 4, 5].map((b) => (
                  <button key={b} type="button" className={`af-chip${beds === b ? ' on' : ''}`} onClick={() => setBeds(b)}>
                    {b === 0 ? (isAr ? 'الكل' : 'Any') : `${b}+`}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group" style={{ minWidth: 200 }}>
              <span className="af-label">
                {isAr ? 'الميزانية' : 'Budget'}: <b>{currency === 'USD' ? `$${budget}K` : `EGP ${budget}M`}</b>
              </span>
              <input
                type="range"
                min={currency === 'USD' ? 100 : 3}
                max={currency === 'USD' ? 2000 : 60}
                step={currency === 'USD' ? 50 : 1}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'الحد الأدنى للعائد' : 'Min Yield'}</span>
              <div className="af-chips">
                {[0, 7, 9, 12].map((y) => (
                  <button key={y} type="button" className={`af-chip${minYield === y ? ' on' : ''}`} onClick={() => setMinYield(y)}>
                    {y === 0 ? (isAr ? 'الكل' : 'Any') : `${y}%+`}
                  </button>
                ))}
              </div>
            </div>

            <span className="af-count"><b>{matched.length}</b> {isAr ? 'نتيجة' : 'matches'}</span>
          </div>

          {matched.length ? (
            <div className="grid-props">
              {matched.map(({ p, score }, i) => (
                <div key={p.id} style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute', zIndex: 3, insetInlineStart: 14, top: 14,
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                      padding: '6px 10px', borderRadius: 999,
                      background: score >= 80 ? '#1e8b7a' : 'var(--navy)', color: '#fff',
                    }}
                  >
                    {score}% {isAr ? 'مطابقة' : 'match'}
                  </span>
                  <PropertyCard p={p} i={i} />
                </div>
              ))}
            </div>
          ) : (
            <Reveal className="empty-state">
              <h3>{isAr ? 'لا توجد نتائج مطابقة' : 'No matches at these settings'}</h3>
              <p>{isAr ? 'جرّب رفع الميزانية أو تقليل عدد الغرف.' : 'Try raising the budget or lowering the bedroom count.'}</p>
            </Reveal>
          )}
        </div>
      </section>
    </AiToolPage>
  );
}
