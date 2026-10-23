# Sierra Estates — Automation Architecture

**Updated:** 2026-10-11 (master-execution run, branch `agents/master-execution-glm`)

## Scheduling topology (target state)

```text
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

```text
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

```text
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

## 2026-10-12 — EC2 runner hardening (P0-9)

The `future-plan/sprint-2` merge (#306, commit cb42ef8) reintroduced two
scheduler regressions; both are closed on `agents/p0-intake-gate-fixes`:

1. **Hardcoded local fallback rows removed.** The runner briefly shipped
   `rows = [{ slug:'owner-outreach', status:'active' }, { slug:'units-sync', ... }]`
   as a local default when Supabase was unconfigured — inventing active
   scheduled work with no persisted authority. Now: Supabase unconfigured OR
   a workflows-read failure → the scheduler stays IDLE for that pass
   (fail-closed). HTTP manual runs by authenticated operators still work.
2. **Hourly owner-outreach window is status-gated.** The 10:00–20:00 Cairo
   hourly batch now queues only when the PERSISTED `owner-outreach` row is
   `active`, and `runWorkflow()` re-checks the row status immediately before
   spawning the child for every automatic trigger (cron / hourly-window /
   studio run-request). A paused or draft workflow can no longer be fired by
   a local timer, and a failed status read also fails CLOSED.
   Explicit `POST /api/workflows/:slug/run` by an authenticated operator is
   the only manual override (honestly labelled `trigger: manual`).

## 2026-10-12 — Intake correlation + event state machine (P0 3A/3B/3C)

Migration `20261012_029_intake_correlation_event_states.sql` (additive):

- `owner_inbound_events` gains `state / attempts / last_error / lease_until /
  processed_at / result / unit_id` — a durable
  `RECEIVED → PROCESSING → COMPLETED | FAILED` machine. COMPLETED replays
  return the stored result; FAILED replays RESUME the pinned intake; the
  claim is an atomic conditional PATCH (service-role client) with a 10-minute
  lease; a ledger OUTAGE fails closed (no side effects).
- The partial unique index "one open intake per sender" is DROPPED and
  replaced by service-level correlation:
  explicit intake code → quoted-message context (event.intake_id) → single
  unambiguous open intake → durable `AMBIGUOUS_REPLY` staff queue.
  A clearly-different compound opens a NEW intake for the same owner.
  Dedupe protection is preserved by the event ledger + unique intake codes +
  fingerprint hashes.
- New durable states: `UNASSIGNED_MEDIA` (media-only message with no
  unambiguous target — the image is never discarded) and `AMBIGUOUS_REPLY`.

Canonical codes (P0 3F): intake codes stay `SE-<SRC>-<stamp>-<rand>` (stable
owner-facing references), while the LISTING code derives from the established
Sierra coding scheme (`generateSierraCode` — deterministic on retries) when
compound/rooms/price evidence exists, else `NEEDS_CODE` for staff assignment.
