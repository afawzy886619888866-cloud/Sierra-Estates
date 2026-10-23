@echo off
title Sierra Estates - Local Control Plane & 4-Line Parallel Outreach
echo ========================================================
echo Sierra Estates - 100%% LOCAL CONTROL PLANE (ZERO AWS EC2)
echo Mode     : WF_HOST_SIDE=split (2 lines top + 2 lines bottom)
echo Lines    : line-1, line-2, line-3, line-4 (Local Gateway :2785)
echo Engine   : Dispatches ALL active workflows (02..10)
echo Window   : 10:00-20:00 Cairo, 30-min slots, batch 30, 23-min
echo            graceful deadline (never killed mid-send)
echo ========================================================
cd /d "%~dp0"

set WF_DRY_RUN=0

REM ────────────────────────────────────────────────────────────────
REM GATEWAY: Local OpenWA / Multi-Session Gateway on port 2785.
REM Credentials default to workflows\.env unless overridden via SIERRA_*
REM ────────────────────────────────────────────────────────────────
set WHATSAPP_API_URL=http://127.0.0.1:2785
if defined SIERRA_WHATSAPP_API_TOKEN set WHATSAPP_API_TOKEN=%SIERRA_WHATSAPP_API_TOKEN%
if defined SIERRA_OPENWA_ADMIN_API_KEY set OPENWA_ADMIN_API_KEY=%SIERRA_OPENWA_ADMIN_API_KEY%
if defined SIERRA_RUNNER_API_KEY set RUNNER_API_KEY=%SIERRA_RUNNER_API_KEY%
set RUNNER_PORT=2786

REM ────────────────────────────────────────────────────────────────
REM HOST ROLE: Single-host all-local mode — RUNNER_WORKFLOWS is unset
REM so this PC dispatches ALL active workflows (sentinel, digest,
REM units-sync, owner-outreach, whatsapp-dispatch, etc.).
REM ────────────────────────────────────────────────────────────────
set RUNNER_WORKFLOWS=

REM ────────────────────────────────────────────────────────────────
REM 4-LINE SPLIT WALK: 2 lines walk top-down, 2 lines walk bottom-up
REM ────────────────────────────────────────────────────────────────
set WF_HOST_SIDE=split
set WF_PARALLEL_LINES=4
set OPENWA_SESSION_IDS=line-1,line-2,line-3,line-4
set WF_SLOT_BATCH=30
set WF_SLOT_DEADLINE_MS=1380000
set WF_OWNER_CONTACT_DAILY_CAP=160
set WF_OUTREACH_ACTIVE_HOURS=10-20
set UNITS_SHEET_ID=1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk
set UNITS_SHEET_GID=1127958606

REM Sheet contact-date write-back (loaded from workflows\.env or SIERRA_*)
if defined SIERRA_SHEET_WRITE_URL set WF_SHEET_WRITE_URL=%SIERRA_SHEET_WRITE_URL%
if defined SIERRA_SHEET_WRITE_SECRET set WF_SHEET_WRITE_SECRET=%SIERRA_SHEET_WRITE_SECRET%

REM Legacy knobs (kept for reference)
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

REM ── Step 1: Ensure Local WhatsApp Gateway (:2785) is running ─────
curl -s --connect-timeout 2 http://127.0.0.1:2785/api/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  if exist "apps\agents\whatsapp-multi-session\worker.js" (
    echo [1/4] Starting Local Multi-Session WhatsApp Gateway on :2785...
    start "Sierra WhatsApp Gateway (:2785)" /min cmd /k "cd /d %~dp0apps\agents\whatsapp-multi-session && node worker.js"
  ) else (
    echo [1/4] Starting Local WhatsApp Gateway on :2785...
    start "Sierra WhatsApp Gateway (:2785)" /min cmd /k "cd /d %~dp0infra\whatsapp-scraper && npm start"
  )
) else (
  echo [1/4] Local WhatsApp Gateway already listening on :2785.
)

REM ── Step 2: Start Read-Only Admin Bridge (:2790) ─────────────────
curl -s --connect-timeout 2 http://127.0.0.1:2790/admin/api/status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [2/4] Starting Sierra Admin Bridge on http://127.0.0.1:2790/admin...
  start "Sierra Admin Bridge (:2790)" /min cmd /k "cd /d %~dp0workflows && node sierra-admin-bridge.mjs"
) else (
  echo [2/4] Sierra Admin Bridge already listening on :2790.
)

REM ── Step 3: Start Cloudflare Tunnel for Gateway (:2785) ──────────
echo [3/4] Starting Cloudflare Tunnel for http://127.0.0.1:2785...
start "Sierra Cloudflare Tunnel" /min cmd /k "cd /d %~dp0 && node scripts\tunnel.mjs 2785"

REM ── Step 4: Start Workflow Runner Control Plane (:2786) ──────────
echo [4/4] Starting Workflow Engine (ALL workflows, 4-line split mode)...
start "Sierra Workflow Engine (:2786)" /min cmd /k "cd /d %~dp0workflows && node runner.js"

echo Done. All services are running 100%% locally (Gateway :2785, Runner :2786, Admin Bridge :2790, Cloudflare Tunnel).
