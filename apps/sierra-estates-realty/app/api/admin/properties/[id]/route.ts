/**
 * PATCH /api/admin/properties/[id] — the write side of the Inventory &
 * Freshness Control console (/admin/properties).
 *
 * Two payload shapes:
 *
 *   1. Lifecycle actions (the console's status toggles). These ride the
 *      PRODUCTION state machine — the DB-level listing_status_guard trigger
 *      (migrations 011/035) audits every transition into status_history and
 *      rejects illegal ones, so 'sold' is reached through the legal
 *      reserved → sold path, never by force:
 *
 *        { action: 'verify' }      → verified, verified_at, publish_status
 *                                    'PUBLISHABLE', publish_to_client
 *        { action: 'mark-stale' }  → stale, publish_status 'STALE'
 *        { action: 'restore' }     → stale cleared, freshness recomputed
 *        { action: 'mark-sold' }   → legal walk to status 'sold'
 *
 *   2. Field patches: se_code (uniqueness enforced by
 *      idx_listings_se_code_unique — a duplicate returns 409, never a 500),
 *      price, title, agent, tag, description and a manual freshness_score
 *      override (0..100).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecord, updateRecord, insertRecord } from '@sierra-estates/db';
import { verifyAdminRequest, unauthorizedResponse } from '@/lib/server/auth-guard';
import { bucketFor } from '@/lib/server/inventory-buckets';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    action: z.enum(['verify', 'mark-stale', 'restore', 'mark-sold']).optional(),
    seCode: z.string().trim().min(1).max(64).optional(),
    price: z.number().min(0).max(10_000_000_000).optional(),
    title: z.string().trim().min(1).max(300).optional(),
    agent: z.string().trim().max(160).optional(),
    tag: z.string().trim().max(80).optional(),
    description: z.string().trim().max(4000).optional(),
    freshnessScore: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Empty patch — provide an action or at least one field.',
  });

/** Unique-violation detector (Postgres 23505) for the se_code index. */
function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('23505') ||
    message.includes('duplicate key value violates unique constraint') ||
    message.includes('idx_listings_se_code_unique')
  );
}

async function recordActivity(
  type: string,
  description: string,
  relatedId: string,
): Promise<void> {
  try {
    await insertRecord('activities', {
      type,
      actorId: 'system',
      actorName: 'Command Center',
      description,
      relatedId,
      relatedType: 'listing',
      text: description,
      color: 'var(--gold-luxury)',
    });
  } catch {
    // The activity feed is best-effort observability, never a write blocker.
  }
}

/**
 * GET /api/admin/properties/[id] — full detail row for the Property modal the
 * pipeline board opens from a deal card (linked Lead ⇄ Property inspection).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  try {
    const { id } = await params;
    const row = await getRecord<Record<string, unknown>>('listings', id);
    if (!row) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    return NextResponse.json({
      row: {
        ...row,
        bucket: bucketFor(row),
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
      },
    });
  } catch (error) {
    logger.error('[ADMIN_PROPERTY_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to load listing.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return unauthorizedResponse();

  const { id } = await params;

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid patch payload.' },
        { status: 400 },
      );
    }
    const patch = parsed.data;

    const existing = await getRecord<Record<string, unknown>>('listings', id);
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    // ── Lifecycle actions ──────────────────────────────────────────────────
    if (patch.action) {
      switch (patch.action) {
        case 'verify': {
          await updateRecord('listings', id, {
            verified: true,
            verifiedAt: new Date().toISOString(),
            publishStatus: 'PUBLISHABLE',
            publishToClient: true,
            stale: false,
          });
          await recordActivity(
            'inventory_verified',
            `Listing ${existing.seCode ?? existing.code ?? id} verified & published to the client feed`,
            id,
          );
          break;
        }
        case 'mark-stale': {
          await updateRecord('listings', id, {
            stale: true,
            publishStatus: 'STALE',
          });
          await recordActivity(
            'inventory_stale',
            `Listing ${existing.seCode ?? existing.code ?? id} flagged stale and pulled from the public gate`,
            id,
          );
          break;
        }
        case 'restore': {
          const status = String(existing.status ?? '');
          const publiclyLive = status === 'active' || status === 'available';
          // Restoring touches the row, so updated_at advances to NOW — the
          // freshness score legitimately restarts at 100 (compute_listing_
          // freshness(now) === 100), no fabrication involved.
          await updateRecord('listings', id, {
            stale: false,
            publishStatus:
              publiclyLive && String(existing.publishStatus ?? '') === 'STALE'
                ? 'PUBLISHABLE'
                : existing.publishStatus,
            freshnessScore: 100,
          });
          await recordActivity(
            'inventory_restored',
            `Listing ${existing.seCode ?? existing.code ?? id} restored for refresh`,
            id,
          );
          break;
        }
        case 'mark-sold': {
          const status = String(existing.status ?? '');
          if (status === 'sold') break; // already terminal — idempotent
          // Legal walk (011/035 guard): live → reserved → sold. Each hop is
          // audited into status_history by the trigger.
          if (status !== 'reserved') {
            await updateRecord('listings', id, { status: 'reserved' });
          }
          await updateRecord('listings', id, {
            status: 'sold',
            publishToClient: false,
          });
          await recordActivity(
            'inventory_sold',
            `Listing ${existing.seCode ?? existing.code ?? id} marked sold`,
            id,
          );
          break;
        }
      }
      const refreshed = await getRecord<Record<string, unknown>>('listings', id);
      return NextResponse.json({ success: true, row: refreshed });
    }

    // ── Field patches ──────────────────────────────────────────────────────
    const updates: Record<string, unknown> = {};
    if (patch.seCode !== undefined) updates.seCode = patch.seCode;
    if (patch.price !== undefined) updates.price = patch.price;
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.agent !== undefined) updates.agent = patch.agent;
    if (patch.tag !== undefined) updates.tag = patch.tag;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.freshnessScore !== undefined) updates.freshnessScore = patch.freshnessScore;

    // An edit touches the row, so the freshness clock restarts with it —
    // unless the caller pinned a manual score in the same patch.
    if (patch.freshnessScore === undefined) {
      updates.freshnessScore = 100;
    }

    try {
      const row = await updateRecord<Record<string, unknown>>('listings', id, updates);
      return NextResponse.json({ success: true, row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          {
            error: `se_code "${patch.seCode}" is already assigned to another listing.`,
            code: 'SE_CODE_DUPLICATE',
          },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error('[ADMIN_PROPERTIES_PATCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update listing.' },
      { status: 500 },
    );
  }
}
