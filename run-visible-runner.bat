@echo off
title Sierra Estates - Workflow Runner Engine (:2786)
cd /d "H:\Sierra Estates"

REM Load infra\.env variables
for /f "usebackq tokens=1* delims==" %%a in ("infra\.env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

set RUNNER_BIND=0.0.0.0
set RUNNER_PORT=2786
set TZ=Africa/Cairo
set NODE_ENV=production

cd "workflows"
echo =======================================================================
echo   Sierra Estates - Automated Workflow Runner Engine (:2786)
echo =======================================================================
node runner.js
pause