param(
  [switch]$Once
)

$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$WorkflowsDir = Join-Path $RepoRoot 'workflows'
$GatewayDir = Join-Path $RepoRoot 'apps\agents\whatsapp-multi-session'
$StateDir = Join-Path $WorkflowsDir '.state'

if (-not (Test-Path $StateDir)) {
  New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

$LogFile = Join-Path $StateDir 'autostart-supervisor.log'
$PidFile = Join-Path $StateDir 'autostart-supervisor.pid'

function Write-AutoLog([string]$Message) {
  $ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $line = "[$ts] $Message"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
}

# Single-instance guard so duplicate supervisors never collide
if (-not $Once -and (Test-Path $PidFile)) {
  try {
    $existingPid = [int](Get-Content $PidFile -ErrorAction Stop | Select-Object -First 1)
    if ($existingPid -gt 0 -and $existingPid -ne $PID) {
      $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -match 'pwsh|powershell') {
        Write-AutoLog "Supervisor already running under PID $existingPid - exiting duplicate instance ($PID)."
        exit 0
      }
    }
  } catch {}
}

if (-not $Once) {
  Set-Content -Path $PidFile -Value "$PID" -Encoding ASCII -Force
}

function Test-InternetConnected {
  foreach ($url in @('https://docs.google.com', 'https://gaxfqcietzoonlmatiot.supabase.co')) {
    try {
      $resp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        return $true
      }
    } catch {
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -gt 0) {
        return $true
      }
    }
  }
  return $false
}

function Test-LocalPort([int]$Port) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect('127.0.0.1', $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1500, $false)
    if ($ok -and $tcp.Connected) {
      $tcp.Close()
      return $true
    }
    $tcp.Close()
  } catch {}
  return $false
}

function Start-GatewayIfDown {
  if (Test-LocalPort -Port 2785) {
    return
  }
  Write-AutoLog 'Starting OpenWA Multi-Session Gateway (:2785)...'
  $env:PORT = '2785'
  $env:NODE_ENV = 'production'
  $env:TZ = 'Africa/Cairo'
  $env:OPENWA_SESSION_IDS = 'line-1,line-2,line-3,line-4,line-5,line-6,line-7,line-8'
  $gwOut = Join-Path $StateDir 'gateway-autostart.out.log'
  $gwErr = Join-Path $StateDir 'gateway-autostart.err.log'
  Start-Process -FilePath 'node' -ArgumentList 'worker.js' -WorkingDirectory $GatewayDir -WindowStyle Hidden -RedirectStandardOutput $gwOut -RedirectStandardError $gwErr | Out-Null

  # Wait up to 45s for gateway HTTP listener
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 3
    if (Test-LocalPort -Port 2785) {
      Write-AutoLog 'OpenWA Gateway (:2785) is up — waiting 15s for WhatsApp sessions to hydrate.'
      Start-Sleep -Seconds 15
      break
    }
  }
}

function Start-AdminBridgeIfDown {
  if (Test-LocalPort -Port 2790) {
    return
  }
  $bridgeScript = Join-Path $WorkflowsDir 'sierra-admin-bridge.mjs'
  if (Test-Path $bridgeScript) {
    Write-AutoLog 'Starting Sierra Admin Bridge (:2790)...'
    Start-Process -FilePath 'node' -ArgumentList 'sierra-admin-bridge.mjs' -WorkingDirectory $WorkflowsDir -WindowStyle Hidden | Out-Null
  }
}

function Start-WorkflowRunnerIfDown {
  if (Test-LocalPort -Port 2786) {
    return
  }
  Write-AutoLog 'Starting Workflow Runner (:2786) [10:00-22:00 Cairo, 30m slots, 25 msgs/number rotating, immediate start]...'
  $env:NODE_ENV = 'production'
  $env:TZ = 'Africa/Cairo'
  $env:RUNNER_BIND = '127.0.0.1'
  $env:RUNNER_PORT = '2786'
  $env:RUNNER_WORKFLOWS = ''
  $env:WHATSAPP_API_URL = 'http://127.0.0.1:2785'
  $env:OPENWA_SESSION_IDS = 'line-1,line-2,line-3,line-4,line-5,line-6,line-7,line-8'
  $env:WF_DRY_RUN = '0'
  $env:WF_HOST_SIDE = 'split'
  $env:WF_ROTATE_SINGLE_LINE = '1'
  $env:WF_PARALLEL_LINES = '1'
  $env:WF_SLOT_BATCH = '25'
  $env:WF_SLOT_DEADLINE_MS = '1380000'
  $env:WF_OWNER_CONTACT_DAILY_CAP = '600'
  $env:WF_OUTREACH_ACTIVE_HOURS = '10-22'
  $env:WF_PACE_MIN_MS = '30000'
  $env:WF_PACE_JITTER_MS = '10000'
  $env:UNITS_SHEET_ID = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk'
  $env:UNITS_SHEET_GID = '1127958606'

  $runOut = Join-Path $StateDir 'runner-autostart.out.log'
  $runErr = Join-Path $StateDir 'runner-autostart.err.log'
  Start-Process -FilePath 'node' -ArgumentList 'runner.js' -WorkingDirectory $WorkflowsDir -WindowStyle Hidden -RedirectStandardOutput $runOut -RedirectStandardError $runErr | Out-Null

  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 2
    if (Test-LocalPort -Port 2786) {
      Write-AutoLog 'Workflow Runner (:2786) is live and executing active slot.'
      break
    }
  }
}

