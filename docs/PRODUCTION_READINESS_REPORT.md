# SIERRA ESTATES — PRODUCTION READINESS REPORT

**Execution run:** 2026-10-11 · GLM master-execution pass (branch `agents/master-execution-glm`)
**Baseline HEAD:** `1dd7f90fe987f214c0c8a782620d4c4dcaca3bad`
**Working branch:** `agents/master-execution-glm` (additive commits; no history rewrite; no force-push)

This report separates **code-tested**, **deployment-verified** and **live-account-verified** outcomes. Nothing is claimed as working without evidence. No secrets are included anywhere in this document.

---

## 1. Verdict

`NOT READY — BLOCKED BY EXTERNAL ACCESS (for live cutover); code-side P0 fixes COMPLETE and code-tested`

- The outbound Property Finder publish gate, the durable owner-intake path, RBAC repairs and scheduler fixes are implemented, regression-tested (1524/1524 tests green) and type-checked.
- Live cutover items that require operator action or credentials not available in this run are listed in §12 with the exact required action.
- Live read-only verification DID succeed for the AWS/OpenWA stack (§8): the runner and gateway on 54.89.162.250 are alive, paired and `ready`.

---

## 2. Publish gate and Property Finder safeguards (Phase 4) — CODE-TESTED

The complete C6 gate now lives **inside** `PFIntegrationService.publishListing()` (`apps/sierra-estates-realty/lib/services/PFIntegrationService.ts`) with the pure evaluator in `lib/services/publish-gate.ts`. No caller can bypass it — the service itself rejects ineligible records:

| # | Condition | Enforcement |
|---|-----------|-------------|
| 0 | `publish_status = PUBLISHABLE` (staging guard) | REVIEW_REQUIRED / INCOMPLETE / STALE / EXPIRED / DUPLICATE records can never be externally published |
| 1 | Confirmed available status | `availability='available'` or an available-status with availability unset |
| 2 | Valid price AND currency | price > 0 and a recorded currency (EGP/USD/AED/EUR/GBP/SAR) |
| 3 | Valid property type | strict PF type map — unknown types FAIL (the silent `apartment` default was removed) |
| 4 | Usable, source-backed location | compound/location/city present + PF location resolution (no location-id-1 fallback) |
| 5 | Valid contact + authorized purpose | reachable phone (≥8 digits) + known ownerType |
| 6 | Quality score ≥ 75 | `data_quality_score` must be computed and meet the threshold |
| 7 | Fresh human verification + staff provenance | `verified_at` ≤ 30 days (Fresh ≤7 / Aging ≤30) AND `verified_by` present — owner replies and owner-direct classification never count |
| 8 | ≥ 3 real photos | ≥3 real http(s) image URLs (captions/data-URIs/placeholders rejected) |

Additional service-level fixes:
- **Idempotency:** a unit already carrying `automation.isPublishedToPF` + `pfReferenceNumber` returns `alreadyPublished` instead of creating a duplicate remote listing.
- **Ordering:** `isPublishedToPF` is written only AFTER the remote publish succeeds; a failed publish step marks `pfStatus='pending_publish'` (honest, retryable).
- **Dry-run:** `publishListing(unitId, { dryRun: true })` or `PF_DRY_RUN=true` validates gate + provider field contract without any remote call.
- **Callers cleaned:** the autonomous publish call in `AugustOwnersAgentService` (which published REVIEW_REQUIRED records it had just created) was REMOVED; the fabricated `PF-SE-AUG-…` references are gone (a PF reference exists only after genuine remote acceptance).
- Regression tests: `__tests__/publish-gate.test.ts` (20 assertions incl. replay of every bypass class).

---

## 3. Owner-to-inventory path (Phase 2 + 3) — CODE-TESTED

One reusable server-side intake path now exists: `lib/services/OwnerListingIntakeService.ts` + migration `supabase/migrations/20261011_027_owner_listing_intake.sql`.

