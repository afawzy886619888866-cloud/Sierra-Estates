'use client';

/** Port of deploy/property.html. */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin, BedDouble, Bath, Scaling, Scan, Sparkles, Phone, Calendar, ArrowRight, FileText,
  ShieldCheck, Paintbrush, CheckCircle2,
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import PropertyCard, { type CardListing } from '@/components/site/PropertyCard';
import { Reveal } from '@/components/site/Reveal';
import { useSite } from '@/lib/site/SiteContext';
import { HZDATA } from '@/lib/site/data';
import { CurrencyGoldSelector } from '@/components/site/CurrencyGoldSelector';
import { getCuratedListingImage } from '@/lib/site/luxury-images';

export default function PropertyDetail({ id }: { id: string }) {
  const { t, isAr } = useSite();
  const listings = HZDATA.listings as CardListing[];

<<<<<<< HEAD
  // Live inventory lookup — the same source that powers /properties and the
  // map. Falls back to the static catalog only if the API has no match.
=======
  // Phase 4/B3: single-row lookup via /api/listings/[id] instead of
  // downloading the entire inventory to render one unit. The endpoint returns
  // the app-vocabulary record (compound/price/beds/area/mode/…) and a real
  // 404 for unknown ids — no fabricated fallback (Master Rule 5).
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  const [liveUnit, setLiveUnit] = useState<CardListing | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    let cancelled = false;
<<<<<<< HEAD
    const needle = String(id).trim().toLowerCase();
    fetch('/api/inventory')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || !Array.isArray(d.units)) return;
        const u = d.units.find((x: any) =>
          String(x.code || '').toLowerCase() === needle ||
          String(x.id || '').toLowerCase() === needle
        );
        if (u) {
          const mode = u.mode === 'rent' || u.dealType === 'rent' ? 'rent' : 'sale';
          setLiveUnit({
            id: 0,
            code: u.code || u.id,
            cmp: u.compound || u.location || 'New Cairo',
            zone: u.zone || 'New Cairo',
            type: u.propertyType || u.type || 'Apartment',
            beds: u.beds ?? 3,
            bath: u.bath ?? 2,
            area: u.area ?? 0,
            egpM: u.egpM ?? (u.price ? Number((u.price / 1_000_000).toFixed(1)) : 0),
            usd: u.usd ?? (u.price ? (mode === 'rent' ? Math.round(u.price / 50) : Math.round(u.price / 48.5)) : 0),
            ai: Number(u.aiScore ?? 8.5),
            tag: u.isNew ? 'New Listing' : 'Live Inventory',
            mode,
            agent: 'Sierra Advisor Desk',
            ago: u.timestamp || 'Live sync',
            img: u.img || u.photoUrl || (Array.isArray(u.images) && u.images[0]) || '',
          });
        }
