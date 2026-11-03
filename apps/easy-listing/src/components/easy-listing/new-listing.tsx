'use client'

import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  BedDouble,
  Building2,
  Coins,
  ExternalLink,
  FileText,
  Home,
  Image as ImageIcon,
  Landmark,
  Loader2,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  SquareDashed,
  Table2,
  PartyPopper,
  AlertTriangle,
  Facebook,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { CopyButton } from './copy-button'
import { ImageUploader, type UploadedImage } from './image-uploader'

import type { AppSettings, GeneratedContent, PropertyFields } from '@/lib/types'
import { UNIT_TYPES, buildMapEmbedUrl, buildMapLink, formatPrice, generatePropertyCode } from '@/lib/listing'
import { addSavedProperty, DEFAULT_SECRET, savedCodes } from '@/lib/local-store'
import { exportToSheet, type SheetPayload } from '@/lib/sheets'

interface SaveResult {
  synced: boolean
  configured: boolean
  sheetLink: string
  error: string | null
  code: string
  imageCount: number
}

interface NewListingProps {
  settings: AppSettings
  onOpenSettings: () => void
  onOpenSetup: () => void
  onSaved: () => void
}

const EXAMPLE_DESCRIPTION =
  'شقة مفروشة للبيع في ميفيدا القاهرة الجديدة، 3 غرف نوم و3 حمامات، مساحة 220 متر، الدور الثالث، فيو لاندسكيب، استلام فوري، السعر 10 مليون و500 ألف.'

