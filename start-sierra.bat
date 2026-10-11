@echo off
title Sierra Estates - Dual WhatsApp & Workflow Engine
echo ========================================================
echo Starting Sierra Estates Control Plane
echo ========================================================
cd /d "%~dp0"

set WF_DRY_RUN=0
set WHATSAPP_API_URL=http://127.0.0.1:2785
set WHATSAPP_API_TOKEN=dev-admin-key
set OPENWA_ADMIN_API_KEY=dev-admin-key
set RUNNER_API_KEY=dev-admin-key
set RUNNER_PORT=2786
set WF_SLOT_BATCH=60
set WF_PER_LINE_SLOT_BATCH=30
set WF_LINE_DAILY_CAP=180
set WF_OUTREACH_SLOTS=10,12,14,16,18,20
set WF_PRIMARY_LINE_PHONE=201092048333
set WF_OPERATOR_WHATSAPP=201061399688
set OPENWA_SESSION_IDS=session-default,line-2
set UNITS_SHEET_ID=1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk
set UNITS_SHEET_GID=1127958606

echo [1/2] Starting WhatsApp Gateway on Port 2785...
start "Sierra Gateway" /d "%~dp0infra\whatsapp-scraper" cmd /k "npm start"

echo [2/2] Starting Workflow Engine on Port 2786...
start "Sierra Engine" /d "%~dp0workflows" cmd /k "node runner.js"

echo Done. Check the opened terminal windows.
