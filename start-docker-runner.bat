@echo off
title Sierra Estates — Docker Workflow Runner Control Plane
echo =======================================================================
echo   SIERRA ESTATES — WORKFLOW RUNNER (DOCKER MIGRATION OF THE EC2 PATH)
echo =======================================================================
echo   • 24/7 Scheduler: outreach, sentinel, digest, units-sync (runner.js)
echo   • Drives the 8-Line Gateway on the internal Docker network
echo   • Control API: http://127.0.0.1:2786 (RUNNER_API_KEY required)
echo   • Supabase telemetry writes the G3 acceptance evidence
echo   • Plan: infra/DOCKER-RUNNER-MIGRATION.md
echo =======================================================================
echo.

cd /d "%~dp0"

REM Step 1: Check Docker
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running. Start Docker Desktop first.
    pause
    exit /b 1
)

REM Step 2: Preflight — RAG station network must exist (runner joins it)
docker network inspect sierra-rag-network >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ===================================================================
    echo [ERROR] Network sierra-rag-network not found.
    echo The runner shares the RAG station network to reach the 8-line
    echo gateway. Start the station first:
    echo   start-rag-station.bat   (Docker mode)
    echo See infra/DOCKER-RUNNER-MIGRATION.md section 4.
    echo ===================================================================
    pause
    exit /b 1
)

REM Step 3: Preflight — keys must exist in infra/.env (compose fail-loud
REM would catch this too; a clear message beats a stack trace)
if not exist "infra\.env" (
    echo ===================================================================
    echo [ERROR] infra\.env is missing. Copy infra\.env.example to
    echo infra\.env and set OPENWA_ADMIN_API_KEY + RUNNER_API_KEY first.
    echo ===================================================================
    pause
    exit /b 1
)

echo [DOCKER] Building + starting the workflow-runner container...
docker compose -f infra/docker-compose.runner.yml up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================================
    echo [ERROR] docker compose failed. Most likely cause: a required key
    echo is missing in infra\.env (RUNNER_API_KEY / OPENWA_ADMIN_API_KEY).
    echo See infra/DOCKER-RUNNER-MIGRATION.md section 4 for the full env
    echo contract, including the optional Supabase telemetry vars.
    echo ===================================================================
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo [SUCCESS] Workflow runner is up!
echo   • Control API:  http://127.0.0.1:2786/api/health
echo   • With key:     curl -H "X-API-Key: ..." http://127.0.0.1:2786/api/workflows
echo   • Logs:         docker compose -f infra/docker-compose.runner.yml logs -f
echo   • Stop:         docker compose -f infra/docker-compose.runner.yml down
echo ===================================================================
echo.
pause
