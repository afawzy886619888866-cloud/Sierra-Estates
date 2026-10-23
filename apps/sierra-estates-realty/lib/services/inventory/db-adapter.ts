import { getRecord, upsertRecord, updateRecord } from '@sierra-estates/db';
import type { FirestoreLike } from './InventoryDomainService';

/**
 * Creates a database adapter that bridges InventoryDomainService
 * to Supabase PostgreSQL via @sierra-estates/db record functions.
 *
 * 2026-10-19 P0 fix (baseline audit): this adapter previously swallowed
 * database errors in `get()` and reported them as `{ exists: false }`.
 * A Supabase outage was therefore indistinguishable from "record not
 * found", which silently DISABLED deduplication — `upsertFromSource`
 * happily created duplicate listings while the database was down, and
 * `transition()` reported a misleading "Listing not found" error.
 *
 * `@sierra-estates/db` (packages/db/lib/records.ts) deliberately THROWS
 * on every supabase-js error so callers' try/catch still fires. This
 * adapter now propagates those errors instead of masking them: a failed
 * read fails loudly, a genuine miss still returns `exists: false`.
 *
 * Field mapping (Firestore-shaped doc → real Postgres columns):
 *   fingerprint   → dupe_check_hash  (the real dedupe column; the unique
 *                                    partial index uq_listings_dupe_check_hash
 *                                    from migration 013 then protects this
 *                                    path at the DATABASE level, not just in app code)
 *   location      → location_area    (real column name; `location` does not exist)
 *   area          → area_sqm         (real column name; `area` does not exist)
 *   currency      → price_currency   (real column name; `currency` does not exist)
 *   source        → sync_source      (real column name; `source` does not exist)
 *   statusHistory → status_history   (jsonb, migration 032)
 *   sources       → sources          (jsonb, migration 032)
 *   ownershipDocRef → ownership_doc_ref (TEXT, migration 032)
 *   reservationRef → reservation_ref (TEXT, migration 032)
 *   coordinates   → latitude + longitude  (decomposed; no `coordinates` column)
 * Reads map the columns back so the domain service sees its own shape.
 *
 * 2026-10-19 (G2 wiring pass): the P0 fix only mapped `fingerprint`; the
 * domain document also carries location/area/currency/source/coordinates,
 * none of which are real columns on public.listings. Without this mapping
 * every production write from InventoryDomainService would fail PostgREST
 * schema validation (PGRST204). `sourceRef` and `tags` have no dedicated
 * column — sourceRef is preserved inside the `sources` jsonb provenance
 * object (migration 032 design) and is intentionally dropped from the row.
 */

/** Firestore-shaped field → real Postgres column. */
const FIELD_TO_COLUMN: Record<string, string> = {
  fingerprint: 'dupeCheckHash', // records.ts snake-cases to dupe_check_hash
  location: 'locationArea',     // → location_area
  area: 'areaSqm',              // → area_sqm
  currency: 'priceCurrency',    // → price_currency
  source: 'syncSource',         // → sync_source
  statusHistory: 'statusHistory',
  ownershipDocRef: 'ownershipDocRef',
  reservationRef: 'reservationRef',
};

/** Doc fields with no backing column — never sent to PostgREST. */
const DROPPED_DOC_FIELDS = new Set(['sourceRef', 'tags']);

function toRow(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (DROPPED_DOC_FIELDS.has(k)) continue;
    if (k === 'coordinates') {
      // Decompose {lat,lng} onto the real latitude/longitude columns.
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const c = v as { lat?: unknown; lng?: unknown };
        if (typeof c.lat === 'number') out.latitude = c.lat;
        if (typeof c.lng === 'number') out.longitude = c.lng;
      }
      continue;
    }
    out[FIELD_TO_COLUMN[k] ?? k] = v;
  }
  return out;
}

/** Postgres-shaped row → Firestore-shaped doc (camelCase is already applied by records.ts). */
function toDoc(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const row = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...row };
  if ('dupeCheckHash' in row) {
    out.fingerprint = row.dupeCheckHash;
    delete out.dupeCheckHash;
  }
  if ('locationArea' in row) {
    out.location = row.locationArea;
    delete out.locationArea;
  }
  if ('areaSqm' in row) {
    out.area = row.areaSqm;
    delete out.areaSqm;
  }
  if ('priceCurrency' in row) {
    out.currency = row.priceCurrency;
    delete out.priceCurrency;
  }
  if ('syncSource' in row) {
    out.source = row.syncSource;
    delete out.syncSource;
  }
  if (typeof row.latitude === 'number' && typeof row.longitude === 'number') {
    out.coordinates = { lat: row.latitude, lng: row.longitude };
  }
  return out;
}

export function createSupabaseDbAdapter(): FirestoreLike {
  return {
    collection(tableName: string) {
      return {
        doc(id?: string) {
          const docId = id ?? '';
          return {
            id: docId,
            async get() {
              // NO catch: a database error MUST propagate. Returning
              // exists:false here would corrupt dedup during outages.
              const data = await getRecord<Record<string, unknown>>(tableName, docId);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => (data ? toDoc(data) : null),
              };
            },
            async set(data: any, _opts?: { merge?: boolean }) {
              // Upsert-on-id preserves the Firestore set({merge:true}) shape
              // used by upsertFromSource; records.ts throws on failure.
              const written = await upsertRecord(tableName, {
                ...toRow(data),
                id: docId,
              });
              return toDoc(written);
            },
            async update(data: any) {
              const written = await updateRecord(tableName, docId, toRow(data));
              return toDoc(written);
            },
          };
        },
        where(field: string, op: string, value: unknown) {
          return { field, op, value };
        },
      };
    },
  };
}
