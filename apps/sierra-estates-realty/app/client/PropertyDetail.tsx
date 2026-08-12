'use client';
/* eslint-disable @next/next/no-img-element */
/**
 * Sierra Estates — Property detail (port of property.html).
 * Reads the single property from Firestore `properties/{id}` (client SDK);
 * falls back to the local kit listing when Firestore is empty/unconfigured.
 * Schedule / Call CTAs post a real lead via /api/leads; WhatsApp deep-links.
 * Mini-map is a live Leaflet map (CARTO light tiles + blue dot marker),
 * ported from property.html — dynamically imported, ssr:false.
 */
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Nav, Topbar, Footer, PropertyCard, Reveal, SierraConcierge, useT } from './ui';
import { FALLBACK_LISTINGS, INTERIORS, Listing, priceLabel, compoundCoords } from './portalData';
import { IconMapPin, IconBed, IconBath, IconScaling, IconSparkles, IconLayout, IconListChecks, IconMap, IconCalendar, IconMessageCircle, IconPhone, IconArrowRight, IconCheckCircle } from './icons';

const PropertyMiniMap = dynamic(() => import('./maps').then((m) => m.PropertyMiniMap), {
  ssr: false,
  loading: () => <div className="mini-map" style={{ height: 260 }} />,
});

const WHATSAPP = 'https://wa.me/201092048333';

function mapOne(id: string, p: Record<string, unknown>): Listing {
  const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  const raw = p.price;
  const egpM = typeof raw === 'number' ? (raw > 1000 ? raw / 1e6 : raw) : num(p.egpM, 10);
  return {
    id, code: str(p.code, id.slice(0, 8).toUpperCase()),
    cmp: str(p.compound, str(p.location, 'New Cairo')), zone: str(p.zone, str(p.district, 'New Cairo')),
    type: str(p.propertyType, str(p.type, 'Villa')), beds: num(p.bedrooms, num(p.beds, 3)),
    bath: num(p.bathrooms, num(p.bath, 2)), area: num(p.area, 200), egpM,
    usd: num(p.usd, num(p.rent, Math.round(egpM * 180))), ai: num(p.ai, num(p.aiScore, 9.0)),
    tag: typeof p.tag === 'string' ? p.tag : null,
    mode: p.mode === 'rent' || p.listingType === 'rent' ? 'rent' : 'sale',
    agent: str(p.agent, str(p.agentName, 'Sierra Advisor')), ago: str(p.ago, 'Live'),
    img: str(p.featuredImage, str(p.img, FALLBACK_LISTINGS[0].img)),
    vrAvailable: !!p.vr_available,
    vrLink: str(p.vr_link, str(p.virtual_tour_url, '')),
  };
}

