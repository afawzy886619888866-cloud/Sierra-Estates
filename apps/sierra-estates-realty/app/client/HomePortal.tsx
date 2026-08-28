'use client';
/* eslint-disable @next/next/no-img-element */
/**
 * Sierra Estates — client portal HOME.
 * Faithful React port of ui_kits/houzez-portal/index.html.
 * Real data: featured grid + compound tiles read Firestore `properties`
 * (fallback to local kit data). Real endpoints: inquiry form → POST /api/leads,
 * concierge → POST /api/chat (via <SierraConcierge/>). framer-motion entrances.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import {
  Nav, Topbar, Footer, PropertyCard, Reveal, SierraConcierge, useT,
} from './ui';
import {
  SLIDES, COMPOUNDS, COMPOUND_IMGS, FALLBACK_LISTINGS, fetchListings, Listing,
} from './portalData';
import {
  IconMapPin, IconChevronDown, IconSearch, IconArrowRight, IconBadgeCheck, IconMap,
  IconShield, IconRadar, IconTrendingUp, IconHandshake, IconStar, IconSend, IconPlus,
  IconSparkles, IconPhone,
} from './icons';

/**
 * The hero's 3D skyline. Dynamically imported (ssr:false) so three.js stays out
 * of the server bundle and off the critical path — the hero renders immediately
 * with its photo slides, and the canvas fades in once loaded.
 */
const HeroScene3D = dynamic(() => import('./three/HeroScene3D'), { ssr: false });

const WHATSAPP = 'https://wa.me/201092048333';

/* count-up hook (respects reduced motion) */
function useCountUp(target: number, dec = 0, ms = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0; let done = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || done) return;
        done = true; io.disconnect();
        if (reduce) { setVal(target); return; }
        let start = 0;
        const step = (ts: number) => {
          if (!start) start = ts;
          const pr = Math.min((ts - start) / ms, 1);
          setVal(target * (1 - Math.pow(1 - pr, 3)));
          if (pr < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, dec, ms, reduce]);
  return { ref, text: val.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') };
}

function Stat({ value, dec, prefix, suffix, label }: { value: number; dec?: number; prefix?: string; suffix?: string; label: string }) {
  const { ref, text } = useCountUp(value, dec ?? 0);
  return (
    <div className="stat">
      <b ref={ref as React.RefObject<HTMLElement>}>{prefix ?? ''}{text}{suffix ?? ''}</b>
      <span>{label}</span>
    </div>
  );
}

