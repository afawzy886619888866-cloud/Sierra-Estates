import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Connectivity test for the Apps Script Web App. The URL is passed in the
 * request body (settings live in the browser's localStorage), so this works
 * on any host — including Vercel — with no database.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = String(body?.url ?? '').trim()
    if (!url) {
      return NextResponse.json({ ok: false, error: 'اكتب لينك الـ Apps Script الأول' })
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url)) {
      return NextResponse.json({
        ok: false,
        error: 'اللينك شكله مش صح — لازم يبدأ بـ script.google.com/macros/s/… وينتهي بـ /exec',
      })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
      const text = (await res.text()).slice(0, 200)
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `HTTP ${res.status} — تأكد من نشر الويب أب واختيار Anyone` })
      }
      if (/login|sign in|accounts\.google/i.test(text)) {
        return NextResponse.json({ ok: false, error: 'الرابط يطلب تسجيل دخول — أعد النشر باختيار "Anyone" للوصول' })
      }
      return NextResponse.json({ ok: true, message: `متصل ✅ — استجابة السكريبت: "${text.slice(0, 60)}"` })
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const friendly = msg.includes('abort') ? 'انتهت مهلة الاتصال (١٥ ثانية)' : msg
    return NextResponse.json({ ok: false, error: friendly })
  }
}
