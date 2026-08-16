'use client';

import Link from 'next/link';
import CairoPlazaScene from './CairoPlazaScene';
import CairoPlazaCalculator from './CairoPlazaCalculator';

type Props = { lang?: 'en' | 'ar'; section: 'overview' | 'inventory' | 'investor' | 'contact' };

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
          <Link href={isAr ? '/ar/cairo-plaza' : '/cairo-plaza'} className="cp-brand">SIERRA ESTATES</Link>
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
        <CairoPlazaScene lang={lang} />
      </section>
      <section className="cp-grid">
        <div className="cp-card"><h2 className="">{isAr ? 'صورة حقيقية للموقع' : 'Current-site evidence'}</h2><p className="">{isAr ? 'الصور الحقيقية توضح ما يظهر في اللقطة فقط.' : 'Real photographs document what appears in the frame only.'}</p></div>
        <div className="cp-card"><h2 className="">{isAr ? 'تصوّر مستقبلي' : 'Future concept'}</h2><p className="">{isAr ? 'أي تصور مستقبلي موسوم بوضوح بأنه AI Concept.' : 'Any future visual is clearly labeled as an AI concept.'}</p></div>
        <div className="cp-card"><h2 className="">{isAr ? 'سيناريو توضيحي' : 'Illustrative scenario'}</h2><p className="">{isAr ? 'الأرقام والنتائج المحتملة ليست ضمانات.' : 'Financial figures and outcomes are not guarantees.'}</p></div>
      </section>
      <CairoPlazaCalculator lang={lang} />
    </main>
  );
}
