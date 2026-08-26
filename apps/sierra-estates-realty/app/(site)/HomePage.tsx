'use client';

/** Port of deploy/index.html with direct 3D virtual tour and embedded interactive masterplan map. */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowRight, Radar, TrendingUp, HeartHandshake, BadgeCheck, Search,
  Star, Send, CheckCircle, Plus, Phone, Mail,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import HomeHero from '@/components/site/HomeHero';
import PropertyShowcaseVideo from '@/components/site/PropertyShowcaseVideo';
import VirtualTourBanner from '@/components/site/VirtualTourBanner';
import { AI_ICONS } from '@/components/site/AiIcons';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import type { MapCompound } from '@/components/site/CompoundsMap';

const CompoundsMap = dynamic(() => import('@/components/site/CompoundsMap'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 460, color: 'var(--muted)', fontSize: 13 }}>
      Loading interactive map…
    </div>
  ),
});

const COMPOUND_PICKS = ['Hyde Park New Cairo', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)'];

const AI_TOOLS = [
  { k: 'engine', t: 'ai1t', s: 'ai1s', live: true, href: '/ai-engine' },
  { k: 'match', t: 'ai2t', s: 'ai2s', href: '/matches' },
  { k: 'roi', t: 'ai3t', s: 'ai3s', href: '/roi' },
  { k: 'price', t: 'ai4t', s: 'ai4s', href: '/pricing' },
  { k: 'dream', t: 'ai5t', s: 'ai5s', href: '/advice' },
  { k: 'imap', t: 'ai6t', s: 'ai6s', href: '/compounds' },
  { k: 'tour', t: 'ai7t', s: 'ai7s', href: '/virtual-tour' },
];

const TICKER_EN = [
  'HYDE PARK AI SCORE 9.8', 'VILLETTE YIELD 8.1%', 'TAJ CITY DEMAND RISING',
  'MOUNTAIN VIEW ICITY +24%', 'UPTOWN CAIRO +31%', 'MIVIDA RENTALS FROM $1,700/MO',
  'PALM HILLS AI SCORE 9.2', 'EASTOWN DEMAND SURGING', 'AL BUROUJ CAPITAL GAIN +18%',
];
const TICKER_AR = [
  'هايد بارك AI 9.8', 'فيليت عائد 8.1%', 'تاج سيتي طلب متزايد',
  'ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجارات من $1,700/شهر',
  'بالم هيلز AI 9.2', 'إيستاون طلب متزايد', 'البروج نمو سنوي +18%',
];

