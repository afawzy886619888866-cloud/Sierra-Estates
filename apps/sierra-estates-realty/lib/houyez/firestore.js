 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Houyez-Style Portal — Firestore schema + dynamic data layer
 * ────────────────────────────────────────────────────────────────────────────
 * Companion to components/houyez-portal/HouyezPortal.tsx.
 *
 * Why this file exists
 * ───────────────────
 * The portal was originally wired to a static TS data file (data/houyez-properties.ts).
 * That made the page render fast but every content change (price, hero image,
 * adding a property, reordering a compound) required a code commit + redeploy.
 *
 * This module flips the portal to be fully dynamic:
 *
 *   - All portal content lives in four Firestore collections:
 *       houyez_slides     → hero slider
 *       houyez_compounds  → compounds grid
 *       houyez_rooms      → 360° rooms strip
 *       houyez_listings   → AI-curated listings grid
 *   - The portal subscribes via `onSnapshot` so changes appear in real-time
 *     the moment an admin edits them in Firebase Console or via the admin
 *     portal — no redeploy needed.
 *   - A `seedHouyezPortal()` helper writes the static seed data (from
 *     data/houyez-properties.ts) into Firestore, so a fresh project is
 *     instantly populated. Re-runnable: it skips collections that already
 *     have docs (or wipes them with `overwrite: true`).
 *   - A safety fallback: if Firestore returns 0 docs (or the Firebase client
 *     isn't configured in dev), the hook transparently returns the static
 *     seed data so the page never renders empty.
 *
 * Firestore document shapes (all fields bilingual for EN/AR)
 * ──────────────────────────────────────────────────────────
 *
 * houyez_slides/{auto-id}:
 *   pre: string, preAr: string,
 *   main: string, mainAr: string,
 *   img: string,
 *   order: number          // ascending; lower = earlier slide
 *
 * houyez_compounds/{auto-id}:
 *   name: string, nameAr: string,
 *   zone: string, zoneAr: string,
 *   count: number,         // listing count to display
 *   img: string,
 *   order: number
 *
 * houyez_rooms/{auto-id}:
 *   name: string, nameAr: string,
 *   sub: string, subAr: string,
 *   img: string,
 *   order: number
 *
 * houyez_listings/{auto-id}:
 *   code: string,          // SBR code, e.g. 'HP-VL-01'
 *   cmp: string, cmpAr: string,
 *   zone: string, zoneAr: string,
 *   type: 'Villa' | 'Twin House' | 'Apartment' | 'Penthouse' | 'Duplex',
 *   typeAr: string,
 *   beds: number, bath: number, area: number,
 *   egpM: number,          // price in millions EGP (sale)
 *   usd: number,           // price in USD (sale total OR rent per month)
 *   ai: number,            // AI match score 0-10
 *   tag: 'Premium' | 'Featured' | 'Smart Match' | 'Exclusive' | 'New' | 'Best ROI' | null,
 *   tagAr: string | null,
 *   mode: 'sale' | 'rent',
 *   modeAr: string,
 *   agent: string, agentAr: string,
 *   ago: string, agoAr: string,
 *   img: string,
 *   order: number,
 *   active: boolean        // soft-delete / hide without removing the doc
 */

import {
  collection, query, orderBy, onSnapshot, where,
  addDoc, setDoc, doc, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseClientConfigured } from '../firebase';
import {
  HOUEZ_SLIDES, HOUEZ_COMPOUNDS, HOUEZ_ROOMS, HOUEZ_LISTINGS, HOUEZ_TOURS,

} from '@/data/houyez-properties';

// ─── Collection names ───────────────────────────────────────────────────────
export const HOUEZ_COLLECTIONS = {
  slides: 'houyez_slides',
  compounds: 'houyez_compounds',
  rooms: 'houyez_rooms',
  listings: 'houyez_listings',
  tours: 'houyez_tours',
} ;

// ─── Subscriptions ──────────────────────────────────────────────────────────
/**
 * Subscribe to a Houyez collection. Calls back with the typed doc array.
 * Returns an unsubscribe function (or a no-op if Firebase isn't configured).
 *
 * Always returns the static seed data as a fallback when:
 *   - Firebase client isn't configured (dev without credentials), OR
 *   - The collection is empty (first run before seeding).
 *
 * This guarantees the portal never renders empty.
 */
function subscribe(
  colName,
  seed,
  onData,
  onError,
) {
  // Dev-mode fallback: no Firebase client → return seed.
  if (!isFirebaseClientConfigured) {
    onData(seed);
    return () => {};
  }
  try {
    const q = query(collection(db, colName), orderBy('order', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          onData(seed);
          return;
        }
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() ) }) );
        onData(rows);
      },
      (err) => {
        console.warn(`[houyez] ${colName} subscription failed, using seed:`, err.message);
        onData(seed);
        _optionalChain([onError, 'optionalCall', _ => _(err )]);
      },
    );
  } catch (err) {
    console.warn(`[houyez] ${colName} subscription setup failed, using seed:`, err);
    onData(seed);
    return () => {};
  }
}

