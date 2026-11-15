'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Building2,
  MapPin,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Wand2,
  FileText,
  X,
  Phone,
  UserCheck,
  Briefcase,
  Moon,
  Sun,
  Globe,
  ExternalLink,
  AlertTriangle,
  GitMerge,
  CopyPlus,
  RefreshCw,
  Bot,
  Database,
  Table2,
  ArrowRight,
  Copy,
  Check,
  Users,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';
import styles from './AddListingForm.module.css';

interface PhotoPreview {
  id: string;
  dataUrl: string;
  name: string;
}

interface ConflictDiffPayload {
  code: string;
  message: string;
  existing: Record<string, any>;
  incoming: Record<string, any>;
}

interface OwnerBotIntakeItem {
  id: string;
  code: string;
  compound: string;
  zone: string;
  propertyType: string;
  mode: 'sale' | 'rent';
  area: number;
  gardenArea: number;
  beds: number;
  baths: number;
  price: number;
  finishing: string;
  role: 'OWNER' | 'BROKER' | 'AGENT' | 'EMPLOYEE' | 'BOT';
  contactName: string;
  ownerPhone: string;
  brokerPhone?: string;
  employeeName?: string;
  rawText: string;
  status: 'owner_reply_yes' | 'bot_intake' | 'synced';
  createdAt: string;
  mapLink: string;
}

type SubmitterRole = 'owner' | 'broker' | 'agent' | 'employee';

const COMPOUND_LIST = [
  'Mivida (ميفيدا)',
  'Hyde Park (هايد بارك)',
  'Mountain View iCity (ماونتن فيو آي سيتي)',
  'Mountain View Executive (ماونتن فيو إكزيكيوتيف)',
  'Mountain View Hyde Park (ماونتن فيو هايد بارك)',
  'Eastown (إيستاون سوديك)',
  'Villette (فيليت سوديك)',
  'V Residence - Villette (في ريزيدنس)',
  'Sky Condos - Villette (سكاي كوندوز)',
  'Palm Hills New Cairo (بالم هيلز القاهرة الجديدة)',
  'Palm Hills Capital Gardens (كابيتال جاردنز)',
  'Katameya Heights (قطامية هايتس)',
  'Katameya Dunes (قطامية ديونز)',
  'Katameya Gardens (قطامية جاردنز)',
  'Village Gardens Katameya (فيليدج جاردنز قطامية)',
  'Village Gate (فيليدج جيت)',
  'Swan Lake Residence (سوان ليك ريزيدنس)',
  'The Waterway (ذا ووتر واي)',
  'The Waterway The View (ذا ووتر واي ذا فيو)',
  'Fifth Square (فيفت سكوير المراسم)',
  'Fifth Square Boulevard (فيفت سكوير بوليفارد)',
  'ZED East (زد إيست أورا)',
  'Cairo Festival City (كايرو فيستيفال سيتي)',
  'Taj City (تاج سيتي)',
  'Taj Sultan (تاج سلطان)',
  'Stone Residence (ستون ريزيدنس)',
  'Stone Park (ستون بارك)',
  'District 5 (ديستريكت 5 مراكز)',
  'Madinaty (مدينتي)',
  'Madinaty Executive Villas (مدينتي فلل إكزيكيوتيف)',
  'Al Rehab (الرحاب 1 و 2)',
  'Uptown Cairo (أب تاون كايرو)',
  'Sarai (سراي)',
  'STEI8HT (ستييت LMD)',
  'The Crest (ذا كريست)',
  'The Brooks (ذا بروكس)',
  'Bloomfields (بلومفيلدز)',
  'El Patio Oro (إل باتيو أورو)',
  'El Patio 7 (إل باتيو 7)',
  'El Patio 5 East (إل باتيو 5 إيست)',
  'Lake View Residence (ليك فيو ريزيدنس)',
  'Lake View (ليك فيو)',
  'The Square (ذا سكوير)',
  'Green Square (جرين سكوير)',
  '90 Avenue (90 أفينيو)',
  'Azzar New Cairo (أزار)',
  'Azad & Azad Views (آزاد)',
  'La Mirada (لا ميرادا)',
  'Layan Residence (لايان ريزيدنس)',
  'Jayd (جايد)',
  'Aeon (إيون)',
  'Galleria Moon Valley (جاليريا مون فالي)',
  'Creek Town (كريك تاون)',
  'Amorada (أمورادا)',
  'City Gate (سيتي جيت)',
  'Trio Gardens (تريو جاردنز)',
  'The Address East (ذا أدريس إيست)',
  'Promenade Wadi Degla (بروميناد وادي دجلة)',
  'The Icon Residence (ذا آيكون ريزيدنس)',
  'Al Burouj (البروج الشروق)',
  'El Shorouk City (مدينة الشروق)',
  'Mostakbal City (مدينة المستقبل)',
  'Beit Al Watan (بيت الوطن)',
  'Al Narges / Narges Villas (النرجس)',
  'Al Banafsaj (البنفسج)',
  'Al Andalus (الأندلس)',
  'El Choueifat (الشويفات)',
  'El Lotus (اللوتس)',
  'El Koronfel (القرنفل)',
  'South Academy (جنوب الأكاديمية)',
  'North 90th / South 90th (شارع التسعين)',
  'Gardenia City (جاردينيا سيتي)',
  'Dar Misr (دار مصر)',
  'Cairo Plaza (كايرو بلازا المطرية)',
  'New Capital (العاصمة الإدارية)',
  'Badya (باديا 6 أكتوبر)',
  'Other / Custom',
];

const PROPERTY_TYPES = [
  { value: 'Apartment', en: 'Apartment', ar: 'شقة (Apartment)' },
  { value: 'Standalone Villa', en: 'Standalone Villa', ar: 'فيلا مستقلة (Standalone)' },
  { value: 'Townhouse', en: 'Townhouse', ar: 'تاون هاوس (Townhouse)' },
  { value: 'Twin House', en: 'Twin House', ar: 'توين هاوس (Twin House)' },
  { value: 'Duplex', en: 'Duplex / iVilla', ar: 'دوبلكس / آي فيلا (Duplex)' },
  { value: 'Penthouse', en: 'Penthouse', ar: 'بنتهاوس (Penthouse)' },
  { value: 'Studio', en: 'Studio', ar: 'ستوديو (Studio)' },
  { value: 'Chalet', en: 'Chalet', ar: 'شاليه (Chalet)' },
  { value: 'Administrative Office', en: 'Office / Commercial', ar: 'مكتب إداري / تجاري' },
];

const FINISHING_OPTIONS = [
  { value: 'Fully Finished', en: 'Fully Finished (Super Lux)', ar: 'تشطيب كامل (سوبر لوكس)' },
  { value: 'Semi-Finished', en: 'Semi-Finished', ar: 'نصف تشطيب' },
  { value: 'Core & Shell', en: 'Core & Shell', ar: 'طوب أحمر / بدون تشطيب' },
  { value: 'Furnished', en: 'Furnished', ar: 'مفروش بالكامل' },
];

