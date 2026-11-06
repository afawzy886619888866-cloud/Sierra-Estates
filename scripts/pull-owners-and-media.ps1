# ==============================================================================
# Targeted, Non-Blocking Pull of Owners WhatsApp Chats & Media from S24 Ultra
# ==============================================================================
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"
if (-not (Test-Path $ImportDir)) { New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null }

$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null

foreach ($item in $thisPC.Items()) {
    if ($item.Name -like "*S24*" -or $item.Name -like "*Ahmed*" -or $item.Name -match "[\u0600-\u06FF]") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Host "Phone not detected" -ForegroundColor Red
    exit 1
}

Write-Host "Phone Connected: $($phone.Name)" -ForegroundColor Green
$destShell = $shell.Namespace($ImportDir)
$storage = $phone.GetFolder.Items() | Select-Object -First 1
$storageFolder = $storage.GetFolder
$pulledCount = 0

function CopyFileQuick($fileItem, $destDirectory, $destShellFolder) {
    $targetPath = Join-Path $destDirectory $fileItem.Name
    # Check exact file or with extension
    if ((Test-Path $targetPath) -or (Test-Path "$targetPath.*") -or (Test-Path "$targetPath.txt") -or (Test-Path "$targetPath.jpg")) {
        return
    }
    Write-Host "  -> Copying: $($fileItem.Name) ($([math]::Round($fileItem.Size/1024)) KB)" -ForegroundColor Cyan
    $destShellFolder.CopyHere($fileItem, 4 + 16 + 512 + 1024)
    Start-Sleep -Milliseconds 150
    $script:pulledCount++
}

# 1. Pull All WhatsApp Chat Export folders from Download
$downloadItem = $storageFolder.Items() | Where-Object { $_.Name -eq "Download" } | Select-Object -First 1
if ($downloadItem) {
    Write-Host "`nScanning Download for Owner & WhatsApp Chats..." -ForegroundColor Yellow
    foreach ($item in $downloadItem.GetFolder.Items()) {
        if ($item.IsFolder -and ($item.Name -match "WhatsApp|Chat|Broker|Owner|[\u0600-\u06FF]")) {
            $folderName = $item.Name
            $chatTargetDir = Join-Path $ImportDir $folderName
            if (-not (Test-Path $chatTargetDir)) { New-Item -ItemType Directory -Path $chatTargetDir -Force | Out-Null }
            $chatShellDir = $shell.Namespace($chatTargetDir)
            
            Write-Host "  Found Chat Folder: $folderName" -ForegroundColor Magenta
            foreach ($chatFile in $item.GetFolder.Items()) {
                if (-not $chatFile.IsFolder) {
                    CopyFileQuick $chatFile $chatTargetDir $chatShellDir
                }
            }
        } elseif (-not $item.IsFolder -and ($item.Name -match "\.txt$|\.zip$|broker|owner|villas")) {
            CopyFileQuick $item $ImportDir $destShell
        }
    }
}

# 2. Pull Fresh Property Images from Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images
$androidItem = $storageFolder.Items() | Where-Object { $_.Name -eq "Android" } | Select-Object -First 1
if ($androidItem) {
    $mediaItem = $androidItem.GetFolder.Items() | Where-Object { $_.Name -eq "media" } | Select-Object -First 1
    if ($mediaItem) {
        $waPkg = $mediaItem.GetFolder.Items() | Where-Object { $_.Name -eq "com.whatsapp" } | Select-Object -First 1
        if ($waPkg) {
            $waDir = $waPkg.GetFolder.Items() | Where-Object { $_.Name -eq "WhatsApp" } | Select-Object -First 1
            if ($waDir) {
                $waMedia = $waDir.GetFolder.Items() | Where-Object { $_.Name -eq "Media" } | Select-Object -First 1
                if ($waMedia) {
                    $waImages = $waMedia.GetFolder.Items() | Where-Object { $_.Name -eq "WhatsApp Images" } | Select-Object -First 1
                    if ($waImages) {
                        Write-Host "`nScanning WhatsApp Images for high-res property photos..." -ForegroundColor Yellow
                        $count = 0
                        foreach ($img in $waImages.GetFolder.Items()) {
                            if (-not $img.IsFolder -and $img.Name -match "^IMG-.*-WA.*\.(jpg|jpeg|png)$" -and $img.Size -gt 60000) {
                                CopyFileQuick $img $ImportDir $destShell
                                $count++
                                if ($count -ge 150) { break } # Bounded batch for responsiveness
                            }
                        }
                    }
                }
            }
        }
    }
}

Write-Host "`nPull Completed! Processed $pulledCount new files." -ForegroundColor Green
