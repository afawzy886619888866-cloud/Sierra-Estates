@echo off
title Sierra Estates — 24/7 Automated Workflow Control Plane
echo =======================================================================
echo   SIERRA ESTATES — 24/7 AUTOMATED WORKFLOW ENGINE (runner.js)
echo =======================================================================
echo   • Supabase Workflow Sync & Dynamic Cron Polling (every 60s)
echo   • Anti-Ban WhatsApp Pacing & Overlap Guard
echo   • Real-Time Telemetry & Fail-Closed Security
echo =======================================================================
echo.

cd /d "%~dp0\workflows"

REM Check dependencies
if not exist "node_modules\@supabase\supabase-js" (
    echo [SETUP] Installing workflow dependencies...
    call npm install --no-audit --no-fund
)

set NODE_ENV=production
set TZ=Africa/Cairo
set RUNNER_BIND=127.0.0.1
set RUNNER_PORT=2786

echo Starting Workflow Runner Control Plane on http://127.0.0.1:2786...
echo Press Ctrl+C to stop.
echo.

call node runner.js

pause
