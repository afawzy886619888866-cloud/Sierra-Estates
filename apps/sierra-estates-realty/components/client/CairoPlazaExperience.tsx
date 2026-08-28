'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sun, Moon, Languages, Building2, Phone, MessageSquare,
  ShieldCheck, FileText, TrendingUp,
} from 'lucide-react';
import CairoPlazaCalculator from './CairoPlazaCalculator';

const CairoPlazaScene = dynamic(() => import('./CairoPlazaScene'), {
  ssr: false,
  loading: () => <div className="cp-tour-fallback">Loading interactive 3D massing tour…</div>,
});

/* ── count-up hook (respects reduced-motion) ──────────────────────── */
function useCountUp(target: number, ms = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let done = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || done) return;
        done = true;
        io.disconnect();
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) { setVal(target); return; }
        let start = 0;
        const step = (ts: number) => {
          if (!start) start = ts;
          const pr = Math.min((ts - start) / ms, 1);
          setVal(target * (1 - Math.pow(1 - pr, 3)));
          if (pr < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, ms]);
  return { ref, text: Math.round(val).toString() };
}

function CpStat({ value, label }: { value: string; label: string }) {
  const num = parseInt(value, 10);
  const isNumeric = !isNaN(num);
  const { ref, text } = useCountUp(isNumeric ? num : 0);
  return (
    <div className="cp-stat">
      <b ref={isNumeric ? ref : undefined}>{isNumeric ? text : value}</b>
      <span>{label}</span>
    </div>
  );
}

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
    overview: {
      eyebrow: 'CAIRO PLAZA / OVERVIEW',
      title: 'A strategic address directly in front of Al-Mataria Metro Station.',
      body: 'Explore the current project evidence, tower context, interactive 3D massing, and the distinction between real-site photography and AI concept visuals.',
    },
    inventory: {
      eyebrow: 'CAIRO PLAZA / AVAILABLE INVENTORY',
      title: 'Review the commercial & office units prepared for investor and operator conversations.',
      body: 'Inventory is presented as an illustrative working schedule and should be confirmed against the latest official availability before any commitment.',
    },
    investor: {
      eyebrow: 'CAIRO PLAZA / INVESTOR PACK',
      title: 'Move from project context to an informed, high-yield investment conversation.',
      body: 'Request the bilingual investor pack, illustrative 10-year scenario model, and title due diligence verification checklist.',
    },
    contact: {
      eyebrow: 'CAIRO PLAZA / CONTACT & MANDATES',
      title: 'Choose the right conversation channel for your investment or operator mandate.',
      body: 'We route institutional investor inquiries, commercial tenant-fit briefs, and co-broker partnerships through dedicated specialist advisors.',
    },
  },
  ar: {
    overview: {
      eyebrow: 'كايرو بلازا / نظرة عامة',
      title: 'عنوان استراتيجي مباشر أمام محطة مترو المطرية.',
      body: 'استعرض أدلة الموقع الحالي، والكتلة ثلاثية الأبعاد التفاعلية، وسياق الأبراج مع الفصل الكامل بين الصور الحقيقية وتصوّرات الذكاء الاصطناعي.',
    },
    inventory: {
      eyebrow: 'كايرو بلازا / الوحدات المتاحة',
      title: 'استعرض الوحدات التجارية والإدارية المعدة لمحادثات المستثمرين والمشغلين.',
      body: 'المخزون المعروض جدول عمل توضيحي منظم ويتم تأكيده دوريًا وفق أحدث مراجعة رسمية قبل أي تعاقد.',
    },
    investor: {
      eyebrow: 'كايرو بلازا / الملف الاستثماري',
      title: 'انتقل من فهم المشروع إلى محادثة استثمارية مدروسة ذات عوائد واضحة.',
      body: 'اطلب الملف الاستثماري الثنائي اللغة، ونموذج سيناريوهات التدفقات النقدية لـ 10 سنوات، وقائمة الفحص النافي للجهالة والتراخيص.',
    },
    contact: {
      eyebrow: 'كايرو بلازا / التواصل ومسارات الطلب',
      title: 'اختر المسار المناسب لطبيعة طلبك الاستثماري أو التشغيلي.',
      body: 'نحافظ على توجيه طلبات كبار المستثمرين والمشغلين التجاريين وشركاء التسويق عبر مستشارين متخصصين لكل مسار.',
    },
  },
} as const;

