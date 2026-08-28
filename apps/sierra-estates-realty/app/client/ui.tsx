'use client';
/* eslint-disable @next/next/no-img-element */
/**
 * Sierra Estates client portal — shared UI atoms.
 * PropertyCard, Reveal (framer-motion entrance), Chrome (topbar/nav/footer),
 * and the SierraConcierge chat panel (wired to POST /api/chat).
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useI18n } from '@/lib/I18nContext';
import { makeT } from './copy';
import { Listing, priceLabel } from './portalData';
import {
  IconPhone, IconMail, IconMapPin, IconUser, IconLanguages, IconHeart, IconPlus,
  IconBed, IconBath, IconScaling, IconGitCompare, IconShare, IconArrowRight,
  IconSend, IconX, IconGlobe, IconFacebook, IconInstagram, IconLinkedin, IconTwitter,
} from './icons';

export const SILK: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PHONE = '+2 01092048333';
const WHATSAPP = 'https://wa.me/201092048333';

/* Entrance reveal — translateY only, opacity ends at 1, respects reduced motion. */
export function Reveal({
  children, delay = 0, y = 24, className, style,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.7, ease: SILK, delay }}
    >
      {children}
    </motion.div>
  );
}

export function useT() {
  const { locale } = useI18n();
  return { t: makeT(locale), locale };
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function PropertyCard({ p, index = 0 }: { p: Listing; index?: number }) {
  const { t } = useT();
  const [liked, setLiked] = useState(false);
  const reduce = useReducedMotion();
  return (
    <motion.article
      className="pcard"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.5, ease: SILK, delay: (index % 6) * 0.06 }}
      whileHover={reduce ? undefined : { y: -5 }}
      data-type={p.type}
      data-mode={p.mode}
    >
      <div className="photo">
        <Link href={`/property/${p.id}`}>
          <img src={p.img} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
        </Link>
        <div className="badges">
          {p.tag ? <span className="tag featured">{p.tag}</span> : null}
          <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>{p.mode === 'rent' ? t('modeRent') : t('modeSale')}</span>
        </div>
        <button className={`heart${liked ? ' on' : ''}`} onClick={() => setLiked((v) => !v)} aria-label="save"><IconHeart size={18} /></button>
        <div className="price-float">{priceLabel(p)}</div>
        <div className="ai-score">AI {p.ai.toFixed(1)}</div>
      </div>
      <div className="body">
        <div className="ptype">{p.code} · {p.type}</div>
        <h3><Link href={`/property/${p.id}`}>{p.type} in {p.cmp}</Link></h3>
        <div className="addr"><IconMapPin size={15} /> {p.cmp}, {p.zone}</div>
        <div className="specs">
          <div><IconBed size={17} /><b>{p.beds}</b><span>{t('beds')}</span></div>
          <div><IconBath size={17} /><b>{p.bath}</b><span>{t('baths')}</span></div>
          <div><IconScaling size={17} /><b>{p.area}</b><span>m²</span></div>
        </div>
      </div>
      <div className="foot">
        <div className="agent"><span className="av">{initials(p.agent)}</span><small><b>{p.agent}</b>{p.ago}</small></div>
        <div className="foot-icons">
          <a aria-label="compare"><IconGitCompare size={15} /></a>
          <a aria-label="share"><IconShare size={15} /></a>
        </div>
      </div>
    </motion.article>
  );
}

export function Topbar() {
  const { t, locale } = useT();
  const { setLocale } = useI18n();
  return (
    <div className="topbar">
      <div className="wrap">
        <div className="tb-left">
          <span><IconPhone size={14} /> {PHONE}</span>
          <span><IconMail size={14} /> Info@sierra-estates.net</span>
          <span><IconMapPin size={14} /> {t('addr')}</span>
        </div>
        <div className="tb-right">
          <button className="tb-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} type="button">
            <IconLanguages size={13} /><span>{t('langBtn')}</span>
          </button>
          <div className="divider" />
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconUser size={14} /> <span>{t('signIn')}</span></a>
        </div>
      </div>
    </div>
  );
}

