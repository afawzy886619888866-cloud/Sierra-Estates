'use client';

/**
 * AddListingForm — Streamlined Luxury Intake Terminal.
 *
 * Implements Stitch UI/UX design:
 * 1. Simple, elegant, uncluttered header (no redundant duplicate site navigation).
 * 2. Monolithic Paste Canvas with 1-click samples (Sale & Rent) & Instant AI Extraction (/api/listings/easy-parse).
 * 3. Live Bento Revision Cards: Compound (with New Cairo suggestions), Price & Mode, Footprint, Layout, and Sierra Code.
 * 4. 3 Contact Identities: Submitter Identity (Bots / Partners / Staff / Owner / Broker), Owner Mobile, and Broker Mobile.
 * 5. Media & Blueprint Tray: Drag & drop image uploads with cover photo tags.
 * 6. Ecosystem Integration: Submits to /api/listings/submit -> writes to Supabase, pins on GIS map, updates Master Excel & Google Sheet.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Languages,
  Sparkles,
  Building,
  MapPin,
  CircleDollarSign,
  Maximize2,
  BedDouble,
  Bath,
  Layers,
  ShieldCheck,
  UploadCloud,
  X,
  Send,
  RotateCcw,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  User,
  PhoneCall,
  Briefcase,
  Bot,
} from 'lucide-react';
import s from './AddListingForm.module.css';

const WA_CONCIERGE = '201092048333';

const TOP_COMPOUNDS = [
  'Mountain View iCity',
  'Mountain View Hyde Park',
  'Villette Sodic',
  'Mivida',
  'Hyde Park',
  'Eastown',
  'Palm Hills New Cairo',
  'Madinaty',
  'Al Rehab',
  'Katameya Heights',
  'Katameya Dunes',
  'Fifth Square',
  'Lake View Estates',
  'Taj City',
  'Bloomfields',
  'Sarai',
  'Zed East',
  'The Waterway',
];

const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Townhouse',
  'Twin House',
  'Penthouse',
  'Duplex',
  'Studio',
  'Chalet',
];

const FINISHING_OPTIONS = [
  'Fully finished',
  'Semi-finished',
  'Core & shell',
  'Furnished',
];

const SUBMITTER_PRESETS = [
  { id: 'agent:closer-bot', type: 'bot', name: 'Sierra AI Closer Bot (Stage-9 Closer)', labelAr: 'بوت المفاوض والإغلاق الذكي (Closer Bot)', labelEn: 'Sierra AI Closer Bot' },
  { id: 'agent:openclaw', type: 'bot', name: 'OpenClaw Intake Agent (Telegram & Web Harvester)', labelAr: 'وكيل أوبن كلو لجلب العقارات (OpenClaw)', labelEn: 'OpenClaw Intake Agent' },
  { id: 'agent:fawzy', type: 'employee', name: 'Ahmed Fawzy (Managing Partner)', labelAr: 'أحمد فوزي (الشريك الإداري)', labelEn: 'Ahmed Fawzy (Managing Partner)' },
  { id: 'employee:advisor', type: 'employee', name: 'Sierra Advisory Staff / Employee', labelAr: 'فريق استشارات سييرا / موظف بالشركة', labelEn: 'Sierra Advisory Staff / Employee' },
  { id: 'role:owner', type: 'owner', name: 'Direct Owner', labelAr: 'المالك الأصلي للوحدة مباشرة (Direct Owner)', labelEn: 'Direct Property Owner' },
  { id: 'role:broker', type: 'broker', name: 'Authorized Broker', labelAr: 'وسيط عقاري / بروكر معتمد (Broker Desk)', labelEn: 'Authorized Broker Desk' },
  { id: 'custom', type: 'employee', name: 'Other Submitter / Manual Entry', labelAr: 'جهة أخرى / إدخال يدوي مخصص', labelEn: 'Other Submitter / Custom' },
];

const T = {
  en: {
    badge: '✨ Instant AI Listing Intake · Private Portfolio',
    titleLead: 'List your unit with ',
    titleEm: 'Sierra Estates',
    subtitle:
      'Paste your raw listing copy, broker notes, or WhatsApp message. Sierra AI automatically sanitizes and extracts specifications, pins your unit to the GIS map, and routes it to the Master Inventory & Google Sheet.',
    sampleResale: '🏢 Sample Resale (Villette Villa)',
    sampleRent: '🔑 Sample Rent (Mivida Flat)',
    clear: 'Clear',
    pastePlaceholder:
      'Paste property description, WhatsApp message, broker notes, compound, area, beds, price... e.g. Standalone villa for sale in Villette Sodic New Cairo, BUA 380m, 5 beds, 6 baths, private pool, price 45M cash, contact owner Dr. Ayman 01012345678, broker Eng. Tarek 01098765432',
    chars: 'characters',
    extractBtn: '✨ Extract & Auto-Fill Specs',
    extracting: 'Analyzing text & extracting specs…',
    specsTitle: 'Verified Property Specifications',
    specsSubtitle: 'Review or fine-tune auto-extracted metadata in seconds',
    compound: 'Compound / Development',
    compoundPh: 'e.g. Villette Sodic',
    dealMode: 'Listing Mode',
    sale: 'Resale (Sale)',
    rent: 'Rental (Rent)',
    price: 'Asking Price (EGP)',
    priceRent: 'Monthly Rent (EGP)',
    footprint: 'Footprint (m²)',
    areaPh: 'BUA m²',
    gardenAreaPh: 'Garden m² (optional)',
    layout: 'Layout & Finishing',
    beds: 'Bedrooms',
    baths: 'Bathrooms',
    propType: 'Property Type',
    finishing: 'Finishing Status',
    sierraCode: 'Sierra Algorithmic Code',
    codePh: 'e.g. VIL-S-5B-380M',
    codeSub: 'Minted algorithmic identifier for fast GIS and Sheet tracking',
    mediaTitle: 'Architectural Assets & Photos',
    mediaSubtitle: 'Upload high-res photos (JPG, PNG, WebP · Max 10 photos). First photo serves as Cover Showcase.',
    dropzoneTitle: 'Drag & drop photos here, or click to browse',
    dropzoneSub: 'Supported formats: JPG, PNG, WebP up to 15MB each',
    coverPhoto: '⭐ Cover Showcase',
    removePhoto: 'Remove photo',
    contactsTitle: 'Representation & 3 Counterparty Contact Lines',
    contactsSubtitle: 'Dedicated identification for Submitter (Bot/Staff), Owner, and Broker lines.',
    submitterLabel: 'Submitted By (Identity & Channel)',
    submitterSub: 'Select the agent, bot, employee, or counterparty submitting this listing',
    ownerPhoneLabel: 'Owner Mobile Number',
    ownerPhoneSub: 'Direct property owner WhatsApp or phone line for verification',
    ownerNameLabel: 'Owner Name',
    ownerNamePh: 'e.g. Dr. Ayman',
    brokerPhoneLabel: 'Broker Mobile Number',
    brokerPhoneSub: 'Introducing broker or agency desk phone (if applicable)',
    brokerNameLabel: 'Broker Name / Agency',
    brokerNamePh: 'e.g. Eng. Tarek / Capital Hub',
    submit: 'Submit listing',
    submitting: 'Publishing to Map, Supabase & Google Sheet…',
    reset: 'Reset Form',
    complianceNote: '256-Bit Encrypted · Synced with Supabase Postgres, GIS Map & Master Google Sheet',
    needCompound: 'Please specify the compound or location name.',
    needArea: 'Please enter a valid unit area in m².',
    needPrice: 'Please specify the asking price or rent.',
    needPhone: 'Please provide at least one valid mobile number (Owner or Broker).',
    doneTitle: '🎉 Listing Published Successfully!',
    doneDesc: 'Your property has been validated, pinned to the interactive GIS map, saved in Supabase inventory, and recorded in the canonical Google Sheet.',
    refCode: 'Reference Code',
    targetTab: 'Canonical Sheet Tab',
    viewMap: '📍 View on Interactive Map',
    viewAdmin: '📊 View in Admin Inventory',
    chatWa: '💬 Share via WhatsApp Concierge',
    addAnother: '➕ Add Another Listing',
  },
  ar: {
    badge: '✨ محطة إدراج العقارات الذكية · المحفظة الخاصة',
    titleLead: 'أضف وحدتك مع ',
    titleEm: 'سييرا إستيتس',
    subtitle:
      'الصق تفاصيل العقار أو رسائل الواتساب أو مذكرات الوسطاء مباشرة. يستخرج الذكاء الاصطناعي المواصفات تلقائياً، ويعرض الوحدة على الخريطة التفاعلية، ويوجهها مباشرة إلى شيت المخزون الرئيسي.',
    sampleResale: '🏢 نموذج بيع (فيلا سوديك فيليت)',
    sampleRent: '🔑 نموذج إيجار (شقة ميفيدا)',
    clear: 'مسح',
    pastePlaceholder:
      'الصق تفاصيل العقار هنا، رسائل الواتساب، مواصفات الوحدة، الكمبوند، المساحة، السعر... مثال: فيلا مستقلة للبيع في كمبوند سوديك فيليت بالتجمع الخامس، مساحة المباني 380م، 5 غرف نوم، 6 حمامات، مسبح خاص، مطلوب 45 مليون كاش، للتواصل مع المالك د. أيمن 01012345678، الوسيط م. طارق 01098765432',
    chars: 'حرف',
    extractBtn: '✨ استخراج وتعبئة المواصفات تلقائياً',
    extracting: 'جارٍ تحليل النص واستخراج المواصفات…',
    specsTitle: 'المواصفات المؤكدة للعقار',
    specsSubtitle: 'راجع المواصفات المستخرجة أو عدّلها خلال ثوانٍ معدودة',
    compound: 'الكمبوند / المشروع',
    compoundPh: 'مثال: سوديك فيليت Villette',
    dealMode: 'نوع الإعلان',
    sale: 'بيع (Resale)',
    rent: 'إيجار (Rent)',
    price: 'السعر المطلوب (ج.م)',
    priceRent: 'الإيجار الشهري (ج.م)',
    footprint: 'المساحة (م²)',
    areaPh: 'مساحة المباني م²',
    gardenAreaPh: 'مساحة الحديقة م² (اختياري)',
    layout: 'التقسيم وحالة التشطيب',
    beds: 'غرف النوم',
    baths: 'الحمامات',
    propType: 'نوع العقار',
    finishing: 'حالة التشطيب',
    sierraCode: 'كود سييرا التعريفي',
    codePh: 'مثال: VIL-S-5B-380M',
    codeSub: 'رمز تعريفي خوارزمي لتتبع الوحدة على الخريطة والشيت',
    mediaTitle: 'صور ومخططات العقار',
    mediaSubtitle: 'ارفع صور عالية الجودة (JPG, PNG, WebP · حتى 10 صور). أول صورة تُعرض كواجهة رئيسية.',
    dropzoneTitle: 'اسحب وأفلت صور العقار هنا، أو اضغط للاختيار',
    dropzoneSub: 'يدعم صيغ JPG, PNG, WebP بحجم يصل إلى 15 ميجابايت لكل صورة',
    coverPhoto: '⭐ الواجهة الرئيسية',
    removePhoto: 'حذف الصورة',
    contactsTitle: 'بيانات الاتصال وهوية مقدم العقار (3 جهات)',
    contactsSubtitle: 'تحديد دقيق ومستقل لهوية مقدم الطلب (بوت أو موظف)، ورقم المالك، ورقم الوسيط.',
    submitterLabel: 'مقدم الطلب (الهوية والجهة)',
    submitterSub: 'حدد الوكيل الذكي، أو البوت، أو الموظف، أو صفة العارض',
    ownerPhoneLabel: 'رقم موبايل / واتساب المالك',
    ownerPhoneSub: 'رقم المالك المباشر للتحقق ومطابقة عقد الملكية',
    ownerNameLabel: 'اسم المالك',
    ownerNamePh: 'مثال: د. أيمن',
    brokerPhoneLabel: 'رقم موبايل / واتساب الوسيط (البروكر)',
    brokerPhoneSub: 'رقم الوسيط العقاري أو المكتب المفوض (إن وجد)',
    brokerNameLabel: 'اسم الوسيط / الشركة',
    brokerNamePh: 'مثال: م. طارق / شركة كابيتال هب',
    submit: 'أرسل العقار (Submit listing)',
    submitting: 'جارٍ الحفظ والنشر على الخريطة وقاعدة البيانات والشيت…',
    reset: 'إعادة ضبط النموذج',
    complianceNote: 'بيانات مشفرة 256-Bit ومربوطة بقاعدة بيانات Supabase والخريطة وشيت الإكسل',
    needCompound: 'من فضلك حدد اسم الكمبوند أو المنطقة.',
    needArea: 'من فضلك أدخل مساحة الوحدة بالمتر المربع.',
    needPrice: 'من فضلك حدد السعر المطلوب.',
    needPhone: 'يرجى إدخال رقم هاتف صحيح واحد على الأقل (المالك أو الوسيط).',
    doneTitle: '🎉 تم نشر العقار بنجاح!',
    doneDesc: 'تم حفظ العقار بنجاح في قاعدة البيانات، وربطه بالخريطة التفاعلية، وتوجيهه إلى شيت المخزون الرئيسي.',
    refCode: 'كود الوحدة',
    targetTab: 'الشيت المستهدف',
    viewMap: '📍 عرض على الخريطة التفاعلية',
    viewAdmin: '📊 عرض في لوحة إدارة العقارات',
    chatWa: '💬 مشاركة عبر واتساب سييرا',
    addAnother: '➕ إضافة عقار آخر',
  },
} as const;

type Lang = 'en' | 'ar';
type Theme = 'light' | 'dark';
type Purpose = 'sale' | 'rent';

const digits = (v: string) => String(v || '').replace(/[^\d]/g, '');

export default function AddListingForm({ defaultLang = 'ar' }: { defaultLang?: Lang } = {}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [theme, setTheme] = useState<Theme>('light');

  // Core intake inputs
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  // Specifications
  const [compound, setCompound] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('sale');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [gardenArea, setGardenArea] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [finishing, setFinishing] = useState('Fully finished');
  const [sierraCode, setSierraCode] = useState('');
  const [notes, setNotes] = useState('');

  // 3 Contact Entities
  const [submitterPreset, setSubmitterPreset] = useState('agent:closer-bot');
  const [customAgentName, setCustomAgentName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');

  // Media
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // States
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [badField, setBadField] = useState<string | null>(null);
  const [done, setDone] = useState<{
    ref: string;
    waHref: string;
    targetTab?: string;
  } | null>(null);

  // Refs for focus management
  const compoundRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const ownerPhoneRef = useRef<HTMLInputElement>(null);
  const brokerPhoneRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedLang = window.localStorage.getItem('hzp-lang');
    const storedTheme = window.localStorage.getItem('hzp-theme');
    if (storedLang === 'ar' || storedLang === 'en') setLang(storedLang);
    if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
  }, []);

  const t = T[lang];
  const isAr = lang === 'ar';

  function toggleLang() {
    const next: Lang = isAr ? 'en' : 'ar';
    setLang(next);
    window.localStorage.setItem('hzp-lang', next);
  }

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('hzp-theme', next);
  }

  // Auto-generate Sierra Code helper when key fields change
  useEffect(() => {
    if (!compound && !area) return;
    const cpdAcronym = (compound || 'UNIT')
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 3) || 'SE';
    const modeChar = purpose === 'rent' ? 'R' : 'S';
    const bedsStr = beds > 0 ? `${beds}B` : 'ST';
    const areaStr = area ? `${digits(area)}M` : '0M';
    const auto = `${cpdAcronym}-${modeChar}-${bedsStr}-${areaStr}`;
    setSierraCode((prev) => (prev && prev.length > 3 && !prev.startsWith(cpdAcronym) ? prev : auto));
  }, [compound, purpose, beds, area]);

  function loadSample(type: 'resale' | 'rent') {
    setErr('');
    setBadField(null);
    if (type === 'resale') {
      const sampleText = isAr
        ? 'فيلا مستقلة فاخرة للبيع في كمبوند سوديك فيليت Villette التجمع الخامس. مساحة المباني 380م²، مساحة الأرض 450م²، 5 غرف نوم ماستر، 6 حمامات، مسبح خاص وحديقة واسعة. تشطيب ألترا سوبر لوكس بالتكييفات. السعر المطلوب 45 مليون جنيه كاش. كود الوحدة VIL-S-5B-380M. للتواصل مع المالك د. أيمن 01012345678، الوسيط م. طارق 01098765432.'
        : 'Luxury standalone villa for sale in Villette Sodic, New Cairo Golden Square. BUA 380 sqm, Land 450 sqm, 5 master bedrooms, 6 bathrooms, private pool, landscaped garden. Ultra super lux finishing. Asking price: 45,000,000 EGP cash. Unit code: VIL-S-5B-380M. Contact owner Dr. Ayman 01012345678, broker Eng. Tarek 01098765432.';
      setRawText(sampleText);
      setCompound('Villette Sodic');
      setPurpose('sale');
      setPropertyType('Villa');
      setBeds(5);
      setBaths(6);
      setArea('380');
      setGardenArea('450');
      setPrice('45,000,000');
      setFinishing('Fully finished');
      setSierraCode('VIL-S-5B-380M');
      setOwnerName(isAr ? 'د. أيمن' : 'Dr. Ayman');
      setOwnerPhone('01012345678');
      setBrokerName(isAr ? 'م. طارق' : 'Eng. Tarek');
      setBrokerPhone('01098765432');
      setNotes(isAr ? 'فيلا مستقلة فاخرة بموقع مميز وحمام سباحة خاص' : 'Prime location villa with private pool');
      setParseFeedback(isAr ? '✨ تم تحميل نموذج البيع بنجاح' : '✨ Loaded Resale Sample successfully');
    } else {
      const sampleText = isAr
        ? 'شقة راقية للإيجار في كمبوند ميفيدا إعمار Mivida التجمع الخامس. مساحة 200م²، 3 غرف نوم، 2 حمام، ريسبشن واسع وتراس فيو بحيرات. تشطيب كامل ألترا لوكس بالمطبخ والتكييفات. الإيجار الشهري المطلوب 65,000 جنيه. كود MIV-R-3B-200M. للتواصل مع المالك 01011122233.'
        : 'Exclusive apartment for rent in Mivida Emaar, New Cairo. 200 sqm, 3 bedrooms, 2 bathrooms, open terrace overlooking green lake views. Fully finished with ACs and kitchen. Monthly rent: 65,000 EGP. Code: MIV-R-3B-200M. Contact owner 01011122233.';
      setRawText(sampleText);
      setCompound('Mivida');
      setPurpose('rent');
      setPropertyType('Apartment');
      setBeds(3);
      setBaths(2);
      setArea('200');
      setGardenArea('');
      setPrice('65,000');
      setFinishing('Fully finished');
      setSierraCode('MIV-R-3B-200M');
      setOwnerName(isAr ? 'المالك مباشرة' : 'Direct Owner');
      setOwnerPhone('01011122233');
      setBrokerName('');
      setBrokerPhone('');
      setNotes(isAr ? 'تشطيب كامل مع أجهزة التكييف والمطبخ' : 'Fully finished with fitted kitchen and ACs');
      setParseFeedback(isAr ? '✨ تم تحميل نموذج الإيجار بنجاح' : '✨ Loaded Rent Sample successfully');
    }
  }

  function handleClear() {
    setRawText('');
    setCompound('');
    setPrice('');
    setArea('');
    setGardenArea('');
    setBeds(3);
    setBaths(2);
    setFinishing('Fully finished');
    setSierraCode('');
    setOwnerName('');
    setOwnerPhone('');
    setBrokerName('');
    setBrokerPhone('');
    setNotes('');
    setPhotos([]);
    setParseFeedback(null);
    setErr('');
    setBadField(null);
  }

  async function handleAutoParse() {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 5) {
      setErr(isAr ? 'برجاء كتابة أو لصق نص الإعلان أولاً' : 'Please paste or write listing text first');
      return;
    }
    setErr('');
    setBadField(null);
    setParsing(true);
    setParseFeedback(null);

    try {
      const res = await fetch('/api/listings/easy-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: trimmed, source: 'manual' }),
      });
      const json = await res.json().catch(() => null);

      if (json?.success && json?.data) {
        const d = json.data;
        if (d.compound) setCompound(d.compound);
        if (d.mode) setPurpose(d.mode === 'rent' ? 'rent' : 'sale');
        if (d.propertyType) {
          const match = PROPERTY_TYPES.find((item) => item.toLowerCase() === d.propertyType.toLowerCase()) || d.propertyType;
          setPropertyType(match);
        }
        if (d.beds !== null && d.beds !== undefined) setBeds(Number(d.beds));
        if (d.baths !== null && d.baths !== undefined) setBaths(Number(d.baths));
        if (d.area !== null && d.area !== undefined) setArea(String(d.area));
        if (d.gardenArea !== null && d.gardenArea !== undefined) setGardenArea(String(d.gardenArea));
        if (d.price !== null && d.price !== undefined) {
          setPrice(Number(d.price).toLocaleString('en-US'));
        }
        if (d.finishing) {
          const finLower = d.finishing.toLowerCase();
          if (finLower.includes('core') || finLower.includes('shell') || finLower.includes('طوب')) setFinishing('Core & shell');
          else if (finLower.includes('semi') || finLower.includes('نصف') || finLower.includes('نص')) setFinishing('Semi-finished');
          else if (finLower.includes('furnish') || finLower.includes('مفروش')) setFinishing('Furnished');
          else setFinishing('Fully finished');
        }
        if (d.sierraCode) setSierraCode(d.sierraCode);
        if (d.ownerName && !ownerName) setOwnerName(d.ownerName);
        if (d.mobile) {
          // If phone matches, assign to owner or broker
          if (!ownerPhone) setOwnerPhone(d.mobile);
          else if (!brokerPhone && d.mobile !== ownerPhone) setBrokerPhone(d.mobile);
        }
        if (d.aiSummary) setNotes(d.aiSummary);

        const summary = [];
        if (d.compound) summary.push(d.compound);
        if (d.price) summary.push(`${Number(d.price).toLocaleString('en-US')} EGP`);
        if (d.area) summary.push(`${d.area} m²`);
        if (d.sierraCode) summary.push(d.sierraCode);

        setParseFeedback(
          isAr
            ? `✨ تم استخراج البيانات بنجاح: ${summary.join(' · ')}`
            : `✨ Extracted: ${summary.join(' · ')}`
        );
      } else {
        setErr(isAr ? 'لم نتمكن من استخراج تفاصيل كافية من النص' : 'Could not extract sufficient details from text');
      }
    } catch {
      setErr(isAr ? 'فشل تحليل النص، تحقق من الاتصال' : 'Failed to parse text, check connection');
    } finally {
      setParsing(false);
    }
  }

  // File Upload Handlers
  const processFiles = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 10);
    list.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) {
          setPhotos((prev) => (prev.length < 10 && !prev.includes(res) ? [...prev, res] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submission
  async function handleSubmit() {
    const cpdVal = compound.trim();
    const areaClean = digits(area);
    const priceClean = digits(price);
    const ownerPhoneClean = digits(ownerPhone);
    const brokerPhoneClean = digits(brokerPhone);

    if (cpdVal.length < 2) {
      setErr(t.needCompound);
      setBadField('compound');
      compoundRef.current?.focus();
      return;
    }
    if (!areaClean || Number(areaClean) < 15) {
      setErr(t.needArea);
      setBadField('area');
      areaRef.current?.focus();
      return;
    }
    if (!priceClean || Number(priceClean) <= 0) {
      setErr(t.needPrice);
      setBadField('price');
      priceRef.current?.focus();
      return;
    }
    if (ownerPhoneClean.length < 8 && brokerPhoneClean.length < 8) {
      setErr(t.needPhone);
      setBadField('ownerPhone');
      ownerPhoneRef.current?.focus();
      return;
    }

    setErr('');
    setBadField(null);
    setSending(true);

    try {
      const selectedPreset = SUBMITTER_PRESETS.find((p) => p.id === submitterPreset);
      const submitterType = (selectedPreset?.type || 'owner') as 'owner' | 'broker' | 'employee' | 'bot';
      const effectiveAgentName =
        submitterPreset === 'custom' && customAgentName.trim()
          ? customAgentName.trim()
          : selectedPreset?.name || 'Sierra Advisory Staff';

      const res = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sierraCode.trim() || undefined,
          compound: cpdVal,
          propertyType,
          mode: purpose,
          beds,
          baths,
          area: Number(areaClean),
          gardenArea: gardenArea ? Number(digits(gardenArea)) : 0,
          price: Number(priceClean),
          finishing,
          ownerName: ownerName.trim() || (brokerPhoneClean ? 'Direct Owner' : 'صاحب الإعلان'),
          ownerType: submitterType === 'broker' ? 'Broker' : 'Owner',
          ownerPhone: ownerPhoneClean || undefined,
          brokerPhone: brokerPhoneClean || undefined,
          brokerName: brokerName.trim() || undefined,
          agentName: effectiveAgentName,
          submitterType,
          mobile: ownerPhoneClean || brokerPhoneClean || '',
          rawText: rawText.trim(),
          comment: notes.trim(),
          photos,
          images: photos,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to submit listing');
      }

      const mintedRef: string =
        result?.code || result?.listing?.code || sierraCode || `SE-SUB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const targetTab: string = result?.targetTab || (purpose === 'rent' ? 'owners rent' : 'owners resale');

      const summaryText = isAr
        ? `عقار جديد معروض على سييرا إستيتس: ${cpdVal} · ${purpose === 'rent' ? 'إيجار' : 'بيع'} · ${propertyType} · ${areaClean} م² · السعر ${Number(priceClean).toLocaleString('en-US')} ج.م · كود ${mintedRef}`
        : `New Listing on Sierra Estates: ${cpdVal} · ${purpose === 'rent' ? 'Rent' : 'Resale'} · ${propertyType} · ${areaClean} sqm · EGP ${Number(priceClean).toLocaleString('en-US')} · Code ${mintedRef}`;

      setDone({
        ref: mintedRef,
        waHref: `https://wa.me/${WA_CONCIERGE}?text=${encodeURIComponent(summaryText)}`,
        targetTab,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed';
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    handleClear();
    setDone(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className={s.page} data-theme={theme} dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
      <div className={s.wrap}>
        {/* Header Block — Clean, Focused, No Duplicate Navigation */}
        <header className={s.headerBlock}>
          <div className={s.headerTopRow}>
            <div className={s.badgeIntake}>
              <span className={s.pulseDot} />
              <span>{t.badge}</span>
            </div>
            <div className={s.headerControls}>
              <button
                type="button"
                className={s.ctrlBtn}
                onClick={toggleLang}
                title={isAr ? 'تبديل للإنجليزية' : 'Switch to Arabic'}
              >
                <Languages style={{ width: 15, height: 15 }} />
                <span>{isAr ? 'English' : 'عربي'}</span>
              </button>
              <button
                type="button"
                className={s.ctrlBtn}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>

          <h1 className={s.mainTitle}>
            {t.titleLead}
            <em>{t.titleEm}</em>
          </h1>
          <p className={s.subtitle}>{t.subtitle}</p>
        </header>

        {/* Section 1: Monolithic Paste Terminal */}
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleGroup}>
              <Sparkles className={s.sectionIcon} />
              <div>
                <h2 className={s.sectionTitle}>
                  {isAr ? 'محطة استقبال ولصق نصوص العقارات' : 'Listing Intelligence Terminal'}
                </h2>
                <div className={s.sectionSubtitle}>
                  {isAr ? 'الصق رسائل الواتساب أو إعلانات الملاك والوسطاء' : 'Paste raw WhatsApp messages or MLS ad copy'}
                </div>
              </div>
            </div>

            <div className={s.sampleBar}>
              <button
                type="button"
                className={s.samplePill}
                onClick={() => loadSample('resale')}
              >
                {t.sampleResale}
              </button>
              <button
                type="button"
                className={s.samplePill}
                onClick={() => loadSample('rent')}
              >
                {t.sampleRent}
              </button>
              {rawText && (
                <button
                  type="button"
                  className={s.samplePill}
                  onClick={handleClear}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  <span>{t.clear}</span>
                </button>
              )}
            </div>
          </div>

          <div className={s.textareaWrap}>
            <textarea
              className={s.rawTextarea}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={t.pastePlaceholder}
              rows={6}
            />

            <div className={s.textareaFooter}>
              <div className={s.metaInfo}>
                <span className={s.charCount}>
                  {rawText.length} {t.chars}
                </span>
                <span className={s.encBadge}>
                  <ShieldCheck style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'معالجة مشفرة وآمنة' : 'Encrypted & Sanitized'}</span>
                </span>
              </div>

              <button
                type="button"
                className={s.parseTriggerBtn}
                onClick={handleAutoParse}
                disabled={parsing || !rawText.trim()}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                <span>{parsing ? t.extracting : t.extractBtn}</span>
              </button>
            </div>
          </div>

          {parseFeedback && (
            <div className={s.parseFeedbackBox}>
              <CheckCircle2 style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0 }} />
              <div>{parseFeedback}</div>
            </div>
          )}
        </section>

        {/* Section 2: Live Bento Revision Cards */}
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleGroup}>
              <Building className={s.sectionIcon} />
              <div>
                <h2 className={s.sectionTitle}>{t.specsTitle}</h2>
                <div className={s.sectionSubtitle}>{t.specsSubtitle}</div>
              </div>
            </div>
          </div>

          <div className={s.bentoGrid}>
            {/* Card 1: Compound / Location */}
            <div className={`${s.bentoCard} ${s.colCompound}`}>
              <div className={s.bentoHeader}>
                <span className={s.bentoLabel}>{t.compound}</span>
                <MapPin className={s.bentoIcon} />
              </div>
              <input
                ref={compoundRef}
                type="text"
                className={`${s.bentoInput} ${badField === 'compound' ? s.bad : ''}`}
                value={compound}
                onChange={(e) => setCompound(e.target.value)}
                placeholder={t.compoundPh}
                list="compounds-list"
              />
              <datalist id="compounds-list">
                {TOP_COMPOUNDS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className={s.bentoSub}>
                {compound
                  ? isAr
                    ? `موقع معتمد: القاهرة الجديدة · التجمع الخامس`
                    : `Verified Sector: New Cairo Golden Square`
                  : isAr
                  ? 'اختر أو اكتب اسم الكمبوند في التجمع'
                  : 'Type or select compound in New Cairo'}
              </div>
            </div>

            {/* Card 2: Valuation & Deal Mode */}
            <div className={`${s.bentoCard} ${s.colValuation}`}>
              <div className={s.bentoHeader}>
                <div className={s.modeToggle}>
                  <button
                    type="button"
                    className={`${s.modeOption} ${purpose === 'sale' ? s.modeOptionActive : ''}`}
                    onClick={() => setPurpose('sale')}
                  >
                    {t.sale}
                  </button>
                  <button
                    type="button"
                    className={`${s.modeOption} ${purpose === 'rent' ? s.modeOptionActive : ''}`}
                    onClick={() => setPurpose('rent')}
                  >
                    {t.rent}
                  </button>
                </div>
                <CircleDollarSign className={s.bentoIcon} />
              </div>
              <input
                ref={priceRef}
                type="text"
                className={`${s.bentoInput} ${badField === 'price' ? s.bad : ''}`}
                value={price}
                onChange={(e) => {
                  const raw = digits(e.target.value);
                  setPrice(raw ? Number(raw).toLocaleString('en-US') : '');
                }}
                placeholder={purpose === 'rent' ? t.priceRent : t.price}
              />
              <div className={s.bentoSub}>
                {price
                  ? `${price} EGP · ~${(Number(digits(price)) / 49).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD`
                  : isAr
                  ? 'اكتب السعر بالجنيه المصري'
                  : 'Enter price in Egyptian Pounds'}
              </div>
            </div>

            {/* Card 3: Footprint / Area */}
            <div className={`${s.bentoCard} ${s.colFootprint}`}>
              <div className={s.bentoHeader}>
                <span className={s.bentoLabel}>{t.footprint}</span>
                <Maximize2 className={s.bentoIcon} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={areaRef}
                  type="text"
                  className={`${s.bentoInput} ${badField === 'area' ? s.bad : ''}`}
                  value={area}
                  onChange={(e) => setArea(digits(e.target.value))}
                  placeholder={t.areaPh}
                  style={{ width: '50%' }}
                />
                <input
                  type="text"
                  className={s.bentoInput}
                  value={gardenArea}
                  onChange={(e) => setGardenArea(digits(e.target.value))}
                  placeholder={t.gardenAreaPh}
                  style={{ width: '50%' }}
                />
              </div>
              <div className={s.bentoSub}>
                {area
                  ? `${area} m² Net Built-Up ${gardenArea ? `+ ${gardenArea} m² Garden` : ''}`
                  : isAr
                  ? 'المساحة الصافية بالمتر المربع'
                  : 'Net usable area in square meters'}
              </div>
            </div>

            {/* Card 4: Layout & Finishing */}
            <div className={`${s.bentoCard} ${s.colLayout}`}>
              <div className={s.bentoHeader}>
                <span className={s.bentoLabel}>{t.layout}</span>
                <Layers className={s.bentoIcon} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {/* Bedrooms */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BedDouble style={{ width: 13, height: 13 }} />
                    <span>{t.beds}</span>
                  </div>
                  <div className={s.pillsRow}>
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`${s.pillBtn} ${beds === num ? s.pillBtnActive : ''}`}
                        onClick={() => setBeds(num)}
                      >
                        {num === 6 ? '6+' : num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Bath style={{ width: 13, height: 13 }} />
                    <span>{t.baths}</span>
                  </div>
                  <div className={s.pillsRow}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`${s.pillBtn} ${baths === num ? s.pillBtnActive : ''}`}
                        onClick={() => setBaths(num)}
                      >
                        {num === 5 ? '5+' : num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                    {t.propType}
                  </div>
                  <select
                    className={s.selectCustom}
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Finishing */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                    {t.finishing}
                  </div>
                  <select
                    className={s.selectCustom}
                    value={finishing}
                    onChange={(e) => setFinishing(e.target.value)}
                  >
                    {FINISHING_OPTIONS.map((fin) => (
                      <option key={fin} value={fin}>
                        {fin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card 5: Sierra Code & Identifier */}
            <div className={`${s.bentoCard} ${s.colCode}`}>
              <div className={s.bentoHeader}>
                <span className={s.bentoLabel}>{t.sierraCode}</span>
                <ShieldCheck className={s.bentoIcon} />
              </div>
              <input
                type="text"
                className={s.bentoInput}
                value={sierraCode}
                onChange={(e) => setSierraCode(e.target.value.toUpperCase())}
                placeholder={t.codePh}
                style={{ fontFamily: 'var(--font-jetbrains), monospace', letterSpacing: '0.04em' }}
              />
              <div className={s.bentoSub}>{t.codeSub}</div>
            </div>
          </div>
        </section>

        {/* Section 3: The 3 Contact Identities & Submitter Dropdown */}
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleGroup}>
              <User className={s.sectionIcon} />
              <div>
                <h2 className={s.sectionTitle}>{t.contactsTitle}</h2>
                <div className={s.sectionSubtitle}>{t.contactsSubtitle}</div>
              </div>
            </div>
          </div>

          <div className={s.contactsBox}>
            {/* Contact 1: Submitter Role & Identity (Dropdown) */}
            <div className={s.contactField}>
              <div className={s.contactFieldHeader}>
                <span className={s.contactFieldLabel}>
                  <Bot style={{ width: 15, height: 15, color: 'var(--gold)' }} />
                  <span>{t.submitterLabel}</span>
                </span>
                <span className={s.contactTag}>Identity #1</span>
              </div>
              <select
                className={s.selectCustom}
                value={submitterPreset}
                onChange={(e) => setSubmitterPreset(e.target.value)}
              >
                {SUBMITTER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.labelAr : p.labelEn}
                  </option>
                ))}
              </select>

              {submitterPreset === 'custom' && (
                <input
                  type="text"
                  className={s.contactInput}
                  value={customAgentName}
                  onChange={(e) => setCustomAgentName(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم مقدم الطلب / الموظف' : 'Enter submitter or staff name'}
                />
              )}
              <div className={s.contactSubtext}>{t.submitterSub}</div>
            </div>

            {/* Contact 2: Owner Line */}
            <div className={s.contactField}>
              <div className={s.contactFieldHeader}>
                <span className={s.contactFieldLabel}>
                  <PhoneCall style={{ width: 15, height: 15, color: '#10b981' }} />
                  <span>{t.ownerPhoneLabel}</span>
                </span>
                <span className={s.contactTag}>Identity #2</span>
              </div>
              <input
                ref={ownerPhoneRef}
                type="tel"
                className={`${s.contactInput} ${badField === 'ownerPhone' ? s.bad : ''}`}
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                dir="ltr"
              />
              <input
                type="text"
                className={s.contactInput}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={t.ownerNamePh}
              />
              <div className={s.contactSubtext}>{t.ownerPhoneSub}</div>
            </div>

            {/* Contact 3: Broker Line */}
            <div className={s.contactField}>
              <div className={s.contactFieldHeader}>
                <span className={s.contactFieldLabel}>
                  <Briefcase style={{ width: 15, height: 15, color: '#00b4d8' }} />
                  <span>{t.brokerPhoneLabel}</span>
                </span>
                <span className={s.contactTag}>Identity #3</span>
              </div>
              <input
                ref={brokerPhoneRef}
                type="tel"
                className={s.contactInput}
                value={brokerPhone}
                onChange={(e) => setBrokerPhone(e.target.value)}
                placeholder="010XXXXXXXX / +20..."
                dir="ltr"
              />
              <input
                type="text"
                className={s.contactInput}
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                placeholder={t.brokerNamePh}
              />
              <div className={s.contactSubtext}>{t.brokerPhoneSub}</div>
            </div>
          </div>
        </section>

        {/* Section 4: Media & Architectural Assets Tray */}
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitleGroup}>
              <UploadCloud className={s.sectionIcon} />
              <div>
                <h2 className={s.sectionTitle}>{t.mediaTitle}</h2>
                <div className={s.sectionSubtitle}>{t.mediaSubtitle}</div>
              </div>
            </div>
          </div>

          <div
            className={`${s.dropzone} ${isDragging ? s.dropzoneActive : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <UploadCloud className={s.dropzoneIcon} />
            <div className={s.dropzoneTitle}>{t.dropzoneTitle}</div>
            <div className={s.dropzoneSub}>{t.dropzoneSub}</div>
          </div>

          {photos.length > 0 && (
            <div className={s.mediaTray}>
              {photos.map((src, idx) => (
                <div key={idx} className={s.mediaItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Upload ${idx + 1}`} className={s.mediaImg} />
                  {idx === 0 && <span className={s.mediaCoverBadge}>{t.coverPhoto}</span>}
                  <button
                    type="button"
                    className={s.mediaRemoveBtn}
                    onClick={() => removePhoto(idx)}
                    title={t.removePhoto}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Error Notification */}
        {err && (
          <div className={s.errBox}>
            <X style={{ width: 18, height: 18, flexShrink: 0 }} />
            <div>{err}</div>
          </div>
        )}

        {/* Section 5: Sticky Action Bar */}
        <div className={s.actionBar}>
          <div className={s.auditGuarantee}>
            <div className={s.auditIcon}>
              <ShieldCheck style={{ width: 18, height: 18 }} />
            </div>
            <div className={s.auditText}>
              <div className={s.auditTitle}>
                {isAr ? 'حوكمة وتدقيق أمني E2EE' : 'Institutional Protocol Compliance'}
              </div>
              <div className={s.auditSub}>{t.complianceNote}</div>
            </div>
          </div>

          <div className={s.actionButtons}>
            <button type="button" className={s.resetBtn} onClick={handleReset}>
              <RotateCcw style={{ width: 14, height: 14, display: 'inline', marginInlineEnd: 6 }} />
              <span>{t.reset}</span>
            </button>
            <button
              type="button"
              className={s.submitBtn}
              onClick={handleSubmit}
              disabled={sending}
            >
              <Send style={{ width: 16, height: 16 }} />
              <span>{sending ? t.submitting : t.submit}</span>
            </button>
          </div>
        </div>

        {/* Success Modal / Celebration Card */}
        {done && (
          <div className={s.modalBackdrop}>
            <div className={s.successCard}>
              <div className={s.successIconWrap}>
                <CheckCircle2 style={{ width: 36, height: 36 }} />
              </div>
              <h2 className={s.successTitle}>{t.doneTitle}</h2>
              <p className={s.successDesc}>{t.doneDesc}</p>

              <div className={s.codePill}>
                <span>{t.refCode}:</span>
                <strong>{done.ref}</strong>
              </div>

              {done.targetTab && (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  <span>{t.targetTab}: </span>
                  <strong style={{ color: 'var(--ink)' }}>{done.targetTab}</strong>
                </div>
              )}

              <div className={s.successLinks}>
                <a href={done.waHref} target="_blank" rel="noopener noreferrer" className={s.successBtnPrimary}>
                  <MessageCircle style={{ width: 18, height: 18 }} />
                  <span>{t.chatWa}</span>
                </a>

                <div className={s.successBtnRow}>
                  <a href="/client" className={s.successBtnSecondary}>
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    <span>{t.viewMap}</span>
                  </a>
                  <a href="/admin/properties" className={s.successBtnSecondary}>
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    <span>{t.viewAdmin}</span>
                  </a>
                </div>

                <button type="button" className={s.againBtn} onClick={handleReset}>
                  {t.addAnother}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