export default function HomePage() {
  const { t, isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];
  const allCompounds = HZDATA.compounds as MapCompound[];
  const featuredCompounds = HZDATA.featured as string[];

  const [inqMode, setInqMode] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [searchMode, setSearchMode] = useState<'buy' | 'rent' | 'new'>('buy');
  const [search, setSearch] = useState({ compound: '', type: '', beds: '0', price: '0' });
  const [selectedMapCompound, setSelectedMapCompound] = useState<string | null>('Mivida');
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', zone: '', type: '', budget: '',
  });

  const ticker = useMemo(() => {
    const items = isAr ? TICKER_AR : TICKER_EN;
    return items.concat(items);
  }, [isAr]);

  const searchHref = useMemo(() => {
    const params = new URLSearchParams();
    if (searchMode !== 'buy') params.set('mode', searchMode === 'rent' ? 'rent' : 'sale');
    if (search.compound.trim()) params.set('compound', search.compound.trim());
    if (search.type) params.set('type', search.type);
    if (search.beds !== '0') params.set('beds', search.beds);
    if (search.price !== '0') params.set('price', search.price);
    const query = params.toString();
    return query ? `/properties?${query}` : '/properties';
  }, [search, searchMode]);

  const compoundTiles = useMemo(
    () =>
      COMPOUND_PICKS.map((n) => ({
        n,
        c: (HZDATA.compounds as any[]).find((x) => x.n === n),
        img: (HZDATA.compoundImgs as Record<string, string>)[n],
      })).filter((x) => x.c),
    []
  );

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, intent: inqMode, source: 'portal_home_inquiry' }),
      });
      if (!res.ok) console.warn('[HomePage] Lead submission returned', res.status);
    } catch (err) {
      console.warn('[HomePage] Lead submission failed (will be retried by CRM sync):', err);
    }
    setSent(true);
  }

  return (
    <SiteShell active="home">
      <HomeHero />

      {/* SEARCH CARD */}
      <div className="wrap searchbar">
        <div className="search-card rv">
          <div className="search-tabs" role="tablist" aria-label={isAr ? 'نوع البحث' : 'Search type'}>
            {(['buy', 'rent', 'new'] as const).map((mode) => (
              <button
                key={mode}
                className={searchMode === mode ? 'active' : undefined}
                type="button"
                role="tab"
                aria-selected={searchMode === mode}
                onClick={() => setSearchMode(mode)}
              >
                {t(mode === 'buy' ? 'tabBuy' : mode === 'rent' ? 'tabRent' : 'tabNew')}
              </button>
            ))}
          </div>
          <div className="search-fields">
            <div className="field">
              <label htmlFor="hero-compound-search">{t('fLoc')}</label>
              <input
                type="text"
                id="hero-compound-search"
                name="compound"
                className="hero-search-input"
                placeholder={t('heroCpdPh')}
                value={search.compound}
                onChange={(e) => setSearch({ ...search, compound: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="hero-type">{t('fType')}</label>
              <select id="hero-type" name="type" className="hero-select" value={search.type} onChange={(e) => setSearch({ ...search, type: e.target.value })}>
                <option value="">{t('anyType')}</option>
                <option value="Apartment">{t('tApt')}</option>
                <option value="Villa">{t('tVilla')}</option>
                <option value="Townhouse">{t('tTown')}</option>
                <option value="Twin House">{t('tTwinH')}</option>
                <option value="Penthouse">{t('tPent')}</option>
                <option value="Duplex">{t('tDuplex')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="hero-beds">{t('fBeds')}</label>
              <select id="hero-beds" name="beds" className="hero-select" value={search.beds} onChange={(e) => setSearch({ ...search, beds: e.target.value })}>
                <option value="0">{t('reqAny')}</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hero-price">{t('fPrice')}</label>
              <select id="hero-price" name="price" className="hero-select" value={search.price} onChange={(e) => setSearch({ ...search, price: e.target.value })}>
                <option value="0">{t('anyPrice')}</option>
                {[5, 10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>Up to {n}M EGP</option>
                ))}
              </select>
            </div>
            <div className="field searchbtn">
              <Link href={searchHref} className="btn btn-pri" id="hero-search-btn">
                <Search className="i" /> <span>{t('search')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MARKET TICKER */}
      <div className="ticker">
        <div className="row" id="ticker-row">
          {ticker.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      {/* IMPORTANT PROJECTS */}
      <section className="block cairo-project-feature" id="important-projects" aria-labelledby="important-projects-title">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('cairoProjectEyebrow')}</div>
              <h2 id="important-projects-title">{t('cairoProjectTitle')}</h2>
              <p>{t('cairoProjectBody')}</p>
            </div>
            <Link href="/cairo-plaza" className="sec-link">
              <span>{t('cairoProjectLink')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <Link href="/cairo-plaza" className="cairo-project-feature__link rv" aria-label={t('cairoProjectLink')}>
            <span className="cairo-project-feature__index">01</span>
            <span className="cairo-project-feature__name">{isAr ? 'كايرو بلازا' : 'Cairo Plaza'}</span>
            <span className="cairo-project-feature__place">{isAr ? 'أمام محطة مترو المطرية' : 'In front of Al-Mataria Metro Station'}</span>
            <ArrowRight className="i" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* INTERACTIVE MASTERPLAN MAP SECTION */}
      <section className="block well" id="interactive-map">
        <div className="wrap">
          <div className="sec-head rv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 38px)', fontFamily: 'var(--display)', color: 'var(--ink, #0f172a)', margin: '0 0 8px' }}>
                {t('mapTit')}
              </h2>
              <p style={{ color: 'var(--muted, #64748b)', fontSize: 15, margin: 0, maxWidth: 640 }}>
                {t('mapSub')}
              </p>
            </div>
            <Link href="/compounds" className="sec-link" style={{ color: '#0284c7', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{t('allCpds')}</span> <ArrowRight className="i" style={{ width: 16, height: 16 }} />
            </Link>
          </div>

          {/* Interactive Map Canvas */}
          <div className="map-shell rv" style={{ height: 560, minHeight: 520, borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.08)', border: '1px solid var(--line, rgba(0,0,0,0.1))' }}>
            <CompoundsMap
              compounds={allCompounds}
              featured={featuredCompounds}
              selectedName={selectedMapCompound}
              onSelectAction={setSelectedMapCompound}
              showControls={true}
            />
          </div>
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="block" id="properties">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeList')}</div>
              <h2>{t('featTit')}</h2>
              <p>{t('featSub')}</p>
            </div>
            <Link href="/properties" className="sec-link">
              <span>{t('viewAll')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <div className="grid-props" id="prop-grid">
            {listings.slice(0, 6).map((p, i) => <PropertyCard key={p.id} p={p} i={i} />)}
          </div>
        </div>
      </section>

      {/* WHY SIERRA */}
      <section className="block" id="agents">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <h2>Why Sierra<sup>1</sup> Estates<sup>™</sup></h2>
              <p>{t('whySub')}</p>
            </div>
          </div>
          <div className="net-banner rv">
            <div className="nb-left">
              <h3>{t('netTit')}</h3>
              <p>{t('netBody')}</p>
            </div>
            <div className="nb-stats">
              <div className="nb-stat"><b data-count="1500" data-suffix="+">0</b><span>{t('netS1L')}</span></div>
              <div className="nb-stat"><b data-count="240" data-suffix="+">0</b><span>{t('netS2L')}</span></div>
              <div className="nb-stat"><b data-count="100" data-suffix="%">0</b><span>{t('netS3L')}</span></div>
            </div>
          </div>
          <div className="grid-feat">
            <div className="feat rv"><div className="ic"><Radar className="i" /></div><h4>{t('w1t')}</h4><p>{t('w1s')}</p></div>
            <div className="feat rv d1"><div className="ic"><TrendingUp className="i" /></div><h4>{t('w2t')}</h4><p>{t('w2s')}</p></div>
            <div className="feat rv d2"><div className="ic"><HeartHandshake className="i" /></div><h4>{t('w3t')}</h4><p>{t('w3s')}</p></div>
            <div className="feat rv d3"><div className="ic"><BadgeCheck className="i" /></div><h4>{t('w4t')}</h4><p>{t('w4s')}</p></div>
          </div>
        </div>
      </section>

      {/* COMPOUNDS GRID */}
      <section className="block well" id="compounds">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeCpd')}</div>
              <h2>{t('cpdTit')}</h2>
              <p>{t('cpdSub')}</p>
            </div>
            <Link href="/compounds" className="sec-link">
              <span>{t('allCpds')}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <div className="grid-comp" id="comp-grid">
            {compoundTiles.map(({ n, c, img }, i) => (
              <Link key={n} className={`comp rv d${i + 1}`} href="/compounds">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={c.n} loading="lazy" />
                <div className="co-scrim" />
                <div className="co-count">AI {c.ai.toFixed(1)} · {c.g}</div>
                <div className="co-body">
                  <h4>{c.n}</h4>
                  <span>{c.z} · EGP {c.priceM}M avg</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROPERTY SHOWCASE VIDEO */}
      <section className="block" id="showcase">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{isAr ? 'اختيارات هذا الأسبوع' : 'This week’s edit'}</div>
              <h2>{isAr ? 'شاهد العقارات الأقرب لك' : 'See the homes worth your time'}</h2>
              <p>{isAr ? 'جولة سريعة في أفضل العقارات المنتقاة من شبكة Sierra.' : 'A fast, cinematic pass through the strongest homes in the Sierra network.'}</p>
            </div>
            <Link href="/properties" className="sec-link">
              <span>{isAr ? 'كل العقارات' : 'Browse all homes'}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <PropertyShowcaseVideo />
        </div>
      </section>

      {/* DIRECT LIVE 3D VIRTUAL TOUR */}
      <section className="block well" id="tour">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{isAr ? 'جولة افتراضية مباشرة' : 'Direct Live Walkthrough'}</div>
              <h2>{isAr ? 'تجوّل في وحدتك ثلاثية الأبعاد الآن' : 'Walk Through Your Next Home in Full 3D'}</h2>
              <p>{isAr ? 'تجربة تفاعلية مباشرة بدقة سينمائية 4K للتنقل بين الغرف ومطالعة المخطط والتفاصيل فورا.' : 'Direct interactive 4K cinema experience to navigate room-by-room, inspect floor plans, and view finishes.'}</p>
            </div>
            <Link href="/virtual-tour" className="sec-link">
              <span>{isAr ? 'افتح الصفحة كاملة' : 'Open full page'}</span> <ArrowRight className="i" />
            </Link>
          </div>
          <VirtualTourBanner />
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <div className="wrap">
          <div className="stat rv"><b data-count="1900" data-suffix="+">0</b><span>{t('stat1')}</span></div>
          <div className="stat rv d1"><b data-count="53">0</b><span>{t('stat2')}</span></div>
          <div className="stat rv d2"><b data-count="68">0</b><span>{t('stat3')}</span></div>
          <div className="stat rv d3"><b data-count="4.2" data-prefix="EGP " data-suffix="B">0</b><span>{t('stat4')}</span></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="block testi-band" id="testimonials">
        <div className="wrap">
          <div className="sec-head rv">
            <div>
              <div className="eyebrow">{t('eyeTesti')}</div>
              <h2>{t('testiTit')}</h2>
              <p>{t('testiSub')}</p>
            </div>
          </div>
          <div className="grid-testi" id="testi-grid">
            {[1, 2, 3].map((n, i) => {
              const nm = t(`t${n}n`);
              const initials = nm.split(' ').slice(0, 2).map((w) => w[0]).join('');
              return (
                <div key={n} className={`tcard rv d${i + 1}`}>
                  <div className="stars">
                    {[0, 1, 2, 3, 4].map((k) => <Star key={k} className="i" />)}
                  </div>
                  <p>“{t(`t${n}q`)}”</p>
                  <div className="who">
                    <span className="av">{initials}</span>
                    <span><b>{nm}</b><small>{t(`t${n}r`)}</small></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERFECT CHOICE + INQUIRY */}
      <section className="block" id="inquiry">
        <div className="wrap">
          <div className="perfect rv">
            <div className="pf-left">
              <h2>{t('perfTit')}</h2>
              <p>{t('perfSub')}</p>
              <div className="pf-item"><span className="num">01</span><div><h4>{t('pc1t')}</h4><p>{t('pc1s')}</p></div></div>
              <div className="pf-item"><span className="num">02</span><div><h4>{t('pc2t')}</h4><p>{t('pc2s')}</p></div></div>
              <div className="pf-item"><span className="num">03</span><div><h4>{t('pc3t')}</h4><p>{t('pc3s')}</p></div></div>
            </div>

            <form className="inq" id="inq-form" onSubmit={submitInquiry}>
              <h3>{t('inqTit')}</h3>
              <p>{t('inqSub')}</p>
              <div className="seg" id="inq-seg">
                {(['buy', 'rent', 'sell'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={inqMode === m ? 'on' : undefined}
                    onClick={() => setInqMode(m)}
                  >
                    {t(m === 'buy' ? 'inqBuy' : m === 'rent' ? 'inqRent' : 'inqSell')}
                  </button>
                ))}
              </div>
              <div className="frow">
                <div>
                  <label htmlFor="inq-name">{t('inqName')}</label>
                  <input type="text" id="inq-name" name="name" required placeholder="Your Full Name"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="inq-phone">{t('inqPhone')}</label>
                  <input type="tel" id="inq-phone" name="phone" dir="ltr" required placeholder="+2 01XXXXXXXXX"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="frow">
                <div>
                  <label htmlFor="inq-email">{t('inqEmail')}</label>
                  <input type="email" id="inq-email" name="email" dir="ltr" placeholder="you@example.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="inq-zone">{t('inqZone')}</label>
                  <select id="inq-zone" name="zone" value={form.zone}
                    onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                    {['z1', 'z2', 'z3', 'z4'].map((k) => <option key={k}>{t(k)}</option>)}
                  </select>
                </div>
              </div>
              <div className="frow">
                <div>
                  <label htmlFor="inq-type">{t('inqType2')}</label>
                  <select id="inq-type" name="type" value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['lVilla', 'lApt', 'lTwin', 'lPent'].map((k) => <option key={k}>{t(k)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="inq-budget">{t('inqBudget')}</label>
                  <input type="text" id="inq-budget" name="budget" dir="ltr" placeholder="10,000,000"
                    value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-pri" type="submit">
                <Send className="i" /> <span>{t('inqSend')}</span>
              </button>
              {sent && (
                <div id="inq-success" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, color: '#10b981' }}>
                  <CheckCircle style={{ width: 18, height: 18 }} />
                  <span>Thank you! Your inquiry has been received. Our team will contact you within 24 hours.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* AI HUB */}
      <section className="ai-hub" id="ai">
        <div className="ai-gridlines" aria-hidden="true" />
        <div className="ai-watermark" id="ai-watermark" aria-hidden="true" />
        <div className="wrap">
          <div className="ai-eye rv"><span className="live" /> <span>{t('aiEye')}</span></div>
          <h2 className="rv">Intelligence<sup>1</sup> Engine<sup>™</sup></h2>
          <p className="ai-lead rv">{t('aiSub')}</p>
          <div className="ai-scan" />
          <div className="ai-grid" id="ai-grid">
            {AI_TOOLS.map((tool, i) => (
              <Link key={tool.k} href={tool.href} className={`ai-card rv d${(i % 4) + 1}`}>
                <span className="ai-ic">{AI_ICONS[tool.k]}</span>
                <h4>{t(tool.t)}</h4>
                <p>{t(tool.s)}</p>
                {tool.live && <span className="live-tag">{t('aiLive')}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="block" id="contact">
        <div className="wrap">
          <div className="cta rv">
            <div className="ct-txt">
              <h2>{t('ctaTit')}</h2>
              <p>{t('ctaSub')}</p>
            </div>
            <div className="ct-act">
              <Link href="/add-listing" className="btn btn-white">
                <Plus className="i" /> <span>{t('ctaBtn1')}</span>
              </Link>
              <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="btn btn-out">
                <Phone className="i" /> <span>+2 01092048333</span>
              </a>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Mail className="i" />
              <a href="mailto:info@Sierra-Estates.net">info@Sierra-Estates.net</a>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <div className="partners">
        <div className="wrap">
          <div className="p-eye rv">{t('partEye')}</div>
          <div className="row rv d1">
            {['EMAAR MISR', 'SODIC', 'MOUNTAIN VIEW', 'PALM HILLS', 'ORA', 'LA VISTA', 'HYDE PARK', 'MARAKEZ'].map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
