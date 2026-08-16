'use client';
/* eslint-disable @next/next/no-img-element */

/* ============================================================================
   SIERRA ESTATES — CLIENT HOMEPAGE
   Production React component tree with full Arabic & English support,
   full-page header navigation, interactive listing detail modals,
   mobile navigation drawer, GSAP-enhanced buttons, and WhatsApp FAB.
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/I18nContext';
import './client-home.css';

// Leaflet map — SSR-safe, client-only
const LiveMap = dynamic<{ mode?: 'dark' | 'light' }>(() => import('@/components/Maps/LiveMap'), { ssr: false });

const WHATSAPP = 'https://wa.me/201061399688';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Listing {
  id: string | number;
  title: string;
  location: string;
  code: string;
  type: string;
  beds: number;
  baths: number;
  area: number;
  priceLabel: string;
  usdEstimate?: string;
  aiScore: number;
  img: string;
  isOwner?: boolean;
  badge?: string | null;
  badgeColor?: string;
  description?: string;
  finishing?: string;
  delivery?: string;
}

/* ── Fallback listings (New Cairo luxury compounds) ─────────────────────── */
const FALLBACK: Listing[] = [
  {
    id: 1,
    title: 'Grand Villa',
    location: 'Hyde Park · New Cairo',
    code: 'HP-VL-04',
    type: 'Villa',
    beds: 5,
    baths: 5,
    area: 480,
    priceLabel: 'EGP 28.5M',
    usdEstimate: '$570,000',
    aiScore: 96,
    isOwner: true,
    badge: 'Direct Owner',
    badgeColor: '#C8961A',
    description: 'Prime standalone luxury villa overlooking the central park in Hyde Park, New Cairo. Features expansive private garden, private swimming pool, and smart home automation.',
    finishing: 'Core & Shell',
    delivery: 'Ready to Move',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=85'
  },
  {
    id: 2,
    title: 'Twin House',
    location: 'Mountain View iCity',
    code: 'MV-TH-02',
    type: 'Twin House',
    beds: 4,
    baths: 3,
    area: 280,
    priceLabel: 'EGP 15.5M',
    usdEstimate: '$310,000',
    aiScore: 92,
    isOwner: true,
    badge: 'Direct Owner',
    badgeColor: '#1E88D9',
    description: 'Modern twin house in Mountain View iCity with private rooftop terrace, landscaped garden, and direct access to the central lagoon and club.',
    finishing: 'Semi Finished',
    delivery: 'Immediate',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=85'
  },
  {
    id: 3,
    title: 'Garden Apartment',
    location: 'Mivida · Emaar',
    code: 'MVD-AP-11',
    type: 'Apartment',
    beds: 3,
    baths: 2,
    area: 145,
    priceLabel: 'EGP 6.8M',
    usdEstimate: '$136,000',
    aiScore: 94,
    isOwner: true,
    badge: 'Direct Owner',
    badgeColor: '#34D399',
    description: 'Ultra-finished ground floor apartment with a 90 m² private garden in Mivida by Emaar. Walk to the clubhouse and international schools.',
    finishing: 'Fully Finished Ultra Lux',
    delivery: 'Ready to Move',
    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=85'
  },
  {
    id: 4,
    title: 'Sky Penthouse',
    location: 'Uptown Cairo',
    code: 'UPT-PH-01',
    type: 'Penthouse',
    beds: 4,
    baths: 3,
    area: 300,
    priceLabel: 'EGP 18.5M',
    usdEstimate: '$370,000',
    aiScore: 95,
    isOwner: true,
    badge: 'Exclusive',
    badgeColor: '#7C3AED',
    description: 'Panoramic skyline penthouse atop Uptown Cairo with private infinity jacuzzi, double-height ceilings, and golf course views.',
    finishing: 'Fully Finished',
    delivery: 'Ready to Move',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85'
  },
  {
    id: 5,
    title: 'Signature Villa',
    location: 'Taj City',
    code: 'TJC-VL-07',
    type: 'Villa',
    beds: 5,
    baths: 5,
    area: 500,
    priceLabel: 'EGP 35.0M',
    usdEstimate: '$700,000',
    aiScore: 98,
    isOwner: false,
    badge: 'Premium',
    badgeColor: '#C8961A',
    description: 'Spacious bespoke villa located on the Ring Road corridor in Taj City, moments from Cairo International Airport and New Heliopolis.',
    finishing: 'Core & Shell',
    delivery: '6 Months',
    img: 'https://images.unsplash.com/photo-1613977257592-4a9a32f9141a?w=900&q=85'
  },
  {
    id: 6,
    title: 'Corner Villa',
    location: 'Villette · SODIC',
    code: 'VLT-VL-03',
    type: 'Villa',
    beds: 4,
    baths: 4,
    area: 390,
    priceLabel: 'EGP 24.5M',
    usdEstimate: '$490,000',
    aiScore: 94,
    isOwner: true,
    badge: 'Direct Owner',
    badgeColor: '#34D399',
    description: 'Corner standalone villa in Villette SODIC Golden Square. Features four pocket parks in surrounding clusters and prime orientation.',
    finishing: 'Semi Finished',
    delivery: 'Ready to Move',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&q=85'
  },
];