$script:lastPhoneSyncHash = ""
function Check-PhoneCableAndImport {
  try {
    $shell = New-Object -ComObject Shell.Application
    $thisPC = $shell.Namespace(17)
    $phone = $null
    foreach ($item in $thisPC.Items()) {
      if ($item.Type -match "Mobile Phone|Portable Device" -or $item.Name -match "S24|Ultra|Samsung|Android|Phone|أحمد|Ahmed") {
        $phone = $item
        break
      }
    }
    if ($phone) {
      $phoneFolder = $phone.GetFolder
      $internalStorage = $null
      foreach ($sub in $phoneFolder.Items()) {
        if ($sub.Name -match "Internal storage$") {
          $internalStorage = $sub.GetFolder
          break
        }
      }
      if ($internalStorage) {
        $downloadFolder = $null
        foreach ($item in $internalStorage.Items()) {
          if ($item.Name -eq "Download") {
            $downloadFolder = $item.GetFolder
            break
          }
        }
        if ($downloadFolder) {
          $foundItems = @()
          foreach ($item in $downloadFolder.Items()) {
            if ($item.Name -match "WhatsApp Chat|\.zip$|brokers|owners" -and $item.Name -notmatch "\.apk$") {
              $foundItems += $item
            }
          }
          if ($foundItems.Count -gt 0) {
            $currentHash = ($foundItems | ForEach-Object { "$($_.Name)|$($_.Size)" }) -join ";"
            if ($currentHash -ne $script:lastPhoneSyncHash) {
              Write-AutoLog "Detected $($foundItems.Count) WhatsApp export(s) on $($phone.Name) over USB. Triggering auto-pull & ingestion..."
              $destFolder = $shell.Namespace((Join-Path $RepoRoot "data\whatsapp-phone-import"))
              $existingNames = @(Get-ChildItem -LiteralPath (Join-Path $RepoRoot "data\whatsapp-phone-import") | ForEach-Object { $_.Name })
              $copied = 0
              foreach ($item in $foundItems) {
                $already = $false
                foreach ($ex in $existingNames) {
                  if ($ex -eq $item.Name -or ($item.Name.Length -ge 15 -and $ex.StartsWith($item.Name.Substring(0, 15)))) {
                    $already = $true; break
                  }
                }
                if (-not $already) {
                  $destFolder.CopyHere($item, 16 + 512 + 1024)
                  $copied++
                }
              }
              if ($copied -gt 0) { Start-Sleep -Seconds 3 }
              $script:lastPhoneSyncHash = $currentHash
              Start-Process -FilePath "node" -ArgumentList @((Join-Path $RepoRoot "scripts\import-whatsapp-chat.mjs"), "--all-staged", "--sync-db") -WorkingDirectory $RepoRoot -WindowStyle Hidden | Out-Null
              Write-AutoLog "Auto-ingestion process spawned for new WhatsApp exports."
            }
          }
        }
      }
    }
  } catch {}
}

Write-AutoLog "Sierra Estates Auto-Start Supervisor booted (PID=$PID, Once=$Once)."

while ($true) {
  if (-not (Test-InternetConnected)) {
    Write-AutoLog 'Waiting for internet connection...'
    while (-not (Test-InternetConnected)) {
      Start-Sleep -Seconds 5
    }
    Write-AutoLog 'Internet connection detected!'
  }

  Start-GatewayIfDown
  Start-AdminBridgeIfDown
  Start-WorkflowRunnerIfDown
  Check-PhoneCableAndImport

  if ($Once) {
    Write-AutoLog 'Single-pass (-Once) verification finished.'
    break
  }

  Start-Sleep -Seconds 30
}
