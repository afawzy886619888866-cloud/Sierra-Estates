'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  BadgeCheck,
  BedDouble,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  User,
  Briefcase,
  ShieldCheck,
  Database,
  Table2,
  Share2,
  Copy,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { CopyButton } from './copy-button'
import { ImageUploader, type UploadedImage } from './image-uploader'

import type { AdvertiserRole, AppSettings, GeneratedContent, PropertyFields, SavedProperty } from '@/lib/types'
import { UNIT_TYPES, buildMapEmbedUrl, buildMapLink, formatPrice, generatePropertyCode } from '@/lib/listing'
import { addSavedProperty, DEFAULT_SECRET, savedCodes } from '@/lib/local-store'
import { exportToSheet, type SheetPayload } from '@/lib/sheets'
import { detectRoleFromText, extractMobilePhone } from '@/lib/extract'

interface MultiSyncResult {
  ok: boolean
  supabaseSynced: boolean
  sheetSynced: boolean
  mapSynced: boolean
  code: string
  error: string | null
  supabaseTable?: string
  sheetLink?: string
}

interface NewListingProps {
  settings: AppSettings
  onOpenSettings: () => void
  onOpenSetup: () => void
  onSaved: () => void
  initialProperty?: SavedProperty | null
  onClearInitialProperty?: () => void
}

const REAL_PRESETS = [
  {
    name: 'ميفيدا (10.5M)',
    role: 'OWNER' as AdvertiserRole,
    phone: '01092048333',
    contactName: 'عمرو مرسي (المالك)',
    text: 'شقة مفروشة للبيع في ميفيدا إعمار التجمع الخامس، 3 غرف نوم و3 حمامات، مساحة 220 متر، الدور الثالث، فيو لاندسكيب، استلام فوري، السعر 10 مليون و500 ألف.',
  },
  {
    name: 'فيفث سكوير بجاردن (8.8M)',
    role: 'OWNER' as AdvertiserRole,
    phone: '01092048333',
    contactName: 'د. ليلى فريد (المالك)',
    text: 'شقة ارضي بجاردن 70م خاصة في فيفث سكوير المراسم، 3 غرف و 2 حمام، مساحة 165 متر، نصف تشطيب، السعر 8.8 مليون كاش.',
  },
  {
    name: 'إيست تاون (7.2M)',
    role: 'BROKER' as AdvertiserRole,
    phone: '01092048333',
    contactName: 'كريم الشناوي (بروكر)',
    text: 'شقة للبيع في ايست تاون سوديك التجمع الخامس، مساحة 140 متر، 2 غرف نوم و 2 حمام، تشطيب الترا سوبر لوكس، السعر 7.2 مليون.',
  },
  {
    name: 'مدينتي B14 (8.34M)',
    role: 'EMPLOYEE' as AdvertiserRole,
    employeeName: 'أحمد سعيد - كود SE-104',
    phone: '01092048333',
    contactName: '',
    text: 'للبيع شقة ممتازة في مدينتي B14 طلعت مصطفى، مساحة 133 متر دور متكرر فيو بارك، 3 نوم و 2 حمام وتراس، السعر 8,340,000 ج شامل الوديعة.',
  },
]

