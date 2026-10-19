/**
 * Sierra Estates — Inventory Ingest Bridge (server-side, G2 wiring 2026-10-19).
 *
 * The connective tissue between the ingest API routes and
 * InventoryDomainService. Wires every ingestion path listed in
 * lib/services/inventory/README.md through the ONE canonical entry point
 * (`upsertFromSource`) so each path is fingerprinted, lifecycle-tracked and
 * DB-code-minted — while keeping each route's own rich columns (Property
 * Finder images/agent/raw_data, admin SPA fields) via `extraColumns`.
 *
 * Hard rules enforced here:
 *  - §21 no-fabrication: a parsed listing missing ANY mandatory field
 *    (compound / propertyType / offerType / bedrooms / area / price) never
 *    enters canonical inventory. NULL stays NULL; the staging row the route
 *    already writes remains the record of truth until a human completes it.
 *  - Cross-path duplicate merge: the DB-level unique partial index
 *    `uq_listings_dupe_check_hash` (migration 013 + 032 backfill) means a
 *    row written by ANOTHER path (Property Finder id / admin insert) may
 *    already own the fingerprint under a different primary key. The domain
 *    service reads by fingerprint-id only, so the INSERT would violate the
 *    index. The bridge catches exactly that violation, finds the winner row
 *    by hash and merges into it (sources provenance + payload + extras) —
 *    one row per physical unit, whichever path saw it first.
 *  - Every other error propagates. Never mask a DB outage (P0 regression).
 */
import { listRecords } from '@sierra-estates/db';
import { InventoryDomainService } from './InventoryDomainService';
import { createSupabaseDbAdapter } from './db-adapter';
import { fingerprint } from './dedupe';
import type { IngestionSource, UpsertPayload, UpsertResult } from './types';

/** Connector contract types — ingest routes import these from the bridge. */
export type { IngestionSource, UpsertPayload, UpsertResult } from './types';

/** Process-wide singleton: one adapter + one domain service instance. */
let serviceSingleton: InventoryDomainService | null = null;

export function getInventoryService(): InventoryDomainService {
  if (!serviceSingleton) {
    serviceSingleton = new InventoryDomainService(createSupabaseDbAdapter());
  }
  return serviceSingleton;
}

/** Test-only: reset the singleton between jest modules. */
export function __resetInventoryServiceSingleton(): void {
  serviceSingleton = null;
}

/** PostgREST surfaces unique violations as a message from Postgres. */
function isDedupeUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    /duplicate key value violates unique constraint/.test(err.message) &&
    /uq_listings_dupe_check_hash/.test(err.message)
  );
}

interface WinnerRow {
  id: string;
  sources?: Record<string, { lastSeenAt: string; ref: string | null }>;
  [key: string]: unknown;
}

export interface CanonicalUpsertOptions {
  /**
   * Path-specific rich columns (already real-column camelCase names, e.g.
   * `images`, `agentName`, `rawData`). Applied on both create and merge.
   * `id` / `fingerprint` / `dupeCheckHash` are stripped — the bridge owns
   * identity and dedup keys.
   */
  extraColumns?: Record<string, unknown>;
}

/**
 * Canonical inventory upsert for every ingest route.
 *
 * Fast path: the domain service's own merge/create (fingerprint-id row).
 * Slow path: cross-path unique violation → merge into the existing winner
 * row (different id, same dupe_check_hash) through the same field-mapped
 * adapter so lifecycle/audit columns stay consistent.
 */
