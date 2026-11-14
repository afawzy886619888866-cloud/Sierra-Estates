'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  UserCheck,
  User,
  Briefcase,
  Database,
  Table2,
  Share2,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  Trash2,
  Tag,
  Key,
  ChevronDown,
  X,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { CopyButton } from './copy-button'
import { compressImage } from '@/lib/client-utils'
import type { UploadedImage } from './image-uploader'

import type { AdvertiserRole, AppSettings, GeneratedContent, PropertyFields, SavedProperty } from '@/lib/types'
import { UNIT_TYPES, buildMapEmbedUrl, buildMapLink, formatPrice, generatePropertyCode } from '@/lib/listing'
import { addSavedProperty, DEFAULT_SECRET, savedCodes } from '@/lib/local-store'
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
    name: 'فيفث سكوير (8.8M)',
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

const TOP_COMPOUNDS = [
  { value: 'ميفيدا (Mivida)', label: 'ميفيدا (Mivida - إعمار)' },
  { value: 'سوديك فيليت (Villette)', label: 'سوديك فيليت (Villette SODIC)' },
  { value: 'قطامية ديونز (Katameya Dunes)', label: 'قطامية ديونز (Katameya Dunes)' },
  { value: 'بالم هيلز (Palm Hills)', label: 'بالم هيلز (Palm Hills)' },
  { value: 'ماونتن فيو (Mountain View)', label: 'ماونتن فيو (Mountain View)' },
  { value: 'ليك فيو (Lake View)', label: 'ليك فيو (Lake View)' },
  { value: 'فيفث سكوير (Fifth Square)', label: 'فيفث سكوير (Fifth Square المراسم)' },
  { value: 'هايد بارك (Hyde Park)', label: 'هايد بارك (Hyde Park)' },
  { value: 'إيست تاون (Eastown)', label: 'إيست تاون (Eastown SODIC)' },
  { value: 'مدينتي (Madinaty)', label: 'مدينتي (Madinaty طلعت مصطفى)' },
  { value: 'الرحاب (Al Rehab)', label: 'الرحاب (Al Rehab طلعت مصطفى)' },
  { value: 'واتر واي (The Waterway)', label: 'واتر واي (The Waterway)' },
]

const COUNTRY_CODES = [
  { code: '+20', country: 'مصر', flag: '🇪🇬' },
  { code: '+966', country: 'السعودية', flag: '🇸🇦' },
  { code: '+971', country: 'الإمارات', flag: '🇦🇪' },
  { code: '+965', country: 'الكويت', flag: '🇰🇼' },
  { code: '+974', country: 'قطر', flag: '🇶🇦' },
  { code: '+1', country: 'أمريكا / كندا', flag: '🇺🇸' },
]

