# PowerShell Daily Scheduled Task Setup for Sierra Estates Inventory Scanner
param(
    [string]$Time = "06:00",
    [string]$TargetFolder = "I:\supabase\Sheets"
)

$TaskName = "SierraEstates_DailyInventoryScan"
$ScriptPath = "h:\last\Main\SE-Vercel-deploy-main\scripts\scan-and-merge-inventory.py"
$PythonExe = (Get-Command python).Source

Write-Host "Configuring Daily Inventory Scanner for Sierra Estates..." -ForegroundColor Cyan
Write-Host "  Task Name:      $TaskName"
Write-Host "  Schedule:       Daily at $Time"
Write-Host "  Target Folder:  $TargetFolder"
Write-Host "  Python:         $PythonExe"
Write-Host "  Script:         $ScriptPath"

$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$ScriptPath`" `"$TargetFolder`"" -WorkingDirectory "h:\last\Main\SE-Vercel-deploy-main"
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily scan and deduplication of Sierra Estates inventory sheets in $TargetFolder"
    Write-Host "Successfully registered Scheduled Task '$TaskName' to run daily at $Time." -ForegroundColor Green
} catch {
    Write-Warning "Could not register Windows Scheduled Task directly (requires admin privilege or different user context): $_"
    Write-Host "Alternative: run scanner manually via: python `"$ScriptPath`" `"$TargetFolder`"" -ForegroundColor Yellow
}