/* ── Bilingual copy ────────────────────────────────────────────────────── */
const COPY = {
  en: {
    navHome: 'Home',
    navProperties: 'Properties',
    navCompounds: 'Compounds & Map',
    navCairoPlaza: 'Cairo Plaza',
    navCareers: 'Careers',
    navVirtualTour: '3D Tour',
    navContact: 'Contact',
    navCta: 'Request a Property',
    adminLogin: 'Admin Portal',
    eyebrow: 'AI-DRIVEN · NEW CAIRO LUXURY',
    h1a: 'Find Your', h1b: 'Dream Home', h1c: 'in New Cairo.',
    sub: '19 compounds · 1,200+ verified units · AI-evaluated with +20% Direct Owner priority boost.',
    ctaBrowse: 'Explore Properties', ctaWhatsapp: 'WhatsApp Us',
    s1: 'Verified Units', s2: 'Compounds', s3: 'AI Match Score', s4: 'Avg. Response',
    featEyebrow: 'AI-EVALUATED INVENTORY', featTitle: 'Featured Opportunities', viewAll: 'View All Units →',
    mapEyebrow: 'LIVE MARKET INTELLIGENCE', mapTitle: 'Where the Signals Are', mapSub: 'Real-time price valuation, demand and yield across New Cairo compounds.',
    whyEyebrow: 'THE SIERRA ADVANTAGE', whyTitle: 'Why Sierra Estates',
    w1t: 'AI Opportunity Valuation', w1s: 'Scans 1,200+ units daily with automated ROI scoring, price competitiveness, and +20% Direct Owner priority boost.',
    w2t: 'Direct Owner Priority', w2s: 'Units direct from owners are prioritized with verified on-site inspections. Zero ghost listings.',
    w3t: 'Human + AI Closing', w3s: 'AI-sourced opportunities paired with senior advisors — from discovery to contract in under 48 hours.',
    bandTitle: 'Ready to secure your prime property?', bandSub: 'Tell us your exact requirements — our team and AI match engine respond within minutes.',
    bandCta: 'Connect on WhatsApp',
    footer: '© Sierra Estates · New Cairo, Egypt', footerSub: 'Future of Real Estate',
    modalDetails: 'Property Details',
    modalDirectOwner: 'Direct Owner Verified (+20% Priority)',
    modalPrice: 'Valuation Price',
    modalSpecs: 'Specifications',
    modalFinishing: 'Finishing',
    modalDelivery: 'Delivery',
    modalBookWa: 'Book Viewing on WhatsApp',
    modalRequestDeck: 'Request Full Investment Deck',
    modalViewPage: 'Open Full Property Page',
    modalClose: 'Close'
  },
  ar: {
    navHome: 'الرئيسية',
    navProperties: 'العقارات',
    navCompounds: 'الكمبوندات والخريطة',
    navCairoPlaza: 'مشروع كايرو بلازا',
    navCareers: 'وظائف',
    navVirtualTour: 'جولة 3D',
    navContact: 'تواصل معنا',
    navCta: 'اطلب عقارك الآن',
    adminLogin: 'لوحة التحكم',
    eyebrow: 'ذكاء اصطناعي · عقارات القاهرة الجديدة الفاخرة',
    h1a: 'اعثر على', h1b: 'منزل أحلامك', h1c: 'في القاهرة الجديدة.',
    sub: '19 كمبوند · +1200 وحدة موثقة · تقييم ذكي فوري مع أولوية +20% لوحدات الملاك المباشرة.',
    ctaBrowse: 'استكشف العقارات', ctaWhatsapp: 'راسلنا واتساب',
    s1: 'وحدة موثقة', s2: 'كمبوند رئيسي', s3: 'دقة التقييم', s4: 'سرعة الاستجابة',
    featEyebrow: 'مخزون مقيّم بالذكاء الاصطناعي', featTitle: 'أفضل الفرص العقارية', viewAll: '← عرض كل الوحدات',
    mapEyebrow: 'خريطة السوق الحية والمباشرة', mapTitle: 'حركة السوق والأسعار لحظياً', mapSub: 'مؤشرات الطلب والقيمة العادلة والعائد الإيجاري عبر كمبوندات التجمع الخامس.',
    whyEyebrow: 'مزايانا الحصرية', whyTitle: 'لماذا سيرا إستيتس؟',
    w1t: 'محرك التقييم الذكي للفرص', w1s: 'فحص يومي لأكثر من 1200 وحدة مع تقييم العائد الاستثماري وبونص +20% لوحدات المالك المباشر.',
    w2t: 'أولوية الوحدات المباشرة', w2s: 'أولوية قصوى لوحدات الملاك مع فحص ميداني شامل قبل النشر. لا إعلانات وهمية.',
    w3t: 'إتمام الصفقات بخبرة بشرية', w3s: 'تكامل بين الذكاء الاصطناعي وأفضل الاستشاريين العقاريين لإتمام المعاينة والتعاقد خلال 48 ساعة.',
    bandTitle: 'جاهز لاختيار وحدتك المثالية؟', bandSub: 'شاركنا متطلباتك وسيقوم محرك الذكاء وفريقنا بالرد الفوري وترشيح أفضل الخيارات.',
    bandCta: 'ابدأ المحادثة على واتساب',
    footer: '© سيرا إستيتس · القاهرة الجديدة، مصر', footerSub: 'مستقبل الاستثمار العقاري',
    modalDetails: 'تفاصيل العقار',
    modalDirectOwner: 'مالك مباشر موثّق (أولوية +20%)',
    modalPrice: 'السعر المقيم',
    modalSpecs: 'المواصفات الفنية',
    modalFinishing: 'نوع التشطيب',
    modalDelivery: 'ميعاد الاستلام',
    modalBookWa: 'احجز معاينة فورية عبر واتساب',
    modalRequestDeck: 'اطلب ملف الفرصة والعائد الاستثماري',
    modalViewPage: 'فتح صفحة العقار المستقلة',
    modalClose: 'إغلاق'
  },
};

