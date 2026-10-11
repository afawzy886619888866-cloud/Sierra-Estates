import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicEndpointLimiter } from '@/lib/server/rate-limit';
import { getSupabase, listRecords } from '@sierra-estates/db';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  unitCode: z.string().min(1).max(80),
  compound: z.string().max(120).optional(),
  unitId: z.string().max(80).optional(),
  requesterName: z.string().max(80).optional(),
});

/**
 * 24-hour in-memory cooldown per unitCode to prevent spamming owners
 * with duplicate photo requests.
 */
const unitCooldowns = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function isUnitOnCooldown(unitCode: string): boolean {
  const lastRequested = unitCooldowns.get(unitCode.toUpperCase());
  if (!lastRequested) return false;
  if (Date.now() - lastRequested > COOLDOWN_MS) {
    unitCooldowns.delete(unitCode.toUpperCase());
    return false;
  }
  return true;
}

function markUnitRequested(unitCode: string) {
  unitCooldowns.set(unitCode.toUpperCase(), Date.now());
}

/** Resolve listing safely from Supabase or fallback record store. */
async function resolveListing(unitCode: string, unitId?: string): Promise<Record<string, unknown> | null> {
  // 1. Direct Supabase query
  try {
    const supabase = getSupabase();
    let query = supabase.from('listings').select('*').limit(1);
    if (unitId) {
      query = query.or(`code.eq.${unitCode},id.eq.${unitId},ref_id.eq.${unitCode},sbr_code.eq.${unitCode}`);
    } else {
      query = query.or(`code.eq.${unitCode},ref_id.eq.${unitCode},sbr_code.eq.${unitCode}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data[0];
    }
  } catch (err) {
    logger.debug('[request-photos] Supabase query fallback:', err);
  }

  // 2. Generic listRecords fallback
  for (const column of ['code', 'refId', 'referenceCode', 'id']) {
    try {
      const rows = await listRecords('listings', {
        where: [{ column, value: unitCode }],
        limit: 1,
      });
      if (rows.length > 0) return rows[0] as Record<string, unknown>;
    } catch {
      // Continue to next column check
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  // 1. Public rate limiting per IP
  const rateLimitResponse = await publicEndpointLimiter(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { unitCode, compound, unitId } = parsed.data;

    // 2. Cooldown check
    if (isUnitOnCooldown(unitCode)) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        unitCode,
        message: 'تم استلام طلب الصور لهذه الوحدة مسبقاً وهو قيد المتابعة من المالك والفريق.',
      });
    }

    // 3. Resolve unit details & contact info server-side
    const listing = await resolveListing(unitCode, unitId);

    const phone =
      (typeof listing?.owner_phone === 'string' && listing.owner_phone) ||
      (typeof listing?.ownerPhone === 'string' && listing.ownerPhone) ||
      (typeof listing?.broker_phone === 'string' && listing.broker_phone) ||
      (typeof listing?.brokerPhone === 'string' && listing.brokerPhone) ||
      (typeof listing?.mobile === 'string' && listing.mobile) ||
      (typeof listing?.contact_info === 'string' && listing.contact_info) ||
      null;

    const contactName =
      (typeof listing?.owner_name === 'string' && listing.owner_name) ||
      (typeof listing?.ownerName === 'string' && listing.ownerName) ||
      (typeof listing?.broker_name === 'string' && listing.broker_name) ||
      (typeof listing?.brokerName === 'string' && listing.brokerName) ||
      '';

    const compoundName =
      compound ||
      (typeof listing?.compound === 'string' && listing.compound) ||
      (typeof listing?.location_area === 'string' && listing.location_area) ||
      '';

    const messageBody = [
      `مرحباً ${contactName ? contactName : 'يا فندم'} 👋`,
      `معاك المساعد الذكي لشركة Sierra Estates بخصوص الوحدة [${unitCode}]${compoundName ? ` في ${compoundName}` : ''}.`,
      '',
      `يوجد عميل مهتم بالوحدة حالياً عبر الخريطة التفاعلية 📍 ويرغب في معاينة صور إضافية.`,
      `📷 برجاء تزويدنا بصور واضحة للوحدة (واجهة وداخلية) لنتمكن من عرضها ومشاركتها مع المهتمين.`,
      '',
      `شكراً لتعاونكم معنا 🙏`,
    ].join('\n');

    if (phone) {
      // Dispatches via WhatsApp queue
      try {
        await enqueueWhatsAppJob({
          purpose: 'general-outreach',
          toPhone: phone,
          toName: contactName || 'العميل',
          body: messageBody,
          unitId: unitId || (listing?.id as string | undefined),
          metadata: {
            kind: 'client-map-photo-request',
            unitCode,
            compound: compoundName,
            channel: 'interactive-map-hud',
          },
        });
      } catch (queueErr) {
        logger.warn('[request-photos] Failed to enqueue WhatsApp job, fallback logged:', queueErr);
      }
    } else {
      // Log for admin concierge team follow-up
      logger.info(`[request-photos] No phone found for unit ${unitCode}. Logged for manual concierge follow-up.`);
    }

    markUnitRequested(unitCode);

    // SECURITY & PRIVACY: NEVER leak phone or PII in the client response
    return NextResponse.json({
      success: true,
      unitCode,
      compound: compoundName,
      hasContactOnRecord: Boolean(phone),
      message: 'تم إرسال طلب الصور بنجاح وجارٍ التواصل مع المالك/الوسيط.',
    });
  } catch (err: unknown) {
    logger.error('[request-photos] Internal error:', err);
    return NextResponse.json(
      { error: 'Failed to process photo request' },
      { status: 500 }
    );
  }
}
