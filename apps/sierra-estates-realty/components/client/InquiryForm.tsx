'use client';

/**
 * Sierra Estates — High-End VIP Inquiry & Property Request Portal
 * Features:
 * 1. Active Seasonal Promo Banner (Black Friday 25% OFF VIP Pass).
 * 2. Multi-Select New Cairo Compounds & Granular Unit Specifications.
 * 3. Dynamic Budget Range Sliders + One-Touch Presets (Rent & Resale/Primary).
 * 4. Urgency Selector & Move-in Target Date Picker.
 * 5. Instant VIP Gold Discount Pass Generation with Copy & Direct WhatsApp Handoff.
 */

import React, { useState, useId } from 'react';
import {
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  Send,
  MessageCircle,
  Phone,
  User,
  Mail,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { useSite } from '@/lib/site/SiteContext';

export interface InquiryFormProps {
  initialService?: 'Rent' | 'Resale' | 'Primary' | 'Advisory';
  initialCompound?: string;
  promoTitle?: string;
  promoSubtitle?: string;
  discountPercent?: number;
  campaignKey?: string;
  onSuccess?: (passCode: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const TOP_COMPOUNDS = [
  'Hyde Park',
  'Mountain View iCity',
  'Mivida',
  'Palm Hills New Cairo',
  'Villette',
  'Eastown',
  'Zed East',
  'Swan Lake Residence',
  'Fifth Square',
  'The Waterway',
  'Taj City',
  'District 5',
  'Stone Residence',
  'Cairo Festival City',
  'Madinaty',
  'Al Rehab',
];

const UNIT_TYPES = [
  { val: 'Apartment', en: 'Apartment', ar: 'شقة' },
  { val: 'Villa', en: 'Stand-alone Villa', ar: 'فيلا مستقلة' },
  { val: 'Twin House', en: 'Twin House', ar: 'توين هاوس' },
  { val: 'Townhouse', en: 'Townhouse', ar: 'تاون هاوس' },
  { val: 'Duplex/iVilla', en: 'Duplex / iVilla', ar: 'دوبلكس / آي فيلا' },
  { val: 'Penthouse', en: 'Penthouse', ar: 'بنتهاوس' },
  { val: 'Studio', en: 'Studio', ar: 'استوديو' },
  { val: 'Commercial', en: 'Commercial / Clinic', ar: 'تجاري / إداري / عيادة' },
];

const BEDROOM_OPTIONS = ['1', '2', '3', '4', '5+'];

const FINISHING_OPTIONS = [
  { val: 'Fully Finished', en: 'Fully Finished', ar: 'تشطيب كامل (الترا لوكس)' },
  { val: 'Furnished', en: 'Furnished & Equipped', ar: 'مفروش بالكامل ومجهز' },
  { val: 'Core & Shell', en: 'Core & Shell', ar: 'نصف تشطيب (محارة وحلوق)' },
];

const URGENCY_OPTIONS = [
  { val: 'Immediate', en: 'Immediate (فوري)', ar: 'فوري (الآن)' },
  { val: 'This Month', en: 'Within 30 Days', ar: 'خلال هذا الشهر' },
  { val: '3 Months', en: 'Within 3 Months', ar: 'خلال 3 شهور' },
];

const RENT_PRESETS = [
  { label: '30k', val: 30000 },
  { label: '60k', val: 60000 },
  { label: '120k', val: 120000 },
  { label: '250k', val: 250000 },
  { label: '400k+', val: 400000 },
];

const SALE_PRESETS = [
  { label: '5M', val: 5000000 },
  { label: '12M', val: 12000000 },
  { label: '25M', val: 25000000 },
  { label: '50M', val: 50000000 },
  { label: '80M+', val: 80000000 },
];

export default function InquiryForm({
  initialService = 'Resale',
  initialCompound = '',
  promoTitle = 'BLACK FRIDAY OFFER · خصم 25% بمناسبة البلاك فرايداي على أي خدمة عقارية',
  promoSubtitle = 'سجل رغبتك الآن واحصل فوراً على كود خصم VIP ذهبي بنسبة 25% على كافة الخدمات والاستشارات العقارية وعمولات المعاينة والتعاقد.',
  discountPercent = 25,
  campaignKey = 'BLACK_FRIDAY_25_OFF',
  onSuccess,
  className,
  style,
}: InquiryFormProps) {
  const { isAr } = useSite();
  const formId = useId();

  // Core filter states
  const [serviceType, setServiceType] = useState<'Rent' | 'Resale' | 'Primary' | 'Advisory'>(initialService);
  const [selectedCompounds, setSelectedCompounds] = useState<string[]>(
    initialCompound ? [initialCompound] : []
  );
  const [unitType, setUnitType] = useState<string>('Apartment');
  const [bedrooms, setBedrooms] = useState<string>('3');
  const [finishing, setFinishing] = useState<string>('Fully Finished');

  // Budget states
  const isRent = serviceType === 'Rent';
  const minBudget = isRent ? 20000 : 3000000;
  const maxBudget = isRent ? 400000 : 80000000;
  const budgetStep = isRent ? 5000 : 500000;
  const [budget, setBudget] = useState<number>(isRent ? 60000 : 15000000);

  // Timing states
  const [urgency, setUrgency] = useState<string>('Immediate');
  const [targetDate, setTargetDate] = useState<string>('');

  // Personal inputs
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Status & Feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedPass, setSubmittedPass] = useState<{
    code: string;
    discount: number;
    timestamp: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Service toggle resets budget appropriately
  const handleServiceChange = (nextService: 'Rent' | 'Resale' | 'Primary' | 'Advisory') => {
    setServiceType(nextService);
    if (nextService === 'Rent') {
      setBudget(60000);
    } else {
      setBudget(15000000);
    }
  };

  const toggleCompound = (cpd: string) => {
    setSelectedCompounds((prev) =>
      prev.includes(cpd) ? prev.filter((c) => c !== cpd) : [...prev, cpd]
    );
  };

  const generatePassCode = () => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SE-25OFF-${rand}`;
  };

  const handleCopyPass = () => {
    if (!submittedPass) return;
    navigator.clipboard.writeText(submittedPass.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setErrorMsg(isAr ? 'يرجى كتابة الاسم بالكامل بشكل صحيح.' : 'Please enter your full name.');
      return;
    }
    if (trimmedPhone.length < 8) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم هاتف صحيح للتواصل عبر واتساب.' : 'Please enter a valid phone or WhatsApp number.');
      return;
    }

    setIsSubmitting(true);
    const passCode = generatePassCode();

    const structuredNotes = [
      `[Campaign: ${campaignKey}]`,
      `[Discount: ${discountPercent}%]`,
      `[VIP Pass: ${passCode}]`,
      `[Service: ${serviceType}]`,
      selectedCompounds.length > 0 ? `[Preferred Compounds: ${selectedCompounds.join(', ')}]` : '[Preferred: Greater New Cairo]',
      `[Unit Type: ${unitType}]`,
      `[Bedrooms: ${bedrooms}]`,
      `[Finishing: ${finishing}]`,
      `[Urgency: ${urgency}]`,
      targetDate ? `[Target Move-in: ${targetDate}]` : null,
      notes.trim() ? `[Client Note: ${notes.trim()}]` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isRent ? 'rent' : 'sale',
          name: trimmedName,
          phone: trimmedPhone,
          email: email.trim() || undefined,
          zone: selectedCompounds.slice(0, 2).join(', ') || 'New Cairo',
          type: unitType,
          budget: `${budget.toLocaleString()} EGP`,
          notes: structuredNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      setSubmittedPass({
        code: passCode,
        discount: discountPercent,
        timestamp: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      });

      if (onSuccess) {
        onSuccess(passCode);
      }
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          (isAr
            ? 'تعذر إرسال الطلب حالياً. يرجى التواصل مباشرة عبر واتساب.'
            : 'Something went wrong. Please connect with us directly via WhatsApp.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPriceDisplay = (val: number) => {
    if (isRent) {
      return `${val.toLocaleString()} ${isAr ? 'جنيه/شهرياً' : 'EGP/mo'}`;
    }
    if (val >= 1000000) {
      const m = (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1);
      return `${m} ${isAr ? 'مليون جنيه' : 'Million EGP'}`;
    }
    return `${val.toLocaleString()} EGP`;
  };

  const whatsAppDirectUrl = submittedPass
    ? `https://wa.me/201092048333?text=${encodeURIComponent(
        isAr
          ? `مرحباً سييرا إيستيتس، قمت بتسجيل طلب عقاري جديد وحصلت على بطاقة خصم البلاك فرايداي 25% (كود: ${submittedPass.code}). أرجو تأكيد تسجيلي والبدء في ترشيح الوحدات المتاحة.`
          : `Hello Sierra Estates, I have submitted a property request and received my 25% Black Friday VIP Pass (Code: ${submittedPass.code}). Please confirm and send me suitable inventory options.`
      )}`
    : `https://wa.me/201092048333?text=${encodeURIComponent('Hello Sierra Estates, I want to request a property in New Cairo.')}`;

  return (
    <div
      className={`sierra-inquiry-portal ${className || ''}`}
      style={{
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        color: '#ffffff',
        fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', system-ui, sans-serif)",
        ...style,
      }}
    >
      {/* ── Top Seasonal Promo Banner ──────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(6, 17, 34, 0.95) 0%, rgba(13, 33, 54, 0.95) 100%)',
          border: '1.5px solid rgba(201, 168, 76, 0.85)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: '0 0 35px rgba(201, 168, 76, 0.25), 0 20px 40px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 32,
        }}
      >
        {/* Glowing Decorative Radial Sheen */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: isAr ? 'auto' : -40,
            left: isAr ? -40 : 'auto',
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(201, 168, 76, 0.35) 0%, rgba(201, 168, 76, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #c9a84c 0%, #dfad3a 100%)',
              color: '#061122',
              fontWeight: 900,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 999,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 0 16px rgba(201, 168, 76, 0.65)',
            }}
          >
            <Flame style={{ width: 15, height: 15, color: '#061122' }} />
            <span>25% OFF VIP PASS</span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: '#00F0FF',
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            {isAr ? 'عرض حصري ومحدود لفترة محدودة' : 'Exclusive Limited Time Promotion'}
          </span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(20px, 2.5vw, 28px)',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '14px 0 8px',
            lineHeight: 1.3,
            textShadow: '0 0 20px rgba(201, 168, 76, 0.45)',
          }}
        >
          {promoTitle}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.82)',
            lineHeight: 1.6,
            maxWidth: 780,
            margin: 0,
          }}
        >
          {promoSubtitle}
        </p>
      </div>

      {/* ── Success VIP Pass Screen ────────────────────────────────────── */}
      {submittedPass ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #061122 0%, #0d2136 100%)',
            border: '2px solid #C9A84C',
            borderRadius: 24,
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(201, 168, 76, 0.4), 0 24px 60px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              color: '#10b981',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
            }}
          >
            <CheckCircle style={{ width: 38, height: 38 }} />
          </div>

          <h3 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>
            {isAr ? 'تم استلام رغبتك العقارية بنجاح!' : 'Your Property Request is Registered!'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 580, margin: '0 auto 28px' }}>
            {isAr
              ? 'تم إصدار بطاقة الخصم الذهبية الخاصة بك وتفعيل تخفيض 25% على أي خدمة وساطة أو استشارة عقارية.'
              : 'Your VIP Gold Discount Pass has been minted. Enjoy 25% off all Sierra brokerage and advisory services.'}
          </p>

          {/* Luxury Metallic Pass Container */}
          <div
            style={{
              maxWidth: 480,
              margin: '0 auto 28px',
              padding: '24px 20px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #182232 0%, #081120 100%)',
              border: '1.5px solid rgba(201, 168, 76, 0.75)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(201, 168, 76, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#C9A84C', letterSpacing: '0.08em' }}>
                SIERRA GOLD PASS · 25% OFF
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                {submittedPass.timestamp}
              </span>
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 'clamp(22px, 3vw, 32px)',
                fontWeight: 900,
                color: '#FDE047',
                letterSpacing: '0.08em',
                textShadow: '0 0 16px rgba(253, 224, 71, 0.75)',
                margin: '12px 0 18px',
              }}
            >
              {submittedPass.code}
            </div>

            <button
              type="button"
              onClick={handleCopyPass}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                background: copied ? '#10b981' : 'rgba(201, 168, 76, 0.2)',
                color: copied ? '#ffffff' : '#fde047',
                border: copied ? '1px solid #10b981' : '1px solid rgba(201, 168, 76, 0.5)',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
              <span>{copied ? (isAr ? 'تم نسخ الكود!' : 'Code Copied!') : (isAr ? 'نسخ الكود' : 'Copy VIP Pass')}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={whatsAppDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 28px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 800,
                background: '#10b981',
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageCircle style={{ width: 18, height: 18 }} />
              <span>{isAr ? 'تأكيد الحجز فوراً عبر واتساب (+20 109 204 8333)' : 'Instant WhatsApp Confirmation (+20 109 204 8333)'}</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setSubmittedPass(null);
                setFullName('');
                setPhone('');
                setNotes('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 24px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
              }}
            >
              <RotateCcw style={{ width: 16, height: 16 }} />
              <span>{isAr ? 'طلب وحدة أخرى' : 'Request Another Unit'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Main Interactive Form ────────────────────────────────────── */
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(6, 17, 34, 0.88)',
            border: '1px solid rgba(201, 168, 76, 0.35)',
            borderRadius: 24,
            padding: '36px 32px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Section 1: Service Type Segmented Control */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              1. {isAr ? 'نوع الخدمة العقارية المطلوبة' : 'Service Type'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {(['Resale', 'Rent', 'Primary', 'Advisory'] as const).map((srv) => {
                const isSelected = serviceType === srv;
                const srvLabels: Record<string, { en: string; ar: string }> = {
                  Resale: { en: 'Resale (Buy)', ar: 'إعادة بيع (شراء)' },
                  Rent: { en: 'Rent / Lease', ar: 'إيجار سكني / تجاري' },
                  Primary: { en: 'Primary / Direct', ar: 'استلام مباشر / تطوير' },
                  Advisory: { en: 'Real Estate Advisory', ar: 'استشارات واستثمار' },
                };
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => handleServiceChange(srv)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: isSelected ? 800 : 600,
                      background: isSelected ? 'linear-gradient(135deg, #C9A84C 0%, #DFAD3A 100%)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#061122' : '#E2E8F0',
                      border: isSelected ? '1px solid #F5D78E' : '1px solid rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected ? '0 4px 16px rgba(201, 168, 76, 0.4)' : 'none',
                    }}
                  >
                    {isAr ? srvLabels[srv].ar : srvLabels[srv].en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Compound Multi-Select */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                2. {isAr ? 'الكمبوندات المفضلة في القاهرة الجديدة (اختر كمبوند أو أكثر)' : 'Preferred New Cairo Compounds (Multi-Select)'}
              </label>
              {selectedCompounds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCompounds([])}
                  style={{ fontSize: 11, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  {isAr ? 'مسح الاختيارات' : 'Clear selection'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TOP_COMPOUNDS.map((cpd) => {
                const isSelected = selectedCompounds.includes(cpd);
                return (
                  <button
                    key={cpd}
                    type="button"
                    onClick={() => toggleCompound(cpd)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: isSelected ? 800 : 500,
                      background: isSelected ? 'rgba(0, 240, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#00F0FF' : '#E2E8F0',
                      border: isSelected ? '1.5px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 0 12px rgba(0, 240, 255, 0.4)' : 'none',
                    }}
                  >
                    {isSelected && <span style={{ marginRight: isAr ? 0 : 5, marginLeft: isAr ? 5 : 0 }}>✓</span>}
                    {cpd}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Unit Type, Bedrooms & Finishing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
            {/* Unit Type */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                3. {isAr ? 'نوع الوحدة' : 'Unit Type'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {UNIT_TYPES.map((u) => {
                  const isSelected = unitType === u.val;
                  return (
                    <button
                      key={u.val}
                      type="button"
                      onClick={() => setUnitType(u.val)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 500,
                        background: isSelected ? 'rgba(201, 168, 76, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#FDE047' : '#E2E8F0',
                        border: isSelected ? '1px solid #C9A84C' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      {isAr ? u.ar : u.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                4. {isAr ? 'عدد غرف النوم' : 'Bedrooms'}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {BEDROOM_OPTIONS.map((b) => {
                  const isSelected = bedrooms === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBedrooms(b)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: isSelected ? 800 : 600,
                        background: isSelected ? '#C9A84C' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#061122' : '#E2E8F0',
                        border: isSelected ? '1px solid #F5D78E' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Finishing Level */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              5. {isAr ? 'مستوى التشطيب والتأثيث' : 'Finishing & Furnishing'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {FINISHING_OPTIONS.map((f) => {
                const isSelected = finishing === f.val;
                return (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => setFinishing(f.val)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: isSelected ? 800 : 500,
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#34D399' : '#E2E8F0',
                      border: isSelected ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {isAr ? f.ar : f.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Dynamic Budget Range Slider & Quick Presets */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                6. {isAr ? 'الميزانية المستهدفة' : 'Target Budget'}
              </label>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#FDE047',
                  fontFamily: 'monospace',
                  textShadow: '0 0 10px rgba(253, 224, 71, 0.5)',
                }}
              >
                {formatPriceDisplay(budget)}
              </span>
            </div>

            <input
              type="range"
              min={minBudget}
              max={maxBudget}
              step={budgetStep}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#C9A84C',
                height: 8,
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            />

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center', whiteSpace: 'nowrap', marginRight: 6 }}>
                {isAr ? 'خيارات سريعة:' : 'Presets:'}
              </span>
              {(isRent ? RENT_PRESETS : SALE_PRESETS).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setBudget(p.val)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: budget === p.val ? '#C9A84C' : 'rgba(255, 255, 255, 0.06)',
                    color: budget === p.val ? '#061122' : '#CBD5E1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 6: Urgency & Move-in Target Date */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                7. {isAr ? 'مدى الجدية وتوقيت الانتقال / التعاقد' : 'Urgency & Target Timeline'}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {URGENCY_OPTIONS.map((u) => {
                  const isSelected = urgency === u.val;
                  return (
                    <button
                      key={u.val}
                      type="button"
                      onClick={() => setUrgency(u.val)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 500,
                        background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#00F0FF' : '#E2E8F0',
                        border: isSelected ? '1px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isAr ? u.ar : u.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-target-date`} style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isAr ? 'تاريخ الانتقال المستهدف (اختياري)' : 'Target Date (Optional)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={`${formId}-target-date`}
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 7: Contact Information */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: 28, marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#C9A84C', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              8. {isAr ? 'بيانات التواصل لإصدار كود الخصم وإرسال الوحدات' : 'Contact Details'}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor={`${formId}-name`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                  {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', top: 12, [isAr ? 'right' : 'left']: 12, width: 16, height: 16, color: '#94A3B8' }} />
                  <input
                    id={`${formId}-name`}
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: م. أحمد فوزي' : 'e.g. John Doe'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      paddingLeft: isAr ? 14 : 36,
                      paddingRight: isAr ? 36 : 14,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${formId}-phone`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                  {isAr ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone style={{ position: 'absolute', top: 12, [isAr ? 'right' : 'left']: 12, width: 16, height: 16, color: '#10B981' }} />
                  <input
                    id={`${formId}-phone`}
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="01092048333"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      paddingLeft: isAr ? 14 : 36,
                      paddingRight: isAr ? 36 : 14,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor={`${formId}-email`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email Address (Optional)'}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', top: 12, [isAr ? 'right' : 'left']: 12, width: 16, height: 16, color: '#94A3B8' }} />
                <input
                  id={`${formId}-email`}
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    paddingLeft: isAr ? 14 : 36,
                    paddingRight: isAr ? 36 : 14,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-notes`} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                {isAr ? 'ملاحظات أو مواصفات خاصة ترغب بها' : 'Special Requirements or Notes'}
              </label>
              <textarea
                id={`${formId}-notes`}
                rows={3}
                placeholder={isAr ? 'مثال: أفضل الأدوار المتكررة، فيو مباشر على مساحات خضراء، تسهيلات سداد…' : 'e.g. Higher floor preferred, green park view, flexible installments...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 900,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #C9A84C 0%, #DFAD3A 100%)',
              color: '#061122',
              border: 'none',
              boxShadow: '0 0 25px rgba(201, 168, 76, 0.5), 0 10px 20px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <span>{isAr ? 'جاري إصدار بطاقة الخصم وتسجيل طلبك…' : 'Minting VIP Pass & Submitting…'}</span>
            ) : (
              <>
                <Send style={{ width: 18, height: 18 }} />
                <span>
                  {isAr
                    ? 'إرسال الطلب وإصدار كود خصم الـ 25% فوراً'
                    : 'Submit Request & Mint 25% VIP Discount Pass'}
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
