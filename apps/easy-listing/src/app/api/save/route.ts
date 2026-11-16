import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

export async function POST(req: Request) {
  try {

  const denied = requireServiceKey(req)
  if (denied) return denied
    const body = await req.json()
    const {
      role = 'OWNER',
      phone = '',
      employeeName = '',
      contactName = '',
      fields = {},
      code = '',
      internalCode = '',
      bmmCode = '',
      content = {},
      mapLink = '',
      images = [],
      imageUrls = [],
    } = body

    const now = new Date().toISOString()
    const cleanPhone = String(phone).replace(/\D/g, '')
    const normalizedPhone = cleanPhone.startsWith('20')
      ? cleanPhone.slice(2)
      : cleanPhone.startsWith('0')
      ? cleanPhone
      : '0' + cleanPhone

    const effectiveInternalCode =
      internalCode ||
      `NC-${(fields.compound || 'COM').slice(0, 3).toUpperCase()}-APT-${fields.area || 0}M`

    const uploaderName =
      role === 'EMPLOYEE'
        ? (employeeName || 'موظف سييرا')
        : (contactName || (role === 'OWNER' ? 'مالك مباشر' : 'وسيط معتمد'))

    // 1. Supabase Persistence
    let supabaseResult = { ok: false, table: '', id: null as string | null, error: null as string | null }
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      if (role === 'BROKER') {
        const { data, error } = await supabase
          .from('map_sheet_entries')
          .insert({
            internal_code: effectiveInternalCode,
            uploader_role: 'BROKER',
            uploader_name: uploaderName,
            uploader_phone: normalizedPhone,
            region: fields.city || 'New Cairo',
            compound: fields.compound || 'Not Specified',
            unit_type: fields.unitType || 'Apartment',
            floor_label: fields.floor || null,
            area_m2: fields.area ? Number(fields.area) : null,
            bedrooms: fields.bedrooms ? Number(fields.bedrooms) : null,
            bathrooms: fields.bathrooms ? Number(fields.bathrooms) : null,
            price_egp: fields.price ? Number(fields.price) : null,
            deal_type: 'sale',
            raw_text: `${fields.highlights?.join(', ') || ''} | Code: ${code}`,
            photo_request_status: 'not_requested',
          })
          .select('id')
          .single()

        if (error) {
          supabaseResult = { ok: false, table: 'map_sheet_entries', id: null, error: error.message }
        } else {
          supabaseResult = { ok: true, table: 'map_sheet_entries', id: data?.id || null, error: null }
        }
      } else {
        // AGENT / OWNER / EMPLOYEE -> public.listings
        const { data, error } = await supabase
          .from('listings')
          .insert({
            code: effectiveInternalCode,
            title: `${fields.unitType || 'شقة'} · ${fields.compound || 'القاهرة الجديدة'}`,
            compound: fields.compound || 'Not Specified',
            city: fields.city || 'Cairo',
            property_type: fields.unitType || 'Apartment',
            deal_type: 'sale',
            price: fields.price ? Number(fields.price) : 0,
            price_currency: fields.currency || 'EGP',
            bedrooms: fields.bedrooms ? Number(fields.bedrooms) : 0,
            bathrooms: fields.bathrooms ? Number(fields.bathrooms) : 0,
            area_sqm: fields.area ? Number(fields.area) : 0,
            status: 'Pending Review',
            description: content.whatsapp || `${fields.compound} - ${fields.area}m`,
            owner_name: role === 'OWNER' ? uploaderName : null,
            owner_phone: role === 'OWNER' ? normalizedPhone : null,
            broker_name: role === 'BROKER' ? uploaderName : null,
            broker_phone: role === 'BROKER' ? normalizedPhone : null,
            agent: role === 'EMPLOYEE' || role === 'AGENT' ? uploaderName : null,
            agent_name: role === 'EMPLOYEE' || role === 'AGENT' ? uploaderName : null,
            source_channel: 'easy-listing',
            sync_source: 'easy-listing-hyouz',
            created_at: now,
          })
          .select('id')
          .single()

        if (error) {
          supabaseResult = { ok: false, table: 'listings', id: null, error: error.message }
        } else {
          supabaseResult = { ok: true, table: 'listings', id: data?.id || null, error: null }

          // If role is OWNER, also record in owner_listing_intakes for the bot & outreach pipeline
          if (role === 'OWNER') {
            try {
              await supabase.from('owner_listing_intakes').insert({
                intake_code: effectiveInternalCode,
                state: 'REVIEW_REQUIRED',
                source: 'easy-listing-hyouz',
                sender_phone: normalizedPhone,
                listing_code: code || effectiveInternalCode,
                raw_text: content.whatsapp || `${fields.compound} - ${fields.price}`,
                extracted: {
                  compound: fields.compound,
                  area: fields.area,
                  price: fields.price,
                  bedrooms: fields.bedrooms,
                  bathrooms: fields.bathrooms,
                  unitType: fields.unitType,
                },
              })
            } catch {
              // Best effort intake ledger record
            }
          }
        }
      }
    } catch (e: any) {
      supabaseResult = { ok: false, table: 'error', id: null, error: e?.message || 'Supabase exception' }
    }

    // 2. Google Sheets Apps Script Sync
    let sheetResult = { ok: false, urls: [] as string[], error: null as string | null }
    // Fail-closed: the Apps Script target and its secret come from the
    // server environment only (WF_SHEET_WRITE_URL / WF_SHEET_WRITE_SECRET) —
    // never from the request body, never from hardcoded literals.
    const targetScriptUrl = process.env.WF_SHEET_WRITE_URL || ''
    const sheetSecret = process.env.WF_SHEET_WRITE_SECRET || ''

    if (targetScriptUrl && sheetSecret) {
      try {
        const payload = {
          secret: sheetSecret,
          mode: 'easy_listing',
          code: code || effectiveInternalCode,
          compound: fields.compound || 'Not Specified',
          bedrooms: fields.bedrooms ?? 0,
          bathrooms: fields.bathrooms ?? 0,
          area: fields.area ?? null,
          price: fields.price ?? null,
          currency: fields.currency || 'EGP',
          furnished: !!fields.furnished,
          ownerPhone: normalizedPhone,
          whatsappContent: content.whatsapp || '',
          facebookContent: content.facebook || '',
          pfContent: content.propertyFinder || '',
          mapLink: mapLink || `https://maps.google.com/?q=${encodeURIComponent(fields.compound || 'New Cairo')}`,
          images: images || [],
          imageUrls: imageUrls || [],
          createdAt: now,
        }

        const res = await fetch(targetScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        })

        if (res.ok) {
          const parsed = await res.json().catch(() => ({ ok: true }))
          sheetResult = {
            ok: parsed.ok !== false,
            urls: parsed.urls || [],
            error: parsed.error || null,
          }
        } else {
          sheetResult = { ok: false, urls: [], error: `HTTP ${res.status}` }
        }
      } catch (err: any) {
        sheetResult = { ok: false, urls: [], error: err?.message || 'Apps Script network error' }
      }
    }

    return NextResponse.json({
      ok: true,
      code: code || effectiveInternalCode,
      internalCode: effectiveInternalCode,
      bmmCode: bmmCode || `O${(fields.compound || 'XX').slice(0, 3).toUpperCase()}-101`,
      supabase: supabaseResult,
      sheet: sheetResult,
      sync: {
        supabase: supabaseResult.ok,
        supabaseTable: supabaseResult.table,
        supabaseId: supabaseResult.id,
        supabaseError: supabaseResult.error,
        sheets: sheetResult.ok,
        sheetUrls: sheetResult.urls,
        sheetError: sheetResult.error,
        map: !!mapLink,
        inventory: true,
      },
      uploader: {
        role,
        name: uploaderName,
        phone: normalizedPhone,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
