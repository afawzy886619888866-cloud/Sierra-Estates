import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPortalRequest } from '@/lib/server/auth-guard';
import { listRecords, type RecordData } from '@sierra-estates/db';
import { enqueueWhatsAppJob } from '@/lib/server/whatsapp-queue';
import { listingInScope } from '@/lib/server/partner-scope';
import { adminPhotoRequestMessage } from '@/lib/server/photo-messages';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/listings/photos/request — ask the unit's owner/broker for
 * photos over WhatsApp (through the outbound queue, drained by the cron
 * dispatcher — same as the Easy Listing broker flow).
 *
 * The bot accepts conversations (text) but never images, so when a unit is
 * missing photos the TEAM triggers the request from here and the incoming
 * photos get attached through /api/admin/listings/photos once received.
 */

const bodySchema = z.object({
  code: z.string().min(1).max(60),
});

/** Resolve a listing row from the SPA-facing code (falls through the id). */
async function resolveListing(code: string): Promise<RecordData | null> {
  for (const column of ['code', 'refId', 'referenceCode', 'id']) {
    const rows = await listRecords('listings', {
      where: [{ column, value: code }],
      limit: 1,
    }).catch(() => [] as RecordData[]);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await verifyPortalRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const listing = await resolveListing(parsed.data.code);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    if (auth.access === 'partner' && !listingInScope(listing, auth.scope)) {
      return NextResponse.json(
        { error: 'Forbidden — unit outside partner portfolio' },
        { status: 403 }
      );
    }

    // Prefer the owner, fall back to the broker — whoever is on file.
    const phone =
      (typeof listing.ownerPhone === 'string' && listing.ownerPhone) ||
      (typeof listing.brokerPhone === 'string' && listing.brokerPhone) ||
      (typeof listing.owner_phone === 'string' && listing.owner_phone) ||
      (typeof listing.broker_phone === 'string' && listing.broker_phone) ||
      null;
    const name =
      (typeof listing.ownerName === 'string' && listing.ownerName) ||
      (typeof listing.brokerName === 'string' && listing.brokerName) ||
      (typeof listing.owner_name === 'string' && listing.owner_name) ||
      (typeof listing.broker_name === 'string' && listing.broker_name) ||
      null;

    if (!phone) {
      return NextResponse.json(
        { error: 'No owner/broker phone on file for this unit — update the listing contact first.' },
        { status: 422 }
      );
    }

    const codeLabel =
      (typeof listing.code === 'string' && listing.code) ||
      (typeof listing.referenceCode === 'string' && listing.referenceCode) ||
      parsed.data.code;

    await enqueueWhatsAppJob({
      purpose: 'general-outreach',
      toPhone: phone,
      toName: name || 'العميل',
      body: adminPhotoRequestMessage(name || '', codeLabel),
      metadata: {
        kind: 'admin-photo-request',
        internal_code: codeLabel,
        requested_by: auth.email ?? auth.uid ?? 'admin',
      },
    });

    return NextResponse.json({ success: true, queued: true, to: phone });
  } catch (err) {
    logger.error('Error requesting listing photos:', err);
    return NextResponse.json(
      { error: 'Failed to queue photo request', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
