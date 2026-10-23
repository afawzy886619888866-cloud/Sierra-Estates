# Backend Tests

This document describes the backend test suite for the Sierra Estates
consolidated repository. The backend has two stacks:

| Stack              | Location      | Framework / Runtime         | Test runner |
| ------------------ | ------------- | --------------------------- | ----------- |
| Python FastAPI     | `apps/api/`   | FastAPI + Pydantic + uvicorn | pytest      |
| Firebase Functions | `functions/`  | firebase-functions v2 (TS) + v1 (JS) | jest        |

## Quick start

From the repo root:

```bash
./scripts/test-backend.sh           # run both Python and JS
./scripts/test-backend.sh --python  # python only
./scripts/test-backend.sh --js      # js only
```

The script installs dependencies on demand (pytest, fastapi, jest,
firebase-admin, …) and compiles `functions/src/*.ts` → `functions/lib/`
before running jest.

## What's covered

### Python (`apps/api/test_main.py`) — 21 tests

- **`/health` endpoint** — happy path + method-not-allowed for non-GET verbs.
- **`/property-finder/format`** — happy path, missing required `id` (422),
  partial fields, non-object body, wrong-type `id`.
- **`/property-finder/sync`** — single asset, multiple assets, empty list,
  missing `assets` field, malformed asset.
- **`PropertyFinderSyncHub`** unit tests (no FastAPI, no network) — full
  payload, missing keys, batch sync shape, zero assets, endpoint URL.
- **`PortfolioAsset` Pydantic model contract** — required `id`, type
  validation, optional-field defaults, `price` accepts int or float.

### Firebase Functions (`functions/__tests__/`) — 26 tests

- **`transform.test.js`** (existing, 7 tests) — covers `parsePrice` and
  `normalizeProperty`, including the regression for formatted price strings
  like `"EGP 2,500,000"`.
- **`backend.test.js`** (new, 19 tests) — covers:
  - `collectData.js` HTTP handler — method validation, body validation,
    successful ingest, error propagation, known limitation (arrays satisfy
    `typeof === 'object'`).
  - `processData.js` Firestore trigger — normalization, safe defaults,
    formatted-price regression, error path marks raw doc as
    `processed_error`.
  - TypeScript v2 implementation (`src/index.ts`) — health check, collectData
    (v2), processDataForApp (v2) including a pinned regression test for the
    bare `parseFloat` bug that `transform.js` was created to fix.
  - Legacy JS barrel (`index.js`) — re-exports both handlers.

The Firebase modules are tested by mocking `firebase-admin` and
`firebase-functions` with a small in-memory Firestore substitute. No real
Firebase project is needed.

## Bugs found by the tests

The test suite intentionally pins two known issues so they don't silently
regress further. Each is documented inline in `backend.test.js`:

1. **Arrays pass the body-type guard in `collectData.js`** —
   `typeof [1,2,3] === 'object'` is `true` in JS, so the current
   `if (!payload || typeof payload !== 'object')` check accepts array bodies.
   Fix: add `|| Array.isArray(payload)`.

2. **TypeScript v2 `processDataForApp` truncates formatted price strings** —
   `src/index.ts` uses `parseFloat(rawData['price'])` directly, which turns
   `'1,000'` into `1` and `'EGP 2,500,000'` into `NaN` (→ 0). The JS pipeline
   (`transform.js` → `parsePrice`) was specifically written to fix this; the
   TS version should re-use it.

## CI

`.github/workflows/backend-tests.yml` runs both suites on every push / PR
that touches the backend paths (`apps/api/`, `functions/`,
`packages/api|db|auth|config/`).

## Dead-code analysis

After cleanup, the backend has zero real dead-code findings:

- Python (`apps/api/main.py`, `apps/api/property_finder_sync.py`): all
  remaining vulture warnings are false positives (Pydantic `Field()`
  descriptors and FastAPI route handlers — used at decorator time, invisible
  to static analysis).
- TypeScript (`functions/`): `tsc --noUnusedLocals --noUnusedParameters`
  passes cleanly. `ts-prune` reports 5 "unused exports" (`api`,
  `healthCheck`, `processBatch`, `collectData`, `processDataForApp`) — these
  are the Firebase Function entry points and MUST be exported for the
  Firebase runtime to discover them.

Thirteen dead files were removed from `apps/api/` during consolidation
(duplicates already migrated to `scripts/python/` and `packages/db/lib/dsl/`
per `docs/MIGRATION_REPORT.md`). The consolidation manifest
(`_archived_repos/MANIFEST.json`) was removed from the working tree; recover it
via git if needed (`git checkout ee5d50c6^ -- _archived_repos/MANIFEST.json`) —
see `docs/obsidian-vault/Repo Cleanup & Rebuild Ledger.md`.