=======
    fetch(`/api/listings/${encodeURIComponent(String(id))}`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`listings API ${r.status}`);
        return r.json();
      })
      .then((u: any) => {
        if (cancelled || !u || !u.id) return;
        const mode = u.mode === 'rent' || u.dealType === 'rent' ? 'rent' : 'sale';
        const price = Number(u.price) || 0;
        setLiveUnit({
          id: 0,
          code: u.code || u.referenceCode || u.refId || String(u.id),
          cmp: u.compound || u.locationArea || '',
          zone: u.zone || u.locationArea || '',
          type: u.type || u.propertyType || '',
          beds: u.beds ?? 0,
          bath: u.bath ?? 0,
          area: u.area ?? u.areaSqm ?? 0,
          egpM: price > 0 ? Number((price / 1_000_000).toFixed(1)) : 0,
          usd: price > 0 ? (mode === 'rent' ? Math.round(price / 50) : Math.round(price / 48.5)) : 0,
          ai: Number(u.ai ?? 0),
          tag: u.tag || (mode === 'rent' ? 'Rent' : 'Sale'),
          mode,
          agent: 'Sierra Advisor Desk',
          ago: u.ago || 'Live sync',
          img: u.img || (Array.isArray(u.images) && u.images[0]) || '',
        });
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const p: CardListing | undefined = liveUnit ||
    ((HZDATA as any).findListing?.(id) ||
      listings.find((x) => String(x.id) === String(id) || String(x.code).toLowerCase() === String(id).toLowerCase()));

  const gallery = (HZDATA.interiors as string[]) || [];
  const [photo, setPhoto] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
<<<<<<< HEAD
=======

  // ── Phase 8: real viewing request flow (PROPERTY → REQUEST → SLOT →
  // CONFIRM). The old block here downloaded an .ics with a HARDCODED PAST
  // DATE (2026-09-01) — a fabricated slot. This form writes a real
  // public.viewings row via /api/viewing-requests and only then offers
  // calendar/WhatsApp confirmation for the REAL chosen date.
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTime, setViewingTime] = useState('morning');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [viewingResult, setViewingResult] = useState<
    { ok: true; whatsappConfirmUrl: string; calendarLink: string; date: string } | { ok: false; error: string } | null
  >(null);

  const submitViewingRequest = async () => {
    if (!viewingDate || !visitorName.trim() || !visitorPhone.trim()) {
      setViewingResult({ ok: false, error: isAr ? 'يرجى إدخال الاسم والهاتف والتاريخ.' : 'Please provide your name, phone, and a preferred date.' });
      return;
    }
    setViewingSubmitting(true);
    setViewingResult(null);
    try {
      const res = await fetch('/api/viewing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyCode: p?.code || String(id),
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim(),
          preferredDate: viewingDate,
          preferredTime: viewingTime,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setViewingResult({ ok: true, whatsappConfirmUrl: data.whatsappConfirmUrl, calendarLink: data.calendarLink, date: viewingDate });
      } else {
        setViewingResult({ ok: false, error: data.error || `Request failed (HTTP ${res.status})` });
      }
    } catch (e: unknown) {
      setViewingResult({ ok: false, error: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setViewingSubmitting(false);
    }
  };
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const openLightbox = (idx: number) => {
    setActiveImgIndex(idx);
    setLightboxOpen(true);
  };

  if (!p && loadingLive) {
    // Avoid a "not found" flash while the live lookup is in flight.
    return (
      <SiteShell active="best">
        <section className="block" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
          <div className="wrap" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            {isAr ? 'جاري تحميل الوحدة…' : 'Loading listing…'}
          </div>
        </section>
      </SiteShell>
    );
  }

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

  const heroImg = p.img || getCuratedListingImage({ code: p.code, compound: p.cmp, type: p.type }, 0);
  const hero = photo || heroImg;
  const thumbs = [heroImg, ...gallery].slice(0, 6);
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
<<<<<<< HEAD
            <span>{p.type} in {p.cmp}</span>
=======
            <span>{p.type || (isAr ? 'وحدة عقارية' : 'Property')} in {p.cmp || '—'}</span>
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
          </div>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <div className="pdetail-head rv">
<<<<<<< HEAD
            <h1 className="pdetail-title">{p.type} in {p.cmp}</h1>
            <div className="pdetail-loc">
              <MapPin style={{ width: 15, height: 15 }} />
              <span>{p.cmp} · {p.zone}, New Cairo</span>
=======
            <h1 className="pdetail-title">{p.type || (isAr ? 'وحدة عقارية' : 'Property')} in {p.cmp || '—'}</h1>
            <div className="pdetail-loc">
              <MapPin style={{ width: 15, height: 15 }} />
              <span>{[p.cmp, p.zone].filter(Boolean).join(' · ')}</span>
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
              <span>·</span>
              <span style={{ fontFamily: 'var(--mono)' }}>{p.code}</span>
            </div>
          </div>

          <div className="pdetail-layout">
            <div>
              <div className="gallery-main rv" onClick={() => openLightbox(0)} style={{ cursor: 'zoom-in' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
<<<<<<< HEAD
                <img src={hero} alt={`${p.type} in ${p.cmp}`} />
                <div className="gallery-badges flex flex-wrap gap-1.5">
=======
                <img src={hero} alt={`${p.type || 'Property'} in ${p.cmp || '—'}`} />
                <div className="gallery-badges flex flex-wrap gap-1.5">
                  {!photo && !p.img && (
                    <span
                      className="tag"
                      title={isAr ? 'صورة تعبيرية من الكتالوج — صور الوحدة الفعلية قيد التحقق' : 'Representative catalog imagery — actual unit photos pending verification'}
                      style={{ background: 'rgba(15,23,42,0.85)', color: '#e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {isAr ? '📷 صورة تعبيرية' : '📷 Representative imagery'}
                    </span>
                  )}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                  <span className="tag" style={{ background: '#0A1628', color: '#C9A84C', border: '1px solid #C9A84C', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck style={{ width: 12, height: 12 }} />
                    <span>{isAr ? 'مالك مباشر' : 'Direct Owner'}</span>
                  </span>
                  <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles style={{ width: 12, height: 12 }} />
                    <span>{isAr ? 'تم التحقق حديثاً' : 'Verified Fresh'}</span>
                  </span>
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

              {/* Upfront Essential Metrics */}
              <div className="specs-grid rv">
                <div className="spec-box">
                  <span>{t('beds')}</span>
<<<<<<< HEAD
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
                  <span>{isAr ? 'التشطيب' : 'Finishing'}</span>
                  <b style={{ color: '#C9A84C' }}><Paintbrush style={{ width: 15, height: 15 }} /> {p.finishing || 'Ultra Super Lux'}</b>
                </div>
                <div className="spec-box">
                  <span>{isAr ? 'الجاهزية' : 'Availability'}</span>
                  <b style={{ color: '#10B981' }}><CheckCircle2 style={{ width: 15, height: 15 }} /> {p.availability || 'Available'}</b>
                </div>
=======
                  <b><BedDouble style={{ width: 15, height: 15 }} /> {p.beds > 0 ? p.beds : '?'}</b>
                </div>
                <div className="spec-box">
                  <span>{t('baths')}</span>
                  <b><Bath style={{ width: 15, height: 15 }} /> {p.bath > 0 ? p.bath : '?'}</b>
                </div>
                <div className="spec-box">
                  <span>{isAr ? 'المساحة' : 'Area'}</span>
                  <b><Scaling style={{ width: 15, height: 15 }} /> {p.area > 0 ? p.area : '?'} m²</b>
                </div>
                {p.finishing && (
                  <div className="spec-box">
                    <span>{isAr ? 'التشطيب' : 'Finishing'}</span>
                    <b style={{ color: '#C9A84C' }}><Paintbrush style={{ width: 15, height: 15 }} /> {p.finishing}</b>
                  </div>
                )}
                {p.availability && (
                  <div className="spec-box">
                    <span>{isAr ? 'الجاهزية' : 'Availability'}</span>
                    <b style={{ color: '#10B981' }}><CheckCircle2 style={{ width: 15, height: 15 }} /> {p.availability}</b>
                  </div>
                )}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                {p.area > 0 && (p.egpM > 0 || p.usd > 0) && (
                  <div className="spec-box">
                    <span>{isAr ? 'سعر المتر' : 'Price / m²'}</span>
                    <b style={{ color: '#C9A84C' }}>
                      {Math.round(
                        (p.egpM ? p.egpM * 1_000_000 : (p.usd || 0) * 48.65) / p.area
                      ).toLocaleString()} EGP
                    </b>
                  </div>
                )}
              </div>

              <Reveal className="pdetail-desc">
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, margin: '28px 0 10px' }}>
                  {isAr ? 'عن الوحدة' : 'About this unit'}
                </h2>
                <p style={{ color: 'var(--muted)', maxWidth: '68ch' }}>
                  {isAr
<<<<<<< HEAD
                    ? `${p.type} بمساحة ${p.area} م² في ${p.cmp}، ${p.zone}. تضم ${p.beds} غرف نوم و${p.bath} حمامات، ومصنّفة ${p.ai.toFixed(1)} على مؤشر سييرا للذكاء العقاري بناءً على السعر مقارنة بالمثيل، ومعدل النمو، والطلب الحالي.`
                    : `A ${p.area} m² ${p.type.toLowerCase()} in ${p.cmp}, ${p.zone}. ${p.beds} bedrooms and ${p.bath} bathrooms, scored ${p.ai.toFixed(1)} on the Sierra intelligence index against live comparables, growth rate and current demand.`}
=======
                    ? `${p.type || 'وحدة'} بمساحة ${p.area > 0 ? p.area : '—'} م² في ${p.cmp || '—'}${p.zone ? `، ${p.zone}` : ''}.${p.beds > 0 ? ` تضم ${p.beds} غرف نوم و${p.bath > 0 ? p.bath : '—'} حمامات.` : ''}${p.ai > 0 ? ` ومصنّفة ${p.ai.toFixed(1)} على مؤشر سييرا للذكاء العقاري بناءً على السعر مقارنة بالمثيل، ومعدل النمو، والطلب الحالي.` : ''}`
                    : `A ${p.area > 0 ? p.area : '—'} m² ${p.type ? p.type.toLowerCase() : 'property'} in ${p.cmp || '—'}${p.zone ? `, ${p.zone}` : ''}.${p.beds > 0 ? ` ${p.beds} bedrooms and ${p.bath > 0 ? p.bath : '—'} bathrooms.` : ''}${p.ai > 0 ? ` Scored ${p.ai.toFixed(1)} on the Sierra intelligence index against live comparables, growth rate and current demand.` : ''}`}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
<<<<<<< HEAD
                    const baseEGP = p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 12_000_000);
=======
                    // §21 no-fabrication: the analyzer needs a REAL price.
                    // Without one it says so — it never computes from a
                    // invented 12M EGP base.
                    const hasBasePrice = p.egpM > 0 || p.usd > 0;
                    if (!hasBasePrice) {
                      return (
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '6px 2px' }}>
                          {isAr
                            ? 'السعر غير متاح لهذه الوحدة — لا يمكن احتساب التمويل أو العائد الاستثماري بدقة. تواصل معنا للحصول على التسعيرة المحدثة.'
                            : 'No price on file for this unit — mortgage and yield figures cannot be calculated honestly. Contact us for the current asking price.'}
                        </div>
                      );
                    }
                    const baseEGP = p.egpM ? p.egpM * 1_000_000 : p.usd * 48.65;
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>{isAr ? 'العائد الصافي (Cap Rate)' : 'Net Cap Rate / Yield'}</span>
                          <strong style={{ fontSize: 15, color: '#38BDF8', fontFamily: 'var(--mono)' }}>
<<<<<<< HEAD
                            {p.yield ? `${p.yield}%` : '8.5%'}
=======
                            {p.yield ? `${p.yield}%` : (isAr ? 'غير متاح' : 'N/A')}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
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
              <div className="pdetail-cta luxury-inst-card rv">
                {(() => {
                  const isRent = p.mode === 'rent';
<<<<<<< HEAD
                  const rawPrice = p.price || (p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 10_000_000));
                  const formattedEgpPrice = `${Math.round(rawPrice).toLocaleString()} EGP${isRent ? '/mo' : ''}`;
=======
                  // §21: honest price — "Price on request" when unknown,
                  // never an invented 10M EGP figure.
                  const rawPrice = p.price || (p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 0));
                  const hasPrice = rawPrice > 0;
                  const formattedEgpPrice = hasPrice
                    ? `${Math.round(rawPrice).toLocaleString()} EGP${isRent ? '/mo' : ''}`
                    : (isAr ? 'السعر عند الطلب' : 'Price on request');
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

                  return (
                    <>
                      <div className="pd-price font-mono font-bold" style={{ color: '#C9A84C' }}>
                        {formattedEgpPrice}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 12 }}>
<<<<<<< HEAD
                        {isRent ? (isAr ? 'إيجار شهري موثق' : 'Verified Monthly Rent') : (isAr ? 'سعر البيع الإجمالي (معلن)' : 'Asking Price')}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <CurrencyGoldSelector basePriceEGP={p.egpM ? p.egpM * 1_000_000 : (p.usd ? p.usd * 48.65 : 10000000)} />
                      </div>
=======
                        {isRent ? (isAr ? 'إيجار شهري' : 'Monthly Rent') : (isAr ? 'سعر البيع الإجمالي (معلن)' : 'Asking Price')}
                      </div>

                      {hasPrice && (
                        <div style={{ marginBottom: 16 }}>
                          <CurrencyGoldSelector basePriceEGP={p.egpM ? p.egpM * 1_000_000 : p.usd * 48.65} />
                        </div>
                      )}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1

                      <button
                        type="button"
                        onClick={() => {
                          const event = new CustomEvent('sierra:add-to-shortlist', {
                            detail: {
                              id: p.code || p.id,
                              code: p.code,
                              compound: p.cmp,
                              type: p.type,
                              price: formattedEgpPrice,
                              img: p.img,
                            },
                          });
                          window.dispatchEvent(event);
                        }}
                        className="btn btn-ghost"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          fontSize: 13,
                          border: '1px solid rgba(201, 168, 76, 0.4)',
                          color: '#C9A84C',
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                        }}
                      >
                        <span>✨</span>
                        <span>{isAr ? 'إضافة إلى سلة المعاينة VIP' : 'Add to VIP Viewing Basket'}</span>
                      </button>

                      <a
                        className="btn btn-pri"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          marginBottom: 10,
                          background: '#25D366',
                          borderColor: '#25D366',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        href={`https://wa.me/201092048333?text=${encodeURIComponent(
                          isAr
                            ? `مرحباً سييرا العقارية، أود الاستفسار وحجز موعد معاينة خاصة للوحدة [${p.code}] في ${p.cmp} (${formattedEgpPrice}).`
                            : `Hello Sierra Estates — I would like to book a private viewing tour for unit [${p.code}] in ${p.cmp} (${formattedEgpPrice}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Phone className="i" />
                        <span>{isAr ? 'حجز واستفسار فوري (واتساب)' : 'Instant WhatsApp Inquiry & Tour'}</span>
                      </a>
                    </>
                  );
                })()}
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
<<<<<<< HEAD
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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.cmp} ${p.zone || 'New Cairo'} Egypt`)}`}
=======
                {/* Phase 8 — real viewing request flow (replaces the old
                    hardcoded-date .ics download, which fabricated a slot) */}
                <button
                  type="button"
                  onClick={() => setShowViewingForm((v) => !v)}
                  className="btn btn-navy"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginBottom: showViewingForm ? 6 : 8 }}
                >
                  <Calendar className="i" style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'طلب موعد معاينة' : 'Request a Viewing'}</span>
                </button>
                {showViewingForm && (
                  <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewingResult?.ok ? (
                      <>
                        <p style={{ fontSize: 12.5, color: '#0f9d76', fontWeight: 700, margin: 0 }}>
                          {isAr ? `✓ تم استلام طلبك لموعد ${viewingResult.date} — سيتواصل الفريق للتأكيد.` : `✓ Request received for ${viewingResult.date} — our team will confirm shortly.`}
                        </p>
                        <a className="btn btn-pri" href={viewingResult.whatsappConfirmUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center', fontSize: 12, background: '#25D366', borderColor: '#25D366', color: '#fff' }}>
                          {isAr ? 'تأكيد عبر واتساب' : 'Confirm via WhatsApp'}
                        </a>
                        <a className="btn btn-ghost" href={viewingResult.calendarLink} target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                          <Calendar className="i" style={{ width: 14, height: 14 }} />
                          <span>{isAr ? 'أضف إلى تقويم جوجل' : 'Add to Google Calendar'}</span>
                        </a>
                      </>
                    ) : (
                      <>
                        {viewingResult && !viewingResult.ok && (
                          <p style={{ fontSize: 12, color: '#c75a4e', margin: 0 }} role="alert">⚠ {viewingResult.error}</p>
                        )}
                        <input type="date" value={viewingDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setViewingDate(e.target.value)} aria-label={isAr ? 'التاريخ المفضل' : 'Preferred date'} style={{ fontSize: 12 }} />
                        <select value={viewingTime} onChange={(e) => setViewingTime(e.target.value)} aria-label={isAr ? 'الوقت المفضل' : 'Preferred time'} style={{ fontSize: 12 }}>
                          <option value="morning">{isAr ? 'صباحاً (10ص - 12م)' : 'Morning (10:00–12:00)'}</option>
                          <option value="afternoon">{isAr ? 'ظهراً (12م - 3م)' : 'Afternoon (12:00–15:00)'}</option>
                          <option value="sunset">{isAr ? 'العصر (3م - 6م)' : 'Late afternoon (15:00–18:00)'}</option>
                        </select>
                        <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder={isAr ? 'الاسم' : 'Your name'} aria-label={isAr ? 'الاسم' : 'Your name'} style={{ fontSize: 12 }} maxLength={100} />
                        <input type="tel" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} placeholder={isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'} aria-label={isAr ? 'رقم الهاتف' : 'Phone number'} style={{ fontSize: 12 }} maxLength={20} />
                        <button type="button" className="btn btn-gold" onClick={submitViewingRequest} disabled={viewingSubmitting} style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                          {viewingSubmitting ? (isAr ? 'جاري الإرسال…' : 'Submitting…') : isAr ? 'إرسال طلب المعاينة' : 'Send viewing request'}
                        </button>
                        <p style={{ fontSize: 10.5, color: 'var(--muted)', margin: 0 }}>
                          {isAr ? 'يُسجَّل الطلب في نظامنا ويصل تنبيه فوري لفريق العمليات.' : 'Creates a real request in our system and instantly alerts our operations team.'}
                        </p>
                      </>
                    )}
                  </div>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${[p.cmp, p.zone].filter(Boolean).join(' ')} Egypt`.trim())}`}
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12, border: '1px solid var(--line)', marginTop: 8 }}
                >
                  <MapPin className="i" style={{ width: 14, height: 14, color: '#38BDF8' }} />
                  <span>{isAr ? 'اتجاهات الموقع (Google Maps)' : 'Live Route Directions (Google Maps)'}</span>
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
