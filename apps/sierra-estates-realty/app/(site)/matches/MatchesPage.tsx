'use client';

<<<<<<< HEAD
/** Port of deploy/matches.html — Smart Match. */
import React, { useMemo, useState } from 'react';
=======
/**
 * /matches — Smart Match (Phase 4 wiring).
 *
 * Previously this page scored the (now empty) static catalog client-side.
 * It now calls the real deterministic matching engine — POST /api/matches
 * (budget 40 / beds 20 / type 15 / zone 15 / AI 10) — and renders its top
 * results WITH match reasons (Master spec §matching: every result must be
 * traceable and explainable). No fabricated fallback: engine errors and
 * empty sets render honest states.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
import AiToolPage from '@/components/site/AiToolPage';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

<<<<<<< HEAD
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
=======
/** Budget input is converted to the USD figure the engine scores against. */
const FX_EGP_PER_USD = 50;
const PROPERTY_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Twin House', 'Duplex', 'Penthouse'];

interface MatchResult {
  listing: Record<string, any>;
  score: number;
  reasons: string[];
  hardConstraintViolations?: string[];
  alternative?: boolean;
}

function toCardListing(l: Record<string, any>, i: number): CardListing {
  const price = Number(l.price) || 0;
  const mode = l.mode === 'rent' ? 'rent' : 'sale';
  return {
    id: l.id ?? `M-${i}`,
    code: l.code || l.referenceCode || l.refId || '',
    cmp: l.compound || l.locationArea || '',
    zone: l.zone || l.locationArea || '',
    type: l.type || '',
    beds: Number(l.beds ?? 0),
    bath: Number(l.bath ?? 0),
    area: Number(l.area ?? 0),
    egpM: price > 0 ? Number((price / 1_000_000).toFixed(1)) : 0,
    usd: Number(l.usd ?? 0),
    ai: Number(l.ai ?? l.aiScore ?? 0),
    tag: mode === 'rent' ? 'Rent' : 'Sale',
    mode,
    agent: 'Sierra Advisor Desk',
    ago: l.ago || '',
    img: l.img || (Array.isArray(l.images) && l.images[0]) || '',
  };
}

