import 'server-only';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@sierra-estates/db';
import { resolveUnitCode, normalizeDealType } from '@/lib/server/unit-codes';
import { appendListingToOwnersRentMaster, type MasterCsvAppendResult } from '@/lib/server/master-csv-append';
import type { TelegramBroadcastResult } from '@/lib/server/telegram-broadcaster';
import type { TelegramListingSpec } from '@/lib/server/telegram-listing-formatter';

/**
 * SIERRA ESTATES 3.0 — MULTI-DESTINATION LISTING SYNDICATION (Phase 2.4)
 *
 * Runs after a listing is broadcast to the Telegram channel and fans the same
 * unit out to every canonical destination:
 *
 *   1. Supabase public.listings — upsert keyed on reference_code (the
 *      historical `units` collection is an alias of `listings`; there is no
 *      separate units table — COLLECTIONS.units → 'listings').
 *   2. The local Owners-Rent Master CSV (rent listings; merge semantics of
 *      scripts/merge-owners-rent-csv.mjs).
 *   3. Coordinates resolution — unit coords, else the compounds table, so
 *      the unit reflects on the interactive map (CompoundsMap reads compound
 *      coordinates + /api/inventory units).
 *   4. Property Finder feed refresh via
 *      scripts/generate-photos-propertyfinder-feed.mjs (spawned locally;
 *      serverless runtimes report the operator command honestly).
 *
 * Every destination reports its own truth — failures never fabricate success.
 */

export interface CoordinateResolution {
  resolved: boolean;
  lat: number | null;
  lng: number | null;
  source: 'unit' | 'compounds-table' | null;
  note?: string;
}

export interface SupabaseSyndicationResult {
  ok: boolean;
  action: 'upserted' | 'unavailable' | 'failed';
  id?: string | null;
  refId?: string;
  error?: string;
}

export interface PropertyFinderFeedResult {
  triggered: boolean;
  mode: 'inline-script' | 'unavailable';
  note?: string;
}

export interface ListingSyndicationResult {
  unitCode: string;
  supabase: SupabaseSyndicationResult;
  masterCsv: MasterCsvAppendResult;
  coordinates: CoordinateResolution;
  propertyFinder: PropertyFinderFeedResult;
}

/** Resolve the interactive-map coordinates for a unit. */
export async function resolveListingCoordinates(
  unit: TelegramListingSpec,
): Promise<CoordinateResolution> {
  // The unit itself may carry explicit coordinates; otherwise the compound
  // gazetteer (public.compounds) resolves the map pin.
  if (typeof unit.lat === 'number' && typeof unit.lng === 'number' && (unit.lat !== 0 || unit.lng !== 0)) {
    return { resolved: true, lat: unit.lat, lng: unit.lng, source: 'unit' };
  }

  if (!isSupabaseAdminConfigured()) {
    return {
      resolved: false,
      lat: null,
      lng: null,
      source: null,
      note: 'Supabase admin client not configured — compound coordinates could not be looked up.',
    };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('compounds')
      .select('name,lat,lng')
      .ilike('name', `%${String(unit.compound).trim()}%`)
      .limit(1);
    if (error) throw new Error(error.message);
    const row = (data ?? [])[0] as { name?: string; lat?: number | null; lng?: number | null } | undefined;
    if (row && Number(row.lat) !== 0 && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng))) {
      return { resolved: true, lat: Number(row.lat), lng: Number(row.lng), source: 'compounds-table' };
    }
    return {
      resolved: false,
      lat: null,
      lng: null,
      source: null,
      note: `No coordinates row for compound "${unit.compound}" in public.compounds — the map pin awaits a gazetteer entry.`,
    };
  } catch (err) {
    return {
      resolved: false,
      lat: null,
      lng: null,
      source: null,
      note: `Compound coordinate lookup failed: ${(err as Error)?.message}`,
    };
  }
}