const SAMPLE_LISTINGS = [
  {
    labelEn: 'Owner Villa (Mivida)',
    labelAr: 'فيلا مالك (ميفيدا)',
    role: 'owner' as SubmitterRole,
    text: `للبيع فيلا مستقلة في كمبوند ميفيدا إعمار التجمع الخامس
مساحة المباني 390 متر - مساحة الأرض 520 متر - جاردن 260 متر
4 غرف نوم ماستر + غرفة ناني + 5 حمام
تشطيب كامل سوبر لوكس بالتكييفات والمطبخ
موقع مميز جداً على لاندسكيب مفتوح
السعر المطلوب: 42,000,000 جنيه كاش
للتواصل مالك أصلي: 01092048333`,
  },
  {
    labelEn: 'Employee Apt (Hyde Park)',
    labelAr: 'شقة موظف (هايد بارك)',
    role: 'employee' as SubmitterRole,
    text: `شقة للبيع في هايد بارك التجمع الخامس Hyde Park
مساحة 195 متر - الدور الثاني بحري صريح
3 غرف نوم + 3 حمام + ريسبشن 3 قطع
نصف تشطيب استلام فوري خالصة الأقساط
السعر: 9,800,000 جنيه
رقم المالك: 01012345678 - موظف سييرا: Ahmed Saeed SE-104`,
  },
  {
    labelEn: 'Broker Rental (Eastown)',
    labelAr: 'إيجار بروكر (إيستاون)',
    role: 'broker' as SubmitterRole,
    text: `شقة للإيجار المفروش في كمبوند إيستاون سوديك التجمع الخامس
مساحة 165 متر - 3 غرف نوم - 2 حمام
فرش مودرن أول سكن قريبة من الكلوب هاوس
الإيجار الشهري: 95,000 جنيه
للتواصل بروكر: 01122334455`,
  },
];

export interface AddListingFormProps {
  defaultLang?: 'en' | 'ar';
  isAdmin?: boolean;
}

