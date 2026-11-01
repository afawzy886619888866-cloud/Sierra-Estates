import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sierra Estates Owner Outreach Sheet Write-Back Endpoint
 *
 * Mirrors the Google Apps Script doGet/doPost contract from
 * scripts/GoogleAppsScript_SierraEstates_Unified_Engine.gs.
 *
 * Secret: SE_OUTREACH_SECRET_2026_CAIRO
 * Matches by phone → updates public.listings.last_contact_date
 * Busts the in-memory /api/inventory cache on success.
 */
const EXPECTED_SECRET = 'SE_OUTREACH_SECRET_2026_CAIRO';

/**
 * GET /api/sync/sheet-webhook
 * Health check — mirrors Apps Script doGet shape.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sierra-sheet-writeback',
    column: 'تاريخ اخر تواصل',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/sync/sheet-webhook
 * Accepts Google Apps Script outreach write-back payloads.
 *
 * Body: {
 *   secret: "SE_OUTREACH_SECRET_2026_CAIRO",
 *   rows: [{ phone: "01xxxxxxxxx", date?: "dd/MM/yyyy" }]
 * }
 *
 * On success: writes last_contact_date to matched listings rows in Supabase,
 * then clears the inventory cache so the Client Page Map reflects changes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.secret || body.secret !== EXPECTED_SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const rows: Array<{ phone?: string; mobile?: string; date?: string; lastContact?: string }> =
      Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: 'No rows to update' });
    }

    // Lazy-import Supabase with service role for writes
    const { createClient } = await import('@supabase/supabase-js');
    const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!sbUrl || !sbKey) {
      logger.error('[sheet-webhook] Missing Supabase env vars');
      return NextResponse.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(sbUrl, sbKey);
    const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo' }); // dd/MM/yyyy

    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of rows) {
      const rawPhone = String(item.phone || item.mobile || '').replace(/\D/g, '');
      if (!rawPhone) continue;

      const dateVal = item.date || item.lastContact || today;

      // Build phone variants to match against Egyptian mobile numbers
      const variants: string[] = [rawPhone];
      if (rawPhone.startsWith('20') && rawPhone.length >= 12) variants.push(rawPhone.slice(2));
      if (rawPhone.startsWith('0') && rawPhone.length === 11) {
        variants.push('20' + rawPhone.slice(1));
        variants.push(rawPhone.slice(1));
      }
      if (rawPhone.length === 10) variants.push('0' + rawPhone);

      let matched = false;
      for (const v of variants) {
        // Try phone, mobile, and raw_data JSON field
        const { data, error } = await supabase
          .from('listings')
          .select('id')
          // 2026-11-01 fix: the deployed table's column is owner_phone — the
          // legacy `phone` / `mobile` references never existed (42703), so no
          // row ever matched and last_contact_date was never written.
          .or(`owner_phone.eq.${v}`)
          .limit(10);

        if (error) {
          errors.push(`phone ${v}: ${error.message}`);
          break;
        }

        if (data && data.length > 0) {
          const ids = (data as Array<{ id: string }>).map((r) => r.id);
          const { error: updateErr } = await supabase
            .from('listings')
            .update({
              last_contact_date: dateVal,
              updated_at: new Date().toISOString(),
            })
            .in('id', ids);

          if (updateErr) {
            errors.push(`update ${ids.join(',')}: ${updateErr.message}`);
          } else {
            updatedCount += ids.length;
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        logger.debug('[sheet-webhook] No listing found for phone variants', { variants });
      }
    }

    // Bust the in-memory inventory cache so next /api/inventory fetch is fresh
    try {
      const baseUrl = req.headers.get('origin') || `http://localhost:${process.env.PORT || 3000}`;
      await fetch(`${baseUrl}/api/inventory`, {
        method: 'DELETE',
        headers: {
          'x-admin-secret': sbKey.slice(-12),
        },
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // Non-fatal — in-memory cache expires after CACHE_TTL_MS (60 s)
    }

    return NextResponse.json({
      ok: true,
      updated: updatedCount,
      totalReceived: rows.length,
      ...(errors.length > 0 && { errors: errors.slice(0, 5) }),
    });
  } catch (err) {
    logger.error('[sheet-webhook] POST error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
