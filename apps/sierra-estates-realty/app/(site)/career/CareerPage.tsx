'use client';

import React, { useState, useRef } from 'react';
import {
  Mail, Phone, Briefcase, Clock, MapPin, ArrowRight, Rocket, ChevronDown,
  GraduationCap, Coffee, Palmtree, HeartPulse, Sparkles, Award, DollarSign, Building,
  CheckCircle2, MessageSquare,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SiteShell from '@/components/site/SiteShell';
import CareerApplicationForm from '@/components/client/CareerApplicationForm';
import { useSite } from '@/lib/site/SiteContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/* ------------------------------------------------------------------ */
/*  DATA — BILINGUAL CAREERS (SALES & ADMIN FOCUS)                     */
/* ------------------------------------------------------------------ */

interface JobListing {
  id: string;
  dept: 'sales' | 'admin' | 'all';
  deptEn: string;
  deptAr: string;
  titleEn: string;
  titleAr: string;
  typeEn: string;
  typeAr: string;
  locEn: string;
  locAr: string;
  urgent: boolean;
  salaryEn: string;
  salaryAr: string;
  descEn: string;
  descAr: string;
  responsibilitiesEn: string[];
  responsibilitiesAr: string[];
  requirementsEn: string[];
  requirementsAr: string[];
  skills: string[];
}

const JOBS: JobListing[] = [
  // ── THE THREE OPEN ROLES (Module 3 spec) ──
  {
    id: 'online-real-estate-consultant',
    dept: 'sales',
    deptEn: 'Sales & Advisory — Online',
    deptAr: 'المبيعات والاستشارات — أونلاين',
    titleEn: 'Online Real Estate Consultant',
    titleAr: 'مستشار عقاري أونلاين (Online Consultant)',
    typeEn: 'Full-time · Remote',
    typeAr: 'دوام كامل · عن بُعد',
    locEn: 'Remote (New Cairo market)',
    locAr: 'عن بُعد (سوق القاهرة الجديدة)',
    urgent: true,
    salaryEn: 'Tier 1 Commission: 30% of Sierra fee + 25% online-channel discount to close',
    salaryAr: 'شريحة 1: عمولة 30% من أتعاب سييرا + خصم 25% لقناة الأونلاين',
    descEn: 'Run AI-matched buyer and tenant requests end-to-end from anywhere: instant inventory matching, virtual tours over WhatsApp video, and remote closings across Hyde Park, Mountain View iCity and every Fifth Settlement compound.',
    descAr: 'إدارة طلبات الشراء والتأجير المؤهلة بالذكاء الاصطناعي بالكامل عن بُعد: مطابقة فورية للانفنتوري، جولات افتراضية عبر واتساب، وإغلاق صفقات التجمع الخامس وهايد بارك وأي سيتي عن بعد.',
    responsibilitiesEn: [
      'Work the Client_Requests queue — every request arrives AI-matched to live unit codes',
      'Host virtual tours and negotiate remotely with owners and buyers',
      'Keep the CRM pipeline stages current (New → Contacted → Viewing → Closed)',
      'Coordinate with in-office advisors for physical viewings and handovers',
    ],
    responsibilitiesAr: [
      'متابعة طلبات العملاء المؤهلة مسبقاً بنظام المطابقة الذكي',
      'تنظيم الجولات الافتراضية والتفاوض عن بُعد مع الملاك والمشترين',
      'تحديث مراحل الصفقات على نظام الـ CRM باستمرار',
      'التنسيق مع مستشاري المكتب للمعاينات الميدانية والاستلام',
    ],
    requirementsEn: [
      '1+ year in New Cairo real estate brokerage',
      'Fluent Arabic + presentable English; strong phone/WhatsApp etiquette',
      'Comfortable with digital tools (CRM, Google Sheets, virtual tours)',
      'Own smartphone + stable internet; laptop preferred',
    ],
    requirementsAr: [
      'خبرة سنة أو أكثر في الوساطة العقارية بالتجمع الخامس',
      'إجادة اللغة العربية ومستوى جيد بالإنجليزية مع لباقة في التواصل',
      'إلمام بالأدوات الرقمية (CRM، جوجل شيتس، الجولات الافتراضية)',
      'هاتف ذكي وإنترنت مستقر — يفضل امتلاك لابتوب',
    ],
    skills: ['Remote Advisory', 'AI-Matched Leads', 'Virtual Tours', 'WhatsApp Negotiation', 'CRM'],
  },
  {
    id: 'in-office-senior-property-advisor',
    dept: 'sales',
    deptEn: 'Sales & Advisory — Fifth Settlement HQ',
    deptAr: 'المبيعات والاستشارات — مقر التجمع الخامس',
    titleEn: 'In-Office Senior Property Advisor (Fifth Settlement)',
    titleAr: 'مستشار عقاري أول بالمكتب (التجمع الخامس)',
    typeEn: 'Full-time · On-site',
    typeAr: 'دوام كامل · من المكتب',
    locEn: 'Sierra Estates HQ — Fifth Settlement, New Cairo',
    locAr: 'مقر سييرا استيتس — التجمع الخامس، القاهرة الجديدة',
    urgent: true,
    salaryEn: 'Tier 2 Commission: 35% of Sierra fee + quarterly milestone bonus',
    salaryAr: 'شريحة 2: عمولة 35% من أتعاب سييرا + بونص ربع سنوي',
    descEn: 'The senior advisory seat at our Fifth Settlement headquarters: lead high-value site tours across Hyde Park and Mountain View iCity, mentor the online consultants, and own the direct owner relationships that keep our inventory exclusive.',
    descAr: 'المقعد الاستشاري الأول في مقرنا بالتجمع الخامس: قيادة المعاينات عالية القيمة في هايد بارك وماونتن فيو أي سيتي، تدريب مستشاري الأونلاين، وإدارة علاقات الملاك المباشرة التي تحفظ حصرية الانفنتوري.',
    responsibilitiesEn: [
      'Lead physical viewings and closings for high-ticket sales & leasing mandates',
      'Mentor online consultants; co-own their hardest negotiations',
      'Build direct-owner pipelines (Owners Master) across target compounds',
      'Represent Sierra in developer and owner meetings with the Sierra Blue Realty identity',
    ],
    responsibilitiesAr: [
      'قيادة المعاينات الميدانية وإغلاق صفقات البيع والتأجير الكبرى',
      'تدريب مستشاري الأونلاين والمشاركة في أصعب مفاوضاتهم',
      'بناء قاعدة ملاك مباشرين في الكمبوندات المستهدفة',
      'تمثيل سييرا في اجتماعات المطورين والملاك بهوية Sierra Blue Realty',
    ],
    requirementsEn: [
      '3+ years New Cairo / Fifth Settlement brokerage with a closing track record',
      'Deep compound knowledge (Hyde Park phases, iCity zones, Golden Square)',
      'Valid driving license and personal vehicle',
      'Bilingual Arabic/English presentation skills',
    ],
    requirementsAr: [
      'خبرة 3 سنوات أو أكثر في وساطة التجمع الخامس مع سجل صفقات موثق',
      'معرفة عميقة بالكمبوندات (مراحل هايد بارك، مناطق أي سيتي، جولدن سكوير)',
      'رخصة قيادة سارية وسيارة خاصة',
      'مهارات عرض ثنائية اللغة (عربي/إنجليزي)',
    ],
    skills: ['Luxury Advisory', 'Owner Relations', 'Deal Closing', 'Mentoring', 'Negotiation'],
  },
  {
    id: 'proptech-inventory-operations-specialist',
    dept: 'admin',
    deptEn: 'PropTech & Inventory Operations',
    deptAr: 'التقنية العقارية وعمليات الانفنتوري',
    titleEn: 'PropTech & Inventory Operations Specialist',
    titleAr: 'أخصائي عمليات الانفنتوري والتقنية العقارية',
    typeEn: 'Full-time · On-site (hybrid possible)',
    typeAr: 'دوام كامل · من المكتب (هجين ممكن)',
    locEn: 'Sierra Estates HQ — Fifth Settlement, New Cairo',
    locAr: 'مقر سييرا استيتس — التجمع الخامس، القاهرة الجديدة',
    urgent: false,
    salaryEn: 'Fixed salary + Tier 3 override on every unit you code & verify',
    salaryAr: 'راتب ثابت + حافز على كل وحدة تقوم بترميزها وتوثيقها',
    descEn: 'Own the inventory OS behind every deal: unit coding (SE-SL/SE-RNT gazetteer rules), deduplication, the Google Sheets ↔ Supabase sync health (Owners Master, Master_Inventory, Real_Available_Units), and the Telegram/WhatsApp automation pipelines.',
    descAr: 'امتلاك نظام تشغيل الانفنتوري خلف كل صفقة: ترميز الوحدات، إزالة التكرار، سلامة المزامنة بين جوجل شيتس وسوبابيس (Owners Master / Master_Inventory / Real_Available_Units)، وخطوط أتمتة تليجرام وواتساب.',
    responsibilitiesEn: [
      'Code, verify and dedupe every incoming unit against Owners Master & Master_Inventory',
      'Keep the Real_Available_Units mirror honest — statuses, prices, photos',
      'Run the SVG masterplan zone/pin tagging for Hyde Park & Mountain View iCity',
      'Monitor the automation workflows (ingestion → AI parsing → coding → sync → notifications)',
    ],
    responsibilitiesAr: [
      'ترميز وتوثيق كل وحدة واردة ومطابقتها ضد شيتات الملاك والانفنتوري الرئيسي',
      'الحفاظ على دقة مرآة الوحدات المتاحة — الحالات والأسعار والصور',
      'تشغيل التوسيم المكاني على المسقط الافتتاحي لهايد بارك وأي سيتي',
      'مراقبة سير العمل الآلي (الاستقبال ← التحليل الذكي ← الترميز ← المزامنة ← التنبيهات)',
    ],
    requirementsEn: [
      '1+ year in real estate operations, data, or PropTech',
      'Advanced Google Sheets + Excel; comfort with SQL/CRMs a strong plus',
      'Obsessive data hygiene — duplicates and stale statuses are your enemy',
      'Based in / commuting to New Cairo',
    ],
    requirementsAr: [
      'خبرة سنة أو أكثر في العمليات العقارية أو البيانات أو التقنية العقارية',
      'إجادة متقدمة لجوجل شيتس وإكسل — معرفة SQL أنظمة CRM ميزة قوية',
      'دقة هوس في نظافة البيانات — التكرار والحالات القديمة عدوك الأول',
      'الإقامة أو القدرة على التنقل إلى القاهرة الجديدة',
    ],
    skills: ['Data Operations', 'Google Sheets API', 'Unit Coding Rules', 'Deduplication', 'Automation'],
  },
];


const VALUES = [
  {
    icon: DollarSign,
    titleEn: 'Clear Commission Tiers',
    titleAr: 'شرائح عمولة واضحة',
    descEn: 'Tier 1 — Online Consultant: 30% of the Sierra fee. Tier 2 — In-Office Senior Advisor: 35% + quarterly milestone bonus. Tier 3 — PropTech Ops: fixed salary + per-unit coding override. All uncapped, all paid promptly.',
    descAr: 'الشريحة 1 — مستشار أونلاين: 30% من أتعاب سييرا. الشريحة 2 — مستشار أول بالمكتب: 35% + بونص ربع سنوي. الشريحة 3 — عمليات الانفنتوري: راتب ثابت + حافز لكل وحدة. جميعها بدون سقف وتُصرف فوراً.',
  },
  {
    icon: Sparkles,
    titleEn: 'AI-Powered Leads & Inventory Tools',
    titleAr: 'ليدات وأدوات انفنتوري بالذكاء الاصطناعي',
    descEn: 'Every client request arrives AI-matched to live unit codes from Real_Available_Units; every listing you touch is coded, deduped and synced across Supabase + Google Sheets automatically. Stop cold-calling — start advising.',
    descAr: 'كل طلب عميل يصلك مطابقاً مسبقاً لأكواد وحدات حقيقية من الوحدات المتاحة؛ وكل إعلان تعمل عليه يُرمز ويُنقّى من التكرار ويُزامن تلقائياً بين سوبابيس وجوجل شيتس. وداعاً للاتصال العشوائي — ابدأ الاستشارة.',
  },
  {
    icon: Rocket,
    titleEn: 'Fast Career Progression',
    titleAr: 'مسار وظيفي وترقيات سريعة',
    descEn: 'Clear, transparent milestone-based promotion paths from Consultant to Team Leader and Unit Manager.',
    descAr: 'خطوات ترقية واضحة ومحددة بالأداء من مستشار إلى قائد فريق ومدير قطاع.',
  },
  {
    icon: Building,
    titleEn: 'Sierra Blue Realty — New Cairo & Fifth Settlement',
    titleAr: 'Sierra Blue Realty — القاهرة الجديدة والتجمع الخامس',
    descEn: 'THE BEST DECISIONS, AI-DRIVEN. Exclusive mandates across Hyde Park, Mountain View iCity and the Golden Square compounds of the Fifth Settlement.',
    descAr: 'أفضل القرارات، بالذكاء الاصطناعي. تفويضات حصرية في هايد بارك وماونتن فيو أي سيتي وكمبوندات جولدن سكوير بالتجمع الخامس.',
  },
];

const PERKS = [
  {
    icon: DollarSign,
    labelEn: 'Prompt Commission Payouts',
    labelAr: 'صرف عمولات سريع ودوري',
    subEn: 'Transparent commission tracking dashboard with fast payout cycles upon deal closing.',
    subAr: 'لوحة تحكم شفافة لمتابعة عمولاتك وصرف فوري ومستمر مع كل صفقة.',
  },
  {
    icon: HeartPulse,
    labelEn: 'Full Medical Insurance',
    labelAr: 'تأمين طبي شامل',
    subEn: 'Comprehensive medical coverage in top private hospitals and clinics across Egypt.',
    subAr: 'تغطية طبية متميزة في كبرى المستشفيات والمراكز الطبية في مصر.',
  },
  {
    icon: GraduationCap,
    labelEn: 'Sierra Sales Academy',
    labelAr: 'أكاديمية تدريب متقدمة',
    subEn: 'Continuous masterclasses on negotiation, luxury selling, and market analysis.',
    subAr: 'تدريب احترافي دوري على مهارات التفاوض المتقدم وإغلاق الصفقات الكبرى.',
  },
  {
    icon: Coffee,
    labelEn: 'Luxury Work Environment',
    labelAr: 'بيئة عمل فندقية راقية',
    subEn: 'State-of-the-art office spaces in New Cairo with modern amenities and meeting suites.',
    subAr: 'مكاتب مجهزة بأعلى مستوى في قلب التجمع الخامس وقاعات اجتماعات فاخرة.',
  },
  {
    icon: Palmtree,
    labelEn: 'Paid Annual Leave',
    labelAr: 'إجازات سنوية مدفوعة',
    subEn: 'Generous paid time off + official national holidays for balanced wellbeing.',
    subAr: 'رصيد إجازات سنوية سخي بالإضافة إلى كافة العطلات الرسمية.',
  },
  {
    icon: Award,
    labelEn: 'Annual VIP Incentives',
    labelAr: 'رحلات وحوافز كبار النجوم',
    subEn: 'Top-performer international trips, luxury tech gifts, and annual gala recognition.',
    subAr: 'رحلات سفر دولية وهدايا قيمة وتكريم سنوي لكبار محققي المبيعات.',
  },
];

const PROCESS = [
  {
    step: '01',
    titleEn: 'Apply Fast',
    titleAr: 'تقديم سريع',
    descEn: 'Submit your CV online or connect directly via WhatsApp in 30 seconds.',
    descAr: 'قدم سيرتك الذاتية عبر النموذج أو تواصل معنا مباشرة عبر الواتساب في ثوانٍ.',
  },
  {
    step: '02',
    titleEn: 'HR Screening',
    titleAr: 'المقابلة الأولى',
    descEn: 'A focused discussion with our talent team about your experience and aspirations.',
    descAr: 'جلسة تعارف ومناقشة مركزة مع فريق الموارد البشرية حول خبراتك وطموحاتك.',
  },
  {
    step: '03',
    titleEn: 'Commercial Brief',
    titleAr: 'مقابلة القيادة',
    descEn: 'A practical conversation with our Sales/Operations Director on real deal scenarios.',
    descAr: 'مقابلة مهنية مع مدير القطاع لمناقشة خطط العمل وسيناريوهات الصفقات.',
  },
  {
    step: '04',
    titleEn: 'Offer & Onboarding',
    titleAr: 'عرض العمل والانطلاق',
    descEn: 'Receive your formal offer, begin intensive onboarding, and start closing from week one.',
    descAr: 'استلام العرض الرسمي، وبدء التدريب والتجهيز لإغلاق صفقاتك الأولى بنجاح.',
  },
];

/* ------------------------------------------------------------------ */
/*  MAIN CAREER PAGE COMPONENT                                         */
/* ------------------------------------------------------------------ */

export default function CareerPage() {
  const { isAr } = useSite();
  const containerRef = useRef<HTMLDivElement>(null);

  const [deptFilter, setDeptFilter] = useState<'all' | 'sales' | 'admin'>('all');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>('sales-senior-consultant');
  const filteredJobs = deptFilter === 'all'
    ? JOBS
    : JOBS.filter((j) => j.dept === deptFilter);

  // ── GSAP Scroll Animations ───────────────────────────────────────
  useGSAP(
    () => {
      if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.cr-hero .cr-badge', { opacity: 0, y: 15, duration: 0.5 })
        .from('.cr-hero .cr-hero-title', { opacity: 0, y: 25, duration: 0.65 }, '-=0.3')
        .from('.cr-hero .cr-hero-sub', { opacity: 0, y: 20, duration: 0.5 }, '-=0.35')
        .from('.cr-hero .cr-stat', { opacity: 0, y: 20, stagger: 0.08, duration: 0.5 }, '-=0.3')
        .from('.cr-hero .cr-hero-actions a', { opacity: 0, y: 15, stagger: 0.1, duration: 0.5 }, '-=0.25');

      gsap.from('.cr-spotlight-card', {
        scrollTrigger: {
          trigger: '.cr-dept-spotlight',
          start: 'top 85%',
        },
        opacity: 0,
        y: 35,
        stagger: 0.15,
        duration: 0.75,
        ease: 'power3.out',
      });

      gsap.from('.cr-job-card', {
        scrollTrigger: {
          trigger: '.cr-jobs-list',
          start: 'top 85%',
        },
        opacity: 0,
        y: 25,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out',
      });

      gsap.from('.cr-perk-card', {
        scrollTrigger: {
          trigger: '.cr-perks-grid',
          start: 'top 85%',
        },
        opacity: 0,
        y: 30,
        stagger: 0.08,
        duration: 0.7,
        ease: 'power3.out',
      });

      gsap.from('.cr-process-step', {
        scrollTrigger: {
          trigger: '.cr-process',
          start: 'top 85%',
        },
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.65,
        ease: 'power3.out',
      });
    },
    { scope: containerRef, dependencies: [deptFilter] }
  );

  const applyViaWhatsApp = (job?: JobListing) => {
    const jobTitle = job ? (isAr ? job.titleAr : job.titleEn) : (selectedPosition || (isAr ? 'وظائف المبيعات / الإدارة' : 'Sales / Admin Role'));
    const text = isAr
      ? `مرحباً سييرا استيتس، أود التقدم لشغل وظيفة (${jobTitle}). أرجو إفادتي بالخطوات التالية وإرسال السيرة الذاتية.`
      : `Hello Sierra Estates, I would like to apply for the position: (${jobTitle}). Please let me know the next steps to share my CV.`;
    window.open(`https://wa.me/201092048333?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <SiteShell active="career">
      <div ref={containerRef} dir={isAr ? 'rtl' : 'ltr'} className="cr-page-wrapper">
        
        {/* ── HERO SECTION ────────────────────────────────────────── */}
        <header className="cr-hero">
          <div className="cr-wrap">
            <div className="cr-badge">
              <Sparkles style={{ width: 14, height: 14 }} />
              {isAr ? 'باب التوظيف مفتوح — انضم إلى نخبة العقارات' : "WE'RE HIRING — JOIN THE ELITE"}
            </div>
            
            <h1 className="cr-hero-title">
              {isAr ? (
                <>ابنِ مستقبلك المهني مع<br /><span style={{ color: '#c9a86a' }}>Sierra Estates</span></>
              ) : (
                <>Elevate Your Career at<br /><span style={{ color: '#c9a86a' }}>Sierra Estates</span></>
              )}
            </h1>

            <p className="cr-hero-sub">
              {isAr
                ? 'نبحث عن كوادر متميزة في قطاعي المبيعات العقارية (Sales) والشؤون الإدارية والعمليات (Admin & Operations) للعمل في مقراتنا بالتجمع الخامس ومشروعاتنا الكبرى.'
                : 'We are expanding our elite team in New Cairo. Hiring ambitious Real Estate Sales Professionals & Operations Administrators with unmatched growth potential.'}
            </p>

            <div className="cr-hero-stats">
              <div className="cr-stat">
                <span className="cr-stat-num">EGP 2B+</span>
                <span className="cr-stat-label">{isAr ? 'حجم المحفظة المدارة' : 'Portfolio Tracked'}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-num">{isAr ? 'بدون سقف' : 'Uncapped'}</span>
                <span className="cr-stat-label">{isAr ? 'عمولات مبيعات فورية' : 'Sales Commissions'}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-num">48h</span>
                <span className="cr-stat-label">{isAr ? 'سرعة الرد والمقابلات' : 'Interview SLA'}</span>
              </div>
              <div className="cr-stat">
                <span className="cr-stat-num">New Cairo</span>
                <span className="cr-stat-label">{isAr ? 'المقر: التجمع الخامس' : 'HQ Location'}</span>
              </div>
            </div>

            <div className="cr-hero-actions">
              <a href="#positions" className="cr-cta">
                {isAr ? 'استعرض الوظائف المتاحة' : 'View Open Roles'} <ArrowRight className="cr-cta-icon" />
              </a>
              <button type="button" onClick={() => applyViaWhatsApp()} className="cr-cta cr-cta-secondary">
                <MessageSquare className="cr-cta-icon" />
                {isAr ? 'تقديم فوري عبر واتساب' : 'Fast-Track via WhatsApp'}
              </button>
            </div>
          </div>
        </header>

        {/* ── SALES & ADMIN SPOTLIGHT BOXES ────────────────────────── */}
        <section className="cr-section">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'المسارات الوظيفية الأساسية' : 'CORE CAREER TRACKS'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'فرص استثنائية في المبيعات والإدارة' : 'Tailored Opportunities in Sales & Admin'}
            </h2>

            <div className="cr-dept-spotlight">
              {/* Sales Track */}
              <div className="cr-spotlight-card">
                <span className="cr-spotlight-tag">{isAr ? 'قطاع المبيعات والاستشارات' : 'SALES & ADVISORY TRACK'}</span>
                <h3>{isAr ? 'فريق المبيعات العقارية (Sales)' : 'Real Estate Sales Force'}</h3>
                <p>
                  {isAr
                    ? 'احصل على تدفق يومي من العملاء المؤهلين (AI-Matched Leads) مع أعلى نسب عمولة في السوق وتفويضات بيع حصرية في أرقى كمبوندات التجمع والعاصمة والمشروعات التجارية.'
                    : 'Unleash your closing potential with pre-qualified high-intent leads, uncapped commissions, and exclusive marketing mandates across premier luxury and commercial developments.'}
                </p>
                <ul className="cr-spotlight-features">
                  <li><CheckCircle2 /> {isAr ? 'عمولات فورية بدون حد أقصى + بونص ربع سنوي' : 'Uncapped direct commission + quarterly milestone bonuses'}</li>
                  <li><CheckCircle2 /> {isAr ? 'ليدات حصرية ساخنة ومؤهلة بنظام الـ AI' : 'Daily pre-screened leads matched by AI engine'}</li>
                  <li><CheckCircle2 /> {isAr ? 'أكاديمية تدريب مستمرة ودعم إغلاق من القيادات' : 'Continuous closing masterclasses & leadership coaching'}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter('sales');
                    const el = document.getElementById('positions');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="cr-job-apply-form"
                >
                  {isAr ? 'وظائف المبيعات الشاغرة (2)' : 'View Sales Roles (2)'} →
                </button>
              </div>

              {/* Admin & Operations Track */}
              <div className="cr-spotlight-card">
                <span className="cr-spotlight-tag" style={{ background: 'rgba(201, 148, 54, 0.16)', color: '#9e7934' }}>
                  {isAr ? 'قطاع الشؤون الإدارية والعمليات' : 'ADMIN & OPERATIONS TRACK'}
                </span>
                <h3>{isAr ? 'الشؤون الإدارية والعمليات (Admin)' : 'Operations & Executive Support'}</h3>
                <p>
                  {isAr
                    ? 'كن الركيزة الأساسية لنجاح الشركة في إدارة العقود، متابعة المطورين، تنظيم بيانات الـ CRM، وإدارة المكتب التنفيذي في بيئة عمل احترافية ومستقرة.'
                    : 'Be the operational engine of Sierra Estates. Oversee developer bookings, streamline CRM property datasets, and manage executive workflows in a modern luxury office.'}
                </p>
                <ul className="cr-spotlight-features">
                  <li><CheckCircle2 /> {isAr ? 'رواتب ثابتة مجزية + تأمينات وحوافز أداء دورية' : 'Competitive fixed compensation + quarterly performance bonus'}</li>
                  <li><CheckCircle2 /> {isAr ? 'بيئة عمل منظمة وتكنولوجيا حديثة لإدارة العمليات' : 'Modern PropTech stack and streamlined digital workflows'}</li>
                  <li><CheckCircle2 /> {isAr ? 'استقرار وظيفي وتدرج إداري سريع' : 'Career stability with transparent growth ladders'}</li>
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter('admin');
                    const el = document.getElementById('positions');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="cr-job-apply-form"
                  style={{ background: 'linear-gradient(135deg, #c99436, #9e7934)', color: '#081423' }}
                >
                  {isAr ? 'وظائف العمليات الشاغرة (1)' : 'View Operations Role (1)'} →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── VALUES & ADVANTAGES ─────────────────────────────────── */}
        <section className="cr-section cr-section--alt">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'لماذا سييرا استيتس؟' : 'WHY SIERRA ESTATES'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'بيئة عمل صُممت لنجاحك وازدهارك' : 'Built to Empower Your Success'}
            </h2>
            <div className="cr-perks-grid">
              {VALUES.map((v) => (
                <div className="cr-perk-card" key={v.titleEn}>
                  <div className="cr-perk-icon"><v.icon /></div>
                  <div>
                    <h4>{isAr ? v.titleAr : v.titleEn}</h4>
                    <p>{isAr ? v.descAr : v.descEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OPEN POSITIONS (SALES & ADMIN) ───────────────────────── */}
        <section className="cr-section" id="positions">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'الوظائف المتاحة حالياً' : 'CAREERS & OPEN POSITIONS'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'اختر الدور المناسب لخبراتك' : 'Find Your Next Role'}
            </h2>

            {/* Department Filter Buttons */}
            <div className="cr-dept-filters" aria-label={isAr ? 'أقسام الوظائف' : 'Department filters'}>
              {[
                { id: 'all', labelEn: 'All Openings', labelAr: 'جميع الوظائف الشاغرة' },
                { id: 'sales', labelEn: 'Sales & Advisory (2)', labelAr: 'المبيعات والاستشارات (2)' },
                { id: 'admin', labelEn: 'PropTech & Operations (1)', labelAr: 'التقنية والعمليات (1)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  title={isAr ? tab.labelAr : tab.labelEn}
                  className={`cr-dept-btn ${deptFilter === tab.id ? 'cr-dept-btn--active' : ''}`}
                  onClick={() => setDeptFilter(tab.id as any)}
                >
                  {isAr ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>

            {/* Jobs Accordion List */}
            <div className="cr-jobs-list">
              {filteredJobs.map((j) => {
                const isOpen = expandedJob === j.id;
                return (
                  <div
                    key={j.id}
                    className={`cr-job-card ${j.urgent ? 'cr-job-card--urgent' : ''}`}
                  >
                    <div
                      className="cr-job-header"
                      onClick={() => setExpandedJob(isOpen ? null : j.id)}
                    >
                      <div className="cr-job-main">
                        <h3>{isAr ? j.titleAr : j.titleEn}</h3>
                        <div className="cr-job-meta">
                          <span><Briefcase className="cr-meta-icon" /> {isAr ? j.deptAr : j.deptEn}</span>
                          <span><Clock className="cr-meta-icon" /> {isAr ? j.typeAr : j.typeEn}</span>
                          <span><MapPin className="cr-meta-icon" /> {isAr ? j.locAr : j.locEn}</span>
                        </div>
                      </div>
                      <div className="cr-job-actions">
                        <span className="cr-salary-pill">{isAr ? j.salaryAr : j.salaryEn}</span>
                        {j.urgent && (
                          <span className="cr-urgent-badge">{isAr ? 'توظيف عاجل' : 'URGENT'}</span>
                        )}
                        <ChevronDown className={`cr-expand-icon ${isOpen ? 'cr-expand-icon--open' : ''}`} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="cr-job-detail">
                        <p>{isAr ? j.descAr : j.descEn}</p>

                        <div className="cr-job-specs">
                          <div>
                            <h4>{isAr ? 'المهام والمسؤوليات الأساسية:' : 'Key Responsibilities:'}</h4>
                            <ul>
                              {(isAr ? j.responsibilitiesAr : j.responsibilitiesEn).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4>{isAr ? 'المتطلبات والشروط:' : 'Requirements & Qualifications:'}</h4>
                            <ul>
                              {(isAr ? j.requirementsAr : j.requirementsEn).map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="cr-job-skills">
                          {j.skills.map((s) => (
                            <span className="cr-skill-tag" key={s}>{s}</span>
                          ))}
                        </div>

                        <div className="cr-job-cta-row">
                          <button
                            type="button"
                            onClick={() => applyViaWhatsApp(j)}
                            className="cr-job-apply-wa"
                          >
                            <MessageSquare style={{ width: 15, height: 15 }} />
                            {isAr ? 'تقديم فوري عبر واتساب' : 'Apply via WhatsApp'}
                          </button>
                          <a
                            href="#apply"
                            onClick={() => {
                              setSelectedPosition(j.titleEn);
                            }}
                            className="cr-job-apply-form"
                          >
                            {isAr ? 'تعبئة استمارة التقديم' : 'Fill Application Form'} ↓
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PERKS & BENEFITS ─────────────────────────────────────── */}
        <section className="cr-section cr-section--alt">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'المزايا والحوافز' : 'BENEFITS & PERKS'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'ما نقدمه لك عند انضمامك لفريقنا' : 'What We Offer Our Team'}
            </h2>
            <div className="cr-perks-grid">
              {PERKS.map((p) => (
                <div className="cr-perk-card" key={p.labelEn}>
                  <div className="cr-perk-icon"><p.icon /></div>
                  <div>
                    <h4>{isAr ? p.labelAr : p.labelEn}</h4>
                    <p>{isAr ? p.subAr : p.subEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HIRING PROCESS TIMELINE ──────────────────────────────── */}
        <section className="cr-section">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'مراحل التعيين' : 'HIRING PROCESS'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'من التقديم إلى العرض الوظيفي خلال 48 ساعة' : 'Fast-Track 4-Step Hiring Process'}
            </h2>
            <div className="cr-process">
              {PROCESS.map((p) => (
                <div className="cr-process-step" key={p.step}>
                  <div className="cr-process-num">{p.step}</div>
                  <h4>{isAr ? p.titleAr : p.titleEn}</h4>
                  <p>{isAr ? p.descAr : p.descEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── APPLICATION FORM ─────────────────────────────────────── */}
        <section className="cr-section cr-section--alt cr-form-section" id="apply">
          <div className="cr-wrap">
            <div className="cr-section-label">{isAr ? 'نموذج التقديم' : 'APPLICATION FORM'}</div>
            <h2 className="cr-section-title">
              {isAr ? 'ابدأ خطوتك القادمة معنا' : 'Submit Your Application'}
            </h2>

            {/* WhatsApp Fast-Track Banner */}
            <div className="cr-form-card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
              <div className="cr-wa-fasttrack" style={{ marginBottom: 0, border: 'none' }}>
                <div className="cr-wa-fasttrack-text">
                  <strong>{isAr ? '⚡ تفضل التقديم المباشر والسريع؟' : '⚡ Prefer Fast WhatsApp Submission?'}</strong>
                  <span>{isAr ? 'تواصل مع مسؤول التوظيف وأرسل سيرتك الذاتية في ثوانٍ' : 'Chat with our hiring desk and send your CV directly via WhatsApp'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => applyViaWhatsApp()}
                  className="cr-wa-btn-direct"
                >
                  <MessageSquare style={{ width: 16, height: 16 }} />
                  {isAr ? 'محادثة واتساب مباشرة' : 'Direct WhatsApp Chat'}
                </button>
              </div>
            </div>

            <CareerApplicationForm
              key={selectedPosition}
              isAr={isAr}
              defaultRole={selectedPosition}
            />

            {/* Direct HR Contacts */}
            <div className="cr-contact-bar">
              <a href="mailto:careers@sierra-estates.net" className="cr-contact-item">
                <Mail className="cr-contact-icon" /> careers@sierra-estates.net
              </a>
              <a href="https://wa.me/201092048333" target="_blank" rel="noopener noreferrer" className="cr-contact-item">
                <Phone className="cr-contact-icon" /> +2 01092048333 (HR Recruitment Desk)
              </a>
              <span className="cr-contact-item">
                <MapPin className="cr-contact-icon" /> {isAr ? 'التجمع الخامس، القاهرة الجديدة' : 'New Cairo, Egypt'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
