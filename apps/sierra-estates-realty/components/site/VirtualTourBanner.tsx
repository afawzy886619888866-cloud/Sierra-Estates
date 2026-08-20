'use client';

/**
 * 3D tour banner — the real listing3d.com walkthrough.
 * The poster is the visible default; the iframe only mounts once the visitor
 * asks for it, so the embed stays off the initial critical path.
 */
import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Play, Video, DoorOpen, Glasses, Grid2x2, Loader2, ExternalLink, Maximize2,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export const TOUR_SRC = 'https://listing3d.com/embed/r39d0bd4dde0a4fe693c7fe5fd230a896';

const POSTER =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80';

export default function VirtualTourBanner() {
  const { isAr } = useSite();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const pills = [
    { icon: Video, en: '4K HDR', ar: 'دقة 4K' },
    { icon: DoorOpen, en: 'Room-by-room', ar: 'غرفة بغرفة' },
    { icon: Glasses, en: 'VR-ready', ar: 'جاهز للنظارات' },
    { icon: Grid2x2, en: 'Floor plan', ar: 'مخطط الوحدة' },
  ];

  function goFullscreen() {
    const el = bannerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <>
      <motion.div
        ref={bannerRef}
        className="vt-banner"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {!active ? (
          <button
            type="button"
            className="vt-poster"
            onClick={() => setActive(true)}
            aria-label={isAr ? 'تشغيل الجولة ثلاثية الأبعاد' : 'Launch the 3D virtual tour'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POSTER} alt="" />
            <span className="vt-scrim" />

            <span className="vt-copy">
              <span className="vt-live">{isAr ? 'مباشر · سييرا 3D' : 'Live · Sierra 3D'}</span>
              <h3>
                {isAr ? (
                  <>تجوّل في منزلك القادم <em>قبل أن تزوره</em></>
                ) : (
                  <>Walk through your next home <em>before you visit</em></>
                )}
              </h3>
              <p>
                {isAr
                  ? 'كل وحدة عند سييرا مصوّرة بدقة سينمائية. تنقّل بين الغرف، أطل على الحديقة، وقيّم المساحة من شاشتك في ثوانٍ.'
                  : 'Every Sierra listing is captured in cinematic 4K. Move room to room, look out over the garden, and judge the space from your screen in seconds.'}
              </p>
              <span className="vt-pills">
                {pills.map((p) => (
                  <span key={p.en}><p.icon /> {isAr ? p.ar : p.en}</span>
                ))}
              </span>
            </span>

            <span className="vt-play">
              <span className="disc"><Play fill="currentColor" /></span>
              <span className="label">{isAr ? 'ابدأ الجولة' : 'Launch tour'}</span>
            </span>
          </button>
        ) : (
          <>
            {!loaded && (
              <div className="vt-loading">
                <Loader2 />
                <span>{isAr ? 'جارٍ تحميل الجولة…' : 'Loading immersive 3D tour…'}</span>
              </div>
            )}
            <iframe
              className={`vt-frame${loaded ? ' on' : ''}`}
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
                  position: 'absolute', insetInlineEnd: 14, top: 14, zIndex: 3,
                  display: 'grid', placeItems: 'center', width: 38, height: 38,
                  borderRadius: 10, border: '1px solid rgba(255,255,255,.24)',
                  background: 'rgba(10,22,34,.72)', color: '#fff', cursor: 'pointer',
                }}
              >
                <Maximize2 style={{ width: 16, height: 16 }} />
              </button>
            )}
          </>
        )}
      </motion.div>

      <div className="vt-below">
        <a href={TOUR_SRC} target="_blank" rel="noopener noreferrer">
          <ExternalLink /> {isAr ? 'افتح الجولة في تبويب جديد' : 'Open tour in a new tab'}
        </a>
        <span>{isAr ? 'تصوير سينمائي · بدقة Matterport' : 'Cinematic capture · Matterport-grade fidelity'}</span>
      </div>
    </>
  );
}
