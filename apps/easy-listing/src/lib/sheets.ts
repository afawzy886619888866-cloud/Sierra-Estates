/**
 * Google Sheets sync via a Google Apps Script Web App.
 *
 * The browser POSTs a JSON payload straight to the team's Apps Script URL
 * (deployed from their own Google Sheet). Apps Script responds with a 302
 * redirect to a one-time googleusercontent.com URL, so we use
 * `redirect: 'follow'` with a plain-text content type — the standard,
 * CORS-free pattern that works reliably against script.google.com from both
 * the browser and the server.
 *
 * Images ride along in the same payload as base64 — the script saves them to
 * Google Drive and returns permanent share links, which come back in `urls`.
 */

export interface SheetSyncResult {
  ok: boolean
  error?: string
  /** Permanent Google Drive links for the uploaded images (on success). */
  urls?: string[]
}

export interface SheetImage {
  name: string
  mime: string
  /** base64 payload without the data-URL prefix */
  data: string
}

export interface SheetPayload {
  /** shared secret required by the team's Apps Script (CONFIG.OUTREACH_SECRET) */
  secret: string
  /** routes the payload to the Easy Listing branch (Mode C) in the script */
  mode: 'easy_listing'
  code: string
  compound: string
  bedrooms: number
  bathrooms: number
  area: number | null
  price: number | null
  currency: string
  furnished: boolean
  ownerPhone: string
  whatsappContent: string
  facebookContent: string
  pfContent: string
  mapLink: string
  /** base64 images to be saved on Google Drive by the script */
  images: SheetImage[]
  /** optional pre-hosted image URLs to record as-is */
  imageUrls?: string[]
  createdAt: string
}

export async function exportToSheet(
  appsScriptUrl: string,
  payload: SheetPayload,
  timeoutMs = 45000
): Promise<SheetSyncResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      if (json && typeof json === 'object') {
        if (json.error) return { ok: false, error: String(json.error) }
        if ('ok' in json) {
          if (!json.ok || !res.ok) {
            return { ok: false, error: res.ok ? 'السكريبت رجّع خطأ غير متوقع' : `HTTP ${res.status}` }
          }
          return {
            ok: true,
            urls: Array.isArray(json.urls) ? json.urls.map((u: unknown) => String(u)) : [],
          }
        }
      }
    } catch {
      /* not JSON — Apps Script sometimes returns HTML on auth errors */
    }
    if (!res.ok || /login|sign in|accounts\.google/i.test(text)) {
      return {
        ok: false,
        error: `استجابة غير متوقعة من Google Apps Script (HTTP ${res.status}) — تأكد إن الـ Web App منشور بصلاحية Anyone`,
      }
    }
    return { ok: true, urls: [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error: msg.includes('abort') ? 'انتهت مهلة الاتصال بالشيت (الرفع اتأخر أكتر من ٤٥ ثانية)' : msg,
    }
  } finally {
    clearTimeout(timer)
  }
}
