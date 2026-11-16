@echo off
title Sierra Estates - Phone WhatsApp Cable Sync
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync-phone-cable.ps1"
pause
