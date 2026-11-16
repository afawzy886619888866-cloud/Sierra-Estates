@echo off
title Sierra Estates - Local WhatsApp Sender & Workflow Runner
echo ========================================================
echo   Sierra Estates - Local Sender & Workflow Control
echo ========================================================
cd /d "%~dp0"

REM Check if local OpenWA is listening on port 2785
set GATEWAY_URL=http://127.0.0.1:2785
curl -s --connect-timeout 2 http://127.0.0.1:2785/api/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Detected LOCAL OpenWA running on http://127.0.0.1:2785 (Free Local Gateway)
) else (
    echo [WARN] Local gateway not yet listening on http://127.0.0.1:2785 — start start-openwa-8lines.bat or start-sierra.bat first!
)

set WHATSAPP_API_URL=%GATEWAY_URL%
if defined SIERRA_WHATSAPP_API_TOKEN set WHATSAPP_API_TOKEN=%SIERRA_WHATSAPP_API_TOKEN%
if defined SIERRA_OPENWA_ADMIN_API_KEY set OPENWA_ADMIN_API_KEY=%SIERRA_OPENWA_ADMIN_API_KEY%
set WHATSAPP_PROVIDER=openwa

echo Active Gateway: %WHATSAPP_API_URL%
echo.
echo Select action:
echo  [1] Start Scheduled Daemon (full runner with scheduled jobs)
echo  [2] Drain WhatsApp Message Queue NOW (workflow 10)
echo  [3] Run Owner Outreach NOW (workflow 09)
echo  [4] Run Units Sync from Sheets NOW (workflow 08)
echo  [5] Check Gateway Sentinel & Lines Health (workflow 06)
echo  [6] Exit
echo.

set /p choice="Enter choice [1-6]: "

if "%choice%"=="1" (
    echo Starting Sierra Estates Workflow Runner Daemon...
    cd workflows
    node runner.js
    pause
    exit /b 0
)

if "%choice%"=="2" (
    echo Draining WhatsApp Queue...
    set FORCE_DISPATCH=1
    node workflows\10-whatsapp-dispatch\dispatch.js
    pause
    exit /b 0
)

if "%choice%"=="3" (
    echo Running Owner Outreach...
    node workflows\09-owner-outreach\outreach.js
    pause
    exit /b 0
)

if "%choice%"=="4" (
    echo Running Units Sync...
    node workflows\08-units-sync\sync.js
    pause
    exit /b 0
)

if "%choice%"=="5" (
    echo Running Gateway Sentinel Health Check...
    node workflows\06-gateway-sentinel\sentinel.js
    pause
    exit /b 0
)

echo Exiting.