export default function AddListingForm({ defaultLang, isAdmin = false }: AddListingFormProps = {}) {
  const { lang, toggleLang, theme, toggleTheme } = useSite();
  const isAr = (defaultLang ?? lang) === 'ar';

  // Active portal tab: 'studio' (3-Step Stitch Intake) | 'intakes' (Owners & Bot Intake Resume - Admin Only)
  const [activeTab, setActiveTab] = useState<'studio' | 'intakes'>('studio');

  // Form State
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  const [mode, setMode] = useState<'sale' | 'rent'>('sale');
  const [compound, setCompound] = useState('Mivida');
  const [customCompound, setCustomCompound] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [finishing, setFinishing] = useState('Fully Finished');

  const [area, setArea] = useState<string>('185');
  const [gardenArea, setGardenArea] = useState<string>('0');
  const [beds, setBeds] = useState<number>(3);
  const [baths, setBaths] = useState<number>(3);
  const [price, setPrice] = useState<string>('12500000');
  const [code, setCode] = useState<string>('');

  // Role & Contact Entities (Owner / Broker / Agent / Employee)
  const [submitterRole, setSubmitterRole] = useState<SubmitterRole>('owner');
  const [primaryMobile, setPrimaryMobile] = useState('');
  const [contactName, setContactName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [comment, setComment] = useState('');

  // Photos
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Persistence State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictDiffPayload | null>(null);
  const [copiedAd, setCopiedAd] = useState(false);

  const [submittedResult, setSubmittedResult] = useState<{
    code: string;
    id: string;
    sheetUrl?: string;
    targetTab?: string;
    isMerged?: boolean;
    role?: string;
    employeeName?: string;
    adCopy?: string;
  } | null>(null);

  // Owners & Bot Intakes Resume State
  const [intakeItems, setIntakeItems] = useState<OwnerBotIntakeItem[]>([]);
  const [intakesLoading, setIntakesLoading] = useState(false);
  const [intakeFilter, setIntakeFilter] = useState<'ALL' | 'BOT' | 'OWNER' | 'EMPLOYEE' | 'BROKER'>('ALL');

  const DRAFT_STORAGE_KEY = 'sierra_easy_listing_draft_v2';

  // Fetch Owners & Bot Intakes
  const fetchIntakes = useCallback(async () => {
    if (!isAdmin) return;
    setIntakesLoading(true);
    try {
      const res = await fetch('/api/listings/owner-intakes');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        setIntakeItems(data.items);
      }
    } catch {
      // Non-fatal
    } finally {
      setIntakesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchIntakes();
    }
  }, [fetchIntakes, isAdmin]);

  // Auto-generate code if empty or auto-generated
  useEffect(() => {
    if (!code || code.startsWith('SE-')) {
      const prefix = (compound === 'Other / Custom' ? customCompound : compound)
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 2)
        .toUpperCase() || 'SE';
      const typeChar = propertyType.slice(0, 1).toUpperCase();
      const mChar = mode === 'rent' ? 'R' : 'S';
      const randomDigits = Math.floor(100 + Math.random() * 900);
      setCode(`SE-${prefix}-${mChar}${typeChar}${beds}-${randomDigits}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compound, customCompound, propertyType, mode, beds]);

  // Restore saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rawText) setRawText(parsed.rawText);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.compound) setCompound(parsed.compound);
        if (parsed.customCompound) setCustomCompound(parsed.customCompound);
        if (parsed.propertyType) setPropertyType(parsed.propertyType);
        if (parsed.finishing) setFinishing(parsed.finishing);
        if (parsed.area) setArea(parsed.area);
        if (parsed.gardenArea) setGardenArea(parsed.gardenArea);
        if (typeof parsed.beds === 'number') setBeds(parsed.beds);
        if (typeof parsed.baths === 'number') setBaths(parsed.baths);
        if (parsed.price) setPrice(parsed.price);
        if (parsed.code) setCode(parsed.code);
        if (parsed.submitterRole) setSubmitterRole(parsed.submitterRole);
        if (parsed.primaryMobile) setPrimaryMobile(parsed.primaryMobile);
        if (parsed.contactName) setContactName(parsed.contactName);
        if (parsed.employeeName) setEmployeeName(parsed.employeeName);
        if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone);
        if (parsed.brokerPhone) setBrokerPhone(parsed.brokerPhone);
        if (parsed.comment) setComment(parsed.comment);
        if (
          parsed.rawText ||
          parsed.primaryMobile ||
          parsed.ownerPhone ||
          parsed.brokerPhone ||
          parsed.employeeName
        ) {
          setHasRestoredDraft(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save draft to localStorage automatically
  useEffect(() => {
    try {
      const payload = {
        rawText,
        mode,
        compound,
        customCompound,
        propertyType,
        finishing,
        area,
        gardenArea,
        beds,
        baths,
        price,
        code,
        submitterRole,
        primaryMobile,
        contactName,
        employeeName,
        ownerPhone,
        brokerPhone,
        comment,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    rawText,
    mode,
    compound,
    customCompound,
    propertyType,
    finishing,
    area,
    gardenArea,
    beds,
    baths,
    price,
    code,
    submitterRole,
    primaryMobile,
    contactName,
    employeeName,
    ownerPhone,
    brokerPhone,
    comment,
  ]);

  // AI Smart Extract Handler
  const handleSmartParse = useCallback(
    async (textToParse?: string, roleOverride?: SubmitterRole) => {
      const source = (textToParse ?? rawText).trim();
      if (source.length < 5) {
        setErrorMsg(
          isAr
            ? 'يرجى لصق نص الإعلان أولاً ليتم استخراج البيانات تلقائياً.'
            : 'Please paste the listing text first to auto-extract fields.',
        );
        return;
      }

      setIsParsing(true);
      setErrorMsg(null);
      setParseFeedback(null);
      if (roleOverride) setSubmitterRole(roleOverride);

      try {
        const res = await fetch('/api/listings/easy-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: source }),
        });

        const data = await res.json();
        if (!res.ok || !data.parsed) {
          throw new Error(data.error || 'Failed to parse text');
        }

        const p = data.parsed;
        if (p.mode) setMode(p.mode);
        if (p.compound) {
          const matched = COMPOUND_LIST.find(
            (c) => c.toLowerCase() === String(p.compound).toLowerCase(),
          );
          if (matched) {
            setCompound(matched);
          } else {
            setCompound('Other / Custom');
            setCustomCompound(p.compound);
          }
        }
        if (p.propertyType) setPropertyType(p.propertyType);
        if (p.finishing) setFinishing(p.finishing);
        if (p.area > 0) setArea(String(p.area));
        if (p.gardenArea >= 0) setGardenArea(String(p.gardenArea));
        if (typeof p.beds === 'number') setBeds(p.beds);
        if (typeof p.baths === 'number') setBaths(p.baths);
        if (p.price > 0) setPrice(String(p.price));
        if (p.suggestedCode) setCode(p.suggestedCode);

        // Extract phones & role hints
        const extractedPhone = p.ownerPhone || p.brokerPhone || '';
        if (extractedPhone) {
          setPrimaryMobile(extractedPhone);
        }
        if (p.ownerPhone) setOwnerPhone(p.ownerPhone);
        if (p.brokerPhone) setBrokerPhone(p.brokerPhone);
        if (p.agentName) {
          setEmployeeName(p.agentName);
          if (!roleOverride) setSubmitterRole('employee');
        } else if (!roleOverride) {
          if (source.includes('بروكر') || source.includes('وسيط') || source.toLowerCase().includes('broker')) {
            setSubmitterRole('broker');
          } else if (source.includes('موظف') || source.toLowerCase().includes('employee')) {
            setSubmitterRole('employee');
          } else {
            setSubmitterRole('owner');
          }
        }
        if (p.notes) setComment(p.notes);

        setParseFeedback(
          isAr
            ? `تم استخراج البيانات بنجاح بنسبة ثقة ${p.confidence || 92}% — راجع الحقول بالأسفل ثم اضغط مزامنة ونشر.`
            : `Smart Extraction complete (${p.confidence || 92}% confidence) — review fields below & publish.`,
        );
      } catch {
        setErrorMsg(
          isAr
            ? 'تعذر التحليل التلقائي، يمكنك تعبئة الحقول يدوياً.'
            : 'Auto-parse encountered an issue; you can fill the fields manually.',
        );
      } finally {
        setIsParsing(false);
      }
    },
    [rawText, isAr],
  );

  // Resume an Owner / Bot Intake item into the 3-step studio
  const handleResumeIntake = (item: OwnerBotIntakeItem) => {
    setRawText(item.rawText);
    setMode(item.mode);
    const matched = COMPOUND_LIST.find(
      (c) => c.toLowerCase() === item.compound.toLowerCase(),
    );
    if (matched) {
      setCompound(matched);
    } else {
      setCompound('Other / Custom');
      setCustomCompound(item.compound);
    }
    setPropertyType(item.propertyType);
    setFinishing(item.finishing || 'Fully Finished');
    setArea(String(item.area || 180));
    setGardenArea(String(item.gardenArea || 0));
    setBeds(item.beds || 3);
    setBaths(item.baths || 2);
    setPrice(String(item.price || 0));
    setCode(item.code);
    setPrimaryMobile(item.ownerPhone || item.brokerPhone || '');
    setOwnerPhone(item.ownerPhone || '');
    setBrokerPhone(item.brokerPhone || '');
    setContactName(item.contactName || '');
    if (item.employeeName) setEmployeeName(item.employeeName);
    setSubmitterRole(
      item.role === 'EMPLOYEE'
        ? 'employee'
        : item.role === 'BROKER'
          ? 'broker'
          : item.role === 'AGENT'
            ? 'agent'
            : 'owner',
    );
    setComment(item.rawText);
    setParseFeedback(
      isAr
        ? `🤖 تم تحميل بيانات وحدة الأونر/البوت (${item.code}) — جاهزة للمراجعة والنشر الفوري!`
        : `🤖 Loaded Owner/Bot intake (${item.code}) — ready for immediate verification & multi-sync!`,
    );
    setActiveTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Photo Upload Handlers
  const processFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files)
      .slice(0, 10)
      .forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = String(ev.target?.result || '');
          if (!dataUrl) return;
          setPhotos((prev) => {
            if (prev.length >= 10) return prev;
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                dataUrl,
                name: file.name,
              },
            ];
          });
        };
        reader.readAsDataURL(file);
      });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const resetForm = () => {
    setRawText('');
    setParseFeedback(null);
    setErrorMsg(null);
    setArea('185');
    setGardenArea('0');
    setPrice('12500000');
    setPrimaryMobile('');
    setContactName('');
    setOwnerPhone('');
    setBrokerPhone('');
    setEmployeeName('');
    setComment('');
    setPhotos([]);
    setHasRestoredDraft(false);
    setConflictData(null);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Submit Handler (supports conflict resolution action)
  const executeSubmission = async (
    conflictAction?: 'check_only' | 'merge' | 'new_code' | 'overwrite',
  ) => {
    setErrorMsg(null);

    const rawCompound =
      compound === 'Other / Custom' ? customCompound.trim() : compound.trim();
    if (!rawCompound) {
      setErrorMsg(isAr ? 'يرجى تحديد اسم الكمبوند أو المنطقة.' : 'Please select or enter a compound name.');
      return;
    }
    // Clean canonical compound name (strip Arabic annotations in parentheses, e.g. "Mivida (ميفيدا)" -> "Mivida")
    const finalCompound = rawCompound.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawCompound;

    const numericPrice = Number(String(price).replace(/,/g, ''));
    if (!numericPrice || numericPrice <= 0) {
      setErrorMsg(isAr ? 'يرجى إدخال سعر صحيح للوحدة.' : 'Please enter a valid price.');
      return;
    }

    const effectiveMobile = (primaryMobile || ownerPhone || brokerPhone).trim();
    if (!effectiveMobile) {
      setErrorMsg(
        isAr
          ? 'يرجى إدخال رقم الموبايل / الواتساب لتعريف المُعلن (مالك / بروكر / وكيل / موظف).'
          : 'Please enter a Mobile / WhatsApp number for the publisher (Owner / Broker / Agent / Employee).',
      );
      return;
    }

    if (submitterRole === 'employee' && !employeeName.trim()) {
      setErrorMsg(
        isAr
          ? 'يرجى كتابة اسم الموظف أو كود الموظف لإتمام تسجيل الوحدة باسمه.'
          : 'Please enter the Employee Name / Code to attribute this listing.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const isBroker = submitterRole === 'broker';
      const resolvedOwnerPhone =
        ownerPhone.trim() || (!isBroker ? effectiveMobile : '');
      const resolvedBrokerPhone =
        brokerPhone.trim() || (isBroker ? effectiveMobile : '');
      const resolvedStaffName =
        submitterRole === 'employee' || submitterRole === 'agent'
          ? employeeName.trim() || contactName.trim() || 'Sierra Staff'
          : '';

      const res = await fetch('/api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          compound: finalCompound,
          propertyType,
          mode,
          beds: Number(beds) || 0,
          baths: Number(baths) || 0,
          area: Number(area) || 0,
          gardenArea: Number(gardenArea) || 0,
          price: numericPrice,
          finishing,
          ownerName:
            contactName.trim() ||
            (isBroker
              ? 'Broker Submission'
              : submitterRole === 'employee'
                ? `Owner (via ${resolvedStaffName})`
                : 'Direct Owner'),
          ownerType:
            submitterRole === 'broker'
              ? 'Broker'
              : submitterRole === 'employee'
                ? 'Employee'
                : submitterRole === 'agent'
                  ? 'Agent'
                  : 'Owner',
          mobile: effectiveMobile,
          ownerPhone: resolvedOwnerPhone,
          brokerPhone: resolvedBrokerPhone,
          brokerName: isBroker ? contactName.trim() || 'Authorized Broker' : '',
          agentName: resolvedStaffName,
          employeeName: resolvedStaffName,
          submitterType: submitterRole,
          rawText,
          comment: comment || rawText,
          photos: photos.map((p) => p.dataUrl),
          conflictAction: conflictAction || 'check_only',
        }),
      });

      const data = await res.json();

      // Handle 409 Conflict Detection
      if (res.status === 409 && data.conflict) {
        setConflictData({
          code: data.code,
          message: data.message,
          existing: data.existing,
          incoming: data.incoming,
        });
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Submission failed');
      }

      setConflictData(null);
      setHasRestoredDraft(false);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore
      }

      const generatedAd = isAr
        ? `🏛️ *Sierra Estates — وحدة مميزة (${mode === 'rent' ? 'للإيجار' : 'للبيع'})*\n📍 الكمبوند: ${finalCompound}\n🏠 النوع: ${propertyType} (${finishing})\n📐 المساحة: ${area} م² | 🛏️ ${beds} غرف | 🛁 ${baths} حمام\n💰 السعر: ${numericPrice.toLocaleString('en-US')} ج.م\n🔖 كود الوحدة: ${data.code || code}\n📲 للتواصل عبر سييرا إستيتس: +201092048333`
        : `🏛️ *Sierra Estates — Featured ${propertyType} (${mode === 'rent' ? 'For Rent' : 'For Sale'})*\n📍 Compound: ${finalCompound}\n📐 Area: ${area} m² | 🛏️ ${beds} Beds | 🛁 ${baths} Baths\n✨ Finishing: ${finishing}\n💰 Price: EGP ${numericPrice.toLocaleString('en-US')}\n🔖 Code: ${data.code || code}\n📲 Contact Sierra Estates: +201092048333`;

      setSubmittedResult({
        code: data.code || code,
        id: data.id || data.code || code,
        sheetUrl: data.sheetSync?.inventoryUrl,
        targetTab: data.targetTab,
        isMerged: data.isMerged,
        role: submitterRole.toUpperCase(),
        employeeName: resolvedStaffName || undefined,
        adCopy: generatedAd,
      });

      fetchIntakes();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isAr
            ? 'حدث خطأ أثناء إرسال الوحدة. يرجى المحاولة مرة أخرى.'
            : 'An error occurred while submitting the listing. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSubmission('check_only');
  };

  const formattedPricePreview = (() => {
    const n = Number(String(price).replace(/,/g, ''));
    if (!n || isNaN(n)) return 'EGP 0';
    return `EGP ${n.toLocaleString('en-US')}`;
  })();

  const filteredIntakes = intakeItems.filter((item) => {
    if (intakeFilter === 'ALL') return true;
    if (intakeFilter === 'BOT') return item.role === 'BOT' || item.status === 'owner_reply_yes';
    return item.role === intakeFilter;
  });

  const activeCompoundName = compound === 'Other / Custom' ? customCompound || 'New Cairo' : compound;

  return (
    <div className={styles.page} data-theme={theme} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.wrap}>
        {/* Black Friday 25% OFF Service Cross-Link Banner */}
        <div className={styles.bfPromoStrip}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={styles.bfPromoTag}>
              <Sparkles style={{ width: 12, height: 12 }} />
              <span>BLACK FRIDAY 25% OFF</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {isAr
                ? 'تبحث عن شراء أو إيجار وحدة؟ احصل على خصم 25% على رسوم الخدمة حتى 25 نوفمبر 2026!'
                : 'Looking to Buy or Rent? Claim 25% OFF Service Fees valid till 25th November 2026!'}
            </span>
          </div>
          <Link href="/request" className={styles.bfPromoLink}>
            <span>{isAr ? 'اطلب وحدتك بخصم 25% ←' : 'Add Property Request (25% OFF) →'}</span>
          </Link>
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.badge}>
              <span className={styles.pulseDot} />
              <span>
                {isAr
                  ? 'بوابة الإدراج الذكي والمزامنة الموحدة · Stitch Studio'
                  : 'Sierra Stitch Easy Listing & Universal Multi-Sync'}
              </span>
            </div>

            <div className={styles.headerControls}>
              <button
                type="button"
                className={styles.langBtn}
                onClick={toggleLang}
              >
                <Globe style={{ width: 14, height: 14 }} />
                <span>{isAr ? 'English' : 'العربية'}</span>
              </button>
              <button
                type="button"
                className={styles.langBtn}
                onClick={toggleTheme}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun style={{ width: 14, height: 14 }} />
                ) : (
                  <Moon style={{ width: 14, height: 14 }} />
                )}
              </button>
            </div>
          </div>

          <h1 className={styles.title}>
            {isAr ? (
              <>
                أضف وحدتك مع <em>سييرا إستيتس</em> في 3 خطوات
              </>
            ) : (
              <>
                List your unit with <em>Sierra Estates</em> in 3 Simple Steps
              </>
            )}
          </h1>
          <p className={styles.subtitle}>
            {isAr
              ? isAdmin
                ? 'مربوطة مباشرة مع قاعدة بيانات Supabase، شيت الإنفنتوري أونلاين، الخريطة التفاعلية GIS، ولوحة تحكم الإدارة وبوت متابعة الملاك.'
                : 'مربوطة مباشرة مع قاعدة بيانات Supabase، شيت الإنفنتوري أونلاين، والخريطة التفاعلية GIS لنشر وحدتك وتنسيقها مع المشترين والمستأجرين المهتمين.'
              : isAdmin
                ? 'Directly wired to Supabase Inventory, Online Google Sheets, Interactive GIS Map, Admin Command Deck, and the WhatsApp Owners Bot Resume workflow.'
                : 'Directly wired to Supabase Inventory, Online Google Sheets, and Interactive GIS Map to connect your property with active buyers and tenants.'}
          </p>
        </header>

        {/* Tabs Switcher & Live Sync Channels Pill Strip */}
        <div className={styles.tabsBar}>
          {isAdmin ? (
            <div className={styles.tabPills} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'studio'}
                className={`${styles.tabBtn} ${activeTab === 'studio' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('studio')}
              >
                <Wand2 style={{ width: 15, height: 15 }} />
                <span>{isAr ? 'إضافة وحدة جديدة (3 خطوات)' : 'New Listing Studio (3 Steps)'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'intakes'}
                className={`${styles.tabBtn} ${activeTab === 'intakes' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('intakes')}
              >
                <Bot style={{ width: 15, height: 15 }} />
                <span>
                  {isAr ? 'ردود الأونرز والبوت (نعم متاح)' : 'Owners & Bot Intake Resume'}
                </span>
                <span className={styles.tabCount}>{intakeItems.length}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={styles.stepBadge}>
                {isAr ? 'استوديو الإدراج الذكي المباشر' : 'Direct Smart Listing Studio'}
              </span>
            </div>
          )}

          <div className={styles.syncStrip}>
            <span className={styles.syncPill}>
              <span className={styles.syncDot} />
              <Database style={{ width: 12, height: 12 }} />
              <span>Supabase DB</span>
            </span>
            <span className={styles.syncPill}>
              <span className={styles.syncDot} />
              <Table2 style={{ width: 12, height: 12 }} />
              <span>Online Sheet</span>
            </span>
            <span className={styles.syncPill}>
              <span className={styles.syncDot} />
              <MapPin style={{ width: 12, height: 12 }} />
              <span>GIS Map Pin</span>
            </span>
          </div>
        </div>

        {/* Restored Draft Notice */}
        {hasRestoredDraft && activeTab === 'studio' && (
          <div className={styles.draftBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw style={{ width: 15, height: 15 }} />
              <span>
                {isAr
                  ? 'تم استعادة مسودة غير محفوظة من جلستك السابقة.'
                  : 'Unsaved draft restored from your previous session.'}
              </span>
            </div>
            <button type="button" className={styles.discardBtn} onClick={resetForm}>
              {isAr ? 'مسح المسودة' : 'Discard Draft'}
            </button>
          </div>
        )}

        {/* TAB 1: 3-STEP STITCH LISTING STUDIO */}
        {activeTab === 'studio' || !isAdmin ? (
          <form className={styles.formCard} onSubmit={handleSubmit}>
            {/* STEP 1: Smart Paste Box */}
            <section>
              <div className={styles.sectHeader}>
                <div className={styles.sectTitle}>
                  <span className={styles.stepBadge}>STEP 01</span>
                  <Wand2 className={styles.sectIcon} />
                  <span>
                    {isAr
                      ? 'لصق رسالة الواتساب أو تفاصيل الوحدة (استخراج ذكي AI)'
                      : 'Paste WhatsApp Message or Property Details (AI Auto-Fill)'}
                  </span>
                </div>

                <div className={styles.samplePills}>
                  {SAMPLE_LISTINGS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.samplePill}
                      onClick={() => {
                        setRawText(s.text);
                        handleSmartParse(s.text, s.role);
                      }}
                    >
                      <FileText style={{ width: 12, height: 12 }} />
                      <span>{isAr ? s.labelAr : s.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.pasteWrapper}>
                <textarea
                  className={styles.pasteArea}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    isAr
                      ? 'الصق نص رسالة الواتساب من المالك أو البروكر أو الموظف هنا... (مثال: للبيع فيلا في ميفيدا 390م 4 غرف بسعر 42 مليون تليفون 010...)'
                      : 'Paste the raw WhatsApp message from Owner, Broker, Agent, or Employee here... (e.g. Apartment in Mivida 195m 3 beds 14.5M EGP 010...)'
                  }
                />
              </div>

              <div className={styles.pasteFooter}>
                <span className={styles.charCount}>
                  {rawText.length} {isAr ? 'حرف' : 'chars'}
                </span>

                <button
                  type="button"
                  className={styles.parseBtn}
                  onClick={() => handleSmartParse()}
                  disabled={isParsing}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  <span>
                    {isParsing
                      ? isAr
                        ? 'جاري التحليل الذكي...'
                        : 'Extracting Specs...'
                      : isAr
                        ? '✨ استخراج البيانات وتعبئة الحقول تلقائياً'
                        : '✨ Extract & Auto-Fill Specs'}
                  </span>
                </button>
              </div>

              {parseFeedback && (
                <div className={styles.parseFeedback}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#10b981', flexShrink: 0 }} />
                  <span>{parseFeedback}</span>
                </div>
              )}
            </section>

            {/* STEP 2: Structured Property Specs & GIS Map Link */}
            <section>
              <div className={styles.sectHeader}>
                <div className={styles.sectTitle}>
                  <span className={styles.stepBadge}>STEP 02</span>
                  <Building2 className={styles.sectIcon} />
                  <span>
                    {isAr
                      ? 'مواصفات الوحدة العقارية وموقع الخريطة'
                      : 'Property Specifications & GIS Map Pin'}
                  </span>
                </div>

                <a
                  href={`/compounds?q=${encodeURIComponent(activeCompoundName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.samplePill}
                  style={{ textDecoration: 'none' }}
                >
                  <MapPin style={{ width: 12, height: 12, color: '#c8961a' }} />
                  <span>
                    {isAr
                      ? `معاينة ${activeCompoundName} على الخريطة`
                      : `Preview ${activeCompoundName} on GIS Map`}
                  </span>
                  <ExternalLink style={{ width: 11, height: 11 }} />
                </a>
              </div>

              <div className={styles.grid}>
                {/* Sale / Rent Toggle */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    {isAr ? 'نوع العرض' : 'Deal Mode'}
                  </label>
                  <div className={styles.segToggle}>
                    <button
                      type="button"
                      className={`${styles.segBtn} ${mode === 'sale' ? styles.segBtnActive : ''}`}
                      onClick={() => setMode('sale')}
                    >
                      {isAr ? 'للبيع (Resale)' : 'For Sale'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.segBtn} ${mode === 'rent' ? styles.segBtnActive : ''}`}
                      onClick={() => setMode('rent')}
                    >
                      {isAr ? 'للإيجار (Rent)' : 'For Rent'}
                    </button>
                  </div>
                </div>

                {/* Compound Selector */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    {isAr ? 'الكمبوند / المنطقة' : 'Compound / Location'}
                  </label>
                  <select
                    className={styles.select}
                    value={compound}
                    onChange={(e) => setCompound(e.target.value)}
                  >
                    {COMPOUND_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Type */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    {isAr ? 'نوع الوحدة' : 'Property Type'}
                  </label>
                  <select
                    className={styles.select}
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {isAr ? pt.ar : pt.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Compound Input if "Other / Custom" */}
                {compound === 'Other / Custom' && (
                  <div className={`${styles.field} ${styles.col12}`}>
                    <label className={styles.label}>
                      {isAr ? 'اكتب اسم الكمبوند أو المنطقة' : 'Enter Custom Compound / Area Name'}
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={customCompound}
                      onChange={(e) => setCustomCompound(e.target.value)}
                      placeholder={isAr ? 'مثال: كمبوند اللوتس الجديدة' : 'e.g. New Lotus Compound'}
                      required
                    />
                  </div>
                )}

                {/* Area (m²) */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    <span>{isAr ? 'مساحة المباني (م²)' : 'Built-up Area (m²)'}</span>
                    <span className={styles.labelSub}>BUA</span>
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    min={20}
                    required
                  />
                </div>

                {/* Garden Area (m²) */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    <span>{isAr ? 'مساحة الحديقة / الرووف (م²)' : 'Garden / Roof (m²)'}</span>
                    <span className={styles.labelSub}>{isAr ? 'اختياري' : 'Optional'}</span>
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    value={gardenArea}
                    onChange={(e) => setGardenArea(e.target.value)}
                    min={0}
                  />
                </div>

                {/* Finishing */}
                <div className={`${styles.field} ${styles.col4}`}>
                  <label className={styles.label}>
                    {isAr ? 'حالة التشطيب' : 'Finishing'}
                  </label>
                  <select
                    className={styles.select}
                    value={finishing}
                    onChange={(e) => setFinishing(e.target.value)}
                  >
                    {FINISHING_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {isAr ? f.ar : f.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bedrooms Chips */}
                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    {isAr ? 'عدد غرف النوم' : 'Bedrooms'}
                  </label>
                  <div className={styles.chipsRow}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles.chipBtn} ${beds === n ? styles.chipBtnActive : ''}`}
                        onClick={() => setBeds(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bathrooms Chips */}
                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    {isAr ? 'عدد الحمامات' : 'Bathrooms'}
                  </label>
                  <div className={styles.chipsRow}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles.chipBtn} ${baths === n ? styles.chipBtnActive : ''}`}
                        onClick={() => setBaths(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price (EGP) */}
                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    <span>
                      {mode === 'rent'
                        ? isAr
                          ? 'قيمة الإيجار الشهري (ج.م)'
                          : 'Monthly Rent (EGP)'
                        : isAr
                          ? 'السعر الإجمالي المطلوب (ج.م)'
                          : 'Total Asking Price (EGP)'}
                    </span>
                    <span className={styles.labelSub} style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      {formattedPricePreview}
                    </span>
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min={1000}
                    required
                  />
                </div>

                {/* Sierra Unit Code */}
                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    <span>{isAr ? 'كود الوحدة الموحد' : 'Sierra Unit Code'}</span>
                    <span className={styles.labelSub}>{isAr ? 'تلقائي / قابل للتعديل' : 'Auto / Editable'}</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              </div>
            </section>

            {/* STEP 3: Role Selector (Owner / Broker / Agent / Employee) + Mobile + Photos */}
            <section>
              <div className={styles.contactsBox}>
                <div className={styles.contactsHeader}>
                  <div className={styles.contactsTitle}>
                    <span className={styles.stepBadge}>STEP 03</span>
                    <Users style={{ width: 16, height: 16, color: 'var(--gold)' }} />
                    <span>
                      {isAr
                        ? 'تحديد صفة صاحب الرقم (مالك / بروكر / وكيل / موظف) وبيانات التواصل'
                        : 'Define Submitter Role (Owner / Broker / Agent / Employee) & Mobile'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {isAr
                      ? 'يوجه الوحدة تلقائياً إلى الشيت المخصص (Owners أو Brokers)'
                      : 'Auto-routes listing to the matching Google Sheet & Supabase table'}
                  </span>
                </div>

                {/* 4-Role Selector Cards */}
                <div className={styles.roleSelectorGrid} role="radiogroup" aria-label="Submitter Role">
                  <button
                    type="button"
                    className={`${styles.roleCardBtn} ${submitterRole === 'owner' ? styles.roleCardBtnActive : ''}`}
                    onClick={() => setSubmitterRole('owner')}
                  >
                    <div className={styles.roleCardTop}>
                      <span>{isAr ? '👑 مالك أصلي' : '👑 Direct Owner'}</span>
                      {submitterRole === 'owner' && <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--gold)' }} />}
                    </div>
                    <span className={styles.roleCardSub}>
                      {isAr ? 'يُدرج في شيت الملاك + الإنفتوري' : 'Syncs to Owners Sheet & Main Inventory'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.roleCardBtn} ${submitterRole === 'broker' ? styles.roleCardBtnActive : ''}`}
                    onClick={() => setSubmitterRole('broker')}
                  >
                    <div className={styles.roleCardTop}>
                      <span>{isAr ? '💼 وسيط / بروكر' : '💼 Broker'}</span>
                      {submitterRole === 'broker' && <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--gold)' }} />}
                    </div>
                    <span className={styles.roleCardSub}>
                      {isAr ? 'يُدرج في شيت الوسطاء + الخريطة' : 'Syncs to Brokers Sheet & Map Sheet'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.roleCardBtn} ${submitterRole === 'agent' ? styles.roleCardBtnActive : ''}`}
                    onClick={() => setSubmitterRole('agent')}
                  >
                    <div className={styles.roleCardTop}>
                      <span>{isAr ? '🏷️ وكيل عقاري' : '🏷️ Agent'}</span>
                      {submitterRole === 'agent' && <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--gold)' }} />}
                    </div>
                    <span className={styles.roleCardSub}>
                      {isAr ? 'وكيل معتمد مع حفظ اسم الوكيل' : 'Authorized Agent with name attribution'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.roleCardBtn} ${submitterRole === 'employee' ? styles.roleCardBtnActive : ''}`}
                    onClick={() => setSubmitterRole('employee')}
                  >
                    <div className={styles.roleCardTop}>
                      <span>{isAr ? '🏢 موظف بالشركة' : '🏢 Sierra Employee'}</span>
                      {submitterRole === 'employee' && <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--gold)' }} />}
                    </div>
                    <span className={styles.roleCardSub}>
                      {isAr ? 'يتيح كتابة اسم الموظف ورقم المالك' : 'Write Employee Name + Owner mobile'}
                    </span>
                  </button>
                </div>

                {/* Employee / Agent Name Highlight Box when Employee or Agent is selected */}
                {(submitterRole === 'employee' || submitterRole === 'agent') && (
                  <div className={styles.employeeHighlightBox}>
                    <div className={styles.contactColHeader}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontWeight: 700 }}>
                        <UserCheck style={{ width: 15, height: 15 }} />
                        {submitterRole === 'employee'
                          ? isAr
                            ? 'اسم موظف سييرا إستيتس / الكود (مطلوب للموظف)'
                            : 'Sierra Employee Name & Code (Required for Employee)'
                          : isAr
                            ? 'اسم الوكيل العقاري (Agent Name)'
                            : 'Real Estate Agent Name'}
                      </span>
                      <span className={styles.contactTag}>
                        {submitterRole === 'employee'
                          ? isAr
                            ? 'موظف الشركة'
                            : 'EMPLOYEE ATTRIBUTION'
                          : 'AGENT'}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder={
                        isAr
                          ? 'اكتب اسم الموظف بالكامل هنا (مثال: أحمد سعيد - SE-104)'
                          : 'Enter Employee Full Name / Code (e.g. Ahmed Saeed - SE-104)'
                      }
                      required={submitterRole === 'employee'}
                    />
                  </div>
                )}

                {/* Primary Mobile & Contact Details Grid */}
                <div className={styles.contactsGrid}>
                  {/* Column 1: Primary Mobile Number (defined by selected role) */}
                  <div className={styles.contactCol}>
                    <div className={styles.contactColHeader}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Phone style={{ width: 13, height: 13, color: 'var(--gold)' }} />
                        {submitterRole === 'broker'
                          ? isAr
                            ? 'رقم موبايل البروكر / الوسيط'
                            : 'Broker Mobile / WhatsApp'
                          : isAr
                            ? 'رقم موبايل المالك المباشر'
                            : 'Direct Owner Mobile / WhatsApp'}
                      </span>
                      <span className={styles.contactTag}>
                        {submitterRole.toUpperCase()}
                      </span>
                    </div>
                    <input
                      type="tel"
                      dir="ltr"
                      className={styles.input}
                      value={primaryMobile}
                      onChange={(e) => {
                        setPrimaryMobile(e.target.value);
                        if (submitterRole === 'broker') {
                          setBrokerPhone(e.target.value);
                        } else {
                          setOwnerPhone(e.target.value);
                        }
                      }}
                      placeholder="010XXXXXXXX"
                      required
                    />
                    <span className={styles.contactHelper}>
                      {isAr
                        ? 'الرقم الأساسي المرتبط بالوحدة للتحقق والمزامنة.'
                        : 'Primary mobile number linked to this property.'}
                    </span>
                  </div>

                  {/* Column 2: Contact Name (Owner or Broker Name) */}
                  <div className={styles.contactCol}>
                    <div className={styles.contactColHeader}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Briefcase style={{ width: 13, height: 13, color: 'var(--gold)' }} />
                        {submitterRole === 'broker'
                          ? isAr
                            ? 'اسم الوسيط / الشركة'
                            : 'Broker / Agency Name'
                          : isAr
                            ? 'اسم المالك'
                            : 'Property Owner Name'}
                      </span>
                      <span className={styles.contactTag}>
                        {isAr ? 'الاسم' : 'NAME'}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={
                        submitterRole === 'broker'
                          ? isAr
                            ? 'مثال: شركة النخبة العقارية'
                            : 'e.g. Elite Brokerage'
                          : isAr
                            ? 'مثال: د. طارق منصور (اختياري)'
                            : 'e.g. Dr. Tarek Mansour'
                      }
                    />
                    <span className={styles.contactHelper}>
                      {isAr
                        ? 'يُحفظ في سجل الإدارة الداخلي وشيت جوجل.'
                        : 'Saved in Admin CRM & Google Sheet.'}
                    </span>
                  </div>

                  {/* Column 3: Employee / Secondary Phone or Notes */}
                  <div className={styles.contactCol}>
                    <div className={styles.contactColHeader}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <UserCheck style={{ width: 13, height: 13, color: 'var(--gold)' }} />
                        {submitterRole === 'employee'
                          ? isAr
                            ? 'رقم إضافي / واتساب الموظف'
                            : 'Employee / Secondary Phone'
                          : isAr
                            ? 'اسم الموظف المسئول (إن وجد)'
                            : 'Assigned Employee (Optional)'}
                      </span>
                      <span className={styles.contactTag}>
                        {isAr ? 'فريق سييرا' : 'SIERRA STAFF'}
                      </span>
                    </div>
                    {submitterRole === 'employee' ? (
                      <input
                        type="tel"
                        dir="ltr"
                        className={styles.input}
                        value={brokerPhone}
                        onChange={(e) => setBrokerPhone(e.target.value)}
                        placeholder="011XXXXXXXX (Optional)"
                      />
                    ) : (
                      <input
                        type="text"
                        className={styles.input}
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder={isAr ? 'مثال: سارة محمود - SE-12' : 'e.g. Sara Mahmoud - SE-12'}
                      />
                    )}
                    <span className={styles.contactHelper}>
                      {isAr
                        ? 'يربط الوحدة بموظف المبيعات في لوحة التحكم.'
                        : 'Links unit to the sales advisor in Admin Deck.'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Photos & Additional Notes */}
            <section>
              <div className={styles.grid}>
                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    <span>{isAr ? 'صور الوحدة العقارية (حتى 10 صور)' : 'Property Photos (Up to 10)'}</span>
                    <span className={styles.labelSub}>{photos.length}/10</span>
                  </label>
                  <div
                    className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className={styles.dropzoneIcon} />
                    <div className={styles.dropzoneText}>
                      {isAr ? 'اسحب الصور هنا أو اضغط للاختيار' : 'Drag & drop photos or click to browse'}
                    </div>
                    <div className={styles.dropzoneSub}>
                      {isAr ? 'يدعم JPG, PNG, WebP' : 'Supports JPG, PNG, WebP'}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => processFiles(e.target.files)}
                    />
                  </div>

                  {photos.length > 0 && (
                    <div className={styles.mediaStrip}>
                      {photos.map((p, idx) => (
                        <div key={p.id} className={styles.mediaItem}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.dataUrl} alt={p.name} className={styles.mediaImg} />
                          {idx === 0 && (
                            <span className={styles.coverBadge}>
                              {isAr ? 'الرئيسية' : 'COVER'}
                            </span>
                          )}
                          <button
                            type="button"
                            className={styles.deletePhotoBtn}
                            onClick={() => removePhoto(p.id)}
                            aria-label="Remove photo"
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${styles.field} ${styles.col6}`}>
                  <label className={styles.label}>
                    <span>{isAr ? 'ملاحظات إضافية / تفاصيل المعاينة' : 'Additional Notes & Viewing Instructions'}</span>
                  </label>
                  <textarea
                    className={styles.pasteArea}
                    style={{ minHeight: 110 }}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أي تفاصيل إضافية عن الفيو، رقم المبنى، تسهيلات السداد، أو مواعيد المعاينة...'
                        : 'Any extra details about view, phase, payment plan, or viewing availability...'
                    }
                  />
                </div>
              </div>
            </section>

            {errorMsg && (
              <div className={styles.errorNotice} role="alert">
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Bar */}
            <div className={styles.submitBar}>
              <div className={styles.securityNote}>
                <ShieldCheck className={styles.securityIcon} />
                <span>
                  {isAr
                    ? 'مزامنة فورية بضغطة واحدة: Supabase + Google Sheet + GIS Map + Admin CRM'
                    : '1-Click Multi-Sync: Supabase DB + Online Sheet + GIS Map + Admin CRM'}
                </span>
              </div>

              <div className={styles.actionBtns}>
                <button type="button" className={styles.resetBtn} onClick={resetForm}>
                  {isAr ? 'مسح الحقول' : 'Clear'}
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  <Sparkles style={{ width: 16, height: 16 }} />
                  <span>
                    {isSubmitting
                      ? isAr
                        ? 'جاري النشر والمزامنة...'
                        : 'Publishing & Syncing...'
                      : isAr
                        ? 'نشر ومزامنة الوحدة الآن'
                        : 'Submit listing & Multi-Sync Now'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* TAB 2: OWNERS & BOT INTAKE RESUME ("نعم متاح" WORKFLOW) */
          <div className={styles.formCard}>
            <div className={styles.sectHeader}>
              <div>
                <div className={styles.sectTitle}>
                  <Bot className={styles.sectIcon} />
                  <span>
                    {isAr
                      ? 'سجل ردود الملاك عبر البوت ("نعم متاح") والوحدات المستلمة للاستكمال'
                      : 'Owners WhatsApp Bot Replies ("Yes Available") & Intake Resume Queue'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 4 }}>
                  {isAr
                    ? 'عندما يرد المالك بـ "نعم" على بوت الواتساب ويرسل التفاصيل، تظهر الوحدة هنا تلقائياً — اضغط "استكمال ونشر" لتحميلها في الاستوديو واعتمادها بضغطة واحدة.'
                    : 'When an owner replies "Yes" to the WhatsApp outreach bot and sends unit details, the bot stages it here — click "Resume & Publish" to load it into the 3-step studio.'}
                </p>
              </div>

              <div className={styles.samplePills}>
                {(['ALL', 'BOT', 'OWNER', 'EMPLOYEE', 'BROKER'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={styles.samplePill}
                    style={
                      intakeFilter === f
                        ? {
                            background: 'var(--navy)',
                            color: '#ffffff',
                            borderColor: 'var(--gold)',
                          }
                        : undefined
                    }
                    onClick={() => setIntakeFilter(f)}
                  >
                    <span>
                      {f === 'ALL'
                        ? isAr
                          ? 'الكل'
                          : 'All'
                        : f === 'BOT'
                          ? isAr
                            ? '🤖 رد بنعم (البوت)'
                            : '🤖 Bot Reply Yes'
                          : f === 'OWNER'
                            ? isAr
                              ? '👑 ملاك'
                              : '👑 Owners'
                            : f === 'EMPLOYEE'
                              ? isAr
                                ? '🏢 موظفين'
                                : '🏢 Employees'
                              : isAr
                                ? '💼 وسطاء'
                                : '💼 Brokers'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {intakesLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                {isAr ? 'جاري تحميل سجل الأونرز والبوت...' : 'Loading Owners & Bot Intake Queue...'}
              </div>
            ) : (
              <div className={styles.intakeGrid}>
                {filteredIntakes.map((item) => (
                  <div key={item.id} className={styles.intakeCard}>
                    <div>
                      <div className={styles.intakeTop}>
                        <div>
                          <span className={styles.intakeCode}>{item.code}</span>
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                            {item.propertyType} · {item.compound}
                          </h3>
                        </div>
                        <span className={styles.botBadge}>
                          {item.status === 'owner_reply_yes'
                            ? isAr
                              ? '🤖 رد بنعم عبر البوت'
                              : '🤖 Bot Reply: YES'
                            : item.role === 'EMPLOYEE'
                              ? `🏢 ${item.employeeName || 'Employee'}`
                              : `👑 ${item.role}`}
                        </span>
                      </div>

                      <div className={styles.intakeSpecs} style={{ marginTop: 12 }}>
                        <div className={styles.intakeSpecBox}>
                          <span className={styles.intakeSpecLabel}>{isAr ? 'المساحة' : 'Area'}</span>
                          <span className={styles.intakeSpecVal}>{item.area} m²</span>
                        </div>
                        <div className={styles.intakeSpecBox}>
                          <span className={styles.intakeSpecLabel}>{isAr ? 'الغرف / الحمام' : 'Beds / Baths'}</span>
                          <span className={styles.intakeSpecVal}>
                            {item.beds}B / {item.baths}B
                          </span>
                        </div>
                        <div className={styles.intakeSpecBox}>
                          <span className={styles.intakeSpecLabel}>{isAr ? 'السعر' : 'Price'}</span>
                          <span className={styles.intakeSpecVal} style={{ color: 'var(--gold)' }}>
                            EGP {Number(item.price).toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>

                      <div className={styles.intakeRaw} style={{ marginTop: 10 }}>
                        {item.rawText}
                      </div>
                    </div>

                    <div className={styles.intakeFooter}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                        <Phone style={{ width: 13, height: 13, color: 'var(--gold)' }} />
                        <span dir="ltr">{item.ownerPhone}</span>
                        <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                          ({item.contactName})
                        </span>
                      </div>

                      <button
                        type="button"
                        className={styles.resumeBtn}
                        onClick={() => handleResumeIntake(item)}
                      >
                        <Sparkles style={{ width: 13, height: 13 }} />
                        <span>
                          {isAr ? 'استكمال ونشر في الاستوديو' : 'Resume & Publish in Studio'}
                        </span>
                        <ArrowRight style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {conflictData && (
        <div className={styles.conflictOverlay} role="dialog" aria-modal="true">
          <div className={styles.conflictCard}>
            <div className={styles.conflictHeader}>
              <div className={styles.conflictIconBox}>
                <AlertTriangle style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <h3 className={styles.conflictTitle}>
                  {isAr
                    ? `تم اكتشاف كود مطابق (${conflictData.code})`
                    : `Duplicate Listing Code Detected (${conflictData.code})`}
                </h3>
                <p className={styles.conflictSub}>{conflictData.message}</p>
              </div>
            </div>

            <div className={styles.conflictActions}>
              <button
                type="button"
                className={styles.btnMerge}
                onClick={() => executeSubmission('merge')}
              >
                <GitMerge style={{ width: 15, height: 15 }} />
                <span>{isAr ? 'دمج وتحديث البيانات' : 'Merge & Update Existing'}</span>
              </button>
              <button
                type="button"
                className={styles.btnFork}
                onClick={() => executeSubmission('new_code')}
              >
                <CopyPlus style={{ width: 15, height: 15 }} />
                <span>{isAr ? 'حفظ بكود فرعي جديد' : 'Save as New Variant Code'}</span>
              </button>
              <button
                type="button"
                className={styles.btnCancelModal}
                onClick={() => setConflictData(null)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {submittedResult && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>
              <CheckCircle2 style={{ width: 30, height: 30 }} />
            </div>
            <h2 className={styles.modalTitle}>
              {isAr ? 'تم نشر ومزامنة الوحدة بنجاح!' : 'Property Published & Multi-Synced!'}
            </h2>
            <p className={styles.modalText}>
              {isAr
                ? 'تم حفظ الوحدة في قاعدة بيانات Supabase، وتحديث شيت جوجل أونلاين، وربط الإحداثيات على خريطة GIS ولوحة تحكم الإدارة.'
                : 'Your unit is now live in Supabase Master Inventory, synced to the Online Google Sheet, pinned on the GIS Map, and queued in the Admin Command Deck.'}
            </p>

            <div className={styles.codeBadge}>
              <span>{submittedResult.code}</span>
              {submittedResult.targetTab && (
                <span style={{ fontSize: 11, opacity: 0.8 }}>
                  · {submittedResult.targetTab.toUpperCase()}
                </span>
              )}
            </div>

            {submittedResult.adCopy && (
              <div style={{ width: '100%', textAlign: 'start' }}>
                <div className={styles.intakeRaw} style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                  {submittedResult.adCopy}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedResult.adCopy || '');
                    setCopiedAd(true);
                    setTimeout(() => setCopiedAd(false), 2000);
                  }}
                  className={styles.samplePill}
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center', padding: '8px 12px' }}
                >
                  {copiedAd ? (
                    <>
                      <Check style={{ width: 14, height: 14, color: '#10b981' }} />
                      <span>{isAr ? 'تم نسخ النص التسويقي!' : 'Marketing Copy Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: 14, height: 14 }} />
                      <span>{isAr ? 'نسخ الإعلان الجاهز للواتساب وفيسبوك' : 'Copy Ready WhatsApp/Facebook Ad'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className={styles.modalActions}>
              <Link href={`/property/${submittedResult.id}`} className={styles.modalBtnPrimary}>
                <span>{isAr ? 'معاينة صفحة الوحدة في الموقع' : 'View Live Property Page'}</span>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </Link>

              <div className={styles.modalBtnRow}>
                <Link href="/compounds" className={styles.modalBtnSecondary}>
                  <MapPin style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'الخريطة التفاعلية' : 'Open GIS Map'}</span>
                </Link>
                <Link href="/properties" className={styles.modalBtnSecondary}>
                  <Building2 style={{ width: 14, height: 14 }} />
                  <span>{isAr ? 'الإنفنتوري' : 'All Inventory'}</span>
                </Link>
              </div>

              <button
                type="button"
                className={styles.againBtn}
                onClick={() => {
                  setSubmittedResult(null);
                  resetForm();
                }}
              >
                {isAr ? '+ إضافة وحدة عقارية أخرى' : '+ Add Another Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
