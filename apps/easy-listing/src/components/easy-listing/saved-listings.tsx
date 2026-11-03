'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BedDouble,
  ExternalLink,
  Eye,
  Facebook,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Table2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

import { CopyButton } from './copy-button'
import type { SavedProperty } from '@/lib/types'
import { formatPrice, unitTypeAr } from '@/lib/listing'
import { formatDateTime } from '@/lib/client-utils'
import { loadSavedProperties, removeSavedProperty, driveThumb } from '@/lib/local-store'

interface SavedListingsProps {
  refreshKey: number
  onCountChange: (n: number) => void
  sheetLink: string
}

export function SavedListings({ refreshKey, onCountChange, sheetLink }: SavedListingsProps) {
  const [items, setItems] = useState<SavedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SavedProperty | null>(null)
  const [toDelete, setToDelete] = useState<SavedProperty | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    try {
      // Local mirror (this browser's recent saves). The full team database
      // lives in the Google Sheet — opened via the button above the table.
      const items = loadSavedProperties()
      setItems(items)
      onCountChange(items.length)
    } catch {
      toast.error('تعذر تحميل الوحدات المحفوظة')
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.compound.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.ownerPhone.includes(q)
    )
  }, [items, query])

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const items = removeSavedProperty(toDelete.id)
      setItems(items)
      onCountChange(items.length)
      toast.success(`تم حذف الوحدة ${toDelete.code} من القائمة المحفوظة`)
      setToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحذف')
    } finally {
      setDeleting(false)
    }
  }

  function sheetBadge(p: SavedProperty) {
    if (p.sheetSynced) {
      return (
        <Badge className="gap-1 bg-[#0e5c46] text-white hover:bg-[#0e5c46]">متزامن ✓</Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 border-[--gold]/60 text-[--gold]">
        محلي فقط
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل الوحدات…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="font-bold">مفيش وحدات محفوظة لسه</p>
            <p className="text-sm text-muted-foreground">
              أول وحدة هتحفظها من تبويب «وحدة جديدة» هتظهر هنا.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالكود أو الكومباوند أو تليفون المالك…"
            className="ps-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} من {items.length} وحدة
        </span>
        {sheetLink && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(sheetLink, '_blank')}>
            <ExternalLink className="h-4 w-4" /> افتح Google Sheet (كل وحدات الفريق)
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        القائمة دي نسخة سريعة من الوحدات اللي اتحفظت من الجهاز ده — قاعدة البيانات الكاملة لكل الفريق هي
        Google Sheet فوق.
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="text-start">الكود</TableHead>
              <TableHead className="text-start">الكومباوند</TableHead>
              <TableHead className="text-start">النوع</TableHead>
              <TableHead className="text-start">غرف/حمامات</TableHead>
              <TableHead className="text-start">السعر</TableHead>
              <TableHead className="text-start">المالك</TableHead>
              <TableHead className="text-start">الشيت</TableHead>
              <TableHead className="text-start">التاريخ</TableHead>
              <TableHead className="text-start">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs font-bold">{p.code}</TableCell>
                <TableCell className="max-w-40 truncate text-sm font-medium">{p.compound}</TableCell>
                <TableCell className="text-sm">{unitTypeAr(p.unitType)}</TableCell>
                <TableCell className="text-sm">
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                    {p.bedrooms || '—'} / {p.bathrooms || '—'}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatPrice(p.price, p.currency)}</TableCell>
                <TableCell>
                  <a
                    href={`tel:${p.ownerPhone}`}
                    className="ltr-embed inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {p.ownerPhone}
                  </a>
                </TableCell>
                <TableCell>{sheetBadge(p)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelected(p)}
                      aria-label={`عرض ${p.code}`}
                      title="عرض التفاصيل"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <CopyButton text={p.whatsappContent} size="icon" variant="ghost" label="نسخ واتساب" title="نسخ رسالة الواتساب" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(p)}
                      aria-label={`حذف ${p.code}`}
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <code className="font-mono text-sm font-bold">{p.code}</code>
                  <p className="truncate text-sm font-medium">
                    {p.compound} — {p.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unitTypeAr(p.unitType)} • {p.bedrooms || '—'} غرف • {formatPrice(p.price, p.currency)}
                  </p>
                </div>
                {sheetBadge(p)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setSelected(p)}>
                  <Eye className="h-3.5 w-3.5" /> عرض
                </Button>
                <CopyButton text={p.whatsappContent} label="واتساب" size="sm" variant="outline" className="h-8" />
                <a
                  href={`tel:${p.ownerPhone}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium"
                >
                  <Phone className="h-3.5 w-3.5" /> {p.ownerPhone}
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setToDelete(p)}
                  aria-label={`حذف ${p.code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <div className="max-h-[85vh] overflow-y-auto">
            <DialogHeader className="space-y-2 border-b bg-muted/40 p-4 pb-3 text-start sm:p-6 sm:pb-4">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <code className="ltr-embed rounded-md bg-primary px-2.5 py-1 font-mono text-sm font-extrabold text-primary-foreground">
                  {selected?.code}
                </code>
                <span className="text-base font-bold">{selected?.compound}</span>
              </DialogTitle>
              <DialogDescription className="text-start">
                {selected ? `${unitTypeAr(selected.unitType)} • ${selected.compound}، ${selected.city}` : ''}{' '}
                {selected ? `• ${formatPrice(selected.price, selected.currency)}` : ''}
                {selected?.furnished ? ' • مفروشة' : ' • غير مفروشة'}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selected?.sheetSynced ? (
                  <Badge className="gap-1 bg-[#0e5c46] text-white hover:bg-[#0e5c46]">متزامن مع الشيت ✓</Badge>
                ) : (
                  <Badge variant="outline" className="border-[--gold]/60 text-[--gold]">
                    محلي فقط
                  </Badge>
                )}
                {selected?.mapLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => window.open(selected.mapLink, '_blank')}
                  >
                    <MapPin className="h-3.5 w-3.5" /> الخريطة
                  </Button>
                )}
                <a
                  href={selected ? `tel:${selected.ownerPhone}` : '#'}
                  className="ltr-embed inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium"
                >
                  <Phone className="h-3.5 w-3.5" /> {selected?.ownerPhone}
                </a>
                <span className="text-xs text-muted-foreground">
                  {selected ? formatDateTime(selected.createdAt) : ''}
                </span>
              </div>
            </DialogHeader>

            {selected && (
              <div className="space-y-3 p-4 sm:p-6">
                {(() => {
                  const imgs: string[] = (() => {
                    try {
                      return JSON.parse(selected.imageUrls || '[]')
                    } catch {
                      return []
                    }
                  })()
                  return imgs.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {imgs.map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square overflow-hidden rounded-md border bg-muted"
                        >
                          <img src={driveThumb(u)} alt={`صورة ${selected.code}`} className="h-full w-full object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  ) : null
                })()}

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
                    <CopyButton text={selected.whatsappContent} label="نسخ" />
                    <pre className="content-pre rounded-xl border bg-[#e8f5ee] p-3 text-sm dark:bg-[#12241d]">
                      {selected.whatsappContent}
                    </pre>
                  </TabsContent>
                  <TabsContent value="facebook" className="space-y-2">
                    <CopyButton text={selected.facebookContent} label="نسخ" />
                    <pre className="content-pre rounded-xl border bg-muted/60 p-3 text-sm">
                      {selected.facebookContent}
                    </pre>
                  </TabsContent>
                  <TabsContent value="pf" className="space-y-2">
                    <CopyButton text={selected.pfContent} label="نسخ" />
                    <pre className="content-pre ltr-embed rounded-xl border bg-muted/60 p-3 text-sm">
                      {selected.pfContent}
                    </pre>
                  </TabsContent>
                </Tabs>

                <ScrollArea className="h-0" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>حذف الوحدة {toDelete?.code}؟</AlertDialogTitle>
            <AlertDialogDescription>
              ده هيمسح الوحدة من القائمة المحفوظة. الصف اللي اتحفظ في Google Sheets (لو موجود) مش هيتمسح
              تلقائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-start">
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
