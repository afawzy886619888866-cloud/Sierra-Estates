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
        <div className="wrap">
          <div className="h-eyebrow">{heroPre}</div>
          <h1>{heroWords.join(' ')} <span className="hl">{heroHl}</span></h1>
          <p className="sub">{t('heroSub')}</p>
          <div className="quick">
            <span><IconBadgeCheck size={16} /> {t('q1')}</span>
            <span><IconMap size={16} /> {t('q2')}</span>
            <span><IconShield size={16} /> {t('q3')}</span>
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
