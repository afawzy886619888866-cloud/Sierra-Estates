param(
  [switch]$RestartRunnerNow = $true
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PsRunner = Join-Path $PSScriptRoot 'start-sierra-automation.ps1'

# 1. Install into Current-User Windows Startup Folder (guaranteed zero-UAC boot/logon start)
$StartupFolder = [Environment]::GetFolderPath('Startup')
$StartupVbs = Join-Path $StartupFolder 'SierraEstatesAutomation.vbs'

$VbsBody = @"
Option Explicit
Dim shell, cmd
Set shell = CreateObject("WScript.Shell")
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$PsRunner"""
shell.Run cmd, 0, False
"@

Set-Content -Path $StartupVbs -Value $VbsBody -Encoding ASCII -Force
Write-Host "[OK] Installed Windows Startup launcher -> $StartupVbs"

# 2. Register Windows Scheduled Task (AtLogOn + Network Available + Auto-Restart)
$TaskName = 'SierraEstates-AutoOutreach'
try {
  $Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PsRunner`"" -WorkingDirectory $RepoRoot
  $Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description 'Sierra Estates Auto-Start: Waits for internet, starts OpenWA (:2785) + Workflow Runner (:2786) for daily 10:00-22:00 30m 25-msg rotating owner outreach.' -Force | Out-Null
  Write-Host "[OK] Registered Scheduled Task -> $TaskName"
} catch {
  Write-Host "[INFO] Scheduled Task registration skipped or restricted ($($_.Exception.Message)); Windows Startup folder launcher is active."
}

# 3. Stop any stale runner.js processes holding old env vars so the upgraded runner starts immediately
if ($RestartRunnerNow) {
  $staleRunners = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match 'runner\.js' }
  foreach ($proc in $staleRunners) {
    Write-Host "[RESTART] Stopping old runner.js PID $($proc.ProcessId)..."
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

# 4. Start via Windows Task Scheduler (independent OS process tree) with VBS fallback
try {
  Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  Write-Host "[OK] Started Scheduled Task '$TaskName' immediately."
} catch {
  Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$StartupVbs`"" -WindowStyle Hidden
}
Start-Sleep -Seconds 5
Write-Host "[READY] Sierra Estates Automation is installed for auto-start on boot + internet and running live now."