const stats = {
  en: [
    { value: '7', label: 'Commercial & Mixed Towers' },
    { value: '2', label: 'Dedicated Request Paths' },
    { value: '100%', label: 'Real-Site Evidence, Labeled' },
    { value: '24h', label: 'Advisor Response SLA' },
  ],
  ar: [
    { value: '7', label: 'أبراج تجارية وإدارية' },
    { value: '2', label: 'مسارا طلب مخصصان' },
    { value: '100%', label: 'أدلة موقع حقيقية وموسومة' },
    { value: '24h', label: 'سرعة الاستجابة والمتابعة' },
  ],
} as const;

const trust = {
  en: [
    { title: 'Architectural review', body: 'Massing and tower context are reviewed against the real-site evidence below before any illustrative view is published.' },
    { title: 'Source control', body: 'Every photograph is labeled current-site evidence or AI concept — never blended without a caption saying which is which.' },
    { title: 'Two distinct paths', body: 'Investor and tenant-fit requests are routed separately so each conversation gets the right follow-up.' },
  ],
  ar: [
    { title: 'مراجعة معمارية', body: 'تُراجع الكتلة العمرانية وسياق الأبراج مقابل أدلة الموقع الحقيقية أدناه قبل نشر أي تصور توضيحي.' },
    { title: 'ضبط المصدر', body: 'كل صورة موسومة بوضوح: دليل موقع حقيقي أو تصوّر ذكاء اصطناعي — دون خلط دون توضيح.' },
    { title: 'مساران منفصلان', body: 'تُوجَّه طلبات المستثمرين وطلبات تأهيل المستأجرين بشكل منفصل لضمان المتابعة المناسبة لكل محادثة.' },
  ],
} as const;

const materials = {
  en: [
    { title: 'Bilingual deck', body: 'Arabic/English project overview for sharing ahead of a call.', href: '/cairo-plaza/investor', cta: 'Open deck' },
    { title: 'Investor pack', body: 'Illustrative scenario model plus a verification checklist.', href: '/cairo-plaza/investor', cta: 'Request pack' },
    { title: 'Tenant-fit brief', body: 'Operator-facing summary for fit and timeline conversations.', href: '/cairo-plaza/contact', cta: 'Request brief' },
  ],
  ar: [
    { title: 'ملف ثنائي اللغة', body: 'نظرة عامة على المشروع بالعربية والإنجليزية للمشاركة قبل المكالمة.', href: '/ar/cairo-plaza/investor', cta: 'فتح الملف' },
    { title: 'الملف الاستثماري', body: 'نموذج سيناريو توضيحي بالإضافة إلى قائمة تحقق.', href: '/ar/cairo-plaza/investor', cta: 'طلب الملف' },
    { title: 'ملخص تأهيل المستأجرين', body: 'ملخص موجه للمشغلين لمحادثات الملاءمة والجدول الزمني.', href: '/ar/cairo-plaza/contact', cta: 'طلب الملخص' },
  ],
} as const;