/* ── Shield logo (brand emblem) ────────────────────────────────────────── */
function ShieldLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 40 44" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ch-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-lt)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <path d="M20 2L37 10.5V27Q37 39 20 43Q3 39 3 27V10.5Z" fill="var(--bg)" stroke="url(#ch-shield)" strokeWidth="2.4" />
      <rect x="12.5" y="17" width="3.6" height="11" rx=".7" fill="url(#ch-shield)" />
      <rect x="18.2" y="13" width="3.6" height="15" rx=".7" fill="url(#ch-shield)" />
      <rect x="23.9" y="19" width="3.6" height="9" rx=".7" fill="url(#ch-shield)" opacity=".7" />
    </svg>
  );
}

/* ── Small spec icon ───────────────────────────────────────────────────── */
const SPEC_ICONS: Record<string, string> = {
  bed: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  bath: 'M10 4 8 6M17 19v2M2 12h20M7 19v2M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
  area: 'M4 4h16v16H4z',
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
};
function SpecIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, color: 'var(--tx-f)' }}>
      <path d={d} />
    </svg>
  );
}

/* ── Language Switcher Component ───────────────────────────────────────── */
function LanguageSwitch({ isAr, setLocale }: { isAr: boolean; setLocale: (loc: 'ar' | 'en') => void }) {
  return (
    <div className="se-lang-switch" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`se-lang-btn ${!isAr ? 'se-lang-btn--active' : ''}`}
        onClick={() => setLocale('en')}
        aria-pressed={!isAr}
      >
        English
      </button>
      <button
        type="button"
        className={`se-lang-btn ${isAr ? 'se-lang-btn--active' : ''}`}
        onClick={() => setLocale('ar')}
        aria-pressed={isAr}
      >
        عربي
      </button>
    </div>
  );
}

