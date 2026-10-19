@echo off
title Sierra Estates - Local OpenWA Gateway
echo ========================================================
echo   Sierra Estates - FREE LOCAL WHATSAPP GATEWAY (OpenWA)
echo ========================================================
echo This runs the self-hosted OpenWA gateway locally on your PC.
echo No AWS EC2 costs required!
echo Repository: https://github.com/rmyndharis/OpenWA.git
echo Port: 2785
echo ========================================================
cd /d "%~dp0"

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Docker detected. Starting OpenWA in Docker container...
    cd infra\openwa
    docker compose -f docker-compose.local.yml up -d
    echo.
    echo ========================================================
    echo [SUCCESS] OpenWA container is running!
    echo Dashboard & QR code pairing URL:
    echo   http://localhost:2785
    echo.
    echo Once paired with WhatsApp:
    echo - Your local apps and runner can use: http://127.0.0.1:2785
    echo - Admin API Key: owa_k1_f269866c139dd31a3afca1809d6a86f90cb349654e41c82e585ceff327c1c77c
    echo ========================================================
    start http://localhost:2785
    pause
    exit /b 0
)

echo [INFO] Docker not detected. Checking Node.js for direct execution...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Neither Docker nor Node.js was found!
    echo Please install Docker Desktop (https://www.docker.com) OR
    echo Node.js v20/v22 (https://nodejs.org) to run OpenWA locally.
    pause
    exit /b 1
)

echo [INFO] Node.js found. Setting up OpenWA locally in .\openwa ...
if not exist "openwa" (
    echo Cloning https://github.com/rmyndharis/OpenWA.git ...
    git clone --depth 1 https://github.com/rmyndharis/OpenWA.git openwa
)

cd openwa
if not exist "node_modules" (
    echo Installing OpenWA dependencies (this may take 1-2 minutes)...
    call npm install --no-audit --no-fund
)

set PORT=2785
set NODE_ENV=production
set TZ=Africa/Cairo
set ADMIN_API_KEY=owa_k1_f269866c139dd31a3afca1809d6a86f90cb349654e41c82e585ceff327c1c77c

echo.
echo ========================================================
echo Starting OpenWA on http://localhost:2785 ...
echo Scan the QR code in your browser or console to link WhatsApp.
echo ========================================================
start http://localhost:2785
call npm start
pause