export function NewListing({
  settings,
  onOpenSettings,
  onOpenSetup,
  onSaved,
  initialProperty,
  onClearInitialProperty,
}: NewListingProps) {
  // ── Contact & Role Identity ──
  const [role, setRole] = useState<AdvertiserRole>('OWNER')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [contactName, setContactName] = useState('')

  // ── Property Text & Intake ──
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  // ── Processing Phases ──
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'generating'>('idle')
  const [saving, setSaving] = useState(false)

  // ── Extracted Specs & Output ──
  const [fields, setFields] = useState<PropertyFields | null>(null)
  const [code, setCode] = useState('')
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [syncResult, setSyncResult] = useState<MultiSyncResult | null>(null)

  // Pre-populate if loaded from Saved/Resume tab
  useEffect(() => {
    if (initialProperty) {
      setRole(initialProperty.role || 'OWNER')
      setOwnerPhone(initialProperty.ownerPhone || '')
      setEmployeeName(initialProperty.employeeName || '')
      setContactName(initialProperty.contactName || '')
      setDescription(initialProperty.description || '')
      setCode(initialProperty.code || '')
      setFields({
        compound: initialProperty.compound,
        city: initialProperty.city,
        unitType: initialProperty.unitType,
        bedrooms: initialProperty.bedrooms,
        bathrooms: initialProperty.bathrooms,
        area: initialProperty.area,
        floor: initialProperty.floor || '',
        price: initialProperty.price,
        currency: initialProperty.currency,
        furnished: initialProperty.furnished,
        highlights: initialProperty.highlights ? JSON.parse(initialProperty.highlights) : [],
        language: (initialProperty.language as 'ar' | 'en') || 'ar',
      })
      setContent({
        whatsapp: initialProperty.whatsappContent || '',
        facebook: initialProperty.facebookContent || '',
        propertyFinder: initialProperty.pfContent || '',
      })
      toast.info(`تم تحميل وحدة ${initialProperty.compound} في الاستوديو بنجاح`)
    }
  }, [initialProperty])

  const mapLink = useMemo(
    () => (fields ? buildMapLink(fields.compound, fields.city) : ''),
    [fields?.compound, fields?.city]
  )
  const mapEmbedUrl = useMemo(
    () => (fields ? buildMapEmbedUrl(fields.compound, fields.city) : ''),
    [fields?.compound, fields?.city]
  )

  function setField<K extends keyof PropertyFields>(key: K, value: PropertyFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSyncResult(null)
  }

  // Handle phone changes with auto-formatting
  function handlePhoneChange(val: string) {
    setOwnerPhone(val)
    setSyncResult(null)
  }

  // Text paste auto-extraction of phone and role
  function handleDescriptionChange(val: string) {
    setDescription(val)
    setSyncResult(null)

    // Auto-detect phone if not yet entered
    if (!ownerPhone.trim()) {
      const extractedPhone = extractMobilePhone(val)
      if (extractedPhone) {
        setOwnerPhone(extractedPhone)
      }
    }
    // Auto-detect role hint if user hasn't explicitly chosen
    const roleHint = detectRoleFromText(val)
    if (roleHint && role === 'OWNER') {
      setRole(roleHint)
    }
  }

  function applyPreset(p: typeof REAL_PRESETS[0]) {
    setRole(p.role)
    setOwnerPhone(p.phone)
    if (p.employeeName) setEmployeeName(p.employeeName)
    if (p.contactName) setContactName(p.contactName)
    setDescription(p.text)
    setSyncResult(null)
    toast.success(`تم اختيار نموذج ${p.name}`)
  }

  // ── AI Extraction + Generation ──
  async function handleExtractAndGenerate() {
    const desc = description.trim()
    if (desc.length < 10) {
      toast.warning('اكتب أو الصق وصف الوحدة أولاً (١٠ أحرف على الأقل)')
      return
    }
    if (!/^[+\d][\d\s-]{7,17}$/.test(ownerPhone.trim())) {
      toast.warning('يرجى كتابة رقم الموبايل صحيحاً (مثال: 01092048333)')
      return
    }
    if (role === 'EMPLOYEE' && !employeeName.trim()) {
      toast.warning('بما أنك موظف، يرجى كتابة اسمك أو كودك في خانة الموظف')
      return
    }

    setSyncResult(null)
    setPhase('extracting')

    let extracted: PropertyFields | null = null
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'تعذر استخراج البيانات')
      extracted = data.fields as PropertyFields
      setFields(extracted)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر استخراج البيانات')
      setPhase('idle')
      return
    }

    // Phase 2: Generation
    setPhase('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: extracted,
          description: desc,
          companyPhone: settings.companyPhone || ownerPhone,
          existingCodes: savedCodes(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'تعذر توليد المحتوى والكود')
      setCode(String(data.code))
      setContent(data.content as GeneratedContent)
      setFields(data.fields as PropertyFields)
      toast.success('تم استخراج المواصفات وتوليد الكود بنجاح ✦')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر توليد المحتوى')
    } finally {
      setPhase('idle')
    }
  }

  // ── 1-Click Universal Multi-Sync ──
  async function handleUniversalSync() {
    if (!fields || !content) {
      toast.warning('اضغط على "استخراج المواصفات وتوليد الكود" أولاً')
      return
    }
    if (!fields.compound.trim()) {
      toast.warning('اسم الكومباوند مطلوب قبل الحفظ والمزامنة')
      return
    }
    const cleanPhone = ownerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 8) {
      toast.warning('رقم الموبايل مطلوب وصحيح')
      return
    }
    if (role === 'EMPLOYEE' && !employeeName.trim()) {
      toast.warning('يرجى كتابة اسم الموظف المسئول')
      return
    }

    setSaving(true)
    setSyncResult(null)

    try {
      // 1. Ensure unique code
      let finalCode = code
      const used = savedCodes()
      if (!finalCode || used.includes(finalCode)) {
        finalCode = generatePropertyCode(fields, used)
        setCode(finalCode)
      }

      const internalCode = `NC-${(fields.compound || 'COM').slice(0, 3).toUpperCase()}-APT-${fields.area || 0}M`

      // 2. Call unified server sync route (/api/save)
      // This synchronizes Supabase DB + Google Sheets Webhook in parallel
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          phone: ownerPhone.trim(),
          employeeName: employeeName.trim(),
          contactName: contactName.trim(),
          fields,
          code: finalCode,
          internalCode,
          bmmCode: `BMM-${finalCode}`,
          content,
          mapLink,
          images: images.map((i) => ({ name: i.name, mime: i.mime, data: i.base64 })),
          appsScriptUrl: settings.appsScriptUrl,
          secret: settings.secret || DEFAULT_SECRET,
        }),
      })

      const saveJson = await saveRes.json()

      const supabaseSynced = Boolean(saveJson.supabase?.ok)
      const sheetSynced = Boolean(saveJson.sheet?.ok)
      const mapSynced = Boolean(mapLink)

      // 3. Save to local browser ledger mirror
      addSavedProperty({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        code: finalCode,
        bmmCode: `BMM-${finalCode}`,
        internalCode,
        compound: fields.compound,
        city: fields.city,
        unitType: fields.unitType,
        bedrooms: fields.bedrooms,
        bathrooms: fields.bathrooms,
        area: fields.area,
        floor: fields.floor || null,
        price: fields.price,
        currency: fields.currency,
        furnished: fields.furnished,
        role,
        contactName: contactName.trim() || undefined,
        employeeName: employeeName.trim() || undefined,
        ownerPhone: ownerPhone.trim(),
        description: description.slice(0, 6000),
        language: fields.language,
        highlights: JSON.stringify(fields.highlights ?? []),
        whatsappContent: content.whatsapp,
        facebookContent: content.facebook,
        pfContent: content.propertyFinder,
        mapLink,
        imageUrls: JSON.stringify(saveJson.sheet?.urls || []),
        sheetSynced,
        sheetError: saveJson.sheet?.error || null,
        supabaseSynced,
        mapSynced,
        source: role === 'OWNER' ? 'owner-outreach' : 'manual',
        status: 'active',
        createdAt: new Date().toISOString(),
      })

      setSyncResult({
        ok: true,
        supabaseSynced,
        sheetSynced,
        mapSynced,
        code: finalCode,
        error: null,
        supabaseTable: saveJson.supabase?.table,
        sheetLink: settings.sheetLink,
      })

      onSaved()
      toast.success(`تم حفظ ومزامنة الوحدة بنجاح بنقرة واحدة! (${finalCode})`)
    } catch (err: any) {
      toast.error(err?.message || 'تعذر استكمال المزامنة الشاملة')
      setSyncResult({
        ok: false,
        supabaseSynced: false,
        sheetSynced: false,
        mapSynced: false,
        code,
        error: err?.message || 'خطأ غير متوقع أثناء المزامنة',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Loaded from Resume Banner */}
      {initialProperty && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#002b4b]/40 border border-[#e9c176]/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-[#c8961a]/20 text-[#e9c176]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>
              تم تحميل بيانات الوحدة من <b>سجل الأونرز ومحادثات البوت</b>:{' '}
              <span className="text-[#e9c176] font-mono">{initialProperty.compound} ({initialProperty.code})</span>
            </span>
          </div>
          {onClearInitialProperty && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearInitialProperty}
              className="text-xs h-7 border-slate-700 text-slate-300 hover:text-white"
            >
              بدء وحدة جديدة
            </Button>
          )}
        </div>
      )}

      {/* ── STEP 1: Contact & Role Definition ── */}
      <div className="hyouz-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#c8961a]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8961a]/15 text-[#e9c176] font-bold text-xs border border-[#c8961a]/30">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                بيانات جهة الاتصال والصفة (Contact & Role)
              </h2>
              <p className="text-xs text-slate-400">
                حدد صفة صاحب الرقم: مالك، بروكر، إيجنت، أو موظف بالشركة
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#e9c176] bg-[#c8961a]/10 px-2 py-0.5 rounded-md border border-[#c8961a]/25">
            Sierra Unified ID
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Mobile Phone Input */}
          <div className="md:col-span-6 space-y-1.5">
            <Label htmlFor="owner-phone" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#e9c176]" />
              رقم الموبايل / واتساب <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Input
                id="owner-phone"
                type="tel"
                dir="ltr"
                placeholder="01012345678"
                value={ownerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="bg-[#070b12]/70 border-[#c8961a]/30 focus:border-[#e9c176] text-white font-mono text-base pl-9 placeholder:text-slate-600 rounded-xl"
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400">
              أدخل رقم الهاتف للتواصل المباشر مع الوحدة عبر الواتساب والمزامنة
            </p>
          </div>

          {/* Role Selector Pill Buttons */}
          <div className="md:col-span-6 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#e9c176]" />
              صفة المعلن (Who is this?) <span className="text-red-400">*</span>
            </Label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#070b12]/80 border border-[#c8961a]/20">
              <button
                type="button"
                onClick={() => setRole('OWNER')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'OWNER'
                    ? 'bg-gradient-to-r from-[#c8961a] to-[#e9c176] text-[#070b12] shadow-md shadow-[#c8961a]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                👑 مالك
              </button>
              <button
                type="button"
                onClick={() => setRole('BROKER')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'BROKER'
                    ? 'bg-gradient-to-r from-[#c8961a] to-[#e9c176] text-[#070b12] shadow-md shadow-[#c8961a]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                💼 وسيط
              </button>
              <button
                type="button"
                onClick={() => setRole('AGENT')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'AGENT'
                    ? 'bg-gradient-to-r from-[#c8961a] to-[#e9c176] text-[#070b12] shadow-md shadow-[#c8961a]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                🏷️ إيجنت
              </button>
              <button
                type="button"
                onClick={() => setRole('EMPLOYEE')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  role === 'EMPLOYEE'
                    ? 'bg-gradient-to-r from-[#c8961a] to-[#e9c176] text-[#070b12] shadow-md shadow-[#c8961a]/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                🏢 موظف
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Name Input: Employee Name vs Contact Name */}
        <div className="pt-1">
          {role === 'EMPLOYEE' ? (
            <div className="p-3.5 rounded-xl bg-[#c8961a]/10 border border-[#c8961a]/40 space-y-1.5 animate-fadeIn">
              <Label htmlFor="employee-name" className="text-xs font-bold text-[#e9c176] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                اسم الموظف المسئول أو الكود الداخلي <span className="text-red-400">*</span>
              </Label>
              <Input
                id="employee-name"
                type="text"
                placeholder="اكتب اسمك وكود الموظف (مثال: أحمد خالد - كود SE-104)"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="bg-[#070b12]/90 border-[#c8961a]/50 focus:border-[#e9c176] text-white placeholder:text-slate-500 rounded-lg text-sm"
              />
              <p className="text-[11px] text-slate-300">
                سيتم قيد الوحدة باسمك مباشرة في قاعدة بيانات سوبابيز وشيت المتابعة الداخلي
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="contact-name" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                اسم المالك أو الوسيط (اختياري)
              </Label>
              <Input
                id="contact-name"
                type="text"
                placeholder={role === 'OWNER' ? 'مثال: أ. عمرو مرسي' : 'مثال: كريم الشناوي (شركة ريماكس)'}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="bg-[#070b12]/70 border-slate-700 focus:border-[#e9c176] text-white placeholder:text-slate-600 rounded-xl text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 2: Raw Property Text & AI Extraction ── */}
      <div className="hyouz-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#c8961a]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8961a]/15 text-[#e9c176] font-bold text-xs border border-[#c8961a]/30">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                وصف الوحدة والمواصفات (Property Text & Specs)
              </h2>
              <p className="text-xs text-slate-400">
                الصق رسالة الواتساب أو الوصف وسيتكفل الذكاء الاصطناعي باستخراج كل التفاصيل
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">نماذج حية:</span>
            {REAL_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[10.5px] px-2 py-0.5 rounded bg-[#070b12] border border-[#c8961a]/25 text-[#e9c176] hover:bg-[#c8961a]/20 transition-all cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="مثال: شقة مفروشة للبيع في ميفيدا إعمار التجمع الخامس، 3 غرف نوم و3 حمامات، مساحة 220 متر، الدور الثالث فيو لاندسكيب، استلام فوري، السعر 10.5 مليون..."
            className="bg-[#070b12]/80 border-[#c8961a]/30 focus:border-[#e9c176] text-white placeholder:text-slate-600 rounded-xl text-sm leading-relaxed"
          />
        </div>

        {/* Action Button: Extract & Generate */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            onClick={handleExtractAndGenerate}
            disabled={phase !== 'idle' || !description.trim()}
            className="hyouz-gold-btn rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            {phase === 'extracting' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                جاري استخراج المواصفات...
              </>
            ) : phase === 'generating' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                جاري توليد الكود والمحتوى التسويقي...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                استخراج المواصفات وتوليد الكود التسويقي
              </>
            )}
          </Button>

          {code && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">كود الوحدة:</span>
              <span className="font-mono text-sm font-bold text-[#e9c176] bg-[#070b12] px-2.5 py-1 rounded-lg border border-[#c8961a]/30">
                {code}
              </span>
            </div>
          )}
        </div>

        {/* ── Extracted Specs Grid (Editable) ── */}
        {fields && (
          <div className="mt-4 p-4 rounded-xl bg-[#070b12]/60 border border-[#c8961a]/20 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-[#e9c176] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                المواصفات المستخرجة (يمكنك تعديل أي قيمة مباشرة):
              </span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                تم الفحص بالذكاء الاصطناعي
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Compound */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">الكومباوند</Label>
                <Input
                  value={fields.compound}
                  onChange={(e) => setField('compound', e.target.value)}
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* City */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">المدينة / المنطقة</Label>
                <Input
                  value={fields.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* Unit Type */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">نوع الوحدة</Label>
                <Select value={fields.unitType} onValueChange={(v) => setField('unitType', v)}>
                  <SelectTrigger className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1524] border-[#c8961a]/30 text-white">
                    {UNIT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.ar} ({t.en})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">المساحة (م²)</Label>
                <Input
                  type="number"
                  value={fields.area ?? ''}
                  onChange={(e) => setField('area', e.target.value ? Number(e.target.value) : null)}
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* Bedrooms */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">غرف النوم</Label>
                <Input
                  type="number"
                  value={fields.bedrooms}
                  onChange={(e) => setField('bedrooms', Number(e.target.value))}
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* Bathrooms */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">الحمامات</Label>
                <Input
                  type="number"
                  value={fields.bathrooms}
                  onChange={(e) => setField('bathrooms', Number(e.target.value))}
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* Floor */}
              <div className="space-y-1">
                <Label className="text-[10.5px] text-slate-400">الدور</Label>
                <Input
                  value={fields.floor}
                  onChange={(e) => setField('floor', e.target.value)}
                  placeholder="3 / أرضي"
                  className="bg-[#0d1524] border-slate-700 text-white text-xs h-8 rounded-lg"
                />
              </div>

              {/* Price */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10.5px] text-slate-400">السعر الإجمالي (ج.م)</Label>
                <Input
                  type="number"
                  value={fields.price ?? ''}
                  onChange={(e) => setField('price', e.target.value ? Number(e.target.value) : null)}
                  className="bg-[#0d1524] border-[#c8961a]/40 text-[#e9c176] font-bold font-mono text-xs h-8 rounded-lg"
                />
              </div>

              {/* Furnished */}
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={fields.furnished}
                  onCheckedChange={(v) => setField('furnished', v)}
                />
                <span className="text-xs text-slate-300">
                  {fields.furnished ? 'مفروشة بالكامل' : 'غير مفروشة'}
                </span>
              </div>

              {/* Map Link */}
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[10.5px] text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#e9c176]" />
                  رابط الخريطة GIS
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={mapLink}
                    className="bg-[#0d1524] border-slate-700 text-slate-400 text-xs h-8 rounded-lg font-mono text-[11px]"
                  />
                  {mapLink && (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-[#070b12] border border-[#c8961a]/30 text-[#e9c176] hover:bg-[#c8961a]/20"
                      title="فتح على Google Maps"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 3: 1-Click Universal Multi-Sync ── */}
      <div className="hyouz-card rounded-2xl p-5 sm:p-6 space-y-5 border-[#c8961a]/35 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c8961a]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8961a] text-[#070b12] font-black text-xs shadow-md shadow-[#c8961a]/30">
              3
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                الربط الشامل بنقرة واحدة (1-Click Universal Multi-Sync)
              </h2>
              <p className="text-xs text-slate-400">
                زر واحد يربط ويزامن الوحدة مع كل الأنظمة فوراً: قاعدة البيانات + شيت جوجل + الخريطة + المخزون
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#c8961a]/40 text-[#e9c176] bg-[#c8961a]/10 text-xs px-2.5 py-1">
              4 قنوات متصلة تلقائياً
            </Badge>
          </div>
        </div>

        {/* The 4-Channel Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-[#070b12]/80 border border-[#c8961a]/20 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white">قاعدة Supabase</div>
              <div className="text-[10px] text-slate-400">
                {role === 'BROKER' ? 'map_sheet_entries' : 'public.listings'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070b12]/80 border border-[#c8961a]/20 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Table2 className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white">شيت جوجل المباشر</div>
              <div className="text-[10px] text-slate-400">Google Sheets Webhook</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070b12]/80 border border-[#c8961a]/20 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white">خريطة التجمع GIS</div>
              <div className="text-[10px] text-slate-400">Google Maps Geolocation</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#070b12]/80 border border-[#c8961a]/20 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-white">سجل المخزون العام</div>
              <div className="text-[10px] text-slate-400">Sierra Master Inventory</div>
            </div>
          </div>
        </div>

        {/* Master Universal Sync Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleUniversalSync}
            disabled={saving || !fields || !content}
            className="w-full hyouz-gold-btn text-base font-extrabold py-6 rounded-xl flex items-center justify-center gap-3 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                جاري المزامنة الشاملة مع سوبابيز وجوجل شيت والخريطة...
              </>
            ) : (
              <>
                <BadgeCheck className="h-5 w-5" />
                حفظ ونشر ومزامنة شاملة لكل القنوات بنقرة واحدة
                <ArrowRight className="h-4 w-4 rotate-180" />
              </>
            )}
          </Button>
        </div>

        {/* Confirmation Status Banner */}
        {syncResult && (
          <div
            className={`p-4 rounded-xl border animate-fadeIn ${
              syncResult.ok
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            {syncResult.ok ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  تمت المزامنة بنجاح وحفظ الوحدة بكود ({syncResult.code})!
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> سوبابيز:{' '}
                    <span className="font-mono text-emerald-300">{syncResult.supabaseTable || 'listings'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> جوجل شيت: <span className="text-emerald-300">تم الإدراج</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> خريطة GIS: <span className="text-emerald-300">تم الربط</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-emerald-400">✓</span> سجل الأونرز: <span className="text-emerald-300">تم التوثيق</span>
                  </div>
                </div>
                {syncResult.sheetLink && (
                  <div className="pt-1">
                    <a
                      href={syncResult.sheetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#e9c176] hover:underline flex items-center gap-1"
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      فتح شيت المتابعة الرئيسي على Google Sheets
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>فشلت المزامنة: {syncResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Ready-to-Copy Marketing Tabs ── */}
        {content && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[#e9c176]" />
                المحتوى التسويقي الجاهز للنشر المباشر:
              </span>
            </div>

            <Tabs defaultValue="whatsapp" className="w-full">
              <TabsList className="bg-[#070b12] border border-[#c8961a]/20 p-1 w-full sm:w-auto">
                <TabsTrigger value="whatsapp" className="text-xs gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  صيغة واتساب للعملاء
                </TabsTrigger>
                <TabsTrigger value="facebook" className="text-xs gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-blue-400" />
                  بوست فيسبوك
                </TabsTrigger>
                <TabsTrigger value="propertyFinder" className="text-xs gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#e9c176]" />
                  Property Finder (English)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp" className="mt-2">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  <div className="absolute top-3 left-3">
                    <CopyButton text={content.whatsapp} label="نسخ نص الواتساب" />
                  </div>
                  {content.whatsapp}
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="mt-2">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  <div className="absolute top-3 left-3">
                    <CopyButton text={content.facebook} label="نسخ بوست الفيسبوك" />
                  </div>
                  {content.facebook}
                </div>
              </TabsContent>

              <TabsContent value="propertyFinder" className="mt-2">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap ltr-embed">
                  <div className="absolute top-3 right-3">
                    <CopyButton text={content.propertyFinder} label="Copy PF Text" />
                  </div>
                  {content.propertyFinder}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Optional Image Uploader */}
        <div className="pt-2 border-t border-slate-800/80">
          <ImageUploader images={images} onChange={setImages} />
        </div>
      </div>
    </div>
  )
}
