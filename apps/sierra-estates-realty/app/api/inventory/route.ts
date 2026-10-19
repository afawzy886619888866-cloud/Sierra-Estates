/**
 * GET /api/inventory → InventoryResponse
 *
 * Serves the public inventory map. PUBLISH GATE (activation plan Phase D):
 * this is a public, unauthenticated endpoint, so it serves ONLY verified
 * `publish_status = 'PUBLISHABLE'` rows from the live listings table —
 * enforced inside the query itself (defense-in-depth on top of the RLS
 * policy in supabase/migrations/20261002_020_public_publish_gate.sql, which
 * may not be applied yet on the live project).
 *
 * Sources, in priority order:
 *   1. "supabase" — public.listings read through the anon client with the
 *                   publish gate in the WHERE clause. Owner contact info is
 *                   stripped before it ever reaches this response.
 *   2. "domain"   — the same listings table via InventoryQueryService with
 *                   `publishStatus: 'PUBLISHABLE'` (also gated).
 *
 * ANTI-FABRICATION (activation plan Phase E / §21): NO sheet, snapshot,
 * Excel-workbook, or WhatsApp-ingested fallback. Those sources are real but
 * UNVERIFIED — exactly the rows Phase D exists to keep off the public map —
 * so when nothing verified exists the honest answer is an empty unit list
 * with `source: 'none'`, never unreviewed inventory.
 *
 * POST — appends a public submission to the Excel workbook and mirrors it to
 * Supabase as `publish_status: 'REVIEW_REQUIRED'` (staff moderation queue),
 * which is why submissions can never reappear through this GET.
 */
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { InventoryQueryService } from "@/lib/services/inventory-query";
import { queryUnitToMapUnit } from "@/lib/inventory/domain-map";
import { resolveLocation } from "@/lib/inventory/gazetteer";
import { hasPendingPhoto } from "@/lib/inventory/normalize";
import { getSupabase } from "@sierra-estates/db";
import { appendToExcelInventory } from "@/lib/services/ExcelInventoryService";
import type { InventoryResponse, InventoryUnit } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Evidence-based segment attribution (Direct vs Broker) for the map's
 * 5-way segment bar. Only EXPLICIT evidence is used — anything ambiguous
 * stays unattributed (undefined → counted as 'unknown') rather than guessed,
 * mirroring the anti-fabrication stance of this endpoint. Evidence source:
 *   - source_channel containing 'owner'          → Direct (owners_*)
 *   - source_channel broker/agent/portal channels → Broker (broker_*)
 *     ('property_finder' and 'dubizzle' postings are broker-published inventory)
 *   - 'direct' / 'website' / 'whatsapp_group' / '' → ambiguous, no attribution.
 * The map's own filter falls back to unit.mode for unattributed units, so
 * those remain visible in both rent tabs — the honest overlap we documented. */
function deriveSegment(
  sourceChannel: unknown,
  mode: string,
): InventoryUnit["segment"] | undefined {
  const src = String(sourceChannel || "").toLowerCase();
  const isRent = mode === "rent";
  if (src.includes("owner")) return isRent ? "owners_rent" : "owners_buy";
  if (/(broker|agent|property_finder|dubizzle)/.test(src)) {
    return isRent ? "broker_rent" : "broker_buy";
  }
  return undefined;
}

