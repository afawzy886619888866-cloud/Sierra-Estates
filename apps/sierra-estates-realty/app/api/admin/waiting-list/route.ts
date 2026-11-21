import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@sierra-estates/db';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { PFIntegrationService } from '@/lib/services/PFIntegrationService';
import { appendToManagedTab } from '@/lib/services/GoogleSheetsV4Service';
import { embedQuery768 } from '@/lib/server/gemini-embeddings';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * LISTING WAITING LIST API (`/api/admin/waiting-list`)
 * ════════════════════════════════════════════════════
 * Backs the admin "Listing Waiting List" window — the staging table fed
 * by the WhatsApp Station skill (broker groups / USB exports).
 *
 * GET   → waiting rows (+ counts)          ?status=PENDING&limit=100
 * POST  { action: 'approve', id }          → create public.listings row
 *                                            (publish_status='REVIEW_REQUIRED'),
 *                                            run the publish gate → PF ad when
 *                                            eligible, append the row to the
 *                                            Google Sheet tab, stamp provenance.
 *                                            Gate blockers are returned HONESTLY
 *                                            (photos/price/verification) — the
 *                                            listing waits in inventory, never
 *                                            fabricated into publishability.
 * POST  { action: 'reject', id }           → REJECTED
 * POST  { action: 'similar', id }          → RAG: 768-d embedding of the row's
 *                                            rag_text → match_listings_gemini
 *                                            (similar LIVE inventory, same
 *                                            vector space as the site search)
 */

const WAITING_TAB = 'WAITING_LIST';
const WAITING_HEADERS = ['code', 'date', 'group', 'broker_masked', 'compound', 'type', 'deal', 'price_egp', 'area_sqm', 'status', 'listing_id'];

/** Engine dealType → listings.deal_type CHECK vocabulary. */
function mapDealType(raw: unknown, text: string): 'sale' | 'rent' | 'resale' | 'primary' {
  const s = String(raw || '').toLowerCase();
  if (s === 'rent') return 'rent';
  if (s === 'sale') return 'resale'; // broker WA offers are secondary market
  const t = String(text || '');
  if (/ايجار|إيجار|rent|monthly|شهر/i.test(t)) return 'rent';
  return 'resale';
}

function buildTitle(extracted: Record<string, unknown>): string {
  // §21 no-fabrication: unknown compound stays empty — never default to a
  // real place name (phase13 security sweep enforces this).
  const compound = String(extracted.compound || '');
  const type = String(extracted.property_type || 'Unit');
  const area = extracted.area_sqm ? ` ${extracted.area_sqm}m²` : '';
  return `${compound ? `${compound} — ` : ''}${type}${area} (WhatsApp intake)`;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || '';
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '100')), 500);

  const sb = getSupabaseAdmin();
  let query = sb
    .from('listing_waiting_list')
    .select('id,code,source,group_name,broker_name,broker_phone_masked,extracted,status,listing_id,rag_text,created_at,approved_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && ['PENDING', 'APPROVED', 'REJECTED', 'IMPORTED'].includes(status)) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;

  const { data: all, error: countErr } = await sb.from('listing_waiting_list').select('status');
  const counts: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, IMPORTED: 0, total: 0 };
  if (Array.isArray(all)) {
    for (const r of all) {
      const s = (r as { status?: string }).status || 'PENDING';
      counts[s] = (counts[s] || 0) + 1;
      counts.total++;
    }
  }

  if (error && !data) {
    // Migration 052 not applied yet — say so honestly instead of a 500.
    return NextResponse.json({ success: false, notMigrated: true, error: error.message, counts }, { status: 200 });
  }
  return NextResponse.json({ success: true, items: data || [], counts, countError: countErr?.message || null });
}

const PostBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), id: z.string().uuid(), dryRun: z.boolean().optional().default(false) }),
  z.object({ action: z.literal('reject'), id: z.string().uuid(), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('similar'), id: z.string().uuid() }),
]);

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', detail: parsed.error.format() }, { status: 400 });
  }
  const { action, id } = parsed.data;
  const sb = getSupabaseAdmin();

  const { data: row, error: rowErr } = await sb
    .from('listing_waiting_list')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: 'Waiting item not found', detail: rowErr?.message }, { status: 404 });
  }

  const waiting = row as {
    id: string; code: string; group_name: string; broker_name: string; broker_phone_masked: string;
    raw_message: string; extracted: Record<string, unknown>; status: string; rag_text: string;
  };

  if (action === 'reject') {
    await sb.from('listing_waiting_list')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ success: true, status: 'REJECTED' });
  }

  if (action === 'similar') {
    try {
      const vec = await embedQuery768(waiting.rag_text || waiting.raw_message || '');
      const { data: matches, error } = await sb.rpc('match_listings_gemini', {
        query_embedding: vec,
        match_threshold: 0.3,
        match_count: 5,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, matches: matches || [] });
    } catch (err) {
      return NextResponse.json({ success: false, error: `RAG unavailable: ${(err as Error).message}` }, { status: 200 });
    }
  }

  // ── approve ────────────────────────────────────────────────────────
  const ex = waiting.extracted || {};
  const price = Number(ex.price_egp) || 0;
  const listingInsert = {
    title: buildTitle(ex),
    compound: String(ex.compound || ''),
    location_area: (ex.zone as string) || null,
    property_type: (ex.property_type as string) || 'apartment',
    deal_type: mapDealType(ex.deal_type, waiting.raw_message),
    price,
    price_currency: 'EGP',
    bedrooms: Number(ex.bedrooms) || 0,
    bathrooms: Number(ex.bathrooms) || 0,
    area_sqm: Number(ex.area_sqm) || 0,
    status: 'available',
    publish_status: 'REVIEW_REQUIRED', // private staging until the gate passes
    description: waiting.raw_message.slice(0, 2000),
    verified_by: `whatsapp-station:${waiting.code}`,
  };

  if (parsed.data.dryRun) {
    return NextResponse.json({ success: true, dryRun: true, wouldInsert: listingInsert });
  }

  const { data: created, error: createErr } = await sb.from('listings').insert(listingInsert).select('id, code').single();
  if (createErr || !created) {
    return NextResponse.json({ error: 'listing insert failed', detail: createErr?.message }, { status: 500 });
  }
  const listingId = (created as { id: string }).id;

  // Publish gate + PF ad (single authority — lib/services/publish-gate.ts)
  let gate: unknown = null;
  let publish: unknown = null;
  let imported = false;
  try {
    gate = await PFIntegrationService.evaluatePublishGate(listingId);
    const eligible = (gate as { eligible?: boolean })?.eligible;
    if (eligible) {
      publish = await PFIntegrationService.publishListing(listingId);
      imported = Boolean((publish as { success?: boolean })?.success);
    }
  } catch (err) {
    logger.warn(`[waiting-list] gate/publish for ${listingId}: ${(err as Error).message}`);
    gate = { eligible: false, failures: [(err as Error).message] };
  }

  // Sheet wiring — append the approved intake to the managed tab
  let sheet: { ok: boolean; detail?: string } = { ok: false, detail: 'not attempted' };
  try {
    const res = await appendToManagedTab({
      tab: WAITING_TAB,
      headers: WAITING_HEADERS,
      values: [
        waiting.code,
        new Date().toISOString().slice(0, 10),
        waiting.group_name,
        waiting.broker_phone_masked || waiting.broker_name,
        String(ex.compound || ''),
        String(ex.property_type || ''),
        String(mapDealType(ex.deal_type, waiting.raw_message)),
        String(price),
        String(ex.area_sqm ?? ''),
        imported ? 'IMPORTED' : 'APPROVED',
        listingId,
      ],
    });
    sheet = { ok: Boolean(res?.ok ?? res), detail: JSON.stringify(res).slice(0, 200) };
  } catch (err) {
    sheet = { ok: false, detail: (err as Error).message.slice(0, 200) };
  }

  const newStatus = imported ? 'IMPORTED' : 'APPROVED';
  await sb.from('listing_waiting_list')
    .update({
      status: newStatus,
      listing_id: listingId,
      approved_at: new Date().toISOString(),
      approved_by: auth.email || auth.uid || 'admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({
    success: true,
    status: newStatus,
    listingId,
    gate,
    publish,
    sheet,
    note: imported
      ? 'Listing created, gate passed, Property Finder ad published. Site + map pick it up via the publish-status RLS gate.'
      : 'Listing created and parked in inventory (REVIEW_REQUIRED) — gate blockers above; clear them then publish from pf-approval.',
  });
}
