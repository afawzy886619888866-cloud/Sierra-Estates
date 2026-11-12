@echo off
cd /d "%~dp0"
title Sierra Estates - Git Push to GitHub
echo ========================================================
echo   SIERRA ESTATES — SYNC & PUSH CHANGES TO GITHUB
echo ========================================================
echo.
echo [1/4] Checking current Git status...
git status --short
echo.
echo [2/4] Staging updated workflow & gateway files...
git add apps/agents/whatsapp-multi-session/worker.js start-sierra.bat
echo.
echo [3/4] Committing changes...
git commit -m "feat(outreach): configure visible UI and 3-line sync for WhatsApp owner outreach"
echo.
echo [4/4] Pushing to GitHub (origin/main)...
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo ========================================================
  echo  SUCCESS: All changes pushed to GitHub successfully!
  echo ========================================================
) else (
  echo ========================================================
  echo  NOTE: If nothing was committed, your branch is already
  echo        up-to-date with GitHub. Check output above.
  echo ========================================================
)
echo.
pause
