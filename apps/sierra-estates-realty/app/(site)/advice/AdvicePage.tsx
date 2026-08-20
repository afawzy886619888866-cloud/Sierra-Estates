'use client';

/** Port of deploy/advice.html — the dream-home advisor. */
import React, { useMemo, useState } from 'react';
import AiToolPage from '@/components/site/AiToolPage';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

const PRIORITIES = [
  { k: 'space', en: 'Space for a family', ar: 'مساحة للعائلة' },
  { k: 'yield', en: 'Rental yield', ar: 'عائد إيجاري' },
  { k: 'growth', en: 'Capital growth', ar: 'نمو رأس المال' },
  { k: 'quiet', en: 'Quiet & privacy', ar: 'هدوء وخصوصية' },
];

export default function AdvicePage() {
  const { isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];
  const compounds = HZDATA.compounds as any[];

  const [priority, setPriority] = useState('space');
  const [budget, setBudget] = useState(25);

  const advice = useMemo(() => {
    const inBudget = listings.filter((p) => p.mode === 'sale' && p.egpM <= budget);
    const pool = inBudget.length ? inBudget : listings.filter((p) => p.mode === 'sale');

    const ranked = [...pool].sort((a, b) => {
      if (priority === 'space') return b.area - a.area;
      if (priority === 'yield') return (b.usd / b.egpM) - (a.usd / a.egpM);
      if (priority === 'growth') {
        const g = (x: CardListing) =>
          parseFloat(String(compounds.find((c) => c.n.includes(x.cmp) || x.cmp.includes(c.n))?.g ?? '0').replace(/[^\d.]/g, '')) || 0;
        return g(b) - g(a);
      }
      return b.ai - a.ai;
    });

    return { picks: ranked.slice(0, 3), usedFallback: !inBudget.length };
  }, [listings, compounds, priority, budget]);

  const rationale: Record<string, { en: string; ar: string }> = {
    space: { en: 'Ranked by usable area first — the largest floorplans your budget reaches.', ar: 'مرتّبة حسب المساحة أولًا — أكبر المساحات التي تسمح بها ميزانيتك.' },
    yield: { en: 'Ranked by rent recovered against purchase price.', ar: 'مرتّبة حسب الإيجار المحصّل مقابل سعر الشراء.' },
    growth: { en: 'Ranked by the compound’s published growth rate.', ar: 'مرتّبة حسب معدل النمو المعلن للكمبوند.' },
    quiet: { en: 'Ranked by overall Sierra score, which weights privacy and density.', ar: 'مرتّبة حسب تقييم سييرا الذي يراعي الخصوصية والكثافة.' },
  };

  return (
    <AiToolPage
      crumb={isAr ? 'مستشار المنزل' : 'Dream Home Advisor'}
      title={isAr ? 'مستشار المنزل المثالي' : 'Dream Home Advisor'}
      sub={
        isAr
          ? 'قل لنا الأهم بالنسبة لك، ونرشّح لك ثلاث وحدات مع سبب واضح لكل ترشيح.'
          : 'Tell us what matters most and we shortlist three units — with the reasoning behind each.'
      }
    >
      <section className="block">
        <div className="wrap">
          <div className="af-bar rv">
            <div className="af-group">
              <span className="af-label">{isAr ? 'الأولوية' : 'What matters most'}</span>
              <div className="af-chips">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.k}
                    type="button"
                    className={`af-chip${priority === p.k ? ' on' : ''}`}
                    onClick={() => setPriority(p.k)}
                  >
                    {isAr ? p.ar : p.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="af-group" style={{ minWidth: 230 }}>
              <span className="af-label">{isAr ? 'الميزانية' : 'Budget'}: <b>EGP {budget}M</b></span>
              <input
                type="range" min={5} max={60} step={1}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <Reveal>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, maxWidth: '70ch', marginBottom: 20 }}>
              {isAr ? rationale[priority].ar : rationale[priority].en}
              {advice.usedFallback && (
                <>
                  {' '}
                  <b>
                    {isAr
                      ? 'لا توجد وحدات ضمن هذه الميزانية، فعرضنا الأقرب إليها.'
                      : 'Nothing sits inside that budget, so these are the closest available.'}
                  </b>
                </>
              )}
            </p>
          </Reveal>

          <div className="grid-props">
            {advice.picks.map((p, i) => <PropertyCard key={p.id} p={p} i={i} />)}
          </div>
        </div>
      </section>
    </AiToolPage>
  );
}
