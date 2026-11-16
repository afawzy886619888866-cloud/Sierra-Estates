import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { generatePropertyCode, templateContent, buildMapLink } from '@/lib/listing'
import { sanitizeFields } from '@/lib/extract'
import type { GeneratedContent } from '@/lib/types'

/**
 * SIERRA ESTATES (easy-listing) — service-key route guard.
 * Fails closed: when SBR_SECRET_KEY / RUNNER_API_KEY are not configured in
 * this deployment's environment, every request is rejected. The shared key
 * is distributed to staff/owners through the app's Settings dialog.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function requireServiceKey(req: Request): NextResponse | null {
  const expected =
    process.env.SBR_SECRET_KEY || process.env.RUNNER_API_KEY || ''
  const provided =
    req.headers.get('x-sbr-secret-key') || req.headers.get('x-runner-key') || ''
  if (expected && provided && safeEqual(provided, expected)) return null
  return NextResponse.json(
    { error: 'unauthorized', hint: 'configure the service key in Settings; server compares x-sbr-secret-key against SBR_SECRET_KEY' },
    { status: 401 },
  )
}

export const runtime = 'nodejs'

function sanitizeContent(raw: Record<string, unknown>): GeneratedContent | null {
  const wa = String(raw.whatsapp ?? '').trim()
  const fb = String(raw.facebook ?? '').trim()
  const pf = String(raw.propertyFinder ?? raw.pf ?? raw.propertyfinder ?? '').trim()
  if (!wa && !fb && !pf) return null
  return {
    whatsapp: wa.slice(0, 3000),
    facebook: fb.slice(0, 3000),
    propertyFinder: pf.slice(0, 4000),
  }
}

export async function POST(req: NextRequest) {
  try {

  const denied = requireServiceKey(req)
  if (denied) return denied
    const body = await req.json()
    const description = String(body?.description ?? '')
    const companyPhone = String(body?.companyPhone ?? '').trim()
    const rawFields = (body?.fields ?? {}) as Record<string, unknown>

    // Normalize + fill gaps heuristically
    const fields = sanitizeFields(rawFields, description)
    if (!fields.compound.trim()) {
      return NextResponse.json({ ok: false, error: 'اسم الكومباوند مطلوب' }, { status: 400 })
    }

    // Generate a unique internal code — the client sends the codes already
    // used on this device (no server-side database needed).
    const existingCodes: string[] = Array.isArray(body?.existingCodes)
      ? body.existingCodes.map((c: unknown) => String(c)).slice(0, 500)
      : []
    const code = generatePropertyCode(fields, existingCodes)
    const mapLink = String(body?.mapLink ?? '') || buildMapLink(fields.compound, fields.city)

    // AI content generation with template fallback
    let content: GeneratedContent | null = null
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              ...fields,
              code,
              mapLink,
              contact: companyPhone || 'Sierra Estates',
            }),
          },
        ],
        thinking: { type: 'disabled' },
      })
      const raw = completion.choices[0]?.message?.content ?? ''
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(raw.slice(start, end + 1).replace(/^```(?:json)?/i, '').replace(/```\s*$/i, ''))
        if (typeof parsed === 'object' && parsed !== null) {
          content = sanitizeContent(parsed as Record<string, unknown>)
        }
      }
    } catch (err) {
      console.error('[generate] AI failed, using template:', err)
    }

    if (!content) {
      content = templateContent(fields, code, mapLink, companyPhone)
    }

    return NextResponse.json({ ok: true, code, mapLink, content, fields, source: content ? 'ok' : 'fallback' })
  } catch (err) {
    console.error('[generate] error:', err)
    return NextResponse.json({ ok: false, error: 'حدث خطأ أثناء توليد المحتوى' }, { status: 500 })
  }
}

const SYSTEM_PROMPT = `You are the marketing copywriter for "Sierra Estates", an Egyptian real-estate brokerage. You receive a JSON object describing one property (extracted from an agent's listing note) and must produce ready-to-post marketing content.

Return ONLY a valid JSON object — no markdown fences, no commentary — with exactly these string fields:
"whatsapp", "facebook", "propertyFinder".

Rules:
1. "whatsapp": written in the language of the "language" field (if "ar" write clean, friendly Modern Standard Arabic suited for Egyptian clients — pure Arabic, never insert English words like "compound"; if "en" write English). Use WhatsApp formatting: *bold* with SINGLE asterisks, one feature per line, tasteful emojis (🏡 🛏 🛁 📐 💰 📍 📞 ✨). Must include: property type, compound + city, bedrooms, bathrooms, area, price (formatted with separators, e.g. 10,500,000 ج.م), furnished status, up to 4 highlights, a line "📍 الموقع:" (or "📍 Location:") followed by the FULL mapLink URL, the unit code, and a final contact line "📞 للتواصل: {contact}" (or "📞 Contact: {contact}"). No hashtags. Keep it under 25 lines.
2. "facebook": same language as "whatsapp". An engaging Facebook post with emojis and short lines, price, key specs, highlights, location, unit code, contact line, then 4-6 relevant hashtags on the last line (use Arabic hashtags like #عقارات_مصر #القاهرة_الجديدة when the language is Arabic, otherwise English hashtags).
3. "propertyFinder": ALWAYS in English. A structured listing with labeled lines: Title, Type, Bedrooms, Bathrooms, Built-up Area, Price, Furnished, Location, Reference Code, Map Link, then "Description:" followed by 2-3 sentences of natural, polished marketing English.
Use only facts present in the JSON — never invent numbers. Escape newlines as \\n inside the JSON strings.`
