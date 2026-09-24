'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Camera,
  Image as ImageIcon,
  Share2,
  Download,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  Building2,
  MapPin,
  TrendingUp,
  Phone,
  Eye,
  MessageCircle,
  X,
  Maximize2,
  Calendar,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface SitePhoto {
  id: string;
  titleEn: string;
  titleAr: string;
  src: string;
  category: 'exterior' | 'interior' | 'entrance' | 'infrastructure';
  dimensions: string;
  descEn: string;
  descAr: string;
  badge: string;
}

interface CommercialCreative {
  id: string;
  titleEn: string;
  titleAr: string;
  src: string;
  format: '1:1 Square' | '9:16 Story / Reel' | '16:9 Landscape Banner';
  platforms: string[];
  dimensions: string;
  badgeEn: string;
  badgeAr: string;
  descEn: string;
  descAr: string;
  suggestedCaptionAr: string;
  suggestedCaptionEn: string;
}

const SITE_PHOTOS: SitePhoto[] = [
  {
    id: 'sp-portal',
    titleEn: 'Main Street Portal & Entrance · Tower 1',
    titleAr: 'المدخل والبوابة الرئيسية · كايرو بلازا برج ١',
    src: '/cairo-plaza/site-photos/cp-portal-tower1-entrance.jpg',
    category: 'entrance',
    dimensions: '576 × 1024',
    badge: 'REAL EVIDENCE',
    descEn: 'Exterior street staircase, prominent "Cairo Plaza Tower 1" signage, medical centers signage (Elite Scan, Alfa Lab).',
    descAr: 'سلالم المدخل من الشارع، لافتة كايرو بلازا برج ١ الرسمية، ولافتات الكيانات الطبية المعتمدة (معمل ألفا، إيليت سكان).',
  },
  {
    id: 'sp-stairs',
    titleEn: 'Hotel-Grade Marble Entrance & Greenery',
    titleAr: 'مدخل الرخام الفندقي والدرج الداخلي ونباتات الزينة',
    src: '/cairo-plaza/site-photos/cp-interior-marble-stairs.jpg',
    category: 'entrance',
    dimensions: '576 × 1024',
    badge: 'HOTEL-GRADE',
    descEn: 'Natural green marble flooring, decorative wrought-iron security gate, recessed lighting, and lush greenery.',
    descAr: 'أرضيات رخامية فاخرة بنقوش هندسية، بوابة حماية حديدية مزخرفة، إضاءات سبوت لايت، ونباتات زينة تعكس الهيبة.',
  },
  {
    id: 'sp-office',
    titleEn: 'Turnkey Executive Office Suite',
    titleAr: 'مكتب ومقر إداري مفروش بالكامل جاهز للتشغيل',
    src: '/cairo-plaza/site-photos/cp-furnished-executive-office.jpg',
    category: 'interior',
    dimensions: '1024 × 576',
    badge: 'TURNKEY READY',
    descEn: 'Fully furnished corporate office room with executive workstations, ergonomic chairs, porcelain tiles, and motivational wall art.',
    descAr: 'مقر إداري مؤثث بالكامل بمكاتب عمل حديثة، كراسي مريحة، أرضيات بورسلين، وديكور جداري ملهم جاهز للتشغيل الفوري.',
  },
  {
    id: 'sp-corridor',
    titleEn: 'Elevator Hallway & Upper Floors',
    titleAr: 'ممر المصاعد والأدوار الإدارية والتشطيبات الرخامية',
    src: '/cairo-plaza/site-photos/cp-corridor-elevator-hallway.jpg',
    category: 'interior',
    dimensions: '576 × 1024',
    badge: 'ACTIVE FLOORS',
    descEn: 'High-speed elevator lobby, marble wall cladding, granite floor inlays, and directional signage for medical & consulting suites.',
    descAr: 'مدخل المصاعد السريعة، تجاليد رخامية على الحوائط، أرضيات جرانيتية، ولافتات إرشادية للعيادات والشركات.',
  },
  {
    id: 'sp-banque-misr',
    titleEn: 'Street Frontage · Banque Misr Branch Anchor',
    titleAr: 'الواجهة الرئيسية والكيان المصرفي · فرع بنك مصر',
    src: '/cairo-plaza/site-photos/cp-exterior-banque-misr-frontage.png',
    category: 'exterior',
    dimensions: '1920 × 1440',
    badge: 'BANK ANCHOR',
    descEn: 'Wide street view of the commercial tower base with flagship operational Banque Misr branch and 24/7 ATM concourse.',
    descAr: 'لقطة شاملة لواجهة البرج التجارية المباشرة مع فرع بنك مصر المتكامل وماكينات الصراف الآلي الحية.',
  },
  {
    id: 'sp-tower-metro',
    titleEn: 'Tower Elevation · Al-Mataria Metro Frontage',
    titleAr: 'إطلالة البرج أمام محطة مترو المطرية مباشرة',
    src: '/cairo-plaza/site-photos/cp-tower-metro-elevation.png',
    category: 'exterior',
    dimensions: '1080 × 1920',
    badge: 'TRANSIT-ORIENTED',
    descEn: 'Vertical tower perspective taken from the metro station overpass, highlighting prime visibility and unmatched footfall.',
    descAr: 'زاوية رأسية تبرز واجهة البرج الشاهقة من جسر محطة المترو، مؤكدة على أعلى ترافيك بشري يومي.',
  },
];