/* ── Property Card with Click-to-Open Modal ─────────────────────────────── */
function PropertyCard({ item, isAr: _isAr, onSelect }: { item: Listing; isAr: boolean; onSelect: (l: Listing) => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
      className="se-pcard"
      style={{ textDecoration: 'none', cursor: 'pointer', textAlign: 'inherit' }}
    >
      <div className="se-pcard__media">
        <img className="se-pcard__img" src={item.img} alt={item.title} loading="lazy" />
        <div className="se-pcard__scrim" />
        <span className="se-pcard__code">{item.code}</span>
        {item.badge && <span className="se-pcard__badge" style={{ background: item.badgeColor || 'var(--gold)' }}>{item.badge}</span>}
        <span className="se-pcard__ai"><span className="live-dot" /> AI Score {item.aiScore}</span>
        <button type="button" className={saved ? 'se-pcard__save se-pcard__save--on' : 'se-pcard__save'}
          aria-label={saved ? 'Saved' : 'Save'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved((s) => !s); }}>
          <svg viewBox="0 0 24 24" fill={saved ? 'var(--red)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d={SPEC_ICONS.heart} />
          </svg>
        </button>
      </div>
      <div className="se-pcard__body">
        <span className="se-pcard__loc">{item.location}</span>
        <h3 className="se-pcard__title">{item.title}</h3>
        <span className="se-pcard__price">{item.priceLabel}</span>
        <div className="se-pcard__specs">
          <span className="se-pcard__spec"><SpecIcon d={SPEC_ICONS.bed} />{item.beds}</span>
          <span className="se-pcard__spec"><SpecIcon d={SPEC_ICONS.bath} />{item.baths}</span>
          <span className="se-pcard__spec"><SpecIcon d={SPEC_ICONS.area} />{item.area} m²</span>
        </div>
      </div>
    </div>
  );
}