export async function upsertCanonicalListing(
  source: IngestionSource,
  payload: UpsertPayload,
  options: CanonicalUpsertOptions = {},
): Promise<UpsertResult> {
  const fp = fingerprint({
    compound: payload.compound,
    propertyType: payload.propertyType,
    offerType: payload.offerType,
    bedrooms: payload.bedrooms,
    area: payload.area,
    price: payload.price,
  });

  const service = getInventoryService();
  try {
    return await service.upsertFromSource(source, payload, 'system', options.extraColumns);
  } catch (err) {
    if (!isDedupeUniqueViolation(err)) throw err;

    // Cross-path duplicate: another ingest path owns this fingerprint under a
    // different primary key. Merge into the winner row — honestly, loudly.
    const winners = await listRecords<WinnerRow>('listings', {
      where: [{ column: 'dupeCheckHash', value: fp }],
      limit: 1,
    });
    const winner = winners[0];
    if (!winner) {
      // Unique violation with no findable row is a true anomaly — rethrow.
      throw err;
    }

    const nowIso = new Date().toISOString();
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(options.extraColumns ?? {})) {
      if (k === 'id' || k === 'fingerprint' || k === 'dupeCheckHash') continue;
      if (v === undefined) continue;
      extras[k] = v;
    }

    const { sourceRef, ...payloadFields } = payload;
    void sourceRef; // preserved inside the sources jsonb below, not a column
    const mergedDoc = {
      ...payloadFields,
      ...extras,
      pricePerSqm: payload.area > 0 ? Math.round(payload.price / payload.area) : 0,
      sources: {
        ...(winner.sources ?? {}),
        [source]: { lastSeenAt: nowIso, ref: payload.sourceRef ?? null },
      },
      updatedAt: nowIso,
    };
    await createSupabaseDbAdapter()
      .collection('listings')
      .doc(String(winner.id))
      .update(mergedDoc);
    return { id: String(winner.id), action: 'duplicate_merged', fingerprint: fp };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload builders — one per ingest path, all §21-gated.
// ─────────────────────────────────────────────────────────────────────────────

/** Repo convention (WhatsAppParserService line ~220): rent keywords win. */
const RENT_RE = /rent|إيجار|ايجار|للإيجار|للايجار/i;
const SALE_RE = /sale|للبيع|بيع/i;

/**
 * §21: offer type must be STATED in the message, never defaulted.
 * Returns null when neither sale nor rent is detectable.
 */
export function deriveOfferType(rawMessage: string): 'sale' | 'rent' | null {
  if (RENT_RE.test(rawMessage)) return 'rent';
  if (SALE_RE.test(rawMessage)) return 'sale';
  return null;
}

/** Fields the WhatsApp / Sheets parsers actually extract. */
export interface ParsedListingLike {
  isListing?: boolean;
  compound?: string | null;
  type?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  area?: number | null;
  price?: number | null;
  currency?: string | null;
  finishing?: string | null;
  finishingType?: string | null;
  description?: string | null;
}

/**
 * Parsed broker message → canonical UpsertPayload.
 * Returns null when §21 mandatory fields are missing or offer type is not
 * stated — the caller must then SKIP the canonical upsert (the staging row
 * it already writes stays the honest record).
 */
export function buildCanonicalPayloadFromParsed(
  parsed: ParsedListingLike,
  rawMessage: string,
  sourceRef?: string,
): UpsertPayload | null {
  if (parsed?.isListing !== true) return null;

  const compound = typeof parsed.compound === 'string' ? parsed.compound.trim() : '';
  const propertyTypeRaw = parsed.propertyType ?? parsed.type;
  const propertyType = typeof propertyTypeRaw === 'string' ? propertyTypeRaw.trim() : '';
  const bedrooms = typeof parsed.bedrooms === 'number' && Number.isFinite(parsed.bedrooms) ? parsed.bedrooms : null;
  const area = typeof parsed.area === 'number' && Number.isFinite(parsed.area) && parsed.area > 0 ? parsed.area : null;
  const price = typeof parsed.price === 'number' && Number.isFinite(parsed.price) && parsed.price > 0 ? parsed.price : null;

  // §21 no-fabrication: ANY missing mandatory field disqualifies the message
  // from canonical inventory. The staging row keeps the raw evidence.
  if (!compound || !propertyType || bedrooms === null || area === null || price === null) return null;

  const offerType = deriveOfferType(rawMessage);
  if (!offerType) return null;

  const finishingType = parsed.finishingType ?? parsed.finishing ?? undefined;
  const currency =
    parsed.currency === 'EGP' || parsed.currency === 'USD'
      ? (parsed.currency as 'EGP' | 'USD')
      : undefined;

  return {
    title: `${compound} · ${propertyType}`,
    compound,
    propertyType,
    offerType,
    bedrooms,
    area,
    price,
    currency,
    finishingType: finishingType || undefined,
    description: parsed.description ?? rawMessage,
    sourceRef,
  };
}

/**
 * Property Finder mapped row → canonical UpsertPayload.
 * Mirrors mapProperty's §21 stance: only builds when area / bedrooms / price
 * were genuinely present in the PF payload (price 0 is the NOT NULL column
 * coercion, NOT a real price — treated as unknown).
 */
export function buildCanonicalPayloadFromPfRow(row: {
  compound: string;
  propertyType: string;
  offerType: 'sale' | 'rent';
  bedrooms: number | null;
  areaSqm?: number | null;
  price: number;
  title: string;
  city?: string | null;
}): UpsertPayload | null {
  const area = typeof row.areaSqm === 'number' && row.areaSqm > 0 ? row.areaSqm : null;
  const bedrooms = typeof row.bedrooms === 'number' && Number.isFinite(row.bedrooms) ? row.bedrooms : null;
  const price = row.price > 0 ? row.price : null;
  if (area === null || bedrooms === null || price === null) return null;

  return {
    title: row.title,
    compound: row.compound,
    propertyType: row.propertyType,
    offerType: row.offerType,
    bedrooms,
    area,
    price,
    city: row.city ?? undefined,
  };
}
