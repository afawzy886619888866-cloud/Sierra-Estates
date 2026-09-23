'use client';

/** Hero slideshow — port of the hero block + slide logic in deploy/index.html. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Map, ShieldCheck, Sparkles } from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

interface Slide {
  id?: number | string;
  pre: string;
  preAr: string;
  main: string;
  mainAr: string;
  sub?: string;
  subAr?: string;
  img: string;
  objectPosition?: string;
  href?: string;
  badge?: string;
  badgeAr?: string;
  cta?: string;
  ctaAr?: string;
}

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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const firstPaint = useRef(true);
  const timerRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    setPointer({ x: Math.round(xPct), y: Math.round(yPct) });
    setTilt({ x: normX * 18, y: normY * 18 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
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
  }, [slides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const go = (n: number) => {
    if (n === cur) return;
    setLeaving(cur);
    window.setTimeout(() => setLeaving(null), 1500);
    setCaptionOut(true);
    window.setTimeout(() => setCaptionOut(false), 320);
    setCur(n);
    firstPaint.current = false;
    // Restart the auto-advance timer so a manual selection isn't immediately
    // overridden by the old cycle.
    startTimer();
  };

  const s = slides[cur];
  const { lead, hl } = splitHeadline(isAr ? s.mainAr : s.main);

  const captionStyle: React.CSSProperties = {
    transition: 'opacity .45s var(--ease-out),transform .45s var(--ease-out)',
    opacity: captionOut ? 0 : 1,
    transform: captionOut ? 'translateY(10px)' : 'translateY(0)',
  };

  return (
    <header
      className="hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Quiet Luxury Gold Spotlight */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background: `radial-gradient(850px circle at ${pointer.x}% ${pointer.y}%, rgba(200, 150, 26, 0.14) 0%, transparent 65%)`,
          transition: 'background 0.15s ease-out',
        }}
      />

      <div id="hero-slides">
        {slides.map((sl, i) => (
          <div
            key={i}
            className={`slide${i === cur ? ' on' : ''}${leaving === i ? ' leaving' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sl.img}
              alt=""
              style={{
                transform: `translate3d(${tilt.x * -0.6}px, ${tilt.y * -0.6}px, 0) scale(1.04)`,
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
                ...(sl.objectPosition ? { objectPosition: sl.objectPosition } : {}),
              }}
            />
          </div>
        ))}
      </div>
      <div className="scrim" />
      <div className="grain" aria-hidden="true" />

      <div className="wrap">
        <div
          className="hero-col"
          style={{
            transform: `translate3d(${tilt.x * 0.4}px, ${tilt.y * 0.4}px, 0)`,
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          {/* Glowing Laser Tag */}
          <div className="laser-badge" style={captionStyle}>
            <span className="laser-badge-dot" />
            <span className="laser-badge-text">
              {isAr
                ? (s.badgeAr || '⚡ رادار الذكاء الاصطناعي · القاهرة الجديدة')
                : (s.badge || '⚡ AI LASER RADAR · NEW CAIRO LUXURY')}
            </span>
          </div>

          <div className="h-eyebrow" id="hero-pre" style={captionStyle}>
            {isAr ? s.preAr : s.pre}
          </div>
          <h1 id="hero-main" style={captionStyle}>
            {lead} <span className="hl">{hl}</span>
          </h1>
          <p className="sub" style={captionStyle}>
            {isAr ? (s.subAr || t('heroSub')) : (s.sub || t('heroSub'))}
          </p>

          {s.href ? (
            <div style={{ marginTop: '22px', display: 'flex', gap: '12px', flexWrap: 'wrap', ...captionStyle }}>
              <Link
                href={isAr ? `/ar${s.href}` : s.href}
                className="btn-hero-cinematic"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #DFAD3A 0%, #B38624 100%)',
                  color: '#0a1622',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(223, 173, 58, 0.35)',
                  transition: 'all 0.3s ease',
                }}
              >
                <span>{isAr ? (s.ctaAr || 'عرض تفاصيل المشروع') : (s.cta || 'Explore Project Evidence')}</span>
                <ArrowRight className="i" style={{ width: 16, height: 16 }} />
              </Link>
              <Link
                href={isAr ? `/ar${s.href}/inventory` : `${s.href}/inventory`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <span>{isAr ? 'الوحدات المتاحة والأسعار' : 'Available Inventory & Yields'}</span>
              </Link>
            </div>
          ) : (
            <>
              {cur === 0 && (
                <p
                  className="hero-punchline"
                  style={{
                    marginTop: '16px',
                    fontSize: 'clamp(14px, 1.15vw, 16px)',
                    lineHeight: 1.7,
                    color: 'rgba(235, 206, 140, 0.94)',
                    maxWidth: '780px',
                    fontWeight: 400,
                    textShadow: '0 1px 12px rgba(0,0,0,0.5)'
                  }}
                >
                  {t('heroPunchline')}
                </p>
              )}
              <div className="quick">
                <span><BadgeCheck className="i" /> <span>{t('heroBadgeAgencies') || t('q1')}</span></span>
                <span><ShieldCheck className="i" /> <span>{t('heroBadgeBrokers') || t('q2')}</span></span>
                <span><Sparkles className="i" /> <span>{t('heroBadgePricing') || t('q3')}</span></span>
              </div>
            </>
          )}
        </div>
      </div>

      <Link className="map-cta" href="/compounds" title="Explore New Cairo compounds on map">
        <span className="mc-ic"><Map className="i" /></span>
        <span>{t('exploreMapBtn')}</span>
      </Link>

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

      {/* Scroll-down indicator (animated laser line tag) */}
      <div className="scroll-cue" aria-hidden="true">
        <span className="scroll-cue-line" />
        <span className="scroll-cue-label">SCROLL</span>
      </div>

      <div className="page-laser" aria-hidden="true">
        <div className="page-laser-beam" />
      </div>
    </header>
  );
}