/* ── sample inventory schedule ───────────────────────────────────── */
const sampleInventory = [
  {
    code: 'CP-T1-G01',
    typeEn: 'Ground Commercial / Bank Branch',
    typeAr: 'تجاري أرضي / فرع بنكي أو صيدلية',
    area: '245 m²',
    terrace: '60 m²',
    frontageEn: 'Direct Metro Station Frontage',
    frontageAr: 'واجهة مباشرة أمام محطة المترو',
    statusEn: 'Available for Long Lease / Sale',
    statusAr: 'متاح للإيجار طويل الأجل / البيع',
    roi: '14.2%',
  },
  {
    code: 'CP-T1-M04',
    typeEn: 'Mezzanine Retail / Food & Beverage',
    typeAr: 'ميزانين تجاري / مطاعم وكافيهات',
    area: '180 m²',
    terrace: '45 m²',
    frontageEn: 'Plaza Courtyard View',
    frontageAr: 'إطلالة على البلازا والممشى الداخلي',
    statusEn: 'Reserved for Qualified Operators',
    statusAr: 'مخصص للمشغلين المؤهلين',
    roi: '13.8%',
  },
  {
    code: 'CP-T2-03B',
    typeEn: 'Administrative Corporate Headquarters',
    typeAr: 'مقر إداري للشركات والمؤسسات',
    area: '320 m²',
    terrace: '—',
    frontageEn: 'Main Boulevard Panoramic',
    frontageAr: 'إطلالة بانورامية على الشارع الرئيسي',
    statusEn: 'Available / Fitted Options',
    statusAr: 'متاح / خيارات نصف تشطيب وكامل',
    roi: '12.5%',
  },
  {
    code: 'CP-T3-05C',
    typeEn: 'Specialized Medical & Clinic Suite',
    typeAr: 'عيادات ومجمع طبي متخصص',
    area: '115 m²',
    terrace: '—',
    frontageEn: 'Tower East Wing',
    frontageAr: 'الجناح الشرقي للبرج',
    statusEn: 'Available / Ready for Fitout',
    statusAr: 'متاح / جاهز لأعمال التجهيز',
    roi: '15.1%',
  },
];

