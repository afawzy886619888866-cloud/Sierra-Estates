'use client'

import { CheckCircle2, ExternalLink, FileSpreadsheet, Rocket } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CopyButton } from './copy-button'
import { APPS_SCRIPT_CODE } from '@/lib/appsscript'
import { DEFAULT_SHEET_LINK } from '@/lib/local-store'

interface SetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'افتح شيت Sierra Estates',
    body: (
      <>
        شيت الشركة موجود بالفعل:{' '}
        <a
          href={DEFAULT_SHEET_LINK}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary underline underline-offset-2"
        >
          افتح الشيت ↗
        </a>{' '}
        — ده الداتا بيز المشترك لكل الفريق. الكود المدموج هيضيف تاب اسمه <b>Listings</b> جواه
        (بدون ما يلمس أي تابات قديمة عندك).
      </>
    ),
  },
  {
    title: 'افتح Apps Script (فيه كود المحرك القديم)',
    body: (
      <>
        من قائمة الشيت: <b>Extensions ← Apps Script</b> — هتلاقي جوه كود المحرك القديم
        بتاعكم (v5.5 Engine: بوت الواتساب + تحديث تاريخ التواصل + الأوديت).{' '}
        <b>متمسحوش</b> — احنا بندمج مش بنبدّل.
      </>
    ),
  },
  {
    title: 'الصق الكود المدموج مكان القديم',
    body: (
      <>
        اعمل <b>تحديد للكل (Ctrl+A)</b> في محرر الكود، وبعدين الصق الكود من البوكس تحت
        واحفظ (<b>Ctrl+S</b>). الكود المدموج = <b>المحرك القديم بتاعك كامل زي ما هو</b> +
        إضافة Easy Listing في الآخر — يعني البوت وتحديث تواريخ التواصل والأوديت وonEdit
        كلهم بيكموا شغالين، والصفحة الجديدة بتكتب في تاب <b>Listings</b> وترفع الصور على
        مجلد <b>Easy Listing Images</b> في Google Drive بتاعك.
      </>
    ),
  },
  {
    title: 'انشره كـ Web App (بنفس اللينك القديم)',
    body: (
      <>
        عندك Web App منشور قبل كده من نفس الشيت — ده اللي البوت شغال بيه:{' '}
        <b>Deploy ← Manage deployments ← ✏️ ← Version: New ← Deploy</b> — كده اللينك
        هيفضل زي ما هو والبوت مش هيتقطع.
        <br />
        (لو أول مرة تنشر: <b>Deploy ← New deployment ← Web app</b>، وخلي الإعدادات:{' '}
        <b>Execute as: Me</b> — <b>Who has access: Anyone</b>)
        <br />
        وافق على الصلاحيات (Authorize ← اسم حسابك ← Advanced ← Go to project ← Allow).
      </>
    ),
  },
  {
    title: 'انسخ اللينك والصقه في الإعدادات',
    body: (
      <>
        هيظهرلك لينك شكله كده{' '}
        <code className="ltr-embed font-mono text-xs">https://script.google.com/macros/s/…/exec</code>{' '}
        — انسخه وافتح <b>الإعدادات</b> في صفحة Easy Listing والصقه (كلمة السر متضبطة
        جاهزة)، واضغط <b>اختبر الاتصال</b>.
      </>
    ),
  },
]

export function SetupDialog({ open, onOpenChange }: SetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> دليل ربط Google Sheets (٤ دقايق)
          </DialogTitle>
          <DialogDescription>
            مجاني ١٠٠٪ — مفيش API Keys ولا Service Accounts. محتاجين بس حساب جوجل بتاع الشركة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="space-y-1 text-sm leading-relaxed">
                  <p className="font-bold">{s.title}</p>
                  <p className="text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> كود Apps Script المدموج (انسخه كله)
              </p>
              <CopyButton text={APPS_SCRIPT_CODE} label="نسخ الكود" />
            </div>
            <ScrollArea className="h-56 rounded-xl border bg-muted/50">
              <pre className="ltr-embed overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">
                {APPS_SCRIPT_CODE}
              </pre>
            </ScrollArea>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-[#e8f5ee] p-3 text-xs leading-relaxed dark:bg-[#12241d]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              الكود المدموج بيحافظ على كل حاجة شغالة عندك: بوت الواتساب (إضافة الوحدات)،
              تحديث «تاريخ اخر تواصل»، الأوديت والمنيو، وتنسيق onEdit — وبيضيف عليهم Easy
              Listing. بعد الربط: كل وحدة هتحفظها هتتضاف كصف جديد في تاب Listings فيه
              الكود والتفاصيل والمحتوى الثلاثة ولينك الخريطة وروابط الصور، والصور نفسها
              هتتخزن في مجلد على Google Drive بتاع الشركة. وللعلم، الوحدات بتتحفظ كمان في
              قائمة «الوحدات المحفوظة» جوه الصفحة نفسها.
            </p>
          </div>

          <Button variant="outline" className="w-full gap-1.5" onClick={() => onOpenChange(false)}>
            <ExternalLink className="h-4 w-4" /> تم — هروح أجيب اللينك وأرجع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
