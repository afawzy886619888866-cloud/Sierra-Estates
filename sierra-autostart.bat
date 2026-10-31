@echo off
REM ??????????????????????????????????????????????????????????????????????
REM Sierra Estates ? PC Auto-Start Boot Sequence
REM ??????????????????????????????????????????????????????????????????????
REM Owner requirement: the WhatsApp lane must be alive once this PC is
REM opened (at least 09:00-21:00 Cairo). This script runs at every logon
REM (registered by ENABLE-AUTO-START.bat) and also works when started by
REM hand at any time. It is IDEMPOTENT: every step checks first, so
REM re-running it never breaks a healthy stack.
REM ??????????????????????????????????????????????????????????????????????
setlocal
cd /d "%~dp0"
set /a WAITED=0

echo [%date% %time%] sierra-autostart: boot sequence starting

REM ?? Quick check: are both services already listening? ???????????????
netstat -ano | findstr /R /C:":2785 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    netstat -ano | findstr /R /C:":2786 .*LISTENING" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [%date% %time%] Both services already active on :2785 and :2786
        goto stack_up
    )
)

REM ?? Step 1: Docker engine, or launch Docker Desktop ??????????????????
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Docker engine already up
    goto docker_up
)
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo [%date% %time%] Launching Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
    echo [%date% %time%] Launching Docker Desktop...
    start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
)

REM ?? Step 2: wait for Docker engine (up to 30s) ???????????????????????
:wait_engine
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto docker_up
set /a WAITED+=5
if %WAITED% GEQ 30 (
    echo [%date% %time%] Docker engine not ready after 30s - activating resilient native fallback...
    goto native_fallback
)
ping -n 6 127.0.0.1 >nul
goto wait_engine

:docker_up
echo [%date% %time%] Docker engine ready ^(waited ~%WAITED%s^)
if not exist "infra\docker-compose.rag-station.yml" goto native_fallback

echo [%date% %time%] Starting Docker stack...
docker compose -f infra/docker-compose.rag-station.yml up -d
docker compose -f infra/docker-compose.runner.yml up -d
if %ERRORLEVEL% EQU 0 goto stack_up

:native_fallback
REM ?? Resilient Native Node Fallback ??????????????????????????????????
netstat -ano | findstr /R /C:":2785 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Starting native WhatsApp gateway (:2785)...
    start /B "OpenWA Gateway" cmd /c "cd /d apps\agents\whatsapp-multi-session && node worker.js >> ..\..\..\.state\gateway.log 2>&1"
)
netstat -ano | findstr /R /C:":2786 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Starting native workflow runner (:2786)...
    start /B "Workflow Runner" cmd /c "cd /d workflows && node runner.js >> ..\.state\runner.log 2>&1"
)

:stack_up
echo [%date% %time%] sierra-autostart: STACK IS UP - gateway :2785, runner :2786
echo [%date% %time%] Next scheduled: 03:00 Cairo morning briefing, 09:00 Cairo first outreach slot
endlocal
exit /b 0