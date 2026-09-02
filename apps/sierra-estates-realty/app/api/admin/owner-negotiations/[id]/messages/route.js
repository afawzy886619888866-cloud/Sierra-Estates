import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { sendOwnerNegotiationMessage } from '@/lib/server/whatsapp-queue';
import { logger } from '@/lib/logger';

const messageSchema = z.object({
  body: z.string().min(1).max(2000),
  price: z.number().min(0).optional(),
});



/**
 * POST /api/admin/owner-negotiations/[id]/messages — send a follow-up
 * message on an already-open negotiation thread. Enqueues the real WhatsApp
 * send (subject to operating-hours + per-number quota) and appends it to
 * the thread's history.
 */
export async function POST(req, { params }) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) return unauthorizedResponse();

  try {
    const { id } = await params;
    const parsed = messageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { jobId } = await sendOwnerNegotiationMessage(id, parsed.data );
    return NextResponse.json({ success: true, jobId });
  } catch (err) {
    logger.error('Error sending owner negotiation message:', err);
    const notFound = err instanceof Error && err.message.includes('not found');
    return NextResponse.json(
      { error: 'Failed to send message', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: notFound ? 404 : 500 },
    );
  }
}
