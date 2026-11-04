<#
.SYNOPSIS
  Sierra Estates - WhatsApp Gateway Activation v2 (hang-proof).

.DESCRIPTION
  Points both Vercel projects at your local 8-line WhatsApp worker through the
  cloudflared tunnel, syncs the gateway API key, redeploys both projects
  (bypasses the Hobby-plan git-deploy block), and verifies.

  v2 fixes for "stops, never continues, no error":
    - TLS 1.2 forced at startup (Windows PowerShell 5.1 hangs silently against
      api.vercel.com without it)
    - 30s timeout on EVERY API call (was: infinite)
    - LOUD "ACTION NEEDED" banner before the token prompt (Read-Host waits
      forever for your paste + ENTER - that is not a hang)
    - Token checked immediately (bad token = instant clear error)
    - Timestamped stage banners - if anything stalls, tell me the last line

  IMPORTANT - commands that run FOREVER by design (NOT stuck):
    - start-openwa-8lines.bat / pnpm openwa:8lines   -> the worker, never exits.
      First run also installs dependencies + 8 Chromiums: 5-10 min of quiet.
    - cloudflared tunnel --url http://localhost:2785 -> the tunnel, never exits.
      The https://....trycloudflare.com URL appears inside its output box
      after ~5 seconds. Copy it, LEAVE THE WINDOW OPEN, use a NEW window
      for this script.

.PREREQUISITES
  1. Worker running in its own window (see above)
  2. Phones paired: WhatsApp -> Linked Devices -> Link a Device,
     scan QRs at http://localhost:2785/pair
  3. cloudflared running in its own window (see above), URL copied
  4. Then run this script in a THIRD window.

.EXAMPLE
  .\Activate-WhatsAppGateway.ps1 -TunnelUrl https://abc-xyz-123.trycloudflare.com
  .\Activate-WhatsAppGateway.ps1 -TunnelUrl https://abc-xyz-123.trycloudflare.com -GatewayKey my-secret -Mode Deploy
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$TunnelUrl,                      # https://....trycloudflare.com

  [string]$GatewayKey = 'sierra-admin-secret',   # worker's key (X-API-Key). Change if you set a custom one in the worker .env

  [string]$VercelToken = '',               # vcp_... token; prompted if omitted

  [ValidateSet('All', 'EnvUpdate', 'Deploy', 'Verify')]
  [string]$Mode = 'All'
)

$ErrorActionPreference = 'Stop'
$Team      = 'sierrablue8866-1492'
$RepoOwner = 'afawzy886619888866-cloud'
$RepoSlug  = 'Sierra-Estates'
$RepoId    = 1423151160
$Projects  = @('sierra-estates-client-portal', 'admin-dashboard')

function Log([string]$msg) {
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor White
}

# -- TLS 1.2: without this, PowerShell 5.1 can hang silently on modern APIs --
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  Log "TLS 1.2 enabled"
} catch { Log "TLS 1.2 setting skipped (PS7 handles this)" }

# -- token (loud prompt - this waits for your paste + ENTER, that is normal) --
if (-not $VercelToken) {
  Write-Host ''
  Write-Host '=============================================================' -ForegroundColor Yellow
  Write-Host '  ACTION NEEDED: paste your Vercel token, then press ENTER'   -ForegroundColor Yellow
  Write-Host '  Get it from: vercel.com/account/settings/tokens'           -ForegroundColor Yellow
  Write-Host '  (it starts with vcp_ ... the script is waiting for it)'    -ForegroundColor Yellow
  Write-Host '=============================================================' -ForegroundColor Yellow
  $VercelToken = Read-Host 'Vercel token'
}
if ($VercelToken -notlike 'vcp_*') { throw 'Token must start with vcp_ - you pasted something else.' }

$Headers = @{ Authorization = "Bearer $VercelToken"; 'Content-Type' = 'application/json' }

function VercelApi([string]$Method, [string]$Path, $Body = $null) {
  $uri = "https://api.vercel.com$Path"
  $p = @{ Method = $Method; Uri = $uri; Headers = $Headers; TimeoutSec = 30 }
  if ($Body) { $p.Body = ($Body | ConvertTo-Json -Depth 10) }
  Invoke-RestMethod @p
}

# -- validate token immediately (fail fast, not deep inside env update) --
Log "Checking token ..."
$me = VercelApi GET '/v2/user'
if ($me.user -and $me.user.username) {
  Log "Token OK (account: $($me.user.username))"
} else {
  Log "Token accepted by Vercel API"
}

# -- normalize tunnel url --
if ($TunnelUrl -notmatch '^https?://') { $TunnelUrl = "https://$TunnelUrl" }
$TunnelUrl  = $TunnelUrl.TrimEnd('/')
$TunnelHost = ($TunnelUrl -replace '^https?://', '')
Log "Tunnel : $TunnelUrl"
Log "Host   : $TunnelHost"

