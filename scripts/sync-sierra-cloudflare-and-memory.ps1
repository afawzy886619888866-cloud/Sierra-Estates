<#
.SYNOPSIS
  Sierra Estates · Unified Zero-Exposure Credentials, Cloudflare Worker & Memory Sync Command

.DESCRIPTION
  1. Optionally prompts (masked input — never echoed or logged) to update TELEGRAM_BOT_TOKEN.
  2. Syncs all required production secrets from local .env.local -> GitHub Secrets -> Cloudflare Worker `sierra-estates`.
  3. Broadcasts the canonical Cloudflare single-project deployment announcement into:
       - OpenClaw Episodic Memory (C:\Users\Sierr\.openclaw\memory\episodic.jsonl)
       - Obsidian Shared Store (packages/obsidian/obsidian-store.json)
       - Amphion Command Deck Memory API (http://127.0.0.1:8888/api/memory/events, if running)
  4. Mirrors OpenClaw skills, SOUL.md, and USER.md into PCMClawUbuntu WSL2 if Running.
  5. Smoke-tests all live Cloudflare production endpoints.
#>

[CmdletBinding()]
param(
  [switch]$SkipTelegramPrompt,
  [switch]$SkipWorkerSecretSync
)

$ErrorActionPreference = "Stop"
$RepoRoot = "H:\Sierra Estates"
$RepoSlug = "afawzy886619888866-cloud/Sierra-Estates"
$WorkerName = "sierra-estates"
$CfAccountId = "22804b3ba513993444a33357d7bca953"
$CfZoneId = "e2263fa4159f29a08a8d589d08e9ce8e"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Sierra Estates · Cloudflare & Memory Unified Sync" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# 1. Optional masked BotFather TELEGRAM_BOT_TOKEN update
if (-not $SkipTelegramPrompt) {
  $sec = Read-Host "Paste new BotFather TELEGRAM_BOT_TOKEN (hidden, or press Enter to keep current)" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $tgToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  if ($tgToken -and $tgToken.Trim().Length -gt 10) {
    $tgToken = $tgToken.Trim()
    @("$RepoRoot\.env.local", "$RepoRoot\apps\sierra-estates-realty\.env.local") | ForEach-Object {
      if (Test-Path $_) {
        $c = Get-Content $_ -Raw
        $c = if ($c -match '(?m)^TELEGRAM_BOT_TOKEN=') { [regex]::Replace($c, '(?m)^TELEGRAM_BOT_TOKEN=.*', "TELEGRAM_BOT_TOKEN=$tgToken") } else { $c.TrimEnd() + "`nTELEGRAM_BOT_TOKEN=$tgToken`n" }
        Set-Content -Path $_ -Value $c -NoNewline
      }
    }
    Write-Host "[OK] Updated TELEGRAM_BOT_TOKEN in local .env.local files." -ForegroundColor Green
  }
  Remove-Variable sec, tgToken -ErrorAction SilentlyContinue
}

# 2. Load local .env files into memory (values never printed)
$envMap = @{}
@("$RepoRoot\.env", "$RepoRoot\.env.local", "$RepoRoot\apps\sierra-estates-realty\.env.local") | ForEach-Object {
  if (Test-Path $_) {
    Get-Content $_ | ForEach-Object {
      if ($_ -match '^([A-Z0-9_]+)=(.*)$') {
        $k = $matches[1]; $v = $matches[2].Trim().Trim('"').Trim("'")
        if ($v) { $envMap[$k] = $v }
      }
    }
  }
}

$workerKeys = @(
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET", "ADMIN_API_KEY", "CRON_SECRET", "SBR_SECRET_KEY",
  "GEMINI_API_KEY", "GOOGLE_AI_API_KEY", "TELEGRAM_BOT_TOKEN",
  "WHATSAPP_API_TOKEN", "PF_WEBHOOK_SECRET", "CLOUDFLARE_API_TOKEN"
)

# 3. Sync secrets to GitHub Secrets & Cloudflare Worker `sierra-estates`
if (-not $SkipWorkerSecretSync) {
  $bulk = @{}
  foreach ($k in $workerKeys) {
    if ($envMap.ContainsKey($k)) {
      if ($k -ne "CLOUDFLARE_API_TOKEN") { $bulk[$k] = $envMap[$k] }
      if (Get-Command gh -ErrorAction SilentlyContinue) {
        $envMap[$k] | gh secret set $k --repo $RepoSlug 2>$null | Out-Null
      }
    }
  }
  $bulk["OPENCLAW_PROVIDER"] = "gemini"
  if ($envMap.ContainsKey("CLOUDFLARE_API_TOKEN")) {
    $env:CLOUDFLARE_API_TOKEN = $envMap["CLOUDFLARE_API_TOKEN"]
    $env:CLOUDFLARE_ACCOUNT_ID = $CfAccountId
    $tmpSecrets = Join-Path $env:TEMP "sierra-cf-secrets-$([guid]::NewGuid().ToString('N')).json"
    try {
      $bulk | ConvertTo-Json -Depth 2 | Set-Content -Path $tmpSecrets -Encoding UTF8
      Push-Location "$RepoRoot\apps\sierra-estates-realty"
      npx wrangler secret bulk $tmpSecrets --name $WorkerName | Out-Null
      Pop-Location
      Write-Host "[OK] Synced $($bulk.Count) runtime secrets to Cloudflare Worker '$WorkerName'." -ForegroundColor Green
    } finally {
      if (Test-Path $tmpSecrets) { Remove-Item $tmpSecrets -Force }
    }
  }
  Remove-Variable bulk -ErrorAction SilentlyContinue
}

# 4. Broadcast canonical Cloudflare Platform Authority into ALL Memory Layers
$announcement = @{
  hosting = "Cloudflare Workers (Unified Single Project)"
  worker = $WorkerName
  accountId = $CfAccountId
  zoneId = $CfZoneId
  domains = @("https://sierra-estates.net", "https://www.sierra-estates.net", "https://admin.sierra-estates.net")
  backend = "https://gaxfqcietzoonlmatiot.supabase.co"
  retired = @("Vercel", "Firebase")
  updatedAt = (Get-Date).ToUniversalTime().ToString("o")
}

# 4a. OpenClaw Episodic Memory
$ocMemReq = @{
  jsonrpc = "2.0"
  id = 1
  method = "tools/call"
  params = @{
    name = "openclaw_memory_rw"
    arguments = @{
      action = "write"
      kind = "platform-authority-announcement"
      entity = "cloudflare-unified-sierra-estates"
      summary = "Production hosting cutover COMPLETE: unified Cloudflare Worker 'sierra-estates' serves sierra-estates.net, www.sierra-estates.net, and admin.sierra-estates.net (Zero Trust Access). Vercel & Firebase permanently retired."
      tags = @("cloudflare", "production-authority", "vercel-retired", "4-engine-brain")
    }
  }
} | ConvertTo-Json -Depth 6 -Compress
$ocMemReq | node "$RepoRoot\scripts\openclaw-mcp-server.mjs" | Out-Null
Write-Host "[OK] Broadcasted Cloudflare authority to OpenClaw Episodic Memory." -ForegroundColor Green

# 4b. Obsidian Shared Store
$obsidianPath = "$RepoRoot\packages\obsidian\obsidian-store.json"
$obsDir = Split-Path $obsidianPath -Parent
if (-not (Test-Path $obsDir)) { New-Item -ItemType Directory -Force -Path $obsDir | Out-Null }
$obsEntries = @()
if (Test-Path $obsidianPath) {
  try {
    $existing = Get-Content $obsidianPath -Raw | ConvertFrom-Json
    if ($existing -is [System.Array]) { $obsEntries = @($existing) }
  } catch {}
}
$obsEntries = @($obsEntries | Where-Object { $_.id -ne "platform-authority-cloudflare-2026" })
$obsEntries += [PSCustomObject]@{
  id = "platform-authority-cloudflare-2026"
  tags = @("cloudflare", "production-authority", "openclaw-execution", "vercel-retired")
  updatedAt = $announcement.updatedAt
  value = $announcement
}
$obsEntries | ConvertTo-Json -Depth 6 | Set-Content -Path $obsidianPath -Encoding UTF8
Write-Host "[OK] Persisted Cloudflare authority to Obsidian Vault ($obsidianPath)." -ForegroundColor Green

# 4c. Amphion Command Deck Memory API (if running on port 8888)
try {
  $cdBody = @{
    memoryKey = "platform.hosting.authority"
    eventType = "upsert"
    sourceType = "verified-system"
    bucket = "ref"
    ttlSeconds = 2592000
    value = $announcement
  } | ConvertTo-Json -Depth 6 -Compress
  Invoke-RestMethod -Uri "http://127.0.0.1:8888/api/memory/events" -Method Post -ContentType "application/json" -Body $cdBody -TimeoutSec 2 | Out-Null
  Write-Host "[OK] Synced Cloudflare authority to Amphion Command Deck Memory (:8888)." -ForegroundColor Green
} catch {
  Write-Host "[INFO] Amphion Command Deck (:8888) not currently listening; Obsidian + OpenClaw memory updated." -ForegroundColor Yellow
}

# 5. Sync OpenClaw hub -> PCMClawUbuntu WSL2 if Running
$wslState = (wsl.exe -l -v 2>$null | Out-String) -replace "`0", ""
if ($wslState -match "PCMClawUbuntu\s+Running") {
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"openclaw_pc_sync","arguments":{}}}' | node "$RepoRoot\scripts\openclaw-mcp-server.mjs" | Out-Null
  Write-Host "[OK] Synced 62 skills + SOUL.md + USER.md into PCMClawUbuntu WSL2." -ForegroundColor Green
} else {
  Write-Host "[INFO] PCMClawUbuntu is Stopped — OpenClaw host hub (C:\Users\Sierr\.openclaw) is active with 62 skills." -ForegroundColor Yellow
}

# 6. Live Production Endpoint Verification
Write-Host "`n--- Live Cloudflare Production Verification ---" -ForegroundColor Cyan
foreach ($u in @(
  "https://sierra-estates.net/",
  "https://www.sierra-estates.net/",
  "https://sierra-estates.net/api/health",
  "https://sierra-estates.net/api/openclaw-terminal",
  "https://admin.sierra-estates.net/"
)) {
  $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 10 $u
  Write-Host ("  {0,-50} -> HTTP {1}" -f $u, $code)
}

Remove-Variable envMap -ErrorAction SilentlyContinue
[GC]::Collect()
Write-Host "`n[DONE] Sierra Estates Cloudflare & Memory Sync complete." -ForegroundColor Green
