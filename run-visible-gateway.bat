@echo off
title Sierra Estates - WhatsApp Gateway (:2785)
cd /d "H:\Sierra Estates"

REM Load infra\.env variables
for /f "usebackq tokens=1* delims==" %%a in ("infra\.env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

set PORT=2785
set TZ=Africa/Cairo
set NODE_ENV=production

cd "apps\agents\whatsapp-multi-session"
echo =======================================================================
echo   Sierra Estates - WhatsApp Multi-Session Gateway (:2785)
echo =======================================================================
node worker.js
pause