// In-memory cache for Supabase listings to ensure ultra-fast responses (1-2ms)
// and avoid hitting Supabase rate limits or cold-start timeouts.
let cachedSupabaseListings: { data: InventoryResponse; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/** Canonical Supabase listings, mapped to the public-safe map shape.
 *
 * Least privilege (was service-role): this is a public, unauthenticated
 * endpoint, so it reads through the anon client and inherits the database's
 * public RLS policy ("Public can view active listings": status='active' or
 * staff) instead of trusting a client-side WHERE to filter what the public
 * may see. PUBLISH GATE: the WHERE clause ALSO requires
 * publish_status = 'PUBLISHABLE' — the deployed RLS policy does not yet
 * enforce publish_status (migration 020 is pending), so this app-layer
 * filter is what actually keeps the ~500 unverified units off the public
 * map (activation plan Phase D). If the anon env is absent, this throws
 * into the catch below and the route falls back to the next source — same
 * graceful degradation as any other Supabase failure.
 */
async function fetchSupabaseListings(compoundQuery?: string): Promise<InventoryResponse | null> {
  const isAll = !compoundQuery;
  if (process.env.NODE_ENV !== "test" && isAll && cachedSupabaseListings && Date.now() < cachedSupabaseListings.expiresAt) {
    return cachedSupabaseListings.data;
  }
  try {
    const supabase = getSupabase();
    // PAGINATION (2026-10-11): the project's PostgREST max-rows (default
    // 1000) silently caps any single non-Range request, so .limit(5000)
    // alone only ever returned ~1000 rows. Explicit .range() pages reach the budget.
    const PAGE = 1000;
    const HARD_CAP = compoundQuery ? 2000 : 5000;
    const allListings: unknown[] = [];
    let compoundsData: Array<{ name: string | null; lat: number | null; lng: number | null; zone?: string | null }> | null = null;
    for (let from = 0; from < HARD_CAP; from += PAGE) {
      let query = supabase
        .from("listings")
        .select(
          "id, ref_id, code, sbr_code, title, title_ar, compound, location_area, city, property_type, deal_type, price, price_currency, bedrooms, bathrooms, area_sqm, status, description, description_ar, finishing_type, furnishing_status, agent_name, amenities, images, raw_data, latitude, longitude, featured, is_hot_deal, source_channel, pf_reference_number, updated_at",
        )
        .eq("status", "active")
        // PUBLISH GATE (Phase D): only verified rows may reach the public map.
        .eq("publish_status", "PUBLISHABLE");

      if (compoundQuery) {
        query = query.ilike("compound", `%${compoundQuery}%`);
      }

      const [pageRes, compoundsPageRes] = await Promise.all([
        query
          .order("updated_at", { ascending: false })
          .range(from, from + PAGE - 1),
        from === 0
          ? supabase
              .from("compounds")
              .select("name, lat, lng, zone, price_m, rent, ai_score")
          : Promise.resolve(null),
      ]);
      if (pageRes.error) throw new Error(pageRes.error.message);
      if (from === 0) {
        if (compoundsPageRes && "error" in compoundsPageRes && (compoundsPageRes as { error: unknown }).error) {
          // non-fatal: compound geo is an enrichment, pins fall back to gazetteer
          logger.warn("[inventory] compounds read failed — gazetteer fallback for pins");
          compoundsData = [];
        } else {
          compoundsData = ((compoundsPageRes as { data?: unknown }).data ?? []) as typeof compoundsData;
        }
      }
      const data = (pageRes.data ?? []) as unknown[];
      allListings.push(...data);
      if (data.length < PAGE) break;
    }
    const listingsData = allListings as any[];

    const compoundGeo = new Map<string, { lat: number; lng: number; zone?: string }>();
    for (const c of compoundsData ?? []) {
      if (c.name && c.lat && c.lng) {
        compoundGeo.set(c.name.trim().toLowerCase(), { lat: c.lat, lng: c.lng, zone: c.zone ?? undefined });
      }
    }

    const units: InventoryUnit[] = listingsData.map((listing: any) => {
      // ANTI-FABRICATION (§21 Rule B): the label is whatever the row actually
      // carries — known compound, else the raw location string, else ''. The
      // old hard-coded New Cairo default invented a location for rows that
      // have none; the gazetteer centroid below still places the map pin
      // (flagged approx), it just never rewrites the label.
      const rawLocation: string = listing.location_area || listing.compound || "";
      const resolved = resolveLocation(rawLocation);
      const matchedGeo = listing.compound ? compoundGeo.get(listing.compound.trim().toLowerCase()) : null;
      const lat = matchedGeo ? matchedGeo.lat : resolved.lat;
      const lng = matchedGeo ? matchedGeo.lng : resolved.lng;
      const zone = matchedGeo?.zone || (rawLocation && !resolved.approx ? resolved.zone : "");
      const label: string = listing.compound || rawLocation;

      const price = Number(listing.price) || 0;
      // Mode honors the row's real deal_type first (§21: never relabel real
      // data). The price heuristic only disambiguates rows with no deal_type:
      // in this market a recorded EGP value under 1M is monthly-rent scale.
      const mode =
        listing.deal_type === "rent"
          ? "rent"
          : listing.deal_type === "sale"
          ? "sale"
          : price > 0 && price < 1_000_000
          ? "rent"
          : "sale";
      // img/tag/aiScore/publishToClient live in the raw_data JSONB blob on
      // the deployed table (see lib/server/listing-columns.ts) — images[] is
      // the only real photo column, with raw_data.img as the curated primary.
      const raw = (listing.raw_data && typeof listing.raw_data === "object") ? listing.raw_data : {};
      // Pick best available photo: curated img > first from images[] array.
      // Then check with hasPendingPhoto so stock images don't count as real.
      const imagesArr: string[] = Array.isArray(listing.images)
        ? listing.images.filter((x: unknown) => typeof x === "string" && String(x).startsWith("http"))
        : [];
      const primaryImg =
        (raw.img && !hasPendingPhoto(raw.img as string) ? raw.img as string : null) ||
        imagesArr.find((u) => !hasPendingPhoto(u)) ||
        null;
      const hasPhoto = Boolean(primaryImg);

      return {
        id: listing.id,
        code: listing.code || listing.sbr_code || listing.ref_id || listing.id,
        title: listing.title || raw.title || undefined,
        titleAr: listing.title_ar || undefined,
        descriptionAr: listing.description_ar || undefined,
        agent: listing.agent_name || raw.agent || undefined,
        tag: raw.tag || undefined,
        aiScore: typeof raw.aiScore === "number" ? raw.aiScore : undefined,
        featured: Boolean(listing.featured),
        finishing: listing.finishing_type || undefined,
        furnishing: listing.furnishing_status || undefined,
        amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
        pfReference: listing.pf_reference_number || undefined,
        compound: label,
        mode,
        segment: deriveSegment(listing.source_channel, mode),
        status: "available",
        statusLabel: "Available",
        location: label,
        rawLocation: rawLocation || null,
        zone,
        lat: listing.latitude ?? lat,
        lng: listing.longitude ?? lng,
        approxLocation: !matchedGeo && resolved.approx,
        propertyType: listing.property_type,
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        area: Number(listing.area_sqm) || null,
        price,
        priceLabel: price
          ? `EGP ${price.toLocaleString("en-US")}`
          : "Price on request",
        img: primaryImg ?? undefined,
        hasPhoto,
        description: listing.description,
        updatedAt: listing.updated_at,
      };
    });

    if (units.length) {
      const res: InventoryResponse = {
        generatedAt: new Date().toISOString(),
        source: "supabase",
        count: units.length,
        units,
      };
      if (isAll) {
        cachedSupabaseListings = {
          data: res,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
      }
      return res;
    }
    return null;
  } catch (err) {
    logger.warn(
      `[inventory] Supabase listings read failed, falling back: ${(err as Error).message}`,
    );
    return null;
  }
}

/** Same listings table via InventoryQueryService — PUBLISH GATED (Phase D). */
async function fetchDomain(): Promise<InventoryResponse | null> {
  try {
    const rows = await InventoryQueryService.query({
      status: "available",
      publishStatus: "PUBLISHABLE",
      limit: 300,
    });
    if (!rows.length) return null;
    const units = rows.map(queryUnitToMapUnit);
    return {
      generatedAt: new Date().toISOString(),
      source: "domain",
      count: units.length,
      units,
    };
  } catch (err) {
    logger.warn(
      `[inventory] domain read failed: ${(err as Error).message}`,
      { error: err }
    );
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
  const filterCompound =
    searchParams.get("compound")?.trim().toLowerCase() || "";
  const filterSegment = searchParams.get("segment")?.trim().toLowerCase() || "";
  const filterMode = searchParams.get("mode")?.trim().toLowerCase() || "";
  const filterStatus = searchParams.get("status")?.trim().toLowerCase() || "";
  const filterSheetOnly = searchParams.get("sheetOnly") === "true";
  const filterWithPhotoOnly = searchParams.get("withPhotoOnly") === "true";
  const filterLimit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 0;

  // Canonical tiered retrieval: Supabase direct (with compound filter) -> Domain query
  const sourceResponse =
    (await fetchSupabaseListings(filterCompound)) ??
    (await fetchDomain()) ??
    null;
  const deduplicatedUnits: InventoryUnit[] = [];
  const seenCodes = new Set<string>();

  for (const u of sourceResponse?.units ?? []) {
    const key = (u.code || u.id || "").trim().toUpperCase();
    if (key && seenCodes.has(key)) continue;
    if (key) seenCodes.add(key);

    const primaryImg = u.img;
    // Use shared hasPendingPhoto so the pending-photo classification is
    // consistent across the Supabase mapper above and this dedup loop.
    const hasPhoto =
      typeof u.hasPhoto === "boolean"
        ? u.hasPhoto
        : !hasPendingPhoto(primaryImg);

    deduplicatedUnits.push({
      ...u,
      hasPhoto,
    });
  }

  // Live segment aggregates for the map's segment bar badges — computed from
  // the same publish-gated, deduplicated set that powers the pins (pre-filter).
  const segmentCounts = {
    total: deduplicatedUnits.length,
    owners_rent: 0,
    owners_buy: 0,
    broker_rent: 0,
    broker_buy: 0,
    unknown: 0,
  };
  for (const u of deduplicatedUnits) {
    const s = String((u as { segment?: string }).segment || "").toLowerCase();
    if (s === "owners_rent" || s === "owners_buy" || s === "broker_rent" || s === "broker_buy") {
      segmentCounts[s]++;
    } else {
      segmentCounts.unknown++;
    }
  }

  // Prioritize units that have real photos so they appear first across the system
  deduplicatedUnits.sort((a, b) => {
    const aPhoto = a.hasPhoto ? 1 : 0;
    const bPhoto = b.hasPhoto ? 1 : 0;
    if (bPhoto !== aPhoto) {
      return bPhoto - aPhoto;
    }
    return (b.price || 0) - (a.price || 0);
  });

  // Calculate unphotographed / sheet units counts per compound
  const compoundSheetCounts: Record<string, number> = {};
  for (const u of deduplicatedUnits) {
    if (!u.hasPhoto) {
      const cmp = u.compound || u.location || "Unknown";
      compoundSheetCounts[cmp] = (compoundSheetCounts[cmp] || 0) + 1;
    }
  }

  // Strip private owner PII for public API response while keeping the real property data
  let filteredUnits: InventoryUnit[] = deduplicatedUnits.map((u: any) => {
    const {
      contactPhone: _contactPhone,
      ownerContact: _ownerContact,
      phone: _phone,
      contactName: _contactName,
      whatsAppDirect: _whatsAppDirect,
      ...publicSafe
    } = u;
    return publicSafe as InventoryUnit;
  });

  if (filterCompound) {
    filteredUnits = filteredUnits.filter((u) => {
      const cmp = (u.compound || u.location || "").toLowerCase();
      return cmp.includes(filterCompound) || filterCompound.includes(cmp);
    });
  }

  if (filterSegment && filterSegment !== "all") {
    filteredUnits = filteredUnits.filter((u) => u.segment === filterSegment);
  }

  if (filterMode && filterMode !== "all") {
    filteredUnits = filteredUnits.filter((u) => u.mode === filterMode);
  }

  // Filter for sheet-only or with-photos-only when specifically queried
  if (filterSheetOnly) {
    filteredUnits = filteredUnits.filter((u) => !u.hasPhoto);
  } else if (filterWithPhotoOnly) {
    filteredUnits = filteredUnits.filter((u) => u.hasPhoto);
  }

  // Status filter — default to available-only unless admin passes ?status=all
  if (filterStatus && filterStatus !== "all") {
    filteredUnits = filteredUnits.filter((u) => u.status === filterStatus);
  }

  if (filterLimit > 0 && filteredUnits.length > filterLimit) {
    filteredUnits = filteredUnits.slice(0, filterLimit);
  }

  // Compute live compound counts from filtered set
  const compoundCounts: Record<string, number> =
    sourceResponse?.compoundCounts || {};
  for (const u of filteredUnits) {
    const cmp = u.compound || u.location || "Unknown";
    if (!compoundCounts[cmp]) compoundCounts[cmp] = 0;
    compoundCounts[cmp]++;
  }

  const payload: InventoryResponse = {
    generatedAt: sourceResponse?.generatedAt || new Date().toISOString(),
    source: sourceResponse?.source || "none",
    count: filteredUnits.length,
    segments: sourceResponse?.segments ?? segmentCounts,
    compoundCounts,
    compoundSheetCounts,
    compoundSegmentCounts: sourceResponse?.compoundSegmentCounts,
    units: filteredUnits,
  };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    logger.error("[inventory:GET] Unexpected error processing inventory request", {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return NextResponse.json(
      { error: "Internal server error fetching inventory" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory → Append newly submitted listing to Excel inventory sheet and Supabase
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.compound || !body.price) {
      return NextResponse.json(
        { error: "Missing required listing fields: compound and price are mandatory" },
        { status: 400 }
      );
    }

    // persistToSupabase: this route has no canonical writer of its own, so the
    // append's DB persistence stays enabled — as an HONEST unverified insert
    // (REVIEW_REQUIRED / status 'pending' / deal_type from explicit operation).
    const result = await appendToExcelInventory({ ...body, persistToSupabase: true });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to append unit to Excel inventory workbook" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Listing successfully appended to sheet "${result.sheetName}" and synced to database`,
      recordId: result.recordId,
      sheetName: result.sheetName,
    });
  } catch (err) {
    logger.error("[inventory:POST] Failed to process inventory submission", {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
