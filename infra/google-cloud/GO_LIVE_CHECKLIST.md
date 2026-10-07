# Go-Live Checklist — GCP Scheduling & Provenance Migration

Six stages from merge to production. Do not skip stages; each one gates the
next. Print this and tick the boxes.

---

## Stage 1 — Pre-flight (before merging the PR)

- [ ] CI green on the migration branch (type-check, lint, build, tests)
- [ ] `CRON_SECRET` confirmed identical in all three places:
      Vercel env var · GitHub Actions secret · the value you will store in GCP
      Secret Manager
- [ ] Supabase migration ledger verified (Management API or dashboard):
      `20261007_026_units_sync_provenance_repair.sql` is ledgered
      (applied 2026-10-07) — the runtime applier will skip it
- [ ] Live DB sanity: `SELECT publish_status, count(*) FROM public.listings
      GROUP BY 1;` → 15,994 REVIEW_REQUIRED, 0 PUBLISHABLE (plus your pilot
      exceptions as they appear later)
- [ ] `scripts/data-audit/audit-publish-provenance-live.mjs` runs clean
      (exit 0) against the live project

## Stage 2 — Merge + deploy the app

- [ ] Merge the PR into `main`
- [ ] Vercel production deployment succeeds (watch the deploy log; the two
      `:45` cron entries are picked up on the NEXT deploy)
- [ ] `GET https://sierra-estates.net/api/health` → healthy
- [ ] Manual emergency dispatch works: GitHub → Actions → **Automations** →
      Run workflow (target = `check-availability-sla`) → green, and a fresh
      `automation_runs` row appears with `trigger_source = 'github-actions'`

## Stage 3 — GCP one-time deploy

Follow `infra/google-cloud/README.md` top to bottom:

- [ ] APIs enabled (scheduler, workflows, secretmanager, iam)
- [ ] Service accounts `se-workflow-runner` + `se-scheduler` created
- [ ] `roles/workflows.invoker` granted to the scheduler SA
- [ ] Secret `cron_secret` created + `secretAccessor` for the runner SA
- [ ] Workflow `se-automation-dispatch` deployed from
      `infra/google-cloud/workflows/dispatch.yaml`
- [ ] 5 scheduler jobs created via `scripts/create-scheduler-jobs.sh`
      (`se-automation-night|morning|whatsapp|timers|sync-leads`)
- [ ] Scraper NOT created / stays paused; `apply-migrations` unscheduled

## Stage 4 — Post-deploy smoke & dedupe verification

- [ ] Manual workflow run (`gcloud workflows run … --data='{"argument":
      "{\"targets\": \"night\"}"}'`) → execution succeeds
- [ ] `automation_runs` shows rows with `trigger_source = 'gcp-scheduler'`
- [ ] Next Vercel cron at 02:45 / 06:45 UTC records `skipped
      (recent_success)` rows (this proves the dedupe guard holds)
- [ ] At least one full daily cycle observed: GCP `:10` real runs → Vercel
      `:45` skips. One calendar day of green/red ledger rows reviewed
- [ ] Known pre-existing failures triaged separately (NOT GCP issues):
      `lead-timers` (`leads.archived` missing) · `ingest-from-sheets`
      (missing `service_account.json` on Vercel)

## Stage 5 — Pilot 50 human verification

- [ ] Generate the pilot queue: `scripts/data-audit/generate_pilot_50.py`
      (50 best candidates from REVIEW_REQUIRED)
- [ ] A human verifies all 50 units (the 8-condition gate: available, price,
      type, location, contact, quality ≥ 75, fresh human verify, photos ≥ 3)
- [ ] Verified units — and ONLY those — flip to `PUBLISHABLE` via the gate
      (policy 020); provenance columns are stamped by the human action
- [ ] Re-run `audit-publish-provenance-live.mjs` → 0 violations
- [ ] Public site shows exactly the verified inventory; REVIEW_REQUIRED
      stays invisible publicly

## Stage 6 — Monitoring & go-live

- [ ] Daily check ritual: `automation_runs` for the last 24h (success /
      skipped / failed counts), `failed_orchestrations` DLQ empty or triaged
- [ ] GCP budget alert configured (see README → Costs)
- [ ] Rollback path rehearsed on paper: pause the 5 GCP jobs → Vercel `:45`
      fallbacks keep the two daily windows alive; GHA manual dispatch covers
      the granular jobs
- [ ] This checklist filed with the release notes

**Production-ready when every box above is ticked. Until then, the system is
in pilot: scheduling is live but the public catalog must show only
human-verified inventory.**