export function Nav({ active }: { active?: 'home' | 'props' | 'inv' | 'cpds' | 'explore' }) {
  const { t } = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap">
        <Link href="/" className="brand">
          <span className="mark"><IconGlobe size={22} /></span>
          <span><b>Sierra Estates</b><small>{t('brandSub')}</small></span>
        </Link>
        <div className="menu">
          <Link href="/" className={active === 'home' ? 'active' : ''}>{t('navHome')}</Link>
          <Link href="/properties" className={active === 'props' ? 'active' : ''}>{t('navProps')}</Link>
          <Link href="/inventory" className={active === 'inv' ? 'active' : ''}>{t('navInv')}</Link>
          <Link href="/compounds" className={active === 'cpds' ? 'active' : ''}>{t('navCpds')}</Link>
          <Link href="/explore" className={active === 'explore' ? 'active' : ''}>{t('navExplore')}</Link>
          <Link href="/#ai">{t('navAI')}</Link>
          <Link href="/#contact">{t('navContact')}</Link>
        </div>
        <div className="nav-right">
          <a className="nav-icon" aria-label="saved"><IconHeart size={21} /><span className="dot">3</span></a>
          <a className="btn btn-pri" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><IconPlus size={16} /> <span>{t('addListing')}</span></a>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  const { t } = useT();
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link href="/" className="brand">
              <span className="mark"><IconGlobe size={22} /></span>
              <span><b>Sierra Estates</b><small>{t('brandSub')}</small></span>
            </Link>
            <p className="blurb">{t('footBlurb')}</p>
            <div className="news"><input placeholder={t('footNews')} /><button type="button" aria-label="subscribe"><IconArrowRight size={16} /></button></div>
          </div>
          <div className="fcol"><h5>{t('fExplore')}</h5>
            <Link href="/properties">{t('fBuy')}</Link><Link href="/properties">{t('fRent')}</Link>
            <Link href="/properties">{t('fNew')}</Link><Link href="/compounds">{t('fCpds')}</Link>
            <a href={WHATSAPP}>{t('fAgent')}</a></div>
          <div className="fcol"><h5>{t('fCompany')}</h5>
            <a href="/#contact">{t('fAbout')}</a><a href="/#contact">{t('fBrokers')}</a>
            <a href="/#contact">{t('fJournal')}</a><a href="/#contact">{t('fCareers')}</a>
            <a href="/#contact">{t('fContact')}</a></div>
          <div className="fcol"><h5>{t('fDiscover')}</h5>
            <Link href="/compounds">{t('z1')}</Link><Link href="/compounds">{t('z2')}</Link>
            <Link href="/compounds">{t('z3')}</Link><Link href="/compounds">{t('z4')}</Link></div>
          <div className="fcol"><h5>{t('fTouch')}</h5>
            <div className="contact-line"><IconMapPin size={18} /><span>{t('fAddr')}</span></div>
            <div className="contact-line"><IconPhone size={18} /><span>{PHONE}</span></div>
            <div className="contact-line"><IconMail size={18} /><span>Info@sierra-estates.net</span></div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{t('rights')}</span>
          <div className="socials">
            <a aria-label="facebook"><IconFacebook size={16} /></a><a aria-label="instagram"><IconInstagram size={16} /></a>
            <a aria-label="linkedin"><IconLinkedin size={16} /></a><a aria-label="twitter"><IconTwitter size={16} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── AI concierge — real POST /api/chat ──────────────────────────────────── */
type ChatMsg = { role: 'bot' | 'user'; text: string };

function makeSessionId() {
  try {
    if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
      return `web-${window.crypto.randomUUID()}`;
    }
  } catch { /* noop */ }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SierraConcierge() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'bot', text: makeT('en')('chatGreeting') }]);
  const sessionId = useRef<string>('');
  const bodyRef = useRef<HTMLDivElement>(null);

  // Session persists in-memory for the tab; greeting re-localises when opened.
  useEffect(() => { if (!sessionId.current) sessionId.current = makeSessionId(); }, []);
  useEffect(() => {
    setMsgs((m) => (m.length === 1 && m[0].role === 'bot' ? [{ role: 'bot', text: t('chatGreeting') }] : m));
  }, [open, t]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [msgs, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = (data && (data.reply as string)) || t('inqErr');
      setMsgs((m) => [...m, { role: 'bot', text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: t('inqErr') }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="hz-chat-panel" role="dialog" aria-label={t('chatTitle')}>
          <div className="hz-chat-head">
            <span className="av">S</span>
            <div><b>{t('chatTitle')}</b><small>{t('chatStatus')}</small></div>
            <button className="x" onClick={() => setOpen(false)} aria-label="close">×</button>
          </div>
          <div className="hz-chat-body" ref={bodyRef}>
            {msgs.map((m, i) => <div key={i} className={`hz-msg ${m.role}`}>{m.text}</div>)}
            {busy && <div className="hz-msg bot typing">…</div>}
          </div>
          <form className="hz-chat-form" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('chatPlaceholder')} aria-label={t('chatPlaceholder')} />
            <button type="submit" disabled={busy || !input.trim()} aria-label="send"><IconSend size={18} /></button>
          </form>
        </div>
      )}
      <button className="hz-chat-fab" onClick={() => setOpen((v) => !v)} aria-label={t('chatTitle')}>
        {open ? <IconX size={24} /> : <IconMail size={24} />}
      </button>
    </>
  );
}
