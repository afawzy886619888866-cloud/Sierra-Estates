@echo off
REM ===========================================================================
REM Sierra Estates - Autonomous Detached Background Stack Launcher & Watchdog
REM ===========================================================================
setlocal
cd /d "%~dp0"
if not exist ".state" mkdir ".state"
if not exist "workflows\.state" mkdir "workflows\.state"

powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "H:\Sierra Estates\scripts\start-detached-daemons.ps1" -Service all
endlocal
exit /b 0
