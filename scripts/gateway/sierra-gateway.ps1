# ============================================================================
# SIERRA WHATSAPP PC GATEWAY — one script, six actions (2026-10-31)
# ============================================================================
# Turns THIS PC into the Sierra WhatsApp gateway (replaces the retired EC2 box).
# Cost: $0/month. Gates open whenever the PC is on; outbound messaging runs
# 09:00-21:00 Cairo (day-shift window now lives in the repo's sierra_master.py).
#
# Usage (or just double-click the .bat launchers next to this file):
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 install
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 start
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 stop
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 status
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 autostart
#   powershell -ExecutionPolicy Bypass -File sierra-gateway.ps1 unautostart
#
# Requires: Docker Desktop (https://docs.docker.com/desktop/setup/install/windows-install/)
#           Python (https://www.python.org/downloads/)  [py launcher or python on PATH]
# ============================================================================
param(
    [Parameter(Position = 0)]
    [ValidateSet('install', 'start', 'stop', 'status', 'autostart', 'unautostart')]
    [string]$Action = 'status'
)

# ─────────────────────────── CONFIG (edit here only) ───────────────────────
$ApiKey          = 'sierra_secret_key_2026'   # must match AUTHENTICATION_API_KEY in the docker run below
$GatewayPort     = 8080                       # Evolution API on localhost
$WebhookPort     = 5000                       # sierra_webhook.py inbound server
$Container       = 'evolution-api'

# The ONE line clients see on the website: 01092048333.
# Optional extra rotation lines from the old setup are listed but commented out.
$Instances       = @(
    'sierra_01092048333'      # <- THE client-facing line (website shows only 01092048333)
    # 'sierra_01032206443'    # <- optional rotation line (uncomment to re-enable)
    # 'sierra_01031622600'    # <- optional rotation line (uncomment to re-enable)
    # 'sierra_01061399688'    # <- optional rotation line (uncomment to re-enable)
)

$DirectMgmtPhone = '+201092048333'
$SheetCsvUrl     = 'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/export?format=csv'
$RepoUrl         = 'https://github.com/afawzy886619888866-cloud/Sierra-Estates.git'
$WorkDir         = Join-Path $HOME 'Sierra-Estates'
$LogDir          = Join-Path $HOME 'Sierra-Gateway-Logs'
$TaskName        = 'SierraWhatsAppGateway'
$DockerDesktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$KitDir          = Split-Path -Parent $MyInvocation.MyCommand.Path
# ────────────────────────────────────────────────────────────────────────────

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  -> $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "  -> $msg" -ForegroundColor Yellow }

function Get-Py {
    if (Get-Command py -ErrorAction SilentlyContinue) { return 'py' }
    if (Get-Command python -ErrorAction SilentlyContinue) { return 'python' }
    return $null
}

function Test-DockerReady {
    docker info *> $null
    return ($LASTEXITCODE -eq 0)
}

function Ensure-Docker {
    if (Test-DockerReady) { Write-Ok 'Docker engine already running'; return $true }
    if (-not (Test-Path $DockerDesktopExe)) {
        Write-Host '  Docker Desktop is NOT installed.' -ForegroundColor Red
        Write-Host '  Install it from: https://docs.docker.com/desktop/setup/install/windows-install/' -ForegroundColor Red
        Write-Host '  (WSL2 backend, defaults are fine). Then run this script again.' -ForegroundColor Red
        return $false
    }
    Write-Warn2 'Docker engine down - starting Docker Desktop (first start can take ~1 minute)...'
    Start-Process $DockerDesktopExe
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        if (Test-DockerReady) { Write-Ok 'Docker engine is up'; return $true }
        Write-Host '    ...waiting for Docker' -ForegroundColor DarkGray
    }
    Write-Host '  Docker did not become ready in 3 minutes. Open Docker Desktop manually, wait until it says "Engine running", then run START again.' -ForegroundColor Red
    return $false
}

