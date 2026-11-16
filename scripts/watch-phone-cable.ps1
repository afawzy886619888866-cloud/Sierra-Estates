# ==============================================================================
# Sierra Estates — Automated USB Cable Phone Watcher & Importer Daemon
# ==============================================================================
# Monitors USB cable connection for Samsung Galaxy S24 Ultra / Android devices.
# When connected with file transfer enabled, automatically extracts WhatsApp
# chat exports, parses all property units stamped by their exact POSTED DATE,
# generates organized Excel/CSV spreadsheets, and syncs listings to Supabase.
# ==============================================================================

$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"
$LogFile = Join-Path $Root "workflows\.state\phone-watcher.log"

if (-not (Test-Path $ImportDir)) { New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null }
$stateDir = Split-Path $LogFile -Parent
if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null }

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

Write-Log "Sierra Estates Phone Watcher daemon started."

$lastSyncHash = ""
$lastPhoneStatus = $false

while ($true) {
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
            if (-not $lastPhoneStatus) {
                Write-Log "USB Cable Plug-in Detected! Phone: $($phone.Name)"
                $lastPhoneStatus = $true
            }

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
                        if ($currentHash -ne $lastSyncHash) {
                            Write-Log "Detected $($foundItems.Count) WhatsApp export(s) on $($phone.Name)! Triggering auto-pull..."
                            
                            $destFolder = $shell.Namespace($ImportDir)
                            $newPullCount = 0
                            $existingFiles = @(Get-ChildItem -LiteralPath $ImportDir -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
                            foreach ($item in $foundItems) {
                                $rawName = [string]$item.Name
                                $prefix = if ($rawName.Length -gt 15) { $rawName.Substring(0, 15) } else { $rawName }
                                $isDuplicate = $false
                                foreach ($ef in $existingFiles) {
                                    if ($ef -eq $rawName -or ($prefix -and $ef.StartsWith($prefix))) {
                                        $isDuplicate = $true
                                        break
                                    }
                                }
                                if (-not $isDuplicate) {
                                    Write-Log "  -> Pulling new export: $rawName"
                                    try {
                                        $destFolder.CopyHere($item, 16 + 512 + 1024)
                                        $newPullCount++
                                    } catch {
                                        Write-Log "  -> Failed to pull $rawName: $($_.Exception.Message)"
                                    }
                                }
                            }

                            if ($newPullCount -gt 0) {
                                Start-Sleep -Seconds 3
                            }

                            Write-Log "Executing Workflow 21: USB Phone Harvester & Date Organizer..."
                            $harvesterScript = Join-Path $Root "workflows\21-usb-phone-harvester\index.js"
                            $nodeProc = Start-Process -FilePath "node" -ArgumentList @($harvesterScript) -Wait -PassThru -NoNewWindow
                            
                            Write-Log "Harvester completed with exit code: $($nodeProc.ExitCode)"
                            $lastSyncHash = $currentHash
                        }
                    }
                }
            }
        } else {
            if ($lastPhoneStatus) {
                Write-Log "Phone disconnected from USB cable."
                $lastPhoneStatus = $false
                $lastSyncHash = ""
            }
        }
    } catch {
        Write-Log "Watcher error: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 20
}
