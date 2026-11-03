'use client';

/**
 * AddListingForm — Simplified, High-Velocity Intake for Owners & Brokers.
 *
 * Flow:
 * 1. Simple Paste Area: Paste raw WhatsApp messages, notes, or descriptions.
 * 2. Instant Auto-Fill: Real-time spec extraction (compound, price, beds, area, phone).
 * 3. Quick Revision Card: User can review and adjust any field in seconds.
 * 4. Clear Role Toggle: Direct Owner (routes to owners rent/resale) vs Broker (routes to brokers rent/resale).
 * 5. Simple Photo Upload: Drag & drop or pick pictures with instant previews.
 * 6. One-Click Publish: Saves to Supabase, pins on interactive map, and mirrors to canonical Google Sheet tab.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Moon,
  Sun,
  Languages,
  BadgeCheck,
  Users,
  Percent,
  ArrowRight,
  Check,
  MessageCircle,
  UploadCloud,
  X,
  Sparkles,
  MapPin,
  Building,
  UserCheck,
} from 'lucide-react';
import s from './AddListingForm.module.css';

const WA = '201092048333';

const CPDS = [
  'Mountain View iCity',
  'Mountain View Hyde Park',
  'Uptown Cairo',
  'Mivida',
  'Madinaty',
  'Hyde Park',
  'Eastown',
  'El Shorouk',
  'Palm Hills New Cairo',
  'Villette',
  'Fifth Square',
  'SODIC East',
  'Taj City',
  'Bloomfields',
  'Sarai',
  'Katameya Heights',
  'Al Rehab',
  'Zed East',
  'La Vista City',
];

const TYPES = ['Apartment', 'Villa', 'Townhouse', 'Twin House', 'Penthouse', 'Duplex', 'Studio', 'Chalet'];
const FINISHES = ['Fully finished', 'Semi-finished', 'Core & shell', 'Furnished'];

const TYPES_AR: Record<string, string> = {
  Apartment: 'شقة',
  Villa: 'فيلا',
  Townhouse: 'تاون هاوس',
  'Twin House': 'توين هاوس',
  Penthouse: 'بنتهاوس',
  Duplex: 'دوبلكس',
  Studio: 'استوديو',
  Chalet: 'شاليه',
};

const FIN_AR: Record<string, string> = {
  'Fully finished': 'تشطيب كامل',
  'Semi-finished': 'نصف تشطيب',
  'Core & shell': 'على الطوب',
  Furnished: 'مفروش',
};

const T = {
  en: {
    brandSub: 'AI Real Estate · New Cairo',
    langLabel: 'عربي',
    eyebrow: 'Fast & Simple Listing · For Owners & Brokers',
    titleLead: 'List your unit with ',
    titleEm: 'Sierra Estates',
    lead: 'Paste your listing once. Specs are extracted automatically, published directly to the interactive map, and routed to the proper Google Sheet tab.',
    p1: 'Live on Map Instantly',
    p2: 'Matched with Real Buyers',
    p3: 'Zero Upfront Fees',
    step1: 'Step 1: Paste Your Listing Details',
    step1Desc: 'Paste WhatsApp messages, ads, or property notes in Arabic or English. Our AI extracts specs and generates a strategic Sierra Code.',
    pastePh: 'Paste listing details here... e.g. Apartment for sale in Mivida 200m 3 beds 2 baths fully finished price 14M contact 01012345678',
    parseBtn: '✨ Extract & Auto-Fill Specs',
    parsing: 'Extracting specs & analyzing unit…',
    codeLabel: 'Sierra Code',
    step2: 'Step 2: Review & Revise Specs',
    purpose: 'Listing For',
    sale: 'Resale (Sale)',
    rent: 'Rent',
    cpd: 'Compound',
    type: 'Property Type',
    beds: 'Bedrooms',
    baths: 'Bathrooms',
    area: 'Area (m²)',
    priceSale: 'Asking Price (EGP)',
    priceRent: 'Monthly Rent (EGP)',
    finish: 'Finishing Status',
    notes: 'Additional Details & Highlights',
    step3: 'Step 3: Advertiser Role, Contact & Photos',
    rolePrompt: 'Who are you?',
    owner: 'Direct Owner',
    ownerBadge: 'Routes to Owners Sheet',
    broker: 'Real Estate Broker',
    brokerBadge: 'Routes to Brokers Sheet',
    name: 'Full Name',
    wa: 'WhatsApp / Mobile Number',
    photosTit: 'Property Photos',
    dropPhotos: 'Drop property photos here or click to browse',
    photosSub: 'High-res photos increase inquiry velocity (JPG, PNG, WebP · Max 10 photos)',
    coverTag: 'Cover Photo',
    removePhoto: 'Remove photo',
    submit: 'Submit listing',
    sending: 'Publishing to Map & Sheet…',
    needCpd: 'Please specify the compound or location.',
    needArea: 'Please enter the unit area in m².',
    needPrice: 'Please specify the asking price.',
    needName: 'Please provide your name.',
    needPhone: 'Please provide a valid Egyptian mobile number (01xxxxxxxxx).',
    failed: 'Something went wrong. Please check your connection and try again.',
    doneTit: '🎉 Listing Published Successfully!',
    doneMsg: 'Your property is now live on the interactive map, saved in Supabase inventory, and recorded in the master Google Sheet.',
    ref: 'Reference Code',
    sheetTab: 'Target Sheet Tab',
    viewMap: '📍 View on Interactive Map',
    sendPhotos: '💬 Chat with Concierge on WhatsApp',
    again: '➕ Add Another Listing',
    legal: 'Sierra Estates · Banafseg 2, Villa 402, New Cairo · +2 010 9204 8333',
    phName: 'e.g. Dr. Mohamed',
    phCpd: 'e.g. Mivida',
    phArea: '200',
    phPriceSale: '14,000,000',
    phPriceRent: '65,000',
    phNotes: 'Floor, view, delivery status, payment plan, viewing availability…',
  },
  ar: {
    brandSub: 'عقارات بالذكاء الاصطناعي · القاهرة الجديدة',
    langLabel: 'EN',
    eyebrow: 'إضافة سريعة وسهلة · للملاك والوسطاء',
    titleLead: 'أضف وحدتك مع ',
    titleEm: 'سييرا إستيتس',
    lead: 'الصق تفاصيل وحدتك مرة واحدة. يستخرج النظام المواصفات تلقائياً، ويعرضها مباشرة على الخريطة التفاعلية، ويوجهها للشيت المخصص.',
    p1: 'عرض فوري على الخريطة',
    p2: 'مطابقة مع مشترين جاهزين',
    p3: 'بدون أي رسوم مسبقة',
    step1: 'الخطوة 1: الصق تفاصيل أو إعلان وحدتك هنا',
    step1Desc: 'الصق رسائل الواتساب أو تفاصيل العقار بالعربية أو الإنجليزية. يستخرج النظام المساحة والسعر والكمبوند والغرف تلقائياً.',
    pastePh: 'الصق تفاصيل العقار هنا... مثال: شقة للبيع في ميفيدا 200م 3 غرف 2 حمام تشطيب كامل مطلوب 14 مليون كود MV-14M للتواصل 01012345678',
    parseBtn: '✨ استخراج وتعبئة البيانات تلقائياً',
    parsing: 'جارٍ تحليل النص واستخراج المواصفات…',
    codeLabel: 'كود الوحدة',
    step2: 'الخطوة 2: مراجعة وتأكيد بيانات العقار',
    purpose: 'نوع الإعلان',
    sale: 'بيع',
    rent: 'إيجار',
    cpd: 'الكمبوند',
    type: 'نوع العقار',
    beds: 'غرف النوم',
    baths: 'الحمامات',
    area: 'المساحة (م²)',
    priceSale: 'السعر المطلوب (ج.م)',
    priceRent: 'الإيجار الشهري (ج.م)',
    finish: 'حالة التشطيب',
    notes: 'ملاحظات وتفاصيل إضافية',
    step3: 'الخطوة 3: بيانات المعلن والصور',
    rolePrompt: 'أنت المعلن بصفتك؟',
    owner: 'أنا المالك مباشرة',
    ownerBadge: 'يُحفظ في شيت الملاك (Owners Tab)',
    broker: 'أنا وسيط عقاري / بروكر',
    brokerBadge: 'يُحفظ في شيت الوسطاء (Brokers Tab)',
    name: 'الاسم بالكامل',
    wa: 'رقم الموبايل / واتساب',
    photosTit: 'صور العقار',
    dropPhotos: 'اسحب وأفلت صور العقار هنا أو اضغط للاختيار',
    photosSub: 'الصور عالية الجودة تزيد من سرعة التواصل بمعدل 3.4x (JPG, PNG, WebP · حتى 10 صور)',
    coverTag: 'الصورة الرئيسية',
    removePhoto: 'حذف الصورة',
    submit: 'أرسل العقار',
    sending: 'جارٍ الحفظ والنشر على الخريطة والشيت…',
    needCpd: 'من فضلك حدد الكمبوند أو المنطقة.',
    needArea: 'اكتب مساحة الوحدة بالمتر المربع.',
    needPrice: 'اكتب السعر المطلوب بالجنيه المصري.',
    needName: 'من فضلك اكتب اسمك.',
    needPhone: 'اكتب رقم موبايل صحيح (01xxxxxxxxx).',
    failed: 'حدث خطأ، برجاء المحاولة مرة أخرى.',
    doneTit: '🎉 تم نشر وحدتك بنجاح!',
    doneMsg: 'تم حفظ العقار بنجاح، وربطه بالخريطة التفاعلية، وتوجيهه إلى الشيت المخصص.',
    ref: 'كود الوحدة',
    sheetTab: 'الشيت المسجل فيه',
    viewMap: '📍 عرض على الخريطة التفاعلية',
    sendPhotos: '💬 محادثة فريق سييرا على واتساب',
    again: '➕ إضافة وحدة أخرى',
    legal: 'سييرا إستيتس · البنفسج 2، فيلا 402، القاهرة الجديدة · 01092048333',
    phName: 'مثال: د. محمد',
    phCpd: 'مثال: ميفيدا',
    phArea: '200',
    phPriceSale: '14,000,000',
    phPriceRent: '65,000',
    phNotes: 'الدور، الفيو، موعد التسليم، خطة السداد، مواعيد المعاينة…',
  },
} as const;

type Lang = 'en' | 'ar';
type Theme = 'light' | 'dark';
type Purpose = 'sale' | 'rent';
type Role = 'owner' | 'broker';

const digits = (v: string) => String(v || '').replace(/[^\d]/g, '');

export default function AddListingForm({ defaultLang = 'ar' }: { defaultLang?: Lang } = {}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [theme, setTheme] = useState<Theme>('dark');

  const [purpose, setPurpose] = useState<Purpose>('sale');
  const [role, setRole] = useState<Role>('owner');
  const [beds, setBeds] = useState(3);
  const [cpd, setCpd] = useState('');
  const [ptype, setPtype] = useState('Apartment');
  const [baths, setBaths] = useState('2');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [finish, setFinish] = useState('Fully finished');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [badField, setBadField] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{
    ref: string;
    waHref: string;
    targetTab?: string;
  } | null>(null);

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  const cpdRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedLang = window.localStorage.getItem('hzp-lang');
    const storedTheme = window.localStorage.getItem('hzp-theme');
    if (storedLang === 'ar' || storedLang === 'en') setLang(storedLang);
    if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
  }, []);

  const t = T[lang];
  const isAr = lang === 'ar';

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('hzp-theme', next);
  }

  function toggleLang() {
    const next: Lang = isAr ? 'en' : 'ar';
    setLang(next);
    window.localStorage.setItem('hzp-lang', next);
  }

  function clearErr() {
    setErr('');
    setBadField(null);
  }

  function fail(field: string, msg: string, ref: React.RefObject<HTMLInputElement | null>) {
    setErr(msg);
    setBadField(field);
    ref.current?.focus();
    return false;
  }

  async function onAutoParse() {
    if (!rawText.trim() || rawText.trim().length < 5) {
      setErr(isAr ? 'برجاء لصق نص الإعلان أولاً' : 'Please paste listing text first');
      return;
    }
    clearErr();
    setParsing(true);
    setParseFeedback(null);
    try {
      const res = await fetch('/api/listings/easy-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawText.trim(), source: 'manual' }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json?.data) {
        const d = json.data;
        if (d.compound) setCpd(d.compound);
        if (d.propertyType) {
          const match = TYPES.find((item) => item.toLowerCase() === d.propertyType.toLowerCase()) || d.propertyType;
          setPtype(match);
        }
        if (d.mode) setPurpose(d.mode === 'rent' ? 'rent' : 'sale');
        if (d.beds !== null && d.beds !== undefined) setBeds(Number(d.beds));
        if (d.baths !== null && d.baths !== undefined) setBaths(String(d.baths));
        if (d.area !== null && d.area !== undefined) setArea(String(d.area));
        if (d.price !== null && d.price !== undefined) setPrice(Number(d.price).toLocaleString('en-US'));
        if (d.finishing) {
          const finLower = d.finishing.toLowerCase();
          if (finLower.includes('core') || finLower.includes('shell') || finLower.includes('طوب')) setFinish('Core & shell');
          else if (finLower.includes('semi') || finLower.includes('نصف') || finLower.includes('نص')) setFinish('Semi-finished');
          else if (finLower.includes('furnish') || finLower.includes('مفروش')) setFinish('Furnished');
          else setFinish('Fully finished');
        }
        if (d.mobile) setPhone(d.mobile);
        if (d.ownerName) setName(d.ownerName);
        if (d.sierraCode) setGeneratedCode(d.sierraCode);
        if (d.aiSummary) setNotes(d.aiSummary);

        const summaryParts = [];
        if (d.compound) summaryParts.push(d.compound);
        if (d.price) summaryParts.push(`${Number(d.price).toLocaleString('en-US')} EGP`);
        if (d.area) summaryParts.push(`${d.area} m²`);

        setParseFeedback(
          isAr
            ? `✨ تم استخراج البيانات بنجاح: ${summaryParts.join(' · ')}`
            : `✨ Extracted specs: ${summaryParts.join(' · ')}`
        );
      } else {
        setErr(isAr ? 'لم نتمكن من استخراج تفاصيل كافية من النص' : 'Could not extract sufficient details from text');
      }
    } catch {
      setErr(isAr ? 'فشل تحليل النص' : 'Failed to parse text');
    } finally {
      setParsing(false);
    }
  }

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
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  async function onSubmit() {
    const cpdV = cpd.trim();
    const areaV = digits(area);
    const priceV = digits(price);
    const nameV = name.trim();
    const phoneClean = digits(phone);

    if (cpdV.length < 2) return fail('cpd', t.needCpd, cpdRef);
    if (!areaV || Number(areaV) < 20) return fail('area', t.needArea, areaRef);
    if (!priceV) return fail('price', t.needPrice, priceRef);
    if (nameV.length < 2) return fail('name', t.needName, nameRef);
    if (phoneClean.length < 9) return fail('phone', t.needPhone, phoneRef);
    clearErr();

    setSending(true);
    try {
      const res = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode || undefined,
          compound: cpdV,
          propertyType: ptype,
          mode: purpose,
          beds,
          baths: Number(baths) || 2,
          area: Number(areaV),
          price: Number(priceV),
          finishing: finish,
          ownerName: nameV,
          ownerType: role === 'broker' ? 'Broker' : 'Owner',
          mobile: phone.trim(),
          comment: notes.trim(),
          photos,
          images: photos,
        }),
      });
      const result = await res.json().catch(() => null);
      const ref: string =
        result?.code || result?.listing?.code || `SE-SUB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const targetTab: string =
        result?.targetTab ||
        (role === 'broker'
          ? (purpose === 'rent' && Number(priceV) <= 400000 ? 'brokers rent' : 'brokers resale')
          : (purpose === 'rent' && Number(priceV) <= 400000 ? 'owners rent' : 'owners resale'));

      const summary = isAr
        ? `عرض عقار جديد — ${role === 'broker' ? 'وسيط' : 'مالك'} ${nameV} · ${purpose === 'rent' ? 'إيجار' : 'بيع'} · ${TYPES_AR[ptype] || ptype} · ${beds} غرف · ${areaV} م² · ${cpdV} · ${Number(priceV).toLocaleString('en-US')} ج.م · رقم الطلب ${ref}`
        : `New listing — ${role === 'broker' ? 'Broker' : 'Owner'} ${nameV} · ${purpose === 'rent' ? 'Rent' : 'Resale'} · ${ptype} · ${beds}-bed · ${areaV} m² · ${cpdV} · EGP ${Number(priceV).toLocaleString('en-US')} · Ref ${ref}`;

      setDone({
        ref,
        waHref: `https://wa.me/${WA}?text=${encodeURIComponent(summary)}`,
        targetTab,
      });
      window.scrollTo(0, 0);
    } catch {
      setErr(t.failed);
    } finally {
      setSending(false);
    }
  }

  function again() {
    setCpd('');
    setArea('');
    setPrice('');
    setNotes('');
    setRawText('');
    setPhotos([]);
    setGeneratedCode(null);
    setParseFeedback(null);
    setDone(null);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => cpdRef.current?.focus());
  }

  const priceLabel = purpose === 'rent' ? t.priceRent : t.priceSale;
  const pricePh = purpose === 'rent' ? t.phPriceRent : t.phPriceSale;
  const bad = (f: string) => (badField === f ? s.bad : undefined);

  return (
    <div className={s.page} data-theme={theme} dir={isAr ? 'rtl' : 'ltr'} lang={lang}>
      <header className={s.top}>
        <div className={s.wrap}>
          <a className={s.brand} href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo-mark.png" alt="Sierra Estates" />
            <span>
              <b>Sierra Estates</b>
              <small>{t.brandSub}</small>
            </span>
          </a>
          <div className={s.topAct}>
            <button
              className={s.tb}
              type="button"
              title="Toggle theme"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className={s.i} /> : <Moon className={s.i} />}
            </button>
            <button
              className={s.tb}
              type="button"
              title="Toggle language"
              aria-label="Toggle language"
              onClick={toggleLang}
            >
              <Languages className={s.i} />
              <span>{t.langLabel}</span>
            </button>
          </div>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.wrap}>
          <div className={s.eyebrow}>{t.eyebrow}</div>
          <h1>
            {t.titleLead}
            <em>{t.titleEm}</em>
          </h1>
          <p>{t.lead}</p>
          <div className={s.perks}>
            <span>
              <BadgeCheck className={s.i} />
              <span>{t.p1}</span>
            </span>
            <span>
              <Users className={s.i} />
              <span>{t.p2}</span>
            </span>
            <span>
              <Percent className={s.i} />
              <span>{t.p3}</span>
            </span>
          </div>
        </div>
      </section>

      <main className={s.main}>
        <div className={s.wrap}>
          {!done ? (
            <div className={s.card}>
              {/* STEP 1: MAGIC INTAKE PASTE */}
              <div className={s.aiIntakeCard}>
                <div className={s.aiIntakeHeader}>
                  <div className={s.aiIntakeTitle}>
                    <Sparkles className={s.i} />
                    <span>{t.step1}</span>
                  </div>
                  {generatedCode && (
                    <div className={s.codeBadge}>
                      <span>{t.codeLabel}:</span>
                      <b>{generatedCode}</b>
                    </div>
                  )}
                </div>
                <div className={s.aiIntakeDesc}>{t.step1Desc}</div>
                <textarea
                  className={s.aiIntakeTextarea}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t.pastePh}
                  dir="auto"
                />
                <div className={s.aiIntakeActions}>
                  <button
                    type="button"
                    className={s.aiParseBtn}
                    onClick={onAutoParse}
                    disabled={parsing || !rawText.trim()}
                  >
                    <Sparkles className={s.i} />
                    <span>{parsing ? t.parsing : t.parseBtn}</span>
                  </button>
                  {parseFeedback && (
                    <div className={s.aiFeedbackSuccess}>
                      <Check style={{ width: 15, height: 15 }} />
                      <span>{parseFeedback}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: REVIEW & REVISE SPECS */}
              <div className={s.sect}>{t.step2}</div>
              <div className={s.grid}>
                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="purpose">{t.purpose}</label>
                  <div className={s.seg} id="purpose">
                    <button
                      type="button"
                      className={purpose === 'sale' ? s.on : undefined}
                      onClick={() => setPurpose('sale')}
                    >
                      {t.sale}
                    </button>
                    <button
                      type="button"
                      className={purpose === 'rent' ? s.on : undefined}
                      onClick={() => setPurpose('rent')}
                    >
                      {t.rent}
                    </button>
                  </div>
                </div>

                <div className={s.f}>
                  <label htmlFor="cpd">{t.cpd}</label>
                  <input
                    type="text"
                    id="cpd"
                    ref={cpdRef}
                    list="cpd-list"
                    className={bad('cpd')}
                    value={cpd}
                    onChange={(e) => {
                      setCpd(e.target.value);
                      clearErr();
                    }}
                    placeholder={t.phCpd}
                    autoComplete="off"
                    title="Compound"
                  />
                  <datalist id="cpd-list">
                    {CPDS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className={s.f}>
                  <label htmlFor="ptype">{t.type}</label>
                  <select
                    id="ptype"
                    title="Property type"
                    aria-label="Property type"
                    value={ptype}
                    onChange={(e) => setPtype(e.target.value)}
                  >
                    {TYPES.map((o) => (
                      <option key={o} value={o}>
                        {isAr ? TYPES_AR[o] || o : o}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="beds">{t.beds}</label>
                  <div className={s.chips} id="beds">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={beds === n ? s.on : undefined}
                        onClick={() => setBeds(n)}
                      >
                        {n === 6 ? '6+' : n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={s.f}>
                  <label htmlFor="baths">{t.baths}</label>
                  <input
                    type="number"
                    id="baths"
                    min={1}
                    max={9}
                    value={baths}
                    onChange={(e) => setBaths(e.target.value)}
                    title="Bathrooms"
                    placeholder="2"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="area">{t.area}</label>
                  <input
                    type="number"
                    id="area"
                    ref={areaRef}
                    className={bad('area')}
                    min={20}
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      clearErr();
                    }}
                    placeholder={t.phArea}
                    title="Area in square meters"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="price">{priceLabel}</label>
                  <input
                    type="text"
                    id="price"
                    ref={priceRef}
                    className={bad('price')}
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      clearErr();
                    }}
                    placeholder={pricePh}
                    title="Asking price"
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="finish">{t.finish}</label>
                  <select
                    id="finish"
                    title="Finishing"
                    aria-label="Finishing"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                  >
                    {FINISHES.map((o) => (
                      <option key={o} value={o}>
                        {isAr ? FIN_AR[o] || o : o}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${s.f} ${s.wide}`}>
                  <label htmlFor="notes">{t.notes}</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.phNotes}
                  />
                </div>
              </div>

              <hr />

              {/* STEP 3: ADVERTISER IDENTITY, CONTACT & PHOTOS */}
              <div className={s.sect}>{t.step3}</div>

              {/* ROLE SELECTION */}
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{t.rolePrompt}</label>
              <div className={s.roleSelector}>
                <button
                  type="button"
                  className={`${s.roleCard} ${role === 'owner' ? s.roleActive : ''}`}
                  onClick={() => setRole('owner')}
                >
                  <div className={s.roleTitle}>
                    <UserCheck style={{ width: 18, height: 18, color: 'var(--gold)' }} />
                    <span>{t.owner}</span>
                  </div>
                  <div className={s.roleBadge}>{t.ownerBadge}</div>
                </button>

                <button
                  type="button"
                  className={`${s.roleCard} ${role === 'broker' ? s.roleActive : ''}`}
                  onClick={() => setRole('broker')}
                >
                  <div className={s.roleTitle}>
                    <Building style={{ width: 18, height: 18, color: 'var(--gold)' }} />
                    <span>{t.broker}</span>
                  </div>
                  <div className={s.roleBadge}>{t.brokerBadge}</div>
                </button>
              </div>

              <div className={`${s.grid} ${s.three}`}>
                <div className={s.f}>
                  <label htmlFor="name">{t.name}</label>
                  <input
                    type="text"
                    id="name"
                    ref={nameRef}
                    className={bad('name')}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearErr();
                    }}
                    placeholder={t.phName}
                  />
                </div>

                <div className={s.f}>
                  <label htmlFor="phone">{t.wa}</label>
                  <input
                    type="tel"
                    id="phone"
                    ref={phoneRef}
                    className={bad('phone')}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearErr();
                    }}
                    placeholder="010 1234 5678"
                  />
                </div>
              </div>

              {/* PHOTOS ATTACHMENT */}
              <div style={{ marginTop: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{t.photosTit}</label>
                <div
                  className={`${s.photoDropzone} ${isDragging ? s.dragover : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <UploadCloud className={s.photoIcon} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.dropPhotos}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.photosSub}</div>
                </div>

                {photos.length > 0 && (
                  <div className={s.photoGrid}>
                    {photos.map((src, idx) => (
                      <div key={idx} className={s.photoThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Property upload ${idx + 1}`} />
                        {idx === 0 && <span className={s.photoCoverBadge}>{t.coverTag}</span>}
                        <button
                          type="button"
                          className={s.photoRemoveBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(idx);
                          }}
                          title={t.removePhoto}
                          aria-label={t.removePhoto}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {err && (
                <div className={s.err} role="alert">
                  {err}
                </div>
              )}

              <div className={s.foot} style={{ marginTop: 28 }}>
                <button
                  className={s.submit}
                  type="button"
                  onClick={onSubmit}
                  disabled={sending}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>{sending ? t.sending : t.submit}</span>
                  <ArrowRight className={s.i} />
                </button>
              </div>
            </div>
          ) : (
            <div className={`${s.card} ${s.done}`}>
              <div className={s.tick}>
                <Check className={s.i} />
              </div>
              <h2>{t.doneTit}</h2>
              <p>{t.doneMsg}</p>

              <div className={s.ref}>
                {t.ref} · <b>{done.ref}</b>
              </div>

              {done.targetTab && (
                <div className={s.doneSheetTab}>
                  <span>📊 {t.sheetTab}:</span>
                  <b>{done.targetTab}</b>
                </div>
              )}

              <div className={s.doneActions}>
                <a className={s.viewMapBtn} href="/#map">
                  <MapPin style={{ width: 18, height: 18 }} />
                  <span>{t.viewMap}</span>
                </a>

                <a className={s.wa} href={done.waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className={s.i} />
                  <span>{t.sendPhotos}</span>
                </a>

                <button className={s.again} type="button" onClick={again}>
                  {t.again}
                </button>
              </div>
            </div>
          )}

          <div className={s.legal}>{t.legal}</div>
        </div>
      </main>
    </div>
  );
}