const COMMERCIAL_CREATIVES: CommercialCreative[] = [
  {
    id: 'cc-dual',
    titleEn: 'Dual Commercial Showcase · Own or Lease',
    titleAr: 'امتلك أو استأجر مقرك التجاري في كايرو بلازا',
    src: '/cairo-plaza/social/cairo-plaza-commercial-dual.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Post', 'Facebook Ad', 'WhatsApp Broadcast'],
    dimensions: '1024 × 1024',
    badgeEn: 'DUAL SHOWCASE',
    badgeAr: 'عرض ثنائي',
    descEn: 'Combines external building frontage with furnished interior office. Highlights immediate handover with zero finishing delays.',
    descAr: 'تصميم يجمع بين الواجهة الخارجية للبرج ومكتب تنفيذي مجهز بالكامل، مع التركيز على الاستلام الفوري بدون فترات تشطيب.',
    suggestedCaptionAr: `🏢 فرصة تجارية واستثمارية نادرة في كايرو بلازا!
امتلك أو استأجر مقرك التجاري أو الإداري فوراً بدون مصاريف تشطيب:
✅ بجوار محطة المترو مباشرة — ترافيك بشري هائل لعملائك
✅ خدمات أمن، حراسة، كاميرات مراقبة، وبوابات أمان
✅ معاينة حية يومياً واستلام فوري على المفتاح

📲 للتفاصيل والمعاينة الفورية: 01092048333
🌐 https://sierra-estates.net/ar/cairo-plaza`,
    suggestedCaptionEn: `🏢 Premium Commercial Opportunity at Cairo Plaza!
Own or lease your flagship commercial or administrative space with zero fit-out downtime:
✅ Directly opposite the Metro Station — unmatched daily customer footfall
✅ 24/7 Security, surveillance, and hotel-grade concierge
✅ Live daily viewings & immediate turnkey delivery

📲 Inquiries & Viewings: +201092048333
🌐 https://sierra-estates.net/cairo-plaza`,
  },
  {
    id: 'cc-collage',
    titleEn: '4-Photo Verified Evidence Collage',
    titleAr: 'فرصتك التجارية الكبرى في قلب المطرية · ٤ صور حية',
    src: '/cairo-plaza/social/cairo-plaza-commercial-collage.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Post', 'Facebook Feed', 'LinkedIn Carousel'],
    dimensions: '1024 × 1024',
    badgeEn: '4-PHOTO COLLAGE',
    badgeAr: 'كولاج ٤ صور',
    descEn: 'Comprehensive 4-image collage showcasing exterior facade, marble entrance, furnished office, and elevator corridors.',
    descAr: 'كولاج شامل من 4 زوايا يوضح الواجهة والمدخل الرخامي والمكتب المجهز والممرات، مع التركيز على التسهيلات الحصرية.',
    suggestedCaptionAr: `🚀 مشروع كايرو بلازا التجاري المتكامل — قلب المطرية
موقع استراتيجي حيوي أمام محطة المترو مباشرة!
🔹 مساحات تجارية وإدارية بمقاسات تناسب نشاطك
🔹 تشطيب راقي، مداخل فندقية، ومصاعد سريعة
🔹 تسهيلات سداد مرنة واستلام فوري

📞 تواصل مع مستشار سييرا: 01092048333
🔗 https://sierra-estates.net/ar/cairo-plaza`,
    suggestedCaptionEn: `🚀 Cairo Plaza Integrated Commercial Edifice — Central Cairo
Prime strategic location right by the Metro Station!
🔹 Tailored commercial, retail, and medical suites
🔹 Hotel-grade lobbies, rapid elevators, and ready utilities
🔹 Flexible payment terms & immediate occupancy

📞 Contact Sierra Advisor: +201092048333
🔗 https://sierra-estates.net/cairo-plaza`,
  },
  {
    id: 'cc-high-roi',
    titleEn: 'High-Yield Commercial Arbitrage & ROI',
    titleAr: 'استثمارك الأذكى في قلب الشريان التجاري · عائد مضمون',
    src: '/cairo-plaza/social/cairo-plaza-commercial-high-roi.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Post', 'Facebook Ad', 'Investor WhatsApp'],
    dimensions: '1024 × 1024',
    badgeEn: 'HIGH ROI PLAY',
    badgeAr: 'أعلى عائد سنوي',
    descEn: 'Investor-focused poster emphasizing guaranteed annual rental yields, metro footfall, and turnkey institutional lease contracts.',
    descAr: 'إعلان موجه للمستثمرين يركز على العائد الإيجاري المضمون، الترافيك المرتفع، وعقود الإيجار الموثقة للشركات والبنوك.',
    suggestedCaptionAr: `💰 العقار التجاري الأضمن عائداً في القاهرة!
استثمر في محلات ووحدات كايرو بلازا التجارية:
📊 كثافة سكانية هائلة + ترافيك محطة المترو = تدفق عملاء مستمر
🏢 صرح متكامل يجمع بين البنوك والعيادات والمكاتب
🔑 تشغيل فوري وإدارة احترافية للأصول وعقود إيجار موثقة

اطلب دراسة الجدوى الآن:
واتساب مباشر: 01092048333`,
    suggestedCaptionEn: `💰 The Highest Yielding Commercial Asset in Cairo!
Invest in prime retail & commercial units at Cairo Plaza:
📊 Massive demographic density + Metro footfall = perpetual foot traffic
🏢 Multi-tenant hub with banking anchor & medical suites
🔑 Immediate activation, institutional asset management & notarized leases

Request Feasibility Study: WhatsApp +201092048333`,
  },
  {
    id: 'cc-vip',
    titleEn: 'Corporate VIP Landmark Edifice',
    titleAr: 'صرح كايرو بلازا التجاري والإداري · فرصة تجارية VIP',
    src: '/cairo-plaza/social/cairo-plaza-commercial-vip-edifice.png',
    format: '1:1 Square',
    platforms: ['Instagram Feed', 'Facebook Ad', 'Twitter / X'],
    dimensions: '819 × 1024',
    badgeEn: 'VIP LANDMARK',
    badgeAr: 'صرح VIP',
    descEn: 'Gold ribbon edition emphasizing prestige, Mitsubishi elevators, backup generators, and flexible payment arrangements.',
    descAr: 'تصميم الشارة الذهبية الذي يبرز فخامة المشروع ومصاعد ميتسوبيشي والمولدات الكهربائية وتسهيلات السداد.',
    suggestedCaptionAr: `🏆 صرح كايرو بلازا التجاري والإداري — الوجهة الأولى للأعمال
مقر يعكس هيبة ومكانة شركتك أمام العملاء:
✨ مقرات إدارية ومحلات تجارية وعيادات طبية متخصصة
✨ مدخل فندقي فاخر ومصاعد ميتسوبيشي ومولدات كهرباء
✨ أنظمة تعاقد مرنة واستلام فوري

احجز معاينتك الخاصة اليوم: 01092048333`,
    suggestedCaptionEn: `🏆 Cairo Plaza Commercial & Admin Landmark — Premier Business Address
Reflect the prestige of your company to clients:
✨ Specialized corporate suites, retail flagships, and medical clinics
✨ Luxury hotel-grade concourse, Mitsubishi elevators, and backup power
✨ Flexible contracts and immediate keys handover

Book Your Private Viewing: +201092048333`,
  },
  {
    id: 'cc-5photos',
    titleEn: '5 Live Photos from the Edifice',
    titleAr: 'فرصتك التجارية والاستثمارية · ٥ صور حية من قلب المبنى',
    src: '/cairo-plaza/social/cairo-plaza-commercial-5photos-evidence.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Post', 'Facebook Feed', 'WhatsApp Catalog'],
    dimensions: '1024 × 1024',
    badgeEn: '5-PHOTO PROOF',
    badgeAr: '٥ صور حية',
    descEn: 'Proof-first creative grouping 5 verified interior and exterior photographs confirming active handover status.',
    descAr: 'تصميم توثيقي يقدم 5 صور حية للمشروع تؤكد جاهزية المبنى والتشطيبات والمرافق على أرض الواقع.',
    suggestedCaptionAr: `📸 5 صور حية من قلب مشروع كايرو بلازا!
محلات ومكاتب وعيادات طبية جاهزة للتشغيل الفوري في المطرية:
🔹 مساحات مرنة تناسب البنوك والشركات والمحلات
🔹 مدخل فندقي فخم، مصاعد سريعة، تشطيبات رخام طبيعي
🔹 استلام فوري للمفتاح وتسهيلات في السداد

احجز موعد معاينتك الحية اليوم: 01092048333`,
    suggestedCaptionEn: `📸 5 Live Photographs from inside Cairo Plaza!
Turnkey retail shops, corporate offices, and medical clinics ready for immediate launch:
🔹 Scalable areas fitting corporate headquarters, retail brands, and clinics
🔹 Hotel-grade lobby, rapid elevators, natural marble inlays
🔹 Instant handover with flexible payment structures

Book your on-site walkthrough today: +201092048333`,
  },
  {
    id: 'cc-turnkey',
    titleEn: 'Turnkey Luxury Administrative Suite',
    titleAr: 'مقرك الإداري الفاخر.. جاهز فورا للتشغيل ووفر تكاليف التشطيب',
    src: '/cairo-plaza/social/cairo-plaza-commercial-office-turnkey.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Feed', 'Facebook Ad', 'LinkedIn'],
    dimensions: '1024 × 1024',
    badgeEn: 'OFFICE TURNKEY',
    badgeAr: 'مكتب فوري',
    descEn: 'Targeted to law firms, consultants, and companies seeking immediate office spaces with zero setup costs.',
    descAr: 'إعلان موجه للمكاتب الاستشارية والمحامين والشركات التي تبحث عن مقر مجهز دون أي مصاريف أو فترات انتظار.',
    suggestedCaptionAr: `💼 مقرك الإداري الفاخر جاهز فورا للتشغيل في كايرو بلازا!
وفر تكاليف ووقت التشطيب وابدأ عملك اليوم:
⚡ أثاث مكتبي راقي + تكييفات + إنترنت فائق السرعة
⚡ مساحات إدارية ذكية ومستقلة تناسب الشركات والمحامين والاستشاريين
⚡ قاعات اجتماعات، خدمات استقبال، وأفراد أمن 24 ساعة

للمعاينة الفورية والحجز: 01092048333`,
    suggestedCaptionEn: `💼 Turnkey Luxury Office Suite Ready at Cairo Plaza!
Save setup capital and time — start operations today:
⚡ Executive furnishings, climate control, and ultra-high-speed internet
⚡ Smart private suites tailored for consulting firms, legal, and tech agencies
⚡ Meeting rooms, front-desk concierge, and 24/7 building security

Reserve Your Walkthrough: +201092048333`,
  },
  {
    id: 'cc-hero-square',
    titleEn: 'Flagship Commercial Tower Landmark',
    titleAr: 'صرح كايرو بلازا التجاري · الواجهة الرئيسية وعائد استثماري فوري',
    src: '/cairo-plaza/social/cairo-plaza-commercial-square-hero.jpg',
    format: '1:1 Square',
    platforms: ['Instagram Feed', 'Facebook Brand Ad', 'Display Ads'],
    dimensions: '1024 × 1024',
    badgeEn: 'FLAGSHIP COMMERCIAL',
    badgeAr: 'واجهة فاخرة',
    descEn: 'Ultra-luxurious evening rendering of Cairo Plaza transit-oriented commercial landmark with retail promenade and banking concourse.',
    descAr: 'تصميم تجاري إبداعي ليلي يبرز الواجهة الزجاجية الفاخرة للبرج والممشى التجاري ومحطة المترو.',
    suggestedCaptionAr: `🌟 صرح كايرو بلازا — الوجهة التجارية الأرقى
امتلك وحدتك في أميز موقع تجاري متكامل الخدمات أمام محطة المترو مباشرة.
عائد استثماري مضمون وتسليم فوري.

📲 استفسر الآن عبر واتساب: 01092048333`,
    suggestedCaptionEn: `🌟 Cairo Plaza — The Premier Commercial Destination
Secure your unit in Cairo's prime transit-oriented commercial landmark.
Guaranteed high ROI with turnkey handover.

📲 Inquire via WhatsApp: +201092048333`,
  },
  {
    id: 'cc-story-vertical',
    titleEn: 'Mobile Story & Reel · Executive Suites & Retail',
    titleAr: 'بوستر القصة والريلز (9:16) · مقرات إدارية ومحلات تجارية',
    src: '/cairo-plaza/social/cairo-plaza-commercial-story-vertical.jpg',
    format: '9:16 Story / Reel',
    platforms: ['Instagram Story', 'Facebook Reel', 'TikTok', 'WhatsApp Status'],
    dimensions: '1080 × 1920',
    badgeEn: '9:16 STORY / REEL',
    badgeAr: 'قصص وريلز 9:16',
    descEn: 'Vertical format optimized for mobile screens and video reels. Highlights upscale executive office suites and flagship retail shops.',
    descAr: 'تصميم طولي مصمم خصيصاً لقصص إنستغرام وحالات واتساب وريلز، يبرز المكاتب الفاخرة والمحلات ذات الإطلالة البانورامية.',
    suggestedCaptionAr: `📱 شاهد مقرك التجاري والإداري في كايرو بلازا!
📍 أمام محطة المترو مباشرة
🏢 مكاتب إدارية فاخرة ومحلات تجارية
🔑 تسليم فوري وتسهيلات سداد

تواصل معنا الآن عبر واتساب: 01092048333`,
    suggestedCaptionEn: `📱 Discover your commercial & executive space at Cairo Plaza!
📍 Directly opposite the Metro Station
🏢 High-end executive suites & flagship retail shops
🔑 Immediate turnkey delivery & flexible financing

Contact us via WhatsApp: +201092048333`,
  },
  {
    id: 'cc-landscape-banner',
    titleEn: 'Widescreen Banner · Commercial Complex',
    titleAr: 'بانر عريض (16:9) · مجمع كايرو بلازا التجاري والإداري',
    src: '/cairo-plaza/social/cairo-plaza-commercial-landscape-banner.jpg',
    format: '16:9 Landscape Banner',
    platforms: ['Facebook Banner', 'LinkedIn Ad', 'Website Header', 'YouTube Banner'],
    dimensions: '1920 × 1080',
    badgeEn: '16:9 WIDESCREEN',
    badgeAr: 'بانر عريض 16:9',
    descEn: 'Cinematic widescreen landscape visual presenting the complete architectural promenade, retail boulevard, and corporate towers.',
    descAr: 'بانر سينمائي عريض يوضح الممشى التجاري والبوليفارد والمقرات الإدارية الفاخرة في وقت الغروب.',
    suggestedCaptionAr: `🏢 مجمع كايرو بلازا التجاري — وجهتك الاستثمارية الأكثر أماناً ونمواً في القاهرة
محلات تجارية ومقرات شركات بموقع استراتيجي لا يتكرر.
تواصل مع فريق مبيعات سييرا إستيتس: 01092048333`,
    suggestedCaptionEn: `🏢 Cairo Plaza Commercial Complex — Your Safest & Highest Growth Investment in Cairo
Prime retail flagships and corporate headquarters in an irreplaceable transit hub.
Contact Sierra Estates sales desk: +201092048333`,
  },
];