export function NewListing({ settings, onOpenSettings, onOpenSetup, onSaved }: NewListingProps) {
  const [description, setDescription] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  const [phase, setPhase] = useState<'idle' | 'extracting' | 'generating'>('idle')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fields, setFields] = useState<PropertyFields | null>(null)
  const [extractSource, setExtractSource] = useState<'ai' | 'fallback'>('ai')
  const [code, setCode] = useState('')
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [saved, setSaved] = useState<SaveResult | null>(null)

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
    setSaved(null)
  }

  async function callGenerate(f: PropertyFields, showLoader: 'full' | 'regen') {
    if (showLoader === 'full') setPhase('generating')
    else setRegenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: f,
          description,
          companyPhone: settings.companyPhone,
          existingCodes: savedCodes(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'تعذر توليد المحتوى')
      setCode(String(data.code))
      setContent(data.content as GeneratedContent)
      setFields(data.fields as PropertyFields)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر توليد المحتوى')
    } finally {
      setPhase('idle')
      setRegenerating(false)
    }
  }

  async function handleExtract() {
    const desc = description.trim()
    if (desc.length < 15) {
      toast.warning('اكتب وصف الوحدة أولًا (١٥ حرف على الأقل)')
      return
    }
    if (!/^[+\d][\d\s-]{7,17}$/.test(ownerPhone.trim())) {
      toast.warning('اكتب رقم هاتف المالك صح (مثال: 01012345678)')
      return
    }
    setSaved(null)
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
      setExtractSource(data.source === 'fallback' ? 'fallback' : 'ai')
      setFields(extracted)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر استخراج البيانات')
      setPhase('idle')
      return
    }
    await callGenerate(extracted, 'full')
    if (extracted && !extracted.compound) {
      toast.info('لم نجد اسم الكومباوند في الوصف — اكتبه يدويًا في تفاصيل الوحدة')
    }
  }

  async function handleSave() {
    if (!fields || !content) return
    if (!fields.compound.trim()) {
      toast.warning('اسم الكومباوند مطلوب قبل الحفظ')
      return
    }
    const phoneDigits = ownerPhone.replace(/\D/g, '')
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      toast.warning('اكتب رقم هاتف المالك صح (مثال: 01012345678)')
      return
    }
    setSaving(true)
    try {
      const configured = Boolean(settings.appsScriptUrl)
      let synced = false
      let sheetError: string | null = null
      let driveUrls: string[] = []

      // Final unique code (checked against codes saved on this device)
      let finalCode = code
      const used = savedCodes()
      if (!finalCode || used.includes(finalCode)) {
        finalCode = generatePropertyCode(fields, used)
      }
      // If the code changed after the content was generated, patch the content strings
      let finalContent: GeneratedContent = content
      if (code && finalCode !== code) {
        finalContent = {
          whatsapp: content.whatsapp.split(code).join(finalCode),
          facebook: content.facebook.split(code).join(finalCode),
          propertyFinder: content.propertyFinder.split(code).join(finalCode),
        }
        setContent(finalContent)
        setCode(finalCode)
      }

      const payload: SheetPayload = {
        // The merged Sierra engine requires the shared secret and routes
        // easy-listing saves to the "Listings" tab (Mode C in doPost).
        mode: 'easy_listing',
        secret: settings.secret || DEFAULT_SECRET,
        code: finalCode,
        compound: fields.compound,
        bedrooms: fields.bedrooms,
        bathrooms: fields.bathrooms,
        area: fields.area,
        price: fields.price,
        currency: fields.currency,
        furnished: fields.furnished,
        ownerPhone: ownerPhone.trim(),
        whatsappContent: finalContent.whatsapp,
        facebookContent: finalContent.facebook,
        pfContent: finalContent.propertyFinder,
        mapLink,
        images: images.map((i) => ({ name: i.name, mime: i.mime, data: i.base64 })),
        createdAt: new Date().toISOString(),
      }
      if (configured) {
        const result = await exportToSheet(settings.appsScriptUrl, payload)
        synced = result.ok
        sheetError = result.error ?? null
        driveUrls = result.urls ?? []
      }

      addSavedProperty({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        code: finalCode,
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
        ownerPhone: ownerPhone.trim(),
        description: description.slice(0, 6000),
        language: fields.language,
        highlights: JSON.stringify(fields.highlights ?? []),
        whatsappContent: finalContent.whatsapp,
        facebookContent: finalContent.facebook,
        pfContent: finalContent.propertyFinder,
        mapLink,
        imageUrls: JSON.stringify(driveUrls),
        sheetSynced: synced,
        sheetError,
        createdAt: new Date().toISOString(),
      })

      setSaved({
        synced,
        configured,
        sheetLink: settings.sheetLink || '',
        error: sheetError,
        code: finalCode,
        imageCount: driveUrls.length,
      })

      if (configured && synced) {
        toast.success('تم حفظ الوحدة ومزامنتها مع Google Sheets ✅')
      } else if (configured && !synced) {
        toast.error('تم الحفظ محليًا، لكن مزامنة الشيت فشلت — راجع لينك الـ Apps Script')
      } else {
        toast.success('تم حفظ الوحدة (محليًا) ✅ — اربط Google Sheets للمزامنة')
      }
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  function resetAll() {
    setDescription('')
    setOwnerPhone('')
    setImages([])
    setFields(null)
    setCode('')
    setContent(null)
    setSaved(null)
    setPhase('idle')
  }

  const busy = phase !== 'idle' || regenerating || saving
  const step = !fields ? 1 : !content ? 2 : 3

  return (
    <div className="space-y-5">
      {/* Steps indicator */}
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {[
          { n: 1, label: 'الوصف والصور', icon: FileText },
          { n: 2, label: 'راجع التفاصيل', icon: BadgeCheck },
          { n: 3, label: 'المحتوى والحفظ', icon: Send },
        ].map(({ n, label, icon: Icon }) => (
          <li
            key={n}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
              step === n
                ? 'border-primary bg-primary text-primary-foreground'
                : step > n
                  ? 'border-primary/40 bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground'
            }`}
          >
            {step > n ? <BadgeCheck className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            {label}
          </li>
        ))}
      </ol>

      {/* Sheet not configured warning */}
      {!settings.appsScriptUrl && (
        <Alert className="border-[--gold]/50 bg-accent/60">
          <AlertTriangle className="h-4 w-4 text-[--gold]" />
          <AlertTitle className="text-sm font-bold">Google Sheets غير مرتبط بعد</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            الحفظ هيتم محليًا في الأول. عشان كل وحدة تتحفظ كصف في شيت جوجل (مجاني ١٠٠٪) اضغط{' '}
            <button className="font-bold underline underline-offset-2" onClick={onOpenSetup}>
              دليل الربط
            </button>{' '}
            واتبع ٤ خطوات، أو افتح{' '}
            <button className="font-bold underline underline-offset-2" onClick={onOpenSettings}>
              الإعدادات
            </button>{' '}
            لو عندك اللينك جاهز.
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: input */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              ١
            </span>
            بيانات الوحدة
          </CardTitle>
          <CardDescription>
            الصق وصف الوحدة زي ما المالك أو الكوليجر بعتة (عربي أو English) وارفع الصور واكتب تليفون المالك.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">وصف الوحدة</Label>
            <Textarea
              id="description"
              dir="auto"
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setSaved(null)
              }}
              placeholder={EXAMPLE_DESCRIPTION}
              className="text-sm leading-relaxed"
            />
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
              onClick={() => setDescription(EXAMPLE_DESCRIPTION)}
            >
              جرّب مثال جاهز
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerPhone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> هاتف المالك
              </Label>
              <Input
                id="ownerPhone"
                dir="ltr"
                inputMode="tel"
                className="text-start"
                placeholder="01012345678"
                value={ownerPhone}
                onChange={(e) => {
                  setOwnerPhone(e.target.value)
                  setSaved(null)
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> صور الوحدة
              </Label>
              <ImageUploader images={images} onChange={setImages} max={10} />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-base font-bold"
            onClick={handleExtract}
            disabled={busy}
          >
            {phase === 'extracting' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> جاري استخراج البيانات…
              </>
            ) : phase === 'generating' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> جاري توليد المحتوى…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> استخرج البيانات وولّد المحتوى
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: editable details */}
      {fields && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                ٢
              </span>
              تفاصيل الوحدة
              {extractSource === 'ai' ? (
                <Badge variant="secondary" className="gap-1 font-medium">
                  <Sparkles className="h-3 w-3" /> مستخرجة بالذكاء الاصطناعي
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 font-medium">
                  <MousePointerClick className="h-3 w-3" /> استخراج تقريبي — راجعها كويس
                </Badge>
              )}
            </CardTitle>
            <CardDescription>عدّل أي حاجة ناقصة أو غلط، وبعدين حدّث المحتوى لو محتاج.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div className="col-span-2 space-y-1.5 sm:col-span-2">
                <Label htmlFor="f-compound" className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5" /> الكومباوند / الكوميونيتي
                </Label>
                <Input
                  id="f-compound"
                  dir="auto"
                  value={fields.compound}
                  onChange={(e) => setField('compound', e.target.value)}
                  placeholder="Mivida"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-city" className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3.5 w-3.5" /> المدينة / المنطقة
                </Label>
                <Input
                  id="f-city"
                  dir="auto"
                  value={fields.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="New Cairo"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Home className="h-3.5 w-3.5" /> نوع الوحدة
                </Label>
                <Select value={fields.unitType} onValueChange={(v) => setField('unitType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-bed" className="flex items-center gap-1.5 text-xs">
                  <BedDouble className="h-3.5 w-3.5" /> غرف النوم
                </Label>
                <Input
                  id="f-bed"
                  type="number"
                  min={0}
                  max={30}
                  dir="ltr"
                  className="text-start"
                  value={fields.bedrooms || ''}
                  onChange={(e) => setField('bedrooms', Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-bath" className="text-xs">
                  الحمامات
                </Label>
                <Input
                  id="f-bath"
                  type="number"
                  min={0}
                  max={30}
                  dir="ltr"
                  className="text-start"
                  value={fields.bathrooms || ''}
                  onChange={(e) => setField('bathrooms', Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-area" className="text-xs">
                  المساحة (م²)
                </Label>
                <Input
                  id="f-area"
                  type="number"
                  min={0}
                  dir="ltr"
                  className="text-start"
                  value={fields.area ?? ''}
                  onChange={(e) => setField('area', e.target.value ? Number(e.target.value) : null)}
                  placeholder="220"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-floor" className="text-xs">
                  الدور
                </Label>
                <Input
                  id="f-floor"
                  dir="auto"
                  value={fields.floor}
                  onChange={(e) => setField('floor', e.target.value)}
                  placeholder="3 / G"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-price" className="flex items-center gap-1.5 text-xs">
                  <Coins className="h-3.5 w-3.5" /> السعر
                </Label>
                <Input
                  id="f-price"
                  type="number"
                  min={0}
                  dir="ltr"
                  className="text-start"
                  value={fields.price ?? ''}
                  onChange={(e) => setField('price', e.target.value ? Number(e.target.value) : null)}
                  placeholder="10500000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">العملة</Label>
                <Select
                  value={fields.currency}
                  onValueChange={(v) => setField('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['EGP', 'USD', 'EUR', 'SAR', 'AED'].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <Label htmlFor="f-furnished" className="text-xs font-medium">
                  مفروشة؟
                </Label>
                <Switch
                  id="f-furnished"
                  checked={fields.furnished}
                  onCheckedChange={(v) => setField('furnished', v)}
                />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="f-highlights" className="text-xs">
                  مميزات إضافية (افصل بينها بفاصلة)
                </Label>
                <Input
                  id="f-highlights"
                  dir="auto"
                  value={fields.highlights.join('، ')}
                  onChange={(e) =>
                    setField(
                      'highlights',
                      e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="فيو لاندسكيب، استلام فوري، جاردن"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => void callGenerate(fields, 'regen')}
                disabled={busy}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري التحديث…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> أعد توليد المحتوى بعد التعديل
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                السعر الحالي: {formatPrice(fields.price, fields.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: content + map + save */}
      {content && fields && (
        <>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  ٣
                </span>
                المحتوى الجاهز للنشر
                <Badge variant="outline" className="gap-1.5">
                  <Landmark className="h-3 w-3" /> كود الوحدة
                </Badge>
              </CardTitle>
              <CardDescription>انسخ المحتوى وابعتة للعملاء أو انشرة — كله جاهز.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/50 p-3">
                <code className="ltr-embed rounded-lg bg-primary px-4 py-2 font-mono text-lg font-extrabold tracking-wider text-primary-foreground">
                  {code}
                </code>
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                  البادئة من الكومباوند + عدد الغرف مع حالة الفرش (F مفروش / U غير مفروش) + السعر
                </div>
                <CopyButton text={code} label="انسخ الكود" variant="outline" />
              </div>

              <Tabs defaultValue="whatsapp">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="whatsapp" className="gap-1.5">
                    <MessageCircle className="h-4 w-4" /> واتساب
                  </TabsTrigger>
                  <TabsTrigger value="facebook" className="gap-1.5">
                    <Facebook className="h-4 w-4" /> فيسبوك
                  </TabsTrigger>
                  <TabsTrigger value="pf" className="gap-1.5">
                    <Table2 className="h-4 w-4" /> بروبيرتي فايندر
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp" className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">رسالة واتساب جاهزة للإرسال للعملاء</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(content.whatsapp)}`,
                            '_blank'
                          )
                        }
                      >
                        <Send className="h-4 w-4" /> ابعتها واتساب
                      </Button>
                      <CopyButton text={content.whatsapp} label="نسخ الرسالة" />
                    </div>
                  </div>
                  <pre className="content-pre max-h-96 overflow-y-auto rounded-xl border bg-[#e8f5ee] p-4 text-sm dark:bg-[#12241d]">
                    {content.whatsapp}
                  </pre>
                </TabsContent>

                <TabsContent value="facebook" className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">بوست فيسبوك جاهز — ارفق الصور مع البوست</p>
                    <CopyButton text={content.facebook} label="نسخ البوست" />
                  </div>
                  <pre className="content-pre max-h-96 overflow-y-auto rounded-xl border bg-muted/60 p-4 text-sm">
                    {content.facebook}
                  </pre>
                </TabsContent>

                <TabsContent value="pf" className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      بيانات البروبيرتي فايندر بالإنجليزي (Listing بالتفصيل)
                    </p>
                    <CopyButton text={content.propertyFinder} label="نسخ الليستينج" />
                  </div>
                  <pre className="content-pre ltr-embed max-h-96 overflow-y-auto rounded-xl border bg-muted/60 p-4 text-sm">
                    {content.propertyFinder}
                  </pre>
                </TabsContent>
              </Tabs>

              {images.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <ImageIcon className="h-3.5 w-3.5" /> صور الوحدة ({images.length}) — هتترفع
                      تلقائيًا على Google Drive مع الحفظ، وروابطها هتتحفظ في الشيت
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          className="aspect-square overflow-hidden rounded-md border bg-muted"
                          title={img.name}
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="h-full w-full object-cover transition-transform hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" /> موقع الوحدة على الخريطة
              </CardTitle>
              <CardDescription>
                محدد تلقائيًا من اسم الكومباوند والمدينة — لو الاسم مش دقيق عدّله فوق وهتتحدث الخريطة.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  key={mapEmbedUrl}
                  src={mapEmbedUrl}
                  title={`خريطة ${fields.compound}`}
                  className="h-64 w-full sm:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(mapLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" /> افتح في Google Maps
                </Button>
                <CopyButton text={mapLink} label="انسخ لينك الموقع" variant="outline" />
                <span className="ltr-embed max-w-full truncate text-xs text-muted-foreground sm:max-w-md">
                  {mapLink}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Card>
            <CardContent className="space-y-3 pt-6">
              {saved ? (
                <Alert
                  className={
                    saved.configured && saved.synced
                      ? 'border-primary/40 bg-[#e8f5ee] dark:bg-[#12241d]'
                      : 'border-[--gold]/50 bg-accent/50'
                  }
                >
                  {saved.configured && saved.synced ? (
                    <PartyPopper className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[--gold]" />
                  )}
                  <AlertTitle className="text-sm font-bold">
                    {saved.configured && saved.synced
                      ? 'تم الحفظ في Google Sheets ✅'
                      : saved.configured
                        ? 'اتحفظ محليًا — مزامنة الشيت فشلت'
                        : 'تم الحفظ محليًا ✅'}
                  </AlertTitle>
                  <AlertDescription className="space-y-1 text-xs">
                    <p>
                      كود الوحدة <code className="font-mono font-bold">{saved.code}</code> اتضاف
                      لقائمة الوحدات المحفوظة.
                    </p>
                    {saved.synced && saved.imageCount > 0 && (
                      <p>
                        ☁️ {saved.imageCount} صورة اترفعت على Google Drive وروابطها اتكتبت في الشيت.
                      </p>
                    )}
                    {saved.configured && saved.synced && saved.sheetLink && (
                      <a
                        href={saved.sheetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline underline-offset-2"
                      >
                        افتح صف الوحدة في Google Sheets ↗
                      </a>
                    )}
                    {saved.error && <p className="text-destructive">سبب الفشل: {saved.error}</p>}
                    {!saved.configured && (
                      <p>لما تربط الشيت من الإعدادات، الوحدات الجديدة هتتحفظ فيه تلقائيًا.</p>
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1 gap-2 text-base font-bold"
                  onClick={handleSave}
                  disabled={busy || Boolean(saved)}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> جاري الحفظ…
                    </>
                  ) : saved ? (
                    <>
                      <BadgeCheck className="h-5 w-5" /> تم حفظ الوحدة
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" /> احفظ الوحدة{' '}
                      {settings.appsScriptUrl ? 'في Google Sheets' : 'في القائمة'}
                    </>
                  )}
                </Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={resetAll} disabled={busy}>
                  <SquareDashed className="h-5 w-5" /> وحدة جديدة
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                الحفظ بيضيف صف جديد في الشيت بكل البيانات: الكود، التفاصيل، المحتوى، لينك الخريطة،
                وروابط الصور.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
