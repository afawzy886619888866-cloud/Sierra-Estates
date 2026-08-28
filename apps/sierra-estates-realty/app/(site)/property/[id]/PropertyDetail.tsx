'use client';

/** Port of deploy/property.html. */
import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin, BedDouble, Bath, Scaling, Scan, Sparkles, Phone, Calendar, ArrowRight, FileText,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { CurrencyGoldSelector } from '@/components/site/CurrencyGoldSelector';

export default function PropertyDetail({ id }: { id: string }) {
  const { t, isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];
  const p = listings.find((x) => String(x.id) === String(id));

  const gallery = (HZDATA.interiors as string[]) || [];
  const [photo, setPhoto] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const openLightbox = (idx: number) => {
    setActiveImgIndex(idx);
    setLightboxOpen(true);
  };

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
      {/* Print-Only Luxury Brochure Header and Watermark */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          nav, footer, .page-hero, .gallery-thumbs, .gallery-3d-btn, .mortgage-calc-box, .pdetail-card a, aside .btn {
            display: none !important;
          }
          .pdetail-layout {
            display: block !important;
          }
          .pdetail-head {
            margin-bottom: 24px !important;
          }
          .gallery-main img {
            max-height: 400px !important;
            width: 100% !important;
            object-fit: cover !important;
            border-radius: 8px !important;
          }
          .print-brochure-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
        }
        @media screen {
          .print-brochure-header {
            display: none;
          }
        }
      `}</style>

      {/* Print Brochure Header */}
      <div className="print-brochure-header">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>SIERRA ESTATES</h2>
          <span style={{ fontSize: 11, color: '#64748b' }}>Luxury Real Estate Portfolio · New Cairo &amp; North Coast</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#0f172a' }}>
          <b>Concierge Hotline:</b> +20 109 204 8333<br />
          <b>Ref Code:</b> {p.code}
        </div>
      </div>
      {/* Full-Screen Image Lightbox Modal */}
      {lightboxOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 6, 23, 0.95)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: 24,
              insetInlineEnd: 24,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: 40,
              height: 40,
              cursor: 'pointer',
              fontSize: 18,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbs[activeImgIndex] || hero}
            alt="Full view"
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              borderRadius: 16,
              objectFit: 'contain',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              color: '#fff',
              fontSize: 13,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : thumbs.length - 1))}
              className="btn btn-ghost"
              style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              ←
            </button>
            <span>{activeImgIndex + 1} / {thumbs.length}</span>
            <button
              type="button"
              onClick={() => setActiveImgIndex((prev) => (prev < thumbs.length - 1 ? prev + 1 : 0))}
              className="btn btn-ghost"
              style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              →
            </button>
          </div>
        </div>
      )}

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
              <div className="gallery-main rv" onClick={() => openLightbox(0)} style={{ cursor: 'zoom-in' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt={`${p.type} in ${p.cmp}`} />
                <div className="gallery-badges">
                  {p.tag && <span className="tag featured">{p.tag}</span>}
                  <span className={`tag ${p.mode === 'rent' ? 'rent' : 'sale'}`}>
                    {p.mode === 'rent' ? t('modeRent') : t('modeSale')}
                  </span>
                </div>
                <Link href="/virtual-tour" className="gallery-3d-btn" onClick={(e) => e.stopPropagation()}>
                  <Scan style={{ width: 15, height: 15 }} />
                  {isAr ? 'ابدأ الجولة ثلاثية الأبعاد' : 'Launch 3D Virtual Tour'}
                </Link>
              </div>

              <div className="gallery-thumbs">
                {thumbs.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPhoto(src);
                      openLightbox(i);
                    }}
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

                {/* Mortgage & Investment Yield Analyzer */}
                <div
                  className="mortgage-calc-box"
                  style={{
                    marginTop: 28,
                    padding: 20,
                    borderRadius: 16,
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🧮</span> {isAr ? 'حاسبة التمويل والعائد الاستثماري' : 'Mortgage & Investment Yield Analyzer'}
                    </h3>
                    <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(52, 211, 153, 0.1)' }}>
                      {isAr ? 'تحليل لحظي' : 'Live Calculation'}
                    </span>
                  </div>

                  {(() => {
                    const baseEGP = p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 12_000_000);
                    const downPayment = (baseEGP * 30) / 100;
                    const financedAmount = baseEGP - downPayment;
                    const monthlyMortgage = Math.round((financedAmount * (1 + 0.12 * 7)) / (7 * 12));
                    const estMonthlyRent = Math.round((baseEGP * 0.085) / 12);
                    const netMonthlyCarry = monthlyMortgage - estMonthlyRent;

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12.5 }}>
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'المقدم التقديري (30%)' : 'Down Payment (30%)'}</span>
                          <strong style={{ fontSize: 15, color: '#5FC9FF', fontFamily: 'var(--mono)' }}>
                            {(downPayment / 1_000_000).toFixed(2)}M EGP
                          </strong>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'القسط الشهري (7 سنوات)' : 'Monthly Payment (7 Yrs)'}</span>
                          <strong style={{ fontSize: 15, color: '#fff', fontFamily: 'var(--mono)' }}>
                            {monthlyMortgage.toLocaleString()} EGP
                          </strong>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'الإيجار المتوقع شهرياً' : 'Est. Monthly Rent'}</span>
                          <strong style={{ fontSize: 15, color: '#34D399', fontFamily: 'var(--mono)' }}>
                            +{estMonthlyRent.toLocaleString()} EGP
                          </strong>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'صافي التكلفة الشهرية' : 'Net Monthly Carry'}</span>
                          <strong style={{ fontSize: 15, color: '#FCD34D', fontFamily: 'var(--mono)' }}>
                            {netMonthlyCarry.toLocaleString()} EGP/mo
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Reveal>
            </div>

            {/* Sticky booking rail */}
            <aside>
              <div className="pdetail-cta rv">
                <div className="pd-price">{HZDATA.price(p)}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 12 }}>
                  {p.mode === 'rent' ? (isAr ? 'إيجار شهري' : 'Monthly rent') : (isAr ? 'سعر البيع' : 'Asking price')}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <CurrencyGoldSelector basePriceEGP={p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 10000000)} />
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
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                  href="tel:+201092048333"
                >
                  <Phone className="i" />
                  <span>{isAr ? 'اتصل بالمستشار' : 'Call an advisor'}</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, border: '1px solid var(--line)', marginBottom: 8 }}
                >
                  <FileText className="i" style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'تحميل البروشور (PDF)' : 'Download PDF Brochure'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const icsContent = [
                      'BEGIN:VCALENDAR',
                      'VERSION:2.0',
                      'PRODID:-//Sierra Estates//VIP Viewing//EN',
                      'BEGIN:VEVENT',
                      `SUMMARY:VIP Viewing: ${p.code} (${p.type} in ${p.cmp})`,
                      `DESCRIPTION:Private property walkthrough scheduled with ${p.agent} (Sierra Estates). Contact: +201092048333`,
                      `LOCATION:${p.cmp}, ${p.zone}, New Cairo`,
                      'DTSTART:20260901T100000Z',
                      'DTEND:20260901T110000Z',
                      'END:VEVENT',
                      'END:VCALENDAR',
                    ].join('\r\n');
                    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `sierra-viewing-${p.code}.ics`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, border: '1px solid var(--line)' }}
                >
                  <Calendar className="i" style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'حفظ الموعد في التقويم (.ics)' : 'Add to Calendar (.ics)'}</span>
                </button>

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
