@echo off
title Sierra Estates - 8-Line WhatsApp Multi-Session Gateway
echo =======================================================================
echo   Sierra Estates — 8-LINE DEDICATED WHATSAPP GATEWAY (OpenWA)
echo =======================================================================
echo Engine: @open-wa/wa-automate (https://github.com/open-wa/wa-automate-nodejs)
echo Sessions: line-1, line-2, line-3, line-4, line-5, line-6, line-7, line-8
echo Port: 2785
echo =======================================================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js was not found on your system!
    echo Please install Node.js v20 or v22 from https://nodejs.org
    pause
    exit /b 1
)

REM Navigate to the dedicated multi-session agent directory
cd "apps\agents\whatsapp-multi-session"

REM Check dependencies
if not exist "node_modules\@open-wa\wa-automate" (
    echo [SETUP] Installing required WhatsApp dependencies (@open-wa/wa-automate, express, qrcode)...
    echo This is a one-time setup and may take 1-2 minutes...
    call npm install --no-audit --no-fund
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
)

set PORT=2785
set OPENWA_SESSION_IDS=line-1,line-2,line-3,line-4,line-5,line-6,line-7,line-8
set NODE_ENV=production
set TZ=Africa/Cairo

echo.
echo =======================================================================
echo Starting 8-Line Gateway...
echo Opening Pairing Dashboard at http://localhost:2785
echo Scan the 8 QR codes from your 8 phones or web browser.
echo =======================================================================
echo.

REM Open pairing dashboard in browser after a brief delay
start "" http://localhost:2785

call node worker.js

pause
