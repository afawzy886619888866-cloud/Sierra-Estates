# GCP Scheduling Layer — Sierra Estates Automations

One-time deployment of the **canonical scheduler** for SE automations:
**GCP Cloud Scheduler → GCP Workflows → the existing HTTP dispatcher** on
Vercel (`/api/cron/dispatch/{target}`).

This replaces GitHub Actions as the scheduled driver (GHA keeps `ci.yml` plus
the **manual emergency dispatch** in `automations.yml`) and keeps Vercel as
hosting + the **two daily fallback crons** (`:45` offsets — see
[Scheduling topology](#scheduling-topology)).

```
                    ┌─────────────────────────┐
                    │ GCP Cloud Scheduler (5) │
                    │  10 2 * * *   night     │
                    │  10 6 * * *   morning   │
                    │  10 * * * *   whatsapp  │
                    │  25 */3 * * * timers    │
                    │  10 10 * * *  sync-leads│
                    └───────────┬─────────────┘
                        OIDC POST (argument JSON)
                                ▼
                    ┌─────────────────────────┐
                    │ GCP Workflows           │
                    │ se-automation-dispatch  │
                    │ (workflows/dispatch.yaml)│
                    │  · reads CRON_SECRET    │
                    │    from Secret Manager  │
                    │  · retries on 5xx       │
                    └───────────┬─────────────┘
                                ▼  Bearer CRON_SECRET
              ┌─────────────────────────────────────┐
              │ Vercel: /api/cron/dispatch/{target} │
              │  · dedupe via automation_runs       │
              │  · per-job isolation + DLQ          │
              │  · Supabase = authoritative store   │
              └─────────────────────────────────────┘
                                ▲
             fallback (02:45 / 06:45 UTC, dedupe-guarded)
              ┌─────────────────────────────────────┐
              │ Vercel Cron (2 Hobby slots)         │
              └─────────────────────────────────────┘
```

## Why GCP

| Before (Phase 11) | After (this layer) |
|---|---|
| GitHub Actions = canonical scheduler | GCP Cloud Scheduler = canonical (free tier: 5 jobs here, 3 free… see [Costs](#costs)) |
| GHA minutes burn on every cron fire | GHP Scheduler + Workflows are effectively free at this volume |
| Vercel Hobby: only 2 daily crons possible | GCP gives hourly (`whatsapp`) + 3-hourly (`timers`) granularity |
| Schedule list lived in YAML | Same single dispatcher; schedules live here + `automation-jobs.ts` registry |
| Emergency = GHA manual dispatch | Same, retained (plus `gcloud workflows run`) |

Everything the dispatcher already guarantees still applies: per-job
`automation_runs` ledger rows, dedupe windows, failure isolation, the
`failed_orchestrations` DLQ, and HTTP 500 as the retry signal.

## Files

| Path | Purpose |
|---|---|
| `workflows/dispatch.yaml` | The parameterized Workflow: targets → dispatcher calls, secret read, retry |
| `scripts/create-scheduler-jobs.sh` | Idempotent create/update of the 5 scheduler jobs |
| `GO_LIVE_CHECKLIST.md` | The 6-stage bring-up checklist |

## One-time setup (≈15 minutes, once, from any machine with `gcloud`)

### 0. Prerequisites

- `gcloud` CLI logged in: `gcloud auth login`
- A GCP project with billing enabled (free tiers are enough — see Costs)
- The `CRON_SECRET` value (same secret as the Vercel env var and the
  `CRON_SECRET` GitHub Actions secret — all three must match)

```bash
export PROJECT_ID=your-project-id
export REGION=europe-west1          # matches Vercel fra1 / Supabase eu-west-1
gcloud config set project "$PROJECT_ID"
```

### 1. Enable APIs

```bash
gcloud services enable cloudscheduler.googleapis.com \
                       workflows.googleapis.com \
                       secretmanager.googleapis.com \
                       iam.googleapis.com \
                       cloudscheduler.googleapis.com
```

### 2. Service accounts + grants

Two SAs — one runs the workflow, one invokes it:

```bash
# The workflow runtime: needs to read the cron secret
gcloud iam service-accounts create se-workflow-runner \
  --display-name "SE automation workflow runtime"

# The scheduler invoker: allowed to start workflow executions
gcloud iam service-accounts create se-scheduler \
  --display-name "SE Cloud Scheduler invoker"

# Scheduler SA may invoke the workflow (project-level grant)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:se-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role "roles/workflows.invoker"
```

### 3. Store the shared secret

```bash
read -rs CRON_SECRET           # paste the SAME value Vercel uses
printf '%s' "$CRON_SECRET" | gcloud secrets create cron_secret \
  --data-file=- --replication-policy=automatic

# Let the workflow runtime read it
gcloud secrets add-iam-policy-binding cron_secret \
  --member "serviceAccount:se-workflow-runner@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"
```

### 4. Deploy the workflow

```bash
cd infra/google-cloud   # repo root

gcloud workflows deploy se-automation-dispatch \
  --source=workflows/dispatch.yaml \
  --location="$REGION" \
  --service-account="se-workflow-runner@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 5. Create the 5 scheduler jobs

```bash
PROJECT_ID="$PROJECT_ID" \
SA_EMAIL="se-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
bash scripts/create-scheduler-jobs.sh
```

### 6. Smoke test + verify

```bash
# Manual run through the full path (workflow → dispatcher → automation_runs)
gcloud workflows run se-automation-dispatch --location="$REGION" \
  --data='{"argument": "{\"targets\": \"night\"}"}'
```

Then check the ledger (Supabase, `public.automation_runs`):

```sql
SELECT job, status, trigger_source, started_at
FROM automation_runs
WHERE trigger_source = 'gcp-scheduler'
ORDER BY started_at DESC LIMIT 10;
```

Green when you see fresh rows with `trigger_source = 'gcp-scheduler'`.

## Scheduling topology (single source of truth: `apps/sierra-estates-realty/lib/server/automation-jobs.ts`)

| Job / window | GCP cron (UTC) | Contents |
|---|---|---|
| `night` | `10 2 * * *` | maintenance, expire-reservations, lead-timers, check-availability-sla |
| `morning` | `10 6 * * *` | sync-listings, sync-master-sheet, ingest-from-sheets, sync-leads |
| `whatsapp-dispatch` | `10 * * * *` | WhatsApp queue drain (hourly) |
| timers | `25 */3 * * *` | lead-timers + check-availability-sla |
| `sync-leads` | `10 10 * * *` | Lead sources sync (daily) |

**Deliberately unscheduled:**

- `scraper` — the WhatsApp scrape pipeline stays **PAUSED**; run it manually
  from the Workflow Ops screen / EC2 runner when needed.
- `apply-migrations` — DDL is a deliberate manual act (GHA manual dispatch or
  the dedicated cron route), never routine daily work.

### Vercel fallback (the `:45` offsets)

`vercel.json` fires the `night` / `morning` windows at **02:45 / 06:45 UTC** —
35 minutes AFTER the GCP runs at `:10`. On a healthy day GCP has already
succeeded, so every job records an honest `skipped (recent_success)` run and
no work is duplicated. If GCP is down, mis-configured, or paused, the Vercel
cron becomes the executor of record for the two daily windows. The
hourly/3-hourly granular jobs have no Vercel fallback (Hobby 2-cron cap) —
they are GCP-only by design.

## Operating

| Action | Command |
|---|---|
| List jobs | `gcloud scheduler jobs list --location=$REGION` |
| Pause everything | `gcloud scheduler jobs pause <job> --location=$REGION` (per job) |
| Resume | `gcloud scheduler jobs resume <job> --location=$REGION` |
| Force-run a target now | `gcloud workflows run se-automation-dispatch --location=$REGION --data='{"argument": "{\"targets\": \"night\", \"force\": true}"}'` |
| Emergency dispatch without GCP | GitHub → Actions → **Automations** → Run workflow (uses `CRON_SECRET` secret) |
| Run history | `gcloud workflows executions list se-automation-dispatch --location=$REGION` |
| Run logs | `gcloud workflows executions describe <execution-id> --location=$REGION` |
| Rotate the secret | Create a new Secret Manager version; Vercel + GHA secret must be rotated to match |

### Known failures to expect (pre-existing on main, NOT caused by this layer)

- `lead-timers` fails on `column leads.archived does not exist` (schema drift on main).
- `ingest-from-sheets` fails on missing `config/service_account.json` on Vercel.

Both land in `automation_runs` + the `failed_orchestrations` DLQ; the
dedupe guard means retries only re-execute the failed jobs. Fix them
separately — do not conflate with GCP health.

## Costs

Free tiers (as of 2026): Cloud Scheduler gives **3 free jobs per month**
beyond the first 3 paid at $0.10/job/month; Workflows includes
**5,000 free steps/month** (this workflow uses ~8 steps per execution ≈
~50 executions/month for timers+whatsapp… actual usage: whatsapp 24×30=720 +
timers 8×30=240 + dailies 60 ≈ 1,020 executions ≈ 8,160 steps → still inside
cheap territory at $0.00025/1k steps... run the numbers once and set a budget
alert). Set a budget alert anyway:

```bash
gcloud billing budgets create --billing-account=BILLING_ACCOUNT \
  --display-name="SE automation" --budget-amount=5USD
```

## Teardown / rollback

```bash
# Stop scheduling immediately (dispatcher contract untouched)
for j in night morning whatsapp timers sync-leads; do
  gcloud scheduler jobs delete "se-automation-$j" --location="$REGION" --quiet
done

# Optional: remove the workflow + secret
gcloud workflows delete se-automation-dispatch --location="$REGION" --quiet
gcloud secrets delete cron_secret --quiet
```

Rolling back to GHA scheduling only means re-adding the `schedule:` block to
`.github/workflows/automations.yml` (the case-mapping is preserved for
exactly this reason). The Vercel `:45` fallbacks keep working throughout.
