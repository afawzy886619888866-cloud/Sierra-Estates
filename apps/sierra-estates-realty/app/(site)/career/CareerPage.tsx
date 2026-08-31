'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Send, Mail, Phone, Briefcase, Clock, MapPin, ArrowRight,
  Users, Rocket, Heart, Shield, ChevronDown,
  CheckCircle, Star, GraduationCap, Coffee,
  Laptop, Palmtree, Dumbbell, HeartPulse, Sparkles,
  TrendingUp, Award, DollarSign, Building, FileCheck,
  CheckCircle2, MessageSquare, HelpCircle,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SiteShell from '@/components/site/SiteShell';
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
  // ── SALES ROLES ──
  {
    id: 'sales-senior-consultant',
    dept: 'sales',
    deptEn: 'Sales & Advisory',
    deptAr: 'المبيعات والاستشارات',
    titleEn: 'Senior Real Estate Sales Consultant',
    titleAr: 'مستشار مبيعات عقارية أول (Senior Property Advisor)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo & Cairo Plaza Hub',
    locAr: 'التجمع الخامس ومقر كايرو بلازا',
    urgent: true,
    salaryEn: 'Competitive Base + High Uncapped Commission',
    salaryAr: 'راتب أساسي مجزي + عمولات فورية غير محدودة',
    descEn: 'Join our flagship brokerage team managing high-net-worth investors across luxury residential compounds and prime commercial assets including Cairo Plaza.',
    descAr: 'الانضمام لفريق المبيعات الرئيسي لإدارة ومتابعة طلبات كبار المستثمرين والمشترين في المشروعات السكنية الفاخرة والأصول التجارية المميزة مثل كايرو بلازا.',
    responsibilitiesEn: [
      'Manage qualified leads delivered through our AI matching engine',
      'Conduct high-level site tours, client presentations, and negotiations',
      'Maintain strong ongoing relationships with top tier Egyptian developers',
      'Close residential and commercial sale/lease transactions within agreed SLAs',
    ],
    responsibilitiesAr: [
      'متابعة وإدارة العملاء المؤهلين القادمين عبر منصة الذكاء الاصطناعي',
      'تنظيم جلسات المعاينة الميدانية وتقديم العروض الاستثمارية والتفاوض',
      'بناء وتوطيد علاقات العمل المستمرة مع كبرى شركات التطوير العقاري في مصر',
      'إتمام الصفقات العقارية التجارية والسكنية مع تحقيق أهداف المبيعات المحددة',
    ],
    requirementsEn: [
      '2+ years experience in New Cairo or New Capital real estate sales',
      'Proven track record of closing high-ticket deals',
      'Excellent negotiation, communication, and presentation skills in Arabic & English',
      'Valid driving license and personal vehicle',
    ],
    requirementsAr: [
      'خبرة سابقة لا تقل عن سنتين في مبيعات عقارات التجمع الخامس أو العاصمة الإدارية',
      'سجل نجاح مثبت في إتمام الصفقات الكبرى وتحقيق التارجت',
      'مهارات تواصل وتفاوض وإقناع عالية باللغتين العربية والإنجليزية',
      'رخصة قيادة سارية وسيارة خاصة',
    ],
    skills: ['Direct Sales', 'Negotiation', 'Luxury Compounds', 'Commercial Portfolios', 'Client Relations'],
  },
  {
    id: 'sales-team-leader',
    dept: 'sales',
    deptEn: 'Sales & Advisory',
    deptAr: 'المبيعات والاستشارات',
    titleEn: 'Sales Team Leader / Unit Head',
    titleAr: 'قائد فريق مبيعات (Sales Team Leader)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo Office',
    locAr: 'مكتب التجمع الخامس',
    urgent: true,
    salaryEn: 'High Fixed Salary + Team Overriding Commission + Quarterly Bonus',
    salaryAr: 'راتب ثابت ممتاز + عمولات إشرافية على الفريق + بونص ربع سنوي',
    descEn: 'Lead, coach, and drive a dedicated squad of 5-8 property advisors. Supervise client pipelines, assist in high-stakes negotiations, and ensure revenue goals are crushed.',
    descAr: 'قيادة وتدريب وتطوير فريق مبيعات مكون من 5 إلى 8 مستشارين عقاريين، ومتابعة 파يبلاين المبيعات والمساعدة في إغلاق الصفقات الكبرى وتحقيق الأهداف البيعية.',
    responsibilitiesEn: [
      'Coach and mentor junior and senior property advisors daily',
      'Lead high-stakes closing meetings with corporate & family-office buyers',
      'Monitor CRM conversion rates and implement closing strategies',
      'Report weekly forecasts and team performance to Sales Director',
    ],
    responsibilitiesAr: [
      'تدريب وتوجيه مستشاري المبيعات يومياً ومتابعة خطط العمل الفردية',
      'إدارة جلسات الإغلاق الكبرى مع كبار المستثمرين والشركات',
      'متابعة نسب التحويل على الـ CRM ووضع استراتيجيات زيادة المبيعات',
      'تقديم تقارير التوقعات الأسبوعية وأداء الفريق للإدارة العليا',
    ],
    requirementsEn: [
      '4+ years in real estate brokerage with at least 1-2 years in leadership',
      'Demonstrated ability to inspire, manage, and scale a sales team',
      'Deep mastery of the Egyptian real estate market and key developers',
    ],
    requirementsAr: [
      'خبرة 4 سنوات فأكثر في الوساطة العقارية مع سنة على الأقل في موقع قيادي/إشرافي',
      'قدرة مثبتة على تحفيز وقيادة وتطوير فرق المبيعات',
      'معرفة تامة بكافة مشروعات التجمع والعاصمة والساحل وأسعار السوق',
    ],
    skills: ['Team Leadership', 'Deal Closing', 'Pipeline Management', 'Strategy', 'CRM Mastery'],
  },
  {
    id: 'sales-commercial-broker',
    dept: 'sales',
    deptEn: 'Sales & Advisory',
    deptAr: 'المبيعات والاستشارات',
    titleEn: 'Commercial & Retail Brokerage Specialist',
    titleAr: 'أخصائي وساطة تجارية وإدارية (Commercial Specialist)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo / Cairo Plaza Project',
    locAr: 'التجمع الخامس / مشروع كايرو بلازا',
    urgent: false,
    salaryEn: 'High Base + Uncapped Commercial Commissions',
    salaryAr: 'راتب أساسي + عمولات صفقات تجارية استثنائية',
    descEn: 'Focus exclusively on commercial retail storefronts, corporate office towers, clinics, and bank branch leases/sales across prime Cairo corridors.',
    descAr: 'التخصص في تسويق وبيع وتأجير المحلات التجارية، المقرات الإدارية، العيادات الطبية، والفروع البنكية في المشروعات الحيوية مثل كايرو بلازا.',
    responsibilitiesEn: [
      'Originate commercial operator requirements (retail brands, clinics, banks)',
      'Calculate ROI, cap rates, and payback models for commercial investors',
      'Coordinate with commercial property owners and master developers',
    ],
    responsibilitiesAr: [
      'استقطاب متطلبات المشغلين والعلامات التجارية الكبرى والبنوك والعيادات',
      'حساب العوائد الاستثمارية (ROI) والتدفقات النقدية للمستثمرين التجاريين',
      'التنسيق المستمر مع ملاك العقارات التجارية والمطورين',
    ],
    requirementsEn: [
      '2+ years in commercial real estate sales or corporate leasing',
      'Understanding of retail footfall, office floorplates, and commercial tenancy',
    ],
    requirementsAr: [
      'خبرة سنتين فأكثر في مبيعات العقارات التجارية أو التأجير المؤسسي',
      'فهم عميق لحسابات العائد والمساحات الإدارية والتجارية ومطابقة الأنشطة',
    ],
    skills: ['Commercial Real Estate', 'ROI Modeling', 'Retail Leasing', 'Corporate Clients'],
  },
  {
    id: 'sales-telesales',
    dept: 'sales',
    deptEn: 'Sales & Advisory',
    deptAr: 'المبيعات والاستشارات',
    titleEn: 'Real Estate Telesales & Lead Qualifier',
    titleAr: 'أخصائي مبيعات هاتفية وتأهيل عملاء (Real Estate Telesales)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo Office',
    locAr: 'مكتب التجمع الخامس',
    urgent: false,
    salaryEn: 'Fixed Salary + Instant Meeting & Deal Bonus',
    salaryAr: 'راتب ثابت مجزي + حوافز فورية على المعاينات والصفقات',
    descEn: 'Engage incoming prospective property buyers, qualify budget and timeline parameters, and book high-intent meetings for senior consultants.',
    descAr: 'التواصل الفوري مع العملاء المهتمين، تحديد متطلبات وميزانية الشراء، وتنسيق وحجز مواعيد المعاينات لمستشاري المبيعات.',
    responsibilitiesEn: [
      'Promptly call incoming inquiries from digital campaigns and WhatsApp',
      'Qualify buyer requirements, target location, and financing preferences',
      'Schedule confirmed meeting appointments in CRM calendar',
    ],
    responsibilitiesAr: [
      'التواصل السريع مع العملاء الجدد الواردين من الحملات الإعلانية والواتساب',
      'تحديد الميزانية والموقع المطلوب وخطة السداد المناسبة للعميل',
      'تحديد وتأكيد مواعيد المعاينات والاجتماعات على نظام الـ CRM',
    ],
    requirementsEn: [
      '1+ year in real estate telesales or call center outbound',
      'Pleasant phone manner, persuasion skills, and resilience',
      'Fluent Arabic with good English',
    ],
    requirementsAr: [
      'خبرة سنة فأكثر في التلي سيلز العقاري أو خدمة العملاء في القطاع العقاري',
      'لباقة في الحديث، سرعة بديهة، وقدرة ممتازة على الإقناع',
      'إجادة تامة للغة العربية مع لغة إنجليزية جيدة',
    ],
    skills: ['Telesales', 'Lead Qualification', 'Cold Calling', 'Customer Service', 'CRM'],
  },

  // ── ADMIN & OPERATIONS ROLES ──
  {
    id: 'admin-operations-coordinator',
    dept: 'admin',
    deptEn: 'Administration & Operations',
    deptAr: 'الشؤون الإدارية والعمليات',
    titleEn: 'Real Estate Operations & Admin Coordinator',
    titleAr: 'منسق عمليات وإداري عقاري (Operations Coordinator)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo Office',
    locAr: 'مكتب التجمع الخامس',
    urgent: true,
    salaryEn: 'Competitive Monthly Salary + Performance Incentives',
    salaryAr: 'راتب شهري مجزي + حوافز أداء دورية',
    descEn: 'Serve as the operational backbone of our brokerage. Coordinate deals workflow, developer booking forms, client files, and daily office workflows.',
    descAr: 'إدارة وتنسيق كافة العمليات اليومية للشركة، متابعة استمارات الحجز مع المطورين، تنظيم ملفات العملاء والوحدات، ودعم فرق المبيعات والإدارة.',
    responsibilitiesEn: [
      'Coordinate reservation forms and follow up with developer sales desks',
      'Maintain organized physical and digital listing registries and contracts',
      'Assist management with office operations, supply procurement, and scheduling',
      'Handle client paperwork and ensure seamless onboarding',
    ],
    responsibilitiesAr: [
      'تنسيق استمارات الحجز ومتابعة تأكيد الوحدات مع إدارات مبيعات المطورين',
      'أرشفة وتنظيم العقود والملفات والمستندات الورقية والإلكترونية للوحدات',
      'إدارة متطلبات العمل المكتبي اليومية والمستلزمات وجداول العمل',
      'متابعة أوراق العملاء وضمان اكتمال كافة الإجراءات الإدارية بدقة',
    ],
    requirementsEn: [
      '2+ years experience in real estate administrative coordination or office management',
      'High proficiency in Microsoft Office (Excel, Word), Google Workspace, and CRM',
      'Meticulous attention to detail and strong organizational skills',
      'Fluent Arabic and good professional English',
    ],
    requirementsAr: [
      'خبرة سنتين فأكثر في التنسيق الإداري أو إدارة المكاتب في شركات التطوير أو الوساطة العقارية',
      'إجادة تامة لبرامج Microsoft Office (Excel, Word) وGoogle Workspace والـ CRM',
      'دقة عالية في تنظيم البيانات ومتابعة التفاصيل والالتزام بالمواعيد',
      'إجادة تامة للغة العربية مع مستوى جيد جداً باللغة الإنجليزية',
    ],
    skills: ['Operations Management', 'Contract Tracking', 'MS Excel', 'Office Admin', 'Developer Coordination'],
  },
  {
    id: 'admin-crm-data-specialist',
    dept: 'admin',
    deptEn: 'Administration & Operations',
    deptAr: 'الشؤون الإدارية والعمليات',
    titleEn: 'CRM & Property Data Administrator',
    titleAr: 'مسؤول إدخال بيانات وعلاقات عملاء (CRM & Data Admin)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo / Hybrid',
    locAr: 'مكتب التجمع الخامس / هجين',
    urgent: false,
    salaryEn: 'Competitive Salary + Quarterly Performance Bonus',
    salaryAr: 'راتب شهري تنافسي + مكافآت دورية',
    descEn: 'Maintain our central inventory database, distribute leads to sales squads, and audit CRM pipelines to ensure zero lead slippage.',
    descAr: 'إدارة وتحديث قاعدة بيانات الوحدات والمشروعات، توزيع الليدات على مستشاري المبيعات، ومراقبة الـ CRM لضمان عدم إهدار أي فرصة بيعية.',
    responsibilitiesEn: [
      'Input, update, and clean property inventory records and price sheets',
      'Manage lead routing rules and assign incoming inquiries to agents',
      'Generate weekly pipeline health and sales conversion analytics reports',
    ],
    responsibilitiesAr: [
      'إدخال وتحديث بيانات الوحدات والأسعار والمشروعات الجديدة باستمرار',
      'إدارة توزيع الليدات على المستشارين حسب التخصص والمنطقة',
      'استخراج تقارير دورية عن أداء المبيعات ومعدلات الاستجابة والإغلاق',
    ],
    requirementsEn: [
      '1-2 years experience managing CRM systems (HubSpot, Salesforce, Zoho, or proprietary)',
      'High typing speed and advanced Excel/Sheets formula proficiency',
      'Analytical mindset and strong data hygiene ethics',
    ],
    requirementsAr: [
      'خبرة سنة إلى سنتين في إدارة أنظمة الـ CRM وإدخال البيانات العقارية',
      'إجادة متقدمة لـ Excel وقواعد البيانات وسرعة ودقة إدخال البيانات',
      'دقة والتزام بأعلى معايير سرية وحماية بيانات العملاء',
    ],
    skills: ['CRM Administration', 'Data Entry', 'Lead Routing', 'Excel Formulas', 'Reporting'],
  },
  {
    id: 'admin-executive-assistant',
    dept: 'admin',
    deptEn: 'Administration & Operations',
    deptAr: 'الشؤون الإدارية والعمليات',
    titleEn: 'Executive Assistant & Office Manager',
    titleAr: 'مدير مكتب ومساعد تنفيذي (Executive Assistant)',
    typeEn: 'Full-time',
    typeAr: 'دوام كامل',
    locEn: 'New Cairo Headquarters',
    locAr: 'المقر الرئيسي بالتجمع الخامس',
    urgent: false,
    salaryEn: 'Attractive Salary + Full Benefits Package',
    salaryAr: 'راتب متميز + حزمة مزايا وتأمينات كاملة',
    descEn: 'Support the Managing Director and Executive Board with calendar coordination, VIP partner reception, board meeting agendas, and executive correspondence.',
    descAr: 'تقديم الدعم التنفيذي الشامل للإدارة العليا، تنظيم جداول المواعيد والاجتماعات، استقبال كبار المطورين والمستثمرين، وإعداد المراسلات الرسمية.',
    responsibilitiesEn: [
      'Manage CEO/MD calendar, appointments, and travel arrangements',
      'Prepare board meeting agendas, take detailed minutes, and track action items',
      'Welcome high-profile VIP guests and institutional partners to our headquarters',
    ],
    responsibilitiesAr: [
      'تنظيم جدول أعمال ومواعيد الإدارة العامة والاجتماعات الخارجية',
      'إعداد جداول أعمال الاجتماعات وتدوين المحاضر ومتابعة تنفيذ القرارات',
      'استقبال كبار الزوار والوفود الاستثمارية والمطورين في المقر الرئيسي',
    ],
    requirementsEn: [
      '3+ years as an Executive Assistant to C-level executives (real estate background preferred)',
      'Polished appearance, executive presence, and discreet confidentiality',
      'Exceptional bilingual written and spoken English and Arabic',
    ],
    requirementsAr: [
      'خبرة لا تقل عن 3 سنوات كمساعد تنفيذي للإدارة العليا (يفضل في القطاع العقاري أو الشركات الكبرى)',
      'مظهر لائق واحترافية عالية وأمانة وسرية تامة',
      'إتقان تام للغتين العربية والإنجليزية تحدثاً وكتابة',
    ],
    skills: ['Executive Support', 'Calendar Management', 'Business Writing', 'VIP Protocol', 'Organization'],
  },
];

