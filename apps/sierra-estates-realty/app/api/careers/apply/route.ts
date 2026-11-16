import { NextResponse } from 'next/server';
import { z } from 'zod';
import { insertRecord, updateRecord } from '@sierra-estates/db';
import { normalizeEgyptianPhone } from '@/lib/utils/phone';
import {
  SHEET_TABS,
  SHEET_HEADERS,
  appendToManagedTab,
} from '@/lib/services/GoogleSheetsV4Service';
import {
  sendTelegramNotification,
  formatCareerApplicantMessage,
} from '@/lib/services/TelegramNotifier';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/careers/apply — public careers intake.
 *
 * Dual write: Supabase public.career_applications (system of record) +
 * Google Sheets `Careers_Applicants` tab with candidate-evaluation scorecard
 * columns (Sheets API v4 — tab + header auto-created when missing), plus an
 * instant Telegram HR alert. The /careers page uses the Server Action
 * (lib/actions/career-application.ts) which runs the same pipeline; this
 * route serves the legacy no-JS/programmatic path with the extended schema.
 */

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .refine((v) => normalizeEgyptianPhone(v) !== null, {
      message: 'Enter a valid Egyptian mobile (e.g. 01012345678).',
    }),
  email: z.string().trim().email().max(200),
  role: z.string().trim().min(2).max(160),
  workMode: z.enum(['Online', 'In-Office']).default('In-Office'),
  experienceYears: z.coerce.number().min(0).max(50).optional(),
  brokerage: z.string().trim().max(160).optional(),
  cvUrl: z.union([z.string().trim().url().max(500), z.literal('')]).optional(),
  pitch: z.string().trim().max(2000).optional(),
  // Legacy ApplicantForm fields (kept so the old form keeps working).
  position: z.string().trim().max(160).optional(),
  experience: z.string().trim().max(80).optional(),
  hasVehicle: z.boolean().optional(),
  biggestAchievements: z.string().trim().max(2000).optional(),
  expectedSalary: z.string().trim().max(80).optional(),
  realEstateKnowledge: z.string().trim().max(120).optional(),
  availability: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(4000).optional(),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export async function POST(request: Request) {
  if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > 32_000) {
    return NextResponse.json({ success: false, error: 'Request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request.' }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Please complete all required application fields correctly.' },
      { status: 400 }
    );
  }

  const application = parsed.data;
  const phoneNormalized = normalizeEgyptianPhone(application.phone)!;
  const position = application.role || application.position || 'Real Estate Consultant';

  // 1. Supabase — system of record (legacy + Module-3 columns).
  let applicationId = '';
  try {
    const created = await insertRecord<{ id: string }>('career_applications', {
      name: application.fullName,
      phone: phoneNormalized,
      email: application.email,
      position,
      roleApplied: application.role || null,
      workMode: application.workMode,
      experienceYears: application.experienceYears ?? null,
      experience:
        application.experience ??
        (application.experienceYears != null ? `${application.experienceYears} yrs New Cairo real estate` : null),
      brokerage: application.brokerage || null,
      hasVehicle: application.hasVehicle ?? false,
      biggestAchievements: application.biggestAchievements ?? '',
      expectedSalary: application.expectedSalary ?? '',
      realEstateKnowledge: application.realEstateKnowledge ?? null,
      availability: application.availability ?? null,
      cvUrl: application.cvUrl || null,
      stage: 'New',
      status: 'pending_review',
      stageNotes: application.pitch || application.notes || null,
      message: application.pitch || application.notes || null,
      source: 'careers_page',
      createdAt: new Date().toISOString(),
    });
    applicationId = created.id;
  } catch (error) {
    console.error('[careers/apply] Supabase write failed:', error);
    // NO fake-success fallback: an unpersisted application is reported as
    // failed (the old `local-<uuid>` id masked the loss in dev).
    return NextResponse.json(
      { success: false, error: 'The application service is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  // 2. Google Sheets `Careers_Applicants` — scorecard columns.
  const appCode = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${applicationId.slice(0, 8).toUpperCase()}`;
  const sheetSync = await appendToManagedTab({
    tab: SHEET_TABS.careersApplicants,
    headers: SHEET_HEADERS.careersApplicants,
    values: [
      appCode,
      new Date().toISOString(),
      application.fullName,
      phoneNormalized,
      application.email,
      position,
      application.workMode,
      application.experienceYears ?? '',
      application.brokerage ?? '',
      application.cvUrl ?? '',
      '', // Scorecard_Rating — HR fills during screening
      'New',
      (application.pitch || application.notes || '').slice(0, 1000),
    ],
  });
  if (sheetSync.ok) {
    try {
      await updateRecord('career_applications', applicationId, {
        sheetSyncedAt: new Date().toISOString(),
      });
    } catch {
      /* informational stamp only */
    }
  } else {
    logger.warn(`[careers/apply] Careers_Applicants sheet sync failed: ${sheetSync.error}`);
  }

  // 3. Instant Telegram HR alert (Module 3 requirement).
  const telegram = await sendTelegramNotification(
    formatCareerApplicantMessage({
      appId: appCode,
      fullName: application.fullName,
      phone: phoneNormalized,
      email: application.email,
      role: position,
      workMode: application.workMode,
      experienceYears: application.experienceYears ?? null,
      brokerage: application.brokerage || null,
      cvLink: application.cvUrl || null,
      pitch: application.pitch || application.notes || null,
    }),
    { role: 'hr' },
  );
  if (!telegram.ok) {
    logger.warn(`[careers/apply] Telegram HR alert skipped: ${telegram.error}`);
  }

  // 4. Optional Resend email lane (kept from the legacy flow).
  let notificationSent = telegram.ok;
  const resendApiKey = process.env.RESEND_API_KEY;
  const hrEmail = process.env.HR_NOTIFICATION_EMAIL || process.env.HR_EMAIL;
  const fromEmail = process.env.CAREERS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && hrEmail && fromEmail) {
    const safe = Object.fromEntries(
      Object.entries({
        role: position,
        fullName: application.fullName,
        phone: phoneNormalized,
        email: application.email,
        position,
        experience: application.experience ?? (application.experienceYears != null ? `${application.experienceYears} yrs` : '—'),
        workMode: application.workMode,
        brokerage: application.brokerage ?? '—',
        biggestAchievements: application.biggestAchievements ?? '',
        expectedSalary: application.expectedSalary ?? '',
        realEstateKnowledge: application.realEstateKnowledge ?? '',
        availability: application.availability ?? '',
        notes: application.pitch || application.notes || '',
      }).map(([key, value]) => [key, escapeHtml(String(value))])
    );

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Sierra Estates Careers <${fromEmail}>`,
          to: [hrEmail],
          reply_to: application.email,
          subject: `New candidate application — ${position} — ${application.fullName}`,
          html: `
            <h2>New Sierra Estates candidate application</h2>
            <p><strong>App ID:</strong> ${escapeHtml(appCode)}</p>
            <p><strong>Name:</strong> ${safe.fullName}</p>
            <p><strong>Phone:</strong> ${safe.phone}</p>
            <p><strong>Email:</strong> ${safe.email}</p>
            <p><strong>Role:</strong> ${safe.role}</p>
            <p><strong>Work mode:</strong> ${safe.workMode}</p>
            <p><strong>Experience (New Cairo RE):</strong> ${safe.experience}</p>
            <p><strong>Previous brokerage:</strong> ${safe.brokerage}</p>
            <p><strong>CV:</strong> ${escapeHtml(application.cvUrl ?? '—')}</p>
            <p><strong>Pitch:</strong> ${safe.notes}</p>
          `,
        }),
        signal: AbortSignal.timeout(8_000),
      });

      notificationSent = notificationSent || emailResponse.ok;
      if (!emailResponse.ok) {
        console.error('[careers/apply] Resend returned', emailResponse.status);
      }
    } catch (error) {
      console.error('[careers/apply] HR notification failed:', error);
    }
  }

  return NextResponse.json({
    success: true,
    applicationId,
    appCode,
    persisted: true,
    notificationSent,
    sheetSynced: sheetSync.ok,
    whatsappInviteUrl: 'https://chat.whatsapp.com/BTjxkLJFO6m7lgaS4dzh1F',
    message: 'Application received successfully. Our HR team will review it shortly.',
  });
}
