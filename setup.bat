@echo off
echo ========================================================
echo Sierra Estates - Local Environment Setup
echo ========================================================
cd /d "%~dp0"

echo 1. Ensuring workflows dependencies...
cd workflows
if not exist node_modules (
    call npm install --no-audit --no-fund
)
if not exist .state (
    mkdir .state
)
cd ..

echo 2. Ensuring scraper dependencies...
cd infra\whatsapp-scraper
if not exist node_modules (
    call npm install --no-audit --no-fund
)
cd ..\..

echo Setup complete.
