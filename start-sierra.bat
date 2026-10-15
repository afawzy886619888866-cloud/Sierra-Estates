@echo off
title Sierra Estates - Dual WhatsApp and Workflow Engine
echo ========================================================
echo Starting Sierra Estates Control Plane
echo Mode: Hourly Batches (10:00 AM - 8:00 PM Cairo)
echo ========================================================
cd /d "%~dp0"

set WF_DRY_RUN=0
set WHATSAPP_API_URL=http://127.0.0.1:2785
set WHATSAPP_API_TOKEN=dev-admin-key
set OPENWA_ADMIN_API_KEY=dev-admin-key
set RUNNER_API_KEY=dev-admin-key
set RUNNER_PORT=2786
set WF_SLOT_BATCH=20
set WF_PER_LINE_SLOT_BATCH=10
set WF_LINE_DAILY_CAP=180
set WF_OWNER_CONTACT_DAILY_CAP=180
set WF_OUTREACH_ACTIVE_HOURS=10-20
set WF_OUTREACH_SLOTS=10,11,12,13,14,15,16,17,18,19,20
set WF_PRIMARY_LINE_PHONE=201092048333
set WF_OPERATOR_WHATSAPP=201061399688
set OPENWA_SESSION_IDS=session-default,line-2
set UNITS_SHEET_ID=1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A
set UNITS_SHEET_GID=632587468
set WF_SHEET_WRITE_URL=https://script.google.com/macros/s/AKfycbzsP2fwASxIVu_r0_rHVyzfVfGii3zHJaEtc29-l3K_IvBG7bmTdWaLngCmyLTG2GnY/exec
set WF_SHEET_WRITE_SECRET=SE_OUTREACH_SECRET_2026_CAIRO

echo [1/2] Starting WhatsApp Gateway on Port 2785...
start "Sierra Gateway" /d "%~dp0infra\whatsapp-scraper" cmd /k "npm start"

echo [2/2] Starting Workflow Engine on Port 2786...
start "Sierra Engine" /d "%~dp0workflows" cmd /k "node runner.js"

echo Done. Both engines running.
