'use client';

/** Port of deploy/property.html. */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin, BedDouble, Bath, Scaling, Scan, Sparkles, Phone, Calendar, ArrowRight,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';

export default function PropertyDetail({ id }: { id: string }) {
  const { t, isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];
  const p = listings.find((x) => String(x.id) === String(id));

  const gallery = (HZDATA.interiors as string[]) || [];
  const [photo, setPhoto] = useState<string | null>(null);

  if (!p) {
    return (
      <SiteShell active="best">
        <header className="page-hero">
          <div className="wrap">
            <div className="crumbs">
              <Link href="/">{t('crumbHome')}</Link>
              <span className="sep">/</span>
              <Link href="/properties">{t('navProps')}</Link>
            </div>
            <h1>{isAr ? 'الوحدة غير متاحة' : 'Listing not found'}</h1>
            <p className="sub">
              {isAr
                ? 'ربما تم بيع الوحدة أو إزالتها. تصفح باقي المعروض.'
                : 'It may have been sold or withdrawn. Browse the rest of the inventory.'}
            </p>
          </div>
        </header>
        <section className="block">
          <div className="wrap">
            <Link href="/properties" className="btn btn-navy">
              <span>{isAr ? 'كل الوحدات' : 'All listings'}</span> <ArrowRight className="i" />
            </Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  const hero = photo || p.img;
  const thumbs = [p.img, ...gallery].slice(0, 6);
  const similar = listings.filter((x) => x.id !== p.id && x.cmp === p.cmp).slice(0, 3);
  const fallback = listings.filter((x) => x.id !== p.id).slice(0, 3);
  const related = similar.length ? similar : fallback;

  return (
    <SiteShell active="best">
      <header className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{t('crumbHome')}</Link>
            <span className="sep">/</span>
            <Link href="/properties">{t('navProps')}</Link>
            <span className="sep">/</span>
            <span>{p.type} in {p.cmp}</span>
          </div>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <div className="pdetail-head rv">
            <h1 className="pdetail-title">{p.type} in {p.cmp}</h1>
            <div className="pdetail-loc">
              <MapPin style={{ width: 15, height: 15 }} />
              <span>{p.cmp} · {p.zone}, New Cairo</span>
              <span>·</span>
              <span style={{ fontFamily: 'var(--mono)' }}>{p.code}</span>
            </div>
          </div>

          <div className="pdetail-layout">
            <div>
              <div className="gallery-main rv">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt={`${p.type} in ${p.cmp}`} />
                <div className="gallery-badges">
                  {p.tag && <span className="tag featured">{p.tag}</span>}
                  <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
                    {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
                  </span>
                </div>
                <Link href="/virtual-tour" className="gallery-3d-btn">
                  <Scan style={{ width: 15, height: 15 }} />
                  {isAr ? 'ابدأ الجولة ثلاثية الأبعاد' : 'Launch 3D Virtual Tour'}
                </Link>
              </div>

              <div className="gallery-thumbs">
                {thumbs.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhoto(src)}
                    style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer' }}
                    aria-label={`Photo ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>

              <div className="specs-grid rv">
                <div className="spec-box">
                  <span>{t('beds')}</span>
                  <b><BedDouble style={{ width: 15, height: 15 }} /> {p.beds}</b>
                </div>
                <div className="spec-box">
                  <span>{t('baths')}</span>
                  <b><Bath style={{ width: 15, height: 15 }} /> {p.bath}</b>
                </div>
                <div className="spec-box">
                  <span>{isAr ? 'المساحة' : 'Area'}</span>
                  <b><Scaling style={{ width: 15, height: 15 }} /> {p.area} m²</b>
                </div>
                <div className="spec-box">
                  <span>{isAr ? 'تقييم الذكاء' : 'AI score'}</span>
                  <b><Sparkles style={{ width: 15, height: 15 }} /> {p.ai.toFixed(1)}</b>
                </div>
              </div>

              <Reveal className="pdetail-desc">
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, margin: '28px 0 10px' }}>
                  {isAr ? 'عن الوحدة' : 'About this unit'}
                </h2>
                <p style={{ color: 'var(--muted)', maxWidth: '68ch' }}>
                  {isAr
                    ? `${p.type} بمساحة ${p.area} م² في ${p.cmp}، ${p.zone}. تضم ${p.beds} غرف نوم و${p.bath} حمامات، ومصنّفة ${p.ai.toFixed(1)} على مؤشر سييرا للذكاء العقاري بناءً على السعر مقارنة بالمثيل، ومعدل النمو، والطلب الحالي.`
                    : `A ${p.area} m² ${p.type.toLowerCase()} in ${p.cmp}, ${p.zone}. ${p.beds} bedrooms and ${p.bath} bathrooms, scored ${p.ai.toFixed(1)} on the Sierra intelligence index against live comparables, growth rate and current demand.`}
                </p>
              </Reveal>
            </div>

            {/* Sticky booking rail */}
            <aside>
              <div className="pdetail-cta rv">
                <div className="pd-price">{HZDATA.price(p)}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 16 }}>
                  {p.mode === 'rent' ? (isAr ? 'إيجار شهري' : 'Monthly rent') : (isAr ? 'سعر البيع' : 'Asking price')}
                </div>

                <a
                  className="btn btn-pri"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                  href={`https://wa.me/201092048333?text=${encodeURIComponent(
                    `Hello Sierra Estates — I'd like to view ${p.code} (${p.type} in ${p.cmp}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Calendar className="i" />
                  <span>{isAr ? 'احجز معاينة' : 'Book a viewing'}</span>
                </a>
                <a
                  className="btn btn-navy"
                  style={{ width: '100%', justifyContent: 'center' }}
                  href="tel:+201092048333"
                >
                  <Phone className="i" />
                  <span>{isAr ? 'اتصل بالمستشار' : 'Call an advisor'}</span>
                </a>

                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="av" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                    {p.agent.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <span style={{ fontSize: 12.5 }}>
                    <b style={{ display: 'block' }}>{p.agent}</b>
                    <span style={{ color: 'var(--muted)' }}>{isAr ? 'مستشار عقاري' : 'Listing advisor'}</span>
                  </span>
                </div>
              </div>
            </aside>
          </div>

          {/* Similar listings */}
          <Reveal className="sec-head" >
            <div>
              <h2>{isAr ? 'وحدات مشابهة' : 'Similar listings'}</h2>
              <p>{isAr ? 'اختيارات قريبة في نفس النطاق.' : 'Close matches in the same range.'}</p>
            </div>
          </Reveal>
          <div className="grid-props">
            {related.map((r, i) => <PropertyCard key={r.id} p={r} i={i} />)}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
