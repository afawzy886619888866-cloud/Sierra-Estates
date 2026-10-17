#!/usr/bin/env bash
# install.sh — idempotent setup/upgrade of the Sierra Estates workflow
# control plane on the EC2 gateway box. Safe to re-run.
set -euo pipefail
cd /opt/se/workflows

echo "── 1. directories"
mkdir -p lib .state 01-whatsapp-scraper 02-owner-search 03-owner-contact 04-email-sender 05-unit-adder 06-gateway-sentinel
chmod 700 .state

echo "── 2. dependencies"
npm install --no-audit --no-fund --loglevel=error

echo "── 3. env file (create if missing)"
if [ ! -f workflows.env ]; then
  cat > workflows.env <<'ENVEOF'
# Sierra Estates workflow runner secrets — chmod 600. DO NOT COMMIT.
SUPABASE_URL=__SB_URL__
SUPABASE_SERVICE_ROLE_KEY=__SB_KEY__
WHATSAPP_API_URL=http://127.0.0.1:2785
WHATSAPP_API_TOKEN=__OPKEY__
OPENWA_ADMIN_API_KEY=__ADKEY__
OPENWA_SESSION_ID=__UUID__
# 4-line sender pool (overrides OPENWA_SESSION_ID when set):
# OPENWA_SESSION_IDS=session-default,line-2,line-3,line-4
RUNNER_API_KEY=__ADKEY__
RUNNER_PORT=2786
RUNNER_BIND=__BIND__
WF_OWNER_CONTACT_DAILY_CAP=40
# Owner inventory sheet (public gviz read). gid 1127958606 = the owner
# inventory tab — do NOT use the broker-inbox gid here.
UNITS_SHEET_ID=1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk
UNITS_SHEET_GID=1127958606
# Sheet contact-date write-back (Apps Script web app):
# WF_SHEET_WRITE_URL=https://script.google.com/macros/s/.../exec
# WF_SHEET_WRITE_SECRET=__WRITE_SECRET__
ENVEOF
  echo "workflows.env created from template"
else
  echo "workflows.env already exists — left untouched"
fi
chmod 600 workflows.env

echo "── 4. systemd unit"
cp /opt/se/workflows/se-workflow-runner.service /etc/systemd/system/se-workflow-runner.service
systemctl daemon-reload
systemctl enable se-workflow-runner >/dev/null 2>&1 || true

echo "── 5. syntax check all workflows"
for f in runner.js lib/*.js 0*/*.js; do node --check "$f"; done
echo "syntax OK"

echo "INSTALL-DONE"
