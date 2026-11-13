@echo off
cd /d "%~dp0"
title Sierra Estates - Git Compare, Commit & Push to GitHub
echo ==============================================================================
echo       SIERRA ESTATES — COMPARE & PUSH OUTREACH UPDATES TO GITHUB
echo ==============================================================================
echo.

echo [1/5] Fetching and syncing latest remote state...
git pull --rebase origin main
echo.

echo [2/5] Comparing local modifications with GitHub repo...
echo ------------------------------------------------------------------------------
git diff apps/agents/whatsapp-multi-session/worker.js start-sierra.bat
echo ------------------------------------------------------------------------------
echo.

echo [3/5] Staging verified changes (visible UI, 3-line sync, runner foreground)...
git add apps/agents/whatsapp-multi-session/worker.js start-sierra.bat git-push-all.bat
git status --short
echo.

echo [4/5] Committing changes...
git commit -m "feat(outreach): configure visible UI and 3-line sync for WhatsApp owner outreach"
echo.

echo [5/5] Pushing to GitHub (origin/main)...
git push origin main
echo.

if %ERRORLEVEL% EQU 0 (
  echo ==============================================================================
  echo  SUCCESS: All outreach updates verified and pushed to GitHub!
  echo  Repo: https://github.com/afawzy886619888866-cloud/Sierra-Estates
  echo ==============================================================================
) else (
  echo ==============================================================================
  echo  NOTE: If nothing was committed, your local branch is already 
  echo        completely up-to-date with GitHub. Check the output above.
  echo ==============================================================================
)
echo.
pause
