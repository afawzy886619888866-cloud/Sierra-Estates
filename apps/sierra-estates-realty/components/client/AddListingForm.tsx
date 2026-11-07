"use client";

/**
 * AddListingForm — Clean, High-Velocity Unified Intake Terminal.
 *
 * Merges the simplicity of the foundational intake form with the modern Stitch
 * AI terminal workflow:
 * 1. Monolithic Paste Canvas: Paste raw WhatsApp copy/broker notes with 1-click samples
 *    (Resale & Rent) and instant spec extraction via /api/listings/easy-parse.
 * 2. Clean Revision Grid: Review and fine-tune Compound, Price, Area, Bedrooms,
 *    Finishing, and Sierra Code.
 * 3. 3-Contact Routing: Dedicated inputs for Submitter Identity (Bots/Staff/Roles),
 *    Owner Mobile Number, and Broker Mobile Number.
 * 4. Architectural Media: Simple image drag & drop with cover showcase previews.
 * 5. Full Ecosystem Synchronization: Writes to Supabase public.listings, geocode
 *    coordinates, busts GIS map cache, and mirrors to canonical Google Sheet tabs.
 */
import React, { useEffect, useRef, useState } from "react";
import {
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
  Languages,
} from "lucide-react";
import s from "./AddListingForm.module.css";

const WA_CONCIERGE = "201092048333";

const CPDS = [
  "Mountain View iCity",
  "Mountain View Hyde Park",
  "Villette Sodic",
  "Mivida",
  "Madinaty",
  "Hyde Park",
  "Eastown",
  "Palm Hills New Cairo",
  "El Shorouk",
  "Al Rehab",
  "Katameya Heights",
  "Katameya Dunes",
  "Fifth Square",
  "Lake View Estates",
  "Taj City",
  "Bloomfields",
  "Sarai",
  "Zed East",
  "The Waterway",
  "SODIC East",
  "Uptown Cairo",
  "La Vista City",
];

const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Townhouse",
  "Twin House",
  "Penthouse",
  "Duplex",
  "Studio",
  "Chalet",
];

const PROPERTY_TYPES_AR: Record<string, string> = {
  Apartment: "شقة",
  Villa: "فيلا",
  Townhouse: "تاون هاوس",
  "Twin House": "توين هاوس",
  Penthouse: "بنتهاوس",
  Duplex: "دوبلكس",
  Studio: "استوديو",
  Chalet: "شاليه",
};

const FINISHING_OPTIONS = [
  "Fully finished",
  "Semi-finished",
  "Core & shell",
  "Furnished",
];

const FINISHING_AR: Record<string, string> = {
  "Fully finished": "تشطيب كامل",
  "Semi-finished": "نصف تشطيب",
  "Core & shell": "على الطوب",
  Furnished: "مفروش",
};

const SUBMITTER_PRESETS = [
  {
    id: "agent:closer-bot",
    type: "bot",
    name: "Sierra AI Closer Bot (Stage-9 Closer)",
    labelAr: "🤖 بوت المفاوض والإغلاق الذكي (Closer Bot)",
    labelEn: "🤖 Sierra AI Closer Bot",
  },
  {
    id: "agent:openclaw",
    type: "bot",
    name: "OpenClaw Intake Agent (Telegram & Web Harvester)",
    labelAr: "🦅 وكيل أوبن كلو لجلب العقارات (OpenClaw)",
    labelEn: "🦅 OpenClaw Intake Agent",
  },
  {
    id: "agent:fawzy",
    type: "employee",
    name: "Ahmed Fawzy (Managing Partner)",
    labelAr: "👔 أحمد فوزي (الشريك الإداري)",
    labelEn: "👔 Ahmed Fawzy (Managing Partner)",
  },
  {
    id: "employee:advisor",
    type: "employee",
    name: "Sierra Advisory Staff / Employee",
    labelAr: "💼 فريق استشارات سييرا / موظف بالشركة",
    labelEn: "💼 Sierra Advisory Staff / Employee",
  },
  {
    id: "role:owner",
    type: "owner",
    name: "Direct Owner",
    labelAr: "🏠 المالك الأصلي للوحدة مباشرة (Direct Owner)",
    labelEn: "🏠 Direct Property Owner",
  },
  {
    id: "role:broker",
    type: "broker",
    name: "Authorized Broker",
    labelAr: "🤝 وسيط عقاري / بروكر معتمد (Broker Desk)",
    labelEn: "🤝 Authorized Broker Desk",
  },
  {
    id: "custom",
    type: "employee",
    name: "Other Submitter / Manual Entry",
    labelAr: "✍️ جهة أخرى / إدخال يدوي مخصص",
    labelEn: "✍️ Other Submitter / Custom",
  },
];

