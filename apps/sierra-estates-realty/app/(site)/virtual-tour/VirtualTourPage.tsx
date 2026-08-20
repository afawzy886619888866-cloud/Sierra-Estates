'use client';

/** Port of deploy/virtual-tour.html — the full-page 3D walkthrough. */
import React from 'react';
import Link from 'next/link';
import { Video, DoorOpen, Glasses, Grid2x2, ArrowRight } from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import VirtualTourBanner from '@/components/site/VirtualTourBanner';
import { Reveal, RevealGroup, revealChild } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: Video, en: 'Cinematic 4K capture', ar: 'تصوير سينمائي 4K', descEn: 'Every room shot in high dynamic range so materials, light and depth read true.', descAr: 'كل غرفة مصوّرة بمدى ديناميكي عالٍ لتظهر الخامات والإضاءة والعمق على حقيقتها.' },
  { icon: DoorOpen, en: 'Room-by-room walkthrough', ar: 'تجوّل غرفة بغرفة', descEn: 'Move through the unit the way you would on a viewing — at your own pace.', descAr: 'تنقّل داخل الوحدة كما لو كنت في معاينة حقيقية، وبالسرعة التي تريدها.' },
  { icon: Glasses, en: 'VR-ready', ar: 'جاهز لنظارات VR', descEn: 'Open the same tour in a headset for a true sense of scale.', descAr: 'افتح نفس الجولة عبر نظارة الواقع الافتراضي لإحساس حقيقي بالمساحة.' },
  { icon: Grid2x2, en: 'Measured floor plan', ar: 'مخطط بمقاسات دقيقة', descEn: 'Switch to the dollhouse view to check flow and room proportions.', descAr: 'انتقل لعرض المخطط لتتأكد من توزيع المساحات والنسب.' },
];

export default function VirtualTourPage() {
  const { isAr } = useSite();

  return (
    <SiteShell active={null}>
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="sep">/</span>
            <span>{isAr ? 'الجولة ثلاثية الأبعاد' : '3D Virtual Tour'}</span>
          </div>
          <h1>{isAr ? 'الجولة ثلاثية الأبعاد' : '3D Virtual Tour'}</h1>
          <p className="sub">
            {isAr
              ? 'تجوّل داخل وحدات سييرا المميزة قبل أن تحجز معاينة — بدقة سينمائية ومن أي جهاز.'
              : 'Walk through Sierra’s signature units before you book a viewing — cinematic fidelity, from any device.'}
          </p>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <VirtualTourBanner />
        </div>
      </section>

      <section className="block well">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <h2>{isAr ? 'ما الذي يميز جولة سييرا' : 'What makes a Sierra tour different'}</h2>
              <p>
                {isAr
                  ? 'ليست صورًا بانورامية — بل نموذج مكاني كامل تتحرك بداخله.'
                  : 'Not a panorama reel — a full spatial model you actually move through.'}
              </p>
            </div>
          </Reveal>

          <RevealGroup className="grid-feat">
            {FEATURES.map((f) => (
              <motion.div className="feat" key={f.en} variants={revealChild}>
                <div className="ic"><f.icon className="i" /></div>
                <h4>{isAr ? f.ar : f.en}</h4>
                <p>{isAr ? f.descAr : f.descEn}</p>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <Reveal className="cta">
            <div className="ct-txt">
              <h2>{isAr ? 'شفت وحدة عجبتك؟' : 'Seen a unit you like?'}</h2>
              <p>
                {isAr
                  ? 'احجز معاينة على الطبيعة، أو اطلب جولة مخصصة لوحدة بعينها.'
                  : 'Book a viewing on site, or ask us to capture a tour for a specific unit.'}
              </p>
            </div>
            <div className="ct-act">
              <Link href="/properties" className="btn btn-white">
                <span>{isAr ? 'تصفح الوحدات' : 'Browse listings'}</span>
                <ArrowRight className="i" />
              </Link>
              <a
                href="https://wa.me/201092048333"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-out"
              >
                <span>+2 01092048333</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
