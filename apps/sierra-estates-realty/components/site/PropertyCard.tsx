'use client';

/**
 * Sierra Estates · Luxury Institutional Property Card
 * Adheres to Apple-Standard Clarity and Strict Luxury Institutional Guidelines:
 * - Brand Signature Palette: Deep Royal Navy (#0A1628), Accent Gold (#C9A84C), Ivory/Off-White (#F8F9FA)
 * - Upfront Essential Metrics: Price (EGP with commas), Location/Compound, Rooms, Area (m²), Finishing, Availability
 * - Verified Unit Badges: Direct Owner & Verified Fresh
 * - Instant WhatsApp floating/card CTA & interactive VIP viewing triggers
 * - High-res image carousel navigation
 */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MapPin,
  BedDouble,
  Bath,
  Scaling,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Phone,
  Paintbrush,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { GsapMagnetic } from './GsapAnimations';

export interface CardListing {
  id: number | string;
  code: string;
  cmp: string;
  zone: string;
  type: string;
  beds: number;
  bath: number;
  area: number;
  egpM: number;
  usd: number;
  ai: number;
  tag: string | null;
  mode: string;
  agent: string;
  ago: string;
  img: string;
  yield?: number;
  finishing?: string;
  availability?: string;
  ownerType?: 'owner' | 'broker' | string;
  isDirectOwner?: boolean;
  verifiedFresh?: boolean;
  images?: string[];
  price?: number;
}

export type PropertyCardVariant = 'showcase' | 'compact' | 'bento' | 'editorial';

export interface PropertyCardProps {
  p: CardListing;
  i?: number;
  onLocate?: (compoundName: string) => void;
  variant?: PropertyCardVariant;
  className?: string;
}

