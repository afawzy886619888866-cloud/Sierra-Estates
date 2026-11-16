# ==============================================================================
# Pull WhatsApp chats & media from S24 Ultra directly over USB MTP
# ==============================================================================
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"
if (-not (Test-Path $ImportDir)) { New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null }

$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null

foreach ($item in $thisPC.Items()) {
    if ($item.Name -like "*S24*" -or $item.Name -like "*Ahmed*" -or $item.Name -like "*أحمد*") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Host "Phone not detected over USB." -ForegroundColor Red
    exit 1
}

Write-Host "Connected Phone: $($phone.Name)" -ForegroundColor Green
$destFolder = $shell.Namespace($ImportDir)
$phoneFolder = $phone.GetFolder
$copiedFiles = 0

function SearchAndCopy($folder, $depth) {
    if (-not $folder -or $depth -gt 4) { return }
    $items = @($folder.Items())
    foreach ($item in $items) {
        if ($item.IsFolder) {
            $name = $item.Name
            # Search relevant directories
            if ($name -match "Download|WhatsApp|Media|Documents|Dual|Pictures|Android|com\.whatsapp") {
                Write-Host ("  " * $depth + "-> Scanning folder: " + $name) -ForegroundColor Gray
                SearchAndCopy $item.GetFolder ($depth + 1)
            }
        } else {
            $fname = $item.Name
            # Match chat exports, zips, or property photos
            if ($fname -match "WhatsApp Chat|\.txt$|\.zip$|broker|owner|villas|شات" -or 
               ($fname -match "^IMG-.*-WA.*\.(jpg|jpeg|png)$" -and $item.Size -gt 50000)) {
                $targetFile = Join-Path $ImportDir $fname
                if (-not (Test-Path $targetFile)) {
                    Write-Host "     [COPY] $fname ($([math]::Round($item.Size/1024)) KB)" -ForegroundColor Cyan
                    $destFolder.CopyHere($item, 16 + 512 + 1024)
                    $script:copiedFiles++
                }
            }
        }
    }
}

foreach ($storage in $phoneFolder.Items()) {
    Write-Host "`nScanning Storage Root: $($storage.Name)" -ForegroundColor Yellow
    SearchAndCopy $storage.GetFolder 1
}

Write-Host "`nFinished USB Scan! Copied $copiedFiles new files to $ImportDir" -ForegroundColor Green