- **Durable-first:** the intake record (`owner_listing_intakes`) is created BEFORE the owner is asked for missing fields. A reply can never depend on volatile process state.
- **Reply merging:** exactly one open intake per sender (`NEEDS_INFORMATION`/`NEEDS_CODE`); follow-ups merge into the same intake and the same canonical unit. Tests prove no second unit is created.
- **Idempotency:** `owner_inbound_events` with a unique `(source, message_id)` index — replayed webhooks are rejected at the database level.
- **Cross-source dedupe:** fingerprint over compound/type/beds/area/price-bucket/mode (not the old exact sender+text hash).
- **Canonical record exactly once:** one `listings` insert (the old double insert through `COLLECTIONS.units` — the same table — was removed). New units are `REVIEW_REQUIRED`, `verified:false`, private.
- **Lifecycle states:** `RECEIVED → PARSING → NEEDS_INFORMATION / NEEDS_CODE → REVIEW_REQUIRED → HUMAN_VERIFIED → PUBLISHABLE → PUBLISHED` + `DUPLICATE` / `FAILED` (retryable against the same intake id/code).
- **Photos:** media embedded in gateway payloads is stored to the Supabase `listing-photos` bucket and linked to the intake/unit; the OpenWA media adapter (`lib/server/openwa-media-adapter.ts`) attempts the gateway download when only a message id is available, and reports the exact blocker when the deployed gateway exposes no media endpoint (explicit adapter interface per the master command).
- **PII:** the raw webhook body log was removed; a structured, redacted metadata log replaces it. Raw text lives in the database (redacted excerpt), never in platform logs.
- **Group sends repaired:** the OpenWA sender destroyed `@g.us` group destinations (every recipient was rewritten to `@c.us`), so clarification prompts never reached the owners group. Group chat ids are now preserved verbatim.
- Entry points rewired: live webhook (`/api/webhooks/whatsapp`) routes August-owner-group messages (text AND media-only) through the intake service; `/api/ingest/whatsapp` continues to feed the scraper path into the same service.

## 4. WhatsApp chat scanner (Phase 5) — CODE-TESTED

`app/api/admin/whatsapp/scan/route.ts`:
- `verified: unit.isOwner` REMOVED — source classification is a signal (`sourceClass: owner_group | owner_signal | broker`), never human verification.
- All fabricated parse defaults removed (compound / type / area / beds / baths / price / finishing / phone fallback `+201000000000` → null).
- Hardcoded `confidence 95/82`, `valuationScore 85`, `urgencyScore 70` removed.
- Scanned units insert with `publishStatus: 'REVIEW_REQUIRED'`; brokers are labeled `Broker` (not `Broker Verified`).
- Local JSON snapshot staging removed — Supabase is the only canonical store.
- Duplicate input links to the existing record; missing code inputs stage `NEEDS_CODE`.

## 5. Admin portal, RBAC and Google OAuth approval (Phase 7) — CODE-TESTED

- **Users API** (`/api/admin/users`): returns the REAL persistent `profiles.status` (was hardcoded `active`); `unconfirmed` for legacy NULL rows. PUT accepts the full canonical role vocabulary with **default-deny elevation** (only `superadmin` may assign elevated roles). New POST approves/denies access requests (super-admin only) with an audit trail.
- **Canonical role map:** `lib/types.ts` `ROLE_PERMISSIONS` — one source of truth for the 9 required roles (`superadmin`(=super_admin), `admin`, `operations_manager`, `inventory_manager`, `marketing_manager`, `sales_manager`, `sales_agent`, `auditor`, `partner`) plus the preserved legacy roles, mapped onto the SAME `profiles.role` column (migration `20261011_028_role_check_extension.sql` — strictly wider CHECK; `pending` status + `access_requests` table with RLS).
- **OAuth approval lifecycle:** an authenticated-but-unprovisioned Google identity now creates a DURABLE pending profile + `access_requests` row (never access, never silent approval). Approval/denial is super-admin-only; `ADMIN_APPROVAL_EMAIL` names the notification inbox (no email provider is wired into this path today — exact blocker recorded, not silently approved).
- **Session revocation:** `enforceSessionAccountStatus()` re-checks the live profile status on `GET /api/auth`, `verifyAdminRequest` and `verifyPortalRequest` — suspended/deleted/pending accounts are rejected even mid-cookie-TTL; production fails closed.
- `AdminPortal.tsx` default role `super_admin` (underscore — matched no vocabulary) corrected to `superadmin`.
- Mock-login/dev bypasses remain fail-closed in production (verified unchanged by the existing auth tests).

## 6. Telegram channel (Phase 6) — CODE-TESTED

