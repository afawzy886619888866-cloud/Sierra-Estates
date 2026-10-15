@echo off
title Sierra Estates - Admin Bridge (Port 2790)
cd /d "%~dp0"
echo Starting Sierra Admin Bridge on http://127.0.0.1:2790/admin...
node sierra-admin-bridge.mjs
