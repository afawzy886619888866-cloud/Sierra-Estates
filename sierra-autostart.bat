@echo off
REM ══════════════════════════════════════════════════════════════════════
REM Sierra Estates — PC Auto-Start Boot Sequence
REM ══════════════════════════════════════════════════════════════════════
REM Owner requirement: the WhatsApp lane must be alive once this PC is
REM opened (at least 09:00-21:00 Cairo). This script runs at every logon
REM (registered by ENABLE-AUTO-START.bat) and also works when started by
REM hand at any time. It is IDEMPOTENT: every step checks first, so
REM re-running it never breaks a healthy stack.
REM
REM Sequence:
REM   1. Start Docker Desktop if the engine is not already up
REM   2. Wait for the Docker engine (up to 5 minutes)
REM   3. Bring up the 8-line WhatsApp gateway (RAG station, :2785)
REM   4. Bring up the workflow runner (control plane, :2786) — schedules
REM      the 03:00 Cairo morning briefing and the 09:00-21:30 outreach slots
REM
REM Both containers run with restart: unless-stopped, so after the first
REM successful `up -d` Docker itself resumes them at every engine start.
REM This script guarantees the engine is running and the compose projects
REM exist — it is the safety net, not a re-install.
REM
REM NOTE: plain `up -d` reuses the existing image. After pulling NEW repo
REM code, rebuild ONCE via start-docker-runner.bat (or add --build) so the
REM container matches the repo.
REM ══════════════════════════════════════════════════════════════════════
setlocal
cd /d "%~dp0"
set /a WAITED=0

echo [%date% %time%] sierra-autostart: boot sequence starting

REM ── Step 1: Docker engine, or launch Docker Desktop ──────────────────
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Docker engine already up
    goto engine_ready
)
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo [%date% %time%] Launching Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
    echo [%date% %time%] Launching Docker Desktop...
    start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
) else (
    echo [%date% %time%] ERROR: Docker Desktop not found at the default path.
    echo                         Install it, or adjust this script, then re-run.
    exit /b 1
)

REM ── Step 2: wait for the engine (max ~5 min) ──────────────────────────
:wait_engine
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto engine_ready
set /a WAITED+=5
if %WAITED% GEQ 300 (
    echo [%date% %time%] ERROR: Docker engine not ready after 300s - giving up
    exit /b 1
)
ping -n 6 127.0.0.1 >nul
goto wait_engine

:engine_ready
echo [%date% %time%] Docker engine ready ^(waited ~%WAITED%s^)

REM ── Step 3: 8-line WhatsApp gateway (RAG station) ─────────────────────
if not exist "infra\docker-compose.rag-station.yml" (
    echo [%date% %time%] ERROR: infra\docker-compose.rag-station.yml not found - run from the repo root
    exit /b 1
)
echo [%date% %time%] Starting the 8-line WhatsApp gateway ^(RAG station^)...
docker compose -f infra/docker-compose.rag-station.yml up -d
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] ERROR: RAG station failed - check infra\.env ^(OPENWA_ADMIN_API_KEY required^)
    exit /b 1
)

REM ── Step 4: workflow runner (03:00 briefing + 09:00-21:30 slots) ──────
echo [%date% %time%] Starting the workflow runner...
docker compose -f infra/docker-compose.runner.yml up -d
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] ERROR: workflow runner failed - check infra\.env ^(RUNNER_API_KEY / OPENWA_ADMIN_API_KEY required^)
    exit /b 1
)

echo [%date% %time%] sierra-autostart: STACK IS UP - gateway :2785, runner :2786
echo [%date% %time%] Next scheduled: 03:00 Cairo morning briefing, 09:00 Cairo first outreach slot
endlocal
exit /b 0
