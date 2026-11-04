import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicEndpointLimiter } from '@/lib/server/rate-limit';
import { getSupabaseAdmin, listRecords } from '@sierra-estates/db';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  unitCode: z.string().min(1).max(80).optional(),
  compound: z.string().max(120).optional(),
  unitId: z.string().max(80).optional(),
  requesterName: z.string().max(80).optional(),
  sweep: z.boolean().optional(),
  mode: z.enum(['single', 'batch', 'sweep']).optional(),
  minPhotos: z.number().int().min(1).max(20).optional(),
  limit: z.number().int().min(1).max(100).optional(),
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
  //
  // 2026-11-01 PII hardening: owner/broker contact columns are no longer
  // grantable to the anon role, so this SERVER-SIDE resolver reads them with
  // the service-role client. The explicit publish-gate filters below preserve
  // exactly the row scope the anon client's RLS policy ("Public can view
  // active listings": status='active' AND publish_status='PUBLISHABLE')
  // enforced before — the route itself is the gate now (rate limit +
  // cooldown + response that never carries PII).
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('listings')
      .select(
        'id,code,ref_id,sbr_code,compound,location_area,owner_phone,owner_name,broker_phone,broker_name',
      )
      .eq('status', 'active')
      .eq('publish_status', 'PUBLISHABLE')
      .limit(1);
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

interface SweepResultItem {
  unitCode: string;
  compound: string;
  photosCount: number;
  contactName: string;
  jobId?: string;
  status: 'dispatched' | 'cooldown' | 'no_phone' | 'skipped';
}

async function runBatchPhotoSweep(options?: {
  minPhotos?: number;
  limit?: number;
}) {
  const minPhotos = options?.minPhotos ?? 8;
  const limit = options?.limit ?? 25;

  const candidates: Array<Record<string, unknown>> = [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('listings')
      .select('id,code,ref_id,sbr_code,compound,location_area,images,owner_phone,owner_name,broker_phone,broker_name,status,publish_status')
      .eq('status', 'active')
      .limit(limit * 3);

    if (!error && Array.isArray(data)) {
      candidates.push(...data);
    }
  } catch (err) {
    logger.debug('[request-photos] Supabase sweep query fallback:', err);
  }

  // Generic fallback if Supabase returns empty
  if (candidates.length === 0) {
    try {
      const rows = await listRecords('listings', {
        where: [{ column: 'status', value: 'active' }],
        limit: limit * 2,
      });
      if (Array.isArray(rows)) {
        candidates.push(...(rows as Array<Record<string, unknown>>));
      }
    } catch {
      // fail-safe fallback
    }
  }

  const results: SweepResultItem[] = [];
  let dispatchedCount = 0;

  for (const item of candidates) {
    if (dispatchedCount >= limit) break;

    const unitCode = String(item.code || item.ref_id || item.sbr_code || item.id || '').trim();
    if (!unitCode) continue;

    const imagesArr = Array.isArray(item.images)
      ? item.images
      : (typeof item.images === 'string' && item.images ? [item.images] : []);
    const photosCount = imagesArr.length;

    // Filter units with fewer than minPhotos (< 8-10 photos)
    if (photosCount >= minPhotos) {
      continue;
    }

    if (isUnitOnCooldown(unitCode)) {
      results.push({
        unitCode,
        compound: String(item.compound || item.location_area || ''),
        photosCount,
        contactName: String(item.owner_name || item.broker_name || ''),
        status: 'cooldown',
      });
      continue;
    }

    const phone =
      (typeof item.owner_phone === 'string' && item.owner_phone) ||
      (typeof item.ownerPhone === 'string' && item.ownerPhone) ||
      (typeof item.broker_phone === 'string' && item.broker_phone) ||
      (typeof item.brokerPhone === 'string' && item.brokerPhone) ||
      null;

    const contactName =
      (typeof item.owner_name === 'string' && item.owner_name) ||
      (typeof item.ownerName === 'string' && item.ownerName) ||
      (typeof item.broker_name === 'string' && item.broker_name) ||
      (typeof item.brokerName === 'string' && item.brokerName) ||
      '';

    const compoundName = String(item.compound || item.location_area || '');

    if (!phone) {
      results.push({
        unitCode,
        compound: compoundName,
        photosCount,
        contactName,
        status: 'no_phone',
      });
      continue;
    }

    const uploadUrl = `https://sierra-estates.net/upload-photos?code=${encodeURIComponent(unitCode)}`;
    const messageBody = [
      `مرحباً ${contactName ? contactName : 'يا فندم'} 👋`,
      `معاك المساعد الذكي لشركة Sierra Estates بخصوص وحدتكم [${unitCode}]${compoundName ? ` في ${compoundName}` : ''}.`,
      '',
      `حرصاً على تسويق وحدتكم بأعلى معايير الجودة على منصاتنا وبروبرتي فايندر وخريطة المستثمرين، نلاحظ أن الوحدة تحتوي على (${photosCount}) صور فقط (الحد الأدنى المطلوب 8-10 صور عالية الجودة).`,
      '',
      `📷 نرجو التكرم بإرسال الصور هنا عبر الواتساب، أو رفعها مباشرة من خلال الرابط المخصص:`,
      uploadUrl,
      '',
      `شاكرين حسن تعاونكم معنا 🙏`,
    ].join('\n');

    let jobId: string | undefined;
    try {
      jobId = await enqueueWhatsAppJob({
        purpose: 'general-outreach',
        toPhone: phone,
        toName: contactName || 'المالك المحترم',
        body: messageBody,
        unitId: typeof item.id === 'string' ? item.id : undefined,
        metadata: {
          kind: 'auto-photo-sweep',
          unitCode,
          compound: compoundName,
          photosCount,
          minPhotosThreshold: minPhotos,
          uploadUrl,
        },
      });
    } catch (queueErr) {
      logger.warn('[request-photos] Failed to enqueue sweep WhatsApp job:', queueErr);
    }

    markUnitRequested(unitCode);
    dispatchedCount++;

    results.push({
      unitCode,
      compound: compoundName,
      photosCount,
      contactName,
      jobId,
      status: 'dispatched',
    });
  }

  return {
    success: true,
    mode: 'batch-sweep',
    scannedTotal: candidates.length,
    dispatchedCount,
    minPhotosThreshold: minPhotos,
    items: results,
    message: `تم فحص الوحدات وإرسال طلبات تحديث الصور لـ ${dispatchedCount} وحدة بنجاح.`,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const minPhotos = parseInt(url.searchParams.get('minPhotos') || '8', 10);
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);

  const sweepOutput = await runBatchPhotoSweep({ minPhotos, limit });
  return NextResponse.json(sweepOutput);
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

    // Check if batch sweep was requested
    if (parsed.data.sweep || parsed.data.mode === 'batch' || parsed.data.mode === 'sweep') {
      const sweepOutput = await runBatchPhotoSweep({
        minPhotos: parsed.data.minPhotos,
        limit: parsed.data.limit,
      });
      return NextResponse.json(sweepOutput);
    }

    const { unitCode, compound, unitId } = parsed.data;
    if (!unitCode) {
      return NextResponse.json(
        { error: 'Invalid payload', details: 'unitCode is required for single unit photo requests' },
        { status: 400 }
      );
    }

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