function Ensure-Workspace {
    if (-not (Test-Path (Join-Path $WorkDir '.git'))) {
        Write-Warn2 "Cloning Sierra-Estates into $WorkDir ..."
        git clone $RepoUrl $WorkDir
        if ($LASTEXITCODE -ne 0) { throw 'git clone failed - check your internet connection.' }
    } else {
        Write-Warn2 'Updating existing checkout (fetch + hard reset to origin/main)...'
        git -C $WorkDir fetch origin
        git -C $WorkDir reset --hard origin/main
        git -C $WorkDir clean -fd *> $null
    }
    Write-Ok "workspace ready @ $(git -C $WorkDir rev-parse --short HEAD)"
}

function Start-PythonLane {
    $py = Get-Py
    if (-not $py) { Write-Host '  Python not found - webhook/orchestrator/heartbeat NOT started. Install Python from python.org.' -ForegroundColor Red; return }

    # env for the python lane (inherited by child processes)
    $env:EVOLUTION_API_URL  = "http://localhost:$GatewayPort"
    $env:EVOLUTION_API_KEY  = $ApiKey
    $env:SIERRA_INSTANCES   = ($Instances -join ',')
    $env:SHEET_CSV_URL      = $SheetCsvUrl
    $env:DIRECT_MGMT_PHONE  = $DirectMgmtPhone
    $env:PYTHONUNBUFFERED   = '1'

    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

    Start-Process -FilePath $py -ArgumentList 'sierra_webhook.py' -WorkingDirectory $WorkDir -WindowStyle Minimized `
        -RedirectStandardOutput "$LogDir\webhook-$stamp.log" -RedirectStandardError "$LogDir\webhook-$stamp.err.log"
    Start-Process -FilePath $py -ArgumentList 'sierra_master.py' -WorkingDirectory $WorkDir -WindowStyle Minimized `
        -RedirectStandardOutput "$LogDir\orchestrator-$stamp.log" -RedirectStandardError "$LogDir\orchestrator-$stamp.err.log"
    Start-Process -FilePath $py -ArgumentList (Join-Path $KitDir 'sierra_pc_heartbeat.py') -WorkingDirectory $KitDir -WindowStyle Minimized `
        -RedirectStandardOutput "$LogDir\heartbeat-$stamp.log" -RedirectStandardError "$LogDir\heartbeat-$stamp.err.log"
    Write-Ok "python lane started (webhook :$WebhookPort, orchestrator, site heartbeat) - logs: $LogDir"
}

function Stop-PythonLane {
    $procs = Get-CimInstance Win32_Process -Filter "Name like 'python%' or Name like 'py.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'sierra_(master|webhook|pc_heartbeat)\.py' }
    if (-not $procs) { Write-Ok 'python lane was not running'; return }
    foreach ($p in $procs) {
        try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop; Write-Ok "stopped $($p.Name) pid $($p.ProcessId)" }
        catch { Write-Warn2 "could not stop pid $($p.ProcessId): $($_.Exception.Message)" }
    }
}

function Show-Pairing($inst) {
    $base = "http://localhost:$GatewayPort"
    $h = @{ apikey = $ApiKey }
    try {
        $conn = Invoke-RestMethod -Uri "$base/instance/connect/$inst" -Method Get -Headers $h -TimeoutSec 30
        $pairCode = $conn.qrcode.code
        $qrB64    = $conn.qrcode.base64
        if ($qrB64) {
            $html = "<html><body style='font-family:sans-serif;background:#111;color:#eee'>" +
                    "<h2>Pair instance: $inst</h2>" +
                    "<p>Option 1 - scan this QR with WhatsApp &gt; Linked devices:</p>" +
                    "<img src='data:image/png;base64,$qrB64' width='300'/>" +
                    "<p>Option 2 - enter this pairing code on the phone instead:</p>" +
                    "<h3 style='color:gold'>$pairCode</h3></body></html>"
            $pairFile = Join-Path $LogDir "pair_$inst.html"
            $html | Out-File -FilePath $pairFile -Encoding utf8
            Start-Process $pairFile
            Write-Ok "$inst : pairing code = $pairCode (QR saved to $pairFile)"
        } else {
            Write-Warn2 "$inst : connect returned no QR (maybe already linked). State: $($conn.state)"
        }
    } catch {
        Write-Warn2 "$inst : could not fetch pairing QR ($($_.Exception.Message)). Open $base/instance/connect/$inst in a browser."
    }
}

function Show-Status {
    Write-Step 'Gateway status'
    $ctr = docker ps -a --filter "name=$Container" --format '{{.Names}} {{.Status}}' 2>$null
    if ($ctr) { Write-Ok "container: $ctr" } else { Write-Warn2 "container '$Container' not created yet (run INSTALL)" }

    try {
        $h = @{ apikey = $ApiKey }
        $list = Invoke-RestMethod -Uri "http://localhost:$GatewayPort/instance/list" -Method Get -Headers $h -TimeoutSec 10
        $insts = @($list)
        Write-Ok "Evolution API up - $($insts.Count) instance(s)"
        foreach ($i in $insts) {
            Write-Host ("    {0,-24} {1}" -f $i.instance.name, $i.instance.state.connectionStatus)
        }
    } catch { Write-Warn2 "Evolution API not answering on :$GatewayPort" }

    try {
        $w = Invoke-RestMethod -Uri "http://localhost:$WebhookPort/health" -Method Get -TimeoutSec 5
        Write-Ok "webhook server: $($w.status) (port $WebhookPort)"
    } catch { Write-Warn2 "webhook server not answering on :$WebhookPort" }

    try {
        $s = Invoke-RestMethod -Uri 'https://sierra-estates.net/api/whatsapp/health' -Method Get -TimeoutSec 10
        $age = $s.pulseAgeSec
        if ($null -ne $age) {
            if ($age -lt 120) { Write-Ok "site heartbeat: fresh (pulse ${age}s ago, ok=$($s.ok))" }
            else { Write-Warn2 "site heartbeat: STALE (pulse ${age}s ago) - is the heartbeat running? PC gateway may be offline" }
        }
    } catch { Write-Warn2 'site heartbeat endpoint unreachable' }

    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Write-Ok "auto-start at logon: ENABLED ($TaskName)"
    } else { Write-Warn2 'auto-start at logon: disabled (run ENABLE-AUTO-START.bat once)' }

    if (Test-Path $LogDir) {
        $latest = Get-ChildItem $LogDir -Filter '*.log' | Sort-Object LastWriteTime -Descending | Select-Object -First 3
        if ($latest) {
            Write-Host "`n  latest logs:" -ForegroundColor DarkCyan
            foreach ($f in $latest) { Write-Host ("    {0}  ({1} KB)" -f $f.Name, [math]::Round($f.Length/1KB,1)) }
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# ACTION DISPATCH
# ═══════════════════════════════════════════════════════════════════════════
switch ($Action) {

    'install' {
        Write-Step '[1/5] Docker engine'
        if (-not (Ensure-Docker)) { exit 1 }

        Write-Step '[2/5] Sierra-Estates workspace (repo scripts + orchestrator)'
        Ensure-Workspace

        Write-Step '[3/5] Python dependencies'
        $py = Get-Py
        if (-not $py) { Write-Host '  Python NOT found. Install it from https://www.python.org/downloads/ (check "Add to PATH"), then run INSTALL again.' -ForegroundColor Red; exit 1 }
        & $py -m pip install --upgrade pip --quiet
        & $py -m pip install requests pandas openpyxl fastapi uvicorn tzdata --quiet
        Write-Ok 'requests, pandas, openpyxl, fastapi, uvicorn, tzdata ready'

        Write-Step '[4/5] Evolution API container (auto-starts with Docker on boot)'
        $exists = docker ps -a --filter "name=$Container" --format '{{.Names}}'
        if ($exists) {
            docker start $Container | Out-Null
            Write-Ok "existing container '$Container' started"
        } else {
            docker run -d --name $Container --restart always -p "${GatewayPort}:8080" `
              -e "AUTHENTICATION_API_KEY=$ApiKey" `
              -v evolution_data:/evolution/instances `
              atendai/evolution-api:latest | Out-Null
            Write-Ok "container '$Container' created and started (restart policy: always)"
        }
        Start-Sleep -Seconds 10

        Write-Step '[5/5] WhatsApp instances + pairing'
        $base = "http://localhost:$GatewayPort"
        $h = @{ apikey = $ApiKey }
        foreach ($inst in $Instances) {
            try {
                $body = @{
                    instanceName = $inst
                    qrcode       = $true
                    integration  = 'WHATSAPP-BAILEYS'
                    webhook      = @{ url = "http://host.docker.internal:$WebhookPort/webhook?key=$ApiKey" }
                } | ConvertTo-Json -Depth 5
                Invoke-RestMethod -Uri "$base/instance/create" -Method Post -Headers $h -ContentType 'application/json' -Body $body -TimeoutSec 30 -ErrorAction Stop | Out-Null
                Write-Ok "instance '$inst' created"
            } catch {
                Write-Warn2 "instance '$inst' create: $($_.Exception.Message) (may already exist)"
            }
            Show-Pairing $inst
            Start-Sleep -Seconds 2
        }

        Write-Host "`n  Scan each QR (or enter the pairing code on the phone)." -ForegroundColor Cyan
        Write-Host '  WhatsApp > Settings > Linked devices > Link a device.' -ForegroundColor Cyan

        Start-PythonLane

        Write-Step 'DONE - what is now running on this PC'
        Write-Host '  • Evolution API gateway  : http://localhost:'"$GatewayPort"'  (WhatsApp lines live here)' -ForegroundColor Gray
        Write-Host '  • Inbound webhook server : http://localhost:'"$WebhookPort"'/webhook  (answers messages)' -ForegroundColor Gray
        Write-Host '  • Orchestrator           : outbound shifts 09:00-21:00 Cairo, sheet-driven' -ForegroundColor Gray
        Write-Host '  • Site heartbeat         : keeps sierra-estates.net WhatsApp status green' -ForegroundColor Gray
        Write-Host "`n  Next: run ENABLE-AUTO-START.bat once so everything opens by itself whenever the PC boots." -ForegroundColor Cyan
    }

    'start' {
        Write-Step 'Starting gateway'
        if (-not (Ensure-Docker)) { exit 1 }
        docker start $Container 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Ok "container '$Container' started" } else { Write-Warn2 "container '$Container' not found - run INSTALL first" }
        Start-PythonLane
        Show-Status
    }

    'stop' {
        Write-Step 'Stopping gateway'
        Stop-PythonLane
        docker stop $Container 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Ok "container '$Container' stopped" }
        Write-Host '  WhatsApp lines are now OFFLINE. The website status will go dark ~5 minutes later (honest signal).' -ForegroundColor Yellow
    }

    'status' { Show-Status }

    'autostart' {
        Write-Step 'Registering auto-start at logon (gates open whenever this PC boots)'
        $bat = Join-Path $KitDir 'START-GATEWAY.bat'
        schtasks /create /tn $TaskName /tr "`"$bat`"" /sc onlogon /rl limited /f *> $null
        if ($LASTEXITCODE -eq 0) { Write-Ok "scheduled task '$TaskName' created - gateway starts at every logon" }
        else { Write-Host '  Could not create the scheduled task. Run this window as administrator once and retry.' -ForegroundColor Red }
    }

    'unautostart' {
        schtasks /delete /tn $TaskName /f *> $null
        if ($LASTEXITCODE -eq 0) { Write-Ok "scheduled task '$TaskName' removed" } else { Write-Warn2 "no task named '$TaskName'" }
    }
}
