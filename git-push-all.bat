@echo off
cd /d "%~dp0"
title Sierra Estates - Git Push to GitHub
echo ==============================================================================
echo       SIERRA ESTATES — SYNC & PUSH ALL UPDATES TO GITHUB
echo ==============================================================================
echo.

echo [1/5] Syncing latest remote state...
git pull --rebase origin main
echo.

echo [2/5] Staging all verified files and new 4-line WhatsApp bot...
git add -A
echo.

echo [3/5] Inspecting staged changes...
echo ------------------------------------------------------------------------------
git status --short
echo ------------------------------------------------------------------------------
echo.

echo [4/5] Committing changes...
git commit -m "feat(whatsapp-bot): add 4-line concurrent Baileys listener with n8n webhook relay"
echo.

echo [5/5] Pushing to GitHub (origin/main)...
git push origin main
echo.

if %ERRORLEVEL% EQU 0 (
  echo ==============================================================================
  echo  SUCCESS: All updates pushed to GitHub successfully!
  echo  Repo: https://github.com/afawzy886619888866-cloud/Sierra-Estates
  echo ==============================================================================
) else (
  echo ==============================================================================
  echo  NOTE: If nothing was committed, your branch is already up-to-date.
  echo ==============================================================================
)
echo.
pause