const T = {
  en: {
    badge: "✨ Instant AI Intake · Master Inventory",
    titleLead: "List your unit with ",
    titleEm: "Sierra Estates",
    subtitle:
      "Paste your raw listing copy, broker notes, or WhatsApp message. Sierra AI instantly extracts the specifications, pins the unit on the GIS map, and syncs to the Master Google Sheet.",
    sampleResale: "🏢 Sample Resale (Villette Villa)",
    sampleRent: "🔑 Sample Rent (Mivida Flat)",
    clear: "Clear",
    pastePlaceholder:
      "Paste property description, WhatsApp message, broker notes, compound, area, beds, price... e.g. Standalone villa for sale in Villette Sodic New Cairo, BUA 380m, 5 beds, 6 baths, private pool, price 45M cash, contact owner Dr. Adman 01012345678, broker Eng. Tarek 01098765432",
    chars: "chars",
    extractBtn: "✨ Extract & Auto-Fill Specs",
    extracting: "Analyzing text & extracting specs…",
    specsTitle: "Property Specifications",
    specsSub: "Review and adjust specifications before publishing",
    compound: "Compound",
    compoundPh: "e.g. Villette Sodic",
    dealMode: "Listing Mode",
    sale: "Resale (Sale)",
    rent: "Rental (Rent)",
    priceSale: "Asking Price (EGP)",
    priceRent: "Monthly Rent (EGP)",
    footprint: "Footprint (m²)",
    areaPh: "Built-up Area (m²)",
    gardenPh: "Garden Area (m² optional)",
    layout: "Layout & Rooms",
    beds: "Bedrooms",
    baths: "Bathrooms",
    propType: "Property Type",
    finishing: "Finishing Status",
    sierraCode: "Sierra Algorithmic Code",
    codePh: "e.g. VIL-S-5B-380M",
    codeSub: "Minted algorithmic identifier for fast GIS and Sheet tracking",
    notes: "Additional Notes & Highlights",
    notesPh: "Floor, view, delivery status, payment schedule, viewing hours…",
    contactsTitle: "Contacts & Submitter Identity",
    contactsSub:
      "3 distinct slots for Submitter identity, Owner mobile, and Broker mobile.",
    submitterLabel: "Submitted By (Identity & Channel)",
    ownerPhoneLabel: "Owner Mobile Number",
    ownerPhonePh: "010XXXXXXXX",
    ownerNameLabel: "Owner Name",
    ownerNamePh: "e.g. Dr. Ayman",
    brokerPhoneLabel: "Broker Mobile Number",
    brokerPhonePh: "010XXXXXXXX",
    brokerNameLabel: "Broker Name / Agency",
    brokerNamePh: "e.g. Eng. Tarek",
    mediaTitle: "Property Photos",
    mediaSub: "Upload high-res photos (JPG, PNG, WebP · Max 10 photos)",
    dropzoneText: "Drag & drop photos here, or click to browse",
    dropzoneSub: "Supported formats: JPG, PNG, WebP up to 15MB each",
    coverPhoto: "⭐ Cover Showcase",
    removePhoto: "Remove photo",
    submit: "Submit listing",
    submitting: "Publishing to Map, Supabase & Google Sheet…",
    reset: "Reset Form",
    complianceNote:
      "256-Bit Encrypted · Synced with Supabase Postgres, GIS Map & Master Google Sheet",
    needCompound: "Please specify the compound or location name.",
    needArea: "Please enter a valid unit area in m².",
    needPrice: "Please specify the asking price or rent.",
    needPhone:
      "Please provide at least one valid mobile number (Owner or Broker).",
    doneTitle: "🎉 Listing Published Successfully!",
    doneDesc:
      "Your property has been validated, pinned to the interactive GIS map, saved in Supabase inventory, and recorded in the canonical Google Sheet.",
    refCode: "Reference Code",
    targetTab: "Target Sheet Tab",
    viewMap: "📍 View on Interactive Map",
    viewAdmin: "📊 View in Admin Inventory",
    chatWa: "💬 Share via WhatsApp Concierge",
    addAnother: "➕ Add Another Listing",
  },
  ar: {
    badge: "✨ محطة إدراج العقارات الذكية · شيت المخزون الرئيسي",
    titleLead: "أضف وحدتك مع ",
    titleEm: "سييرا إستيتس",
    subtitle:
      "الصق تفاصيل العقار أو رسائل الواتساب أو مذكرات الوسطاء مباشرة. يستخرج الذكاء الاصطناعي المواصفات تلقائياً، ويعرض الوحدة على الخريطة التفاعلية، ويوجهها مباشرة إلى شيت المخزون الرئيسي.",
    sampleResale: "🏢 نموذج بيع (فيلا سوديك فيليت)",
    sampleRent: "🔑 نموذج إيجار (شقة ميفيدا)",
    clear: "مسح",
    pastePlaceholder:
      "الصق تفاصيل العقار هنا، رسائل الواتساب، مواصفات الوحدة، الكمبوند، المساحة، السعر... مثال: فيلا مستقلة للبيع في كمبوند سوديك فيليت بالتجمع الخامس، مساحة المباني 380م، 5 غرف نوم، 6 حمامات، مسبح خاص، مطلوب 45 مليون كاش، للتواصل مع المالك د. أيمن 01012345678، الوسيط م. طارق 01098765432",
    chars: "حرف",
    extractBtn: "✨ استخراج وتعبئة المواصفات تلقائياً",
    extracting: "جارٍ تحليل النص واستخراج المواصفات…",
    specsTitle: "مواصفات العقار المؤكدة",
    specsSub: "راجع المواصفات المستخرجة أو عدّلها خلال ثوانٍ معدودة",
    compound: "الكمبوند",
    compoundPh: "مثال: سوديك فيليت Villette",
    dealMode: "نوع الإعلان",
    sale: "بيع (Resale)",
    rent: "إيجار (Rent)",
    priceSale: "السعر المطلوب (ج.م)",
    priceRent: "الإيجار الشهري (ج.م)",
    footprint: "المساحة (م²)",
    areaPh: "مساحة المباني م²",
    gardenPh: "مساحة الحديقة م² (اختياري)",
    layout: "التقسيم وحالة التشطيب",
    beds: "غرف النوم",
    baths: "الحمامات",
    propType: "نوع العقار",
    finishing: "حالة التشطيب",
    sierraCode: "كود سييرا التعريفي",
    codePh: "مثال: VIL-S-5B-380M",
    codeSub: "رمز تعريفي خوارزمي لتتبع الوحدة على الخريطة والشيت",
    notes: "ملاحظات وتفاصيل إضافية",
    notesPh: "الدور، الفيو، موعد التسليم، خطة السداد، مواعيد المعاينة…",
    contactsTitle: "بيانات الاتصال ومقدم العقار (3 جهات)",
    contactsSub:
      "تحديد دقيق لهوية مقدم الطلب (بوت أو موظف)، ورقم المالك، ورقم الوسيط.",
    submitterLabel: "مقدم الطلب (الهوية والجهة)",
    ownerPhoneLabel: "رقم موبايل / واتساب المالك",
    ownerPhonePh: "010XXXXXXXX",
    ownerNameLabel: "اسم المالك",
    ownerNamePh: "مثال: د. أيمن",
    brokerPhoneLabel: "رقم موبايل / واتساب الوسيط (البروكر)",
    brokerPhonePh: "010XXXXXXXX",
    brokerNameLabel: "اسم الوسيط / الشركة",
    brokerNamePh: "مثال: م. طارق",
    mediaTitle: "صور ومخططات العقار",
    mediaSub: "ارفع صور عالية الجودة (JPG, PNG, WebP · حتى 10 صور)",
    dropzoneText: "اسحب وأفلت صور العقار هنا، أو اضغط للاختيار",
    dropzoneSub: "يدعم صيغ JPG, PNG, WebP بحجم يصل إلى 15 ميجابايت لكل صورة",
    coverPhoto: "⭐ الواجهة الرئيسية",
    removePhoto: "حذف الصورة",
    submit: "Submit listing (أرسل العقار)",
    submitting: "جارٍ الحفظ والنشر على الخريطة وقاعدة البيانات والشيت…",
    reset: "إعادة ضبط النموذج",
    complianceNote:
      "بيانات مشفرة 256-Bit ومربوطة بقاعدة بيانات Supabase والخريطة وشيت الإكسل",
    needCompound: "من فضلك حدد اسم الكمبوند أو المنطقة.",
    needArea: "من فضلك أدخل مساحة الوحدة بالمتر المربع.",
    needPrice: "من فضلك حدد السعر المطلوب.",
    needPhone: "يرجى إدخال رقم هاتف صحيح واحد على الأقل (المالك أو الوسيط).",
    doneTitle: "🎉 تم نشر العقار بنجاح!",
    doneDesc:
      "تم حفظ العقار بنجاح في قاعدة البيانات، وربطه بالخريطة التفاعلية، وتوجيهه إلى شيت المخزون الرئيسي.",
    refCode: "كود الوحدة",
    targetTab: "الشيت المستهدف",
    viewMap: "📍 عرض على الخريطة التفاعلية",
    viewAdmin: "📊 عرض في لوحة إدارة العقارات",
    chatWa: "💬 مشاركة عبر واتساب سييرا",
    addAnother: "➕ إضافة عقار آخر",
  },
} as const;