export function subscribeHouyezSlides(cb, onErr) {
  return subscribe(HOUEZ_COLLECTIONS.slides, HOUEZ_SLIDES, cb, onErr);
}
export function subscribeHouyezCompounds(cb, onErr) {
  return subscribe(HOUEZ_COLLECTIONS.compounds, HOUEZ_COMPOUNDS, cb, onErr);
}
export function subscribeHouyezRooms(cb, onErr) {
  return subscribe(HOUEZ_COLLECTIONS.rooms, HOUEZ_ROOMS, cb, onErr);
}
export function subscribeHouyezListings(cb, onErr) {
  // Only subscribe to active listings (soft-delete support).
  if (!isFirebaseClientConfigured) {
    cb(HOUEZ_LISTINGS);
    return () => {};
  }
  try {
    const q = query(
      collection(db, HOUEZ_COLLECTIONS.listings),
      where('active', '==', true),
      orderBy('order', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          cb(HOUEZ_LISTINGS);
          return;
        }
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() ) }) );
        cb(rows);
      },
      (err) => {
        console.warn('[houyez] listings subscription failed, using seed:', err.message);
        cb(HOUEZ_LISTINGS);
        _optionalChain([onErr, 'optionalCall', _2 => _2(err )]);
      },
    );
  } catch (err) {
    console.warn('[houyez] listings subscription setup failed, using seed:', err);
    cb(HOUEZ_LISTINGS);
    return () => {};
  }
}

export function subscribeHouyezTours(cb, onErr) {
  // Only subscribe to active tours (soft-delete support).
  if (!isFirebaseClientConfigured) {
    cb(HOUEZ_TOURS);
    return () => {};
  }
  try {
    const q = query(
      collection(db, HOUEZ_COLLECTIONS.tours),
      where('active', '==', true),
      orderBy('order', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          cb(HOUEZ_TOURS);
          return;
        }
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() ) }) );
        cb(rows);
      },
      (err) => {
        console.warn('[houyez] tours subscription failed, using seed:', err.message);
        cb(HOUEZ_TOURS);
        _optionalChain([onErr, 'optionalCall', _3 => _3(err )]);
      },
    );
  } catch (err) {
    console.warn('[houyez] tours subscription setup failed, using seed:', err);
    cb(HOUEZ_TOURS);
    return () => {};
  }
}

// ─── Seed / write helpers ───────────────────────────────────────────────────
/**
 * Seed all four Houyez collections from the static data file.
 *
 * Idempotent: if a collection already has docs, it's skipped (so re-running
 * won't create duplicates). To force a re-seed, pass `overwrite: true` — that
 * wipes the collection first (deletes all docs) before re-inserting.
 *
 * Returns a per-collection summary.
 */
export async function seedHouyezPortal(opts = {})



 {
  const result = { slides: 0, compounds: 0, rooms: 0, listings: 0, tours: 0, skipped: [] , errors: []  };

  if (!isFirebaseClientConfigured) {
    result.errors.push('Firebase client not configured — set NEXT_PUBLIC_FIREBASE_* env vars.');
    return result;
  }

  const collectionsToSeed

 = [
    { name: HOUEZ_COLLECTIONS.slides, counterKey: 'slides',
      rows: HOUEZ_SLIDES.map((s, i) => ({ ...s, order: i, createdAt: serverTimestamp() })) },
    { name: HOUEZ_COLLECTIONS.compounds, counterKey: 'compounds',
      rows: HOUEZ_COMPOUNDS.map((c, i) => ({ ...c, order: i, createdAt: serverTimestamp() })) },
    { name: HOUEZ_COLLECTIONS.rooms, counterKey: 'rooms',
      rows: HOUEZ_ROOMS.map((r, i) => ({ ...r, order: i, createdAt: serverTimestamp() })) },
    { name: HOUEZ_COLLECTIONS.listings, counterKey: 'listings',
      rows: HOUEZ_LISTINGS.map((l, i) => ({ ...l, order: i, active: true, createdAt: serverTimestamp() })) },
    { name: HOUEZ_COLLECTIONS.tours, counterKey: 'tours',
      rows: HOUEZ_TOURS.map((t, i) => ({ ...t, order: i, active: true, createdAt: serverTimestamp() })) },
  ];

  for (const { name, rows, counterKey } of collectionsToSeed) {
    try {
      const existing = await getDocs(collection(db, name));
      if (!opts.overwrite && !existing.empty) {
        result.skipped.push(`${name} (already has ${existing.size} docs)`);
        continue;
      }
      if (opts.overwrite && !existing.empty) {
        const batch = writeBatch(db);
        existing.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      for (const row of rows) {
        await addDoc(collection(db, name), row);
        result[counterKey]++;
      }
    } catch (err) {
      result.errors.push(`${name}: ${(err ).message}`);
    }
  }
  return result;
}

/**
 * Upsert a single Houyez doc (admin use). Pass an explicit `id` to update an
 * existing doc; omit it to create a new one with an auto-id.
 */
export async function upsertHouyezDoc(
  col,
  data,
  id,
) {
  if (!isFirebaseClientConfigured) {
    throw new Error('Firebase client not configured.');
  }
  const colName = HOUEZ_COLLECTIONS[col];
  if (id) {
    await setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return { id, created: false };
  }
  const ref = await addDoc(collection(db, colName), { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, created: true };
}