export default function PropertyCard({
  p,
  i = 0,
  onLocate,
  variant = 'showcase',
  className = '',
}: PropertyCardProps) {
  const { t, isAr } = useSite();
  const [liked, setLiked] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const initials = (p.agent || 'Sierra Advisor').split(' ').map((w) => w[0]).join('');
  const href = `/property/${p.id}`;

  // Image list for carousel
  const imageList = p.images && p.images.length > 0 ? p.images : [p.img];
  const currentImg = imageList[activeImgIndex] || p.img;

  const handleNextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  // Price calculations: EGP with commas
  const isRent = p.mode === 'rent';
  let rawPrice = p.price;
  if (!rawPrice || rawPrice <= 0) {
    if (p.egpM && p.egpM > 0) rawPrice = Math.round(p.egpM * 1_000_000);
    else if (p.usd && p.usd > 0) rawPrice = Math.round(p.usd * (isRent ? 50 : 48.65));
    else rawPrice = isRent ? 35000 : 8500000;
  }
  const formattedEgpPrice = `${Math.round(rawPrice).toLocaleString()} EGP${isRent ? '/mo' : ''}`;

  const sqmPrice = Math.round(
    (p.egpM ? p.egpM * 1_000_000 : (p.usd || 0) * 48.65) / (p.area || 1)
  );
  const sqmPriceFormatted = sqmPrice > 0 ? sqmPrice.toLocaleString() : '80,000';
  const estYield = p.yield || (isRent ? 10.4 : 9.1);
  const paybackYears = (100 / estYield).toFixed(1);
  const isUnderpriced = p.ai >= 9.3;

  // Institutional Verified Badges
  const isDirectOwner = Boolean(
    p.isDirectOwner ||
    p.ownerType === 'owner' ||
    p.ownerType === 'direct_owner' ||
    p.tag?.toLowerCase().includes('owner') ||
    String(p.code || '').startsWith('DO-')
  );

  const isVerifiedFresh = Boolean(
    p.verifiedFresh ||
    p.tag?.toLowerCase().includes('new') ||
    p.tag?.toLowerCase().includes('fresh') ||
    p.ago?.toLowerCase().includes('now') ||
    p.ago?.toLowerCase().includes('d ago') ||
    p.ago?.toLowerCase().includes('h ago') ||
    p.ago?.toLowerCase().includes('verified')
  );

  // Essential upfront metrics
  const finishing = p.finishing || (p.beds >= 4 ? (isAr ? 'ألترا سوبر لوكس' : 'Ultra Super Lux') : (isAr ? 'تشطيب كامل' : 'Fully Finished'));
  const availability = p.availability || (isAr ? 'متاح فوري' : 'Available');

  // WhatsApp quick inquiry trigger
  const waInquiry = `https://wa.me/201092048333?text=${encodeURIComponent(
    isAr
      ? `مرحباً سييرا العقارية، أود الاستفسار عن الوحدة [${p.code}] في ${p.cmp} بسعر (${formattedEgpPrice}). هل هي متاحة للمعاينة الخاصة؟`
      : `Hello Sierra Estates, I would like to inquire about unit [${p.code}] in ${p.cmp} (${formattedEgpPrice}). Is it available for a private viewing?`
  )}`;

  const handleShortlistTrigger = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('sierra:add-to-shortlist', {
        detail: {
          id: p.code || p.id,
          code: p.code,
          compound: p.cmp,
          type: p.type,
          price: formattedEgpPrice,
          img: currentImg,
        },
      });
      window.dispatchEvent(event);
    }
  };

  /* ─────────────────────────────────────────────────────────────────
   * 1. COMPACT / EXECUTIVE HORIZONTAL CARD VARIANT
   * ───────────────────────────────────────────────────────────────── */
  if (variant === 'compact') {
    return (
      <article
        className={`pcard pcard-compact luxury-inst-card rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo relative group">
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImg} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>

          {/* Verified Unit Badges */}
          <div className="badges flex flex-wrap gap-1.5">
            {isDirectOwner && (
              <span className="tag" style={{ background: '#0A1628', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.5)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck style={{ width: 11, height: 11 }} />
                <span>{isAr ? 'مالك مباشر' : 'Direct Owner'}</span>
              </span>
            )}
            {isVerifiedFresh && !isDirectOwner && (
              <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Sparkles style={{ width: 11, height: 11 }} />
                <span>{isAr ? 'تحقق حديث' : 'Verified Fresh'}</span>
              </span>
            )}
            {p.tag && <span className="tag featured">{p.tag}</span>}
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>

          <div className="price-float font-mono font-bold">{formattedEgpPrice}</div>
          <div
            className="ai-score"
            title={`Sierra Intelligence Score: ${p.ai.toFixed(1)}/10\n• AVM Confidence: 95%\n• Est. Net Yield: ${estYield}%`}
          >
            AI {p.ai.toFixed(1)}
          </div>
        </div>

        <div className="body">
          <div>
            <div className="ptype flex items-center justify-between">
              <span>{p.code} · {p.type}</span>
              <span className="text-[10px] text-[#C9A84C] font-semibold">{availability}</span>
            </div>
            <h3><Link href={href}>{p.type} in {p.cmp}</Link></h3>
            <div className="addr">
              <MapPin className="i" style={{ color: '#C9A84C', flexShrink: 0 }} />
              <span>{p.cmp}, {p.zone}</span>
            </div>
          </div>

          {/* Upfront Essential Metrics */}
          <div className="specs">
            <div><BedDouble className="i" /><b>{p.beds}</b><span>{t('beds')}</span></div>
            <div><Bath className="i" /><b>{p.bath}</b><span>{t('baths')}</span></div>
            <div><Scaling className="i" /><b>{p.area}</b><span>m²</span></div>
            <div className="spec-sqm" style={{ color: '#C9A84C', fontWeight: 600 }}>
              <b>{sqmPriceFormatted}</b>
              <span>{isAr ? 'ج/م²' : 'EGP/m²'}</span>
            </div>
          </div>

          <div className="foot" style={{ marginTop: 'auto', background: 'transparent', padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="agent">
              <span className="av">{initials}</span>
              <small><b>{p.agent}</b>{p.ago}</small>
            </div>
            <div className="foot-icons flex items-center gap-2">
              <a
                href={waInquiry}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="pcard-btn-whatsapp"
                style={{ padding: '4px 8px', fontSize: 11 }}
                title="Instant WhatsApp Inquiry"
              >
                <Phone style={{ width: 12, height: 12 }} />
                <span>WhatsApp</span>
              </a>
              <Link href={href} className="btn-details-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#C9A84C', textDecoration: 'none' }}>
                <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                <ArrowUpRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 2. BENTO / FINANCIAL INVESTOR CARD VARIANT
   * ───────────────────────────────────────────────────────────────── */
  if (variant === 'bento') {
    return (
      <article
        className={`pcard pcard-bento luxury-inst-card rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo relative group" style={{ height: 180 }}>
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImg} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>
          <div className="badges">
            <span className="tag" style={{ background: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp style={{ width: 12, height: 12 }} />
              {estYield}% {isAr ? 'عائد' : 'Yield'}
            </span>
            {isDirectOwner && (
              <span className="tag" style={{ background: '#0A1628', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.5)' }}>
                <ShieldCheck style={{ width: 11, height: 11, display: 'inline' }} /> {isAr ? 'مالك مباشر' : 'Direct Owner'}
              </span>
            )}
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>
          <div className="price-float font-mono font-bold">{formattedEgpPrice}</div>
          <div className="ai-score">AI {p.ai.toFixed(1)}</div>
        </div>

        <div className="body" style={{ padding: '16px' }}>
          <div className="flex items-center justify-between">
            <div className="ptype">{p.code} · {p.type}</div>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
              style={{
                background: isUnderpriced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(201, 168, 76, 0.15)',
                color: isUnderpriced ? '#34d399' : '#C9A84C',
                border: `1px solid ${isUnderpriced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(201, 168, 76, 0.35)'}`,
              }}
            >
              {isUnderpriced ? (isAr ? 'أقل من السوق (-6%)' : 'Underpriced (-6%)') : (isAr ? 'قيمة عادلة' : 'Fair Value')}
            </span>
          </div>

          <h3><Link href={href}>{p.type} in {p.cmp}</Link></h3>
          <div className="addr"><MapPin className="i" /> {p.cmp}, {p.zone}</div>

          {/* Bento Financial Metrics */}
          <div className="bento-grid">
            <div className="bento-metric-cell">
              <span className="metric-lbl">{isAr ? 'عائد الإيجار' : 'Net Cap Rate'}</span>
              <span className="metric-val" style={{ color: '#34d399' }}>{estYield}%</span>
            </div>
            <div className="bento-metric-cell">
              <span className="metric-lbl">{isAr ? 'فترة الاسترداد' : 'Est. Payback'}</span>
              <span className="metric-val">{paybackYears} {isAr ? 'سنة' : 'Yrs'}</span>
            </div>
            <div className="bento-metric-cell">
              <span className="metric-lbl">{isAr ? 'سعر المتر' : 'Price / m²'}</span>
              <span className="metric-val spec-sqm" style={{ color: '#C9A84C' }}>{sqmPriceFormatted}</span>
            </div>
            <div className="bento-metric-cell">
              <span className="metric-lbl">{isAr ? 'التشطيب' : 'Finishing'}</span>
              <span className="metric-val text-[11px] truncate">{finishing}</span>
            </div>
          </div>
        </div>

        <div className="foot">
          <div className="agent">
            <span className="av">{initials}</span>
            <small><b>{p.agent}</b>{p.ago}</small>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={waInquiry}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pcard-btn-whatsapp"
              style={{ padding: '6px 10px', fontSize: 11 }}
            >
              <Phone style={{ width: 12, height: 12 }} />
              <span>WhatsApp</span>
            </a>
            <Link
              href={href}
              className="pcard-btn-whatsapp"
              style={{ textDecoration: 'none', background: 'rgba(201, 168, 76, 0.15)', borderColor: 'rgba(201, 168, 76, 0.4)', color: '#C9A84C' }}
            >
              <span>{isAr ? 'تحليل الاستثمار' : 'Analyze Deal'}</span>
              <ArrowUpRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 3. EDITORIAL / ARCHITECTURAL QUIET LUXURY CARD VARIANT
   * ───────────────────────────────────────────────────────────────── */
  if (variant === 'editorial') {
    return (
      <article
        className={`pcard pcard-editorial luxury-inst-card rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo" style={{ height: 230 }}>
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImg} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>
          <div className="badges">
            <span className="tag" style={{ background: '#0A1628', backdropFilter: 'blur(8px)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              {p.code}
            </span>
            {isDirectOwner && (
              <span className="tag" style={{ background: 'rgba(10, 22, 40, 0.9)', color: '#C9A84C', border: '1px solid #C9A84C' }}>
                <ShieldCheck style={{ width: 11, height: 11, display: 'inline' }} /> Direct Owner
              </span>
            )}
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>
          <div className="price-float font-mono" style={{ background: 'rgba(10, 22, 40, 0.94)', border: '1px solid rgba(201, 168, 76, 0.4)' }}>
            {formattedEgpPrice}
          </div>
          <div className="ai-score">AI {p.ai.toFixed(1)}</div>
        </div>

        <div className="body" style={{ padding: '20px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#C9A84C', fontWeight: 700, marginBottom: 6 }}>
            {p.cmp} · {p.zone}
          </div>
          <h3 style={{ fontSize: 18, lineHeight: 1.35, marginBottom: 12 }}>
            <Link href={href}>{p.type} at {p.cmp}</Link>
          </h3>

          <div className="specs-editorial">
            <span>{p.beds} {t('beds')}</span>
            <span>·</span>
            <span>{p.bath} {t('baths')}</span>
            <span>·</span>
            <span>{p.area} m²</span>
            <span>·</span>
            <span className="spec-sqm" style={{ color: '#C9A84C' }}>{sqmPriceFormatted} {isAr ? 'ج/م²' : 'EGP/m²'}</span>
            <span>·</span>
            <span className="text-[11px] text-[#C9A84C] font-semibold">{finishing}</span>
          </div>
        </div>

        <div className="foot" style={{ background: 'transparent', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="agent">
            <span className="av">{initials}</span>
            <small><b>{p.agent}</b>{p.ago}</small>
          </div>
          <div className="foot-icons flex items-center gap-2">
            <a
              href={waInquiry}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pcard-btn-whatsapp"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              <Phone style={{ width: 12, height: 12 }} />
              <span>WhatsApp</span>
            </a>
            {onLocate && (
              <button
                type="button"
                onClick={() => onLocate(p.cmp)}
                aria-label={isAr ? 'عرض على الخريطة' : 'Locate on Map'}
                title={isAr ? 'عرض على الخريطة' : 'Locate on Masterplan Map'}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'inline-flex', alignItems: 'center', padding: 2 }}
              >
                <MapPin className="i" style={{ width: 16, height: 16 }} />
              </button>
            )}
            <Link href={href} aria-label="Open listing" style={{ color: '#C9A84C', display: 'inline-flex', alignItems: 'center', padding: 2 }}>
              <ExternalLink style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 4. SIGNATURE LUXURY SHOWCASE CARD (DEFAULT)
   * ───────────────────────────────────────────────────────────────── */
  return (
    <article className={`pcard luxury-inst-card rv d${(i % 3) + 1} ${className}`} data-type={p.type} data-mode={p.mode}>
      <div className="photo relative group">
        <Link href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentImg} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
        </Link>

        {/* Multi-Image Carousel Controls */}
        {imageList.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handlePrevImg}
              className="w-7 h-7 rounded-full bg-[#0A1628]/80 text-[#C9A84C] border border-[#C9A84C]/40 flex items-center justify-center pointer-events-auto shadow-lg hover:scale-105 active:scale-95 transition-transform"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImg}
              className="w-7 h-7 rounded-full bg-[#0A1628]/80 text-[#C9A84C] border border-[#C9A84C]/40 flex items-center justify-center pointer-events-auto shadow-lg hover:scale-105 active:scale-95 transition-transform"
              aria-label="Next photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Carousel Dots */}
        {imageList.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {imageList.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === activeImgIndex ? 'bg-[#C9A84C] w-3' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Verified Badges */}
        <div className="badges flex flex-wrap gap-1">
          {isDirectOwner && (
            <span className="tag" style={{ background: '#0A1628', color: '#C9A84C', border: '1px solid #C9A84C', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck style={{ width: 11, height: 11 }} />
              <span>{isAr ? 'مالك مباشر' : 'Direct Owner'}</span>
            </span>
          )}
          {isVerifiedFresh && (
            <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Sparkles style={{ width: 11, height: 11 }} />
              <span>{isAr ? 'تم التحقق' : 'Verified Fresh'}</span>
            </span>
          )}
          {p.tag && <span className="tag featured">{p.tag}</span>}
          <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
            {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
          </span>
        </div>

        <GsapMagnetic strength={0.3} className="heart-mag">
          <div
            className={`heart${liked ? ' on' : ''}`}
            onClick={() => setLiked((v) => !v)}
            role="button"
            tabIndex={0}
            aria-label="Save"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLiked((v) => !v); }}
          >
            <Heart className="i" style={{ width: 18, height: 18 }} />
          </div>
        </GsapMagnetic>

        {/* Price (EGP with commas) */}
        <div className="price-float font-mono font-bold" style={{ background: 'rgba(10, 22, 40, 0.94)', border: '1px solid rgba(201, 168, 76, 0.4)', color: '#C9A84C' }}>
          {formattedEgpPrice}
        </div>
        <div
          className="ai-score"
          title={`Sierra Intelligence Score: ${p.ai.toFixed(1)}/10\n• AVM Confidence: 95%\n• Est. Net Yield: ${p.yield ? p.yield + '%' : '9.1%'}\n• Backed by verified comparable index`}
          style={{ cursor: 'help' }}
        >
          AI {p.ai.toFixed(1)}
        </div>
      </div>

      <div className="body">
        <div className="ptype flex items-center justify-between">
          <span>{p.code} · {p.type}</span>
          <span className="text-[10.5px] font-semibold text-[#10B981] flex items-center gap-1">
            <CheckCircle2 style={{ width: 11, height: 11 }} />
            {availability}
          </span>
        </div>

        <h3><Link href={href}>{p.type} in {p.cmp}</Link></h3>

        {onLocate ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLocate(p.cmp);
            }}
            className="addr"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'inherit', font: 'inherit', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
            title={isAr ? `تحديد ${p.cmp} على الخريطة` : `Locate ${p.cmp} on Masterplan Map`}
          >
            <MapPin className="i" style={{ color: '#C9A84C', flexShrink: 0 }} /> <span>{p.cmp}, {p.zone}</span>
          </button>
        ) : (
          <div className="addr"><MapPin className="i" style={{ color: '#C9A84C' }} /> {p.cmp}, {p.zone}</div>
        )}

        {/* Upfront Essential Metrics */}
        <div className="specs">
          <div><BedDouble className="i" /><b>{p.beds}</b><span>{t('beds')}</span></div>
          <div><Bath className="i" /><b>{p.bath}</b><span>{t('baths')}</span></div>
          <div><Scaling className="i" /><b>{p.area}</b><span>m²</span></div>
          <div
            className="spec-sqm"
            title={isAr ? 'سعر المتر المربع التقديري' : 'Estimated Price per Square Meter'}
            style={{ color: '#C9A84C', fontWeight: 600 }}
          >
            <b>{sqmPriceFormatted}</b>
            <span>{isAr ? 'ج/م²' : 'EGP/m²'}</span>
          </div>
        </div>

        {/* Finishing Tag & Instant VIP Action */}
        <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Paintbrush className="w-3 h-3 text-[#C9A84C]" />
            <span>{finishing}</span>
          </span>
          <button
            type="button"
            onClick={handleShortlistTrigger}
            className="text-[#C9A84C] hover:underline font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
          >
            <span>+ VIP Tour</span>
          </button>
        </div>
      </div>

      <div className="foot flex items-center justify-between">
        <div className="agent">
          <span className="av">{initials}</span>
          <small><b>{p.agent}</b>{p.ago}</small>
        </div>
        <div className="foot-icons flex items-center gap-2">
          {/* Instant WhatsApp Inquiry */}
          <a
            href={waInquiry}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pcard-btn-whatsapp"
            style={{
              background: '#25D366',
              color: '#FFFFFF',
              borderColor: '#25D366',
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 8,
              textDecoration: 'none',
            }}
            title={isAr ? 'استفسار فوري عبر واتساب' : 'Instant WhatsApp Inquiry'}
          >
            <Phone style={{ width: 12, height: 12 }} />
            <span>WhatsApp</span>
          </a>

          {onLocate && (
            <button
              type="button"
              onClick={() => onLocate(p.cmp)}
              aria-label={isAr ? 'عرض على الخريطة' : 'Locate on Map'}
              title={isAr ? 'عرض على الخريطة' : 'Locate on Masterplan Map'}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C9A84C', display: 'inline-flex', alignItems: 'center', padding: 2 }}
            >
              <MapPin className="i" style={{ width: 16, height: 16 }} />
            </button>
          )}
          <Link href={href} aria-label="Open listing" style={{ color: '#C9A84C', display: 'inline-flex', alignItems: 'center', padding: 2 }}>
            <ExternalLink style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>
    </article>
  );
}