# sanity: is the tunnel actually serving the worker?
try {
  $probe = Invoke-RestMethod -Method GET -Uri "$TunnelUrl/api/health" -TimeoutSec 10
  $probeStatus = if ($probe.status) { $probe.status } else { 'up' }
  Log "Worker probe OK: $probeStatus"
} catch {
  Write-Warning "Could not reach $TunnelUrl/api/health - is the worker + cloudflared running? (continuing)"
}

# -- 1. update env vars on both projects --------------------------------------
$Updates = [ordered]@{
  'WHATSAPP_API_URL'       = $TunnelUrl        # priority endpoint everywhere (full URL)
  'OPENWA_HOST'            = $TunnelHost       # legacy fallback (bare host)
  'WHATSAPP_GATEWAY_HOST'  = $TunnelHost
  'OPENWA_ADMIN_API_KEY'   = $GatewayKey       # must match the worker's X-API-Key
  'WHATSAPP_API_KEY'       = $GatewayKey
  'WHATSAPP_API_TOKEN'     = $GatewayKey
}

if ($Mode -in 'All', 'EnvUpdate') {
  Log "STAGE 1/3: updating env vars on BOTH projects (~1 min) ..."
  foreach ($proj in $Projects) {
    Log "  [$proj] reading current env ..."
    $envs = (VercelApi GET "/v9/projects/$proj/env?teamId=$Team").envs
    foreach ($key in $Updates.Keys) {
      $var = $envs | Where-Object { $_.key -eq $key } | Select-Object -First 1
      if ($var) {
        $null = VercelApi PATCH "/v9/projects/$proj/env/$($var.id)?teamId=$Team" @{ value = $Updates[$key] }
        Log "    PATCHED $key"
      } else {
        $null = VercelApi POST "/v9/projects/$proj/env?teamId=$Team" @{
          key = $key; value = $Updates[$key]
          target = @('production', 'preview'); type = 'encrypted'
        }
        Log "    CREATED $key"
      }
    }
    Log "  [$proj] done"
  }
}

# -- 2. deploy both projects (API bypass for blocked git auto-deploy) ---------
if ($Mode -in 'All', 'Deploy') {
  Log "STAGE 2/3: triggering production deployments ..."
  $deploys = @()
  foreach ($proj in $Projects) {
    $body = @{
      name   = $proj
      target = 'production'
      gitSource = @{ type = 'github'; repoId = $RepoId; repoOwner = $RepoOwner; repoSlug = $RepoSlug; ref = 'main' }
    }
    $d = VercelApi POST "/v13/deployments?teamId=$Team&skipAutoDetectionConfirmation=1" $body
    $deploys += $d
    Log "  $proj -> $($d.id)"
  }

  Log "Watching builds (2-7 min typical) ..."
  $start = Get-Date
  $pending = $deploys
  $deadline = (Get-Date).AddMinutes(15)
  while ($pending -and ((Get-Date) -lt $deadline)) {
    Start-Sleep 20
    $next = @()
    foreach ($d in $pending) {
      try { $cur = VercelApi GET "/v13/deployments/$($d.id)?teamId=$Team" } catch { $next += $d; continue }
      if ($cur.readyState -in 'READY', 'ERROR', 'CANCELED') {
        $color = if ($cur.readyState -eq 'READY') { 'Green' } else { 'Red' }
        Write-Host "    $($d.name): $($cur.readyState)" -ForegroundColor $color
      } else {
        $mins = [math]::Round(((Get-Date) - $start).TotalMinutes, 1)
        Write-Host "    $($d.name): $($cur.readyState) ... ($mins min)" -ForegroundColor DarkGray
        $next += $d
      }
    }
    $pending = $next
  }
  if ($pending) { Write-Warning 'Timed out after 15 min - check vercel.com/dashboard (deploys continue server-side).' }
}

# -- 3. verify -----------------------------------------------------------------
if ($Mode -in 'All', 'Verify') {
  Log "STAGE 3/3: verification ..."
  try {
    $h = Invoke-RestMethod -Method GET -Uri 'https://sierra-estates.net/api/whatsapp/health' -TimeoutSec 20
    $color = if ($h.ok) { 'Green' } else { 'DarkYellow' }
    Write-Host "    heartbeat : status=$($h.status) ok=$($h.ok) pulseAge=$($h.pulseAgeSec)s" -ForegroundColor $color
    if (-not $h.ok) { Write-Host '      (stale = no line paired yet - pair at http://localhost:2785/pair)' -ForegroundColor DarkGray }
  } catch { Write-Warning "    health probe failed: $_" }
  try {
    $null = Invoke-RestMethod -Method GET -Uri "$TunnelUrl/api/health" -TimeoutSec 15
    Write-Host "    worker    : reachable through tunnel [OK]" -ForegroundColor Green
  } catch { Write-Warning '    worker unreachable through tunnel' }
  Write-Host "    console   : https://admin.sierra-estates.net/admin/whatsapp  (log in as staff)" -ForegroundColor Cyan
}

Write-Host ''
Log "Done. The Command Center wall turns green as lines pair."
Log "REMINDER: cloudflared + worker windows must STAY OPEN. New tunnel URL after any restart -> re-run with -Mode EnvUpdate."
