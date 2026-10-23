@echo off
title Sierra Estates — 8-Line WhatsApp Broker RAG Station
echo =======================================================================
echo   SIERRA ESTATES — NEW CAIRO BROKER RAG HARVESTER & MAP STATION
echo =======================================================================
echo   • 8 WhatsApp Lines Listening to 40+ Broker Groups in Real-Time
echo   • Instant Unit Extraction, Gazetteer Geocoding & Supabase RAG
echo   • Real-Time Map Alert Station (http://localhost:2785/map)
echo   • Cloudflare Quick Tunnel (cloudflared) for Secure Global Access
echo =======================================================================
echo.

cd /d "%~dp0"

REM Step 1: Check Docker
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Docker detected. Do you want to run in Docker container? (Y/N)
    set /p USE_DOCKER="Run with Docker? (Default: N for fast local execution): "
    if /i "%USE_DOCKER%"=="Y" (
        echo [DOCKER] Starting RAG Station and Cloudflare Tunnel via Docker...
        docker compose -f infra/docker-compose.rag-station.yml up -d
        echo.
        echo ===================================================================
        echo [SUCCESS] Containers running!
        echo   • Live Map Station: http://localhost:2785/map
        echo   • Pairing Dashboard: http://localhost:2785
        echo   • Cloudflare Tunnel logs: docker compose -f infra/docker-compose.rag-station.yml logs -f cloudflared-tunnel
        echo ===================================================================
        start "" http://localhost:2785/map
        pause
        exit /b 0
    )
)

REM Step 2: Direct Node.js Execution
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js was not found on your system!
    echo Please install Node.js v20/v22 from https://nodejs.org
    pause
    exit /b 1
)

REM Install dependencies if missing
cd "apps\agents\whatsapp-multi-session"
if not exist "node_modules\@open-wa\wa-automate" (
    echo [SETUP] Installing WhatsApp multi-session & RAG dependencies...
    call npm install --no-audit --no-fund
)

set PORT=2785
set OPENWA_SESSION_IDS=line-1,line-2,line-3,line-4,line-5,line-6,line-7,line-8
set NODE_ENV=production
set TZ=Africa/Cairo

echo.
echo =======================================================================
echo Launching 8-Line WhatsApp Worker on Port 2785...
echo =======================================================================

REM Start Cloudflare quick tunnel in a separate background window
cd /d "%~dp0"
start "Sierra Estates - Cloudflare Tunnel" node scripts/tunnel.mjs 2785

REM Open the Live Map Station in your default browser
start "" http://localhost:2785/map

REM Start the WhatsApp multi-session worker in the current window
cd "apps\agents\whatsapp-multi-session"
call node worker.js

pause
