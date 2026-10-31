/**
 * SIERRA ESTATES — VERIFIED COLLECTION RAIL (public showcase)
 *
 * Renders the server-fetched verified inventory rail on /properties: only
 * rows that passed the command center's gate (status 'active',
 * publish_status 'PUBLISHABLE', stale FALSE, freshness_score ≥ 90 — fetched
 * in the page's Server Component under the public RLS policy). An honest
 * empty state renders while the collection is being curated — never seeded
 * demo properties (§21).
 */
import React from 'react';

export interface VerifiedCollectionItem {
  id: string;
  seCode: string | null;
  code: string | null;
  title: string;
  compound: string | null;
  propertyType: string | null;
  dealType: string | null;
  price: number;
  priceCurrency: string | null;
  bedrooms: number | null;
  areaSqm: number | null;
  img: string | null;
  freshnessScore: number | null;
}

function formatPrice(price: number, currency: string | null): string {
  const symbol = currency === 'USD' ? 'USD' : 'EGP';
  if (!Number.isFinite(price) || price <= 0) return 'Price on request';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(2)}M ${symbol}`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}K ${symbol}`;
  return `${price.toLocaleString('en-US')} ${symbol}`;
}

export default function VerifiedCollection({ items }: { items: VerifiedCollectionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="vc-empty">
        The verified collection is being curated right now — the freshest verified residences
        appear here the moment the Curator desk refreshes them. Meanwhile, the full live catalog
        below carries every publishable unit.
      </div>
    );
  }

  return (
    <div className="vc-rail">
      {items.map((item) => (
        <a
          key={item.id}
          href={`/property/${item.id}`}
          className="vc-card"
          aria-label={`${item.title}${item.compound ? ` in ${item.compound}` : ''} — verified, ${item.freshnessScore ?? 90}% freshness`}
        >
          <div className="vc-card-media">
            {item.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.img}
                alt={`${item.title}${item.compound ? ` — ${item.compound}` : ''}`}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <span className="vc-card-fresh">✓ {item.freshnessScore ?? 90}% fresh</span>
            {(item.seCode ?? item.code) && (
              <span className="vc-card-secode">{item.seCode ?? item.code}</span>
            )}
          </div>
          <div className="vc-card-body">
            {item.compound && <span className="vc-card-compound">{item.compound}</span>}
            <h3 className="vc-card-title">{item.title}</h3>
            <div className="vc-card-meta">
              {item.propertyType && <span>{item.propertyType}</span>}
              {item.bedrooms != null && <span>{item.bedrooms} bed</span>}
              {item.areaSqm != null && <span>{Math.round(item.areaSqm)} sqm</span>}
              {item.dealType && <span>{item.dealType}</span>}
            </div>
            <div className="vc-card-foot">
              <span className="vc-card-price">{formatPrice(item.price, item.priceCurrency)}</span>
              <span className="vc-card-link">View residence →</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
