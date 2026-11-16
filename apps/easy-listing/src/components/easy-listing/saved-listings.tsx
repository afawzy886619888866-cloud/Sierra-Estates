'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BedDouble,
  ExternalLink,
  Eye,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Table2,
  Trash2,
  Sparkles,
  ArrowRight,
  Database,
  Building2,
  UserCheck,
  Briefcase,
  Share2,
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
  onLoadProperty?: (property: SavedProperty) => void
}

type FilterRole = 'ALL' | 'BOT_INTAKE' | 'OWNER' | 'EMPLOYEE' | 'BROKER'

export function SavedListings({
  refreshKey,
  onCountChange,
  sheetLink,
  onLoadProperty,
}: SavedListingsProps) {
  const [items, setItems] = useState<SavedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterRole, setFilterRole] = useState<FilterRole>('ALL')
  const [selected, setSelected] = useState<SavedProperty | null>(null)
  const [toDelete, setToDelete] = useState<SavedProperty | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    try {
      const stored = loadSavedProperties()
      setItems(stored)
      onCountChange(stored.length)
    } catch {
      toast.error('تعذر تحميل سجل الوحدات')
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const filtered = useMemo(() => {
    let result = items
    // Role filter
    if (filterRole === 'BOT_INTAKE') {
      result = result.filter(
        (p) => p.status === 'owner_reply_yes' || p.status === 'bot_intake' || p.source === 'bot' || p.source === 'owner-outreach'
      )
    } else if (filterRole === 'OWNER') {
      result = result.filter((p) => p.role === 'OWNER')
    } else if (filterRole === 'EMPLOYEE') {
      result = result.filter((p) => p.role === 'EMPLOYEE')
    } else if (filterRole === 'BROKER') {
      result = result.filter((p) => p.role === 'BROKER')
    }

    // Search query
    const q = query.trim().toLowerCase()
    if (!q) return result
    return result.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.compound.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.ownerPhone.includes(q) ||
        (p.contactName && p.contactName.toLowerCase().includes(q)) ||
        (p.employeeName && p.employeeName.toLowerCase().includes(q))
    )
  }, [items, filterRole, query])

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const updated = removeSavedProperty(toDelete.id)
      setItems(updated)
      onCountChange(updated.length)
      toast.success(`تم حذف الوحدة (${toDelete.code})`)
      setToDelete(null)
    } catch {
      toast.error('تعذر الحذف')
    } finally {
      setDeleting(false)
    }
  }

  function getWhatsAppUrl(phone: string, text?: string) {
    const digits = phone.replace(/\D/g, '')
    const normalized = digits.startsWith('0') ? '2' + digits : digits.startsWith('20') ? digits : '20' + digits
    const encoded = text ? `?text=${encodeURIComponent(text)}` : ''
    return `https://wa.me/${normalized}${encoded}`
  }

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <div className="hyouz-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c8961a]/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#c8961a]/20 text-[#e9c176] border border-[#c8961a]/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                سجل الأونرز ومحادثات البوت (Owners & Bot Intake Resume)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              محطة المتابعة للوحدات المستلمة من حملات الواتساب (ردود بنعم) والملاك والموظفين — انقر على &quot;تحميل في الاستوديو&quot; للاعتماد والمزامنة الفورية.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sheetLink && (
              <a
                href={sheetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hyouz-glass-btn text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Table2 className="h-3.5 w-3.5 text-[#e9c176]" />
                <span>شيت المتابعة الرئيسي</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* ── Filter Pills & Search ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterRole('ALL')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterRole === 'ALL'
                  ? 'bg-gradient-to-r from-[#c8961a] to-[#e9c176] text-[#070b12] shadow-sm'
                  : 'bg-[#070b12] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('BOT_INTAKE')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterRole === 'BOT_INTAKE'
                  ? 'bg-emerald-500 text-[#070b12] shadow-sm font-black'
                  : 'bg-[#070b12] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
              }`}
            >
              🤖 وارد البوت / رد بنعم
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('OWNER')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterRole === 'OWNER'
                  ? 'bg-[#c8961a] text-[#070b12] shadow-sm font-black'
                  : 'bg-[#070b12] text-[#e9c176] hover:text-white border border-[#c8961a]/30'
              }`}
            >
              👑 الملاك المباشرين
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('EMPLOYEE')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterRole === 'EMPLOYEE'
                  ? 'bg-sky-500 text-[#070b12] shadow-sm font-black'
                  : 'bg-[#070b12] text-sky-400 hover:text-white border border-sky-500/30'
              }`}
            >
              🏢 وحدات الموظفين
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('BROKER')}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterRole === 'BROKER'
                  ? 'bg-amber-600 text-white shadow-sm font-black'
                  : 'bg-[#070b12] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              💼 الوسطاء
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالكومباوند، الكود، الهاتف..."
              className="bg-[#070b12] border-slate-800 text-white text-xs h-9 pl-8 rounded-xl focus:border-[#e9c176]"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Cards List ── */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-[#e9c176]" />
          جاري تحميل السجل...
        </div>
      ) : filtered.length === 0 ? (
        <div className="hyouz-card rounded-2xl p-12 text-center space-y-3">
          <Inbox className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">لا توجد وحدات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500">
            يمكنك إدخال وحدة جديدة أو تغيير شروط الفلتر
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isBotReply =
              item.status === 'owner_reply_yes' || item.status === 'bot_intake' || item.source === 'bot'
            const roleBadgeText =
              item.role === 'EMPLOYEE'
                ? `🏢 موظف: ${item.employeeName || 'سييرا'}`
                : item.role === 'OWNER'
                ? `👑 مالك: ${item.contactName || 'مباشر'}`
                : item.role === 'BROKER'
                ? `💼 وسيط: ${item.contactName || 'معتمد'}`
                : '🏷️ إيجنت'

            return (
              <div
                key={item.id}
                className="hyouz-card rounded-2xl p-5 space-y-3.5 hover:border-[#c8961a]/45 transition-all shadow-lg flex flex-col justify-between"
              >
                {/* Card Top: Code & Badges */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-[#e9c176]">
                        {item.code}
                      </span>
                      {isBotReply && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                          🤖 رد بنعم عبر الواتساب
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {unitTypeAr(item.unitType)} في {item.compound} · {item.city}
                    </div>
                  </div>

                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#070b12] text-slate-300 border border-slate-800 shrink-0">
                    {roleBadgeText}
                  </span>
                </div>

                {/* Specs Row */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <div className="p-2 rounded-lg bg-[#070b12]/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">المساحة</span>
                    <span className="font-bold text-white">{item.area ? `${item.area} م²` : '—'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070b12]/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">الغرف / الحمام</span>
                    <span className="font-bold text-white">{item.bedrooms} نوم / {item.bathrooms} حمام</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#070b12]/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">السعر المطلوب</span>
                    <span className="font-bold text-[#e9c176] font-mono">{formatPrice(item.price, item.currency)}</span>
                  </div>
                </div>

                {/* Contact & Sync Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#e9c176]" />
                    <span className="font-mono text-white text-xs">{item.ownerPhone}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Supabase ✓
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Sheet ✓
                    </span>
                    {item.mapLink && (
                      <a
                        href={item.mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-1.5 py-0.5 rounded bg-[#c8961a]/10 text-[#e9c176] border border-[#c8961a]/20 hover:underline flex items-center gap-0.5"
                      >
                        <MapPin className="h-2.5 w-2.5" /> الخريطة
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-800/80">
                  {/* Load into Editor Button */}
                  {onLoadProperty && (
                    <Button
                      type="button"
                      onClick={() => onLoadProperty(item)}
                      className="col-span-6 hyouz-gold-btn text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      تحميل في الاستوديو
                    </Button>
                  )}

                  {/* WhatsApp Direct Chat */}
                  <a
                    href={getWhatsAppUrl(item.ownerPhone, `السلام عليكم أستاذنا، بخصوص وحدتكم في ${item.compound} كود ${item.code}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-3 hyouz-glass-btn text-xs rounded-xl flex items-center justify-center gap-1 hover:text-emerald-400 hover:border-emerald-500/40"
                    title="محادثة واتساب مباشرة"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>واتساب</span>
                  </a>

                  {/* View Details / Copy */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(item)}
                    className="col-span-2 text-xs rounded-xl border-slate-800 bg-[#070b12] text-slate-300 hover:text-white"
                    title="عرض النصوص التسويقية"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setToDelete(item)}
                    className="col-span-1 text-xs rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/20"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dialog: View Details & Copy ── */}
      {selected && (
        <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-2xl bg-[#0d1524] border-[#c8961a]/30 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold text-white">
                <span>تفاصيل ونصوص الوحدة ({selected.code})</span>
                <span className="text-xs font-mono text-[#e9c176]">{selected.compound}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                النصوص التسويقية المجهزة بواسطة الذكاء الاصطناعي للنشر المباشر
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="whatsapp" className="w-full mt-2">
              <TabsList className="bg-[#070b12] border border-slate-800 p-1">
                <TabsTrigger value="whatsapp" className="text-xs">صيغة الواتساب</TabsTrigger>
                <TabsTrigger value="facebook" className="text-xs">بوست فيسبوك</TabsTrigger>
                <TabsTrigger value="propertyFinder" className="text-xs">Property Finder</TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp" className="mt-3">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  <div className="absolute top-3 left-3">
                    <CopyButton text={selected.whatsappContent} label="نسخ" />
                  </div>
                  {selected.whatsappContent}
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="mt-3">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  <div className="absolute top-3 left-3">
                    <CopyButton text={selected.facebookContent} label="نسخ" />
                  </div>
                  {selected.facebookContent}
                </div>
              </TabsContent>

              <TabsContent value="propertyFinder" className="mt-3">
                <div className="relative p-4 rounded-xl bg-[#070b12] border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto ltr-embed">
                  <div className="absolute top-3 right-3">
                    <CopyButton text={selected.pfContent} label="Copy" />
                  </div>
                  {selected.pfContent}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {toDelete && (
        <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
          <AlertDialogContent className="bg-[#0d1524] border-red-500/30 text-white rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold">تأكيد حذف الوحدة من السجل</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-400">
                هل أنت متأكد من حذف الوحدة ({toDelete.code}) التابعة لـ {toDelete.compound}؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                {deleting ? 'جاري الحذف...' : 'حذف نهائي'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
