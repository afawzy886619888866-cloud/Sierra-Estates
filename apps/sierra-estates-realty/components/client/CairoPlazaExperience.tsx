'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import CairoPlazaCalculator from './CairoPlazaCalculator';

const CairoPlazaScene = dynamic(() => import('./CairoPlazaScene'), {
  ssr: false,
  loading: () => <div className="cp-tour-fallback">Loading interactive tour…</div>,
});

type Props = { lang?: 'en' | 'ar'; section: 'overview' | 'inventory' | 'investor' | 'contact' };

type EvidenceImage = {
  src: string;
  altEn: string;
  altAr: string;
  titleEn: string;
  titleAr: string;
  captionEn: string;
  captionAr: string;
};

const realEvidence: EvidenceImage[] = [
  {
    src: '/cairo-plaza/real-facade-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza façade with Banque Misr frontage',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لواجهة كايرو بلازا مع واجهة بنك مصر',
    titleEn: 'Main façade',
    titleAr: 'الواجهة الرئيسية',
    captionEn: 'AI-enhanced current-site evidence · façade and visible businesses preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على الواجهة والأنشطة الظاهرة',
  },
  {
    src: '/cairo-plaza/real-tower-frontage-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza tower frontage',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لواجهة برج كايرو بلازا',
    titleEn: 'Tower frontage',
    titleAr: 'واجهة البرج',
    captionEn: 'AI-enhanced current-site evidence · building geometry preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على تكوين المبنى',
  },
  {
    src: '/cairo-plaza/real-entrance-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza entrance and active frontage',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لمدخل كايرو بلازا والواجهة العاملة',
    titleEn: 'Entrance and frontage',
    titleAr: 'المدخل والواجهة',
    captionEn: 'AI-enhanced current-site evidence · visible signage and street context preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على اللافتات وسياق الشارع',
  },
  {
    src: '/cairo-plaza/real-interior-context-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza construction context',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لسياق أعمال الإنشاء في كايرو بلازا',
    titleEn: 'Construction context',
    titleAr: 'سياق الإنشاء',
    captionEn: 'AI-enhanced current-site evidence · current construction state preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على حالة الإنشاء الحالية',
  },
  {
    src: '/cairo-plaza/real-site-context-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of Cairo Plaza site context',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لسياق موقع كايرو بلازا',
    titleEn: 'Site context',
    titleAr: 'سياق الموقع',
    captionEn: 'AI-enhanced current-site evidence · current conditions preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على الظروف الحالية',
  },
  {
    src: '/cairo-plaza/real-frontage-context-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza frontage context',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لسياق واجهة كايرو بلازا',
    titleEn: 'Frontage context',
    titleAr: 'سياق الواجهة',
    captionEn: 'AI-enhanced current-site evidence · source details preserved',
    captionAr: 'دليل حقيقي محسّن بالذكاء الاصطناعي · الحفاظ على تفاصيل المصدر',
  },
];

const copy = {
  en: {
    overview: { eyebrow: 'CAIRO PLAZA / OVERVIEW', title: 'A strategic address directly in front of Al-Mataria Metro Station.', body: 'Explore the current project evidence, tower context, and the distinction between real-site photography and AI concept visuals.' },
    inventory: { eyebrow: 'CAIRO PLAZA / AVAILABLE INVENTORY', title: 'Review the units prepared for investor and operator conversations.', body: 'Inventory is presented as an illustrative working schedule and should be confirmed against the latest official availability before any commitment.' },
    investor: { eyebrow: 'CAIRO PLAZA / INVESTOR PACK', title: 'Move from project context to an informed investment conversation.', body: 'Request the bilingual investor pack, illustrative scenario model, and verification checklist.' },
    contact: { eyebrow: 'CAIRO PLAZA / CONTACT', title: 'Choose the right conversation for your mandate.', body: 'Keep investor-pack requests separate from tenant-fit and operator enquiries so each lead receives the right follow-up.' },
  },
  ar: {
    overview: { eyebrow: 'كايرو بلازا / نظرة عامة', title: 'عنوان استراتيجي أمام محطة مترو المطرية.', body: 'استعرض أدلة الموقع الحالي وسياق الأبراج والفصل الواضح بين الصور الحقيقية وتصوّرات الذكاء الاصطناعي.' },
    inventory: { eyebrow: 'كايرو بلازا / الوحدات المتاحة', title: 'استعرض الوحدات المعدة لمحادثات المستثمرين والمشغلين.', body: 'المخزون المعروض جدول عمل توضيحي ويجب تأكيده وفق أحدث توافر رسمي قبل أي التزام.' },
    investor: { eyebrow: 'كايرو بلازا / الملف الاستثماري', title: 'انتقل من فهم المشروع إلى محادثة استثمارية مدروسة.', body: 'اطلب الملف الاستثماري الثنائي اللغة، ونموذج السيناريوهات التوضيحية، وقائمة التحقق.' },
    contact: { eyebrow: 'كايرو بلازا / تواصل', title: 'اختر المسار المناسب لطبيعة طلبك.', body: 'نحافظ على فصل طلبات الملف الاستثماري عن طلبات تأهيل المستأجرين والمشغلين لضمان المتابعة المناسبة.' },
  },
} as const;

