$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"
$MediaVault = Join-Path $Root "data\whatsapp-media"

if (-not (Test-Path $ImportDir)) { New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null }
if (-not (Test-Path $MediaVault)) { New-Item -ItemType Directory -Path $MediaVault -Force | Out-Null }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sierra Estates -- Phone WhatsApp Cable Sync" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check for files in data/whatsapp-phone-import/
$pendingFiles = Get-ChildItem -Path $ImportDir -Include *.txt, *.zip -Recurse -File
Write-Host "[1/3] Checking staging folder ($ImportDir)..."
if ($pendingFiles.Count -gt 0) {
    Write-Host "      Found $($pendingFiles.Count) export file(s) in staging!" -ForegroundColor Green
    foreach ($f in $pendingFiles) {
        Write-Host "      Processing: $($f.Name)" -ForegroundColor Yellow
        node (Join-Path $Root "scripts\import-whatsapp-chat.mjs") --file $f.FullName --phone-media-dir $MediaVault --sync-db
    }
} else {
    Write-Host "      No .zip or .txt files directly in staging folder." -ForegroundColor Gray
}

# 2. Check for connected Mobile Devices via Windows Shell
Write-Host "[2/3] Checking connected phone via USB cable..."
try {
    $shell = New-Object -ComObject Shell.Application
    $thisPC = $shell.Namespace(17)
    $phone = $null
    foreach ($item in $thisPC.Items()) {
        if ($item.Type -match "Mobile Phone|Portable Device" -or $item.Name -match "S24|Ultra|Samsung|Android|Phone") {
            $phone = $item
            break
        }
    }

    if ($phone) {
        Write-Host "      Found Connected Phone: $($phone.Name)" -ForegroundColor Green
        Write-Host "      (Tip: Ensure phone screen is unlocked and USB mode is set to 'Transferring files')" -ForegroundColor Gray
    } else {
        Write-Host "      Phone not currently connected or waiting for unlock." -ForegroundColor Yellow
    }
} catch {
    Write-Host "      Device check notice: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3/3] Easy Cable Sync Instructions:" -ForegroundColor Cyan
Write-Host "      1. Connect phone via USB cable to laptop."
Write-Host "      2. Unlock phone and tap Allow when prompted for File Transfer."
Write-Host "      3. In Windows File Explorer -> Phone -> Internal Storage -> Download (or WhatsApp):"
Write-Host "         Copy exported chat or photos into: $ImportDir" -ForegroundColor Yellow
Write-Host "      4. Run sync-phone.bat to automatically ingest all units!" -ForegroundColor Green
Write-Host "=========================================================="
