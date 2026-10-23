@echo off
title Sierra Estates — WhatsApp Harvester
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       SIERRA ESTATES — WhatsApp Live Harvester              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  This will connect your WhatsApp to the bot.                ║
echo ║  After the QR appears, scan it with your phone.             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Clear stale auth if flagged
if exist "auth\session_corrupt.flag" (
    echo Removing stale session...
    rmdir /s /q auth 2>nul
    del auth\session_corrupt.flag 2>nul
)

echo Starting harvester...
echo QR code will open automatically in your browser.
echo.

:: Start harvester, then auto-open browser after 3s
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start H:\Sheets\whatsapp_qr.html"
node src/owners-harvester.js

pause
