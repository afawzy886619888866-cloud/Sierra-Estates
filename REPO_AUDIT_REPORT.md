# Sierra Estates Repository Audit

Date: 2026-08-25
Branch: `main`
Audited commit: `7a835493`
Scope: monorepo, Vercel Next.js app, Firebase rules, API boundaries, tests, deployment configuration, and repository architecture.

## Executive Decision

Keep Firebase for this release. The codebase has no Supabase dependency or adapter, while the application is deeply coupled to Firebase Auth, Firestore, Firebase Storage, Firebase Admin, Cloud Functions, Firestore rules, and Firebase-specific tests. A provider swap would be a migration project, not a fix for the current defects.

The immediate production blockers are configuration and operational readiness, not the choice of database provider. The current Next app builds and its automated tests pass, but production must be deployed only after Firebase Admin credentials, session secrets, cron secrets, rate limiting, and webhook credentials are verified in Vercel.

## What Is Working

- The repository is a pnpm/Turborepo monorepo with a Next.js 16 App Router application, Firebase Functions, shared packages, agents, CRM services, and automation packages.
- Vercel is configured to build the deployable app with `pnpm --filter sierra-estates-client-page build`.
- The production Next build completed successfully with TypeScript validation enabled and generated 94 routes.
- Root lint passed. Root type-check passed for all 13 configured type-check tasks. The app CI suite passed 68 suites and 704 tests.
- The Firebase rules use staff role checks for writes and a default staff-only fallback for unspecified collections.
- Cron routes use a shared `verifyCronRequest` guard that fails closed in production when `CRON_SECRET` is missing.
- Admin API routes generally use `verifyAdminRequest` or `requireRole`, and session cookies are HTTP-only.
- The app already contains production-safe improvements in `next.config.ts`, Firebase Admin initialization, and `/api/health`: framework type errors are no longer ignored, Admin calls do not pretend to succeed in production, and health reports degraded state when dependencies are unavailable.
- A deterministic code-only graph audit completed with 1,423 code files, 16,181 nodes, 33,026 edges, and 830 communities.

## Fixes Applied In This Audit

- Protected `/api/internal/*` at the edge proxy. Requests now require either a valid admin session or `X-SBR-SECRET-KEY`; production returns 503 when the internal secret is not configured and 401 for an invalid configured secret. Local development remains usable without a secret.
- Added proxy tests for missing production configuration, trusted service access, and local development access.
- Corrected `scripts/deploy-smoke-test.ts` so it sends the internal secret when configured, requires the exact expected HTTP status, and exits non-zero when any probe fails. Previously, a broad sub-400 response could be treated as success and the process never failed the deployment check.

## What Is Not Working or Still Risky

### P0: Production configuration is not proven

The local production build logged that Firebase credentials were absent and ran in limited mode. The build can therefore pass while lead writes, admin authentication, sync jobs, and Firestore-backed intelligence are unavailable. `/api/health` should be treated as a deployment readiness gate, not as a cosmetic status endpoint.

Required Vercel checks:

- `FIREBASE_SERVICE_ACCOUNT_JSON` or the complete Firebase Admin credential set
- `SESSION_SECRET`
- `SBR_SECRET_KEY` and `CRON_SECRET`
- AI provider credentials required by enabled features
- Property Finder, WhatsApp, Telegram, email, and rate-limit credentials for enabled workflows

### P1: Public catalog reads expose whole documents

`firestore.rules` and `storage.rules` allow anonymous reads for complete listing, property, media, and public asset paths. If those documents contain owner phones, internal notes, pricing metadata, audit fields, or source data, the browser can read them even when the UI does not display them. Split public projection documents from staff documents, or enforce field-level-safe collection design before loading production inventory.

### P1: Storage write validation is incomplete

Admin-only storage writes are present, but the rules do not consistently constrain content type, file size, path ownership, or image dimensions. Add explicit limits and approved MIME types for every upload path, then test them in the Firebase emulator.

### P1: Several intelligence endpoints are simulated

The agent status, recommendation, report, and memory surfaces contain deterministic or simulated fallback values. Tests can prove the contracts, but they do not prove that live Firestore, AI, Property Finder, WhatsApp, or memory services are connected. These endpoints need an explicit `mockMode`/`source` field in the UI and production telemetry until real integrations replace the fallbacks.

### P1: Test coverage is broad but shallow for the deployed surface

The app suite passes, but reported coverage is approximately 13.9% statements, 10.6% branches, and 14.1% lines. Add route-level tests for auth failures, rate limits, malformed payloads, missing credentials, webhook signatures, and Firestore failures. Add one browser-level smoke flow for public listing search, inquiry submission, admin login, and a protected internal route.

### P2: Duplicate configuration sources can drift

The repository contains both root `firestore.rules` and `apps/sierra-estates-realty/firestore.rules`; they are identical today, but `firebase.json` deploys the app copy. Keep one canonical file or add a CI equality check. The pnpm override map is also maintained in two locations and emits a warning under the installed pnpm version; verify the active override source before upgrading pnpm.

### P2: Operational smoke coverage is incomplete

The smoke script now fails correctly, but it still requires a running deployment and real production environment variables. It does not validate Firebase rule behavior, webhook signatures, database writes, or scheduled-job execution. It should run against a preview environment with seeded test data and a dedicated test secret.

## Missing

- Firebase Emulator Suite tests for Firestore and Storage rules.
- A pre-deploy environment validator that fails before build when required production variables are missing.
- End-to-end browser coverage for the public and admin journeys.
- A documented Firestore backup, restore, retention, and disaster-recovery drill.
- Firebase App Check or an equivalent abuse-control layer for direct browser SDK access.
- A complete Content Security Policy and a review of third-party script origins.
- Persistent production storage for the memory engine; Vercel local filesystem state is ephemeral.
- Real integration verification for Property Finder, WhatsApp, Telegram, email, AI providers, and the Python service.
- A source-of-truth decision for `units`, `properties`, `listings`, `houyez_listings`, and related legacy collections.
- Monitoring with actionable alerts for failed cron jobs, lead ingestion, webhook rejection, and Firestore error rates.

## Recommended Order

1. Configure and verify production secrets, deploy rules, and require `/api/health` to be ready before accepting traffic.
2. Add emulator tests and reduce public Firestore/Storage exposure to safe projection fields and controlled media paths.
3. Replace or clearly label simulated intelligence endpoints and add live integration probes.
4. Add browser E2E coverage and raise route/security coverage before enabling automated outreach or deal workflows.
5. Consolidate Firebase rule/config sources and make CI reject drift, stale dependencies, and missing environment contracts.
6. Add backups, alerting, audit retention, and a restore drill before treating the platform as production complete.

## Supabase Option

Supabase becomes a reasonable future option if the business needs SQL joins across CRM and inventory, Postgres reporting, row-level security, or pgvector search. It should be introduced behind a repository adapter, not by replacing Firebase in one pass:

1. Define canonical schemas and ownership for leads, listings, users, media, and events.
2. Export and validate Firestore data into Supabase staging.
3. Add a `packages/db-supabase` adapter and dual-write selected low-risk records.
4. Compare counts, authorization decisions, search results, and webhook outcomes.
5. Move reads by domain, then remove Firebase writes only after rollback validation.

Until that migration has an owner, timeline, data-retention plan, and rollback path, Firebase is the lower-risk choice for the existing application.

## Audit Limitations

The full graph extraction could not process documentation and images because no semantic LLM key was available; the code-only fallback was used. Two SQL files were skipped because the graphify SQL parser dependency is not installed. The supplied PR #75 URL could not be fetched from this environment, so this report is based on the local `main` checkout and its verified files.
