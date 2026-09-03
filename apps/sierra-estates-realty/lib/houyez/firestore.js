/**
 * Houyez-Style Portal — content schema + data layer
 * ────────────────────────────────────────────────────────────────────────────
 * Why this file exists
 * ───────────────────
 * The portal was originally wired to a static TS data file
 * (data/houyez-properties.ts), so every content change — price, hero image,
 * adding a property, reordering a compound — required a code commit and a
 * redeploy. This module moves that content into the database instead.
 *
 * All portal content lives in ONE table, `houyez_content`, discriminated by a
 * `collection` column ('slides' | 'compounds' | 'rooms' | 'listings' | 'tours')
 * with the row payload in a JSONB `data` column. Firestore had five separate
 * collections; the shapes are bilingual presentation blobs that are never
 * queried by field, so five tables of near-duplicate EN/AR columns would have
 * bought nothing.
 *
 * `seedHouyezPortal()` writes the static seed data into that table so a fresh
 * project is instantly populated. It is re-runnable: it skips a collection
 * that already has rows, or replaces it with `overwrite: true`.
 *
 * The reader helpers fall back to the static seed whenever the table is empty
 * or unreachable, so the portal never renders blank.
 *
 * NOTE ON REAL-TIME: the Firestore version exposed subscribeHouyez* helpers
 * built on onSnapshot, so admin edits appeared live. Those had no callers —
 * the component they were written for does not exist in this repo — and are
 * not reimplemented here. Supabase Realtime would be the equivalent if the
 * portal ever needs it.
 */

import { getSupabaseAdmin, insertRecords, listRecords } from '@sierra-estates/db';
import {
  HOUEZ_SLIDES, HOUEZ_COMPOUNDS, HOUEZ_ROOMS, HOUEZ_LISTINGS, HOUEZ_TOURS,

} from '@/data/houyez-properties';

/** The single table all portal content lives in. */
const HOUYEZ_TABLE = 'houyez_content';

/**
 * Discriminator values for `houyez_content.collection`. These were five
 * separate Firestore collection names ('houyez_slides', ...); the prefix is
 * now the table, so only the suffix remains.
 */
export const HOUEZ_COLLECTIONS = {
  slides: 'slides',
  compounds: 'compounds',
  rooms: 'rooms',
  listings: 'listings',
  tours: 'tours',
} ;

// ─── Readers ────────────────────────────────────────────────────────────────
/**
 * Read one portal collection, ordered as authored.
 *
 * Always falls back to the static seed when the table is empty or unreachable,
 * which is what keeps the portal from rendering blank on a fresh project or a
 * database blip.
 */
async function readCollection(collection, seed) {
  try {
    const rows = await listRecords(HOUYEZ_TABLE, {
      where: [
        { column: 'collection', value: collection },
        { column: 'active', value: true },
      ],
      orderBy: { column: 'order', ascending: true },
    });
    if (rows.length === 0) return seed;
    return rows.map((row) => ({ id: row.id, ...row.data }) );
  } catch (err) {
    console.warn(`[houyez] ${collection} read failed, using seed:`, (err ).message);
    return seed;
  }
}

export const getHouyezSlides = () =>
  readCollection(HOUEZ_COLLECTIONS.slides, HOUEZ_SLIDES);
export const getHouyezCompounds = () =>
  readCollection(HOUEZ_COLLECTIONS.compounds, HOUEZ_COMPOUNDS);
export const getHouyezRooms = () =>
  readCollection(HOUEZ_COLLECTIONS.rooms, HOUEZ_ROOMS);
export const getHouyezListings = () =>
  readCollection(HOUEZ_COLLECTIONS.listings, HOUEZ_LISTINGS);
export const getHouyezTours = () =>
  readCollection(HOUEZ_COLLECTIONS.tours, HOUEZ_TOURS);

/**
 * Seed all five Houyez collections from the static data file.
 *
 * Idempotent: if a collection already has rows, it's skipped (so re-running
 * won't create duplicates). To force a re-seed, pass `overwrite: true` — that
 * deletes that collection's rows first before re-inserting.
 *
 * Returns a per-collection summary.
 */
export async function seedHouyezPortal(opts = {})



 {
  const result = { slides: 0, compounds: 0, rooms: 0, listings: 0, tours: 0, skipped: [] , errors: []  };

  const collectionsToSeed




 = [
    { name: HOUEZ_COLLECTIONS.slides, counterKey: 'slides', active: true,
      rows: HOUEZ_SLIDES  },
    { name: HOUEZ_COLLECTIONS.compounds, counterKey: 'compounds', active: true,
      rows: HOUEZ_COMPOUNDS  },
    { name: HOUEZ_COLLECTIONS.rooms, counterKey: 'rooms', active: true,
      rows: HOUEZ_ROOMS  },
    { name: HOUEZ_COLLECTIONS.listings, counterKey: 'listings', active: true,
      rows: HOUEZ_LISTINGS  },
    { name: HOUEZ_COLLECTIONS.tours, counterKey: 'tours', active: true,
      rows: HOUEZ_TOURS  },
  ];

  for (const { name, rows, counterKey, active } of collectionsToSeed) {
    try {
      const existing = await listRecords(HOUYEZ_TABLE, {
        where: [{ column: 'collection', value: name }],
        select: 'id',
      });

      if (!opts.overwrite && existing.length > 0) {
        result.skipped.push(`${name} (already has ${existing.length} rows)`);
        continue;
      }

      if (opts.overwrite && existing.length > 0) {
        // One statement rather than the per-document delete batch Firestore
        // needed; deleteRecord() is keyed by id and would be N round trips.
        const { error } = await getSupabaseAdmin()
          .from(HOUYEZ_TABLE)
          .delete()
          .eq('collection', name);
        if (error) throw new Error(error.message);
      }

      // `order` preserves the authored sequence, as the Firestore `order`
      // field did. It is a reserved word, so the column is quoted in the
      // schema; PostgREST addresses it by name and needs no quoting here.
      await insertRecords(
        HOUYEZ_TABLE,
        rows.map((row, i) => ({ collection: name, order: i, active, data: row })),
      );
      result[counterKey] = rows.length;
    } catch (err) {
      result.errors.push(`${name}: ${(err ).message}`);
    }
  }
  return result;
}

/**
 * Upsert a single Houyez row (admin use). Pass an explicit `id` to update an
 * existing row; omit it to create a new one.
 */
export async function upsertHouyezDoc(
  col,
  data,
  id,
) {
  const { insertRecord, updateRecord } = await import('@sierra-estates/db');
  const collection = HOUEZ_COLLECTIONS[col];

  if (id) {
    await updateRecord(HOUYEZ_TABLE, id, { collection, data });
    return { id, created: false };
  }
  const created = await insertRecord(HOUYEZ_TABLE, { collection, data });
  return { id: created.id, created: true };
}