export default function MatchesPage() {
  const { isAr } = useSite();
  const compounds = (HZDATA.compounds as any[]).map((c) => c.n);

  const [mode, setMode] = useState<'sale' | 'rent'>('rent');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [beds, setBeds] = useState(2);
  const [type, setType] = useState('Any');
  const [preferredZone, setPreferredZone] = useState('Any');
  const [budget, setBudget] = useState(40); // EGP thousands/month for rent; EGP millions for sale
  const [results, setResults] = useState<MatchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** USD budget the engine expects: rent → monthly USD; sale → full USD price. */
  const budgetUsd = useCallback(() => {
    if (currency === 'USD') return budget * (mode === 'rent' ? 1 : 1000);
    // EGP input: rent slider is thousands EGP/month; sale slider is millions EGP.
    const egp = mode === 'rent' ? budget * 1000 : budget * 1_000_000;
    return Math.round(egp / FX_EGP_PER_USD);
  }, [currency, budget, mode]);

  const runMatch = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: budgetUsd(),
          beds,
          type: type === 'Any' ? 'Any' : type,
          mode,
          ...(preferredZone !== 'Any' ? { preferredZone } : {}),
        }),
      });
      if (!res.ok) throw new Error(`matches API ${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setStatus('idle');
    } catch {
      setResults([]);
      setStatus('error');
    }
  }, [beds, mode, preferredZone, type, budgetUsd]);

  // Debounced auto-run whenever criteria change.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void runMatch(); }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runMatch]);
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

  return (
    <AiToolPage
      crumb={isAr ? 'المطابقة الذكية' : 'Smart Match'}
      title={isAr ? 'المطابقة الذكية' : 'Smart Match'}
      sub={
        isAr
<<<<<<< HEAD
          ? 'حدّد ميزانيتك واحتياجك، ويرتّب المحرك المعروض حسب مدى مطابقته لك.'
          : 'Set your budget and needs; the engine ranks live inventory by how well it fits.'
=======
          ? 'حدّد ميزانيتك واحتياجك، ويرتّب المحرك الوحدات الحقيقية حسب مدى مطابقتها مع أسباب واضحة لكل نتيجة.'
          : 'Set your budget and needs; the engine ranks live inventory with an explicit reason for every match.'
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      }
    >
      <section className="block">
        <div className="wrap">
          <div className="af-bar rv">
            <div className="af-group">
              <span className="af-label">{isAr ? 'الغرض' : 'Looking to'}</span>
              <div className="af-chips">
<<<<<<< HEAD
                {(['all', 'sale', 'rent'] as const).map((m) => (
                  <button key={m} type="button" className={`af-chip${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                    {m === 'all' ? (isAr ? 'الكل' : 'All') : m === 'sale' ? (isAr ? 'شراء' : 'Buy') : (isAr ? 'إيجار' : 'Rent')}
=======
                {(['rent', 'sale'] as const).map((m) => (
                  <button key={m} type="button" className={`af-chip${mode === m ? ' on' : ''}`} onClick={() => {
                    setMode(m);
                    setBudget(m === 'rent' ? 40 : 25);
                  }}>
                    {m === 'sale' ? (isAr ? 'شراء' : 'Buy') : (isAr ? 'إيجار' : 'Rent')}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
<<<<<<< HEAD
                    setBudget(c === 'USD' ? 800 : 40);
=======
                    setBudget(mode === 'rent' ? (c === 'USD' ? 800 : 40) : (c === 'USD' ? 300 : 25));
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'الغرف' : 'Bedrooms'}</span>
              <div className="af-chips">
<<<<<<< HEAD
                {[0, 2, 3, 4, 5].map((b) => (
                  <button key={b} type="button" className={`af-chip${beds === b ? ' on' : ''}`} onClick={() => setBeds(b)}>
                    {b === 0 ? (isAr ? 'الكل' : 'Any') : `${b}+`}
=======
                {[1, 2, 3, 4, 5].map((b) => (
                  <button key={b} type="button" className={`af-chip${beds === b ? ' on' : ''}`} onClick={() => setBeds(b)}>
                    {b}+
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'النوع' : 'Type'}</span>
              <div className="af-chips">
                {['Any', ...PROPERTY_TYPES].map((t) => (
                  <button key={t} type="button" className={`af-chip${type === t ? ' on' : ''}`} onClick={() => setType(t)}>
                    {t === 'Any' ? (isAr ? 'الكل' : 'Any') : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group">
              <span className="af-label">{isAr ? 'المنطقة' : 'Zone'}</span>
              <div className="af-chips">
                {['Any', ...compounds.slice(0, 8)].map((z) => (
                  <button key={z} type="button" className={`af-chip${preferredZone === z ? ' on' : ''}`} onClick={() => setPreferredZone(z)}>
                    {z === 'Any' ? (isAr ? 'الكل' : 'Any') : z}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                  </button>
                ))}
              </div>
            </div>

            <div className="af-group" style={{ minWidth: 200 }}>
              <span className="af-label">
<<<<<<< HEAD
                {isAr ? 'الميزانية' : 'Budget'}: <b>{currency === 'USD' ? `$${budget}K` : `EGP ${budget}M`}</b>
              </span>
              <input
                type="range"
                min={currency === 'USD' ? 100 : 3}
                max={currency === 'USD' ? 2000 : 60}
                step={currency === 'USD' ? 50 : 1}
=======
                {isAr ? 'الميزانية' : 'Budget'}:{' '}
                <b>
                  {currency === 'USD'
                    ? `$${mode === 'rent' ? budget.toLocaleString() : `${(budget * 1000).toLocaleString()}`}`
                    : mode === 'rent'
                      ? `${(budget * 1000).toLocaleString()} EGP${isAr ? '/شهر' : '/mo'}`
                      : `${budget}M EGP`}
                </b>
              </span>
              <input
                type="range"
                min={mode === 'rent' ? (currency === 'USD' ? 200 : 5) : (currency === 'USD' ? 50 : 3)}
                max={mode === 'rent' ? (currency === 'USD' ? 6000 : 300) : (currency === 'USD' ? 1500 : 60)}
                step={mode === 'rent' ? (currency === 'USD' ? 50 : 5) : (currency === 'USD' ? 10 : 1)}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

<<<<<<< HEAD
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
=======
            <span className="af-count">
              <b>{results.length}</b> {isAr ? 'نتيجة' : 'matches'}
            </span>
          </div>

          {status === 'loading' && (
            <Reveal className="empty-state">
              <h3>{isAr ? 'جاري تشغيل محرك المطابقة…' : 'Running the matching engine…'}</h3>
            </Reveal>
          )}

          {status === 'error' && (
            <Reveal className="empty-state">
              <h3>{isAr ? 'تعذّر الوصول لمحرك المطابقة' : 'Matching engine unavailable'}</h3>
              <p>{isAr ? 'يرجى المحاولة مرة أخرى بعد قليل.' : 'Please try again shortly — no fabricated results are shown.'}</p>
            </Reveal>
          )}

          {status === 'idle' && results.length > 0 && (
            <div className="grid-props">
              {results.map((r, i) => (
                <div key={String(r.listing?.id ?? i)} style={{ position: 'relative' }}>
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                  <span
                    style={{
                      position: 'absolute', zIndex: 3, insetInlineStart: 14, top: 14,
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                      padding: '6px 10px', borderRadius: 999,
<<<<<<< HEAD
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
=======
                      background: r.score >= 80 ? '#1e8b7a' : 'var(--navy)', color: '#fff',
                    }}
                  >
                    {r.score}% {isAr ? 'مطابقة' : 'match'}
                  </span>
                  <PropertyCard p={toCardListing(r.listing, i)} i={i} />
                  {r.alternative && (
                    <div
                      style={{
                        marginTop: 8, padding: '8px 10px', borderRadius: 10,
                        background: 'rgba(197,90,17,0.10)',
                        border: '1px solid rgba(197,90,17,0.35)',
                        fontSize: 11.5, fontWeight: 600, color: '#c75a4e',
                      }}
                    >
                      ⚠ {isAr ? 'خيار بديل — يخالف بعض الشروط الأساسية:' : 'Alternative — violates hard constraints:'}{' '}
                      {(r.hardConstraintViolations || []).join(' · ')}
                    </div>
                  )}
                  {r.reasons?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {r.reasons.slice(0, 4).map((reason) => (
                        <span
                          key={reason}
                          style={{
                            fontSize: 11, padding: '4px 9px', borderRadius: 999,
                            background: 'rgba(15,157,118,0.12)', color: '#0f9d76', fontWeight: 600,
                          }}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {status === 'idle' && results.length === 0 && (
            <Reveal className="empty-state">
              <h3>{isAr ? 'لا توجد نتائج مطابقة' : 'No matches at these settings'}</h3>
              <p>
                {isAr
                  ? 'جرّب رفع الميزانية أو تقليل عدد الغرف، أو اطلب من فريقنا تأمين وحدة تناسبك.'
                  : 'Try raising the budget or lowering the bedroom count — or ask our team to source a unit for you.'}
              </p>
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
            </Reveal>
          )}
        </div>
      </section>
    </AiToolPage>
  );
}
