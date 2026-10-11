# Sierra Estates — Automation Architecture

**Updated:** 2026-10-11 (master-execution run, branch `agents/master-execution-glm`)

## Scheduling topology (target state)

```
Google Cloud Scheduler (5 jobs, europe-west1)
  └─> Google Cloud Workflow  se-automation-dispatch  (infra/google-cloud/workflows/dispatch.yaml)
        └─> HTTPS  {SITE_URL}/api/cron/dispatch/{target}?source=gcp-scheduler  (Bearer cron_secret)
              └─> Vercel dispatcher  app/api/cron/dispatch/[job]/route.ts
                    ├─ verifyCronRequest (CRON_SECRET, fail-closed; cronOwnerGuard)
                    ├─ hasRecentSuccess(job, dedupeHours)  ← overlap guard
                    ├─ in-process job invocation (dynamic import)
                    └─ automation_runs ledger + failed_orchestrations DLQ

Vercel Cron (temporary fallback)   02:45 / 06:45 UTC   night | morning
GitHub Actions (manual only)       workflow_dispatch   12-target matrix
```

- **GCP is the intended production scheduler** (5 jobs: night 02:10, morning 06:10, whatsapp hourly :10, timers :25/3h, sync-leads 10:10 — see `infra/google-cloud/scripts/create-scheduler-jobs.sh`).
- **Vercel crons stay as fallback** until one safe overlap cycle is observed (GCP `:10` runs; Vercel `:45` must record `skipped (recent_success)`).
- **GitHub Actions is manual-only** (`on: workflow_dispatch`) — never a production scheduler.
- Unscheduled by design: `scraper`, `apply-migrations`. Orphan (no schedule anywhere): `price-index` cron route.

## 2026-10-11 repairs

1. `dispatch.yaml` `sys.get_env("GOOGLE_CLOUD_PROJECT_ID")` → `GOOGLE_CLOUD_PROJECT` (+ `args.projectId` override). The old name is not exposed by Workflows; every execution failed at the Secret Manager read.
2. `app/api/admin/workflow-ops/route.ts` hardcoded `http://54.89.162.250:2786` fallback removed — env-only (`WORKFLOW_OPS_URL` / `OPENWA_HOST`+`RUNNER_PORT`); explicit 503 when unconfigured.
3. Live stack (read-only probes): runner + gateway on `54.89.162.250` healthy; session `ready` on phone `201031622600`. `18.232.148.172` references are stale.

## Owner-intake automation path (Phase 2 rework)

```
OpenWA gateway (54.89.162.250:2785, session ready)
  ├─ global webhook → POST /api/webhooks/whatsapp  (X-SBR-Secret-Key, fail-closed)
  │     ├─ redacted structured log (no raw PII)
  │     ├─ OpenWA envelope flattened; message id + media extracted
  │     ├─ August owners group → AugustOwnersAgentService (thin wrapper)
  │     │      └─ OwnerListingIntakeService.processOwnerMessage()
  │     ├─ media-only owner-group msg → OpenWAMediaAdapter download attempt
  │     └─ broker groups → WhatsAppParserService (unchanged)
  ├─ per-session subscription → EC2 runner /api/inbound (workflows/lib/inbox.js)
  └─ scraper/harvester → POST /api/ingest/whatsapp (base64 media path)

Telegram bot
  └─ POST /api/telegram/webhook  (secret token, fail-closed)
        ├─ update_id ledger (telegram_processed_updates) — replay-safe
        ├─ photos via getFile → OwnerListingIntakeService
        └─ commands (honest responses; no mock data)

OwnerListingIntakeService (the ONE intake path)
  ├─ owner_inbound_events     (source, message_id) unique → replay dedupe
  ├─ owner_listing_intakes    durable lifecycle:
  │     RECEIVED → PARSING → NEEDS_INFORMATION / NEEDS_CODE
  │     → REVIEW_REQUIRED → (staff) HUMAN_VERIFIED → PUBLISHABLE → PUBLISHED
  │     (+ DUPLICATE / FAILED retryable)
  ├─ open intake per sender   → replies MERGE, never a second unit
  ├─ cross-source fingerprint → duplicate units linked, not duplicated
  ├─ media → Supabase Storage (listing-photos) → same intake/unit
  ├─ canonical listings row written EXACTLY ONCE (REVIEW_REQUIRED, private)
  └─ staff notifications (Telegram + admin WhatsApp) with persistent code
```

## Publish pipeline (Phase 4)

```
Any caller (admin UI, sync route, cron import, intake completion)
  └─ PFIntegrationService.publishListing(unitId, { dryRun? })
        ├─ PublishGate.evaluate(unit)  — 8 C6 conditions + PUBLISHABLE classification
        │     (lib/services/publish-gate.ts — enforced IN the service, no bypass)
        ├─ idempotency: alreadyPublished short-circuit
        ├─ completeness + PF location resolution (no invented defaults)
        ├─ EgyptListingValidator (both dry-run and live)
        ├─ dryRun → return, NO remote call (PF_DRY_RUN env also supported)
        ├─ createListing → publishListing(remote) → only THEN mark published
        └─ failure of the publish step → pfStatus='pending_publish' (retryable)
```

REVIEW_REQUIRED means private staging — the public website/map/feeds gate
(RLS 020 + API filters) and the outbound PF gate now agree.

## Known outstanding items

- GCP scheduler jobs not yet created (needs authenticated `gcloud` + billing check).
- OpenWA media download endpoint unverified against the deployed gateway build.
- `automation_runs` last live rows predate the GCP design (Vercel-cron era).
- Two applied migrations share ledger number `026` (tolerated; do not rename applied files).
