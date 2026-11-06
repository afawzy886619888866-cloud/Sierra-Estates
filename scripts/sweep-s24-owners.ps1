# ==============================================================================
# Sweep and copy all Owner/Broker group chats and property media from S24 Ultra
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
    Write-Host "Phone not detected over USB." -ForegroundColor Red
    exit 1
}

Write-Host "Connected Device: $($phone.Name)" -ForegroundColor Green
$destFolder = $shell.Namespace($ImportDir)
$phoneFolder = $phone.GetFolder
$copiedCount = 0

function CopyItemSafe($item, $targetDir) {
    $targetPath = Join-Path $targetDir $item.Name
    if (Test-Path $targetPath) {
        return
    }
    Write-Host "  [PULL] $($item.Name) ($([math]::Round($item.Size/1024)) KB)" -ForegroundColor Cyan
    $targetShellFolder = $shell.Namespace($targetDir)
    $targetShellFolder.CopyHere($item, 4 + 16 + 512 + 1024)
    
    # Wait briefly for MTP async transfer
    $timeout = 15
    while (-not (Test-Path $targetPath) -and $timeout -gt 0) {
        Start-Sleep -Milliseconds 250
        $timeout--
    }
    $script:copiedCount++
}

function TraverseFolders($folder, $depth) {
    if (-not $folder -or $depth -gt 5) { return }
    $items = @($folder.Items())
    
    foreach ($item in $items) {
        $name = $item.Name
        if ($item.IsFolder) {
            # Check for chat export folders or media folders
            if ($name -match "WhatsApp Chat|Chat with|Chat -|Broker|Owner|augast|villas" -or 
               ($name -match "[\u0600-\u06FF]" -and $name -match "Chat|WhatsApp")) {
                Write-Host "Found Group/Chat Folder: $name" -ForegroundColor Yellow
                $subTarget = Join-Path $ImportDir $name
                if (-not (Test-Path $subTarget)) { New-Item -ItemType Directory -Path $subTarget -Force | Out-Null }
                
                $chatFolder = $item.GetFolder
                foreach ($chatItem in $chatFolder.Items()) {
                    CopyItemSafe $chatItem $subTarget
                }
            }
            elseif ($name -match "Download|Documents|WhatsApp|Media|Dual|Pictures|Android|w4b|com\.whatsapp") {
                TraverseFolders $item.GetFolder ($depth + 1)
            }
        } else {
            # Direct files (exports, zips, txts, property images)
            if ($name -match "WhatsApp Chat|\.txt$|\.zip$|broker|owner|villas" -or 
               ($name -match "^IMG-.*-WA.*\.(jpg|jpeg|png)$" -and $item.Size -gt 60000)) {
                CopyItemSafe $item $ImportDir
            }
        }
    }
}

foreach ($storage in $phoneFolder.Items()) {
    Write-Host "`nScanning Storage Root: $($storage.Name)..." -ForegroundColor Magenta
    TraverseFolders $storage.GetFolder 1
}

Write-Host "`nSweep Complete! Successfully synchronized $copiedCount items to $ImportDir" -ForegroundColor Green
