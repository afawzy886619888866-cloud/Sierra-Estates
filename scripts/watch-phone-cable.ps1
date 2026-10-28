# ==============================================================================
# Sierra Estates — Automated USB Cable Phone Watcher & Importer Daemon
# ==============================================================================
# Monitors USB cable connection for Samsung Galaxy S24 Ultra / Android devices.
# When connected with file transfer enabled, automatically extracts WhatsApp
# chat exports, photos, and documents, ingests them into Supabase, and updates
# Property Finder ad pipelines.
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
            $phoneFolder = $phone.GetFolder
            $internalStorage = $null
            foreach ($sub in $phoneFolder.Items()) {
                if ($sub.Name -match "Internal storage$") {
                    $internalStorage = $sub.GetFolder
                    break
                }
            }

            if ($internalStorage) {
                # Look for Download folder
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
                            foreach ($item in $foundItems) {
                                $destPath = Join-Path $ImportDir $item.Name
                                if (-not (Test-Path $destPath)) {
                                    Write-Log "  -> Pulling new export: $($item.Name)"
                                    $destFolder.CopyHere($item, 16 + 512 + 1024)
                                    $newPullCount++
                                }
                            }

                            if ($newPullCount -gt 0) {
                                Start-Sleep -Seconds 3
                            }

                            Write-Log "Running ingestion into Supabase & Property Finder pipeline..."
                            $nodeProc = Start-Process -FilePath "node" -ArgumentList @((Join-Path $Root "scripts\import-whatsapp-chat.mjs"), "--all-staged", "--sync-db") -Wait -PassThru -NoNewWindow
                            
                            Write-Log "Ingestion completed with exit code: $($nodeProc.ExitCode)"
                            $lastSyncHash = $currentHash
                        }
                    }
                }
            }
        }
    } catch {
        Write-Log "Watcher error: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 30
}
