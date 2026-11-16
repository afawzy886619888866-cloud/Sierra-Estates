import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord } from '@sierra-estates/db';
import { processClientRequest } from '@/lib/services/ClientRequestPipeline';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import { escapeTelegramHtml } from '@/lib/telegram';

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
  // (`propertyType`); everything else maps 1:1. Only REAL inquiry columns are
  // inserted — the campaign/extended fields previously rode along into this
  // insert (`...rest`) and PostgREST rejected the phantom columns, sending
  // every submit down the catch branch (silent data loss through the dev-only
  // fake-success fallback below). They now live in the leads mirror
  // (metadata), the public.client_requests row, and the Sheets sync instead.
  const {
    type,
    campaign, discountPercent, voucherCode, dealType, compounds,
    unitType, bedrooms, finishing, budgetMin, budgetMax, targetDate,
    ...inquiryFields
  } = parsed.data;

  // Canonical Egyptian phone gate — one rule on every intake surface.
  const phoneNormalized = normalizeEgyptianPhone(inquiryFields.phone);
  if (!phoneNormalized) {
    return NextResponse.json(
      { error: 'Enter a valid Egyptian mobile number (e.g. 01012345678).' },
      { status: 400 }
    );
  }

  const payload = {
    ...inquiryFields,
    phone: phoneNormalized,
    propertyType: type,
    source: 'website',
    status: 'new',
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
        `[Intent: ${inquiryFields.mode.toUpperCase()}]`,
        inquiryFields.zone ? `[Preferred Zone: ${inquiryFields.zone}]` : null,
        type ? `[Property Type: ${type}]` : null,
        inquiryFields.budget ? `[Budget: ${inquiryFields.budget} EGP]` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      await insertRecord('leads', {
        fullName: inquiryFields.name,
        phone: phoneNormalized,
        email: inquiryFields.email || undefined,
        channel: 'web',
        mode: inquiryFields.mode,
        source: 'website',
        originChannel: 'website_inquiry_form',
        status: 'new',
        stage: 'inbound',
        phase: 'acquisition',
        priority: 'warm',
        via: 'Website',
        zone: inquiryFields.zone || undefined,
        interest: type || 'General Inquiry',
        capitalAllocation: inquiryFields.budget || 'To be determined',
        summaryNotes: `${structuredPrefix}${inquiryFields.notes ? ` | ${inquiryFields.notes}` : ''}`,
        metadata: {
          inquiryId: created.id,
          mirroredFrom: 'public.inquiries',
          // /request campaign fields (present only when the extended form sent them)
          ...(campaign ? { campaign } : {}),
          ...(discountPercent != null ? { discountPercent } : {}),
          ...(voucherCode ? { voucherCode } : {}),
          ...(dealType ? { dealType } : {}),
          ...(compounds ? { compounds } : {}),
          ...(unitType ? { unitType } : {}),
          ...(bedrooms != null ? { bedrooms } : {}),
          ...(finishing ? { finishing } : {}),
          ...(budgetMin != null ? { budgetMin } : {}),
          ...(budgetMax != null ? { budgetMax } : {}),
          ...(targetDate ? { targetDate } : {}),
        },
        automation: { followupReminderEnabled: true, interactionFrequency: 'medium' },
        createdAt: now,
        updatedAt: now,
      });
    } catch (mirrorErr) {
      // Inquiry persisted — the mirror is repairable by the backfill script.
      console.error('[inquiries] CRM leads mirror failed:', mirrorErr);
    }

    // MODULE 2 PIPELINE — Supabase public.client_requests (system of record
    // for the requests funnel) + Google Sheets `Client_Requests` tab
    // (auto-created via Sheets API v4) + formatted Telegram sales alert with
    // matched unit codes. Best-effort by design: a pipeline failure never
    // breaks the visitor's submit (it is honestly logged inside the
    // pipeline), and its request code rides along in the response.
    const pipelineResult = await processClientRequest({
      clientName: inquiryFields.name,
      phone: phoneNormalized,
      email: inquiryFields.email || null,
      transactionType: inquiryFields.mode === 'rent' ? 'Rent' : 'Sale',
      propertyType: unitType || type || null,
      compoundZone: inquiryFields.zone
        || (Array.isArray(compounds) ? compounds.join(', ') : compounds || '') || null,
      budgetEgp: budgetMax ?? budgetMin ??
        (inquiryFields.budget ? Number(inquiryFields.budget.replace(/[^\d.]/g, '')) || null : null),
      bedrooms: bedrooms ?? null,
      promoApplied: campaign
        ? `${campaign}${discountPercent != null ? ` (${discountPercent}% off)` : ''}`
        : voucherCode
          ? `Voucher ${voucherCode}`
          : null,
      notes: inquiryFields.notes || null,
      source: 'website_inquiry',
    }).catch((err) => {
      console.error('[inquiries] Module-2 client_requests pipeline failed (non-fatal):', err);
      return null;
    });

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
        budgetMax ?? budgetMin ??
        (inquiryFields.budget ? Number(inquiryFields.budget.replace(/[^\d.]/g, '')) || 0 : 0);
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
          .filter((l) => l.mode === inquiryFields.mode) as never[];
        const answers = {
          budget: Math.round(budgetEgp / 50), // EGP → USD (listings mapper rate)
          beds: bedrooms ?? 0,
          // §21 no-fabrication: unstated type → no preference (bonus
          // skipped), never an invented 'apartment' default.
          type: (unitType || type || null) as never,
          mode: inquiryFields.mode,
          ...(inquiryFields.zone ? { preferredZone: inquiryFields.zone as never } : {}),
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
    const advisoryNote = `Dear ${inquiryFields.name}, thank you for choosing Sierra Estates 🏛️\nAI Discovers. We Advise. You Decide.\nWe are verifying owner availability for your request and will confirm within 24 hours.\nYour 25% Website Commission Discount has been locked in.`;

    try {
      if (phoneNormalized) {
        const { enqueueWhatsAppJob } = await import('@/lib/server/whatsapp-queue');
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: phoneNormalized,
          toName: inquiryFields.name,
          body: advisoryNote,
          metadata: { inquiryId: created.id, discount: '25%' },
        }).catch(() => {});
      }
    } catch {
      // WhatsApp queue is best-effort
    }

    // Telegram sales-lane alert. The Module-2 pipeline above already sent
    // the formatted Client_Request alert (matched unit codes + normalized
    // phone), so this legacy lane only fires when the pipeline did NOT
    // succeed — no double notifications. Client values are HTML-escaped: a
    // lead's free-text name/notes can otherwise inject Telegram markup or
    // break the send outright.
    if (!pipelineResult?.ok) {
      try {
        const { sendTelegramMessage } = await import('@/lib/services/telegram-controller');
        const { resolveRoleChat } = await import('@/lib/server/telegram-role-chats');
        // Sales lane: explicit sales-rep/admin env vars keep precedence (ops
        // escape hatch), then the self-registered Sales Advisor role chat
        // (public.telegram_role_chats, migration 044). Unset → honest skip —
        // sendTelegramMessage already no-ops on a missing chat id.
        const salesEnv = process.env.TELEGRAM_SALES_REP_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;
        const salesChatId = salesEnv || (await resolveRoleChat('sales_advisor')).chatId || undefined;
        await sendTelegramMessage(
          `🎯 <b>New Website Lead (${inquiryFields.mode.toUpperCase()}) — 25% Discount Applied</b>\n` +
          `👤 Client: <b>${escapeTelegramHtml(inquiryFields.name)}</b> (<code>${escapeTelegramHtml(phoneNormalized)}</code>)\n` +
          (inquiryFields.zone ? `📍 Preferred Zone: ${escapeTelegramHtml(inquiryFields.zone)}\n` : '') +
          (type ? `🏢 Unit Type: ${escapeTelegramHtml(type)}\n` : '') +
          (inquiryFields.budget ? `💰 Budget: ${escapeTelegramHtml(inquiryFields.budget)} EGP\n` : '') +
          `💡 <i>Buyer Concierge: Availability check in progress (24h SLA).</i>`,
          salesChatId
        ).catch(() => {});
      } catch {
        // Telegram notify is best-effort
      }
    }

    // Mirror to Online Requests Spreadsheet (Google Sheets & local persistent mirror)
    try {
      const { syncRequestToSheet } = await import('@/lib/services/RequestSheetSyncService');
      const compoundNames = Array.isArray(compounds) ? compounds.join(', ') : compounds;
      await syncRequestToSheet({
        id: created.id,
        type: 'buyer_demand',
        clientName: inquiryFields.name,
        clientPhone: phoneNormalized,
        clientEmail: inquiryFields.email || '',
        mode: inquiryFields.mode || 'sale',
        preferredZone: inquiryFields.zone || compoundNames || '',
        unitType: unitType || type || '',
        bedrooms,
        budget: budgetMax ? `${budgetMin || 0} - ${budgetMax} EGP` : inquiryFields.budget || 'Open',
        finishing: finishing || 'Any',
        campaign: campaign || (voucherCode ? `Black Friday (${discountPercent || 25}%)` : ''),
        voucherCode: voucherCode || '',
        targetDate: targetDate || '',
        matchedUnits: topMatches.map((m) => m.code),
        status: 'new',
        notes: inquiryFields.notes || '',
        source: 'website_inquiry',
      }).catch(() => {});
    } catch (sheetErr) {
      console.error('[inquiries] Request sheet sync warning:', sheetErr);
    }

    return NextResponse.json({
      id: created.id,
      status: 'received',
      requestCode: pipelineResult?.requestCode ?? undefined,
      discountApplied: '25%',
      advisoryNote: 'AI Discovers. We Advise. You Decide. We are verifying owner availability within 24 hours.',
      topMatches,
    });
  } catch (error) {
    console.error('[inquiries] Supabase write failed:', error);
    // NO fake-success fallback: the old dev-only `local-<uuid>` response made
    // submits "succeed" while nothing was persisted. An unwritten request is
    // reported as failed so the client form surfaces the error honestly.
    return NextResponse.json(
      { error: 'Unable to save your request right now. Please try again shortly.' },
      { status: 503 }
    );
  }
}