const CAIRO_PLAZA_UNITS = [
  {
    code: 'CP-RET-G01',
    typeEn: 'Retail Ground Flagship',
    typeAr: 'محل تجاري واجهة أرضية',
    floor: 'Ground (G)',
    area: '145 m²',
    price: 'EGP 13,050,000',
    rentVal: 'EGP 95,000 / mo',
    roi: '23.5%',
    status: 'Available',
    features: ['Double-height glass', 'Metro frontage', 'Outdoor seating permit'],
  },
  {
    code: 'CP-ADM-0204',
    typeEn: 'Turnkey Executive Office',
    typeAr: 'مكتب تنفيذي مفروش بالكامل',
    floor: '2nd Floor',
    area: '95 m²',
    price: 'EGP 3,800,000',
    rentVal: 'EGP 32,000 / mo',
    roi: '21.8%',
    status: 'Available',
    features: ['Furnished workstations', 'Private meeting room', 'Central A/C'],
  },
  {
    code: 'CP-MED-0312',
    typeEn: 'Medical Clinic / Lab Suite',
    typeAr: 'عيادة طبية / معمل تحاليل',
    floor: '3rd Floor',
    area: '75 m²',
    price: 'EGP 3,150,000',
    rentVal: 'EGP 28,000 / mo',
    roi: '22.4%',
    status: 'Reserved',
    features: ['Plumbing ready', 'Adjacent to Elite Scan', 'Disabled elevator access'],
  },
  {
    code: 'CP-RET-M02',
    typeEn: 'Mezzanine Commercial Concourse',
    typeAr: 'مقر تجاري ميزانين',
    floor: 'Mezzanine',
    area: '210 m²',
    price: 'EGP 11,500,000',
    rentVal: 'EGP 88,000 / mo',
    roi: '24.1%',
    status: 'Available',
    features: ['Wide storefront', 'Escalator access', 'Loading dock ready'],
  },
  {
    code: 'CP-ADM-0401',
    typeEn: 'Corporate Headquarter Floor',
    typeAr: 'طابق إداري كامل للشركات',
    floor: '4th Floor',
    area: '380 m²',
    price: 'EGP 14,800,000',
    rentVal: 'EGP 125,000 / mo',
    roi: '22.0%',
    status: 'Available',
    features: ['Panoramic glass façade', 'Dedicated restrooms', 'Server room'],
  },
];

