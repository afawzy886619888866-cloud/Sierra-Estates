/**
 * /api/viewing-requests — Phase 8 public VIEWING flow.
 *
 * POST (PUBLIC, rate-limited): the property page's "Request Viewing" form.
 *   { propertyCode, visitorName, visitorPhone, visitorEmail?, preferredDate,
 *     preferredTime?, numberOfPeople?, message? }
 *
 * Journey wiring (master spec PROPERTY → REQUEST → SLOT → CONFIRM):
 *   1. Upsert the visitor as a lead by phone (source 'website', pipeline
 *      stage 'viewing') so the CRM board reflects the request immediately.
 *   2. Insert ONE row into the canonical public.viewings table
 *      (status 'pending_approval', source 'website') — migration 014
 *      consolidated the three legacy viewing tables into this one.
 *   3. Fire-and-forget Telegram internal alert to the ops channel.
 *   4. Respond with confirmation links (WhatsApp + Google Calendar) that
 *      carry the REAL chosen slot — the previous property page shipped an
 *      .ics with a hardcoded past date (fabrication, removed).
 *
 * GET (ADMIN): listing of viewing rows for the ops dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { insertRecord, listRecords, type WhereClause } from '@sierra-estates/db';
=======
import { z } from 'zod';
import { insertRecord, listRecords, updateRecord, type WhereClause } from '@sierra-estates/db';
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';
import { logger } from '@/lib/logger';

const requestSchema = z.object({
  propertyCode: z.string().min(1).max(64),
  visitorName: z.string().min(1).max(200),
  visitorPhone: z.string().min(7).max(20),
  visitorEmail: z.string().email().max(320).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be YYYY-MM-DD'),
  preferredTime: z.string().max(20).optional(),
  numberOfPeople: z.number().int().min(1).max(20).optional(),
  message: z.string().max(2000).optional(),
});

/** Normalize to E.164-ish digits for lookups and wa.me links. */
function cleanPhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, '');
}

function isFutureDate(yyyyMmDd: string): boolean {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!isFutureDate(data.preferredDate)) {
    return NextResponse.json({ error: 'Preferred date must be today or later' }, { status: 400 });
  }

  const phone = cleanPhone(data.visitorPhone);
  if (phone.replace(/\D/g, '').length < 7) {
    return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    // ── 1. Upsert the visitor as a lead (CRM visibility, stage viewing) ──
    let leadId: string | null = null;
    try {
      const existing = await listRecords<{ id: string }>('leads', {
        where: [{ column: 'phone', value: phone }],
        orderBy: { column: 'createdAt', ascending: false },
        limit: 1,
      });
      if (existing[0]) {
        leadId = existing[0].id;
        await updateRecord('leads', leadId, {
          status: 'viewing_scheduled', // Phase 10: canonical value (m016 normalized the legacy free-form spelling)
          pipelineStage: 'viewing',
          updatedAt: now,
        });
      }
    } catch (err) {
      logger.warn('[viewing-requests] lead lookup failed (continuing with viewing row only):', err);
    }
    if (!leadId) {
      const created = await insertRecord<{ id: string }>('leads', {
        fullName: data.visitorName,
        phone,
        ...(data.visitorEmail ? { email: data.visitorEmail } : {}),
        channel: 'web',
        source: 'website',
        status: 'viewing_scheduled', // Phase 10: canonical value (m016 normalized the legacy free-form spelling)
        pipelineStage: 'viewing',
        via: `Viewing request for ${data.propertyCode}`,
        createdAt: now,
        updatedAt: now,
      });
      leadId = created.id;
    }

<<<<<<< HEAD
    // Validate email format (bounded length and safe linear regex to prevent ReDoS)
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,24}$/;
    if (typeof visitorEmail !== 'string' || visitorEmail.length > 320 || !emailRegex.test(visitorEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate date is in future
    const requestDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate < today) {
      return NextResponse.json(
        { error: 'Preferred date must be in the future' },
        { status: 400 }
      );
    }

    // Add viewing request to Supabase
    const created = await insertRecord<{ id: string }>('viewing_requests', {
      propertyCode,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredDate,
      preferredTime: preferredTime || '',
      numberOfPeople: numberOfPeople || 1,
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
=======
    // ── 2. Canonical viewing row (public.viewings — migration 014) ─────────
    const viewing = await insertRecord<{ id: string }>('viewings', {
      ...(leadId ? { leadId } : {}),
      propertyCode: data.propertyCode,
      visitorName: data.visitorName,
      visitorPhone: phone,
      ...(data.visitorEmail ? { visitorEmail: data.visitorEmail } : {}),
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime || 'morning',
      numberOfPeople: data.numberOfPeople || 1,
      ...(data.message ? { message: data.message } : {}),
      status: 'pending_approval',
      source: 'website',
      createdAt: now,
      updatedAt: now,
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
    });

    // ── 3. Telegram internal alert (fire-and-forget — never blocks) ───────
    try {
      const { sendTelegramMessage } = await import('@/lib/services/telegram-controller');
      sendTelegramMessage(
        `👁 New viewing request\nUnit: ${data.propertyCode}\nClient: ${data.visitorName} (${phone})\nSlot: ${data.preferredDate}${data.preferredTime ? ` ${data.preferredTime}` : ''}\nPeople: ${data.numberOfPeople || 1}`,
        process.env.TELEGRAM_ADMIN_CHAT_ID
      ).catch(() => {});
    } catch {
      /* telegram is best-effort internal alerting */
    }

    // ── 4. Confirmation links with the REAL chosen slot ────────────────────
    const waText = encodeURIComponent(
      `Hello Sierra Estates — confirming my viewing request for unit [${data.propertyCode}] on ${data.preferredDate}${data.preferredTime ? ` (${data.preferredTime})` : ''}. Name: ${data.visitorName}.`
    );
    const waNumber = phone.startsWith('+') ? phone.replace('+', '') : `2${phone.replace(/^0+/, '')}`;
    const calDate = data.preferredDate.replace(/-/g, '');
    const calendarLink =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`Property Viewing — ${data.propertyCode} (Sierra Estates)`)}` +
      `&dates=${calDate}T100000Z/${calDate}T110000Z` +
      `&details=${encodeURIComponent(`Viewing requested by ${data.visitorName} · ${phone}. Unit ${data.propertyCode}.`)}`;

    return NextResponse.json(
      {
        success: true,
<<<<<<< HEAD
        requestId: created.id,
        message: 'Viewing request created successfully'
=======
        requestId: viewing.id,
        leadId,
        message: 'Viewing request received — our team will confirm shortly.',
        whatsappConfirmUrl: `https://wa.me/201092048333?text=${waText}`,
        calendarLink,
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Viewing request creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create viewing request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: WhereClause[] = [];
<<<<<<< HEAD
    if (propertyCode) {
      where.push({ column: 'propertyCode', value: propertyCode });
    }
    if (status) {
      where.push({ column: 'status', value: status });
    }

    const requests = await listRecords('viewing_requests', { where });

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests
    }, { status: 200 });
=======
    if (status) where.push({ column: 'status', value: status });

    // Canonical table post-migration 014 (legacy viewing_requests rows were
    // copied in; new writes arrive here only).
    const requests = await listRecords('viewings', {
      where,
      orderBy: { column: 'createdAt', ascending: false },
      limit: 200,
    });

    return NextResponse.json({ success: true, count: requests.length, requests }, { status: 200 });
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
  } catch (error) {
    logger.error('Get viewing requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
