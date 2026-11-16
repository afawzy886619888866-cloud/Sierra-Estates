'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { compressImage } from '@/lib/client-utils'
import { cn } from '@/lib/utils'

/**
 * Images never touch this app's server: they are compressed in the browser
 * and held as data URLs for preview. On save they ride along (base64) to the
 * team's Google Apps Script, which stores them on Google Drive and returns
 * permanent share links. This keeps the tool 100% free-tier friendly
 * (Vercel / Netlify / any static host).
 */
export interface UploadedImage {
  id: string
  name: string
  mime: string
  /** full data URL — used for the local preview */
  dataUrl: string
  /** base64 payload without the data-URL prefix — sent to Apps Script */
  base64: string
  /** approximate byte size of the compressed image */
  size: number
}

interface ImageUploaderProps {
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  max?: number
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'))
    reader.readAsDataURL(blob)
  })
}

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

async function blobToImage(blob: Blob, name: string): Promise<UploadedImage> {
  const dataUrl = await blobToDataUrl(blob)
  return {
    id: newId(),
    name: name.replace(/\.[^.]+$/, '') + '.jpg',
    mime: blob.type || 'image/jpeg',
    dataUrl,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    size: blob.size,
  }
}

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageUploader({ images, onChange, max = 10 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      const remaining = max - images.length
      if (remaining <= 0) {
        toast.warning(`الحد الأقصى ${max} صور`)
        return
      }
      const selected = files.slice(0, remaining)
      if (files.length > remaining) {
        toast.warning(`تم اختيار ${files.length} صورة — هنضيف أول ${remaining} فقط (الحد ${max})`)
      }
      setBusy(true)
      try {
        const added: UploadedImage[] = []
        for (const file of selected) {
          const blob = await compressImage(file)
          added.push(await blobToImage(blob, file.name))
        }
        const total = [...images, ...added].reduce((s, i) => s + i.size, 0)
        if (total > 30 * 1024 * 1024) {
          toast.warning('حجم الصور كبير جدًا — جرّب تقليل العدد أو الصور الأصغر')
        }
        onChange([...images, ...added])
        toast.success(`تم تجهيز ${added.length} صورة — هتترفع على Google Drive مع الحفظ`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'تعذر تجهيز الصور')
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [images, max, onChange]
  )

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id))
  }

  const totalSize = images.reduce((s, i) => s + i.size, 0)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer?.files?.length) void handleFiles(e.dataTransfer.files)
        }}
        disabled={busy}
        className={cn(
          'w-full rounded-xl border-2 border-dashed p-4 text-center transition-colors',
          'border-input hover:border-primary hover:bg-accent/40',
          dragging && 'border-primary bg-accent/60',
          busy && 'opacity-60 cursor-wait',
          'min-h-[96px] flex flex-col items-center justify-center gap-1.5'
        )}
        aria-label="إضافة صور الوحدة"
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">جاري تجهيز الصور…</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">اضغط لإضافة صور الوحدة أو اسحبها هنا</span>
            <span className="text-xs text-muted-foreground">
              PNG / JPG — بحد أقصى {max} صور (بتتضغط تلقائيًا)
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files)
          }}
        />
      </button>

      {images.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImagePlus className="h-3.5 w-3.5" />
            {images.length} / {max} صورة {totalSize > 0 && <span>• ≈ {fmtMB(totalSize)}</span>}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={img.dataUrl}
                alt={img.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute start-1 top-1 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label={`حذف ${img.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
