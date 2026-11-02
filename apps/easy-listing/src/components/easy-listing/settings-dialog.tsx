'use client'

import { useEffect, useState } from 'react'
import { Loader2, PlugZap, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_SECRET } from '@/lib/local-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AppSettings } from '@/lib/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AppSettings
  onSavedSettings: (s: AppSettings) => void
  onOpenSetup: () => void
}

export function SettingsDialog({ open, onOpenChange, settings, onSavedSettings, onOpenSetup }: SettingsDialogProps) {
  const [appsScriptUrl, setAppsScriptUrl] = useState('')
  const [sheetLink, setSheetLink] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [secret, setSecret] = useState(DEFAULT_SECRET)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (open) {
      setAppsScriptUrl(settings.appsScriptUrl)
      setSheetLink(settings.sheetLink)
      setCompanyPhone(settings.companyPhone)
      setSecret(settings.secret || DEFAULT_SECRET)
      setTestResult(null)
    }
  }, [open, settings])

  async function handleSave() {
    setSaving(true)
    try {
      // Settings persist in the browser's localStorage — no server needed,
      // so the tool works identically on any free host (Vercel, Netlify…).
      await new Promise((r) => setTimeout(r, 150))
      toast.success('تم حفظ الإعدادات على الجهاز ده ✅')
      onSavedSettings({
        appsScriptUrl: appsScriptUrl.trim(),
        sheetLink: sheetLink.trim(),
        companyPhone: companyPhone.trim(),
        secret: secret.trim() || DEFAULT_SECRET,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appsScriptUrl.trim() }),
      })
      const testData = await res.json()
      setTestResult({
        ok: Boolean(testData.ok),
        message: testData.ok ? testData.message : testData.error || 'فشل الاتصال',
      })
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'فشل الاتصال' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" /> الإعدادات
          </DialogTitle>
          <DialogDescription>
            اربط Google Sheets وأضف رقم التواصل — كل ده مرة واحدة بس.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-script" className="text-xs">
              لينك Google Apps Script (Web App URL)
            </Label>
            <Input
              id="s-script"
              dir="ltr"
              className="text-start text-xs"
              placeholder="https://script.google.com/macros/s/XXXXXXXX/exec"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              مش معاك اللينك؟{' '}
              <button
                type="button"
                className="font-bold text-primary underline underline-offset-2"
                onClick={() => {
                  onOpenChange(false)
                  onOpenSetup()
                }}
              >
                افتح دليل الربط السريع
              </button>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-sheet" className="text-xs">
              لينك الـ Google Sheet (اختياري — لعرض زر «افتح الشيت»)
            </Label>
            <Input
              id="s-sheet"
              dir="ltr"
              className="text-start text-xs"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={sheetLink}
              onChange={(e) => setSheetLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ملاحظة: الإعدادات بتتحفظ على الجهاز/البراوزر — كل موظف بيدخلها مرة واحدة.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-secret" className="text-xs">
              كلمة السر (Secret) — متضبطة جاهزة، متغيرهاش
            </Label>
            <Input
              id="s-secret"
              dir="ltr"
              className="text-start text-xs"
              placeholder="SE_OUTREACH_SECRET_2026_CAIRO"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              نفس السر اللي جوه كود السكريبت (CONFIG.OUTREACH_SECRET) — بيحمي الشيت من أي
              طلب غريب. لو غيّرته في السكريبت غيّره هنا.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-phone" className="text-xs">
              رقم التواصل للشركة (يتحط تلقائيًا جوه المحتوى)
            </Label>
            <Input
              id="s-phone"
              dir="ltr"
              className="text-start"
              placeholder="01000000000"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
            />
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 text-xs leading-relaxed ${
                testResult.ok
                  ? 'border-primary/40 bg-[#e8f5ee] dark:bg-[#12241d]'
                  : 'border-destructive/40 bg-destructive/10'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-start">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !appsScriptUrl.trim()} className="gap-1.5">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            اختبر الاتصال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