type Lang = "en" | "ar";
type Purpose = "sale" | "rent";

const digits = (v: string) => String(v || "").replace(/[^\d]/g, "");

export default function AddListingForm({
  defaultLang = "ar",
}: { defaultLang?: Lang } = {}) {
  const [lang, setLang] = useState<Lang>(defaultLang);

  // Core intake inputs
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  // Specifications
  const [compound, setCompound] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("sale");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [gardenArea, setGardenArea] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [finishing, setFinishing] = useState("Fully finished");
  const [sierraCode, setSierraCode] = useState("");
  const [notes, setNotes] = useState("");

  // 3 Contact Entities
  const [submitterPreset, setSubmitterPreset] = useState("agent:closer-bot");
  const [customAgentName, setCustomAgentName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [brokerPhone, setBrokerPhone] = useState("");

  // Media
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Submission States
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [badField, setBadField] = useState<string | null>(null);
  const [done, setDone] = useState<{
    ref: string;
    waHref: string;
    targetTab?: string;
  } | null>(null);

  // Refs for focusing
  const compoundRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const ownerPhoneRef = useRef<HTMLInputElement>(null);
  const brokerPhoneRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("hzp-lang");
    if (storedLang === "ar" || storedLang === "en") setLang(storedLang);
  }, []);

  const t = T[lang];
  const isAr = lang === "ar";

  function toggleLang() {
    const next: Lang = isAr ? "en" : "ar";
    setLang(next);
    window.localStorage.setItem("hzp-lang", next);
  }

  // Auto-generate Sierra Code helper
  useEffect(() => {
    if (!compound && !area) return;
    const cpdAcronym =
      (compound || "UNIT")
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("")
        .slice(0, 3) || "SE";
    const modeChar = purpose === "rent" ? "R" : "S";
    const bedsStr = beds > 0 ? `${beds}B` : "ST";
    const areaStr = area ? `${digits(area)}M` : "0M";
    const auto = `${cpdAcronym}-${modeChar}-${bedsStr}-${areaStr}`;
    setSierraCode((prev) =>
      prev && prev.length > 3 && !prev.startsWith(cpdAcronym) ? prev : auto,
    );
  }, [compound, purpose, beds, area]);

  function loadSample(type: "resale" | "rent") {
    setErr("");
    setBadField(null);
    if (type === "resale") {
      const sampleText = isAr
        ? "فيلا مستقلة فاخرة للبيع في كمبوند سوديك فيليت Villette التجمع الخامس. مساحة المباني 380م²، مساحة الأرض 450م²، 5 غرف نوم ماستر، 6 حمامات، مسبح خاص وحديقة واسعة. تشطيب ألترا سوبر لوكس بالتكييفات. السعر المطلوب 45 مليون جنيه كاش. كود الوحدة VIL-S-5B-380M. للتواصل مع المالك د. أيمن 01012345678، الوسيط م. طارق 01098765432."
        : "Luxury standalone villa for sale in Villette Sodic, New Cairo Golden Square. BUA 380 sqm, Land 450 sqm, 5 master bedrooms, 6 bathrooms, private pool, landscaped garden. Ultra super lux finishing. Asking price: 45,000,000 EGP cash. Unit code: VIL-S-5B-380M. Contact owner Dr. Ayman 01012345678, broker Eng. Tarek 01098765432.";
      setRawText(sampleText);
      setCompound("Villette Sodic");
      setPurpose("sale");
      setPropertyType("Villa");
      setBeds(5);
      setBaths(6);
      setArea("380");
      setGardenArea("450");
      setPrice("45,000,000");
      setFinishing("Fully finished");
      setSierraCode("VIL-S-5B-380M");
      setOwnerName(isAr ? "د. أيمن" : "Dr. Ayman");
      setOwnerPhone("01012345678");
      setBrokerName(isAr ? "م. طارق" : "Eng. Tarek");
      setBrokerPhone("01098765432");
      setNotes(
        isAr
          ? "فيلا مستقلة فاخرة بموقع مميز وحمام سباحة خاص"
          : "Prime location villa with private pool",
      );
      setParseFeedback(
        isAr
          ? "✨ تم تحميل نموذج البيع بنجاح"
          : "✨ Loaded Resale Sample successfully",
      );
    } else {
      const sampleText = isAr
        ? "شقة راقية للإيجار في كمبوند ميفيدا إعمار Mivida التجمع الخامس. مساحة 200م²، 3 غرف نوم، 2 حمام، ريسبشن واسع وتراس فيو بحيرات. تشطيب كامل ألترا لوكس بالمطبخ والتكييفات. الإيجار الشهري المطلوب 65,000 جنيه. كود MIV-R-3B-200M. للتواصل مع المالك 01011122233."
        : "Exclusive apartment for rent in Mivida Emaar, New Cairo. 200 sqm, 3 bedrooms, 2 bathrooms, open terrace overlooking green lake views. Fully finished with ACs and kitchen. Monthly rent: 65,000 EGP. Code: MIV-R-3B-200M. Contact owner 01011122233.";
      setRawText(sampleText);
      setCompound("Mivida");
      setPurpose("rent");
      setPropertyType("Apartment");
      setBeds(3);
      setBaths(2);
      setArea("200");
      setGardenArea("");
      setPrice("65,000");
      setFinishing("Fully finished");
      setSierraCode("MIV-R-3B-200M");
      setOwnerName(isAr ? "المالك مباشرة" : "Direct Owner");
      setOwnerPhone("01011122233");
      setBrokerName("");
      setBrokerPhone("");
      setNotes(
        isAr
          ? "تشطيب كامل مع أجهزة التكييف والمطبخ"
          : "Fully finished with fitted kitchen and ACs",
      );
      setParseFeedback(
        isAr
          ? "✨ تم تحميل نموذج الإيجار بنجاح"
          : "✨ Loaded Rent Sample successfully",
      );
    }
  }

  function handleClear() {
    setRawText("");
    setCompound("");
    setPrice("");
    setArea("");
    setGardenArea("");
    setBeds(3);
    setBaths(2);
    setFinishing("Fully finished");
    setSierraCode("");
    setOwnerName("");
    setOwnerPhone("");
    setBrokerName("");
    setBrokerPhone("");
    setNotes("");
    setPhotos([]);
    setParseFeedback(null);
    setErr("");
    setBadField(null);
  }

  async function handleAutoParse() {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 5) {
      setErr(
        isAr
          ? "برجاء كتابة أو لصق نص الإعلان أولاً"
          : "Please paste or write listing text first",
      );
      return;
    }
    setErr("");
    setBadField(null);
    setParsing(true);
    setParseFeedback(null);

    try {
      const res = await fetch("/api/listings/easy-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: trimmed, source: "manual" }),
      });
      const json = await res.json().catch(() => null);

      if (json?.success && json?.data) {
        const d = json.data;
        if (d.compound) setCompound(d.compound);
        if (d.mode) setPurpose(d.mode === "rent" ? "rent" : "sale");
        if (d.propertyType) {
          const match =
            PROPERTY_TYPES.find(
              (item) => item.toLowerCase() === d.propertyType.toLowerCase(),
            ) || d.propertyType;
          setPropertyType(match);
        }
        if (d.beds !== null && d.beds !== undefined) setBeds(Number(d.beds));
        if (d.baths !== null && d.baths !== undefined)
          setBaths(Number(d.baths));
        if (d.area !== null && d.area !== undefined) setArea(String(d.area));
        if (d.gardenArea !== null && d.gardenArea !== undefined)
          setGardenArea(String(d.gardenArea));
        if (d.price !== null && d.price !== undefined) {
          setPrice(Number(d.price).toLocaleString("en-US"));
        }
        if (d.finishing) {
          const finLower = d.finishing.toLowerCase();
          if (
            finLower.includes("core") ||
            finLower.includes("shell") ||
            finLower.includes("طوب")
          )
            setFinishing("Core & shell");
          else if (
            finLower.includes("semi") ||
            finLower.includes("نصف") ||
            finLower.includes("نص")
          )
            setFinishing("Semi-finished");
          else if (finLower.includes("furnish") || finLower.includes("مفروش"))
            setFinishing("Furnished");
          else setFinishing("Fully finished");
        }
        if (d.sierraCode) setSierraCode(d.sierraCode);
        if (d.ownerName && !ownerName) setOwnerName(d.ownerName);
        if (d.mobile) {
          if (!ownerPhone) setOwnerPhone(d.mobile);
          else if (!brokerPhone && d.mobile !== ownerPhone)
            setBrokerPhone(d.mobile);
        }
        if (d.aiSummary) setNotes(d.aiSummary);

        const summary = [];
        if (d.compound) summary.push(d.compound);
        if (d.price)
          summary.push(`${Number(d.price).toLocaleString("en-US")} EGP`);
        if (d.area) summary.push(`${d.area} m²`);
        if (d.sierraCode) summary.push(d.sierraCode);

        setParseFeedback(
          isAr
            ? `✨ تم استخراج البيانات بنجاح: ${summary.join(" · ")}`
            : `✨ Extracted: ${summary.join(" · ")}`,
        );
      } else {
        setErr(
          isAr
            ? "لم نتمكن من استخراج تفاصيل كافية من النص"
            : "Could not extract sufficient details from text",
        );
      }
    } catch {
      setErr(
        isAr
          ? "فشل تحليل النص، تحقق من الاتصال"
          : "Failed to parse text, check connection",
      );
    } finally {
      setParsing(false);
    }
  }

  // File Upload Handlers
  const processFiles = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 10);
    list.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) {
          setPhotos((prev) =>
            prev.length < 10 && !prev.includes(res) ? [...prev, res] : prev,
          );
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

  // Submit Listing
  async function handleSubmit() {
    const cpdVal = compound.trim();
    const areaClean = digits(area);
    const priceClean = digits(price);
    const ownerPhoneClean = digits(ownerPhone);
    const brokerPhoneClean = digits(brokerPhone);

    if (cpdVal.length < 2) {
      setErr(t.needCompound);
      setBadField("compound");
      compoundRef.current?.focus();
      return;
    }
    if (!areaClean || Number(areaClean) < 15) {
      setErr(t.needArea);
      setBadField("area");
      areaRef.current?.focus();
      return;
    }
    if (!priceClean || Number(priceClean) <= 0) {
      setErr(t.needPrice);
      setBadField("price");
      priceRef.current?.focus();
      return;
    }
    if (ownerPhoneClean.length < 8 && brokerPhoneClean.length < 8) {
      setErr(t.needPhone);
      setBadField("ownerPhone");
      ownerPhoneRef.current?.focus();
      return;
    }

    setErr("");
    setBadField(null);
    setSending(true);

    try {
      const selectedPreset = SUBMITTER_PRESETS.find(
        (p) => p.id === submitterPreset,
      );
      const submitterType = (selectedPreset?.type || "owner") as
        | "owner"
        | "broker"
        | "employee"
        | "bot";
      const effectiveAgentName =
        submitterPreset === "custom" && customAgentName.trim()
          ? customAgentName.trim()
          : selectedPreset?.name || "Sierra Advisory Staff";

      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          ownerName:
            ownerName.trim() ||
            (brokerPhoneClean ? "Direct Owner" : "صاحب الإعلان"),
          ownerType: submitterType === "broker" ? "Broker" : "Owner",
          ownerPhone: ownerPhoneClean || undefined,
          brokerPhone: brokerPhoneClean || undefined,
          brokerName: brokerName.trim() || undefined,
          agentName: effectiveAgentName,
          submitterType,
          mobile: ownerPhoneClean || brokerPhoneClean || "",
          rawText: rawText.trim(),
          comment: notes.trim(),
          photos,
          images: photos,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Failed to submit listing");
      }

      const mintedRef: string =
        result?.code ||
        result?.listing?.code ||
        sierraCode ||
        `SE-SUB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const targetTab: string =
        result?.targetTab ||
        (purpose === "rent" ? "owners rent" : "owners resale");

      const summaryText = isAr
        ? `عقار جديد معروض على سييرا إستيتس: ${cpdVal} · ${purpose === "rent" ? "إيجار" : "بيع"} · ${propertyType} · ${areaClean} م² · السعر ${Number(priceClean).toLocaleString("en-US")} ج.م · كود ${mintedRef}`
        : `New Listing on Sierra Estates: ${cpdVal} · ${purpose === "rent" ? "Rent" : "Resale"} · ${propertyType} · ${areaClean} sqm · EGP ${Number(priceClean).toLocaleString("en-US")} · Code ${mintedRef}`;

      setDone({
        ref: mintedRef,
        waHref: `https://wa.me/${WA_CONCIERGE}?text=${encodeURIComponent(summaryText)}`,
        targetTab,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    handleClear();
    setDone(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={s.page} dir={isAr ? "rtl" : "ltr"} lang={lang}>
      <div className={s.wrap}>
        {/* Top Header: Simple, Clean, Non-Duplicated */}
        <header className={s.header}>
          <div className={s.headerTop}>
            <div className={s.badge}>
              <span className={s.pulseDot} />
              <span>{t.badge}</span>
            </div>
            <div className={s.headerControls}>
              <button
                type="button"
                className={s.langBtn}
                onClick={toggleLang}
                title={isAr ? "Switch to English" : "التبديل إلى العربية"}
              >
                <Languages style={{ width: 14, height: 14 }} />
                <span>{isAr ? "English" : "عربي"}</span>
              </button>
            </div>
          </div>

          <h1 className={s.title}>
            {t.titleLead}
            <em>{t.titleEm}</em>
          </h1>
          <p className={s.subtitle}>{t.subtitle}</p>
        </header>

        {/* Unified Intake Card */}
        <div className={s.formCard}>
          {/* 1. Monolithic Paste Canvas */}
          <div>
            <div className={s.sectHeader}>
              <div className={s.sectTitle}>
                <Sparkles className={s.sectIcon} />
                <span>
                  {isAr
                    ? "محطة لصق نصوص العقار والواتساب"
                    : "Listing Intake Terminal"}
                </span>
              </div>
              <div className={s.samplePills}>
                <button
                  type="button"
                  className={s.samplePill}
                  onClick={() => loadSample("resale")}
                >
                  {t.sampleResale}
                </button>
                <button
                  type="button"
                  className={s.samplePill}
                  onClick={() => loadSample("rent")}
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

            <div className={s.pasteWrapper}>
              <textarea
                className={s.pasteArea}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t.pastePlaceholder}
                rows={5}
              />
              <div className={s.pasteFooter}>
                <span className={s.charCount}>
                  {rawText.length} {t.chars}
                </span>
                <button
                  type="button"
                  className={s.parseBtn}
                  onClick={handleAutoParse}
                  disabled={parsing || !rawText.trim()}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  <span>{parsing ? t.extracting : t.extractBtn}</span>
                </button>
              </div>
            </div>

            {parseFeedback && (
              <div className={s.parseFeedback}>
                <CheckCircle2
                  style={{
                    width: 16,
                    height: 16,
                    color: "#10b981",
                    flexShrink: 0,
                  }}
                />
                <span>{parseFeedback}</span>
              </div>
            )}
          </div>

          {/* 2. Structured Revision Grid */}
          <div>
            <div className={s.sectHeader}>
              <div className={s.sectTitle}>
                <Building className={s.sectIcon} />
                <span>{t.specsTitle}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.specsSub}
              </span>
            </div>

            <div className={s.grid}>
              {/* Compound / Location */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label} htmlFor="compound-input">
                  <MapPin
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.compound}</span>
                </label>
                <input
                  id="compound-input"
                  ref={compoundRef}
                  type="text"
                  className={`${s.input} ${badField === "compound" ? s.bad : ""}`}
                  value={compound}
                  onChange={(e) => {
                    setCompound(e.target.value);
                    if (badField === "compound") setBadField(null);
                  }}
                  placeholder={t.compoundPh}
                  list="cpds-list"
                  autoComplete="off"
                />
                <datalist id="cpds-list">
                  {CPDS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Deal Mode (Sale vs Rent) */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label}>
                  <CircleDollarSign
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.dealMode}</span>
                </label>
                <div className={s.segToggle}>
                  <button
                    type="button"
                    className={`${s.segBtn} ${purpose === "sale" ? s.segBtnActive : ""}`}
                    onClick={() => setPurpose("sale")}
                  >
                    {t.sale}
                  </button>
                  <button
                    type="button"
                    className={`${s.segBtn} ${purpose === "rent" ? s.segBtnActive : ""}`}
                    onClick={() => setPurpose("rent")}
                  >
                    {t.rent}
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label} htmlFor="price-input">
                  <CircleDollarSign
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{purpose === "rent" ? t.priceRent : t.priceSale}</span>
                  {price && (
                    <span className={s.labelSub}>
                      ~
                      {(Number(digits(price)) / 49).toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </span>
                  )}
                </label>
                <input
                  id="price-input"
                  ref={priceRef}
                  type="text"
                  className={`${s.input} ${badField === "price" ? s.bad : ""}`}
                  value={price}
                  onChange={(e) => {
                    const raw = digits(e.target.value);
                    setPrice(raw ? Number(raw).toLocaleString("en-US") : "");
                    if (badField === "price") setBadField(null);
                  }}
                  placeholder={purpose === "rent" ? "65,000" : "14,000,000"}
                />
              </div>

              {/* Footprint (Area & optional Garden) */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label}>
                  <Maximize2
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.footprint}</span>
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={areaRef}
                    type="text"
                    className={`${s.input} ${badField === "area" ? s.bad : ""}`}
                    value={area}
                    onChange={(e) => {
                      setArea(digits(e.target.value));
                      if (badField === "area") setBadField(null);
                    }}
                    placeholder={t.areaPh}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className={s.input}
                    value={gardenArea}
                    onChange={(e) => setGardenArea(digits(e.target.value))}
                    placeholder={t.gardenPh}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label}>
                  <BedDouble
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.beds}</span>
                </label>
                <div className={s.chipsRow}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${s.chipBtn} ${beds === n ? s.chipBtnActive : ""}`}
                      onClick={() => setBeds(n)}
                    >
                      {n === 6 ? "6+" : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div className={`${s.field} ${s.col6}`}>
                <label className={s.label}>
                  <Bath
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.baths}</span>
                </label>
                <div className={s.chipsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${s.chipBtn} ${baths === n ? s.chipBtnActive : ""}`}
                      onClick={() => setBaths(n)}
                    >
                      {n === 5 ? "5+" : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div className={`${s.field} ${s.col4}`}>
                <label className={s.label} htmlFor="ptype-select">
                  <Building
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.propType}</span>
                </label>
                <select
                  id="ptype-select"
                  className={s.select}
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {isAr ? PROPERTY_TYPES_AR[pt] || pt : pt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Finishing */}
              <div className={`${s.field} ${s.col4}`}>
                <label className={s.label} htmlFor="finishing-select">
                  <Layers
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.finishing}</span>
                </label>
                <select
                  id="finishing-select"
                  className={s.select}
                  value={finishing}
                  onChange={(e) => setFinishing(e.target.value)}
                >
                  {FINISHING_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {isAr ? FINISHING_AR[f] || f : f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sierra Code */}
              <div className={`${s.field} ${s.col4}`}>
                <label className={s.label} htmlFor="code-input">
                  <ShieldCheck
                    style={{ width: 14, height: 14, color: "var(--gold)" }}
                  />
                  <span>{t.sierraCode}</span>
                </label>
                <input
                  id="code-input"
                  type="text"
                  className={s.input}
                  value={sierraCode}
                  onChange={(e) => setSierraCode(e.target.value.toUpperCase())}
                  placeholder={t.codePh}
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    letterSpacing: "0.04em",
                  }}
                />
              </div>

              {/* Additional Highlights */}
              <div className={`${s.field} ${s.col12}`}>
                <label className={s.label} htmlFor="notes-input">
                  <span>{t.notes}</span>
                </label>
                <input
                  id="notes-input"
                  type="text"
                  className={s.input}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notesPh}
                />
              </div>
            </div>
          </div>

          {/* 3. The 3 Contact Entities Box */}
          <div className={s.contactsBox}>
            <div className={s.contactsHeader}>
              <div className={s.contactsTitle}>
                <User style={{ width: 16, height: 16, color: "var(--gold)" }} />
                <span>{t.contactsTitle}</span>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {t.contactsSub}
              </span>
            </div>

            <div className={s.contactsGrid}>
              {/* Contact 1: Submitter Dropdown */}
              <div className={s.contactCol}>
                <div className={s.contactColHeader}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Bot
                      style={{ width: 14, height: 14, color: "var(--gold)" }}
                    />
                    <span>{t.submitterLabel}</span>
                  </span>
                  <span className={s.contactTag}>Slot #1</span>
                </div>
                <select
                  className={s.select}
                  value={submitterPreset}
                  onChange={(e) => setSubmitterPreset(e.target.value)}
                >
                  {SUBMITTER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.labelAr : p.labelEn}
                    </option>
                  ))}
                </select>
                {submitterPreset === "custom" && (
                  <input
                    type="text"
                    className={s.input}
                    value={customAgentName}
                    onChange={(e) => setCustomAgentName(e.target.value)}
                    placeholder={
                      isAr
                        ? "اسم مقدم الطلب / الموظف"
                        : "Submitter / staff name"
                    }
                  />
                )}
                <div className={s.contactHelper}>
                  {isAr
                    ? "يحدد المحفظة والوكيل المباشر المنسوب له العقار"
                    : "Assigns mandate channel and agent provenance"}
                </div>
              </div>

              {/* Contact 2: Owner Mobile */}
              <div className={s.contactCol}>
                <div className={s.contactColHeader}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <PhoneCall
                      style={{ width: 14, height: 14, color: "#10b981" }}
                    />
                    <span>{t.ownerPhoneLabel}</span>
                  </span>
                  <span className={s.contactTag}>Slot #2</span>
                </div>
                <input
                  ref={ownerPhoneRef}
                  type="tel"
                  className={`${s.input} ${badField === "ownerPhone" ? s.bad : ""}`}
                  value={ownerPhone}
                  onChange={(e) => {
                    setOwnerPhone(e.target.value);
                    if (badField === "ownerPhone") setBadField(null);
                  }}
                  placeholder={t.ownerPhonePh}
                  dir="ltr"
                />
                <input
                  type="text"
                  className={s.input}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t.ownerNamePh}
                />
                <div className={s.contactHelper}>
                  {isAr
                    ? "رقم المالك للتحقق ومطابقة الملكية"
                    : "Direct owner line for title verification"}
                </div>
              </div>

              {/* Contact 3: Broker Mobile */}
              <div className={s.contactCol}>
                <div className={s.contactColHeader}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Briefcase
                      style={{ width: 14, height: 14, color: "#00b4d8" }}
                    />
                    <span>{t.brokerPhoneLabel}</span>
                  </span>
                  <span className={s.contactTag}>Slot #3</span>
                </div>
                <input
                  ref={brokerPhoneRef}
                  type="tel"
                  className={s.input}
                  value={brokerPhone}
                  onChange={(e) => setBrokerPhone(e.target.value)}
                  placeholder={t.brokerPhonePh}
                  dir="ltr"
                />
                <input
                  type="text"
                  className={s.input}
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  placeholder={t.brokerNamePh}
                />
                <div className={s.contactHelper}>
                  {isAr
                    ? "رقم الوسيط أو البروكر لحفظ العمولة"
                    : "Introducing broker / agency desk line"}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Media Upload */}
          <div>
            <div className={s.sectHeader}>
              <div className={s.sectTitle}>
                <UploadCloud className={s.sectIcon} />
                <span>{t.mediaTitle}</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.mediaSub}
              </span>
            </div>

            <div
              className={`${s.dropzone} ${isDragging ? s.dropzoneActive : ""}`}
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
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <UploadCloud className={s.dropzoneIcon} />
              <div className={s.dropzoneText}>{t.dropzoneText}</div>
              <div className={s.dropzoneSub}>{t.dropzoneSub}</div>
            </div>

            {photos.length > 0 && (
              <div className={s.mediaStrip}>
                {photos.map((src, idx) => (
                  <div key={idx} className={s.mediaItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Upload ${idx + 1}`}
                      className={s.mediaImg}
                    />
                    {idx === 0 && (
                      <span className={s.coverBadge}>{t.coverPhoto}</span>
                    )}
                    <button
                      type="button"
                      className={s.deletePhotoBtn}
                      onClick={() => removePhoto(idx)}
                      title={t.removePhoto}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Notice */}
          {err && (
            <div className={s.errorNotice}>
              <X style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span>{err}</span>
            </div>
          )}

          {/* 5. Sticky Action Bar */}
          <div className={s.submitBar}>
            <div className={s.securityNote}>
              <ShieldCheck className={s.securityIcon} />
              <span>{t.complianceNote}</span>
            </div>

            <div className={s.actionBtns}>
              <button
                type="button"
                className={s.resetBtn}
                onClick={handleReset}
              >
                <RotateCcw
                  style={{
                    width: 13,
                    height: 13,
                    display: "inline",
                    marginInlineEnd: 4,
                  }}
                />
                <span>{t.reset}</span>
              </button>
              <button
                type="button"
                className={s.submitBtn}
                onClick={handleSubmit}
                disabled={sending}
              >
                <Send style={{ width: 15, height: 15 }} />
                <span>{sending ? t.submitting : t.submit}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        {done && (
          <div className={s.modalOverlay}>
            <div className={s.modalContent}>
              <div className={s.modalIcon}>
                <CheckCircle2 style={{ width: 32, height: 32 }} />
              </div>
              <h2 className={s.modalTitle}>{t.doneTitle}</h2>
              <p className={s.modalText}>{t.doneDesc}</p>

              <div className={s.codeBadge}>
                <span>{t.refCode}:</span>
                <strong>{done.ref}</strong>
              </div>

              {done.targetTab && (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  <span>{t.targetTab}: </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {done.targetTab}
                  </strong>
                </div>
              )}

              <div className={s.modalActions}>
                <a
                  href={done.waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.modalBtnPrimary}
                >
                  <MessageCircle style={{ width: 16, height: 16 }} />
                  <span>{t.chatWa}</span>
                </a>

                <div className={s.modalBtnRow}>
                  <a href="/client" className={s.modalBtnSecondary}>
                    <ExternalLink style={{ width: 13, height: 13 }} />
                    <span>{t.viewMap}</span>
                  </a>
                  <a href="/admin/properties" className={s.modalBtnSecondary}>
                    <ExternalLink style={{ width: 13, height: 13 }} />
                    <span>{t.viewAdmin}</span>
                  </a>
                </div>

                <button
                  type="button"
                  className={s.againBtn}
                  onClick={handleReset}
                >
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