export default function CairoPlazaExperience({ lang = 'en', section }: Props) {
  const isAr = lang === 'ar';
  const t = copy[lang][section];
  const prefix = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const targetLangPrefix = isAr ? '/cairo-plaza' : '/ar/cairo-plaza';
  const switchLangHref = section === 'overview' ? targetLangPrefix : `${targetLangPrefix}/${section}`;

  const nav = [
    ['overview', isAr ? 'نظرة عامة' : 'Overview'],
    ['inventory', isAr ? 'الوحدات المتاحة' : 'Available inventory'],
    ['investor', isAr ? 'الملف الاستثماري' : 'Investor pack'],
    ['contact', isAr ? 'تواصل ومسارات الطلب' : 'Contact & Mandates'],
  ] as const;

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    const stored = window.localStorage.getItem('cp-theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('cp-theme', next);
      return next;
    });
  };

  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const openLightbox = useCallback((src: string, alt: string, caption: string) => {
    setLightboxImg({ src, alt, caption });
  }, []);
  const closeLightbox = useCallback(() => setLightboxImg(null), []);

  const whatsappInquire = (unitCode: string) => {
    const msg = isAr
      ? `مرحبًا سييرا استيتس، أود الاستفسار عن تفاصيل وحجز الوحدة ${unitCode} في مشروع كايرو بلازا.`
      : `Hello Sierra Estates, I would like to inquire about unit ${unitCode} at Cairo Plaza.`;
    window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} className="cp-shell" data-theme={theme}>
      {/* ── Luxury Header ─────────────────────────────────────────── */}
      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-brand-group">
            <Link href="/" className="cp-back-link" title={isAr ? 'العودة إلى موقع سييرا استيتس' : 'Back to Sierra Estates Main Site'}>
              ← {isAr ? 'الرئيسية' : 'Main Portal'}
            </Link>
            <Link href={isAr ? '/ar/cairo-plaza' : '/cairo-plaza'} className="cp-brand" aria-label={isAr ? 'سييرا استيتس — كايرو بلازا' : 'Sierra Estates — Cairo Plaza'}>
              <Image src="/assets/sierra-estates-official-logo.png" alt="Sierra Estates" width={48} height={48} className="cp-official-logo" priority />
              <span className="cp-brand-text">
                <b>{isAr ? 'كايرو بلازا' : 'Cairo Plaza'}</b>
                <small>{isAr ? 'بوابة المشروع الرسمية' : 'Official Project Portal'}</small>
              </span>
            </Link>
          </div>

          <nav className="cp-nav" aria-label={isAr ? 'تنقل كايرو بلازا' : 'Cairo Plaza navigation'}>
            {nav.map(([key, label]) => (
              <Link
                key={key}
                href={key === 'overview' ? prefix : `${prefix}/${key}`}
                className={section === key ? 'active' : ''}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="cp-header-controls">
            <button
              type="button"
              className="cp-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Toggle light theme' : 'Toggle dark theme'}
              title={theme === 'dark' ? (isAr ? 'التبديل للوضع الفاتح' : 'Switch to Light') : (isAr ? 'التبديل للوضع الداكن' : 'Switch to Dark')}
            >
              {theme === 'dark' ? <Sun className="i" /> : <Moon className="i" />}
              <span className="cp-toggle-txt">{theme === 'dark' ? (isAr ? 'فاتح' : 'Light') : (isAr ? 'داكن' : 'Dark')}</span>
            </button>

            <Link
              href={switchLangHref}
              className="cp-toggle cp-lang"
              aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
              title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Languages className="i" />
              <span className="cp-toggle-txt">{isAr ? 'English' : 'عربي'}</span>
              <span className="cp-lang-badge">{isAr ? 'EN' : 'AR'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Section Hero ─────────────────────────────────────────── */}
      <section className="cp-hero">
        <div>
          <p className="cp-eyebrow">{t.eyebrow}</p>
          <h1 className="cp-title">{t.title}</h1>
          <p className="cp-body">{t.body}</p>
          <div className="cp-actions">
            <Link href={`${prefix}/investor`} className="cp-btn cp-btn-primary">
              <TrendingUp className="i" style={{ width: 18, height: 18, display: 'inline', marginInlineEnd: 6 }} />
              {isAr ? 'اطلب الملف الاستثماري' : 'Request the Investor Pack'}
            </Link>
            <Link href={`${prefix}/contact`} className="cp-btn cp-btn-secondary">
              <MessageSquare className="i" style={{ width: 18, height: 18, display: 'inline', marginInlineEnd: 6 }} />
              {isAr ? 'تواصل مع مستشار المشروع' : 'Consult Project Advisor'}
            </Link>
          </div>
        </div>

        <figure className="cp-hero-photo">
          <div className="cp-hero-photo-inner">
            <Image
              src="/cairo-plaza/real-facade-ai-enhanced.jpg"
              alt={isAr ? 'صورة حقيقية محسّنة لواجهة كايرو بلازا وبنك مصر' : 'AI-enhanced current-site photograph of the Cairo Plaza façade and Banque Misr frontage'}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
            />
          </div>
          <figcaption>{isAr ? 'صورة حقيقية محسّنة بالذكاء الاصطناعي · الواجهة الحالية والأنشطة العاملة' : 'AI-enhanced current-site evidence · current façade & active commercial context'}</figcaption>
        </figure>
      </section>

      {/* ── Key Project Metrics Strip ─────────────────────────────── */}
      <div className="cp-stats" role="group" aria-label={isAr ? 'أرقام كايرو بلازا' : 'Cairo Plaza at a glance'}>
        {stats[lang].map((s) => (
          <CpStat key={s.label} value={s.value} label={s.label} />
        ))}
      </div>

      {/* ── Dynamic Content Routed by Section ─────────────────────── */}
      {section === 'overview' && (
        <>
          <section className="cp-grid" aria-label={isAr ? 'طبقة معلومات مضبوطة' : 'A controlled information layer'}>
            {trust[lang].map((card) => (
              <div className="cp-card" key={card.title}>
                <div className="cp-card-icon"><ShieldCheck className="i" /></div>
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </div>
            ))}
          </section>

          <section className="cp-evidence" aria-labelledby="cp-evidence-title">
            <div className="cp-section-heading">
              <div>
                <p className="cp-eyebrow">{isAr ? 'أدلة المشروع / صور من الواقع' : 'PROJECT EVIDENCE / REAL SITE'}</p>
                <h2 id="cp-evidence-title" className="cp-section-title">{isAr ? 'شاهد الموقع كما هو اليوم' : 'See the site as it stands today'}</h2>
              </div>
              <p className="cp-section-note">{isAr ? 'صور حقيقية محسّنة توضح ما يظهر داخل كل لقطة فقط، مع توثيق الحالة القائمة.' : 'Enhanced real-site photographs document current physical condition and active frontage.'}</p>
            </div>
            <div className="cp-evidence-grid">
              {realEvidence.map((image) => (
                <figure
                  className="cp-evidence-card"
                  key={image.src}
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => openLightbox(
                    image.src,
                    isAr ? image.altAr : image.altEn,
                    isAr ? `${image.titleAr} — ${image.captionAr}` : `${image.titleEn} — ${image.captionEn}`,
                  )}
                >
                  <div className="cp-evidence-media">
                    <Image
                      src={image.src}
                      alt={isAr ? image.altAr : image.altEn}
                      fill
                      loading="lazy"
                      sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <span className="cp-evidence-badge">{isAr ? 'دليل موقع حقيقي' : 'CURRENT-SITE EVIDENCE'}</span>
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
                <p className="cp-eyebrow">{isAr ? 'جولة توضيحية ثلاثية الأبعاد' : 'ILLUSTRATIVE 3D TOUR'}</p>
                <h2 id="cp-tour-title" className="cp-section-title">{isAr ? 'استكشف الكتلة العمرانية وتوزيع الأبراج' : 'Explore the illustrative massing'}</h2>
              </div>
              <p className="cp-section-note">{isAr ? 'تصور تفاعلي توضيحي، وليس نموذج تنفيذ أو صورة للموقع الحالي.' : 'An interactive illustration, not an execution model or current-site photograph.'}</p>
            </div>
            <CairoPlazaScene lang={lang} />
          </section>

          <CairoPlazaCalculator lang={lang} />
        </>
      )}

      {/* ── INVENTORY SECTION: Interactive Schedule ─────────────────── */}
      {section === 'inventory' && (
        <section className="cp-inventory-section" aria-labelledby="cp-inv-title">
          <div className="cp-section-heading">
            <div>
              <p className="cp-eyebrow">{isAr ? 'جدول الوحدات المتاحة' : 'COMMERCIAL & OFFICE SCHEDULE'}</p>
              <h2 id="cp-inv-title" className="cp-section-title">{isAr ? 'الوحدات المجهزة للطرح الاستثماري والتشغيلي' : 'Prime commercial & corporate inventory'}</h2>
            </div>
            <p className="cp-section-note">{isAr ? 'اختر الوحدة المناسبة لطلب نموذج التدفقات النقدية ومطابقة الشروط الفنية.' : 'Select a unit to receive full architectural layout, cash flow scenario, and fit-out timeline.'}</p>
          </div>

          <div className="cp-inventory-grid">
            {sampleInventory.map((unit) => (
              <div className="cp-inventory-card" key={unit.code}>
                <div className="cp-inv-head">
                  <span className="cp-inv-code">{unit.code}</span>
                  <span className="cp-inv-roi">{isAr ? `عائد تقديري ${unit.roi}` : `Est. Yield ${unit.roi}`}</span>
                </div>
                <h3 className="cp-inv-title">{isAr ? unit.typeAr : unit.typeEn}</h3>
                <div className="cp-inv-specs">
                  <div><span>{isAr ? 'المساحة الإجمالية' : 'Built-up Area'}</span><strong>{unit.area}</strong></div>
                  <div><span>{isAr ? 'المساحة الخارجية' : 'Outdoor Terrace'}</span><strong>{unit.terrace}</strong></div>
                  <div><span>{isAr ? 'الموقع والإطلالة' : 'Frontage'}</span><strong>{isAr ? unit.frontageAr : unit.frontageEn}</strong></div>
                </div>
                <div className="cp-inv-foot">
                  <span className="cp-inv-status">{isAr ? unit.statusAr : unit.statusEn}</span>
                  <button type="button" onClick={() => whatsappInquire(unit.code)} className="cp-inv-btn">
                    <MessageSquare className="i" style={{ width: 14, height: 14 }} />
                    {isAr ? 'استفسار عبر واتساب' : 'Inquire via WhatsApp'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cp-meeting-callout">
            <div>
              <h3>{isAr ? 'بروتوكول إدارة وتنظيم المبيعات والتشغيل' : 'Operational & Sales Governance Agenda'}</h3>
              <p>{isAr ? 'اطلع على محضر وجدول أعمال الاجتماع الأسبوعي الأول لمشروع كايرو بلازا.' : 'Review the first weekly operational meeting agenda and execution decisions.'}</p>
            </div>
            <Link href={`${prefix}/meeting-agenda`} className="cp-btn cp-btn-secondary">
              {isAr ? 'استعراض جدول الأعمال' : 'View Meeting Agenda'} →
            </Link>
          </div>
        </section>
      )}

      {/* ── INVESTOR SECTION: Institutional Pack ───────────────────── */}
      {section === 'investor' && (
        <section className="cp-investor-section" aria-labelledby="cp-inv-pack-title">
          <div className="cp-section-heading">
            <div>
              <p className="cp-eyebrow">{isAr ? 'الملف الاستثماري الثنائي' : 'EXECUTIVE INVESTOR DOSSIER'}</p>
              <h2 id="cp-inv-pack-title" className="cp-section-title">{isAr ? 'نموذج الجدوى والفحص النافي للجهالة' : 'Institutional due diligence & scenario model'}</h2>
            </div>
            <p className="cp-section-note">{isAr ? 'حزمة استثمارية متكاملة تتضمن مراجعة العقود، تراخيص الأبراج، ودراسة تدفقات الإيجار.' : 'A complete pack covering titles, zoning licenses, metro footfall analytics, and yield scenarios.'}</p>
          </div>

          <div className="cp-investor-grid">
            <div className="cp-investor-card">
              <div className="cp-card-icon"><TrendingUp className="i" /></div>
              <h3>{isAr ? '1. نموذج التدفقات النقدية 10 سنوات' : '1. 10-Year Cash Flow & Yield Model'}</h3>
              <p>{isAr ? 'توقعات توضيحية لصافي الدخل التشغيلي (NOI)، ومعدلات الإشغال، وفترات استرداد رأس المال مع حساب التضخم.' : 'Dynamic financial scenarios covering net operating income, payback schedules, and inflation hedging.'}</p>
            </div>
            <div className="cp-investor-card">
              <div className="cp-card-icon"><ShieldCheck className="i" /></div>
              <h3>{isAr ? '2. قائمة التحقق والتراخيص الرسمية' : '2. Legal & Zoning Audit Checklist'}</h3>
              <p>{isAr ? 'فحص كامل لحالة الأرض، تراخيص البناء الصادرة، والموقف القانوني لكل كتلة وبرج في المشروع.' : 'Complete audit of land title, commercial building permits, and structural execution records.'}</p>
            </div>
            <div className="cp-investor-card">
              <div className="cp-card-icon"><Building2 className="i" /></div>
              <h3>{isAr ? '3. دراسة الموقع والكثافة المرورية' : '3. Metro & Frontage Footfall Analysis'}</h3>
              <p>{isAr ? 'تحليل مباشر لموقع محطة مترو المطرية وبنك مصر، وكثافة الزوار اليومية للأنشطة البنكية والتجارية.' : 'Detailed footfall density study along the metro station node and Banque Misr commercial frontage.'}</p>
            </div>
          </div>

          <div className="cp-investor-cta-box">
            <div className="cp-investor-cta-text">
              <h3>{isAr ? 'طلب الملف الاستثماري الرسمي الفوري' : 'Request Instant Investor Pack Access'}</h3>
              <p>{isAr ? 'سيقوم مستشار الاستثمار الخاص بنا بإرسال الملف الكامل والتواصل معك خلال دقائق.' : 'Our private wealth advisor will deliver the complete dossier directly via WhatsApp or Email.'}</p>
            </div>
            <div className="cp-investor-cta-actions">
              <button
                type="button"
                onClick={() => {
                  const msg = isAr ? 'أود طلب الملف الاستثماري الرسمي لمشروع كايرو بلازا.' : 'I would like to request the official Cairo Plaza Investor Pack.';
                  window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="cp-btn cp-btn-primary"
              >
                <MessageSquare className="i" style={{ width: 16, height: 16, display: 'inline', marginInlineEnd: 6 }} />
                {isAr ? 'طلب الملف عبر واتساب' : 'Request via WhatsApp'}
              </button>
              <a href="tel:+201092048333" className="cp-btn cp-btn-secondary">
                <Phone className="i" style={{ width: 16, height: 16, display: 'inline', marginInlineEnd: 6 }} />
                +2 01092048333
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT SECTION: Tailored Mandates ─────────────────────── */}
      {section === 'contact' && (
        <section className="cp-contact-section" aria-labelledby="cp-contact-title">
          <div className="cp-section-heading">
            <div>
              <p className="cp-eyebrow">{isAr ? 'مسارات التواصل المتخصصة' : 'DEDICATED ADVISORY MANDATES'}</p>
              <h2 id="cp-contact-title" className="cp-section-title">{isAr ? 'اختر القناة المباشرة لطلبك' : 'Connect with our specialized advisory desks'}</h2>
            </div>
            <p className="cp-section-note">{isAr ? 'فريقنا متاح على مدار الساعة لخدمة المستثمرين والمشغلين والوسطاء.' : 'Our project team responds within 24 hours with dedicated documentation.'}</p>
          </div>

          <div className="cp-contact-grid">
            <div className="cp-contact-card">
              <div className="cp-card-icon"><TrendingUp className="i" /></div>
              <h3>{isAr ? 'كبار المستثمرين والمحافظ' : 'Private Wealth & Family Offices'}</h3>
              <p>{isAr ? 'لمناقشة شراء الأبراج، الطوابق الكاملة، أو الصفقات الاستثمارية طويلة الأجل.' : 'Direct mandate for whole-tower acquisitions, full floorplates, or high-yield portfolios.'}</p>
              <button
                type="button"
                onClick={() => {
                  const msg = isAr ? 'استفسار مستثمر: أود حجز موعد لمناقشة فرصة استثمارية في كايرو بلازا.' : 'Investor Mandate: I would like to schedule a private briefing for Cairo Plaza.';
                  window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="cp-btn cp-btn-primary"
              >
                {isAr ? 'حجز جلسة استشارية' : 'Book Private Briefing'}
              </button>
            </div>

            <div className="cp-contact-card">
              <div className="cp-card-icon"><Building2 className="i" /></div>
              <h3>{isAr ? 'المشغلون والعلامات التجارية' : 'Commercial & Retail Operators'}</h3>
              <p>{isAr ? 'للبنوك، الصيدليات الكبرى، السلاسل التجارية، والمقرات الإدارية والطبية.' : 'Tailored fit-out and leasing terms for banks, clinical suites, and retail anchors.'}</p>
              <button
                type="button"
                onClick={() => {
                  const msg = isAr ? 'استفسار مشغل تجاري: أود مناقشة استئجار مساحة تجارية في كايرو بلازا.' : 'Commercial Operator: I would like to discuss leasing commercial space at Cairo Plaza.';
                  window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="cp-btn cp-btn-secondary"
              >
                {isAr ? 'طلب شروط التأهيل' : 'Request Operator Terms'}
              </button>
            </div>

            <div className="cp-contact-card">
              <div className="cp-card-icon"><FileText className="i" /></div>
              <h3>{isAr ? 'الوسطاء وشركاء التسويق' : 'Brokers & Co-Agency Partners'}</h3>
              <p>{isAr ? 'لتسجيل العملاء، مراجعة العمولات، واستلام المواد التسويقية المعتمدة.' : 'Client registration, co-broker commission structures, and approved marketing assets.'}</p>
              <button
                type="button"
                onClick={() => {
                  const msg = isAr ? 'تسجيل وسيط: أود الاطلاع على خطة تسويق وعمولات كايرو بلازا.' : 'Broker Partnership: Inquiring about Cairo Plaza co-broking terms and assets.';
                  window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="cp-btn cp-btn-secondary"
              >
                {isAr ? 'تسجيل شريك تسويق' : 'Register as Co-Broker'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Global CTA Banner ─────────────────────────────────────── */}
      <section className="cp-cta-banner" aria-labelledby="cp-cta-title">
        <div className="cp-cta-inner">
          <div>
            <h2 id="cp-cta-title">{isAr ? 'جاهز للخطوة التالية في استثمارك؟' : 'Ready to secure your position in Cairo Plaza?'}</h2>
            <p>{isAr ? 'اطلب الملف الاستثماري أو جدول التأهيل الخاص بمستأجريك. نضمن لك متابعة احترافية خلال دقائق.' : 'Request the complete dossier or your tenant-fit schedule. We guarantee dedicated advisory response.'}</p>
          </div>
          <div className="cp-cta-actions">
            <Link href={`${prefix}/investor`} className="cp-cta-btn cp-cta-btn-primary">
              {isAr ? 'اطلب الملف الاستثماري' : 'Request Investor Pack'}
            </Link>
            <Link href={`${prefix}/contact`} className="cp-cta-btn cp-cta-btn-secondary">
              {isAr ? 'تواصل مع فريقنا' : 'Talk to Our Team'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Materials Hub ─────────────────────────────────────────── */}
      <section className="cp-materials" aria-labelledby="cp-materials-title">
        <div className="cp-section-heading">
          <div>
            <p className="cp-eyebrow">{isAr ? 'مركز المواد والحملات' : 'CAMPAIGN & ADVISORY MATERIALS'}</p>
            <h2 id="cp-materials-title" className="cp-section-title">{isAr ? 'مواد جاهزة للمشاركة والاطلاع' : 'Materials ready to share'}</h2>
          </div>
          <p className="cp-section-note">{isAr ? 'كل مادة موجهة لمسار الاستثمار أو تأهيل المستأجرين لضمان دقة المتابعة.' : 'Each item is routed to the investor or tenant-fit path with verified data.'}</p>
        </div>
        <div className="cp-materials-grid">
          {materials[lang].map((m) => (
            <div className="cp-material-card" key={m.title}>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <Link href={m.href}>{m.cta} →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lightbox Overlay ──────────────────────────────────────── */}
      {lightboxImg && (
        <div className="cp-lightbox" onClick={closeLightbox} role="dialog" aria-label={isAr ? 'عرض الصورة' : 'Image viewer'}>
          <div className="cp-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImg.src}
              alt={lightboxImg.alt}
              width={1200}
              height={800}
              className="cp-lightbox-img"
              style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '80vh' }}
              priority
            />
          </div>
          <button type="button" className="cp-lightbox-close" onClick={closeLightbox} aria-label={isAr ? 'إغلاق' : 'Close'}>×</button>
          <div className="cp-lightbox-caption">{lightboxImg.caption}</div>
        </div>
      )}
    </main>
  );
}
