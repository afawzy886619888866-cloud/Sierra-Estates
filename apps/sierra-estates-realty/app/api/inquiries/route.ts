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
        metadata: { inquiryId: created.id, mirroredFrom: 'public.inquiries' },
        automation: { followupReminderEnabled: true, interactionFrequency: 'medium' },
        createdAt: now,
        updatedAt: now,
      });
    } catch (mirrorErr) {
      // Inquiry persisted — the mirror is repairable by the backfill script.
      console.error('[inquiries] CRM leads mirror failed:', mirrorErr);
    }

    return NextResponse.json({ id: created.id, status: 'received' });
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
