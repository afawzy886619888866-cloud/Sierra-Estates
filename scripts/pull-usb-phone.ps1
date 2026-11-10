# Sierra Estates — Pull WhatsApp Chat Exports from USB Connected Phone
$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"

if (-not (Test-Path $ImportDir)) {
    New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null
}

$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null

foreach ($item in $thisPC.Items()) {
    if ($item.Type -match "Mobile Phone|Portable Device" -or $item.Name -match "S24|Ultra|Samsung|Android|Phone|أحمد|Ahmed") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Output "NO_PHONE_DETECTED"
    exit 0
}

Write-Output "PHONE_CONNECTED: $($phone.Name)"
$phoneFolder = $phone.GetFolder
$destFolder = $shell.Namespace($ImportDir)
$existing = @(Get-ChildItem -LiteralPath $ImportDir | ForEach-Object { $_.Name })
$pulled = 0

foreach ($storage in $phoneFolder.Items()) {
    if ($storage.Name -match "Internal storage") {
        $storageFolder = $storage.GetFolder
        foreach ($folder in $storageFolder.Items()) {
            if ($folder.Name -in @("Download", "Documents", "WhatsApp")) {
                $subFolder = $folder.GetFolder
                foreach ($file in $subFolder.Items()) {
                    if ($file.Name -match "WhatsApp Chat|WhatsApp-|\.zip$|brokers|owners" -and $file.Name -notmatch "\.apk$") {
                        $rawFileName = [string]$file.Name
                        $prefix = if ($rawFileName.Length -gt 15) { $rawFileName.Substring(0, 15) } else { $rawFileName }
                        $isDup = $false
                        foreach ($ef in $existing) {
                            if ($ef -eq $rawFileName -or ($prefix -and $ef.StartsWith($prefix))) {
                                $isDup = $true; break
                            }
                        }
                        if (-not $isDup) {
                            try {
                                $destFolder.CopyHere($file, 16 + 512 + 1024)
                                $pulled++
                                Write-Output "PULLED: $rawFileName"
                            } catch {
                                Write-Output "FAILED: $rawFileName"
                            }
                        }
                    }
                }
            }
        }
    }
}

if ($pulled -gt 0) {
    Start-Sleep -Seconds 3
}
Write-Output "TOTAL_NEW_EXPORTS_PULLED: $pulled"
