import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const applicationSchema = z.object({
  role: z.enum(['sales', 'admin']),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(200),
  experience: z.string().trim().max(80).default(''),
  realEstateKnowledge: z.string().trim().max(120).default(''),
  availability: z.string().trim().max(80).default(''),
  notes: z.string().trim().min(10).max(4000),
});

type Application = z.infer<typeof applicationSchema>;

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

function roleLabel(role: Application['role']) {
  return role === 'sales' ? 'Senior Sales Consultant' : 'Operations Admin Officer';
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
      { success: false, error: 'Please complete all required application fields correctly.' },
      { status: 400 }
    );
  }

  const application = parsed.data;
  const applicationRecord = {
    ...application,
    source: 'careers_page',
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  };

  let applicationId = `local-${crypto.randomUUID()}`;
  let persisted = false;

  try {
    const db = await getAdminDb();
    if (db) {
      const reference = await db.collection('career_applications').add({
        ...applicationRecord,
        createdAt: new Date(),
      });
      applicationId = reference.id;
      persisted = true;
    }
  } catch (error) {
    console.error('[careers/apply] Firestore write failed:', error);
  }

  if (!persisted && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'The application service is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  let notificationSent = false;
  const resendApiKey = process.env.RESEND_API_KEY;
  const hrEmail = process.env.HR_NOTIFICATION_EMAIL || process.env.HR_EMAIL;
  const fromEmail = process.env.CAREERS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && hrEmail && fromEmail) {
    const safe = Object.fromEntries(
      Object.entries({
        role: roleLabel(application.role),
        fullName: application.fullName,
        phone: application.phone,
        email: application.email,
        experience: application.experience,
        realEstateKnowledge: application.realEstateKnowledge,
        availability: application.availability,
        notes: application.notes,
      }).map(([key, value]) => [key, escapeHtml(String(value))])
    );

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Sierra Estates Careers <${fromEmail}>`,
          to: [hrEmail],
          reply_to: application.email,
          subject: `New candidate application — ${roleLabel(application.role)} — ${application.fullName}`,
          html: `
            <h2>New Sierra Estates candidate application</h2>
            <p><strong>Role:</strong> ${safe.role}</p>
            <p><strong>Name:</strong> ${safe.fullName}</p>
            <p><strong>Phone:</strong> ${safe.phone}</p>
            <p><strong>Email:</strong> ${safe.email}</p>
            <p><strong>Experience:</strong> ${safe.experience}</p>
            <p><strong>Market & CRM knowledge:</strong> ${safe.realEstateKnowledge}</p>
            <p><strong>Availability:</strong> ${safe.availability}</p>
            <p><strong>Notes:</strong> ${safe.notes}</p>
            <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
          `,
        }),
        signal: AbortSignal.timeout(8_000),
      });

      notificationSent = emailResponse.ok;
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
    persisted,
    notificationSent,
    message: 'Application received successfully. Our HR team will review it shortly.',
  });
}
