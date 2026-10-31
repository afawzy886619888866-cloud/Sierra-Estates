@echo off
title Sierra Estates — Disable Auto-Start
echo Sierra Estates — Disable Auto-Start
echo ==================================
set "LAUNCHER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SierraEstates-AutoStart.cmd"

if exist "%LAUNCHER%" (
    del "%LAUNCHER%"
    echo [OK] Removed: %LAUNCHER%
    echo      The stack no longer starts at logon
    echo      ^(anything already running keeps running^).
) else (
    echo [INFO] Auto-start launcher not found — nothing to remove.
)

echo.
echo To stop the running stack right now ^(from the repo root^):
echo   docker compose -f infra\docker-compose.runner.yml down
echo   docker compose -f infra\docker-compose.rag-station.yml down
echo.
echo To re-enable later: run ENABLE-AUTO-START.bat again.
echo.
pause
exit /b 0
