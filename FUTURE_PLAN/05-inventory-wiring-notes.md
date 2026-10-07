# 05 — Inventory wiring, pass 1 (additive only)

**What changed:** two live routes gained two previously-unpopulated fields from
the existing `Unit` schema (`lib/models/schema.ts`) — `dupeCheckHash` and
`syncSource`. No existing field was renamed, removed, or had its value logic
changed. Verified: strict tsc against the repo's actual `tsconfig.base.json`
compiler options produces zero new errors on either file.

| Route | Fields added | Notes |
| --- | --- | --- |
| `POST /api/admin/listings` | `dupeCheckHash` (real fingerprint), `syncSource: 'manual'`, `offerType` / `dealType` | fingerprint computed when bedrooms+area+price are present; respects explicit offerType toggle |
| `POST /api/properties/sync` | `syncSource: 'property-finder'`, `lastSyncAt`, `areaSqm`, `dealType`, `offerType`, `dupeCheckHash` | fingerprint computed when bedrooms+area+price are present from mapped Property Finder `size`/`area` |

## Known gaps (status update — 2026-10-07)

1. **Admin SPA offerType toggle [RESOLVED — 2026-10-07]:**
   - Added segmented Offer Type toggle (`For Sale` / `For Rent`) to the admin listing form (`components/admin/EasyListingStudio.tsx`), submitting both `mode` and `offerType`.
   - Threaded `offerType` through `mapSpaToListingPatch` and `mapListingToSpa` in `lib/server/admin-spa-mappers.ts`.
   - Removed the hardcoded `offerType: 'sale'` in `POST /api/admin/listings`: `offerType` now dynamically resolves `(patch.offerType) ?? parsed.data.offerType ?? parsed.data.offer ?? 'sale'`, properly powering both storage and the `fingerprint()` dedupe computation for rentals and sales alike.

2. **PropertyFinderListing size/area field investigation [RESOLVED — 2026-10-07]:**
   - **Investigation Result:** Confirmed that the real Property Finder API (Atlas v1/v2) returns `size` (either numeric/string or `{ value, unit }`) and `area` (as established in `scripts/sync-pf-real-data.mjs` and `lib/services/sync-engine.ts`). The field was present in the API payload but omitted from `PropertyFinderListing` typing.
   - **Resolution:** Added `size?: number | string | { value?: number | string; unit?: string }` and `area?: number | string` to `PropertyFinderListing` in `lib/propertyFinder-service.ts`.
   - Mapped `extractArea(property)` to `areaSqm` and enabled `dupeCheckHash` computation via `fingerprint()` in `app/api/properties/sync/route.ts` when compound/location, propertyType, offerType, bedrooms, area, and price are present.
   - Added `'dupeCheckHash'` to `LISTING_COLUMNS` in `lib/server/listing-columns.ts` to allow persistence into `public.listings.dupe_check_hash`.

## Deliberately not touched this pass

- `/api/ingest/whatsapp`, `/api/cron/ingest-from-sheets` — write to
  `broker_listings`, which feeds the S1–S10 `OrchestratorService` pipeline
  (Scribe → Curator → Matchmaker → Closer), not a plain inventory table.
  Wiring dedupe here needs a design decision about where in that pipeline
  inventory-identity dedupe belongs — not a bolt-on. See FUTURE_PLAN/04.
