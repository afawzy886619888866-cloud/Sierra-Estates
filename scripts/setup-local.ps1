# 🌌 Sierra Estates 2027 — Local One-Command Setup Script (Windows PowerShell)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    🪐 sierra estates 2027 PROPTECH OS LOCAL SETUP ENGINE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for pnpm
Write-Host "[1/5] Checking for pnpm..." -ForegroundColor Yellow
$pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpmCheck) {
    Write-Host "❌ pnpm is not installed. Please run: npm install -g pnpm" -ForegroundColor Red
    exit 1
}
Write-Host "✅ pnpm detected: $($pnpmCheck.Source)" -ForegroundColor Green

# 2. Check for Docker
Write-Host ""
Write-Host "[2/5] Checking if Docker Desktop is running..." -ForegroundColor Yellow
$dockerCheck = Get-Process docker -ErrorAction SilentlyContinue
if ($null -eq $dockerCheck) {
    Write-Host "⚠️  Docker is not running. n8n workflow engine won't start automatically." -ForegroundColor Magenta
    Write-Host "👉 Please launch Docker Desktop if you plan to self-host n8n." -ForegroundColor Gray
} else {
    Write-Host "✅ Docker Desktop is running!" -ForegroundColor Green
}

# 3. Environment check
Write-Host ""
Write-Host "[3/5] Verifying environment configurations..." -ForegroundColor Yellow
$envPath = "apps/web/.env.local"
if (Test-Path $envPath) {
    Write-Host "✅ apps/web/.env.local found!" -ForegroundColor Green
} else {
    Write-Host "⚠️  apps/web/.env.local not found. Copying from .env.local.example..." -ForegroundColor Magenta
    Copy-Item "apps/web/.env.local.example" $envPath
    Write-Host "👉 Created apps/web/.env.local. Please enter your Firebase and Gemini API keys inside it." -ForegroundColor Gray
}

# 4. Install dependencies
Write-Host ""
Write-Host "[4/5] Installing monorepo dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dependency installation failed." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green

# 5. Provide launch commands
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🎉 sierra estates IS READY FOR LOCAL DEVELOPMENT!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the client-facing portal & admin dashboard:" -ForegroundColor Cyan
Write-Host "👉 pnpm exec turbo run dev --parallel" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start the self-hosted n8n workflow automation engine:" -ForegroundColor Cyan
Write-Host "👉 docker-compose -f docker-compose.n8n.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "To run the automated tests suite to verify operations:" -ForegroundColor Cyan
Write-Host "👉 pnpm test" -ForegroundColor Yellow
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "🔗 Luxury Portal:   http://localhost:3000" -ForegroundColor Gray
Write-Host "🔗 Admin CRM:       http://localhost:5173" -ForegroundColor Gray
Write-Host "🔗 n8n Dashboard:   http://localhost:5678" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
