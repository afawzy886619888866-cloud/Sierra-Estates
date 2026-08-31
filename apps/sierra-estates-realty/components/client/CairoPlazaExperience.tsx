'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2, Phone, MessageSquare, ShieldCheck, FileText,
  TrendingUp, Search, Filter, Layers, Sparkles, CheckCircle2,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSite } from '@/lib/site/SiteContext';
import CairoPlazaCalculator from './CairoPlazaCalculator';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

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
    src: '/cairo-plaza/real-site-panorama.jpg',
    altEn: 'Full wide panoramic site photograph showing the Cairo Plaza tower massing and courtyard under construction',
    altAr: 'صورة بانورامية حقيقية شاملة لموقع مشروع كايرو بلازا والأبراج والساحة قيد الإنشاء',
    titleEn: 'Site 360° Panorama',
    titleAr: 'بانوراما الموقع الشاملة',
    captionEn: 'Real-site verified panoramic photograph · showing actual building footprint, tower elevation, and open public realm',
    captionAr: 'صورة بانورامية حقيقية للموقع · توضح كتلة الأبراج والساحة العامة المفتوحة',
  },
  {
    src: '/cairo-plaza/real-facade-ai-enhanced.jpg',
    altEn: 'AI-enhanced current-site photograph of the Cairo Plaza façade with Banque Misr frontage',
    altAr: 'صورة حقيقية محسّنة بالذكاء الاصطناعي لواجهة كايرو بلازا مع واجهة بنك مصر',
    titleEn: 'Main façade & Banque Misr',
    titleAr: 'الواجهة الرئيسية وبنك مصر',
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
    titleEn: 'Entrance & concourse',
    titleAr: 'المدخل والممر الرئيسي',
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

type AdCampaign = {
  src: string;
  badgeEn: string;
  badgeAr: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  ref: string;
};

const officialAdCampaigns: AdCampaign[] = [
  {
    src: '/cairo-plaza/ads/cairo-plaza-ad-retail.jpg',
    badgeEn: 'RETAIL & COMMERCIAL',
    badgeAr: 'محلات ومقرات تجارية',
    titleEn: 'Cairo Plaza Retail Flagship',
    titleAr: 'كايرو بلازا — واجهات ومحلات تجارية',
    descEn: 'Prime retail units & commercial flagship spaces with maximum footfall.',
    descAr: 'مساحات مرنة تناسب كبرى العلامات التجارية والأنشطة الحيوية.',
    ref: 'REF: SE-CP-RETAIL',
  },
  {
    src: '/cairo-plaza/ads/cairo-plaza-ad-office.jpg',
    badgeEn: 'OFFICES & CLINICS',
    badgeAr: 'مكاتب إدارية وعيادات',
    titleEn: 'Administrative HQ & Medical Suites',
    titleAr: 'كايرو بلازا — مقرات إدارية وعيادات طبية',
    descEn: 'Modern corporate offices & clinics with 24/7 security and hotel-grade lobbies.',
    descAr: 'مكاتب إدارية فاخرة وعيادات طبية متخصصة مع مداخل فندقية مستقلة.',
    ref: 'REF: SE-CP-OFFICE',
  },
  {
    src: '/cairo-plaza/ads/cairo-plaza-ad-roi.jpg',
    badgeEn: 'MAXIMUM ROI',
    badgeAr: 'أعلى عائد استثماري',
    titleEn: 'Guaranteed Rental Yield & Capital Growth',
    titleAr: 'استثمارك المضمون بعائد إيجاري فوري',
    descEn: 'Long-term corporate tenant security with high capital appreciation.',
    descAr: 'عائد إيجاري دوري مرتفع مع نمو متواصل للقيمة الرأسمالية.',
    ref: 'REF: SE-CP-ROI',
  },
  {
    src: '/cairo-plaza/ads/cairo-plaza-ad-location.jpg',
    badgeEn: 'STRATEGIC LOCATION',
    badgeAr: 'موقع استراتيجي',
    titleEn: '1 Minute from Al-Mataria Metro Station',
    titleAr: 'دقيقة واحدة من محطة مترو المطرية',
    descEn: 'Seamless transit accessibility from Cairo’s prime hubs and expressways.',
    descAr: 'موقع حيوي يربط مشروعك بكافة محاور وشرايين القاهرة الكبرى.',
    ref: 'REF: SE-CP-LOC',
  },
  {
    src: '/cairo-plaza/ads/cairo-plaza-ad-delivery.jpg',
    badgeEn: 'IMMEDIATE DELIVERY',
    badgeAr: 'استلام فوري وتسهيلات',
    titleEn: 'Ready-to-Operate Units & Flexible Financing',
    titleAr: 'استلام فوري وتسهيلات سداد بدون فوائد',
    descEn: 'Immediate handover with flexible installment structures and cash discounts.',
    descAr: 'ابدأ نشاطك اليوم فوراً مع خطط سداد ميسرة وخصومات للكاش.',
    ref: 'REF: SE-CP-DELIVERY',
  },
  {
    src: '/cairo-plaza/ads/sierra-ad-cairo-plaza.jpg',
    badgeEn: 'SIERRA-ESTATES.NET',
    badgeAr: 'منصة SIERRA-ESTATES.NET',
    titleEn: 'Official Sierra Estates Institutional Listing',
    titleAr: 'الطرح الرسمي عبر منصة سيراليون إستيتس',
    descEn: 'Verified property listing and digital advisory mandate on sierra-estates.net.',
    descAr: 'العقار موثق بالكامل ومتاح للحجز المباشر عبر البوابة الرسمية.',
    ref: 'REF: SE-CP-101',
  },
  {
    src: '/cairo-plaza/ads/sierra-ad-portal.jpg',
    badgeEn: 'GLOBAL PORTFOLIO',
    badgeAr: 'المحفظة العقارية الشاملة',
    titleEn: 'Sierra Estates Institutional Portal',
    titleAr: 'بوابتك الأولى للاستثمار العقاري الفاخر',
    descEn: 'Institutional advisory & multi-asset commercial portfolio management.',
    descAr: 'محفظة متكاملة من الأصول التجارية والإدارية والسكنية الفاخرة.',
    ref: 'REF: SE-PORTAL-2026',
  },
];

const copy = {
  en: {
    overview: {
      eyebrow: 'CAIRO PLAZA / OVERVIEW',
      title: 'A strategic address directly in front of Al-Mataria Metro Station.',
      body: 'Explore current project evidence, interactive 3D massing textured with real on-site photography, and high-yield commercial investment schedules.',
    },
    inventory: {
      eyebrow: 'CAIRO PLAZA / AVAILABLE INVENTORY',
      title: 'Commercial & Office Units Schedule for Investors and Brand Operators.',
      body: 'Filter and inspect units by type (Retail, Banking, Corporate Offices, Clinics, F&B), view spatial specifications, estimated yields, and book private briefings.',
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
      body: 'استعرض أدلة الموقع الحالي، والكتلة ثلاثية الأبعاد التفاعلية المزودة بملامس وصور حقيقية، وجدول الوحدات التجارية والإدارية الاستثمارية.',
    },
    inventory: {
      eyebrow: 'كايرو بلازا / الوحدات المتاحة',
      title: 'جدول الوحدات التجارية والإدارية المعدّة للمستثمرين والمشغلين.',
      body: 'قم بفرز واختيار الوحدات حسب النوع (تجاري، بنوك، مكاتب إدارية، عيادات، كافيهات)، مع فحص المساحات والعوائد وحجز المعاينات.',
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
    { value: '2', label: 'مسارات مخصصة للطلب' },
    { value: '100%', label: 'أدلة موثقة من أرض الواقع' },
    { value: '24h', label: 'زمن استجابة المستشارين' },
  ],
} as const;

const trust = {
  en: [
    {
      title: 'Real-site evidence',
      body: 'All photos are labeled to state what is shown (e.g. Banque Misr frontage, construction status).',
    },
    {
      title: '3D Real-Texture Visualizer',
      body: '3D model with real on-site facade photo mapping and verified 360° spherical panorama.',
    },
    {
      title: 'Dedicated request paths',
      body: 'Separate advisory paths for investors and commercial operators to ensure appropriate follow-up.',
    },
  ],
  ar: [
    {
      title: 'أدلة موثقة من الموقع',
      body: 'جميع الصور موضحة بدقة لبيان ما يظهر فيها (مثل واجهة بنك مصر وحالة الإنشاءات).',
    },
    {
      title: 'مجسم ثلاثي الأبعاد بملامس حقيقية',
      body: 'نموذج ثلاثي الأبعاد بملامس وصور واجهات حقيقية وبانوراما كروية 360° من قلب الموقع.',
    },
    {
      title: 'مسارات طلب مخصصة',
      body: 'مسارات متابعة مستقلة للمستثمرين والمشغلين التجاريين لضمان سرعة ودقة الاستجابة.',
    },
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

export type UnitType = 'all' | 'retail' | 'office' | 'medical' | 'fnb';

export type InventoryUnit = {
  code: string;
  category: 'retail' | 'office' | 'medical' | 'fnb';
  typeEn: string;
  typeAr: string;
  areaNum: number;
  area: string;
  terrace: string;
  frontageEn: string;
  frontageAr: string;
  statusEn: string;
  statusAr: string;
  roi: string;
  priceEgp: number;
  priceUsd: number;
  featuredImg: string;
};

const fullInventorySchedule: InventoryUnit[] = [
  {
    code: 'CP-T1-G01',
    category: 'retail',
    typeEn: 'Ground Commercial Flagship / Bank Branch',
    typeAr: 'تجاري أرضي رئيسي / فرع بنكي أو صيدلية كبرى',
    areaNum: 245,
    area: '245 m²',
    terrace: '60 m²',
    frontageEn: 'Direct Metro Station Frontage & Main Plaza',
    frontageAr: 'واجهة مباشرة أمام محطة المترو والممشى الرئيسي',
    statusEn: 'Available for Long Lease / Sale',
    statusAr: 'متاح للإيجار طويل الأجل / البيع',
    roi: '14.2%',
    priceEgp: 28500000,
    priceUsd: 585000,
    featuredImg: '/cairo-plaza/real-facade-ai-enhanced.jpg',
  },
  {
    code: 'CP-T1-M04',
    category: 'fnb',
    typeEn: 'Mezzanine Retail / Food & Beverage Terrace',
    typeAr: 'ميزانين تجاري / مطاعم وتراس كافيهات',
    areaNum: 180,
    area: '180 m²',
    terrace: '45 m²',
    frontageEn: 'Plaza Courtyard & Outdoor Promenade View',
    frontageAr: 'إطلالة على البلازا والممشى المفتوح',
    statusEn: 'Reserved for Qualified Operators',
    statusAr: 'مخصص للمشغلين والعلامات التجارية',
    roi: '13.8%',
    priceEgp: 19800000,
    priceUsd: 405000,
    featuredImg: '/cairo-plaza/real-entrance-ai-enhanced.jpg',
  },
  {
    code: 'CP-T2-03B',
    category: 'office',
    typeEn: 'Administrative Corporate Headquarters Suite',
    typeAr: 'مقر إداري للشركات والمؤسسات المالية',
    areaNum: 320,
    area: '320 m²',
    terrace: '—',
    frontageEn: 'Main Boulevard Panoramic Skyline',
    frontageAr: 'إطلالة بانورامية على الشارع الرئيسي',
    statusEn: 'Available / Fitted Options',
    statusAr: 'متاح / خيارات تسليم نصف تشطيب وكامل',
    roi: '12.5%',
    priceEgp: 22400000,
    priceUsd: 460000,
    featuredImg: '/cairo-plaza/real-tower-frontage-ai-enhanced.jpg',
  },
  {
    code: 'CP-T3-05C',
    category: 'medical',
    typeEn: 'Specialized Medical & Clinical Center',
    typeAr: 'عيادات ومجمع طبي واستشاري متخصص',
    areaNum: 115,
    area: '115 m²',
    terrace: '—',
    frontageEn: 'Tower East Wing & Elevator Node',
    frontageAr: 'الجناح الشرقي للبرج بجوار المصاعد',
    statusEn: 'Available / Ready for Medical Fitout',
    statusAr: 'متاح / جاهز للتجهيز والترخيص الطبي',
    roi: '15.1%',
    priceEgp: 9800000,
    priceUsd: 202000,
    featuredImg: '/cairo-plaza/real-interior-context-ai-enhanced.jpg',
  },
  {
    code: 'CP-T4-02A',
    category: 'office',
    typeEn: 'Executive Private Office / Law & Audit Firm',
    typeAr: 'مكتب تنفيذي / شركات المحاماة والاستشارات',
    areaNum: 140,
    area: '140 m²',
    terrace: '15 m²',
    frontageEn: 'Plaza View with Private Balcony',
    frontageAr: 'إطلالة على البلازا مع شرفة خاصة',
    statusEn: 'Available / Immediate Delivery',
    statusAr: 'متاح / جاهز للتعاقد الفوري',
    roi: '13.1%',
    priceEgp: 11200000,
    priceUsd: 230000,
    featuredImg: '/cairo-plaza/real-site-context-ai-enhanced.jpg',
  },
  {
    code: 'CP-T5-G02',
    category: 'retail',
    typeEn: 'Corner Commercial Showroom & Anchor Store',
    typeAr: 'معرض تجاري ناصية / متجر رئيسي',
    areaNum: 390,
    area: '390 m²',
    terrace: '85 m²',
    frontageEn: 'Dual Frontage on Boulevard & Metro Hub',
    frontageAr: 'واجهتان على الشارع ومحور المترو',
    statusEn: 'Available for Anchor Tenant / Acquisition',
    statusAr: 'متاح للتوكيلات الكبرى والاستحواذ',
    roi: '14.8%',
    priceEgp: 48500000,
    priceUsd: 995000,
    featuredImg: '/cairo-plaza/real-frontage-context-ai-enhanced.jpg',
  },
];

export default function CairoPlazaExperience({ lang: initialLang = 'en', section }: Props) {
  const { lang: siteLang, isAr: siteIsAr } = useSite();
  const lang = initialLang || siteLang;
  const isAr = lang === 'ar' || siteIsAr;
  const t = copy[isAr ? 'ar' : 'en'][section];
  const prefix = isAr ? '/ar/cairo-plaza' : '/cairo-plaza';
  const targetLangPrefix = isAr ? '/cairo-plaza' : '/ar/cairo-plaza';
  const switchLangHref = section === 'overview' ? targetLangPrefix : `${targetLangPrefix}/${section}`;

  const containerRef = useRef<HTMLDivElement>(null);

  const nav = [
    ['overview', isAr ? 'نظرة عامة' : 'Overview'],
    ['inventory', isAr ? 'الوحدات المتاحة' : 'Available Inventory'],
    ['investor', isAr ? 'الملف الاستثماري' : 'Investor Pack'],
    ['contact', isAr ? 'تواصل ومسارات الطلب' : 'Contact & Mandates'],
  ] as const;

  // Inventory Filters State
  const [selectedType, setSelectedType] = useState<UnitType>('all');
  const [selectedSizeRange, setSelectedSizeRange] = useState<'all' | 'small' | 'med' | 'large'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');

  const filteredUnits = useMemo(() => {
    return fullInventorySchedule.filter((u) => {
      if (selectedType !== 'all' && u.category !== selectedType) return false;
      if (selectedSizeRange === 'small' && u.areaNum > 150) return false;
      if (selectedSizeRange === 'med' && (u.areaNum < 150 || u.areaNum > 250)) return false;
      if (selectedSizeRange === 'large' && u.areaNum < 250) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = u.code.toLowerCase().includes(q);
        const matchType = u.typeEn.toLowerCase().includes(q) || u.typeAr.toLowerCase().includes(q);
        const matchFront = u.frontageEn.toLowerCase().includes(q) || u.frontageAr.toLowerCase().includes(q);
        if (!matchCode && !matchType && !matchFront) return false;
      }
      return true;
    });
  }, [selectedType, selectedSizeRange, searchQuery]);

  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const openLightbox = useCallback((src: string, alt: string, caption: string) => {
    setLightboxImg({ src, alt, caption });
  }, []);
  const closeLightbox = useCallback(() => setLightboxImg(null), []);

  // ── GSAP Master Animations ──────────────────────────────────────────
  useGSAP(
    () => {
      if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      // 1. Hero Entrance Sequence
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.cp-hero .cp-eyebrow', { opacity: 0, y: 16, duration: 0.5 })
        .from('.cp-hero .cp-title', { opacity: 0, y: 24, duration: 0.65 }, '-=0.35')
        .from('.cp-hero .cp-body', { opacity: 0, y: 18, duration: 0.5 }, '-=0.35')
        .from('.cp-hero .cp-actions a', { opacity: 0, y: 14, stagger: 0.1, duration: 0.5 }, '-=0.25')
        .from('.cp-hero-photo', { opacity: 0, scale: 0.95, y: 24, duration: 0.75 }, '-=0.45')
        .from('.cp-stat', { opacity: 0, y: 18, stagger: 0.08, duration: 0.5 }, '-=0.4');

      // 2. Trust Feature Cards (Overview)
      if (document.querySelector('.cp-grid .cp-card')) {
        gsap.from('.cp-grid .cp-card', {
          scrollTrigger: {
            trigger: '.cp-grid',
            start: 'top 85%',
          },
          opacity: 0,
          y: 35,
          stagger: 0.12,
          duration: 0.75,
          ease: 'power3.out',
        });
      }

      // 3. Real Evidence Gallery
      if (document.querySelector('.cp-evidence-grid .cp-evidence-card')) {
        gsap.from('.cp-evidence-grid .cp-evidence-card', {
          scrollTrigger: {
            trigger: '.cp-evidence',
            start: 'top 82%',
          },
          opacity: 0,
          y: 40,
          stagger: 0.08,
          duration: 0.75,
          ease: 'power2.out',
        });
      }

      // 4. Panorama Showcase Frame
      if (document.querySelector('.cp-pano-frame')) {
        gsap.from('.cp-pano-frame', {
          scrollTrigger: {
            trigger: '.cp-panorama-showcase',
            start: 'top 82%',
          },
          opacity: 0,
          scale: 0.96,
          duration: 0.85,
          ease: 'power3.out',
        });
      }

      // 5. Official Marketing Creatives
      if (document.querySelector('.cp-campaigns-section .cp-evidence-card')) {
        gsap.from('.cp-campaigns-section .cp-evidence-card', {
          scrollTrigger: {
            trigger: '.cp-campaigns-section',
            start: 'top 82%',
          },
          opacity: 0,
          y: 30,
          stagger: 0.06,
          duration: 0.7,
          ease: 'power2.out',
        });
      }

      // 6. 3D Tour Canvas Container
      if (document.querySelector('.cp-tour .cp-scene')) {
        gsap.from('.cp-tour .cp-scene', {
          scrollTrigger: {
            trigger: '.cp-tour',
            start: 'top 80%',
          },
          opacity: 0,
          y: 35,
          duration: 0.9,
          ease: 'power3.out',
        });
      }

      // 7. Inventory Cards
      if (document.querySelector('.cp-inventory-card')) {
        gsap.from('.cp-inventory-card', {
          opacity: 0,
          y: 25,
          stagger: 0.06,
          duration: 0.55,
          ease: 'power2.out',
        });
      }

      // 8. Investor Dossier Cards
      if (document.querySelector('.cp-investor-grid .cp-investor-card')) {
        gsap.from('.cp-investor-grid .cp-investor-card', {
          scrollTrigger: {
            trigger: '.cp-investor-grid',
            start: 'top 85%',
          },
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
        });
      }

      // 9. Contact Mandate Cards
      if (document.querySelector('.cp-contact-grid .cp-contact-card')) {
        gsap.from('.cp-contact-grid .cp-contact-card', {
          scrollTrigger: {
            trigger: '.cp-contact-grid',
            start: 'top 85%',
          },
          opacity: 0,
          y: 30,
          stagger: 0.1,
          duration: 0.7,
          ease: 'power3.out',
        });
      }

      // 10. CTA Inner Banner
      if (document.querySelector('.cp-cta-inner')) {
        gsap.from('.cp-cta-inner', {
          scrollTrigger: {
            trigger: '.cp-cta-banner',
            start: 'top 85%',
          },
          opacity: 0,
          y: 35,
          duration: 0.8,
          ease: 'power3.out',
        });
      }
    },
    { scope: containerRef, dependencies: [section, filteredUnits] }
  );

  const whatsappInquire = (unit: InventoryUnit) => {
    const priceTxt = currency === 'EGP' ? `${unit.priceEgp.toLocaleString()} EGP` : `$${unit.priceUsd.toLocaleString()} USD`;
    const msg = isAr
      ? `مرحبًا سييرا استيتس، أود الاستفسار وحجز الوحدة (${unit.code} - ${unit.typeAr}) بمساحة ${unit.area} بقيمة تقديرية ${priceTxt} في مشروع كايرو بلازا.`
      : `Hello Sierra Estates, I am inquiring about unit ${unit.code} (${unit.typeEn}), size ${unit.area}, estimated price ${priceTxt} at Cairo Plaza.`;
    window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div ref={containerRef} dir={isAr ? 'rtl' : 'ltr'} className="cp-shell-wrapper">
      {/* ── Sub-Navigation Bar Aligned with Main Portal ─────────────── */}
      <div className="cp-subnav-bar">
        <div className="cp-subnav-inner">
          <div className="cp-subnav-links" role="tablist" aria-label={isAr ? 'أقسام كايرو بلازا' : 'Cairo Plaza sections'}>
            {nav.map(([key, label]) => (
              <Link
                key={key}
                href={key === 'overview' ? prefix : `${prefix}/${key}`}
                className={`cp-subnav-link${section === key ? ' active' : ''}`}
                role="tab"
                aria-selected={section === key}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="cp-subnav-meta">
            <Link href={switchLangHref} className="cp-subnav-lang" title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}>
              {isAr ? 'Switch to English' : 'النسخة العربية'}
            </Link>
          </div>
        </div>
      </div>

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
        {stats[isAr ? 'ar' : 'en'].map((s) => (
          <CpStat key={s.label} value={s.value} label={s.label} />
        ))}
      </div>

      {/* ── Dynamic Content Routed by Section ─────────────────────── */}
      {section === 'overview' && (
        <>
          <section className="cp-grid" aria-label={isAr ? 'طبقة معلومات مضبوطة' : 'A controlled information layer'}>
            {trust[isAr ? 'ar' : 'en'].map((card) => (
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

          {/* ── REAL-SITE PANORAMA SHOWCASE ── */}
          <section className="cp-panorama-showcase" aria-labelledby="cp-pano-title" style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
            <div className="cp-section-heading">
              <div>
                <p className="cp-eyebrow">{isAr ? 'بانوراما الموقع الحقيقي 360°' : 'REAL-SITE 360° PANORAMIC VIEW'}</p>
                <h2 id="cp-pano-title" className="cp-section-title">{isAr ? 'الموقع الفعلي والأبراج قيد الإنشاء' : 'Actual site footprint & construction context'}</h2>
              </div>
              <p className="cp-section-note">{isAr ? 'صورة بانورامية حقيقية شاملة للموقع توضح كتلة الأبراج، الساحة المفتوحة، والمحيط العمراني أمام محطة مترو المطرية.' : 'High-resolution wide panoramic site capture showing real tower massing, open public courtyard, and immediate metro street frontage.'}</p>
            </div>
            
            <div className="cp-pano-frame" style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(201, 168, 106, 0.25)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', background: '#0b1118' }}>
              <Image
                src="/cairo-plaza/real-site-panorama.jpg"
                alt={isAr ? 'صورة بانورامية حقيقية شاملة لموقع مشروع كايرو بلازا' : 'Wide verified real-site panorama of Cairo Plaza construction site'}
                fill
                priority
                sizes="100vw"
                style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              />
              <div style={{ position: 'absolute', top: '16px', left: isAr ? 'auto' : '16px', right: isAr ? '16px' : 'auto', background: 'rgba(11, 17, 24, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(201,168,106,0.4)', fontSize: '0.8rem', color: '#c9a86a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                {isAr ? 'صورة بانورامية حية من أرض الواقع' : 'VERIFIED REAL-SITE PANORAMA'}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(11,17,24,0.95), transparent)', padding: '24px 20px 16px', color: '#e5e7eb', fontSize: '0.85rem' }}>
                <strong style={{ color: '#fff', fontSize: '1rem', display: 'block', marginBottom: '2px' }}>{isAr ? 'مشروع كايرو بلازا — أمام محطة مترو المطرية' : 'Cairo Plaza — Al-Mataria Metro Station Frontage'}</strong>
                <span>{isAr ? 'توثيق ميداني لأعمال البناء والهيكل الخرساني والساحة الداخلية للمشروع' : 'Field documentation of tower structure, concrete framework, and integrated public plaza'}</span>
              </div>
            </div>
          </section>

          {/* ── OFFICIAL MARKETING SUITE & CAMPAIGN CREATIVES ── */}
          <section className="cp-campaigns-section" aria-labelledby="cp-campaigns-title" style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
            <div className="cp-section-heading">
              <div>
                <p className="cp-eyebrow">{isAr ? 'الهوية التسويقية والحملات الإعلانية' : 'MARKETING SUITE & AD CREATIVES'}</p>
                <h2 id="cp-campaigns-title" className="cp-section-title">{isAr ? 'حملات الطرح الرسمي لكايرو بلازا' : 'Official Launch Campaigns & Marketing Creatives'}</h2>
              </div>
              <p className="cp-section-note">{isAr ? 'تصميمات الطرح والحملات الترويجية الرسمية المعتمدة من Sierra Estates للاستخدام التسويقي والترويجي عبر الوسائط الرقمية.' : 'High-impact branded social and investor campaign creatives designed for multi-channel syndication and ad deployment.'}</p>
            </div>

            <div className="cp-evidence-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {officialAdCampaigns.map((ad) => (
                <figure
                  className="cp-evidence-card"
                  key={ad.src}
                  style={{
                    cursor: 'zoom-in',
                    background: 'linear-gradient(180deg, rgba(16, 26, 40, 0.95), rgba(11, 17, 24, 0.98))',
                    border: '1px solid rgba(201, 168, 106, 0.3)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                  onClick={() => openLightbox(
                    ad.src,
                    isAr ? ad.titleAr : ad.titleEn,
                    isAr ? `${ad.titleAr} (${ad.ref}) — ${ad.descAr}` : `${ad.titleEn} (${ad.ref}) — ${ad.descEn}`,
                  )}
                >
                  <div className="cp-evidence-media" style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                    <Image
                      src={ad.src}
                      alt={isAr ? ad.titleAr : ad.titleEn}
                      fill
                      loading="lazy"
                      sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <span
                      className="cp-evidence-badge"
                      style={{
                        background: 'linear-gradient(135deg, #c9a86a, #dfc38c)',
                        color: '#0b1118',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(201, 168, 106, 0.4)',
                      }}
                    >
                      {isAr ? ad.badgeAr : ad.badgeEn}
                    </span>
                  </div>
                  <figcaption style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>{isAr ? ad.titleAr : ad.titleEn}</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                      {isAr ? ad.descAr : ad.descEn}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#c9a86a', letterSpacing: '0.5px' }}>
                        {ad.ref}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔍 {isAr ? 'تكبير الصورة' : 'View full'}
                      </span>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* ── 3D INTERACTIVE TOUR WITH REAL-PHOTO TEXTURED MASSING & PHOTOSPHERE ── */}
          <section className="cp-tour" aria-labelledby="cp-tour-title">
            <div className="cp-section-heading">
              <div>
                <p className="cp-eyebrow">{isAr ? 'جولة تفاعلية ثلاثية الأبعاد وصور حقيقية' : '3D SPATIAL TOUR & REAL PHOTOS'}</p>
                <h2 id="cp-tour-title" className="cp-section-title">{isAr ? 'استكشف الأبراج بالصور الحقيقية وبانوراما 360°' : 'Explore Real-Photo Textured Towers & 360° Site'}</h2>
              </div>
              <p className="cp-section-note">{isAr ? 'مجسم تفاعلي يدمج ملامس الواجهات الحقيقية للمشروع، مع وضع بانوراما كروية 360° ونقاط تفاعلية للموقع.' : 'Interactive visualizer with real facade texture mapping, 360° on-site photosphere dome, and clickable real-photo hotspots.'}</p>
            </div>
            <CairoPlazaScene lang={isAr ? 'ar' : 'en'} />
          </section>

          <CairoPlazaCalculator lang={isAr ? 'ar' : 'en'} />
        </>
      )}

      {/* ── INVENTORY SECTION: Interactive Schedule with Full Filters ── */}
      {section === 'inventory' && (
        <section className="cp-inventory-section" aria-labelledby="cp-inv-title">
          <div className="cp-section-heading">
            <div>
              <p className="cp-eyebrow">{isAr ? 'جدول الوحدات المتاحة' : 'COMMERCIAL & OFFICE SCHEDULE'}</p>
              <h2 id="cp-inv-title" className="cp-section-title">{isAr ? 'الوحدات المجهزة للطرح الاستثماري والتشغيلي' : 'Prime commercial & corporate inventory'}</h2>
            </div>
            <p className="cp-section-note">{isAr ? 'اختر نوع الوحدة والمساحة المناسبة لطلب نموذج التدفقات النقدية والمخططات المعمارية.' : 'Filter by property type, space range, or search directly for specific unit codes and frontage.'}</p>
          </div>

          {/* ── Interactive Category Tabs & Search Bar ──────────────── */}
          <div className="cp-filter-container">
            <div className="cp-type-tabs" role="tablist" aria-label={isAr ? 'أنواع الوحدات' : 'Unit types'}>
              {[
                { id: 'all', labelEn: 'All Units', labelAr: 'جميع الوحدات', icon: Layers },
                { id: 'retail', labelEn: 'Retail & Banks', labelAr: 'تجاري وفروع بنكية', icon: Building2 },
                { id: 'office', labelEn: 'Offices & HQ', labelAr: 'مكاتب ومقرات إدارية', icon: FileText },
                { id: 'medical', labelEn: 'Medical & Clinics', labelAr: 'عيادات ومراكز طبية', icon: ShieldCheck },
                { id: 'fnb', labelEn: 'F&B Terraces', labelAr: 'مطاعم وتراس كافيهات', icon: TrendingUp },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const active = selectedType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedType(tab.id as UnitType)}
                    className={`cp-type-pill${active ? ' active' : ''}`}
                  >
                    <IconComponent className="i" style={{ width: 15, height: 15 }} />
                    <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                  </button>
                );
              })}
            </div>

            <div className="cp-filter-controls">
              <div className="cp-search-wrap">
                <Search className="i cp-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث بالرمز، المساحة، أو الواجهة…' : 'Search by unit code, area, or frontage…'}
                  className="cp-search-input"
                />
              </div>

              <div className="cp-size-filter">
                <Filter className="i" style={{ width: 14, height: 14, color: 'var(--muted)' }} />
                <select
                  value={selectedSizeRange}
                  onChange={(e) => setSelectedSizeRange(e.target.value as any)}
                  className="cp-select-pill"
                  aria-label={isAr ? 'تصفية المساحة' : 'Filter by size'}
                >
                  <option value="all">{isAr ? 'جميع المساحات' : 'All Sizes'}</option>
                  <option value="small">{isAr ? 'أقل من 150 م²' : '< 150 m²'}</option>
                  <option value="med">{isAr ? '150 إلى 250 م²' : '150 - 250 m²'}</option>
                  <option value="large">{isAr ? 'أكثر من 250 م²' : '> 250 m²'}</option>
                </select>
              </div>

              <div className="cp-currency-toggle">
                <button
                  type="button"
                  onClick={() => setCurrency('EGP')}
                  className={`cp-curr-btn${currency === 'EGP' ? ' active' : ''}`}
                >
                  EGP
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`cp-curr-btn${currency === 'USD' ? ' active' : ''}`}
                >
                  USD
                </button>
              </div>
            </div>
          </div>

          {/* ── Units Grid ─────────────────────────────────────────── */}
          <div className="cp-inventory-grid">
            {filteredUnits.map((unit) => {
              const displayPrice = currency === 'EGP'
                ? `${unit.priceEgp.toLocaleString()} ج.م`
                : `$${unit.priceUsd.toLocaleString()}`;

              return (
                <div className="cp-inventory-card" key={unit.code}>
                  <div className="cp-inv-media-thumb">
                    <Image
                      src={unit.featuredImg}
                      alt={isAr ? unit.typeAr : unit.typeEn}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <span className="cp-inv-code-badge">{unit.code}</span>
                    <span className="cp-inv-roi-badge">{isAr ? `عائد ${unit.roi}` : `Est. Yield ${unit.roi}`}</span>
                  </div>

                  <div className="cp-inv-content">
                    <h3 className="cp-inv-title">{isAr ? unit.typeAr : unit.typeEn}</h3>

                    <div className="cp-inv-specs">
                      <div><span>{isAr ? 'المساحة الداخلية' : 'Internal Area'}</span><strong>{unit.area}</strong></div>
                      <div><span>{isAr ? 'التراس الخارجي' : 'Outdoor Area'}</span><strong>{unit.terrace}</strong></div>
                      <div><span>{isAr ? 'الموقع والإطلالة' : 'Frontage'}</span><strong>{isAr ? unit.frontageAr : unit.frontageEn}</strong></div>
                    </div>

                    <div className="cp-inv-price-row">
                      <div className="cp-inv-price-val">
                        <span>{isAr ? 'القيمة التقديرية' : 'Estimated Value'}</span>
                        <b>{displayPrice}</b>
                      </div>
                      <span className="cp-inv-status">{isAr ? unit.statusAr : unit.statusEn}</span>
                    </div>

                    <div className="cp-inv-foot">
                      <button type="button" onClick={() => whatsappInquire(unit)} className="cp-inv-btn">
                        <MessageSquare className="i" style={{ width: 14, height: 14 }} />
                        {isAr ? 'طلب المعاينة وحجز الوحدة' : 'Inquire & Book Briefing'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUnits.length === 0 && (
            <div className="cp-no-results">
              <Building2 className="i" style={{ width: 36, height: 36, color: 'var(--muted)', margin: '0 auto 12px' }} />
              <p>{isAr ? 'لم نجد وحدات مطابقة لبحثك. يرجى تعديل الفلاتر أو التواصل مع مستشارنا مباشرة.' : 'No units match your selected filter. Please adjust your criteria or consult our advisory desk.'}</p>
            </div>
          )}

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
          {materials[isAr ? 'ar' : 'en'].map((m) => (
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
    </div>
  );
}