export function NewListing({
  settings,
  onOpenSettings,
  onOpenSetup,
  onSaved,
  initialProperty,
  onClearInitialProperty,
}: NewListingProps) {
  // ── Step Navigation & Progress ──
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)

  // ── Contact & Role Identity ──
  const [role, setRole] = useState<AdvertiserRole>('OWNER')
  const [countryCode, setCountryCode] = useState('+20')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [contactName, setContactName] = useState('')

  // ── Property Text & Intake ──
  const [description, setDescription] = useState('')
  const [offerType, setOfferType] = useState<'sale' | 'rent'>('sale')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setActiveStep(2)
      toast.info(`تم تحميل وحدة ${initialProperty.compound} في الاستوديو بنجاح`)
    }
  }, [initialProperty])

  const mapLink = useMemo(
    () => (fields ? buildMapLink(fields.compound, fields.city) : ''),
    [fields?.compound, fields?.city]
  )

  function setField<K extends keyof PropertyFields>(key: K, value: PropertyFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSyncResult(null)
  }

  // Handle phone changes
  function handlePhoneChange(val: string) {
    setOwnerPhone(val)
    setSyncResult(null)
  }

  // Text paste auto-extraction of phone and role hint
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
    // Auto-detect role hint
    const roleHint = detectRoleFromText(val)
    if (roleHint && role === 'OWNER') {
      setRole(roleHint)
    }
    // Detect rent vs sale
    if (val.includes('إيجار') || val.includes('ايجار') || val.toLowerCase().includes('rent')) {
      setOfferType('rent')
    } else if (val.includes('بيع') || val.toLowerCase().includes('sale')) {
      setOfferType('sale')
    }
  }

  function applyPreset(p: typeof REAL_PRESETS[0]) {
    setRole(p.role)
    setOwnerPhone(p.phone)
    if (p.employeeName) setEmployeeName(p.employeeName)
    if (p.contactName) setContactName(p.contactName)
    setDescription(p.text)
    setSyncResult(null)
    setActiveStep(1)
    toast.success(`تم اختيار نموذج ${p.name}`)
  }

  // ── AI Extraction + Generation ──
  async function handleExtractAndGenerate() {
    const desc = description.trim()
    if (desc.length < 10) {
      toast.warning('الصق أو اكتب تفاصيل الوحدة أولاً (١٠ أحرف على الأقل)')
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
      setActiveStep(2)
      toast.success('✨ تم استخراج وتعبئة البيانات بنجاح!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر توليد المحتوى')
    } finally {
      setPhase('idle')
    }
  }

  // ── Local Draft Saving ──
  function handleSaveDraft() {
    if (!description.trim() && !fields?.compound) {
      toast.warning('يرجى كتابة بعض التفاصيل أو استخراج العقار قبل حفظ المسودة')
      return
    }
    const finalCode = code || `DRAFT-${Date.now().toString(36).toUpperCase()}`
    addSavedProperty({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: finalCode,
      compound: fields?.compound || 'مسودة عقار جديد',
      city: fields?.city || 'New Cairo',
      unitType: fields?.unitType || 'apartment',
      bedrooms: fields?.bedrooms || 3,
      bathrooms: fields?.bathrooms || 2,
      area: fields?.area || null,
      floor: fields?.floor || null,
      price: fields?.price || null,
      currency: fields?.currency || 'EGP',
      furnished: fields?.furnished || false,
      role,
      contactName: contactName.trim() || undefined,
      employeeName: employeeName.trim() || undefined,
      ownerPhone: ownerPhone.trim(),
      description: description.slice(0, 6000),
      language: 'ar',
      highlights: JSON.stringify(fields?.highlights ?? []),
      whatsappContent: content?.whatsapp || description,
      facebookContent: content?.facebook || '',
      pfContent: content?.propertyFinder || '',
      mapLink,
      imageUrls: JSON.stringify([]),
      sheetSynced: false,
      sheetError: null,
      supabaseSynced: false,
      mapSynced: Boolean(mapLink),
      source: 'manual',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    })
    onSaved()
    toast.success(`تم حفظ المسودة بنجاح في سجل الوحدات المحلي (${finalCode})`)
  }

  // ── 1-Click Universal Multi-Sync ──
  async function handleUniversalSync() {
    if (!fields || !content) {
      toast.warning('اضغط أولاً على "استخراج وتعبئة البيانات تلقائياً"')
      setActiveStep(1)
      return
    }
    if (!fields.compound.trim()) {
      toast.warning('يرجى تحديد أو كتابة اسم الكمبوند في الخطوة ٢')
      setActiveStep(2)
      return
    }
    const cleanPhone = ownerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 8) {
      toast.warning('يرجى إدخال رقم هاتف صحيح في الخطوة ٣')
      setActiveStep(3)
      return
    }
    if (role === 'EMPLOYEE' && !employeeName.trim()) {
      toast.warning('يرجى كتابة اسم الموظف المسئول أو الكود الداخلي')
      setActiveStep(3)
      return
    }

    setSaving(true)
    setSyncResult(null)

    const fullPhone = ownerPhone.startsWith('+') ? ownerPhone.trim() : `${countryCode}${cleanPhone}`

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
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          phone: fullPhone,
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
        ownerPhone: fullPhone,
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
      toast.success(`🎉 تم تأكيد ونشر ومزامنة الوحدة بنجاح! (${finalCode})`)
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

  // ── Image Handling ──
  async function handleImageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    const remaining = 10 - images.length
    if (remaining <= 0) {
      toast.warning('الحد الأقصى للصور هو ١٠ صور')
      return
    }
    const selected = files.slice(0, remaining)
    setImageBusy(true)
    try {
      const added: UploadedImage[] = []
      for (const file of selected) {
        const blob = await compressImage(file)
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((res, rej) => {
          reader.onload = () => res(String(reader.result))
          reader.onerror = rej
          reader.readAsDataURL(blob)
        })
        added.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
          mime: 'image/jpeg',
          dataUrl,
          base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
          size: blob.size,
        })
      }
      setImages((prev) => [...prev, ...added])
      toast.success(`تم إرفاق ${added.length} صورة بنجاح`)
    } catch {
      toast.error('تعذر معالجة بعض الصور')
    } finally {
      setImageBusy(false)
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto" dir="rtl">
      {/* ── Loaded from Resume / Bot Intake Banner ── */}
      {initialProperty && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-high border border-primary-container/40 text-xs shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary-container/20 text-primary-container">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-on-surface">
              تم تحميل الوحدة من <b>سجل الأونرز ومحادثات البوت</b>:{' '}
              <span className="text-primary-container font-mono font-bold">{initialProperty.compound} ({initialProperty.code})</span>
            </span>
          </div>
          {onClearInitialProperty && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearInitialProperty}
              className="text-xs h-7 border-[#222a3d] text-slate-300 hover:text-white hover:bg-surface-variant cursor-pointer"
            >
              بدء وحدة جديدة
            </Button>
          )}
        </div>
      )}

      {/* ── Top Guidance & Instruction Banner (Stitch Obsidian Theme) ── */}
      <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-[#222a3d]/80">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-primary-container"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high text-primary-container border border-primary-container/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-label-sm text-xs text-primary uppercase tracking-wide font-bold">
                بوابة إضافة وتوثيق العقارات المباشرة
              </span>
              <span className="text-xs text-outline">•</span>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                sierra-estates.net/easy-listing
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              إضافة عقار عبر الذكاء الاصطناعي
            </h1>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              الصق نص الإعلان أو رسالة الواتساب ليستخرج النظام المواصفات والسعر والكمبوند تلقائياً وفورياً، ثم راجع الحقول وشارك وحدتك في شبكة سييرا إستيتس الحصرية وقنوات البيع المعتمدة.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5 text-primary-container" />
                <span>عرض فوري على الخريطة والرادار</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Building2 className="h-3.5 w-3.5 text-primary-container" />
                <span>مطابقة فورية مع مشترين جاهزين</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5 text-primary-container" />
                <span>بدون أي رسوم مسبقة</span>
              </div>
            </div>
          </div>

          {/* Smart Progress Track */}
          <div className="bg-surface-container rounded-lg p-4 min-w-[280px] shadow-sm border border-[#222a3d] shrink-0">
            <span className="font-label-sm text-[11px] text-on-surface-variant block mb-3 font-semibold uppercase">
              مسار الإنجاز الذكي
            </span>
            <div className="flex items-center justify-between text-on-surface gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeStep === 1 ? 'text-primary-container' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStep === 1 ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_#00e5ff]' : 'bg-surface-container-highest text-on-surface'
                }`}>١</span>
                <span>لصق الإعلان</span>
              </button>

              <span className="text-outline text-xs">←</span>

              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeStep === 2 ? 'text-primary-container' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStep === 2 ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_#00e5ff]' : 'bg-surface-container-highest text-on-surface'
                }`}>٢</span>
                <span>مراجعة البيانات</span>
              </button>

              <span className="text-outline text-xs">←</span>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeStep === 3 ? 'text-primary-container' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                  activeStep === 3 ? 'bg-primary-container text-on-primary-container shadow-[0_0_8px_#00e5ff]' : 'bg-surface-container-highest text-on-surface'
                }`}>٣</span>
                <span>الصور والناشر</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP 1: AI Prompt / Text Input (Stitch Obsidian Theme) ── */}
      <div className="bg-surface-container rounded-xl p-6 sm:p-8 shadow-md flex flex-col gap-5 border border-[#222a3d]/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 flex items-center justify-center font-bold text-sm">
              ١
            </span>
            <label className="text-base text-white font-semibold flex items-center gap-2" htmlFor="property-raw-text">
              <Sparkles className="h-4 w-4 text-primary-container" />
              لصق تفاصيل أو إعلان وحدتك هنا
            </label>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">نماذج سريعة:</span>
            {REAL_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-variant text-primary border border-[#222a3d] hover:border-primary-container/40 transition-all cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative w-full">
          <Textarea
            id="property-raw-text"
            rows={5}
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline p-4 sm:p-5 rounded-lg focus:outline-none text-sm sm:text-base leading-relaxed resize-none transition-all shadow-inner border border-[#222a3d] focus-within:border-primary-container/60 focus:ring-1 focus:ring-primary-container/40"
            placeholder="الصق نص الإعلان، رسائل الواتساب، أو مسودة تفاصيل العقار بالعربية أو الإنجليزية (مثال: للبيع فيلا تاون هاوس في ميفيدا التجمع الخامس، مساحة 280م، 4 غرف، تشطيب كامل، السعر 18,500,000 ج.م كاش...)"
          />
          <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none text-outline text-[11px]">
            <span>يدعم العربية والإنجليزية تلقائياً</span>
          </div>
        </div>

        {/* Bottom tags & Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-on-surface-variant ml-1 font-medium">الحقول المستهدفة:</span>
            <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface text-xs border border-[#222a3d]">نوع الإعلان</span>
            <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface text-xs border border-[#222a3d]">الكمبوند والموقع</span>
            <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface text-xs border border-[#222a3d]">نوع العقار والمساحة</span>
            <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface text-xs border border-[#222a3d]">السعر والتشطيب</span>
          </div>

          <button
            type="button"
            onClick={handleExtractAndGenerate}
            disabled={phase !== 'idle' || !description.trim()}
            className="stitch-cyan-btn flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === 'extracting' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-on-primary-container" />
                <span>جاري استخراج المواصفات...</span>
              </>
            ) : phase === 'generating' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-on-primary-container" />
                <span>جاري صياغة المحتوى والكود...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-on-primary-container" />
                <span>✨ استخراج وتعبئة البيانات تلقائياً</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── STEP 2: Property Verification & Fields ── */}
      <div className="bg-surface-container rounded-xl p-6 sm:p-8 shadow-md flex flex-col gap-6 border border-[#222a3d]/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#222a3d]">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 flex items-center justify-center font-bold text-sm">
              ٢
            </span>
            <span className="text-base text-white font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              مراجعة وتأكيد بيانات العقار
            </span>
          </div>
          {fields && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              تم استخراج وتحديث الحقول بنجاح
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Listing Type Toggle (Sale / Rent) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium">نوع الإعلان</label>
            <div className="grid grid-cols-2 gap-2 bg-surface-container-lowest p-1.5 rounded-lg border border-[#222a3d]">
              <button
                type="button"
                onClick={() => setOfferType('sale')}
                className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  offerType === 'sale'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-white'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>للبيع</span>
              </button>
              <button
                type="button"
                onClick={() => setOfferType('rent')}
                className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  offerType === 'rent'
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-white'
                }`}
              >
                <Key className="h-3.5 w-3.5" />
                <span>للإيجار</span>
              </button>
            </div>
          </div>

          {/* Compound Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-compound">
              الكمبوند / المشروع
            </label>
            <div className="relative">
              <input
                id="property-compound"
                list="compounds-list"
                value={fields?.compound || ''}
                onChange={(e) => setField('compound', e.target.value)}
                placeholder="اختر أو اكتب اسم الكمبوند (مثال: ميفيدا)"
                className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
              />
              <datalist id="compounds-list">
                {TOP_COMPOUNDS.map((c) => (
                  <option key={c.value} value={c.value} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Property Type Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-type">
              نوع العقار
            </label>
            <select
              id="property-type"
              value={fields?.unitType || 'apartment'}
              onChange={(e) => setField('unitType', e.target.value)}
              className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none cursor-pointer shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
            >
              {UNIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.ar} ({t.en})
                </option>
              ))}
            </select>
          </div>

          {/* City / Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-city">
              المدينة / الحي
            </label>
            <input
              id="property-city"
              value={fields?.city || 'New Cairo'}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="مثال: التجمع الخامس / New Cairo"
              className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
            />
          </div>

          {/* Area (sqm) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-area">
              المساحة (م²)
            </label>
            <input
              id="property-area"
              type="number"
              value={fields?.area ?? ''}
              onChange={(e) => setField('area', e.target.value ? Number(e.target.value) : null)}
              placeholder="مثال: 185"
              className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60 font-mono"
            />
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-beds">
                غرف النوم
              </label>
              <input
                id="property-beds"
                type="number"
                value={fields?.bedrooms ?? 3}
                onChange={(e) => setField('bedrooms', Number(e.target.value))}
                className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60 font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-baths">
                الحمامات
              </label>
              <input
                id="property-baths"
                type="number"
                value={fields?.bathrooms ?? 2}
                onChange={(e) => setField('bathrooms', Number(e.target.value))}
                className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60 font-mono"
              />
            </div>
          </div>

          {/* Floor */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-floor">
              الدور / الطابق
            </label>
            <input
              id="property-floor"
              value={fields?.floor || ''}
              onChange={(e) => setField('floor', e.target.value)}
              placeholder="مثال: الدور الثالث / أرضي بحديقة"
              className="w-full bg-surface-container-lowest text-on-surface text-sm py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
            />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="property-price">
              السعر الإجمالي (ج.م)
            </label>
            <input
              id="property-price"
              type="number"
              value={fields?.price ?? ''}
              onChange={(e) => setField('price', e.target.value ? Number(e.target.value) : null)}
              placeholder="مثال: 10500000"
              className="w-full bg-surface-container-lowest text-primary-container font-mono text-base font-bold py-3 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
            />
          </div>

          {/* Furnished Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-[#222a3d]">
            <span className="text-xs text-on-surface font-medium">حالة الفرش</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={fields?.furnished ?? false}
                onCheckedChange={(v) => setField('furnished', v)}
              />
              <span className="text-xs text-primary-container font-semibold">
                {fields?.furnished ? 'مفروشة بالكامل' : 'غير مفروشة'}
              </span>
            </div>
          </div>

          {/* Map Link / Geolocation */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest border border-[#222a3d]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-container" />
              <span className="text-xs text-on-surface font-medium">موقع الخريطة والرادار GIS</span>
            </div>
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-container hover:underline flex items-center gap-1 font-mono"
              >
                فتح Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-outline">سيتم التحديد تلقائياً مع الكمبوند</span>
            )}
          </div>
        </div>
      </div>

      {/* ── STEP 3: Publisher Details & Media Images ── */}
      <div className="bg-surface-container rounded-xl p-6 sm:p-8 shadow-md flex flex-col gap-6 border border-[#222a3d]/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#222a3d]">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 flex items-center justify-center font-bold text-sm">
              ٣
            </span>
            <span className="text-base text-white font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              بيانات المعلن والصور
            </span>
          </div>
          <span className="text-xs text-on-surface-variant">توجيه فوري إلى سجلات النظام المشفرة</span>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col gap-3">
          <label className="text-xs text-on-surface-variant font-medium">حدد صفتك القانونية بالنسبة للعقار</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Owner */}
            <label
              onClick={() => setRole('OWNER')}
              className={`cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                role === 'OWNER'
                  ? 'bg-surface-container-high border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-surface-container-lowest border-[#222a3d] hover:bg-surface-container-high'
              }`}
            >
              <input
                type="radio"
                name="user_role"
                value="OWNER"
                checked={role === 'OWNER'}
                onChange={() => setRole('OWNER')}
                className="accent-primary-container w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  👑 أنا المالك مباشرة
                </span>
                <span className="text-[10px] text-primary-container font-mono">(شيت وقاعدة الملاك)</span>
              </div>
            </label>

            {/* Broker */}
            <label
              onClick={() => setRole('BROKER')}
              className={`cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                role === 'BROKER'
                  ? 'bg-surface-container-high border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-surface-container-lowest border-[#222a3d] hover:bg-surface-container-high'
              }`}
            >
              <input
                type="radio"
                name="user_role"
                value="BROKER"
                checked={role === 'BROKER'}
                onChange={() => setRole('BROKER')}
                className="accent-primary-container w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  💼 أنا وسيط / بروكر
                </span>
                <span className="text-[10px] text-primary-container font-mono">(شيت الوسطاء والخريطة)</span>
              </div>
            </label>

            {/* Agent */}
            <label
              onClick={() => setRole('AGENT')}
              className={`cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                role === 'AGENT'
                  ? 'bg-surface-container-high border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-surface-container-lowest border-[#222a3d] hover:bg-surface-container-high'
              }`}
            >
              <input
                type="radio"
                name="user_role"
                value="AGENT"
                checked={role === 'AGENT'}
                onChange={() => setRole('AGENT')}
                className="accent-primary-container w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  🏷️ وكيل معتمد / شركة
                </span>
                <span className="text-[10px] text-primary-container font-mono">(وكيل حصري معتمد)</span>
              </div>
            </label>

            {/* Employee */}
            <label
              onClick={() => setRole('EMPLOYEE')}
              className={`cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                role === 'EMPLOYEE'
                  ? 'bg-surface-container-high border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-surface-container-lowest border-[#222a3d] hover:bg-surface-container-high'
              }`}
            >
              <input
                type="radio"
                name="user_role"
                value="EMPLOYEE"
                checked={role === 'EMPLOYEE'}
                onChange={() => setRole('EMPLOYEE')}
                className="accent-primary-container w-4 h-4"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  🏢 موظف بالشركة
                </span>
                <span className="text-[10px] text-primary-container font-mono">(كود موظف سييرا)</span>
              </div>
            </label>
          </div>
        </div>

        {/* If Employee: Employee Name / Code */}
        {role === 'EMPLOYEE' && (
          <div className="p-4 rounded-xl bg-primary-container/10 border border-primary-container/40 flex flex-col gap-2 animate-fadeIn">
            <label className="text-xs font-bold text-primary-container flex items-center gap-1.5" htmlFor="employee-name-input">
              <Briefcase className="h-4 w-4" />
              اسم الموظف المسئول أو الكود الداخلي <span className="text-red-400">*</span>
            </label>
            <input
              id="employee-name-input"
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="اكتب اسمك وكودك الوظيفي (مثال: أحمد سعيد - كود SE-104)"
              className="w-full bg-surface-container-lowest text-white text-sm py-3 px-4 rounded-lg focus:outline-none border border-primary-container/50 focus:border-primary-container"
            />
            <p className="text-[11px] text-primary">
              سيتم قيد الوحدة باسمك مباشرة في قاعدة بيانات سوبابيز وشيت المتابعة الداخلي.
            </p>
          </div>
        )}

        {/* Publisher Full Name & Phone Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="publisher-name">
              الاسم بالكامل
            </label>
            <input
              type="text"
              id="publisher-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="اكتب اسم المعلن أو المالك (مثال: عبدالله بن خالد آل مقرن)"
              className="w-full bg-surface-container-lowest text-on-surface text-sm py-3.5 px-4 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant font-medium" htmlFor="phone-number">
              رقم الموبايل / واتساب (مع مفتاح الدولة) <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2" dir="ltr">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-surface-container-lowest text-on-surface text-xs font-bold px-3 py-3.5 rounded-lg select-none shadow-inner shrink-0 border border-[#222a3d] focus:outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <input
                id="phone-number"
                type="tel"
                value={ownerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01092048333"
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-sm placeholder:text-outline p-3.5 rounded-lg focus:outline-none shadow-inner border border-[#222a3d] focus-within:border-primary-container/60"
              />
            </div>
          </div>
        </div>

        {/* Media Images Uploader (Up to 10 images) */}
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary-container" />
              <span className="text-sm font-bold text-white">صور العقار المرفقة ({images.length}/10)</span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-mono">JPG, PNG, WebP حتى 10 صور</span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFiles(e.target.files)}
          />

          {/* Dropzone Button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer group border border-dashed border-[#222a3d] hover:border-primary-container/60"
          >
            <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-white text-xs sm:text-sm font-bold transition-all shadow-md group-hover:scale-[1.02]">
              {imageBusy ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary-container" />
              ) : (
                <UploadCloud className="h-4 w-4 text-primary-container" />
              )}
              <span>اسحب وأفلت صور العقار أو اضغط للاختيار (حتى 10 صور)</span>
            </div>
            <p className="text-xs text-outline">
              يتم ضغط الصور تلقائياً ورفعها ومزامنتها على السحابة مع الحفظ
            </p>
          </div>

          {/* Uploaded Images Strip */}
          {images.length > 0 && (
            <div className="flex flex-col gap-3 pt-2 animate-fadeIn">
              <span className="text-xs text-on-surface-variant font-medium">
                الصور المرفوعة ({images.length} صور جاهزة)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group bg-surface-container-low rounded-lg overflow-hidden shadow-sm aspect-video border border-[#222a3d]"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                      <span>{idx === 0 ? 'الواجهة الرئيسية' : `الصورة ${idx + 1}`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(img.id)
                      }}
                      className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-surface-container-lowest/90 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer"
                      title="حذف الصورة"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Status Banner ── */}
      {syncResult && (
        <div
          className={`p-5 rounded-xl border shadow-lg animate-fadeIn ${
            syncResult.ok
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          {syncResult.ok ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>تمت المزامنة بنجاح وحفظ ونشر الوحدة بكود ({syncResult.code})!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span> سوبابيز:{' '}
                  <span className="font-mono text-emerald-300">{syncResult.supabaseTable || 'listings'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span> جوجل شيت: <span className="text-emerald-300">تم الإدراج</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span> خريطة GIS: <span className="text-emerald-300">تم الربط</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-emerald-400 font-bold">✓</span> سجل المخزون: <span className="text-emerald-300">تم التوثيق</span>
                </div>
              </div>
              {syncResult.sheetLink && (
                <div className="pt-1">
                  <a
                    href={syncResult.sheetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
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
        <div className="bg-surface-container rounded-xl p-6 shadow-md border border-[#222a3d]/80 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary-container" />
              المحتوى التسويقي الجاهز للنشر المباشر:
            </span>
            {code && (
              <span className="font-mono text-xs font-bold text-primary-container bg-surface-container-high px-2.5 py-1 rounded-md border border-primary-container/30">
                {code}
              </span>
            )}
          </div>

          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="bg-surface-container-lowest border border-[#222a3d] p-1 w-full sm:w-auto grid grid-cols-3">
              <TabsTrigger value="whatsapp" className="text-xs gap-1.5 data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container font-bold">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                صيغة واتساب
              </TabsTrigger>
              <TabsTrigger value="facebook" className="text-xs gap-1.5 data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container font-bold">
                <Share2 className="h-3.5 w-3.5 text-blue-400" />
                بوست فيسبوك
              </TabsTrigger>
              <TabsTrigger value="propertyFinder" className="text-xs gap-1.5 data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container font-bold">
                <Building2 className="h-3.5 w-3.5 text-tertiary-container" />
                Property Finder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="mt-2">
              <div className="relative p-4 rounded-xl bg-surface-container-lowest border border-[#222a3d] text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                <div className="absolute top-3 left-3">
                  <CopyButton text={content.whatsapp} label="نسخ نص الواتساب" />
                </div>
                {content.whatsapp}
              </div>
            </TabsContent>

            <TabsContent value="facebook" className="mt-2">
              <div className="relative p-4 rounded-xl bg-surface-container-lowest border border-[#222a3d] text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                <div className="absolute top-3 left-3">
                  <CopyButton text={content.facebook} label="نسخ بوست الفيسبوك" />
                </div>
                {content.facebook}
              </div>
            </TabsContent>

            <TabsContent value="propertyFinder" className="mt-2">
              <div className="relative p-4 rounded-xl bg-surface-container-lowest border border-[#222a3d] text-xs text-on-surface leading-relaxed font-mono whitespace-pre-wrap ltr-embed">
                <div className="absolute top-3 right-3">
                  <CopyButton text={content.propertyFinder} label="Copy PF Text" />
                </div>
                {content.propertyFinder}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ── Bottom Action Buttons ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2 pb-10">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-white font-semibold text-sm transition-all text-center shadow-sm border border-[#222a3d] cursor-pointer"
        >
          حفظ كمسودة
        </button>

        <button
          type="button"
          onClick={handleUniversalSync}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 sm:px-10 py-4 rounded-lg stitch-cyan-btn font-bold text-sm sm:text-base transition-all shadow-[0_0_24px_rgba(0,229,255,0.25)] hover:shadow-[0_0_32px_rgba(0,229,255,0.45)] cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin text-on-primary-container" />
              <span>جاري المزامنة الشاملة مع الأنظمة...</span>
            </>
          ) : (
            <>
              <BadgeCheck className="h-5 w-5 text-on-primary-container" />
              <span>تأكيد ونشر ومزامنة شاملة (Confirm & Multi-Sync)</span>
              <ArrowRight className="h-4 w-4 rotate-180 text-on-primary-container" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