/* ── Interactive Property Detail Modal ─────────────────────────────────── */
function PropertyModal({ item, onClose, isAr, t }: { item: Listing; onClose: () => void; isAr: boolean; t: typeof COPY['en'] }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const waMsg = encodeURIComponent(
    isAr
      ? `مرحباً سيرا إستيتس، أود الاستفسار وحجز معاينة للوحدة كود: ${item.code} (${item.title} في ${item.location}) بسعر ${item.priceLabel}.`
      : `Hello Sierra Estates, I would like to book a viewing for unit: ${item.code} (${item.title} in ${item.location}) priced at ${item.priceLabel}.`
  );
  const waUrl = `https://wa.me/201061399688?text=${waMsg}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(3, 10, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-e, #0c1c2e)',
          border: '1px solid var(--bd-gold, rgba(200, 150, 26, 0.35))',
          borderRadius: 'var(--radius-xl, 20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          color: '#fff',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Media */}
        <div style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
          <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(12,28,46,0.95) 100%)' }} />
          
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              [isAr ? 'left' : 'right']: '16px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px'
            }}
            aria-label={t.modalClose}
          >
            ✕
          </button>

          <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <span style={{ background: 'var(--gold, #c8961a)', color: '#000', fontWeight: 800, fontSize: '11px', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {item.code}
                </span>
                {item.badge && (
                  <span style={{ background: item.badgeColor || '#34D399', color: '#000', fontWeight: 700, fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>{item.title}</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--gold-lt, #e9c176)' }}>{item.location}</p>
            </div>
            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gold-lt, #e9c176)' }}>{item.priceLabel}</div>
              {item.usdEstimate && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>≈ {item.usdEstimate}</div>}
            </div>
          </div>
        </div>

        {/* Modal Body Info */}
        <div style={{ padding: '24px' }}>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--bd, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '12px', marginBottom: '20px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold-lt, #e9c176)' }}>{item.beds}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{isAr ? 'غرف' : 'Beds'}</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold-lt, #e9c176)' }}>{item.baths}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{isAr ? 'حمامات' : 'Baths'}</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold-lt, #e9c176)' }}>{item.area} m²</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{isAr ? 'المساحة' : 'Area'}</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#34D399' }}>{item.aiScore}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>AI Score</div>
            </div>
          </div>

          {/* Description & Technical Specs */}
          {item.description && (
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--gold-lt, #e9c176)' }}>{t.modalDetails}</h4>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>{item.description}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px', fontSize: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.modalFinishing}: </span>
              <strong style={{ color: '#fff' }}>{item.finishing || 'Semi Finished'}</strong>
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t.modalDelivery}: </span>
              <strong style={{ color: '#fff' }}>{item.delivery || 'Immediate'}</strong>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa btn-lg"
              style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}
            >
              💬 {t.modalBookWa}
            </a>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                href={`/clients?ref=${item.code}`}
                className="btn-gold"
                style={{ flex: 1, textAlign: 'center', justifyContent: 'center', minWidth: '160px' }}
                onClick={onClose}
              >
                📋 {t.modalRequestDeck}
              </Link>
              <Link
                href={`/property/${item.id}`}
                className="nav-link"
                style={{ flex: 1, textAlign: 'center', padding: '10px', border: '1px solid var(--bd-gold)', borderRadius: 'var(--radius)', minWidth: '160px' }}
                onClick={onClose}
              >
                🔗 {t.modalViewPage}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Section entrance ──────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, reduce }: { children: React.ReactNode; delay?: number; reduce: boolean }) {
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ transform: 'translateY(20px)', opacity: 0.9 }}
      whileInView={{ transform: 'translateY(0px)', opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Main homepage ─────────────────────────────────────────────────────── */
export default function ClientHome() {
  const { locale, setLocale } = useI18n();
  const isAr = locale === 'ar';
  const t = COPY[isAr ? 'ar' : 'en'];
  const reduce = !!useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [listings] = useState<Listing[]>(FALLBACK);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Close mobile drawer on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const enter = reduce ? {} : { initial: { transform: 'translateY(24px)' }, animate: { transform: 'translateY(0px)' } };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={isAr ? 'sb-ar' : ''} style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Interactive Property Detail Modal Overlay */}
      <AnimatePresence>
        {selectedListing && (
          <PropertyModal
            item={selectedListing}
            onClose={() => setSelectedListing(null)}
            isAr={isAr}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(6, 17, 30, 0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--bd)' }}>
        <nav style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '12px var(--gutter)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--tx)' }}>
            <ShieldLogo size={34} />
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '.02em', color: 'var(--tx-s)' }}>SIERRA ESTATES</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.28em', color: 'var(--gold)', textTransform: 'uppercase' }}>{t.footerSub}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href="/properties" className="nav-link">{t.navProperties}</Link>
            <Link href="/compounds" className="nav-link">{t.navCompounds}</Link>
            <Link href="/cairo-plaza" className="nav-link">{t.navCairoPlaza}</Link>
            <Link href="/careers" className="nav-link">{t.navCareers}</Link>
            <Link href="/virtual-tour" className="nav-link">{t.navVirtualTour}</Link>
            <Link href="/admin/login" className="nav-link" style={{ fontSize: 13, opacity: 0.8 }}>🔐 {t.adminLogin}</Link>
            <LanguageSwitch isAr={isAr} setLocale={setLocale} />
            <Link href="/clients" className="btn-gold">{t.navCta}</Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <LanguageSwitch isAr={isAr} setLocale={setLocale} />
            </div>
            <Link href="/properties" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, textAlign: 'center' }}>{t.navProperties}</Link>
            <Link href="/compounds" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, textAlign: 'center' }}>{t.navCompounds}</Link>
            <Link href="/cairo-plaza" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, textAlign: 'center' }}>{t.navCairoPlaza}</Link>
            <Link href="/careers" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, textAlign: 'center' }}>{t.navCareers}</Link>
            <Link href="/virtual-tour" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, textAlign: 'center' }}>{t.navVirtualTour}</Link>
            <Link href="/admin/login" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, textAlign: 'center', opacity: 0.85 }}>🔐 {t.adminLogin}</Link>
            <Link href="/clients" className="btn-gold" onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', minHeight: 46, textAlign: 'center', justifyContent: 'center' }}>{t.navCta}</Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--bd-gold) 1px, transparent 1px), linear-gradient(90deg, var(--bd-gold) 1px, transparent 1px)', backgroundSize: '54px 54px', opacity: 0.25, maskImage: 'radial-gradient(ellipse at 50% 30%, #000, transparent 72%)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 78% 18%, rgba(230,57,70,.18), transparent 45%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, var(--bg) 94%)' }} />

        <div style={{ position: 'relative', maxWidth: 'var(--container)', margin: '0 auto', padding: 'clamp(60px,8vw,120px) var(--gutter) 60px', textAlign: 'center' }}>
          <motion.div {...enter} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <div className="sb-eyebrow" style={{ justifyContent: 'center', marginBottom: 20 }}>{t.eyebrow}</div>
            <h1 className="sb-display" style={{ margin: 0, fontSize: 'clamp(28px, 5.5vw, 54px)', lineHeight: 1.15 }}>
              {t.h1a} <span className="gold-text">{t.h1b}</span><br />{t.h1c}
            </h1>
            <p className="sb-body-lg" style={{ maxWidth: 620, margin: '22px auto 34px', color: 'var(--tx-m)', fontSize: 'clamp(15px, 2vw, 18px)' }}>{t.sub}</p>

            <div className="hero-btn-group" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 480, margin: '0 auto' }}>
              <Link href="/properties" className="btn-gold btn-lg">{t.ctaBrowse}</Link>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn-wa btn-lg">{t.ctaWhatsapp}</a>
            </div>
          </motion.div>

          {/* STATS */}
          <Reveal reduce={reduce} delay={0.12}>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxWidth: 780, margin: '54px auto 0', background: 'var(--bd-gold)', border: '1px solid var(--bd-gold)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {[['1,200+', t.s1], ['19', t.s2], ['98%', t.s3], ['4h', t.s4]].map(([v, l]) => (
                <div key={l} style={{ background: 'var(--bg-e)', padding: '20px 10px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(22px, 3.5vw, 28px)', color: 'var(--gold-lt)' }}>{v}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--tx-m)', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED LISTINGS */}
      <section id="listings" style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: 'var(--section-pad) var(--gutter)' }}>
        <Reveal reduce={reduce}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 30 }}>
            <div>
              <div className="sb-eyebrow" style={{ marginBottom: 10 }}>{t.featEyebrow}</div>
              <h2 className="sb-display-l" style={{ margin: 0 }}>{t.featTitle}</h2>
            </div>
            <Link href="/properties" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--gold-lt)' }}>{t.viewAll}</Link>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
          {listings.map((item, i) => (
            <Reveal key={item.id} reduce={reduce} delay={Math.min(i * 0.05, 0.25)}>
              <PropertyCard item={item} isAr={isAr} onSelect={setSelectedListing} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* LIVE MAP */}
      <section id="map" style={{ background: 'var(--bg-d)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)' }}>
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: 'var(--section-pad) var(--gutter)' }}>
          <Reveal reduce={reduce}>
            <div className="sb-eyebrow" style={{ marginBottom: 10 }}>{t.mapEyebrow}</div>
            <h2 className="sb-display-l" style={{ margin: '0 0 8px' }}>{t.mapTitle}</h2>
            <p className="sb-body" style={{ color: 'var(--tx-m)', margin: '0 0 24px' }}>{t.mapSub}</p>
          </Reveal>
          <Reveal reduce={reduce} delay={0.1}>
            <div style={{ height: 'clamp(340px, 48vw, 460px)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--bd-gold)', background: 'var(--bg-e2)' }}>
              <LiveMap mode="dark" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHY SIERRA */}
      <section style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: 'var(--section-pad) var(--gutter)' }}>
        <Reveal reduce={reduce}>
          <div className="sb-eyebrow" style={{ marginBottom: 10 }}>{t.whyEyebrow}</div>
          <h2 className="sb-display-l" style={{ margin: '0 0 34px' }}>{t.whyTitle}</h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
          {[['🛰️', t.w1t, t.w1s], ['👑', t.w2t, t.w2s], ['🤝', t.w3t, t.w3s]].map(([ic, tt, ss], i) => (
            <Reveal key={tt} reduce={reduce} delay={Math.min(i * 0.06, 0.2)}>
              <div className="lift" style={{ background: 'var(--bg-e)', border: '1px solid var(--bd)', borderRadius: 'var(--radius-lg)', padding: '26px 24px', height: '100%' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{ic}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--tx-s)', marginBottom: 8 }}>{tt}</div>
                <p className="sb-body-sm" style={{ margin: 0, lineHeight: 1.7 }}>{ss}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: 'var(--section-pad) var(--gutter)', textAlign: 'center' }}>
        <Reveal reduce={reduce}>
          <h2 className="sb-display-l" style={{ margin: '0 0 12px' }}>{t.bandTitle}</h2>
          <p className="sb-body" style={{ color: 'var(--tx-m)', margin: '0 0 26px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>{t.bandSub}</p>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn-wa btn-lg" style={{ display: 'inline-flex' }}>💬 {t.bandCta}</a>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--bd)', padding: '24px var(--gutter)', textAlign: 'center' }}>
        <div className="sb-caption">{t.footer}</div>
      </footer>

      {/* Floating WhatsApp Action Button for Mobile */}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="floating-wa-btn" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
        </svg>
        <span>WhatsApp</span>
      </a>
    </div>
  );
}