export default function CairoPlazaAdminView({
  lang = 'en',
  onNavigate,
}: {
  lang?: string;
  onNavigate?: (tab: string) => void;
}) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'photos' | 'social' | 'campaigns' | 'inventory'>('photos');
  const [filterFormat, setFilterFormat] = useState<'all' | '1:1 Square' | '9:16 Story / Reel' | '16:9 Landscape Banner'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'exterior' | 'interior' | 'entrance'>('all');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<{ src: string; title: string; dimensions?: string } | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredCreatives = COMMERCIAL_CREATIVES.filter((c) => {
    if (filterFormat === 'all') return true;
    return c.format === filterFormat;
  });

  const filteredPhotos = SITE_PHOTOS.filter((p) => {
    if (photoFilter === 'all') return true;
    return p.category === photoFilter;
  });

  return (
    <div className="fade-up" style={{ padding: '0 4px 40px' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 35, 57, 0.95) 0%, rgba(7, 14, 26, 0.98) 100%)',
          border: '1px solid rgba(200, 150, 26, 0.35)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 24px rgba(200, 150, 26, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            [isAr ? 'left' : 'right']: -50,
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 150, 26, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: 'rgba(200, 150, 26, 0.2)',
                  color: 'var(--gold, #C8961A)',
                  border: '1px solid rgba(200, 150, 26, 0.4)',
                }}
              >
                ⚡ {isAr ? 'مركز قيادة مشروع كايرو بلازا' : 'CAIRO PLAZA ASSET & MEDIA HUB'}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              >
                ● {isAr ? 'الموقع حي ومتاح للتشغيل' : 'Live Verified Site'}
              </span>
            </div>

            <h1
              style={{
                fontFamily: isAr ? "'Cairo', sans-serif" : "'Cormorant Garamond', Georgia, serif",
                fontSize: '2rem',
                fontWeight: isAr ? 700 : 600,
                color: '#F0EDE5',
                margin: '0 0 6px',
                lineHeight: 1.2,
              }}
            >
              {isAr ? 'مشروع كايرو بلازا التجاري والإداري' : 'Cairo Plaza Commercial & Administrative Complex'}
            </h1>

            <p style={{ fontSize: 13, color: '#A0AEC0', maxWidth: 640, margin: 0, lineHeight: 1.6 }}>
              {isAr
                ? 'مركز إدارة الأصول والوسائط التسويقية: الصور الحقيقية المعتمدة للمبنى، والتصميمات التجارية المصممة لحملات السوشيال ميديا، ومتابعة الوحدات المتاحة للاستثمار والتشغيل.'
                : 'Central asset management & creative studio: verified real-site photographs, ready-to-dispatch social media commercial campaigns, and live commercial unit inventory.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={isAr ? '/ar/cairo-plaza' : '/cairo-plaza'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 9,
                background: 'linear-gradient(135deg, #C8961A 0%, #E9C176 100%)',
                color: '#071422',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(200, 150, 26, 0.3)',
              }}
            >
              <ExternalLink size={14} />
              {isAr ? 'معاينة الصفحة العامة' : 'Open Public Site'}
            </a>

            {onNavigate && (
              <button
                onClick={() => onNavigate('listings')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 9,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F0EDE5',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Building2 size={14} />
                {isAr ? 'مركز المخزون العام' : 'Inventory OS'}
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: '#A0AEC0', marginBottom: 2 }}>{isAr ? 'الموقع الاستراتيجي' : 'Prime Location'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0EDE5' }}>
              📍 {isAr ? 'أمام محطة مترو المطرية' : 'Al-Mataria Metro Frontage'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#A0AEC0', marginBottom: 2 }}>{isAr ? 'الكيان المصرفي والشركاء' : 'Anchor Tenants'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#C8961A' }}>
              🏦 {isAr ? 'بنك مصر · معمل ألفا · إيليت' : 'Banque Misr · Alfa · Elite'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#A0AEC0', marginBottom: 2 }}>{isAr ? 'العائد الإيجاري السنوي' : 'Avg Annual Rental Yield'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
              📈 {isAr ? '٢٢٪ سنوياً (عائد مضمون)' : '22.0% - 24.1% Annual ROI'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#A0AEC0', marginBottom: 2 }}>{isAr ? 'الصور والمواد التسويقية' : 'Media Assets Ready'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA' }}>
              📸 {SITE_PHOTOS.length} {isAr ? 'صور موقع' : 'Photos'} + {COMMERCIAL_CREATIVES.length} {isAr ? 'إعلانات' : 'Creatives'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--bd, rgba(255, 255, 255, 0.1))',
          paddingBottom: 8,
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('photos')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'photos' ? 'linear-gradient(135deg, rgba(200, 150, 26, 0.25), rgba(200, 150, 26, 0.1))' : 'transparent',
            color: activeTab === 'photos' ? 'var(--gold, #C8961A)' : 'var(--tx-m, #A0AEC0)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: activeTab === 'photos' ? '2px solid var(--gold, #C8961A)' : '2px solid transparent',
          }}
        >
          <Camera size={16} />
          {isAr ? 'صور الموقع الحية المعتمدة' : 'Verified Real-Site Photos'}
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: '#F0EDE5' }}>
            {SITE_PHOTOS.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'social' ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.25), rgba(52, 211, 153, 0.1))' : 'transparent',
            color: activeTab === 'social' ? '#34D399' : 'var(--tx-m, #A0AEC0)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: activeTab === 'social' ? '2px solid #34D399' : '2px solid transparent',
          }}
        >
          <Sparkles size={16} />
          {isAr ? 'تصميمات السوشيال ميديا التجارية' : 'Social Media Commercial Creatives'}
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.2)', color: '#34D399' }}>
            {COMMERCIAL_CREATIVES.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'campaigns' ? 'linear-gradient(135deg, rgba(37, 211, 102, 0.25), rgba(37, 211, 102, 0.1))' : 'transparent',
            color: activeTab === 'campaigns' ? '#25D366' : 'var(--tx-m, #A0AEC0)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: activeTab === 'campaigns' ? '2px solid #25D366' : '2px solid transparent',
          }}
        >
          <MessageCircle size={16} />
          {isAr ? 'حملات واتساب والنصوص الجاهزة' : 'WhatsApp Campaigns & Copy'}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'inventory' ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.25), rgba(96, 165, 250, 0.1))' : 'transparent',
            color: activeTab === 'inventory' ? '#60A5FA' : 'var(--tx-m, #A0AEC0)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderBottom: activeTab === 'inventory' ? '2px solid #60A5FA' : '2px solid transparent',
          }}
        >
          <Building2 size={16} />
          {isAr ? 'جدول الوحدات المتاحة والتسعير' : 'Available Units & Pricing'}
        </button>
      </div>

      {/* ── TAB 1: REAL SITE PHOTOS ────────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'exterior', 'interior', 'entrance'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPhotoFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: photoFilter === cat ? 'var(--gold, #C8961A)' : 'rgba(255, 255, 255, 0.12)',
                    background: photoFilter === cat ? 'rgba(200, 150, 26, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: photoFilter === cat ? 'var(--gold, #C8961A)' : '#A0AEC0',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: photoFilter === cat ? 700 : 500,
                  }}
                >
                  {cat === 'all' && (isAr ? 'جميع الصور الحية' : 'All Photos')}
                  {cat === 'exterior' && (isAr ? 'الواجهة الخارجية وبنك مصر' : 'Exterior & Banque Misr')}
                  {cat === 'interior' && (isAr ? 'المقرات الإدارية والممرات' : 'Interior Suites & Corridors')}
                  {cat === 'entrance' && (isAr ? 'المداخل والسلالم الرخامية' : 'Entrances & Marble Stairs')}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 12, color: '#A0AEC0' }}>
              {isAr ? `عرض ${filteredPhotos.length} صورة موثقة` : `Showing ${filteredPhotos.length} verified photos`}
            </span>
          </div>

          {/* Photos Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
            }}
          >
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  background: 'rgba(16, 35, 57, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(200, 150, 26, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Photo Image container */}
                <div
                  style={{
                    position: 'relative',
                    height: 240,
                    width: '100%',
                    background: '#070B14',
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setActiveLightbox({
                      src: photo.src,
                      title: isAr ? photo.titleAr : photo.titleEn,
                      dimensions: photo.dimensions,
                    })
                  }
                >
                  <Image
                    src={photo.src}
                    alt={isAr ? photo.titleAr : photo.titleEn}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    style={{ objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      [isAr ? 'right' : 'left']: 10,
                      background: 'rgba(7, 14, 26, 0.85)',
                      backdropFilter: 'blur(6px)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--gold, #C8961A)',
                      border: '1px solid rgba(200, 150, 26, 0.3)',
                    }}
                  >
                    {photo.badge}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      [isAr ? 'left' : 'right']: 10,
                      background: 'rgba(7, 14, 26, 0.85)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      color: '#E2E8F0',
                      fontFamily: 'JetBrains Mono, monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Maximize2 size={11} />
                    {photo.dimensions}
                  </div>
                </div>

                {/* Details */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F0EDE5', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {isAr ? photo.titleAr : photo.titleEn}
                  </h3>
                  <p style={{ fontSize: 12, color: '#A0AEC0', margin: '0 0 14px', flex: 1, lineHeight: 1.5 }}>
                    {isAr ? photo.descAr : photo.descEn}
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => handleCopyText(photo.src, photo.id)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: 7,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: copiedItem === photo.id ? '#34D399' : '#F0EDE5',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                      }}
                    >
                      {copiedItem === photo.id ? <Check size={13} /> : <Copy size={13} />}
                      {copiedItem === photo.id ? (isAr ? 'تم نسخ الرابط' : 'Copied!') : (isAr ? 'نسخ المسار' : 'Copy Path')}
                    </button>

                    <button
                      onClick={() => handleDownloadImage(photo.src, `${photo.id}.jpg`)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 7,
                        border: '1px solid rgba(200, 150, 26, 0.3)',
                        background: 'rgba(200, 150, 26, 0.12)',
                        color: 'var(--gold, #C8961A)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title={isAr ? 'تحميل الصورة الأصلية' : 'Download original photo'}
                    >
                      <Download size={13} />
                      {isAr ? 'تحميل' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: SOCIAL MEDIA COMMERCIAL CREATIVES ────────────────────────── */}
      {activeTab === 'social' && (
        <div>
          {/* Format Selector Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all', '1:1 Square', '9:16 Story / Reel', '16:9 Landscape Banner'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFilterFormat(fmt)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: filterFormat === fmt ? '#34D399' : 'rgba(255, 255, 255, 0.12)',
                    background: filterFormat === fmt ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: filterFormat === fmt ? '#34D399' : '#A0AEC0',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: filterFormat === fmt ? 700 : 500,
                  }}
                >
                  {fmt === 'all' && (isAr ? 'جميع التصميمات' : 'All Creatives')}
                  {fmt === '1:1 Square' && (isAr ? 'مربع 1:1 (إنستغرام / فيسبوك)' : '1:1 Square (Feed & Ads)')}
                  {fmt === '9:16 Story / Reel' && (isAr ? 'طولي 9:16 (ستوري وريلز)' : '9:16 Story / Reel')}
                  {fmt === '16:9 Landscape Banner' && (isAr ? 'عريض 16:9 (فيسبوك ولينكد إن)' : '16:9 Landscape Banner')}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 12, color: '#A0AEC0' }}>
              {isAr ? `عرض ${filteredCreatives.length} تصميماً إعلانياً` : `Showing ${filteredCreatives.length} ad creatives`}
            </span>
          </div>

          {/* Creatives Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 20,
            }}
          >
            {filteredCreatives.map((creative) => (
              <div
                key={creative.id}
                style={{
                  background: 'rgba(16, 35, 57, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Image Container */}
                <div
                  style={{
                    position: 'relative',
                    height: creative.format === '9:16 Story / Reel' ? 360 : creative.format === '16:9 Landscape Banner' ? 200 : 280,
                    width: '100%',
                    background: '#070B14',
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setActiveLightbox({
                      src: creative.src,
                      title: isAr ? creative.titleAr : creative.titleEn,
                      dimensions: creative.dimensions,
                    })
                  }
                >
                  <Image
                    src={creative.src}
                    alt={isAr ? creative.titleAr : creative.titleEn}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    style={{ objectFit: 'contain', background: '#050A14' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      [isAr ? 'right' : 'left']: 10,
                      background: 'rgba(7, 14, 26, 0.88)',
                      backdropFilter: 'blur(6px)',
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#34D399',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                    }}
                  >
                    {isAr ? creative.badgeAr : creative.badgeEn}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      [isAr ? 'left' : 'right']: 10,
                      background: 'rgba(7, 14, 26, 0.88)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      color: '#E2E8F0',
                      fontFamily: 'JetBrains Mono, monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Maximize2 size={11} />
                    {creative.format}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {creative.platforms.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: 9.5,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#CBD5E1',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE5', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {isAr ? creative.titleAr : creative.titleEn}
                  </h3>

                  <p style={{ fontSize: 12, color: '#A0AEC0', margin: '0 0 14px', lineHeight: 1.5, flex: 1 }}>
                    {isAr ? creative.descAr : creative.descEn}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => handleCopyText(isAr ? creative.suggestedCaptionAr : creative.suggestedCaptionEn, `${creative.id}-caption`)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: copiedItem === `${creative.id}-caption` ? '#34D399' : '#F0EDE5',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                      }}
                    >
                      {copiedItem === `${creative.id}-caption` ? <Check size={13} /> : <Copy size={13} />}
                      {copiedItem === `${creative.id}-caption` ? (isAr ? 'تم نسخ البوست' : 'Copied!') : (isAr ? 'نسخ نص الإعلان' : 'Copy Post Copy')}
                    </button>

                    <button
                      onClick={() => handleDownloadImage(creative.src, `${creative.id}.jpg`)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        background: 'rgba(52, 211, 153, 0.15)',
                        color: '#34D399',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title={isAr ? 'تحميل التصميم بجودة عالية' : 'Download high-res creative'}
                    >
                      <Download size={13} />
                      {isAr ? 'تحميل' : 'Download'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: CAMPAIGNS & WHATSAPP COPY ──────────────────────────────── */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Card 1: Arabic WhatsApp Campaign */}
          <div
            style={{
              background: 'rgba(16, 35, 57, 0.75)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: 14,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F0EDE5', margin: 0 }}>
                {isAr ? 'رسالة واتساب الرسمية (بالعربية)' : 'Official WhatsApp Campaign (Arabic)'}
              </h3>
            </div>

            <textarea
              readOnly
              rows={9}
              value={`🏢 فرصة تجارية استثنائية في مبنى كايرو بلازا التجاري (أمام محطة مترو المطرية مباشرة)!

هل تبحث عن مقر إداري، عيادة، أو محل تجاري جاهز فوراً للتشغيل؟
✅ موقع استراتيجي حيوي يضمن أعلى ترافيك يومي لنشاطك
✅ مبنى متكامل بفرع بنك مصر ومعامل طبية ومصاعد سريعة
✅ مكاتب مجهزة بالكامل ومساحات تجارية مرنة
✅ استلام فوري على المفتاح وأنظمة سداد وتسهيلات حصرية

📸 شاهد الصور الحية والتفاصيل:
https://sierra-estates.net/ar/cairo-plaza

للحجز والمعاينة الفورية:
سييرا للتسويق العقاري: 01092048333`}
              style={{
                width: '100%',
                background: 'rgba(7, 14, 26, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#E2E8F0',
                fontSize: 12.5,
                lineHeight: 1.6,
                padding: '12px 14px',
                fontFamily: isAr ? "'Cairo', sans-serif" : 'inherit',
                resize: 'none',
                marginBottom: 14,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() =>
                  handleCopyText(
                    `🏢 فرصة تجارية استثنائية في مبنى كايرو بلازا التجاري (أمام محطة مترو المطرية مباشرة)!\n\nهل تبحث عن مقر إداري، عيادة، أو محل تجاري جاهز فوراً للتشغيل؟\n✅ موقع استراتيجي حيوي يضمن أعلى ترافيك يومي لنشاطك\n✅ مبنى متكامل بفرع بنك مصر ومعامل طبية ومصاعد سريعة\n✅ مكاتب مجهزة بالكامل ومساحات تجارية مرنة\n✅ استلام فوري على المفتاح وأنظمة سداد وتسهيلات حصرية\n\n📸 شاهد الصور الحية والتفاصيل:\nhttps://sierra-estates.net/ar/cairo-plaza\n\nللحجز والمعاينة الفورية:\nسييرا للتسويق العقاري: 01092048333`,
                    'wa-ar'
                  )
                }
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: copiedItem === 'wa-ar' ? '#34D399' : '#25D366',
                  color: '#071422',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {copiedItem === 'wa-ar' ? <Check size={14} /> : <Copy size={14} />}
                {copiedItem === 'wa-ar' ? (isAr ? 'تم نسخ النص' : 'Copied!') : (isAr ? 'نسخ النص للحملة' : 'Copy Campaign Text')}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🏢 فرصة تجارية استثنائية في كايرو بلازا (أمام محطة المترو مباشرة)!\nتفاصيل ومساحات: https://sierra-estates.net/ar/cairo-plaza\nللمعاينة: 01092048333`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(37, 211, 102, 0.5)',
                  background: 'rgba(37, 211, 102, 0.1)',
                  color: '#25D366',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Share2 size={14} />
                {isAr ? 'إرسال مباشر' : 'Dispatch WA'}
              </a>
            </div>
          </div>

          {/* Card 2: English Institutional Campaign */}
          <div
            style={{
              background: 'rgba(16, 35, 57, 0.75)',
              border: '1px solid rgba(200, 150, 26, 0.3)',
              borderRadius: 14,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🌐</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F0EDE5', margin: 0 }}>
                {isAr ? 'النص المؤسسي بالإنجليزية (لينكد إن والمستثمرين)' : 'Institutional Campaign (English / LinkedIn)'}
              </h3>
            </div>

            <textarea
              readOnly
              rows={9}
              value={`🏢 Institutional Commercial Opportunity · Cairo Plaza Complex, Cairo

Prime transit-oriented commercial real estate directly opposite Al-Mataria Metro Station:
✅ Ground floor retail flagships anchored by operational Banque Misr branch
✅ Fully turnkey corporate offices, executive suites, and medical clinics
✅ Projected annual rental yield: 22% - 24% with corporate leases
✅ Immediate keys handover & bespoke financing arrangements

📸 Inspect verified site photos & commercial deck:
https://sierra-estates.net/cairo-plaza

Direct mandates & investor briefing:
Sierra Estates Commercial Desk: +20 109 204 8333`}
              style={{
                width: '100%',
                background: 'rgba(7, 14, 26, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#E2E8F0',
                fontSize: 12,
                lineHeight: 1.6,
                padding: '12px 14px',
                fontFamily: 'inherit',
                resize: 'none',
                marginBottom: 14,
              }}
            />

            <button
              onClick={() =>
                handleCopyText(
                  `🏢 Institutional Commercial Opportunity · Cairo Plaza Complex, Cairo\n\nPrime transit-oriented commercial real estate directly opposite Al-Mataria Metro Station:\n✅ Ground floor retail flagships anchored by operational Banque Misr branch\n✅ Fully turnkey corporate offices, executive suites, and medical clinics\n✅ Projected annual rental yield: 22% - 24% with corporate leases\n✅ Immediate keys handover & bespoke financing arrangements\n\n📸 Inspect verified site photos & commercial deck:\nhttps://sierra-estates.net/cairo-plaza\n\nDirect mandates & investor briefing:\nSierra Estates Commercial Desk: +20 109 204 8333`,
                  'wa-en'
                )
              }
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 8,
                border: 'none',
                background: copiedItem === 'wa-en' ? '#34D399' : 'linear-gradient(135deg, #C8961A 0%, #E9C176 100%)',
                color: '#071422',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {copiedItem === 'wa-en' ? <Check size={14} /> : <Copy size={14} />}
              {copiedItem === 'wa-en' ? (isAr ? 'تم نسخ النص' : 'Copied!') : (isAr ? 'نسخ النص الإنجليزي' : 'Copy English Post Copy')}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 4: AVAILABLE UNITS & PRICING ───────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div
          style={{
            background: 'rgba(16, 35, 57, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F0EDE5', margin: '0 0 4px' }}>
                {isAr ? 'الوحدات التجارية والإدارية المتاحة في كايرو بلازا' : 'Cairo Plaza Commercial & Administrative Units'}
              </h3>
              <p style={{ fontSize: 12, color: '#A0AEC0', margin: 0 }}>
                {isAr
                  ? 'أسعار وعوائد استثمارية محدثة مباشرة مع إمكانية ربط الصور الحية لكل وحدة'
                  : 'Live prices, projected cap rates, and direct photo-matching for each unit.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={isAr ? '/ar/cairo-plaza/inventory' : '/cairo-plaza/inventory'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 7,
                  background: 'rgba(200, 150, 26, 0.15)',
                  border: '1px solid rgba(200, 150, 26, 0.35)',
                  color: 'var(--gold, #C8961A)',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} />
                {isAr ? 'عرض جدول الوحدات بالكامل' : 'View Public Inventory'}
              </a>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAr ? 'right' : 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(7, 14, 26, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'كود الوحدة' : 'Unit Code'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'نوع الوحدة' : 'Type'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'الدور' : 'Floor'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'المساحة' : 'Area'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'سعر الشراء' : 'Purchase Price'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'الإيجار الشهري المتوقع' : 'Target Rent'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'العائد السنوي' : 'ROI'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '12px 16px', color: '#A0AEC0', fontWeight: 600 }}>{isAr ? 'إجراء سريع' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {CAIRO_PLAZA_UNITS.map((u, i) => (
                  <tr
                    key={u.code}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold, #C8961A)', fontWeight: 700 }}>
                      {u.code}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#F0EDE5', fontWeight: 600 }}>{isAr ? u.typeAr : u.typeEn}</td>
                    <td style={{ padding: '12px 16px', color: '#CBD5E1' }}>{u.floor}</td>
                    <td style={{ padding: '12px 16px', color: '#CBD5E1' }}>{u.area}</td>
                    <td style={{ padding: '12px 16px', color: '#F0EDE5', fontWeight: 700 }}>{u.price}</td>
                    <td style={{ padding: '12px 16px', color: '#34D399', fontWeight: 600 }}>{u.rentVal}</td>
                    <td style={{ padding: '12px 16px', color: '#34D399', fontWeight: 700 }}>{u.roi}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          background: u.status === 'Available' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: u.status === 'Available' ? '#34D399' : '#F59E0B',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => {
                          const msg = `مرحباً، أود الاستفسار عن وحدة كايرو بلازا ${u.code} (${u.typeAr}) بمساحة ${u.area}.`;
                          window.open(`https://wa.me/201092048333?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(37, 211, 102, 0.4)',
                          background: 'rgba(37, 211, 102, 0.1)',
                          color: '#25D366',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <MessageCircle size={12} />
                        {isAr ? 'واتساب' : 'Inquire'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX MODAL ─────────────────────────────────────────────────── */}
      {activeLightbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setActiveLightbox(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: 900,
              width: '100%',
              background: '#0B132B',
              borderRadius: 16,
              border: '1px solid rgba(200, 150, 26, 0.4)',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE5', margin: 0 }}>
                  {activeLightbox.title}
                </h4>
                {activeLightbox.dimensions && (
                  <span style={{ fontSize: 11, color: '#A0AEC0', fontFamily: 'JetBrains Mono, monospace' }}>
                    {activeLightbox.dimensions}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadImage(activeLightbox.src, 'cairo-plaza-asset.jpg')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(200, 150, 26, 0.4)',
                    background: 'rgba(200, 150, 26, 0.15)',
                    color: 'var(--gold, #C8961A)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Download size={13} />
                  {isAr ? 'تحميل' : 'Download'}
                </button>

                <button
                  onClick={() => setActiveLightbox(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A0AEC0',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              style={{
                position: 'relative',
                height: 'min(70vh, 600px)',
                width: '100%',
                background: '#040812',
              }}
            >
              <Image
                src={activeLightbox.src}
                alt={activeLightbox.title}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