export default function CairoPlazaExperience({ lang = 'en', section }: Props) {
  const isAr = lang === 'ar';
  const t = copy[lang][section];
  const prefix = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const nav = [
    ['overview', isAr ? 'نظرة عامة' : 'Overview'],
    ['inventory', isAr ? 'الوحدات المتاحة' : 'Available inventory'],
    ['investor', isAr ? 'الملف الاستثماري' : 'Investor pack'],
    ['contact', isAr ? 'تواصل' : 'Contact'],
  ] as const;

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} className="cp-shell">
      <header className="cp-header">
        <div className="cp-header-inner">
          <Link href={isAr ? '/ar/cairo-plaza' : '/cairo-plaza'} className="cp-brand" aria-label={isAr ? 'سييرا استيتس — كايرو بلازا' : 'Sierra Estates — Cairo Plaza'}>
            <img src="/assets/logo-gold.png" alt="" aria-hidden="true" />
            <span>SIERRA ESTATES</span>
          </Link>
          <nav className="cp-nav" aria-label={isAr ? 'تنقل كايرو بلازا' : 'Cairo Plaza navigation'}>
            {nav.map(([key, label]) => <Link key={key} href={`${prefix}/${key}`} className={section === key ? 'active' : ''}>{label}</Link>)}
          </nav>
          <Link href={isAr ? '/cairo-plaza' : '/ar/cairo-plaza'} className="cp-lang">{isAr ? 'English' : 'العربية'}</Link>
        </div>
      </header>
      <section className="cp-hero">
        <div>
          <p className="cp-eyebrow">{t.eyebrow}</p>
          <h1 className="cp-title">{t.title}</h1>
          <p className="cp-body">{t.body}</p>
          <div className="cp-actions">
            <Link href={`${prefix}/contact`} className="cp-btn cp-btn-primary">{isAr ? 'ابدأ المحادثة' : 'Start the conversation'}</Link>
            <Link href={`${prefix}/investor`} className="cp-btn cp-btn-secondary">{isAr ? 'افتح الملف الاستثماري' : 'Open investor pack'}</Link>
          </div>
        </div>
        <figure className="cp-hero-photo">
          <img src="/cairo-plaza/real-facade-ai-enhanced.jpg" alt={isAr ? 'صورة حقيقية محسّنة لواجهة كايرو بلازا وبنك مصر' : 'AI-enhanced current-site photograph of the Cairo Plaza façade and Banque Misr frontage'} />
          <figcaption>{isAr ? 'صورة حقيقية محسّنة بالذكاء الاصطناعي · الواجهة الحالية' : 'AI-enhanced current-site evidence · current façade'}</figcaption>
        </figure>
      </section>
      <section className="cp-evidence" aria-labelledby="cp-evidence-title">
        <div className="cp-section-heading">
          <div>
            <p className="cp-eyebrow">{isAr ? 'أدلة المشروع / صور من الواقع' : 'PROJECT EVIDENCE / REAL SITE'}</p>
            <h2 id="cp-evidence-title" className="cp-section-title">{isAr ? 'شاهد الموقع كما هو اليوم' : 'See the site as it stands today'}</h2>
          </div>
          <p className="cp-section-note">{isAr ? 'صور حقيقية محسّنة توضح ما يظهر داخل كل لقطة فقط.' : 'Enhanced real-site photographs document only what appears in each frame.'}</p>
        </div>
        <div className="cp-evidence-grid">
          {realEvidence.map((image) => (
            <figure className="cp-evidence-card" key={image.src}>
              <div className="cp-evidence-media">
                <img src={image.src} alt={isAr ? image.altAr : image.altEn} loading="lazy" />
                <span className="cp-evidence-badge">{isAr ? 'صورة حقيقية للموقع' : 'CURRENT-SITE EVIDENCE'}</span>
              </div>
              <figcaption>
                <strong>{isAr ? image.titleAr : image.titleEn}</strong>
                <span>{isAr ? image.captionAr : image.captionEn}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="cp-tour" aria-labelledby="cp-tour-title">
        <div className="cp-section-heading">
          <div>
            <p className="cp-eyebrow">{isAr ? 'جولة توضيحية' : 'ILLUSTRATIVE TOUR'}</p>
            <h2 id="cp-tour-title" className="cp-section-title">{isAr ? 'استكشف الكتلة العمرانية المقترحة' : 'Explore the illustrative massing'}</h2>
          </div>
          <p className="cp-section-note">{isAr ? 'تصور تفاعلي توضيحي، وليس نموذج تنفيذ أو صورة للموقع الحالي.' : 'An interactive illustration, not an execution model or current-site photograph.'}</p>
        </div>
        <CairoPlazaScene lang={lang} />
      </section>
      <section className="cp-grid" aria-label={isAr ? 'مبادئ العرض' : 'Presentation principles'}>
        <div className="cp-card"><h2>{isAr ? 'صورة حقيقية للموقع' : 'Current-site evidence'}</h2><p>{isAr ? 'الصور الحقيقية توضح ما يظهر في اللقطة فقط.' : 'Real photographs document what appears in the frame only.'}</p></div>
        <div className="cp-card"><h2>{isAr ? 'تصوّر مستقبلي' : 'Future concept'}</h2><p>{isAr ? 'أي تصور مستقبلي موسوم بوضوح بأنه AI Concept.' : 'Any future visual is clearly labeled as an AI concept.'}</p></div>
        <div className="cp-card"><h2>{isAr ? 'سيناريو توضيحي' : 'Illustrative scenario'}</h2><p>{isAr ? 'الأرقام والنتائج المحتملة ليست ضمانات.' : 'Financial figures and outcomes are not guarantees.'}</p></div>
      </section>
      <CairoPlazaCalculator lang={lang} />
    </main>
  );
}
