import 'server-only';

/**
 * Column mapping for public.listings.
 *
 * The Firestore era stored listings as free-form documents in the app's own
 * vocabulary (`beds`, `bath`, `area`, `mode`, `type`, …) across two
 * collections, `listings` and `houyez_listings`. Postgres has one table with a
 * fixed set of columns whose names come from the canonical property model
 * (`bedrooms`, `bathrooms`, `area_sqm`, `deal_type`, `property_type`, …), so
 * every write has to be translated and every read translated back — otherwise
 * an insert fails on an unknown column, or a route starts returning a
 * differently-shaped object than the frontend has always received.
 *
 * Two rules this file exists to hold:
 *
 * 1. **Nothing is dropped.** A key that has no column lands in the `raw_data`
 *    JSONB blob rather than being discarded, and `toListingRecord()` spreads it
 *    back out, so a round-trip is lossless even for fields nobody modelled.
 * 2. **The response shape never moves.** Routes keep handing the frontend the
 *    camelCase app shape; the snake_case columns stop at this boundary (the
 *    record layer in `@sierra-estates/db` does the case conversion itself).
 */

/** App field name → the camelCase name of the column that stores it. */
const COLUMN_ALIASES: Record<string, string> = {
    type: 'propertyType',
    beds: 'bedrooms',
    bath: 'bathrooms',
    baths: 'bathrooms',
    area: 'areaSqm',
    mode: 'dealType',
    finishing: 'finishingType',
    mobile: 'ownerPhone',
    comment: 'description',
    source: 'sourceChannel',
    submittedAt: 'createdAt',
    // The deployed public.listings table stores the listing agent as
    // agent_name (it never had an `agent` column); the app vocabulary says
    // `agent`, so translate instead of parking it in raw_data.
    agent: 'agentName',
    titleArabic: 'titleAr',
    location: 'locationArea',
};

/**
 * Every column on the deployed public.listings, in the camelCase form the
 * record layer uses. This mirrors the LIVE Supabase table (62 columns,
 * introspected from PostgREST) — NOT the older supabase/schema.sql draft,
 * which lists several columns (`agent`, `img`, `photos`, `tag`, `ago`,
 * `egp_m`, `usd`, `ai_score`, `zone`, `owner_type`, `verified`,
 * `publish_to_client`, …) that the deployed table does not have. Keys that
 * are not columns here land in `raw_data` (below), so a write never fails
 * on the schema cache and a read still exposes them via toListingRecord().
 */
const LISTING_COLUMNS = new Set([
    'id', 'refId', 'title', 'titleAr', 'description', 'descriptionAr',
    'compound', 'developer', 'locationArea', 'city', 'propertyType', 'dealType',
    'price', 'priceCurrency', 'bedrooms', 'bathrooms', 'areaSqm',
    'finishingType', 'deliveryYear', 'downPayment', 'installmentYears',
    'monthlyInstallment', 'roiPercentage', 'capRate', 'valuationStatus',
    'status', 'code', 'sbrCode', 'agentName', 'amenities',
    'sourceChannel', 'pfReferenceNumber', 'pfStatus', 'featured', 'isHotDeal',
    'ownerId', 'ownerPhone', 'ownerName', 'brokerName', 'brokerPhone',
    'images', 'floorPlanUrl', 'virtualTourUrl', 'latitude', 'longitude',
    'locationCoords', 'rawData', 'automation', 'furnishingStatus',
    'pricePerSqm', 'registryAssetId', 'registryStatus', 'lastSyncAt',
    'syncHash', 'syncedToRegistry', 'lastRegistrySync', 'referenceCode',
    'syncSource', 'createdAt', 'updatedAt',
    // Added by Inventory OS v2 (supabase/migrations/011_inventory_os_v2.sql —
    // applied automatically at deploy time by scripts/apply-pending-migrations.mjs).
    // Keep in lockstep with that migration's ALTER TABLE list.
    'unitCode', 'projectId', 'compoundId', 'developerId',
    'offerType', 'listingType', 'gardenSqm', 'roofSqm', 'terraceSqm',
    'plotSqm', 'floorNumber', 'unitView', 'maintenanceFeePerSqm',
    'deliveryQuarter', 'verifiedAt', 'verifiedBy', 'ownershipDocRef',
    'publishedAt', 'reservedUntil', 'reservationRef', 'daysOnMarket',
    'photoCount', 'hasFloorPlan', 'hasVirtualTour', 'dataQualityScore',
    'stale',
]);

/**
 * Translate an app-shaped listing payload into a column payload.
 *
 * Keys with no column are collected into `rawData` instead of being dropped:
 * the admin create/update endpoints accept a passthrough body, so unmodelled
 * fields are expected rather than exceptional.
 */
export function toListingColumns(input: Record<string, unknown>): Record<string, unknown> {
    const columns: Record<string, unknown> = {};
    const extras: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        const column = COLUMN_ALIASES[key] ?? key;
        if (LISTING_COLUMNS.has(column)) {
            columns[column] = value;
        } else {
            extras[key] = value;
        }
    }

    if (Object.keys(extras).length > 0) {
        columns.rawData = { ...(columns.rawData as object | undefined), ...extras };
    }
    return columns;
}

/**
 * Translate a stored row back into the app shape the API has always returned.
 *
 * `rawData` is spread first so a real column always wins over a stale copy of
 * the same field that an older write parked in the blob.
 */
export function toListingRecord(row: Record<string, unknown>): Record<string, unknown> {
    const { rawData, ...rest } = row as Record<string, unknown> & { rawData?: Record<string, unknown> };

    const record: Record<string, unknown> = { ...(rawData ?? {}), ...rest };

    // Re-expose the app-vocabulary aliases alongside the canonical columns, so
    // a consumer reading `beds`/`area`/`mode` sees what it always saw.
    for (const [appKey, column] of Object.entries(COLUMN_ALIASES)) {
        if (record[appKey] === undefined && rest[column] !== undefined) {
            record[appKey] = rest[column];
        }
    }
    return record;
}
