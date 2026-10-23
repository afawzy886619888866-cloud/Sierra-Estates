'use client';

/**
 * Direct Live 3D Virtual Tour Viewer.
 * Embeds the real listing3d.com walkthrough directly with interactive controls.
 */
import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Video, DoorOpen, Glasses, Grid2x2, Loader2, ExternalLink, Maximize2, RotateCcw
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export const TOUR_SRC = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';

export default function VirtualTourBanner() {
  const { isAr } = useSite();
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  const pills = [
    { icon: Video, en: '4K HDR Cinema', ar: 'دقة 4K سينمائية' },
    { icon: DoorOpen, en: 'Room-by-Room Walk', ar: 'تنقل كامل بين الغرف' },
    { icon: Glasses, en: 'VR Compatible', ar: 'متوافق مع نظارات VR' },
    { icon: Grid2x2, en: 'Interactive Floor Plan', ar: 'مخطط تفاعلي' },
  ];

  function goFullscreen() {
    const el = bannerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  function reloadTour() {
    setLoaded(false);
    setKey((k) => k + 1);
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Feature pill bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pills.map((p) => (
            <span
              key={p.en}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(233, 193, 118, 0.08)',
                border: '1px solid rgba(233, 193, 118, 0.25)',
                color: '#E9C176',
              }}
            >
              <p.icon style={{ width: 14, height: 14 }} />
              <span>{isAr ? p.ar : p.en}</span>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={reloadTour}
            title={isAr ? 'إعادة تحميل' : 'Reset view'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--surface-2, rgba(255,255,255,0.06))',
              border: '1px solid var(--line, rgba(255,255,255,0.15))',
              color: 'var(--ink, #fff)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ width: 13, height: 13 }} />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
          <a
            href={TOUR_SRC}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #e9c176, #c8961a)',
              color: '#071523',
              boxShadow: '0 4px 14px rgba(200, 150, 26, 0.25)',
            }}
          >
            <ExternalLink style={{ width: 13, height: 13 }} />
            <span>{isAr ? 'افتح بملء الشاشة' : 'Open in New Tab'}</span>
          </a>
        </div>
      </div>

      {/* Main Direct Interactive 3D Frame */}
      <motion.div
        ref={bannerRef}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          width: '100%',
          height: '620px',
          minHeight: '480px',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(233, 193, 118, 0.2)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
          background: '#071523',
        }}
      >
        {!loaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'linear-gradient(180deg, #0a1b2d 0%, #06111d 100%)',
            color: '#E9C176',
            zIndex: 2,
          }}>
            <Loader2 style={{ width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1' }}>
              {isAr ? 'جارٍ تحميل الجولة ثلاثية الأبعاد…' : 'Loading direct 3D virtual tour…'}
            </span>
          </div>
        )}

        <iframe
          key={key}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
          }}
          title={isAr ? 'جولة ثلاثية الأبعاد' : '3D Virtual Tour'}
          src={TOUR_SRC}
          allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />

        {loaded && (
          <button
            type="button"
            onClick={goFullscreen}
            aria-label={isAr ? 'ملء الشاشة' : 'Enter fullscreen'}
            style={{
              position: 'absolute',
              insetInlineEnd: 16,
              top: 16,
              zIndex: 10,
              display: 'grid',
              placeItems: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(7, 21, 35, 0.85)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            }}
          >
            <Maximize2 style={{ width: 18, height: 18 }} />
          </button>
        )}
      </motion.div>
    </div>
  );
}
