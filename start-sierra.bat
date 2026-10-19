@echo off
title Sierra Estates - Host B (BOTTOM side, lines 3-4)
echo ========================================================
echo Sierra Estates - TWO-HOST PARALLEL OUTREACH
echo This host : WF_HOST_SIDE=bottom (walks the sheet BACK to FRONT)
echo Lines    : line-3, line-4  ("the other side")
echo Pairing  : EC2 host A walks the TOP half with lines 1-2
echo Window   : 10:00-20:00 Cairo, 30-min slots, batch 30, 23-min
echo            graceful deadline (never killed mid-send)
echo ========================================================
cd /d "%~dp0"

set WF_DRY_RUN=0

REM ────────────────────────────────────────────────────────────────
REM GATEWAY: the EC2 box hosts the OpenWA gateway + the 4-line pool.
REM Windows sends through it over the public URL. Only switch to
REM http://127.0.0.1:2785 if you run a LOCAL gateway on this PC
REM (then also start it below).
REM ────────────────────────────────────────────────────────────────
set WHATSAPP_API_URL=http://54.89.162.250:2785
if not defined SIERRA_WHATSAPP_API_TOKEN exit /b 1
set WHATSAPP_API_TOKEN=%SIERRA_WHATSAPP_API_TOKEN%
if not defined SIERRA_OPENWA_ADMIN_API_KEY exit /b 1
set OPENWA_ADMIN_API_KEY=%SIERRA_OPENWA_ADMIN_API_KEY%
if not defined SIERRA_RUNNER_API_KEY exit /b 1
set RUNNER_API_KEY=%SIERRA_RUNNER_API_KEY%
set RUNNER_PORT=2786

REM ────────────────────────────────────────────────────────────────
REM HOST ROLE: this box dispatches ONLY owner-outreach. Sentinel,
REM digest and units-sync keep running on the EC2 host — nothing is
REM ever double-dispatched across the two runners.
REM ────────────────────────────────────────────────────────────────
set RUNNER_WORKFLOWS=owner-outreach

REM ────────────────────────────────────────────────────────────────
REM THE OTHER SIDE: 2 lines walking the sheet bottom-up. Replace
REM line-3,line-4 with your real gateway session names if different
REM (list them: curl http://54.89.162.250:2785/api/sessions -H
REM  "X-API-Key: dev-admin-key").
REM ────────────────────────────────────────────────────────────────
set WF_HOST_SIDE=bottom
set WF_PARALLEL_LINES=2
set OPENWA_SESSION_IDS=line-3,line-4
set WF_SLOT_BATCH=30
set WF_SLOT_DEADLINE_MS=1380000
set WF_OWNER_CONTACT_DAILY_CAP=600
set WF_OUTREACH_ACTIVE_HOURS=10-20
set UNITS_SHEET_ID=1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk
set UNITS_SHEET_GID=1127958606

REM Sheet contact-date write-back — REQUIRED on BOTH hosts: this is
REM what makes each host skip owners the other host already texted.
if not defined SIERRA_SHEET_WRITE_URL exit /b 1
set WF_SHEET_WRITE_URL=%SIERRA_SHEET_WRITE_URL%
if not defined SIERRA_SHEET_WRITE_SECRET exit /b 1
set WF_SHEET_WRITE_SECRET=%SIERRA_SHEET_WRITE_SECRET%

REM Legacy knobs (kept for reference — not read by outreach.js)
set WF_OUTREACH_SLOTS=10,11,12,13,14,15,16,17,18,19,20
set WF_PRIMARY_LINE_PHONE=201092048333
set WF_OPERATOR_WHATSAPP=201061399688

REM ── Fail-closed check: the scheduler stays IDLE without Supabase ──
if not exist "workflows\.env" (
  echo [WARN] workflows\.env is MISSING - the scheduler will stay idle!
  echo        Create workflows\.env with:
  echo        SUPABASE_URL=...  and  SUPABASE_SERVICE_ROLE_KEY=...
) else (
  findstr /B /C:"SUPABASE_URL" "workflows\.env" >nul 2>&1 || echo [WARN] workflows\.env has no SUPABASE_URL - scheduler stays idle ^(fail-closed^)
  findstr /B /C:"SUPABASE_SERVICE_ROLE_KEY" "workflows\.env" >nul 2>&1 || echo [WARN] workflows\.env has no SUPABASE_SERVICE_ROLE_KEY - scheduler stays idle ^(fail-closed^)
)

REM ── OPTIONAL: local gateway mode ────────────────────────────────
REM Uncomment the next two lines ONLY if the WhatsApp gateway should
REM run on this PC instead of the EC2 box (then set WHATSAPP_API_URL
REM to http://127.0.0.1:2785 above):
REM start "Sierra Gateway" /d "%~dp0infra\whatsapp-scraper" cmd /k "npm start"

echo [1/1] Starting Workflow Engine - outreach-only role, BOTTOM side...
start "Sierra Engine B" /min cmd /k "cd /d %~dp0workflows && node runner.js"

echo Done. This host texts the BOTTOM half of the sheet every 30-min
echo slot (10:00-20:00 Cairo). EC2 host A walks the TOP half - the two
echo sides meet in the middle; the sheet contact-date column keeps
echo them from ever double-texting an owner.
