# PowerShell Scheduled Task Setup for Sierra Estates Cline CLI Automation
param(
    [string]$Time = "05:00",
    [ValidateSet("audit", "hygiene", "docs-sync", "test-eval", "security-scan")]
    [string]$Preset = "audit",
    [switch]$RunNow = $false
)

$TaskName = "SierraEstates_Cline_${Preset}"
$RootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$RunnerScript = "$RootDir\scripts\run-cline-task.mjs"
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodeExe) {
    Write-Error "Node.js executable was not found in PATH. Please install Node.js or add it to PATH."
    exit 1
}

Write-Host "Configuring Recurring Cline CLI Check for Sierra Estates..." -ForegroundColor Cyan
Write-Host "  Task Name:     $TaskName"
Write-Host "  Schedule:      Daily at $Time"
Write-Host "  Preset:        $Preset"
Write-Host "  Runner Script: $RunnerScript"
Write-Host "  Working Dir:   $RootDir"

# Build execution command
$ArgString = "`"$RunnerScript`" --preset $Preset --yolo"
$Action = New-ScheduledTaskAction -Execute $NodeExe -Argument $ArgString -WorkingDirectory $RootDir
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily Sierra Estates Cline automated check ($Preset)"
    Write-Host "Successfully registered Windows Scheduled Task '$TaskName' to run daily at $Time." -ForegroundColor Green
} catch {
    Write-Warning "Could not register Windows Scheduled Task directly (requires Administrator privileges): $_"
    Write-Host "Alternative: run manually or via user startup: node `"$RunnerScript`" --preset $Preset --yolo" -ForegroundColor Yellow
}

if ($RunNow) {
    Write-Host "Executing '$Preset' immediately..." -ForegroundColor Cyan
    & $NodeExe $RunnerScript --preset $Preset --yolo
}
