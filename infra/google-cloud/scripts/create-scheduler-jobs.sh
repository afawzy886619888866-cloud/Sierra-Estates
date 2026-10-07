#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# create-scheduler-jobs.sh — idempotent create-or-update of the 5 GCP Cloud
# Scheduler jobs that drive SE automations through the se-automation-dispatch
# Workflow (one-time project setup: ../README.md).
#
# Each job POSTs {"argument": "{targets, siteUrl}"} to the Workflows executions
# API with an OIDC token from the scheduler service account (needs
# roles/workflows.invoker — see README).
#
# Usage:
#   PROJECT_ID=your-project \
#   SA_EMAIL=se-scheduler@your-project.iam.gserviceaccount.com \
#   bash create-scheduler-jobs.sh
#
# Environment overrides:
#   REGION    (default europe-west1)  — scheduler + workflow location
#   WORKFLOW  (default se-automation-dispatch)
#   SITE_URL  (default https://sierra-estates.net)
#   SCHED_TZ  (default UTC)
#
# Deliberately NOT scheduled here (by design):
#   · scraper          — WhatsApp scrape pipeline stays PAUSED (emergency-only)
#   · apply-migrations — DDL is a deliberate manual act, never routine
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your GCP project id}"
REGION="${REGION:-europe-west1}"
WORKFLOW="${WORKFLOW:-se-automation-dispatch}"
SA_EMAIL="${SA_EMAIL:?Set SA_EMAIL (scheduler invoker service account)}"
SITE_URL="${SITE_URL:-https://sierra-estates.net}"
TZ="${SCHED_TZ:-UTC}"

EXECUTIONS_URI="https://workflows.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/workflows/${WORKFLOW}/executions"

create_or_update() {
  local name="$1" schedule="$2" targets="$3" description="$4"
  local body
  body=$(printf '{"argument": "{\"targets\": \"%s\", \"siteUrl\": \"%s\"}"}' "${targets}" "${SITE_URL}")

  local common_args=(
    --location="${REGION}"
    --schedule="${schedule}"
    --time-zone="${TZ}"
    --uri="${EXECUTIONS_URI}"
    --message-body="${body}"
    --headers="Content-Type=application/json"
    --oidc-service-account-email="${SA_EMAIL}"
    --description="${description}"
  )

  if gcloud scheduler jobs describe "${name}" --location="${REGION}" >/dev/null 2>&1; then
    echo "→ updating ${name} (${schedule} ${TZ})"
    gcloud scheduler jobs update http "${name}" "${common_args[@]}"
  else
    echo "→ creating ${name} (${schedule} ${TZ})"
    gcloud scheduler jobs create http "${name}" "${common_args[@]}"
  fi
}

#                        name                     cron           targets                              description
create_or_update se-automation-night      "10 2 * * *"   "night"                              "SE night window: maintenance, expire-reservations, lead-timers, check-availability-sla"
create_or_update se-automation-morning    "10 6 * * *"   "morning"                            "SE morning window: sync-listings, sync-master-sheet, ingest-from-sheets, sync-leads"
create_or_update se-automation-whatsapp   "10 * * * *"   "whatsapp-dispatch"                  "SE WhatsApp queue drain (hourly, Cairo outreach window)"
create_or_update se-automation-timers     "25 */3 * * *" "lead-timers,check-availability-sla" "SE lead timers + availability SLA (every 3 hours)"
create_or_update se-automation-sync-leads "10 10 * * *"  "sync-leads"                         "SE lead sources sync (daily 10:10 UTC)"

echo
echo "Done. Verify:"
echo "  gcloud scheduler jobs list --location=${REGION}"
echo
echo "Manual smoke test (bypasses the scheduler):"
echo "  gcloud workflows run ${WORKFLOW} --location=${REGION} --data='{\"argument\": \"{\\\"targets\\\": \\\"night\\\"}\"}'"
echo
echo "Then confirm the run landed in automation_runs (Supabase) with"
echo "trigger_source = 'gcp-scheduler'."