export default function HomePortal() {
  const { t, locale } = useT();
  const isAr = locale === 'ar';
  const [listings, setListings] = useState<Listing[]>(FALLBACK_LISTINGS);
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetchListings(12).then((live) => { if (!cancelled && live.length) setListings(live); });
    return () => { cancelled = true; };
  }, []);

  // hero auto-advance
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6500);
    return () => clearInterval(id);
  }, [reduce]);

  const featured = listings.slice(0, 6);
  const heroMain = isAr ? SLIDES[slide].mainAr : SLIDES[slide].main;
  const heroPre = isAr ? SLIDES[slide].preAr : SLIDES[slide].pre;
  const heroWords = heroMain.split(' ');
  const heroHl = heroWords.splice(-3).join(' ');

  const compoundPicks = ['Hyde Park New Cairo', 'Mivida', 'Mountain View iCity', 'Eastown (SODIC)'];
  const ticker = isAr
    ? ['ماونتن فيو +24%', 'أب تاون كايرو +31%', 'ميفيدا إيجار من $1,700/شهر', 'هايد بارك AI 9.8', 'فيليت عائد 8.1%', 'تاج سيتي طلب متزايد']
    : ['Mountain View iCity +24%', 'Uptown Cairo +31%', 'Mivida rentals from $1,700/mo', 'Hyde Park AI score 9.8', 'Villette yield 8.1%', 'Taj City demand rising'];
  const tickerRow = [...ticker, ...ticker];

  const aiTools: { key: string; t: any; s: any; live?: boolean; href: string }[] = [
    { key: 'engine', t: 'ai1t', s: 'ai1s', live: true, href: '/compounds' },
    { key: 'match', t: 'ai2t', s: 'ai2s', href: '/properties' },
    { key: 'roi', t: 'ai3t', s: 'ai3s', href: '/compounds' },
    { key: 'price', t: 'ai4t', s: 'ai4s', href: '/compounds' },
    { key: 'dream', t: 'ai5t', s: 'ai5s', href: '/properties' },
    { key: 'imap', t: 'ai6t', s: 'ai6s', href: '/compounds' },
    { key: 'tour', t: 'ai7t', s: 'ai7s', href: '/virtual-tour' },
  ];

  return (
    <div className="hz" dir={isAr ? 'rtl' : 'ltr'}>
      <Topbar />
      <Nav active="home" />

      {/* HERO */}
      <header className="hero">
        <div>
          {SLIDES.map((s, i) => (
            <div key={i} className={`slide${i === slide ? ' on' : ''}`}>
              <img src={s.img} alt="" />
            </div>
          ))}
        </div>
        <div className="scrim" />
        <HeroScene3D />
        <div className="wrap">
          <div className="h-eyebrow">{heroPre}</div>
          <h1>{heroWords.join(' ')} <span className="hl">{heroHl}</span></h1>
          <p className="sub">{t('heroSub')}</p>
          <div className="quick">
            <span><IconBadgeCheck size={16} /> {t('q1')}</span>
            <span><IconMap size={16} /> {t('q2')}</span>
            <span><IconShield size={16} /> {t('q3')}</span>
          </div>
          <div className="hero-cta">
            <Link href="/explore" className="btn btn-pri"><IconMap size={16} /> <span>{t('heroExplore')}</span></Link>
            <Link href="/properties" className="btn btn-ghost"><IconSearch size={16} /> <span>{t('viewAll')}</span></Link>
          </div>
        </div>
        <div className="dots wrap" style={{ left: 'auto' }}>
          {SLIDES.map((_, i) => (
            <button key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </header>

      {/* SEARCH CARD */}
      <div className="wrap searchbar">
        <Reveal className="search-card">
          <div className="search-tabs">
            {[t('tabBuy'), t('tabRent'), t('tabNew')].map((label, i) => (
              <button key={i} className={i === tab ? 'active' : ''} onClick={() => setTab(i)} type="button">{label}</button>
            ))}
          </div>
          <div className="search-fields">
            <div className="field"><label>{t('fLoc')}</label><div className="val"><IconMapPin size={17} /> <span>{t('vLoc')}</span> <IconChevronDown className="i chev" size={16} /></div></div>
            <div className="field"><label>{t('fType')}</label><div className="val"><span>{t('vType')}</span> <IconChevronDown className="i chev" size={16} /></div></div>
            <div className="field"><label>{t('fBeds')}</label><div className="val"><span>{t('vBeds')}</span> <IconChevronDown className="i chev" size={16} /></div></div>
            <div className="field"><label>{t('fPrice')}</label><div className="val"><span>{t('vPrice')}</span> <IconChevronDown className="i chev" size={16} /></div></div>
            <div className="field searchbtn"><Link href="/properties" className="btn btn-pri"><IconSearch size={16} /> <span>{t('search')}</span></Link></div>
          </div>
        </Reveal>
      </div>

      {/* TICKER */}
      <div className="ticker"><div className="row">{tickerRow.map((s, i) => <span key={i}>{s}</span>)}</div></div>

      {/* FEATURED */}
      <section className="block" id="properties">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">{t('eyeList')}</div>
              <h2>{t('featTit')}</h2>
              <p>{t('featSub')}</p>
            </div>
            <Link href="/properties" className="sec-link"><span>{t('viewAll')}</span> <IconArrowRight size={16} /></Link>
          </Reveal>
          <div className="grid-props">
            {featured.map((p, i) => <PropertyCard key={p.id} p={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* COMPOUNDS */}
      <section className="block well" id="compounds">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">{t('eyeCpd')}</div>
              <h2>{t('cpdTit')}</h2>
              <p>{t('cpdSub')}</p>
            </div>
            <Link href="/compounds" className="sec-link"><span>{t('allCpds')}</span> <IconArrowRight size={16} /></Link>
          </Reveal>
          <div className="grid-comp">
            {compoundPicks.map((n, i) => {
              const c = COMPOUNDS.find((x) => x.n === n)!;
              return (
                <Reveal key={n} delay={i * 0.08}>
                  <Link className="comp" href="/compounds" style={{ height: 250, display: 'block' }}>
                    <img src={COMPOUND_IMGS[n]} alt={c.n} loading="lazy" />
                    <div className="co-scrim" />
                    <div className="co-count">AI {c.ai.toFixed(1)} · {c.g}</div>
                    <div className="co-body"><h4>{c.n}</h4><span>{c.z} · EGP {c.priceM}M avg</span></div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>


      {/* STATS */}
      <section className="stats">
        <div className="wrap">
          <Stat value={1240} suffix="+" label={t('stat1')} />
          <Stat value={29} label={t('stat2')} />
          <Stat value={68} label={t('stat3')} />
          <Stat value={4.2} dec={1} prefix="EGP " suffix="B" label={t('stat4')} />
        </div>
      </section>

      {/* WHY */}
      <section className="block" id="agents">
        <div className="wrap">
          <Reveal className="sec-head" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{t('eyeWhy')}</div>
              <h2>{t('whyTit')}</h2>
              <p style={{ marginInline: 'auto' }}>{t('whySub')}</p>
            </div>
          </Reveal>
          <div className="grid-feat">
            {([
              [IconRadar, 'w1t', 'w1s'], [IconTrendingUp, 'w2t', 'w2s'],
              [IconHandshake, 'w3t', 'w3s'], [IconBadgeCheck, 'w4t', 'w4s'],
            ] as const).map(([Icon, tk, sk], i) => (
              <Reveal key={tk} delay={i * 0.08} className="feat">
                <div className="ic"><Icon size={24} /></div>
                <h4>{t(tk)}</h4><p>{t(sk)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="block testi-band" id="testimonials">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">{t('eyeTesti')}</div>
              <h2>{t('testiTit')}</h2>
              <p>{t('testiSub')}</p>
            </div>
          </Reveal>
          <div className="grid-testi">
            {[1, 2, 3].map((n, i) => {
              const nm = t(`t${n}n` as any);
              return (
                <Reveal key={n} delay={i * 0.08} className="tcard">
                  <div className="stars">{[0, 1, 2, 3, 4].map((k) => <IconStar key={k} size={15} />)}</div>
                  <p>“{t(`t${n}q` as any)}”</p>
                  <div className="who">
                    <span className="av">{nm.split(' ').slice(0, 2).map((w: string) => w[0]).join('')}</span>
                    <span><b>{nm}</b><small>{t(`t${n}r` as any)}</small></span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERFECT + INQUIRY */}
      <section className="block" id="inquiry">
        <div className="wrap">
          <Reveal className="perfect">
            <div className="pf-left">
              <div className="eyebrow" style={{ color: '#8fe1ff' }}>{t('eyePerfect')}</div>
              <h2>{t('perfTit')}</h2>
              <p>{t('perfSub')}</p>
              {([['01', 'pc1t', 'pc1s'], ['02', 'pc2t', 'pc2s'], ['03', 'pc3t', 'pc3s']] as const).map(([num, tk, sk]) => (
                <div className="pf-item" key={num}><span className="num">{num}</span><div><h4>{t(tk)}</h4><p>{t(sk)}</p></div></div>
              ))}
            </div>
            <InquiryForm />
          </Reveal>
        </div>
      </section>

      {/* AI HUB */}
      <section className="ai-hub" id="ai">
        <div className="wrap">
          <Reveal><div className="ai-eye"><span className="live" /> <span>{t('aiEye')}</span></div></Reveal>
          <Reveal delay={0.05}><h2>{t('aiTit')}</h2></Reveal>
          <Reveal delay={0.1}><p className="ai-lead">{t('aiSub')}</p></Reveal>
          <div className="ai-scan" />
          <div className="ai-grid">
            {aiTools.map((tool, i) => (
              <Reveal key={tool.key} delay={(i % 4) * 0.06}>
                <Link className="ai-card" href={tool.href}>
                  <span className="ai-ic"><IconSparkles size={30} /></span>
                  <h4>{t(tool.t)}</h4>
                  <p>{t(tool.s)}</p>
                  {tool.live && <span className="live-tag">{t('aiLive')}</span>}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="block" id="contact" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="cta">
            <div className="ct-txt">
              <h2>{t('ctaTit')}</h2>
              <p>{t('ctaSub')}</p>
            </div>
            <div className="ct-act">
              <a className="btn btn-white" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconPlus size={16} /> <span>{t('ctaBtn1')}</span></a>
              <a className="btn btn-out" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconPhone size={16} /> <span>{t('ctaBtn2')}</span></a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PARTNERS */}
      <div className="partners">
        <div className="wrap">
          <Reveal className="p-eye">{t('partEye')}</Reveal>
          <Reveal delay={0.08} className="row">
            {['EMAAR MISR', 'SODIC', 'MOUNTAIN VIEW', 'PALM HILLS', 'ORA', 'LA VISTA', 'HYDE PARK', 'MARAKEZ'].map((p) => <span key={p}>{p}</span>)}
          </Reveal>
        </div>
      </div>

      {/* WHATSAPP FAB */}
      <a className="wa-fab" href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <span className="wa-fab-label">Chat with us</span>
        <span className="wa-fab-pulse" />
      </a>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <a href="/" className="bn-item active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="i"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg><span>{t('navHome')}</span></a>
        <Link href="/properties" className="bn-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="i"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><span>{t('navProps')}</span></Link>
        <Link href="/compounds" className="bn-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="i"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span>{t('navCpds')}</span></Link>
        <Link href="/explore" className="bn-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="i"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg><span>{t('navExplore')}</span></Link>
        <a href={WHATSAPP} className="bn-item" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="i"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg><span>{t('navContact')}</span></a>
      </nav>

      <Footer />
      <SierraConcierge />
    </div>
  );
}

/* ── Inquiry form → real POST /api/leads ─────────────────────────────────── */
function InquiryForm() {
  const { t, locale } = useT();
  const [seg, setSeg] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', zone: '', type: '', budget: '', });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err' | 'name'>('idle');

  const zones = useMemo(() => [t('z1'), t('z2'), t('z3'), t('z4')], [t]);
  const types = useMemo(() => [t('lVilla'), t('lApt'), t('lTwin'), t('lPent')], [t]);

  const intents = [t('inqBuy'), t('inqRent'), t('inqSell')];

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setStatus('name'); return; }
    setStatus('sending');
    // Compose a rich message the admin S1 pipeline can read.
    const message = [
      `Intent: ${intents[seg]}`,
      form.zone && `Preferred zone: ${form.zone}`,
      form.type && `Property type: ${form.type}`,
      form.budget && `Budget (EGP): ${form.budget}`,
    ].filter(Boolean).join(' · ');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          message,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok && data?.success ? 'ok' : 'err');
      if (res.ok && data?.success) setForm({ name: '', phone: '', email: '', zone: '', type: '', budget: '' });
    } catch {
      setStatus('err');
    }
  }

  return (
    <form className="inq" onSubmit={submit}>
      <h3>{t('inqTit')}</h3>
      <p>{t('inqSub')}</p>
      <div className="seg">
        {intents.map((label, i) => (
          <button key={i} type="button" className={i === seg ? 'on' : ''} onClick={() => setSeg(i)}>{label}</button>
        ))}
      </div>
      <div className="frow">
        <div><label>{t('inqName')}</label><input value={form.name} onChange={(e) => set('name', e.target.value)} type="text" /></div>
        <div><label>{t('inqPhone')}</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} type="tel" dir="ltr" /></div>
      </div>
      <div className="frow">
        <div><label>{t('inqEmail')}</label><input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" dir="ltr" /></div>
        <div><label>{t('inqZone')}</label><select value={form.zone} onChange={(e) => set('zone', e.target.value)}><option value="">—</option>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select></div>
      </div>
      <div className="frow">
        <div><label>{t('inqType2')}</label><select value={form.type} onChange={(e) => set('type', e.target.value)}><option value="">—</option>{types.map((z) => <option key={z} value={z}>{z}</option>)}</select></div>
        <div><label>{t('inqBudget')}</label><input value={form.budget} onChange={(e) => set('budget', e.target.value)} type="text" placeholder="10,000,000" dir="ltr" /></div>
      </div>
      <button className="btn btn-pri" type="submit" disabled={status === 'sending'}>
        <IconSend size={16} /> <span>{status === 'sending' ? t('inqSending') : t('inqSend')}</span>
      </button>
      {status === 'ok' && <div className="form-note ok">{t('inqOk')}</div>}
      {status === 'err' && <div className="form-note err">{t('inqErr')}</div>}
      {status === 'name' && <div className="form-note err">{t('inqNameReq')}</div>}
    </form>
  );
}
