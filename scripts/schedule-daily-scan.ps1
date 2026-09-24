# PowerShell Daily Scheduled Task Setup for Sierra Estates Inventory & WhatsApp Scanners
param(
    [string]$Time = "06:00",
    [string]$TargetFolder = "I:\supabase\Sheets"
)

$TaskName = "SierraEstates_DailyInventoryScan"
$RootDir = "h:\last\Main\SE-Vercel-deploy-main"
$PythonScript = "$RootDir\scripts\scan-and-merge-inventory.py"
$OpenClawScript = "$RootDir\scripts\openclaw-daily-scanner.ts"
$PythonExe = (Get-Command python).Source

Write-Host "Configuring Daily Inventory & WhatsApp Scanner for Sierra Estates..." -ForegroundColor Cyan
Write-Host "  Task Name:          $TaskName"
Write-Host "  Schedule:           Daily at $Time"
Write-Host "  Sheets Folder:      $TargetFolder"
Write-Host "  Target WhatsApp:    Owners August 2026"
Write-Host "  Python Engine:      $PythonScript"
Write-Host "  OpenClaw Agent:     $OpenClawScript"

# Combined runner command: runs Excel merger first, then OpenClaw WhatsApp scan
$RunnerCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command `"& '$PythonExe' '$PythonScript' '$TargetFolder'; npx tsx '$OpenClawScript' 'Owners August 2026' 250`""

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"$RunnerCmd`"" -WorkingDirectory $RootDir
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily scan of Sierra Estates inventory sheets in $TargetFolder and OpenClaw WhatsApp scan for Owners August"
    Write-Host "Successfully registered Scheduled Task '$TaskName' to run daily at $Time." -ForegroundColor Green
} catch {
    Write-Warning "Could not register Windows Scheduled Task directly: $_"
    Write-Host "Alternative: run manually via: powershell -File `"$RootDir\scripts\schedule-daily-scan.ps1`"" -ForegroundColor Yellow
}
