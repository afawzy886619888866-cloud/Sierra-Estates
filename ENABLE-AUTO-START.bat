@echo off
title Sierra Estates — Enable Auto-Start at PC Logon
echo =======================================================================
echo   SIERRA ESTATES — ENABLE AUTO-START ^(gateway live once the PC opens^)
echo =======================================================================
echo   Registers a launcher in the Windows Startup folder that runs
echo   sierra-autostart.bat at every logon:
echo     1. starts Docker Desktop if needed ^(waits for the engine^)
echo     2. starts the 8-line WhatsApp gateway ^(:2785^)
echo     3. starts the workflow runner ^(:2786^)
echo   Scheduler: 03:00 Cairo morning briefing, 09:00-21:30 outreach slots.
echo   No admin rights needed ^(per-user Startup folder^).
echo =======================================================================
echo.

setlocal
cd /d "%~dp0"
set "REPO_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%STARTUP_DIR%\SierraEstates-AutoStart.cmd"

REM ── Preflight checks ──────────────────────────────────────────────────
if not exist "%REPO_DIR%sierra-autostart.bat" (
    echo [ERROR] sierra-autostart.bat not found next to this script.
    echo         Run ENABLE-AUTO-START.bat from the repo root.
    pause
    exit /b 1
)
if not exist "%REPO_DIR%infra\docker-compose.rag-station.yml" (
    echo [ERROR] infra\docker-compose.rag-station.yml not found - wrong folder?
    pause
    exit /b 1
)
if not exist "%REPO_DIR%infra\.env" (
    echo [WARN] infra\.env is missing — the stack cannot start until you copy
    echo        infra\.env.example to infra\.env and set the keys
    echo        ^(OPENWA_ADMIN_API_KEY, RUNNER_API_KEY, SUPABASE_*^).
    echo        Registration continues; fix .env before the next logon.
    echo.
)
if not exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo [WARN] Docker Desktop not found at the default install path.
    echo        The boot script will report this at logon until it is installed.
    echo.
)

REM ── Write the launcher into the Startup folder ────────────────────────
> "%LAUNCHER%" (
    echo @echo off
    echo rem Sierra Estates auto-start launcher — created by ENABLE-AUTO-START.bat
    echo if not exist "%REPO_DIR%.state" mkdir "%REPO_DIR%.state"
    echo call "%REPO_DIR%sierra-autostart.bat" ^>^> "%REPO_DIR%.state\autostart.log" 2^>^&1
)
if not exist "%LAUNCHER%" (
    echo [ERROR] could not write to the Startup folder:
    echo        %LAUNCHER%
    pause
    exit /b 1
)

echo [OK] Registered: %LAUNCHER%
echo.
echo =======================================================================
echo   DONE — the Sierra stack now starts every time you log into Windows.
echo.
echo   Test NOW without rebooting:  double-click sierra-autostart.bat
echo   Boot log ^(after logon^):         .state\autostart.log
echo   Remove anytime with:            DISABLE-AUTO-START.bat
echo.
echo   Tip: in Docker Desktop Settings ^> General, also enable
echo   "Start Docker Desktop when you sign in" so the engine is ready
echo   as early as possible after logon.
echo =======================================================================
echo.
pause
endlocal
exit /b 0
