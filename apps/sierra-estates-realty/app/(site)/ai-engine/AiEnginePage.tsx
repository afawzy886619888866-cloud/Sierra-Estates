'use client';

/** Port of deploy/ai-engine.html — the Intelligence Engine overview. */
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AiToolPage from '@/components/site/AiToolPage';
import { Reveal, RevealGroup, revealChild } from '@/components/site/Reveal';
import { AI_ICONS } from '@/components/site/AiIcons';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

const MODULES = [
  { k: 'match', href: '/matches', en: 'Smart Match', ar: 'المطابقة الذكية', dEn: 'Ranks live inventory against your budget, bedroom count and intent.', dAr: 'يرتّب المعروض حسب ميزانيتك وعدد الغرف والغرض.' },
  { k: 'price', href: '/pricing', en: 'AVM Pricing', ar: 'محرك التسعير', dEn: 'Values a unit against comparables by compound, type, area and finishing.', dAr: 'يقيّم الوحدة مقابل المثيل حسب الكمبوند والنوع والمساحة والتشطيب.' },
  { k: 'roi', href: '/roi', en: 'ROI Forecaster', ar: 'توقّع العائد', dEn: 'Projects capital growth plus rental yield across a chosen horizon.', dAr: 'يتوقّع نمو رأس المال والعائد الإيجاري عبر المدة المختارة.' },
  { k: 'dream', href: '/advice', en: 'Dream Home Advisor', ar: 'مستشار المنزل', dEn: 'Shortlists three units from what you say matters most.', dAr: 'يرشّح ثلاث وحدات بناءً على ما يهمّك أكثر.' },
  { k: 'imap', href: '/compounds', en: 'Compound Intelligence', ar: 'ذكاء الكمبوندات', dEn: 'Benchmarks 50+ compounds by score, growth and average price.', dAr: 'يقارن أكثر من 50 كمبوند بالتقييم والنمو ومتوسط السعر.' },
  { k: 'tour', href: '/virtual-tour', en: '3D Virtual Tour', ar: 'الجولة ثلاثية الأبعاد', dEn: 'Cinematic walkthroughs you can explore room by room.', dAr: 'جولات سينمائية تتنقل فيها غرفة بغرفة.' },
];

export default function AiEnginePage() {
  const { isAr } = useSite();
  const listings = HZDATA.listings as any[];
  const compounds = HZDATA.compounds as any[];

  const stats = [
    { v: compounds.length, en: 'compounds benchmarked', ar: 'كمبوند تحت التحليل' },
    { v: listings.length, en: 'live listings scored', ar: 'وحدة مقيّمة' },
    { v: 12, en: 'valuation signals', ar: 'مؤشر تقييم' },
    { v: 6, en: 'engines running', ar: 'محرك يعمل' },
  ];

  return (
    <AiToolPage
      crumb={isAr ? 'محرك الذكاء' : 'Intelligence Engine'}
      title={isAr ? 'محرك الذكاء العقاري' : 'Intelligence Engine'}
      sub={
        isAr
          ? 'ستة محركات تعمل على نفس البيانات الحية: التسعير، المطابقة، العائد، والتحليل المكاني.'
          : 'Six engines over one live dataset — pricing, matching, return, and spatial intelligence.'
      }
    >
      <section className="block">
        <div className="wrap">
          <RevealGroup className="stats-inline" >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18, marginBottom: 40 }}>
              {stats.map((s) => (
                <motion.div
                  key={s.en}
                  variants={revealChild}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 16, padding: '22px 20px',
                  }}
                >
                  <b style={{ fontFamily: 'var(--display)', fontSize: 34, display: 'block', lineHeight: 1 }}>{s.v}</b>
                  <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{isAr ? s.ar : s.en}</span>
                </motion.div>
              ))}
            </div>
          </RevealGroup>

          <Reveal className="sec-head">
            <div>
              <h2>{isAr ? 'المحركات' : 'The engines'}</h2>
              <p>{isAr ? 'كل واحد منها صفحة تعمل بالكامل.' : 'Each one is a working tool, not a teaser.'}</p>
            </div>
          </Reveal>

          <RevealGroup>
            <div className="ai-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 }}>
              {MODULES.map((m) => (
                <motion.div key={m.k} variants={revealChild}>
                  <Link href={m.href} className="ai-card" style={{ height: '100%' }}>
                    <span className="ai-ic">{AI_ICONS[m.k]}</span>
                    <h4>{isAr ? m.ar : m.en}</h4>
                    <p>{isAr ? m.dAr : m.dEn}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>
    </AiToolPage>
  );
}
