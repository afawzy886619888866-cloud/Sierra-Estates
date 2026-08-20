'use client';

/** Hero slideshow — port of the hero block + slide logic in deploy/index.html. */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Map, ShieldCheck } from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { GsapMagnetic } from './GsapAnimations';

interface Slide { pre: string; preAr: string; main: string; mainAr: string; img: string }

/** Last three words of the headline render in the gold highlight span. */
function splitHeadline(text: string) {
  const words = text.split(' ');
  const hl = words.splice(-3).join(' ');
  return { lead: words.join(' '), hl };
}

export default function HomeHero() {
  const { t, isAr } = useSite();
  const slides = HZDATA.slides as Slide[];

  const [cur, setCur] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [captionOut, setCaptionOut] = useState(false);
  const firstPaint = useRef(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCur((prev) => {
        const next = (prev + 1) % slides.length;
        setLeaving(prev);
        window.setTimeout(() => setLeaving(null), 1500);
        return next;
      });
      // Fade the caption out, swap copy at the midpoint, fade back in.
      setCaptionOut(true);
      window.setTimeout(() => setCaptionOut(false), 320);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const go = (n: number) => {
    if (n === cur) return;
    setLeaving(cur);
    window.setTimeout(() => setLeaving(null), 1500);
    setCaptionOut(true);
    window.setTimeout(() => setCaptionOut(false), 320);
    setCur(n);
    firstPaint.current = false;
  };

  const s = slides[cur];
  const { lead, hl } = splitHeadline(isAr ? s.mainAr : s.main);

  const captionStyle: React.CSSProperties = {
    transition: 'opacity .45s var(--ease-out),transform .45s var(--ease-out)',
    opacity: captionOut ? 0 : 1,
    transform: captionOut ? 'translateY(10px)' : 'translateY(0)',
  };

  return (
    <header className="hero">
      <div id="hero-slides">
        {slides.map((sl, i) => (
          <div
            key={i}
            className={`slide${i === cur ? ' on' : ''}${leaving === i ? ' leaving' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sl.img} alt="" />
          </div>
        ))}
      </div>
      <div className="scrim" />
      <div className="grain" aria-hidden="true" />

      <div className="wrap">
        <div className="hero-col">
          <div className="h-eyebrow" id="hero-pre" style={captionStyle}>
            {isAr ? s.preAr : s.pre}
          </div>
          <h1 id="hero-main" style={captionStyle}>
            {lead} <span className="hl">{hl}</span>
          </h1>
          <p className="sub">{t('heroSub')}</p>
          <div className="quick">
            <span><BadgeCheck className="i" /> <span>{t('q1')}</span></span>
            <span><Map className="i" /> <span>{t('q2')}</span></span>
            <span><ShieldCheck className="i" /> <span>{t('q3')}</span></span>
          </div>
        </div>
      </div>

      <GsapMagnetic className="map-cta-wrap">
        <Link className="map-cta" href="/compounds" title="Explore New Cairo compounds on map">
          <span className="mc-ic"><Map className="i" /></span>
          <span>{t('exploreMapBtn')}</span>
        </Link>
      </GsapMagnetic>

      <div className="dots wrap" id="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === cur ? 'on' : undefined}
            aria-label={`Slide ${i + 1}`}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="page-laser" aria-hidden="true">
        <div className="page-laser-beam" />
      </div>
    </header>
  );
}
