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
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { InventoryQueryService } from "@/lib/services/inventory-query";
import { fetchSheetUnits } from "@/lib/inventory/fetch-sheet";
import { queryUnitToMapUnit } from "@/lib/inventory/domain-map";
import { resolveLocation } from "@/lib/inventory/gazetteer";
import { getSupabaseAdmin } from "@sierra-estates/db";
import snapshot from "@/lib/inventory/snapshot.json";
import type { InventoryResponse, InventoryUnit } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Committed snapshot fallback. */
function snapshotResponse(): InventoryResponse {
  const snapshotData = snapshot as unknown;
  const isArray = Array.isArray(snapshotData);
  const rawUnits: InventoryUnit[] = isArray
    ? (snapshotData as InventoryUnit[])
    : (snapshotData as { units?: InventoryUnit[] })?.units || [];
  const units = rawUnits.filter(
    (u: any) =>
      u.party !== "Owner" &&
      u.sourceType !== "owner" &&
      u.segment !== "owners_rent" &&
      u.segment !== "owners_buy" &&
      u.tag !== "Direct Owner",
  );
  const generatedAt =
    !isArray &&
    typeof (snapshotData as { generatedAt?: string })?.generatedAt === "string"
      ? (snapshotData as { generatedAt: string }).generatedAt
      : new Date().toISOString();

  return {
    generatedAt,
    source: "snapshot",
    count: units.length,
    units,
  };
}

/** Canonical `units` collection (the unified pipeline). */
async function fetchDomain(): Promise<InventoryResponse | null> {
  try {
    const rows = await InventoryQueryService.query({
      status: "available",
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
      `[inventory] domain read failed, falling back to sheet: ${(err as Error).message}`,
    );
    return null;
  }
}

/** Canonical Supabase listings, mapped to the public-safe map shape. */
async function fetchSupabaseListings(): Promise<InventoryResponse | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("listings")
      .select(
        "id, ref_id, code, compound, location_area, property_type, deal_type, price, price_currency, bedrooms, area_sqm, status, description, updated_at",
      )
      .in("status", ["active", "available"])
      .order("updated_at", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);

    const units: InventoryUnit[] = (data ?? []).map((listing) => {
      const location = listing.location_area || listing.compound || "New Cairo";
      const resolved = resolveLocation(location);
      const price = Number(listing.price) || 0;
      const mode =
        listing.deal_type === "rent" || (price > 0 && price < 1_000_000)
          ? "rent"
          : "sale";

      return {
        id: listing.id,
        code: listing.code || listing.ref_id || listing.id,
        compound: listing.compound || resolved.label,
        mode,
        status: "available",
        statusLabel: "Available",
        location: listing.compound || resolved.label,
        rawLocation: location,
        zone: resolved.zone,
        lat: resolved.lat,
        lng: resolved.lng,
        approxLocation: resolved.approx,
        propertyType: listing.property_type,
        beds: listing.bedrooms,
        area: Number(listing.area_sqm) || null,
        price,
        priceLabel: price
          ? `EGP ${price.toLocaleString("en-US")}`
          : "Price on request",
        description: listing.description,
        updatedAt: listing.updated_at,
      };
    });

    return units.length
      ? {
          generatedAt: new Date().toISOString(),
          source: "supabase",
          count: units.length,
          units,
        }
      : null;
  } catch (err) {
    logger.warn(
      `[inventory] Supabase listings read failed, falling back: ${(err as Error).message}`,
    );
    return null;
  }
}

/** Owner sheet read live. */
async function fetchLive(): Promise<InventoryResponse | null> {
  const units = await fetchSheetUnits({ revalidate: 300 });
  if (!units) return null;
  return {
    generatedAt: new Date().toISOString(),
    source: "live",
    count: units.length,
    units,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterCompound =
    searchParams.get("compound")?.trim().toLowerCase() || "";
  const filterSegment = searchParams.get("segment")?.trim().toLowerCase() || "";
  const filterMode = searchParams.get("mode")?.trim().toLowerCase() || "";
  const filterLimit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 0;

  const snapshotData = snapshot as unknown as {
    generatedAt?: string;
    count?: number;
    segments?: any;
    compoundCounts?: Record<string, number>;
    compoundSegmentCounts?: Record<string, Record<string, number>>;
    units?: InventoryUnit[];
  };

  const sourceResponse =
    (await fetchSupabaseListings()) ??
    (await fetchDomain()) ??
    (await fetchLive()) ??
    snapshotResponse();
  let filteredUnits = (sourceResponse.units || []).filter(
    (u: any) =>
      u.party !== "Owner" &&
      u.sourceType !== "owner" &&
      u.segment !== "owners_rent" &&
      u.segment !== "owners_buy" &&
      u.tag !== "Direct Owner",
  );

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

  if (filterLimit > 0 && filteredUnits.length > filterLimit) {
    filteredUnits = filteredUnits.slice(0, filterLimit);
  }

  const payload: InventoryResponse = {
    generatedAt: sourceResponse.generatedAt || new Date().toISOString(),
    source: sourceResponse.source,
    count: filteredUnits.length,
    segments: sourceResponse.segments,
    compoundCounts: sourceResponse.compoundCounts,
    compoundSegmentCounts: sourceResponse.compoundSegmentCounts,
    units: filteredUnits,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
