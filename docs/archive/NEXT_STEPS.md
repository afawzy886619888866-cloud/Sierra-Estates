# Active backlog and legacy archive

This file is intentionally short and status-based. It records the current engineering priorities and separates them from stale legacy plans that were superseded by the canonical Vercel + Supabase architecture.

## Current focus

- Enforce canonical backend usage across high-volume write boundaries.
- Keep worker jobs separated from request-path code.
- Validate deployment and backend policy early in CI/CD and release checks.
- Keep docs and runbooks aligned with the active architecture.

## In active use

- `DEPLOYMENT.md` as the canonical architecture and deployment policy
- `CLAUDE.md` as the AI/session operating brief
- `packages/db/lib/backend-policy.ts` and `scripts/check-backend-policy.mjs` as backend guardrails
- `pnpm check:backend` and `pnpm deploy:check` as release validation steps

## Legacy material

Older Firebase-era deployment notes, emulator playbooks, and direct Firebase-hosting guidance are kept only as archived context. They are not part of the active workflow and should not be used as operational instructions.

## Completed in this session (2026-09-12)

- **Track A (Critical Security Remediation)**: Resolved lone Critical Dependabot advisory (CVE-2026-59873, GHSA-23hp-3jrh-7fpw) by updating `tar` from vulnerable `6.2.1` to patched `7.5.22` in `pnpm-workspace.yaml` overrides and re-locking in `pnpm-lock.yaml`.
- **Track B (Remote MCP Endpoint & OAuth 2.1)**: Executed live smoke validation against `https://sierra-estates.net` — 19/19 assertions passed across RFC 8414 metadata, RFC 7591 DCR, PKCE authorization flow, token exchange, and Streamable-HTTP tool listing. All 29 unit tests in `oauth-mcp.test.ts`, `mcp-http-route.test.ts`, and `tool-bridge.test.ts` pass cleanly.
- **Track C (CI/CD Diagnostics)**: Root-caused GitHub Actions `startup_failure` (2,000 monthly quota exhaustion on private repo under GitHub Free plan). Verified local pre-flight gates (`type-check`, `check-backend-policy`, `check-public-env-safety`, `check-no-compiled-twins`).
- **Track D (Canonical Supabase Enforcement)**: Verified Supabase Postgres/pgvector as the sole authoritative backend for all writes (`InventoryDomainService`, `records.ts`, `listings`). Cleaned residual legacy references in system prompts.
- **Track E (Complete Dependabot Backlog Elimination)**: Traced and purged obsolete `hint` linter devDependency tree, permanently closing 13 npm vulnerabilities (`ws`, `tar-fs`, `extract-zip`, `image-size`, `fast-xml-parser`, `file-type`, `got`). Overrode `sharp: 0.35.4`, `js-yaml: 3.15.2`, `vitest: 4.1.11`, and `uuid: 11.1.1`. Upgraded `accelerate` to `1.15.0` in `tools/claude-proxy`. **18 out of 18 alerts in `pnpm-lock.yaml` are closed** (repository alerts reduced from 31 down to 1).
- **Track F (PostGIS Spatial & Proximity API)**: Created spatial utility functions (`calculateHaversineDistanceKm`, `calculateBoundingBox`, `toGeoJsonFeature`, `toGeoJsonFeatureCollection`) in `spatial-utils.ts`. Built dedicated `/api/listings/spatial` endpoint returning GeoJSON FeatureCollections and metadata with distance calculations. Integrated PostGIS RPC `get_listings_near_capital` into the unified `/api/listings` endpoint (`?lat=...&lng=...&radiusKm=...`). Added comprehensive unit test suite covering math, validation, and endpoint integration with 10/10 passing tests.
- **Track G (Client-Side Map Spatial & Radius Integration)**: Extended `LiveMap.tsx` and `PropertiesPage.tsx` with dynamic Leaflet `<Circle>` radius rendering, interactive glassmorphic radius selector pills (Any / 5km / 10km / 25km / 50km), real-time `/api/listings/spatial` queries, distance badges on unit pins and popups (`· 2.4 km`), and click-to-center radius positioning on compound pins.
- **Track H (AI Agent Fleet & Supabase Executive Briefing)**: Upgraded `scripts/generate-daily-briefing.ts` to aggregate real-time metrics directly from Supabase PostgreSQL (9,534 active listings, 17.78 Billion EGP active portfolio volume, top compound distribution hubs, and live AVM arbitrage picks). Verified OpenClaw memory diagnostics (`openclaw:task test`) and autonomous WhatsApp NLP listing extraction (`openclaw:task ingest:sample`).
- **Track I (Deployment Readiness Gate & Monorepo Build Hardening)**: Created root `.env.local` configured with canonical Supabase credentials (`gaxfqcietzoonlmatiot`). Enhanced `scripts/verify-deploy-readiness.ts` with cross-platform `corepack.cmd pnpm` execution and fallbacks for host environments where native turbo encounters Windows DLL errors. Verified all 9/9 pre-flight deployment stages passed (`Root Configuration Files`, `Production Environment Configuration`, `Public Environment Safety`, `Canonical Supabase Backend Policy`, `Legacy Runtime Boundary`, `Supabase Master Schema Readiness`, `Packages Compilation & Type-Check`, `Client Unit & Integration Tests`, and `Git Status & Zero Working Tree Drift`) with 100% success.

- **Track J (WhatsApp Infrastructure & OpenWA Migration on AWS EC2)**: Replaced legacy `whatsapp-scraper` with the production OpenWA gateway (`ghcr.io/rmyndharis/openwa` wwebjs engine) + `n8n` stack in `infra/openwa/docker-compose.yml`. Configured all 4 Sierra Estates plugins (`gsheets-logger`, `http-action`, `faq-bot`, `after-hours`) and automated installation via `setup.sh`. Fixed container healthcheck (`curl -fsS`) resolving Docker unhealthy lock, allowing both `sierra-openwa` and `sierra-n8n` to run healthy in production. Implemented dynamic session resolution and verified live QR code generation via `verify-full-stack.ts`.

## Immediate next steps

1. Link WhatsApp session: Scan the active QR code rendered at `http://18.232.148.172:3000` (or `whatsapp_qr_active.png`) using WhatsApp on mobile.
2. Deploy latest commits to Vercel production to update `sierra-estates.net` with the client-side spatial map, chat scan features, and live WhatsApp QR portal.