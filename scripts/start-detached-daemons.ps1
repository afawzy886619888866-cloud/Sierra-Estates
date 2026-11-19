param(
    [string]$Service = "all"
)

$RepoRoot = if (Test-Path (Join-Path $PSScriptRoot "..\workflows\runner.js")) {
    (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
    "H:\Sierra Estates"
}
$StateDir = Join-Path $RepoRoot ".state"
if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

function Test-PortListening([int]$Port) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(600, $false)
        if ($wait -and $tcp.Connected) {
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $tcp.Close()
    }
}

function Test-Pm2Installed {
    return [bool](Get-Command pm2 -ErrorAction SilentlyContinue)
}

# Fast-path check: If all required background daemons are already active and listening,
# exit immediately without triggering PM2 reloads or console window flashing.
if ($Service -eq "all") {
    $p2785 = Test-PortListening 2785
    $p2786 = Test-PortListening 2786
    $p2790 = Test-PortListening 2790
    $p8000 = Test-PortListening 8000
    if ($p2785 -and $p2786 -and $p2790 -and $p8000) {
        Write-Output "All background daemons (:2785, :2786, :2790, :8000) are healthy and active. No reload needed."
        exit 0
    }
}

if (Test-Pm2Installed -and ($Service -eq "all" -or $Service -eq "runner")) {
    $EcosystemFile = Join-Path $RepoRoot "ecosystem.config.cjs"
    if (Test-Path $EcosystemFile) {
        $port2786Active = Test-PortListening 2786
        $pm2RunnerOnline = $false
        try {
            $pm2List = pm2 jlist 2>$null | ConvertFrom-Json
            $runnerProc = $pm2List | Where-Object { $_.name -eq "sierra-workflow-runner" } | Select-Object -First 1
            if ($runnerProc -and $runnerProc.pm2_env.status -eq "online") {
                $pm2RunnerOnline = $true
            }
        } catch {}

        if ($Service -eq "runner") {
            if ($port2786Active -and -not $pm2RunnerOnline) {
                pm2 delete sierra-workflow-runner 2>$null | Out-Null
                Write-Output "Port :2786 is already served externally (Docker); skipping PM2 sierra-workflow-runner."
            } else {
                pm2 startOrReload $EcosystemFile --only sierra-workflow-runner --update-env
            }
        } else {
            if ($port2786Active -and -not $pm2RunnerOnline) {
                pm2 delete sierra-workflow-runner 2>$null | Out-Null
                pm2 startOrReload $EcosystemFile --only "sierra-openwa-gateway,sierra-admin-bridge,sierra-fastapi-engine" --update-env
            } else {
                pm2 startOrReload $EcosystemFile --update-env
            }
        }
        pm2 save
        Write-Output "PM2 daemonized services via $EcosystemFile and saved process list."
        if ($Service -eq "all" -or $Service -eq "runner") {
            try {
                $health = Invoke-RestMethod -Uri "http://127.0.0.1:2786/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
                if ($health.ok) {
                    Write-Output "Workflow Runner (:2786/api/health) verified OK."
                }
            } catch {}
            exit 0
        }
    }
}

function Test-PortListening([int]$Port) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait -and $tcp.Connected) {
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $tcp.Close()
    }
}

function Test-ProcessRunning([string]$Pattern) {
    $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$Pattern*" }
    return [bool]$procs
}

function Start-DetachedCmd([string]$WorkDir, [string]$CmdLine, [string]$Name) {
    $si = New-CimInstance -ClassName Win32_ProcessStartup -Property @{ ShowWindow = [uint16]7 } -ClientOnly
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $CmdLine
        CurrentDirectory = $WorkDir
        ProcessStartupInformation = $si
    }
    $line = "[$((Get-Date).ToString('s'))] Spawned detached $Name (PID: $($res.ProcessId), ReturnValue: $($res.ReturnValue))"
    Add-Content -Path (Join-Path $StateDir "autostart.log") -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    Write-Output $line
}

if ($Service -eq "all" -or $Service -eq "gateway") {
    if (-not (Test-PortListening 2785) -and -not (Test-ProcessRunning "worker.js")) {
        $workDir = "H:\Sierra Estates\apps\agents\whatsapp-multi-session"
        $logFile = "H:\Sierra Estates\.state\gateway.log"
        $cmd = "cmd.exe /c node worker.js >> `"$logFile`" 2>&1"
        Start-DetachedCmd -WorkDir $workDir -CmdLine $cmd -Name "OpenWA Gateway (:2785)"
    } else {
        Write-Output "OpenWA Gateway (:2785) is already running/listening."
    }
}

if ($Service -eq "all" -or $Service -eq "runner") {
    if (-not (Test-PortListening 2786) -and -not (Test-ProcessRunning "runner.js")) {
        $workDir = "H:\Sierra Estates\workflows"
        $logFile = "H:\Sierra Estates\.state\runner.log"
        $cmd = "cmd.exe /c node runner.js >> `"$logFile`" 2>&1"
        Start-DetachedCmd -WorkDir $workDir -CmdLine $cmd -Name "Workflow Runner (:2786)"
    } else {
        Write-Output "Workflow Runner (:2786) is already running/listening."
    }
}

if ($Service -eq "all" -or $Service -eq "bridge") {
    if (-not (Test-PortListening 2790) -and -not (Test-ProcessRunning "sierra-admin-bridge")) {
        $workDir = "H:\Sierra Estates\workflows"
        $logFile = "H:\Sierra Estates\.state\admin-bridge.log"
        $cmd = "cmd.exe /c node sierra-admin-bridge.mjs >> `"$logFile`" 2>&1"
        Start-DetachedCmd -WorkDir $workDir -CmdLine $cmd -Name "Sierra Admin Bridge (:2790)"
    } else {
        Write-Output "Sierra Admin Bridge (:2790) is already running/listening."
    }
}

if ($Service -eq "all" -or $Service -eq "tunnel") {
    $cf = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cf -and -not (Test-ProcessRunning "tunnel.mjs")) {
        $logFile = "H:\Sierra Estates\.state\tunnel.log"
        $cmd = "cmd.exe /c node scripts\tunnel.mjs 2785 >> `"$logFile`" 2>&1"
        Start-DetachedCmd -WorkDir $RepoRoot -CmdLine $cmd -Name "Cloudflare Tunnel (:2785)"
    }
}
