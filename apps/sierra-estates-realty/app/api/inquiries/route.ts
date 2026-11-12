import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord } from '@sierra-estates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const inquirySchema = z.object({
  mode: z.enum(['sale', 'rent']).default('sale'),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  zone: z.string().trim().max(120).optional().default(''),
  type: z.string().trim().max(80).optional().default(''),
  budget: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(2000).optional().default(''),
  // /request extended payload (25% discount campaign). Optional + passthrough-
  // free: the base form keeps working unchanged, and the campaign fields ride
  // along to the leads mirror + matching below when present.
  campaign: z.string().trim().max(120).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  voucherCode: z.string().trim().max(80).optional(),
  dealType: z.enum(['sale', 'rent', 'resale']).optional(),
  compounds: z.union([z.string().trim().max(500), z.array(z.string().trim().max(120)).max(20)]).optional(),
  unitType: z.string().trim().max(80).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  finishing: z.string().trim().max(80).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  targetDate: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > 24_000) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please provide a valid name and phone number.' },
      { status: 400 }
    );
  }

  // `type` is the column name in public.inquiries' TypeScript model
  // (`propertyType`); everything else maps 1:1.
  const { type, ...rest } = parsed.data;
  const payload = {
    ...rest,
    propertyType: type,
    source: 'website',
    status: 'S1_NEW_LEAD',
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await insertRecord<{ id: string }>('inquiries', payload);

    // CRM projection: the admin CRM board reads public.leads, not
    // public.inquiries — without this mirror a website inquiry would land in
    // the inquiries inbox but never on the CRM Leads tab. The inquiry row
    // above remains the system of record; this insert is a best-effort
    // projection (its failure never breaks the visitor's submit, but it IS
    // logged for the ops queue + the backfill script picks up stragglers).
    try {
      const now = new Date().toISOString();
      const structuredPrefix = [
        `[Intent: ${rest.mode.toUpperCase()}]`,
        rest.zone ? `[Preferred Zone: ${rest.zone}]` : null,
        type ? `[Property Type: ${type}]` : null,
        rest.budget ? `[Budget: ${rest.budget} EGP]` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      await insertRecord('leads', {
        fullName: rest.name,
        phone: rest.phone,
        email: rest.email || undefined,
        channel: 'web',
        mode: rest.mode,
        source: 'website',
        originChannel: 'website_inquiry_form',
        status: 'new',
        stage: 'inbound',
        phase: 'acquisition',
        priority: 'warm',
        via: 'Website',
        zone: rest.zone || undefined,
        interest: type || 'General Inquiry',
        capitalAllocation: rest.budget || 'To be determined',
        summaryNotes: `${structuredPrefix}${rest.notes ? ` | ${rest.notes}` : ''}`,
        metadata: {
          inquiryId: created.id,
          mirroredFrom: 'public.inquiries',
          // /request campaign fields (present only when the extended form sent them)
          ...(rest.campaign ? { campaign: rest.campaign } : {}),
          ...(rest.discountPercent != null ? { discountPercent: rest.discountPercent } : {}),
          ...(rest.voucherCode ? { voucherCode: rest.voucherCode } : {}),
          ...(rest.dealType ? { dealType: rest.dealType } : {}),
          ...(rest.compounds ? { compounds: rest.compounds } : {}),
          ...(rest.unitType ? { unitType: rest.unitType } : {}),
          ...(rest.bedrooms != null ? { bedrooms: rest.bedrooms } : {}),
          ...(rest.finishing ? { finishing: rest.finishing } : {}),
          ...(rest.budgetMin != null ? { budgetMin: rest.budgetMin } : {}),
          ...(rest.budgetMax != null ? { budgetMax: rest.budgetMax } : {}),
          ...(rest.targetDate ? { targetDate: rest.targetDate } : {}),
        },
        automation: { followupReminderEnabled: true, interactionFrequency: 'medium' },
        createdAt: now,
        updatedAt: now,
      });
    } catch (mirrorErr) {
      // Inquiry persisted — the mirror is repairable by the backfill script.
      console.error('[inquiries] CRM leads mirror failed:', mirrorErr);
    }

    // Top-3 AI matches (25% discount request flow): reuse the SAME engine
    // and publish gate as /api/matches (rankMatches + PUBLISHABLE-only
    // read) so the two endpoints can never disagree on what a match is.
    // Budget for the scorer is derived from the extended payload when
    // present (budgetMax, else budgetMin, else the legacy budget string)
    // and converted EGP→USD the same way the listings mapper does (÷50).
    // Best-effort: a matching failure never breaks the inquiry itself.
    let topMatches: Array<{
      id: string; code: string; compound: string; beds: number;
      area: number; egpM: number; score: number; reasons: string[];
    }> = [];
    try {
      const budgetEgp =
        rest.budgetMax ?? rest.budgetMin ??
        (rest.budget ? Number(rest.budget.replace(/[^\d.]/g, '')) || 0 : 0);
      if (budgetEgp > 0) {
        const { listRecords } = await import('@sierra-estates/db');
        const { toListingRecord } = await import('@/lib/server/listing-columns');
        const { rankMatches } = await import('@/lib/server/match-scoring');
        const rows = await listRecords<Record<string, unknown>>('listings', {
          where: [
            { column: 'status', op: 'in', value: ['active', 'available'] },
            { column: 'publish_status', op: 'eq', value: 'PUBLISHABLE' },
          ],
          limit: 500,
        });
        const onMarket = rows
          .map((row) => toListingRecord(row))
          .filter((l) => l.mode === rest.mode) as never[];
        const answers = {
          budget: Math.round(budgetEgp / 50), // EGP → USD (listings mapper rate)
          beds: rest.bedrooms ?? 0,
          type: (rest.unitType || type || 'apartment') as never,
          mode: rest.mode,
          ...(rest.zone ? { preferredZone: rest.zone as never } : {}),
        };
        topMatches = rankMatches(onMarket, answers)
          .slice(0, 3)
          .map((m) => {
            const l = m.listing as unknown as Record<string, unknown>;
            return {
              id: String(l.id ?? ''),
              code: String(l.code ?? ''),
              compound: String(l.compound ?? ''),
              beds: Number(l.beds ?? 0),
              area: Number(l.area ?? 0),
              egpM: Number(l.egpM ?? 0),
              score: Math.round(m.score),
              reasons: m.reasons ?? [],
            };
          });
      }
    } catch (matchErr) {
      console.error('[inquiries] Top-3 matching failed (non-fatal):', matchErr);
    }

    // Buyer Concierge: queue advisory reply & notify sales rep (25% Commission Discount applied)
    const advisoryNote = `Dear ${rest.name}, thank you for choosing Sierra Estates 🏛️\nAI Discovers. We Advise. You Decide.\nWe are verifying owner availability for your request and will confirm within 24 hours.\nYour 25% Website Commission Discount has been locked in.`;

    try {
      if (rest.phone) {
        const { enqueueWhatsAppJob } = await import('@/lib/server/whatsapp-queue');
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: rest.phone,
          toName: rest.name,
          body: advisoryNote,
          metadata: { inquiryId: created.id, discount: '25%' },
        }).catch(() => {});
      }
    } catch {
      // WhatsApp queue is best-effort
    }

    try {
      const { sendTelegramMessage } = await import('@/lib/services/telegram-controller');
      const salesChatId = process.env.TELEGRAM_SALES_REP_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
      await sendTelegramMessage(
        `🎯 <b>New Website Lead (${rest.mode.toUpperCase()}) — 25% Discount Applied</b>\n` +
        `👤 Client: <b>${rest.name}</b> (${rest.phone})\n` +
        (rest.zone ? `📍 Preferred Zone: ${rest.zone}\n` : '') +
        (type ? `🏢 Unit Type: ${type}\n` : '') +
        (rest.budget ? `💰 Budget: ${rest.budget} EGP\n` : '') +
        `💡 <i>Buyer Concierge: Availability check in progress (24h SLA).</i>`,
        salesChatId
      ).catch(() => {});
    } catch {
      // Telegram notify is best-effort
    }

    return NextResponse.json({
      id: created.id,
      status: 'received',
      discountApplied: '25%',
      advisoryNote: 'AI Discovers. We Advise. You Decide. We are verifying owner availability within 24 hours.',
      topMatches,
    });
  } catch (error) {
    console.error('[inquiries] Supabase write failed:', error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ id: `local-${crypto.randomUUID()}`, fallback: true });
    }
    return NextResponse.json(
      { error: 'Unable to save your request right now. Please try again shortly.' },
      { status: 503 }
    );
  }
}
