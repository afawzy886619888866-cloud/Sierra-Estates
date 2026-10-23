/**
 * Houyez-Style Portal — Supabase content schema + data layer
 * ────────────────────────────────────────────────────────────────────────────
 * All portal content lives in ONE table, `houyez_content`, discriminated by a
 * `collection` column ('slides' | 'compounds' | 'rooms' | 'listings' | 'tours')
 * with the row payload in a JSONB `data` column.
 *
 * `seedHouyezPortal()` writes the static seed data into that table so a fresh
 * project is instantly populated. It is re-runnable: it skips a collection
 * that already has rows, or replaces it with `overwrite: true`.
 *
 * The reader helpers fall back to the static seed whenever the table is empty
 * or unreachable, so the portal never renders blank.
 */

import { getSupabaseAdmin, insertRecords, listRecords } from '@sierra-estates/db';
import {
  HOUEZ_SLIDES, HOUEZ_COMPOUNDS, HOUEZ_ROOMS, HOUEZ_LISTINGS, HOUEZ_TOURS,
  type HouyezSlide, type HouyezCompound, type HouyezRoom, type HouyezListing, type HouyezTour,
} from '@/data/houyez-properties';

/** The single table all portal content lives in. */
const HOUYEZ_TABLE = 'houyez_content';

/**
 * Discriminator values for `houyez_content.collection`.
 */
export const HOUEZ_COLLECTIONS = {
  slides: 'slides',
  compounds: 'compounds',
  rooms: 'rooms',
  listings: 'listings',
  tours: 'tours',
} as const;

// ─── Readers ────────────────────────────────────────────────────────────────
/**
 * Read one portal collection, ordered as authored.
 *
 * Always falls back to the static seed when the table is empty or unreachable,
 * which is what keeps the portal from rendering blank on a fresh project or a
 * database blip.
 */
async function readCollection<T>(collection: string, seed: T[]): Promise<T[]> {
  try {
    const rows = await listRecords<{ id: string; data: Record<string, unknown> }>(HOUYEZ_TABLE, {
      where: [
        { column: 'collection', value: collection },
        { column: 'active', value: true },
      ],
      orderBy: { column: 'order', ascending: true },
    });
    if (rows.length === 0) return seed;
    return rows.map((row) => ({ id: row.id, ...row.data }) as unknown as T);
  } catch (err) {
    console.warn(`[houyez] ${collection} read failed, using seed:`, (err as Error).message);
    return seed;
  }
}

export const getHouyezSlides = () =>
  readCollection<HouyezSlide>(HOUEZ_COLLECTIONS.slides, HOUEZ_SLIDES);
export const getHouyezCompounds = () =>
  readCollection<HouyezCompound>(HOUEZ_COLLECTIONS.compounds, HOUEZ_COMPOUNDS);
export const getHouyezRooms = () =>
  readCollection<HouyezRoom>(HOUEZ_COLLECTIONS.rooms, HOUEZ_ROOMS);
export const getHouyezListings = () =>
  readCollection<HouyezListing>(HOUEZ_COLLECTIONS.listings, HOUEZ_LISTINGS);
export const getHouyezTours = () =>
  readCollection<HouyezTour>(HOUEZ_COLLECTIONS.tours, HOUEZ_TOURS);

/**
 * Seed all five Houyez collections from the static data file.
 *
 * Idempotent: if a collection already has rows, it's skipped (so re-running
 * won't create duplicates). To force a re-seed, pass `overwrite: true` — that
 * deletes that collection's rows first before re-inserting.
 *
 * Returns a per-collection summary.
 */
export async function seedHouyezPortal(opts: { overwrite?: boolean } = {}): Promise<{
  slides: number; compounds: number; rooms: number; listings: number; tours: number;
  skipped: string[];
  errors: string[];
}> {
  const result = { slides: 0, compounds: 0, rooms: 0, listings: 0, tours: 0, skipped: [] as string[], errors: [] as string[] };

  const collectionsToSeed: Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
    counterKey: 'slides' | 'compounds' | 'rooms' | 'listings' | 'tours';
    active: boolean;
  }> = [
    { name: HOUEZ_COLLECTIONS.slides, counterKey: 'slides', active: true,
      rows: HOUEZ_SLIDES as unknown as Array<Record<string, unknown>> },
    { name: HOUEZ_COLLECTIONS.compounds, counterKey: 'compounds', active: true,
      rows: HOUEZ_COMPOUNDS as unknown as Array<Record<string, unknown>> },
    { name: HOUEZ_COLLECTIONS.rooms, counterKey: 'rooms', active: true,
      rows: HOUEZ_ROOMS as unknown as Array<Record<string, unknown>> },
    { name: HOUEZ_COLLECTIONS.listings, counterKey: 'listings', active: true,
      rows: HOUEZ_LISTINGS as unknown as Array<Record<string, unknown>> },
    { name: HOUEZ_COLLECTIONS.tours, counterKey: 'tours', active: true,
      rows: HOUEZ_TOURS as unknown as Array<Record<string, unknown>> },
  ];

  for (const { name, rows, counterKey, active } of collectionsToSeed) {
    try {
      const existing = await listRecords<{ id: string }>(HOUYEZ_TABLE, {
        where: [{ column: 'collection', value: name }],
        select: 'id',
      });

      if (!opts.overwrite && existing.length > 0) {
        result.skipped.push(`${name} (already has ${existing.length} rows)`);
        continue;
      }

      if (opts.overwrite && existing.length > 0) {
        const { error } = await getSupabaseAdmin()
          .from(HOUYEZ_TABLE)
          .delete()
          .eq('collection', name);
        if (error) throw new Error(error.message);
      }

      await insertRecords(
        HOUYEZ_TABLE,
        rows.map((row, i) => ({ collection: name, order: i, active, data: row })),
      );
      result[counterKey] = rows.length;
    } catch (err) {
      result.errors.push(`${name}: ${(err as Error).message}`);
    }
  }
  return result;
}

/**
 * Upsert a single Houyez row (admin use). Pass an explicit `id` to update an
 * existing row; omit it to create a new one.
 */
export async function upsertHouyezDoc(
  col: keyof typeof HOUEZ_COLLECTIONS,
  data: Record<string, unknown>,
  id?: string,
): Promise<{ id: string; created: boolean }> {
  const { insertRecord, updateRecord } = await import('@sierra-estates/db');
  const collection = HOUEZ_COLLECTIONS[col];

  if (id) {
    await updateRecord(HOUYEZ_TABLE, id, { collection, data });
    return { id, created: false };
  }
  const created = await insertRecord<{ id: string }>(HOUYEZ_TABLE, { collection, data });
  return { id: created.id, created: true };
}