- `/api/telegram/webhook`: `update_id` idempotency ledger (`telegram_processed_updates`, migration 027); REAL photo intake via `getFile` → the same canonical `OwnerListingIntakeService`; listing-shaped text opens durable intakes; ALL mock/demo data replaced with honest notices; auth unchanged (shared secret, fail-closed).
- `/api/webhooks/telegram`: the mutating `/approve` path is now idempotent via the same ledger.

## 7. Scheduler migration (Phase 8) — CODE-TESTED / LIVE-UNVERIFIED

- `infra/google-cloud/workflows/dispatch.yaml`: the `sys.get_env("GOOGLE_CLOUD_PROJECT_ID")` bug (an env name GCP Workflows does not expose — the Secret Manager URL could never resolve the project) fixed to `GOOGLE_CLOUD_PROJECT` with an `args.projectId` override.
- The hardcoded `http://54.89.162.250:2786` fallback in `/api/admin/workflow-ops` was removed — runner endpoint is env-only (`WORKFLOW_OPS_URL` / `OPENWA_HOST`+`RUNNER_PORT`); unset → explicit 503.
- Known pre-existing facts restated: GCP scheduler jobs/Workflow executions have NO in-repo evidence of ever running (`GO_LIVE_CHECKLIST.md` all unchecked; `automation_runs` last live rows predate the GCP design). Vercel crons (02:45/06:45 UTC) remain the temporary fallback; the dispatcher's `hasRecentSuccess` dedupe makes overlap safe (GCP `:10` wins, Vercel `:45` skips).
- Migration ledger collision (two files numbered `026`) left untouched — renaming already-applied migrations is history rewriting; the apply script tolerates it (documented).

## 8. AWS EC2 / OpenWA — LIVE-VERIFIED (read-only, 2026-10-11 ~03:15Z)

| Check | Result |
|---|---|
| Runner `http://54.89.162.250:2786/api/health` | `ok:true`, service `se-workflow-runner`, uptime ≈3.2 days, tz `Africa/Cairo`, `supabase:true`, running `[gateway-sentinel]` |
| Gateway (via runner health) | `reachable:true`, **`status:"ready"`**, phone `201031622600`, pushName `Sierra`, `engineLoaded:true`, lastActive `2026-10-11T03:14:36Z` (live) |
| Gateway `http://54.89.162.250:2785/api/health` | `{"status":"ok"}` |
| `/pair` portal | HTTP 200 |

**Resolved endpoint conflict:** production is `54.89.162.250` (runner 2786 / gateway 2785). All `18.232.148.172` references (`infra/aws/*`, older checkpoints/scripts) are STALE. The active session phone is `201031622600` — the code defaults (`201061399688` in the runner, `201092048333` in the app pairing route) are env-configuration concerns, not live state.
Remaining concerns (unchanged, require operator): API keys transit over cleartext `http://` to a raw IP; inbound WhatsApp message ingestion end-to-end (webhook → app → Supabase) was not exercised in this run — see §12.

## 9. Google AI / RAG / $1,000 credit (Phase 10) — CODE FIX + HONEST BLOCKERS

- `packages/agents-core/src/vertex-agent.ts`: the error path that returned `success:true` with a fully fabricated "Titan Vertex AI Engine" market briefing (invented prices/yields) now returns an honest `success:false` failure. No synthetic market data is emitted anywhere.
- The **credit itself could not be inspected** — the $1,000 "Trial credit for GenAI App Builder" requires authenticated GCP billing/console access that is not available in this run. Per the master command, NO billable Google resource was created. The Agent Search prototype remains unprovisioned; the adapter (`datastoreId`, `VERTEX_SEARCH_DATASTORE_ID`, grounding tool) exists and fails honestly.
- Embedding dimension mismatch status (unchanged, now documented): the Gemini pipeline writes 768-dim vectors to `embedding_768` (consumed by nothing in the app); the legacy `vector(1536)` columns/functions have no writer. No vector writes were performed.

## 10. Brand standardization (Phase 1) — CODE-TESTED

- Active display brand is exactly `Sierra Estates` (`lib/config.ts` `branding.name`); the legal entity name is preserved separately and truthfully.
- Production-facing strings updated: owner photo-request copy, easy-listing confirmations, WhatsApp bot templates, the AI system prompt (`lib/prompts/sierra_blue_bot.ts`).
- Regression test: `__tests__/brand-config.test.ts` (blended string can never return).

## 11. Executed checks — evidence