const VALUES = [
  {
    icon: DollarSign,
    titleEn: 'Uncapped Earning Potential',
    titleAr: 'دخل وعمولات غير محدودة',
    descEn: 'Industry-leading commission tiers paid promptly with zero caps on your earning capability.',
    descAr: 'أعلى نسب عمولات في السوق العقاري المصري تُصرف بانتظام وبدون حد أقصى لأرباحك.',
  },
  {
    icon: Sparkles,
    titleEn: 'AI-Powered Warm Leads',
    titleAr: 'ليدات حصرية بالذكاء الاصطناعي',
    descEn: 'Stop cold-calling. Our proprietary AVM & matching engine feeds you pre-qualified high intent buyers.',
    descAr: 'وداعاً للاتصالات العشوائية. نظامنا الذكي يوفر لك يومياً عملاء جادين جاهزين للتعاقد.',
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
    titleEn: 'Prime Project Mandates',
    titleAr: 'مشروعات حصرية ومحافظ مميزة',
    descEn: 'Exclusive marketing mandates on premier commercial assets like Cairo Plaza and top compounds.',
    descAr: 'تفويضات تسويق حصرية لأقوى المشروعات التجارية والسكنية مثل كايرو بلازا والتجمع.',
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
  const { isAr, toggleLang } = useSite();
  const containerRef = useRef<HTMLDivElement>(null);

  const [deptFilter, setDeptFilter] = useState<'all' | 'sales' | 'admin'>('all');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>('sales-senior-consultant');
  const [isSent, setIsSent] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    experience: '2',
    position: '',
    message: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    // Auto-open WhatsApp with form details as well for instant delivery
    const text = isAr
      ? `طلب توظيف جديد:\nالاسم: ${formData.name}\nالهاتف: ${formData.phone}\nالبريد: ${formData.email}\nالوظيفة: ${formData.position || selectedPosition}\nسنوات الخبرة: ${formData.experience}\nرسالة: ${formData.message}`
      : `New Career Application:\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nPosition: ${formData.position || selectedPosition}\nExperience: ${formData.experience} years\nMessage: ${formData.message}`;
    window.open(`https://wa.me/201092048333?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <SiteShell active={null}>
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
                  {isAr ? 'وظائف المبيعات الشاغرة (4)' : 'View Sales Roles (4)'} →
                </button>
              </div>

              {/* Admin & Operations Track */}
              <div className="cr-spotlight-card">
                <span className="cr-spotlight-tag" style={{ background: 'rgba(0, 174, 255, 0.12)', color: '#00aeff' }}>
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
                  style={{ background: 'linear-gradient(135deg, #00aeff, #0077b6)', color: '#fff' }}
                >
                  {isAr ? 'وظائف الإدارة الشاغرة (3)' : 'View Admin Roles (3)'} →
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

            {/* Department Filter Tabs */}
            <div className="cr-dept-filters" role="tablist" aria-label={isAr ? 'أقسام الوظائف' : 'Department filters'}>
              {[
                { id: 'all', labelEn: 'All Openings', labelAr: 'جميع الوظائف الشاغرة' },
                { id: 'sales', labelEn: 'Sales & Advisory (4)', labelAr: 'المبيعات والاستشارات (4)' },
                { id: 'admin', labelEn: 'Admin & Operations (3)', labelAr: 'الشؤون الإدارية والعمليات (3)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={deptFilter === tab.id}
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
                              setSelectedPosition(isAr ? j.titleAr : j.titleEn);
                              setFormData((prev) => ({ ...prev, position: isAr ? j.titleAr : j.titleEn }));
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

            <div className="cr-form-card">
              {/* WhatsApp Fast-Track Banner */}
              <div className="cr-wa-fasttrack">
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

              <form onSubmit={handleSubmit}>
                <div className="cr-form-row">
                  <div className="cr-form-group">
                    <label htmlFor="f-name">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                    <input
                      type="text"
                      id="f-name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isAr ? 'مثال: أحمد فوزي' : 'e.g. Ahmed Fawzy'}
                    />
                  </div>
                  <div className="cr-form-group">
                    <label htmlFor="f-phone">{isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}</label>
                    <input
                      type="tel"
                      id="f-phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+2 01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="cr-form-row">
                  <div className="cr-form-group">
                    <label htmlFor="f-email">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <input
                      type="email"
                      id="f-email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="cr-form-group">
                    <label htmlFor="f-position">{isAr ? 'الوظيفة المتقدم لها' : 'Position'}</label>
                    <select
                      id="f-position"
                      required
                      value={formData.position || selectedPosition}
                      onChange={(e) => {
                        setSelectedPosition(e.target.value);
                        setFormData({ ...formData, position: e.target.value });
                      }}
                    >
                      <option value="">{isAr ? 'اختر الوظيفة...' : 'Select a position...'}</option>
                      {JOBS.map((j) => (
                        <option key={j.id} value={isAr ? j.titleAr : j.titleEn}>
                          {isAr ? j.titleAr : j.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="cr-form-group">
                  <label htmlFor="f-experience">{isAr ? 'سنوات الخبرة في العقارات أو المجال' : 'Years of Experience'}</label>
                  <input
                    type="number"
                    id="f-experience"
                    min={0}
                    max={35}
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="2"
                  />
                </div>

                <div className="cr-form-group">
                  <label htmlFor="f-message">{isAr ? 'نبذة عن خبراتك السابقة وأهم إنجازاتك' : 'Brief Bio & Key Achievements'}</label>
                  <textarea
                    id="f-message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={isAr ? 'اذكر أهم الشركات التي عملت بها أو الصفقات التي قمت بإغلاقها...' : 'Mention past companies, key deals closed, or administrative achievements...'}
                  />
                </div>

                <div className="cr-form-group">
                  <label htmlFor="f-cv">{isAr ? 'السيرة الذاتية (CV / Resume)' : 'CV / Resume File'}</label>
                  <input type="file" id="f-cv" accept=".pdf,.doc,.docx" className="cr-file-input" />
                </div>

                <button type="submit" className="cr-submit-btn">
                  <Send style={{ width: 16, height: 16 }} />
                  {isAr ? 'إرسال طلب التوظيف الآن' : 'Submit Application'}
                </button>

                {isSent && (
                  <div className="cr-success-msg">
                    <CheckCircle style={{ width: 20, height: 20 }} />
                    {isAr
                      ? 'تم استلام طلبك بنجاح! سيتواصل معك مسؤول التوظيف خلال 48 ساعة لتحديد موعد المقابلة.'
                      : "Application submitted successfully! Our recruitment team will contact you within 48 hours."}
                  </div>
                )}
              </form>
            </div>

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
