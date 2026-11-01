import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { extractJsonFromText, fallbackExtract, sanitizeFields } from '@/lib/extract'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are a data-extraction assistant for "Sierra Estates", an Egyptian real-estate brokerage. You receive a property description written by an agent (may be Arabic, Egyptian dialect, English, or mixed) and must extract structured data from it.

Return ONLY a valid JSON object — no markdown fences, no commentary — with exactly these fields:
- "compound": string — the compound/community name, e.g. "Mivida", "Mountain View iCity", "Palm Hills New Cairo". "" if none mentioned.
- "city": string — the city/area. Prefer one of: "New Cairo", "Sheikh Zayed", "6th of October", "Madinaty", "Mostakbal City", "Katameya", "New Capital", "North Coast", "El Gouna", "Ain Sokhna", "Maadi". "" if unknown.
- "unitType": one of "apartment","villa","twinhouse","townhouse","duplex","penthouse","studio","chalet","office","land"
- "bedrooms": integer (0 if unknown)
- "bathrooms": integer (0 if unknown)
- "area": number in square meters, or null
- "floor": short string like "3" or "G" or "" if unknown
- "price": number in the stated currency (e.g. 10500000), or null
- "currency": one of "EGP","USD","EUR","SAR","AED" (default "EGP")
- "furnished": boolean
- "highlights": array of up to 6 DISTINCTIVE selling points found in the text (e.g. "garden", "pool view", "استلام فوري", "installments"). Only special features — NEVER include the compound name, city, room/bathroom counts, area, price or furnished status here. Write them in the SAME language as the description.
- "language": "ar" if the description is mainly Arabic, otherwise "en"

Numbers may be written as "10 مليون", "10.5 مليون", "١٠ مليون", "250 ألف دولار", "10M", "10.5M" — always convert them to plain numbers. Read carefully and do not invent values that are not in the text.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const description = String(body?.description ?? '').trim()
    if (!description) {
      return NextResponse.json({ ok: false, error: 'الوصف مطلوب' }, { status: 400 })
    }
    if (description.length > 6000) {
      return NextResponse.json({ ok: false, error: 'الوصف طويل جدًا (الحد 6000 حرف)' }, { status: 400 })
    }

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT },
          { role: 'user', content: description },
        ],
        thinking: { type: 'disabled' },
      })
      const raw = completion.choices[0]?.message?.content ?? ''
      const parsed = extractJsonFromText(raw)
      if (parsed) {
        const fields = sanitizeFields(parsed, description)
        return NextResponse.json({ ok: true, fields, source: 'ai' })
      }
    } catch (err) {
      console.error('[extract] AI failed, using fallback:', err)
    }

    // Fallback: heuristic extraction (works without AI)
    const fields = fallbackExtract(description)
    return NextResponse.json({ ok: true, fields, source: 'fallback' })
  } catch (err) {
    console.error('[extract] error:', err)
    return NextResponse.json({ ok: false, error: 'حدث خطأ أثناء الاستخراج' }, { status: 500 })
  }
}
