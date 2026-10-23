'use client';

/** Footer — port of footerHTML() in deploy/shared.js. */
import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { Facebook, Instagram, Linkedin, Twitter } from './SocialIcons';
import { useSite } from '@/lib/site/SiteContext';

export default function SiteFooter() {
  const { t, lang } = useSite();
  const isAr = lang === 'ar';
  const cairoPlazaHref = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const careerHref = isAr ? '/ar/career' : '/career';
  const infoBankHref = isAr ? '/ar/notebookllm' : '/notebookllm';

  return (
    <footer id="site-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link href="/" className="brand">
              <span className="mark logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo-mark.png" alt="Sierra Estates" />
              </span>
              <span>
                <b>Sierra Estates</b>
                <small>{t('brandSub')}</small>
              </span>
            </Link>
            <p className="blurb">{t('footBlurb')}</p>
            <div className="news">
              <input placeholder={t('footNews')} aria-label={t('footNews')} />
              <button type="button" aria-label={t('footNews')}>
                <ArrowRight className="i" />
              </button>
            </div>
          </div>

          <div className="fcol">
            <h5>{t('fExplore')}</h5>
            <Link href="/properties">{isAr ? 'عقارات للبيع والإيجار' : 'Properties (Buy & Rent)'}</Link>
            <Link href="/compounds">{t('fCpds')}</Link>
            <Link href="/net" style={{ color: '#e9c176', fontWeight: 600 }}>
              🎯 {isAr ? 'الخريطة والرادار العقاري' : 'Map & Radar Scanner'}
            </Link>
            <Link href="/add-listing" style={{ color: '#10b981', fontWeight: 600 }}>
              ➕ {isAr ? 'إضافة عقار (مالك أو وسيط)' : 'Add Property Listing'}
            </Link>
            <Link href="/#contact">
              📝 {isAr ? 'طلب وحدة مخصصة' : 'Request Bespoke Unit'}
            </Link>
          </div>

          <div className="fcol">
            <h5>{isAr ? 'المشاريع وبنك المعلومات' : 'Projects & Intelligence'}</h5>
            <Link href={cairoPlazaHref} style={{ color: '#e9c176', fontWeight: 600 }}>
              🏢 {isAr ? 'مشاريع كايرو بلازا' : 'Cairo Plaza Projects'}
            </Link>
            <Link href={infoBankHref} style={{ color: '#d4af37', fontWeight: 600 }}>
              🏦 {isAr ? 'بنك معلومات القاهرة الجديدة' : 'New Cairo Info Bank'}
            </Link>
            <Link href={careerHref}>
              💼 {isAr ? 'انضم لفريقنا (وظائف)' : 'Careers & Opportunities'}
            </Link>
            <Link href="/#contact">{t('fAgent')}</Link>
          </div>

          <div className="fcol">
            <h5>{t('fDiscover')}</h5>
            <Link href="/compounds">{t('z1')}</Link>
            <Link href="/compounds">{t('z2')}</Link>
            <Link href="/compounds">{t('z3')}</Link>
            <Link href="/compounds">{t('z4')}</Link>
          </div>

          <div className="fcol">
            <h5>{t('fTouch')}</h5>
            <div className="contact-line"><MapPin className="i" /><span>{t('fAddr')}</span></div>
            <div className="contact-line"><Phone className="i" /><span>+2 01092048333</span></div>
            <div className="contact-line"><Mail className="i" /><span>Info@sierra-estates.net</span></div>
          </div>
        </div>

        <div className="foot-bottom">
          <span>{t('rights')}</span>
          <div className="socials">
            <a href="#" aria-label="Facebook"><Facebook className="i" /></a>
            <a href="#" aria-label="Instagram"><Instagram className="i" /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin className="i" /></a>
            <a href="#" aria-label="Twitter"><Twitter className="i" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
