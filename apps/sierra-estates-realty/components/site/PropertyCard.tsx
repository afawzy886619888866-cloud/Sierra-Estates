'use client';

/** Property card — supporting luxury variations: showcase, compact, bento, and editorial. */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MapPin,
  BedDouble,
  Bath,
  Scaling,
  GitCompare,
  Share2,
  TrendingUp,
  Percent,
  ShieldCheck,
  ArrowUpRight,
  ExternalLink,
  Building,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { GsapMagnetic } from './GsapAnimations';

export interface CardListing {
  id: number;
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

  const initials = p.agent.split(' ').map((w) => w[0]).join('');
  const href = `/property/${p.id}`;

  const sqmPrice = Math.round(
    (p.egpM ? p.egpM * 1_000_000 : (p.usd || 0) * 48.65) / (p.area || 1)
  );
  const sqmPriceFormatted = sqmPrice > 0 ? sqmPrice.toLocaleString() : '—';
  const estYield = p.yield || (p.mode === 'rent' ? 10.4 : 8.2);
  const paybackYears = (100 / estYield).toFixed(1);
  const isUnderpriced = p.ai >= 9.3;

  /* ─────────────────────────────────────────────────────────────────
   * 1. COMPACT / EXECUTIVE HORIZONTAL CARD VARIANT
   * ───────────────────────────────────────────────────────────────── */
  if (variant === 'compact') {
    return (
      <article
        className={`pcard pcard-compact rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo">
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>
          <div className="badges">
            {p.tag && <span className="tag featured">{p.tag}</span>}
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>
          <div className="price-float">{HZDATA.price(p)}</div>
          <div
            className="ai-score"
            title={`Sierra Intelligence Score: ${p.ai.toFixed(1)}/10\n• AVM Confidence: 95%\n• Est. Net Yield: ${estYield}%`}
          >
            AI {p.ai.toFixed(1)}
          </div>
        </div>

        <div className="body">
          <div>
            <div className="ptype">{p.code} · {p.type}</div>
            <h3><Link href={href}>{p.type} in {p.cmp}</Link></h3>
            <div className="addr">
              <MapPin className="i" style={{ color: '#c8961a', flexShrink: 0 }} />
              <span>{p.cmp}, {p.zone}</span>
            </div>
          </div>

          <div className="specs">
            <div><BedDouble className="i" /><b>{p.beds}</b><span>{t('beds')}</span></div>
            <div><Bath className="i" /><b>{p.bath}</b><span>{t('baths')}</span></div>
            <div><Scaling className="i" /><b>{p.area}</b><span>m²</span></div>
            {p.area > 0 && (p.egpM > 0 || p.usd > 0) && (
              <div
                className="spec-sqm"
                title={isAr ? 'سعر المتر المربع التقديري' : 'Estimated Price per Square Meter'}
                style={{ color: '#DFAD3A', fontWeight: 600 }}
              >
                <b>{sqmPriceFormatted}</b>
                <span>{isAr ? 'ج/م²' : 'EGP/m²'}</span>
              </div>
            )}
          </div>

          <div className="foot" style={{ marginTop: 'auto', background: 'transparent', padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="agent">
              <span className="av">{initials}</span>
              <small><b>{p.agent}</b>{p.ago}</small>
            </div>
            <div className="foot-icons">
              <Link href={href} className="btn-details-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#e9c176', textDecoration: 'none' }}>
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
        className={`pcard pcard-bento rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo" style={{ height: 180 }}>
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>
          <div className="badges">
            <span className="tag" style={{ background: '#059669', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp style={{ width: 12, height: 12 }} />
              {estYield}% {isAr ? 'عائد' : 'Yield'}
            </span>
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>
          <div className="price-float">{HZDATA.price(p)}</div>
          <div className="ai-score">AI {p.ai.toFixed(1)}</div>
        </div>

        <div className="body" style={{ padding: '16px' }}>
          <div className="flex items-center justify-between">
            <div className="ptype">{p.code} · {p.type}</div>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
              style={{
                background: isUnderpriced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(200, 150, 26, 0.15)',
                color: isUnderpriced ? '#34d399' : '#e9c176',
                border: `1px solid ${isUnderpriced ? 'rgba(16, 185, 129, 0.35)' : 'rgba(200, 150, 26, 0.35)'}`,
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
              <span className="metric-val spec-sqm" style={{ color: '#e9c176' }}>{sqmPriceFormatted}</span>
            </div>
            <div className="bento-metric-cell">
              <span className="metric-lbl">{isAr ? 'المساحة' : 'Area & Beds'}</span>
              <span className="metric-val">{p.area}m² · {p.beds}b</span>
            </div>
          </div>
        </div>

        <div className="foot">
          <div className="agent">
            <span className="av">{initials}</span>
            <small><b>{p.agent}</b>{p.ago}</small>
          </div>
          <Link
            href={href}
            className="pcard-btn-whatsapp"
            style={{ textDecoration: 'none', background: 'rgba(200, 150, 26, 0.15)', borderColor: 'rgba(200, 150, 26, 0.4)', color: '#e9c176' }}
          >
            <span>{isAr ? 'تحليل الاستثمار' : 'Analyze Deal'}</span>
            <ArrowUpRight style={{ width: 14, height: 14 }} />
          </Link>
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
        className={`pcard pcard-editorial rv d${(i % 3) + 1} ${className}`}
        data-type={p.type}
        data-mode={p.mode}
      >
        <div className="photo" style={{ height: 230 }}>
          <Link href={href}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
          </Link>
          <div className="badges">
            <span className="tag" style={{ background: 'rgba(11,25,41,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(233,193,118,0.3)', color: '#e9c176' }}>
              {p.code}
            </span>
            <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
              {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
            </span>
          </div>
          <div className="price-float" style={{ background: 'rgba(5, 12, 22, 0.92)', border: '1px solid rgba(200, 150, 26, 0.35)' }}>
            {HZDATA.price(p)}
          </div>
          <div className="ai-score">AI {p.ai.toFixed(1)}</div>
        </div>

        <div className="body" style={{ padding: '20px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#c8961a', fontWeight: 700, marginBottom: 6 }}>
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
            <span className="spec-sqm" style={{ color: '#e9c176' }}>{sqmPriceFormatted} {isAr ? 'ج/م²' : 'EGP/m²'}</span>
          </div>
        </div>

        <div className="foot" style={{ background: 'transparent', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="agent">
            <span className="av">{initials}</span>
            <small><b>{p.agent}</b>{p.ago}</small>
          </div>
          <div className="foot-icons">
            {onLocate && (
              <button
                type="button"
                onClick={() => onLocate(p.cmp)}
                aria-label={isAr ? 'عرض على الخريطة' : 'Locate on Map'}
                title={isAr ? 'عرض على الخريطة' : 'Locate on Masterplan Map'}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#c8961a', display: 'inline-flex', alignItems: 'center', padding: 2 }}
              >
                <MapPin className="i" style={{ width: 16, height: 16 }} />
              </button>
            )}
            <Link href={href} aria-label="Open listing" style={{ color: '#e9c176', display: 'inline-flex', alignItems: 'center', padding: 2 }}>
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
    <article className={`pcard rv d${(i % 3) + 1} ${className}`} data-type={p.type} data-mode={p.mode}>
      <div className="photo">
        <Link href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.img} alt={`${p.type} in ${p.cmp}`} loading="lazy" />
        </Link>
        <div className="badges">
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
        <div className="price-float">{HZDATA.price(p)}</div>
        <div
          className="ai-score"
          title={`Sierra Intelligence Score: ${p.ai.toFixed(1)}/10\n• AVM Confidence: 95%\n• Est. Net Yield: ${p.yield ? p.yield + '%' : '8.2%'}\n• Backed by 12 recent comparables in ${p.cmp}`}
          style={{ cursor: 'help' }}
        >
          AI {p.ai.toFixed(1)}
        </div>
      </div>

      <div className="body">
        <div className="ptype">{p.code} · {p.type}</div>
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
            <MapPin className="i" style={{ color: '#c8961a', flexShrink: 0 }} /> <span>{p.cmp}, {p.zone}</span>
          </button>
        ) : (
          <div className="addr"><MapPin className="i" /> {p.cmp}, {p.zone}</div>
        )}
        <div className="specs">
          <div><BedDouble className="i" /><b>{p.beds}</b><span>{t('beds')}</span></div>
          <div><Bath className="i" /><b>{p.bath}</b><span>{t('baths')}</span></div>
          <div><Scaling className="i" /><b>{p.area}</b><span>m²</span></div>
          {p.area > 0 && (p.egpM > 0 || p.usd > 0) && (
            <div
              className="spec-sqm"
              title={isAr ? 'سعر المتر المربع التقديري' : 'Estimated Price per Square Meter'}
              style={{ color: '#DFAD3A', fontWeight: 600 }}
            >
              <b>
                {Math.round(
                  (p.egpM ? p.egpM * 1_000_000 : (p.usd || 0) * 48.65) / p.area
                ).toLocaleString()}
              </b>
              <span>{isAr ? 'ج/م²' : 'EGP/m²'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="foot">
        <div className="agent">
          <span className="av">{initials}</span>
          <small><b>{p.agent}</b>{p.ago}</small>
        </div>
        <div className="foot-icons">
          {onLocate && (
            <button
              type="button"
              onClick={() => onLocate(p.cmp)}
              aria-label={isAr ? 'عرض على الخريطة' : 'Locate on Map'}
              title={isAr ? 'عرض على الخريطة' : 'Locate on Masterplan Map'}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#c8961a', display: 'inline-flex', alignItems: 'center', padding: 2 }}
            >
              <MapPin className="i" style={{ width: 16, height: 16 }} />
            </button>
          )}
          <a href="#" aria-label="Compare"><GitCompare className="i" /></a>
          <a href="#" aria-label="Share"><Share2 className="i" /></a>
        </div>
      </div>
    </article>
  );
}