| Gate | Result |
|---|---|
| `scripts/data-audit/build_master_inventory.py` (gate 0) | PASS — 13,043 rows; cascade: DUPLICATE 4208 / INCOMPLETE 4720 / STALE 3746 / EXPIRED 246 / REVIEW_REQUIRED 123 / **PUBLISHABLE 0** (honest: no unit currently meets the 8-condition gate — verification freshness + photos are the binding constraints, matching `docs/VERIFICATION_QUEUE.md`) |
| Workspace packages build (gate 1) | PASS |
| Workspace packages type-check (gate 2) | PASS |
| App type-check (gate 3) | PASS |
| `pnpm check:backend` (gate 4) | Script logic PASS; requires runner env (Supabase URL/anon/service keys — presence-only gate, credentials intentionally not committed) |
| `pnpm check:public-env` (gate 5) | PASS |
| `pnpm check:legacy-runtime` (gate 6) | PASS |
| App lint (gate 7) | PASS — 0 errors (44 pre-existing warnings) |
| App `test:ci` (gate 8) | **141 suites / 1524 tests — ALL PASS** (incl. new publish-gate, owner-intake, brand suites; updated August suite asserting PF never auto-publishes) |

A green deployment status is NOT claimed as evidence of live WhatsApp/AWS/GCP/PF/database workflows; the live evidence in this report is limited to §8's read-only health probes.

## 12. Remaining external blockers — exact required actions

1. **Deploy this branch** (Vercel: `sierra-estates-client-page`) and let the 8-gate preflight run in the real environment — then inspect the Vercel build log (the old GitHub Actions `startup_failure` is not evidence either way).
2. **Apply migrations 027 + 028** (`scripts/apply-pending-migrations.mjs` / deploy hook) against Supabase — the intake tables, role CHECK extension and `access_requests` table are required for the new paths.
3. **Controlled live intake test** (Phase 12 of the master command): send ONE authorized test message through the August owners group; verify the durable intake in `owner_listing_intakes`, the single `listings` row (REVIEW_REQUIRED), and the admin queue. Blocked in this run by the absence of an authorized test device/number.
4. **OpenWA media download endpoint**: verify whether the deployed wa-multi-session gateway exposes a media endpoint for a message id (adapter tries `/api/sessions/{sid}/messages/{id}/media` then `/messages/{id}`); otherwise photos continue via the embedded-base64/harvester path or the admin portal photo-request flow.
5. **GCP scheduler cutover**: needs authenticated `gcloud` access + billing confirmation before creating the 5 jobs (`create-scheduler-jobs.sh`); then one safe-cycle verification of `automation_runs` with `trigger_source='gcp-scheduler'` before retiring the Vercel `:45` fallbacks.
6. **Google credit scope inspection** (console/billing access) before ANY Agent Search provisioning.
7. **ADMIN_APPROVAL_EMAIL + an email provider** for access-request notifications (durable requests work without them; only the notification is missing).
8. **Security rotation note:** the GitHub PAT used for this run was provided in-chat; treat it as exposed to the chat transcript and rotate it after the work is merged (it was never written to any file or commit — verified).

## 13. Rollback

Every change is additive and reversible:
- Revert the commits on `agents/master-execution-glm` (single working branch; no history rewritten; no applied migration edited).
- Migrations 027/028 are `CREATE TABLE/INDEX IF NOT EXISTS` + strictly-wider CHECK constraints — dropping the new tables/rows restores the prior state without touching existing data.
- The publish gate can be temporarily loosened ONLY by explicit code change (there is no env bypass by design).
- Old webhook/parser behavior for non-owner groups is unchanged; the August path can be re-pointed to the legacy parser by reverting the webhook route block.

## 14. Daily operations checklist (operator)

1. `GET /api/health` (app) + `http://54.89.162.250:2786/api/health` (runner+gateway) — expect `ok/ready`.
2. Review queue: admin portal → verification/photo queue (REVIEW_REQUIRED units; intake codes from `owner_listing_intakes`).
3. Access requests: `/api/admin/users` (pending) → approve/deny via POST (super-admin).
4. `automation_runs` freshness for the last night/morning window; `failed_orchestrations` open rows.
5. Publish gate exceptions in logs (`PublishGateError`) are EXPECTED for unverified units — investigate only repeated remote failures (`pfStatus='pending_publish'`).
