# 05 — Inventory wiring, pass 1 (additive only)

**What changed:** two live routes gained two previously-unpopulated fields from
the existing `Unit` schema (`lib/models/schema.ts`) — `dupeCheckHash` and
`syncSource`. No existing field was renamed, removed, or had its value logic
changed. Verified: strict tsc against the repo's actual `tsconfig.base.json`
compiler options produces zero new errors on either file.

| Route | Fields added | Notes |
|---|---|---|
| `POST /api/admin/listings` | `dupeCheckHash` (real fingerprint), `syncSource: 'manual'` | fingerprint only computed when bedrooms+area+price are all present |
| `POST /api/properties/sync` | `syncSource: 'property-finder'`, `lastSyncAt` | `dupeCheckHash` deliberately NOT set — see gap below |

## Known gaps (tracked, not silently patched)

1. **Admin SPA has no offerType field.** `dupeCheckHash` on the admin route
   hardcodes `offerType: 'sale'`. Nothing reads this field yet, so it's zero
   live risk — but it will mislabel rentals if/when a consumer starts reading
   it. Fix: add an offer-type toggle to the admin listing form, thread it
   through `mapSpaToListingPatch`.

2. **PropertyFinderListing has no `area`/size field anywhere in
   `lib/propertyFinder-service.ts`.** The dedupe fingerprint requires area to
   be meaningful; faking it would produce a wrong dedupe key, worse than no
   key. `/api/properties/sync` was left without `dupeCheckHash` for this
   reason. Fix: confirm whether the real Property Finder API response has a
   size/area field that just isn't mapped yet, or whether it's genuinely
   absent from their payload.

## Deliberately not touched this pass

- `/api/ingest/whatsapp`, `/api/cron/ingest-from-sheets` — write to
  `broker_listings`, which feeds the S1–S10 `OrchestratorService` pipeline
  (Scribe → Curator → Matchmaker → Closer), not a plain inventory table.
  Wiring dedupe here needs a design decision about where in that pipeline
  inventory-identity dedupe belongs — not a bolt-on. See FUTURE_PLAN/04.
