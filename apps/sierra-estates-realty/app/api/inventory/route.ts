/**
 * GET /api/inventory → InventoryResponse
 *
 * Serves the public inventory map. Data sources, in priority order:
 *   1. "domain"   — the canonical `units` Firestore collection, read via
 *                   InventoryQueryService (populated by master-sheet-sync.ts,
 *                   the single source of truth also used by the AI Closer
 *                   Agent, semantic search, and admin — see
 *                   lib/services/inventory-query.ts). Owner contact info is
 *                   stripped before it ever reaches this response.
 *   2. "live"     — the owner sheet read live (before the first sync, or if
 *                   Firestore is unavailable). Owner PII stripped at parse time.
 *   3. "snapshot" — the committed lib/inventory/snapshot.json, so the map
 *                   always renders even fully offline.
 *
 * Sheet id/gid are overridable with INVENTORY_SHEET_ID / INVENTORY_SHEET_GID.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { InventoryQueryService } from '@/lib/services/inventory-query';
import { fetchSheetUnits } from '@/lib/inventory/fetch-sheet';
import { queryUnitToMapUnit } from '@/lib/inventory/domain-map';
import snapshot from '@/lib/inventory/snapshot.json';
import type { InventoryResponse, InventoryUnit } from '@/lib/inventory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Committed snapshot fallback. */
function snapshotResponse(): InventoryResponse {
  const snapshotData = snapshot as unknown;
  const isArray = Array.isArray(snapshotData);
  const units: InventoryUnit[] = isArray
    ? (snapshotData as InventoryUnit[])
    : ((snapshotData as { units?: InventoryUnit[] })?.units || []);
  const generatedAt = !isArray && typeof (snapshotData as { generatedAt?: string })?.generatedAt === 'string'
    ? (snapshotData as { generatedAt: string }).generatedAt
    : new Date().toISOString();

  return {
    generatedAt,
    source: 'snapshot',
    count: units.length,
    units,
  };
}

/** Canonical `units` collection (the unified pipeline). */
async function fetchDomain(): Promise<InventoryResponse | null> {
  try {
    const rows = await InventoryQueryService.query({ status: 'available', limit: 300 });
    if (!rows.length) return null;
    const units = rows.map(queryUnitToMapUnit);
    return { generatedAt: new Date().toISOString(), source: 'domain', count: units.length, units };
  } catch (err) {
    logger.warn(`[inventory] domain read failed, falling back to sheet: ${(err as Error).message}`);
    return null;
  }
}

/** Owner sheet read live. */
async function fetchLive(): Promise<InventoryResponse | null> {
  const units = await fetchSheetUnits({ revalidate: 300 });
  if (!units) return null;
  return { generatedAt: new Date().toISOString(), source: 'live', count: units.length, units };
}

export async function GET() {
  const payload = (await fetchDomain()) ?? (await fetchLive()) ?? snapshotResponse();
  return NextResponse.json(payload, {
    headers: {
      // Let the CDN serve a cached copy while revalidating in the background.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
