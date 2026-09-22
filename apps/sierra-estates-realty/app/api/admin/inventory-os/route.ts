// ═══════════════════════════════════════════════════════════════════════════
// Inventory OS v2 — Admin API
// GET  /api/admin/inventory-os?status=&compound=&limit=   → v_inventory_os feed
// POST /api/admin/inventory-os  { action: 'transition' | 'price', ... }
//
// This route finally WIRES the lifecycle into production:
//  - The DB trigger (trg_listing_status_guard, migration 011) rejects illegal
//    transitions and auto-writes status_history — the missing enforcement
//    behind lib/services/inventory/lifecycle.ts.
//  - Reservations stamp reserved_until + reservation_ref (escrow tie).
//  - Price changes append to price_history (reason-tracked).
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, getRecord, updateRecord, insertRecord, type RecordData } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Canonical status machine — mirrors lifecycle.ts & migration 011. */
const CANONICAL_STATUSES = [
  'draft', 'pending_verification', 'verified', 'published',
  'reserved', 'rented', 'sold', 'off_market', 'expired', 'archived',
] as const;

const NOTE_REQUIRED = ['reserved', 'sold', 'off_market', 'archived'] as const;
const RESERVATION_WINDOW_DAYS = 14;

const transitionSchema = z.object({
  action: z.literal('transition'),
  id: z.string().min(1),
  to: z.enum(CANONICAL_STATUSES),
  note: z.string().max(500).optional(),
  actor: z.string().max(120).optional(),
  ownershipDocRef: z.string().max(120).optional(),
});

const priceSchema = z.object({
  action: z.literal('price'),
  id: z.string().min(1),
  priceEgp: z.number().positive(),
  reason: z.enum(['initial', 'price_cut', 'price_increase', 'relist', 'avm_adjustment']).default('relist'),
  note: z.string().max(500).optional(),
  actor: z.string().max(120).optional(),
});

const bodySchema = z.discriminatedUnion('action', [transitionSchema, priceSchema]);

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params = new URL(req.url).searchParams;

    // ── Unit details: ?id=<listing id> → unit + payment plans + price history + timeline ──
    const unitId = params.get('id');
    if (unitId) {
      const unit = await getRecord('listings', unitId);
      if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      const [plans, priceHistory, statusHistory] = await Promise.all([
        listRecords('payment_plans', { where: [{ column: 'unitId', value: unitId }], limit: 50 }).catch(() => [] as RecordData[]),
        listRecords('price_history', { where: [{ column: 'unitId', value: unitId }], orderBy: { column: 'createdAt', ascending: false }, limit: 50 }).catch(() => [] as RecordData[]),
        listRecords('status_history', { where: [{ column: 'unitId', value: unitId }], orderBy: { column: 'createdAt', ascending: false }, limit: 50 }).catch(() => [] as RecordData[]),
      ]);
      return NextResponse.json({ success: true, unit, plans, priceHistory, statusHistory });
    }

    const limit = Math.min(parseInt(params.get('limit') || '500', 10), 2000);
    const status = params.get('status');
    const compound = params.get('compound');

    const filters: Record<string, unknown> = { limit };
    if (status) filters.status = status;
    if (compound) filters.compound = compound;

    // v_inventory_os joins project/developer + plan/price aggregates.
    // Falls back to the base table if the view is not yet applied.
    let rows: RecordData[];
    try {
      rows = await listRecords('v_inventory_os', filters);
    } catch {
      rows = await listRecords('listings', filters);
    }
    return NextResponse.json({ success: true, units: rows, count: rows.length });
  } catch (err) {
    logger.error('inventory-os GET failed:', err);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const actor = body.actor || auth.email || 'admin';

    const unit = await getRecord('listings', body.id);
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    if (body.action === 'transition') {
      // ── Guarded lifecycle transition ──
      if (unit.status === body.to) {
        return NextResponse.json({ error: `Unit is already ${body.to}` }, { status: 422 });
      }
      if (NOTE_REQUIRED.includes(body.to as (typeof NOTE_REQUIRED)[number]) && !body.note?.trim()) {
        return NextResponse.json(
          { error: `Transition to "${body.to}" requires an audit note (e.g. escrow reference for reservations)` },
          { status: 422 }
        );
      }

      const patch: RecordData = { status: body.to, updatedAt: new Date().toISOString() };

      if (body.to === 'verified') {
        patch.verified = true;
        patch.verifiedAt = new Date().toISOString();
        patch.verifiedBy = actor;
        if (body.ownershipDocRef) patch.ownershipDocRef = body.ownershipDocRef;
      }
      if (body.to === 'published') {
        patch.publishedAt = (unit as Record<string, unknown>).publishedAt || new Date().toISOString();
        patch.stale = false;
      }
      if (body.to === 'reserved') {
        const until = new Date(Date.now() + RESERVATION_WINDOW_DAYS * 86400000).toISOString();
        patch.reservedUntil = until;
        patch.reservationRef = body.note?.match(/ESC-\d+/)?.[0] ?? `ESC-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (body.to === 'sold' || body.to === 'rented') {
        patch.reservedUntil = null;
        patch.reservationRef = null;
      }

      try {
        // The DB trigger enforces the transition matrix and writes status_history.
        await updateRecord('listings', body.id, patch);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('Illegal listing transition')) {
          return NextResponse.json({ error: `Illegal transition: ${unit.status} → ${body.to}` }, { status: 422 });
        }
        throw e;
      }

      // Belt & suspenders: if the trigger did not fire (view/table drift),
      // record the audit row explicitly.
      try {
        await insertRecord('status_history', {
          unitId: body.id,
          fromStatus: unit.status ?? null,
          toStatus: body.to,
          actor,
          note: body.note ?? null,
          createdAt: new Date().toISOString(),
        });
      } catch {
        /* trigger already wrote it — non-fatal */
      }

      return NextResponse.json({ success: true, id: body.id, status: body.to });
    }

    // ── Price change with tracked history ──
    const currentPrice = Number(unit.price ?? 0);
    if (body.priceEgp === currentPrice) {
      return NextResponse.json({ error: 'Price unchanged' }, { status: 422 });
    }
    const areaSqm = Number(unit.areaSqm ?? 0);
    const pricePerSqm = areaSqm > 0 ? Math.round(body.priceEgp / areaSqm) : 0;

    await updateRecord('listings', body.id, {
      price: body.priceEgp,
      pricePerSqm,
      updatedAt: new Date().toISOString(),
    });
    try {
      await insertRecord('price_history', {
        unitId: body.id,
        priceEgp: body.priceEgp,
        pricePerSqm,
        reason: body.reason,
        note: body.note ?? null,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      logger.warn('price_history insert skipped (migration 011 applied?):', e);
    }

    return NextResponse.json({
      success: true,
      id: body.id,
      from: currentPrice,
      to: body.priceEgp,
      pct: currentPrice > 0 ? Math.round(((body.priceEgp - currentPrice) / currentPrice) * 1000) / 10 : 0,
    });
  } catch (err) {
    logger.error('inventory-os POST failed:', err);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
