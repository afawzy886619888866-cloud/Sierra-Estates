# Inventory Domain Service (v1)

One entry point for every listing ingestion path + a real lifecycle behind the
"verified listings" claim. See docs/FEATURE_INVENTORY.md §8 and FUTURE_PLAN/04 §D.

- `upsertFromSource(source, payload)` — dedupe by business fingerprint (compound + type + offer + beds + area band + price band). Trusted feeds (PF, admin) start at `pending_verification`; scrapes start at `draft`.
- `transition(id, to, actor, note?)` — guarded state machine with audit history. `reserved` requires a payment-intent ref (pairs with payment-service.ts).
- `verifyAndPublish`, `sweepStale` (30-day freshness SLA, wire into /api/cron/maintenance), `isCountedVerified`, `matchesCriteria`.

Integration steps (backend only, no frontend change):
1. Wire `/api/properties/sync`, `/api/ingest/whatsapp`, `/api/cron/ingest-from-sheets`, `/api/admin/listings` POST to call `upsertFromSource`.
2. Add `sweepStale` call to `/api/cron/maintenance`.
3. Public `/api/listings` filters on `PUBLIC_STATUSES`.
4. Migration script: backfill `fingerprint` + `status='published'`, `verifiedAt=now` for current live listings, then dedupe report.