export default function PropertyDetail({ id }: { id: string }) {
  const { t, locale } = useT();
  const isAr = locale === 'ar';
  const fallback = useMemo(
    () => FALLBACK_LISTINGS.find((x) => String(x.id) === String(id)) ?? FALLBACK_LISTINGS[0],
    [id],
  );
  const [p, setP] = useState<Listing>(fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'listings', id));
        if (!cancelled && snap.exists()) setP(mapOne(snap.id, snap.data() as Record<string, unknown>));
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const gallery = [p.img.replace('w=800', 'w=1400'), ...INTERIORS.slice(0, 4)];
  const feats = isAr
    ? ['حديقة خاصة', 'جراج مغطى', 'تكييف مركزي', 'منزل ذكي', 'عضوية النادي', 'منطقة أطفال', 'أمن 24/7', 'حمام سباحة', 'إنترنت فايبر']
    : ['Private garden', 'Covered parking', 'Central AC', 'Smart home ready', 'Clubhouse access', "Kids' area", '24/7 security', 'Community pool', 'Fiber internet'];
  const desc = isAr
    ? `وحدة ${p.type} استثنائية في ${p.cmp} — تشطيب فاخر، إطلالات مفتوحة، ومجتمع مغلق بخدمات متكاملة. موثّقة ميدانياً من فريق سيرا، ومسعّرة ببيانات السوق الحية عبر محرك AVM. متاحة للمعاينة خلال 24 ساعة.`
    : `An exceptional ${p.type.toLowerCase()} in ${p.cmp} — premium finishing, open views, and a fully-serviced gated community. Verified on-site by the Sierra team and priced against live market data through our AVM engine. Available for viewing within 24 hours.`;

  const similar = FALLBACK_LISTINGS.filter((x) => String(x.id) !== String(p.id))
    .sort((a, b) => Math.abs(a.ai - p.ai) - Math.abs(b.ai - p.ai)).slice(0, 3);

  const mapCenter = useMemo(() => compoundCoords(p.cmp), [p.cmp]);

  const specs: [React.ReactNode, string | number, string][] = [
    [<IconBed key="b" size={20} />, p.beds, t('beds')],
    [<IconBath key="t" size={20} />, p.bath, t('baths')],
    [<IconScaling key="a" size={20} />, `${p.area} m²`, 'm²'],
    [<IconSparkles key="s" size={20} />, `AI ${p.ai.toFixed(1)}`, t('aiScore')],
  ];

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav active="props" />
      <header className="page-hero" style={{ padding: '40px 0 44px' }}>
        <div className="wrap">
          <div className="crumbs"><Link href="/">{t('crumbHome')}</Link><span className="sep">/</span><Link href="/properties">{t('navProps')}</Link><span className="sep">/</span><span>{p.code}</span></div>
        </div>
      </header>

      <section className="block" style={{ paddingTop: 44 }}>
        <div className="wrap">
          <Reveal className="p-head">
            <div>
              <div className="ptype">{p.code} · {p.type}</div>
              <h1>{p.type} in {p.cmp}</h1>
              <div className="addr"><IconMapPin size={16} /> <span>{p.cmp}, {p.zone}, New Cairo</span></div>
            </div>
            <div className="price"><span>{priceLabel(p)}</span><small>{p.mode === 'rent' ? t('modeRent') : t('modeSale')}</small></div>
          </Reveal>

          <Reveal className="gallery">
            {gallery.map((src, i) => (
              <div className="g" key={i}>
                <img src={src} alt="" loading="lazy" />
                {i === 4 && <span className="more">+12</span>}
              </div>
            ))}
          </Reveal>

          <div className="p-cols">
            <div>
              <Reveal className="panel">
                <h3><IconLayout size={18} /> <span>{t('overview')}</span></h3>
                <div className="spec-row">
                  {specs.map(([icon, val, label], i) => (
                    <div className="spec" key={i}>{icon}<b>{val}</b><span>{label}</span></div>
                  ))}
                </div>
                <p className="desc" style={{ marginTop: 20 }}>{desc}</p>
              </Reveal>
              <Reveal className="panel">
                <h3><IconListChecks size={18} /> {t('amenities')}</h3>
                <div className="feats">
                  {feats.map((f) => <span key={f}><IconCheckCircle size={16} />{f}</span>)}
                </div>
              </Reveal>
              <Reveal className="panel">
                <h3><IconMap size={18} /> <span>{t('location')}</span></h3>
                <PropertyMiniMap center={mapCenter} height={260} />
                <div className="addr" style={{ marginTop: 10 }}><IconMapPin size={14} /> <span>{p.cmp} · {p.zone}, New Cairo, Egypt</span></div>
              </Reveal>
            </div>

            <aside>
              <Reveal className="agent-card">
                <div className="a-top">
                  <span className="a-av">{p.agent.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <div>
                    <div className="a-role">{t('advisor')}</div>
                    <h4>{p.agent}</h4>
                    <div className="a-sub">Sierra Estates · New Cairo</div>
                  </div>
                </div>
                <a className="btn btn-pri" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconCalendar size={16} /> <span>{t('schedule')}</span></a>
                <a className="btn btn-wa" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconMessageCircle size={16} /> <span>{t('wa')}</span></a>
                <a className="btn btn-ghost" href="tel:+201092048333"><IconPhone size={16} /> <span>{t('call')}</span></a>
                
                {p.vrAvailable && p.vrLink && (
                  <a className="btn btn-pri" style={{ marginTop: 12, background: '#1a1a1a' }} href={p.vrLink} target="_blank" rel="noopener noreferrer">
                    <span>Virtual Tour (VR)</span>
                  </a>
                )}
                
                <div className="ai-banner"><b>AI {p.ai.toFixed(1)}</b><span>{isAr ? 'تقييم سيرا الذكي — مقارنة لحظية مع 25 كمبوند في القاهرة الجديدة.' : 'Sierra AI score — benchmarked against 25 New Cairo compounds in real time.'}</span></div>
              </Reveal>
            </aside>
          </div>

          <Reveal className="sec-head" style={{ marginTop: 56 }}>
            <div>
              <div className="eyebrow">{t('eyeList')}</div>
              <h2>{t('similar')}</h2>
            </div>
            <Link href="/properties" className="sec-link"><span>{t('viewAll')}</span> <IconArrowRight size={16} /></Link>
          </Reveal>
          <div className="grid-props">
            {similar.map((s, i) => <PropertyCard key={s.id} p={s} index={i} />)}
          </div>
        </div>
      </section>

      <Footer />
      <SierraConcierge />
    </div>
  );
}
