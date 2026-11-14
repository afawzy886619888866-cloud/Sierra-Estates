'use client';

import '../../site-styles/index.css';
import '../../site-styles/site-refinements.css';
import React from 'react';
import Link from 'next/link';
import SiteShell from '@/components/site/SiteShell';
import InquiryForm from '@/components/client/InquiryForm';
import { useSite } from '@/lib/site/SiteContext';
import { Sparkles, PlusCircle } from 'lucide-react';

export default function RequestPage() {
  const { lang } = useSite();
  const isAr = lang === 'ar';

  return (
    <SiteShell active="contact">
      <div className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="sep">/</span>
            <span>
              {isAr
                ? 'اطلب عقارك · عرض البلاك فرايداي خصم 25% حتى 25 نوفمبر 2026'
                : 'Property Request · Black Friday 25% OFF till 25 Nov 2026'}
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #c9a84c 0%, #dfad3a 100%)',
              color: '#061122',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.05em',
              marginBottom: 14,
              boxShadow: '0 0 18px rgba(201, 168, 76, 0.5)',
            }}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            <span>
              {isAr
                ? 'عرض البلاك فرايداي من سييرا إستيتس · خصم 25% على رسوم الخدمة حتى 25 نوفمبر 2026'
                : 'SIERRA ESTATES BLACK FRIDAY OFFER · 25% OFF SERVICE TILL 25TH NOVEMBER 2026'}
            </span>
          </div>

          <h1>
            {isAr
              ? 'اطلب عقارك بخصم 25% على الخدمة (عرض البلاك فرايداي)'
              : 'Request Your Property — 25% OFF Service (Black Friday Offer)'}
          </h1>
          <p className="sub">
            {isAr
              ? 'حدد مواصفات وحدتك المثالية وسيتواصل معك كبار مستشاري سييرا بقائمة مخصصة وموثقة مع تثبيت خصم 25% على رسوم الخدمة ساري حتى 25 نوفمبر 2026.'
              : 'Specify your ideal property criteria and a Senior Sierra Advisor will prepare a verified shortlist with your 25% Black Friday service fee discount locked in (valid till 25th November 2026).'}
          </p>

          <div style={{ marginTop: 18 }}>
            <Link
              href="/easy-listing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(233,193,118,0.35)',
                color: '#e9c176',
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <PlusCircle style={{ width: 14, height: 14, color: '#10b981' }} />
              <span>
                {isAr
                  ? 'هل لديك وحدة للبيع أو الإيجار؟ اضغط هنا لإضافتها ومزامنتها فوراً ←'
                  : 'Have a unit to sell or rent? Click here to Add Listing & Multi-Sync →'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <section className="block">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <InquiryForm />
        </div>
      </section>
    </SiteShell>
  );
}