/** Upsert the broadcast unit into public.listings (reference_code keyed). */
export async function upsertListingInSupabase(params: {
  unit: TelegramListingSpec;
  unitCode: string;
  formattedCaption: string;
  photoUrls: string[];
  coordinates: CoordinateResolution;
}): Promise<SupabaseSyndicationResult> {
  const { unit, unitCode, formattedCaption, photoUrls, coordinates } = params;

  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      action: 'unavailable',
      refId: unitCode,
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured — listing upsert skipped.',
    };
  }

  const dealType = normalizeDealType(unit.dealType);
  const photos = (photoUrls ?? []).filter((u) => /^https?:\/\//i.test(String(u)));
  const title =
    String(unit.description ?? '').trim().slice(0, 80) ||
    `${unit.unitType ?? 'Unit'} — ${unit.compound}${dealType === 'rent' ? ' (إيجار)' : ''}`;

  const row: Record<string, unknown> = {
    ref_id: unitCode,
    reference_code: unitCode,
    code: unitCode,
    title,
    description: formattedCaption,
    compound: unit.compound,
    zone: unit.zone ?? null,
    property_type: unit.unitType ?? null,
    deal_type: dealType,
    price: Number(unit.price) > 0 ? Number(unit.price) : 0,
    price_currency: (unit.priceCurrency || 'EGP').toUpperCase(),
    bedrooms: Number(unit.bedrooms) > 0 ? Number(unit.bedrooms) : 0,
    bathrooms: Number(unit.bathrooms) > 0 ? Number(unit.bathrooms) : 0,
    area_sqm: Number(unit.areaSqm) > 0 ? Number(unit.areaSqm) : 0,
    finishing_type: unit.finishing ?? null,
    images: photos,
    photos: photos,
    img: photos[0] ?? null,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    status: 'active',
    sync_source: 'telegram',
    source_channel: 'telegram',
    owner_name: unit.contactName ?? null,
    owner_phone: (unit.contactPhone ?? '').replace(/\D/g, '') || null,
    verified: true,
    publish_to_client: true,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('listings')
      .upsert(row, { onConflict: 'reference_code' })
      .select('id,ref_id')
      .single();
    if (error) throw new Error(error.message);
    return {
      ok: true,
      action: 'upserted',
      id: (data as { id?: string } | null)?.id ?? null,
      refId: (data as { ref_id?: string } | null)?.ref_id ?? unitCode,
    };
  } catch (err) {
    return { ok: false, action: 'failed', refId: unitCode, error: (err as Error)?.message };
  }
}

/** Trigger the Property Finder photo-feed regeneration. */
export function triggerPropertyFinderFeed(): PropertyFinderFeedResult {
  const operatorCommand = 'node scripts/generate-photos-propertyfinder-feed.mjs';

  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    return {
      triggered: false,
      mode: 'unavailable',
      note: `Serverless runtime cannot spawn the file-based feed pipeline. Run: ${operatorCommand}`,
    };
  }

  try {
    const cwd = process.cwd();
    const repoRoot = [cwd, path.join(cwd, '..', '..'), path.join(cwd, '..', '..', '..')].find(
      (base) => fs.existsSync(path.join(base, 'scripts', 'generate-photos-propertyfinder-feed.mjs')),
    );
    if (!repoRoot) {
      return {
        triggered: false,
        mode: 'unavailable',
        note: `generate-photos-propertyfinder-feed.mjs not reachable from ${cwd}. Run: ${operatorCommand}`,
      };
    }
    const child = spawn(process.execPath, ['scripts/generate-photos-propertyfinder-feed.mjs'], {
      cwd: repoRoot,
      stdio: 'ignore',
      detached: true,
    });
    child.unref();
    return {
      triggered: true,
      mode: 'inline-script',
      note: `Property Finder feed regeneration spawned (pid ${child.pid}) from ${repoRoot}.`,
    };
  } catch (err) {
    return {
      triggered: false,
      mode: 'unavailable',
      note: `Feed trigger failed: ${(err as Error)?.message}. Run: ${operatorCommand}`,
    };
  }
}

/**
 * Fan a just-broadcast listing out to every non-Telegram destination.
 * (`broadcast` is accepted for a complete report even when the channel send
 * was skipped — the database and CSV legs still run so the listing exists.)
 */
export async function syndicateListingBroadcast(params: {
  unit: TelegramListingSpec;
  formattedCaption: string;
  photoUrls: string[];
  broadcast?: TelegramBroadcastResult;
}): Promise<ListingSyndicationResult> {
  const { unit, formattedCaption, photoUrls } = params;

  const unitCode = resolveUnitCode(unit).code;
  const coordinates = await resolveListingCoordinates(unit);
  const supabase = await upsertListingInSupabase({
    unit,
    unitCode,
    formattedCaption,
    photoUrls,
    coordinates,
  });
  const masterCsv = await appendListingToOwnersRentMaster(unit, formattedCaption);
  const propertyFinder = triggerPropertyFinderFeed();

  return { unitCode, supabase, masterCsv, coordinates, propertyFinder };
}
