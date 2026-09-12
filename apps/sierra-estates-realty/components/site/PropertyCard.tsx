'use client';

/** Property card — port of pcard() in deploy/shared.js. */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart, MapPin, BedDouble, Bath, Scaling, GitCompare, Share2,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { GsapMagnetic } from './GsapAnimations';

export interface CardListing {
  id: number; code: string; cmp: string; zone: string; type: string;
  beds: number; bath: number; area: number; egpM: number; usd: number;
  ai: number; tag: string | null; mode: string; agent: string; ago: string; img: string;
  yield?: number;
}

export interface PropertyCardProps {
  p: CardListing;
  i?: number;
  onLocate?: (compoundName: string) => void;
}

export default function PropertyCard({ p, i = 0, onLocate }: PropertyCardProps) {
  const { t, isAr } = useSite();
  const [liked, setLiked] = useState(false);

  const initials = p.agent.split(' ').map((w) => w[0]).join('');
  const href = `/property/${p.id}`;

  return (
    <article className={`pcard rv d${(i % 3) + 1}`} data-type={p.type} data-mode={p.mode}>
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
