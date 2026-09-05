import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AvailabilityVerificationService } from '@/lib/services/AvailabilityVerificationService';
import { applyRateLimit, publicEndpointLimiter } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const batchAvailabilitySchema = z.object({
  clientName: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100),
  clientPhone: z.string().trim().min(7, 'Please provide a valid phone number').max(40),
  unitIds: z
    .array(z.string().min(1))
    .min(1, 'Please select at least 1 unit into your Selection Net')
    .max(40, 'Maximum 40 units allowed per verification request'),
  notes: z.string().trim().max(1000).optional().default(''),
});

export async function POST(request: Request) {
  // Rate limiting to protect WhatsApp quota
  const rateLimitResponse = await applyRateLimit(request, publicEndpointLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > 50_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = batchAvailabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || 'Invalid input data.',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const session = await AvailabilityVerificationService.createBatchRequest({
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      unitIds: parsed.data.unitIds,
      notes: parsed.data.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Verification request initiated for ${session.units.length} units with 1-hour SLA.`,
      sessionId: session.id,
      markedCount: session.units.length,
      expiresAt: new Date(session.expiresAt).toISOString(),
      slaMinutes: 60,
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error('[batch-availability] Error:', message);
    return NextResponse.json({ error: message || 'Failed to initiate verification request.' }, { status: 500 });
  }
}

export async function GET() {
  const sessions = await AvailabilityVerificationService.getSessions();
  const summary = Object.values(sessions).map((s) => ({
    id: s.id,
    clientName: s.clientName,
    clientPhone: s.clientPhone,
    unitsCount: s.units.length,
    status: s.status,
    createdAt: new Date(s.createdAt).toISOString(),
    expiresAt: new Date(s.expiresAt).toISOString(),
    availableUnits: s.units.filter((u) => u.status === 'available').length,
    unavailableUnits: s.units.filter((u) => u.status === 'unavailable').length,
    pendingUnits: s.units.filter((u) => u.status === 'inquiry_sent').length,
  }));

  return NextResponse.json({
    activeSessionsCount: summary.length,
    sessions: summary,
  });
}
