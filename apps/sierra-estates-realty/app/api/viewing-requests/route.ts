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
import { z } from 'zod';
import { insertRecord, listRecords, updateRecord, type WhereClause } from '@sierra-estates/db';
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

    // ── 2. Canonical viewing row (public.viewings — migration 014) ─────────
    // 3-way dispatch roster + golden-hour deadline. These used to ride as
    // four insert columns (ceo_email / team_leader_email /
    // sales_advisor_email / golden_hour_at) that exist in NO schema or
    // migration, so PostgREST rejected every insert (PGRST204) and the
    // public viewing form returned 500. The viewings table has no such
    // columns, so the roster + deadline now park in `notes` (a real column,
    // already free-text) where the ops dashboard still reads them.
    const goldenHourAt = new Date(new Date(`${data.preferredDate}T12:00:00Z`).getTime() + 60 * 60 * 1000).toISOString();
    const dispatchRoster =
      `CEO: a.fawzy8866@gmail.com | Team Leader: teamleader@sierra-estates.net | ` +
      `Sales Advisor: advisory@sierra-estates.net | Golden Hour deadline: ${goldenHourAt}`;
    const visitorNotes = data.message?.trim()
      ? `${data.message.trim()}\n\n---\n${dispatchRoster}`
      : dispatchRoster;
    const viewing = await insertRecord<{ id: string }>('viewings', {
      ...(leadId ? { leadId } : {}),
      propertyCode: data.propertyCode,
      visitorName: data.visitorName,
      visitorPhone: phone,
      ...(data.visitorEmail ? { visitorEmail: data.visitorEmail } : {}),
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime || 'morning',
      numberOfPeople: data.numberOfPeople || 1,
      notes: visitorNotes,
      status: 'pending_approval',
      source: 'website',
      createdAt: now,
      updatedAt: now,
    });

    // ── 2b. Golden Hour follow-up task (public.followups — real table) ─────
    // The 60-minute timer was previously only a string inside the calendar
    // event text; nothing operational ever acted on it. A real followup row
    // (type 'viewing', due at the golden-hour deadline) makes the timer
    // visible on the CRM task board and lets /api/cron/lead-timers flip it
    // to 'overdue' when it lapses. Best-effort: a followups failure must
    // never break the visitor's 201.
    try {
      await insertRecord('followups', {
        ...(leadId ? { leadId } : {}),
        type: 'viewing',
        title: `Golden Hour follow-up — ${data.propertyCode} (${data.visitorName})`,
        notes:
          `60-minute Golden Hour window after the viewing slot. ` +
          `Unit ${data.propertyCode}, client ${data.visitorName} (${phone}). ` +
          `Confirm advisor assignment and log the call outcome. 25% Website Commission Discount applies.`,
        dueAt: goldenHourAt,
        status: 'pending',
        priority: 'high',
        createdBy: 'viewing-requests-bot',
        createdAt: now,
        updatedAt: now,
      });
    } catch (followupErr) {
      logger.warn('[viewing-requests] Golden Hour followup row failed (non-fatal):', followupErr);
    }

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

    // ── 3. 3-way stakeholder dispatch (CEO / Team Leader / Sales Advisor) ──
    // The Google Calendar invite link above carries all three staff emails as
    // attendees (plus the visitor), but a link in the visitor's response is
    // not a dispatch — staff never saw it. The repo has no email provider
    // wired (§21: never fabricate a delivery channel), so the operational
    // dispatch rides the existing Telegram lane: each stakeholder ROLE chat
    // (when its env chat id is configured) receives the invite link with the
    // real slot. Unconfigured roles are honestly reported as skipped in the
    // response, and a failure here can never break the visitor's 201.
    const dispatchRoles: Array<{ role: string; chatEnv: string; email: string }> = [
      { role: 'CEO (Ahmed Fawzy)', chatEnv: 'TELEGRAM_CEO_CHAT_ID', email: 'a.fawzy8866@gmail.com' },
      { role: 'Team Leader', chatEnv: 'TELEGRAM_TEAM_LEADER_CHAT_ID', email: 'teamleader@sierra-estates.net' },
      { role: 'Sales Advisor', chatEnv: 'TELEGRAM_SALES_ADVISOR_CHAT_ID', email: 'advisory@sierra-estates.net' },
    ];
    const calendarInviteForStaff =
      `📅 Property Viewing — ${data.propertyCode}\n` +
      `Client: ${data.visitorName} (${phone})\n` +
      `Slot: ${data.preferredDate}${data.preferredTime ? ` ${data.preferredTime}` : ''} · ${data.numberOfPeople || 1} ppl\n` +
      `Golden Hour follow-up due: ${goldenHourAt}\n` +
      `Calendar invite (3-way + client):\n`;
    const dispatchResults: Array<{ role: string; delivered: boolean }> = [];
    // Same date/attendee values step 4 renders into the visitor's link —
    // computed here first because the dispatch (step 3) runs before them.
    const calDate = data.preferredDate.replace(/-/g, '');
    const attendees = ['a.fawzy8866@gmail.com', 'teamleader@sierra-estates.net', 'advisory@sierra-estates.net', data.visitorEmail]
      .filter(Boolean)
      .join(',');
    const staffCalendarLink =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`Property Viewing — ${data.propertyCode} (Sierra Estates)`)}` +
      `&dates=${calDate}T100000Z/${calDate}T110000Z` +
      `&details=${encodeURIComponent(`Viewing requested by ${data.visitorName} · ${phone}. Unit ${data.propertyCode}. Eligible for 25% Website Commission Discount. 60-Minute Golden Hour Follow-Up Tracker Active.`)}` +
      `&add=${encodeURIComponent(attendees)}`;
    for (const role of dispatchRoles) {
      const chatId = process.env[role.chatEnv]?.trim();
      if (!chatId) {
        dispatchResults.push({ role: role.role, delivered: false });
        continue;
      }
      try {
        const { sendTelegramMessage } = await import('@/lib/services/telegram-controller');
        await sendTelegramMessage(`${calendarInviteForStaff}${staffCalendarLink}`, chatId);
        dispatchResults.push({ role: role.role, delivered: true });
      } catch (dispatchErr) {
        logger.warn(`[viewing-requests] calendar dispatch to ${role.role} failed (non-fatal):`, dispatchErr);
        dispatchResults.push({ role: role.role, delivered: false });
      }
    }

    // ── 4. Confirmation links with the REAL chosen slot ────────────────────
    const waText = encodeURIComponent(
      `Hello Sierra Estates — confirming my viewing request for unit [${data.propertyCode}] on ${data.preferredDate}${data.preferredTime ? ` (${data.preferredTime})` : ''}. Name: ${data.visitorName}.`
    );
    const waNumber = phone.startsWith('+') ? phone.replace('+', '') : `2${phone.replace(/^0+/, '')}`;
    const calendarLink = staffCalendarLink;

    return NextResponse.json(
      {
        success: true,
        requestId: viewing.id,
        leadId,
        message: 'Viewing request received — our team will confirm shortly.',
        whatsappConfirmUrl: `https://wa.me/201092048333?text=${waText}`,
        calendarLink,
        goldenHourFollowupAt: goldenHourAt,
        calendarDispatch: dispatchResults,
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
    if (status) where.push({ column: 'status', value: status });

    // Canonical table post-migration 014 (legacy viewing_requests rows were
    // copied in; new writes arrive here only).
    const requests = await listRecords('viewings', {
      where,
      orderBy: { column: 'createdAt', ascending: false },
      limit: 200,
    });

    return NextResponse.json({ success: true, count: requests.length, requests }, { status: 200 });
  } catch (error) {
    logger.error('Get viewing requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
