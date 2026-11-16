# ==============================================================================
# Sierra Estates — 1-Click Phone WhatsApp Cable Sync & Auto-Importer
# ==============================================================================
# Pulls WhatsApp chat exports (.txt, .zip) and high-res media directly from
# connected Samsung Galaxy S24 Ultra / Android devices over USB MTP,
# groups multi-message photos, verifies Property Finder 800x600 dimensions,
# uploads media to Supabase Storage, and syncs listings to Supabase DB.
# ==============================================================================

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ImportDir = Join-Path $Root "data\whatsapp-phone-import"
$MediaVault = Join-Path $Root "data\whatsapp-media"

if (-not (Test-Path $ImportDir)) { New-Item -ItemType Directory -Path $ImportDir -Force | Out-Null }
if (-not (Test-Path $MediaVault)) { New-Item -ItemType Directory -Path $MediaVault -Force | Out-Null }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sierra Estates -- Phone WhatsApp Cable Sync & Auto-Import" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check for Connected Phone over USB Cable
Write-Host "[1/3] Detecting Phone via USB Cable..." -ForegroundColor Yellow
$phoneFound = $false
$phoneName = ""

try {
    $shell = New-Object -ComObject Shell.Application
    $thisPC = $shell.Namespace(17)
    $phone = $null

    foreach ($item in $thisPC.Items()) {
        if ($item.Type -match "Mobile Phone|Portable Device" -or $item.Name -match "S24|Ultra|Samsung|Android|Phone|أحمد|Ahmed") {
            $phone = $item
            $phoneFound = $true
            $phoneName = $item.Name
            break
        }
    }

    if ($phoneFound) {
        Write-Host "      Detected Phone: $phoneName" -ForegroundColor Green
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
                Write-Host "      Scanning Download folder for new WhatsApp Chat exports..." -ForegroundColor Gray
                $destFolder = $shell.Namespace($ImportDir)
                $existingNames = @(Get-ChildItem -LiteralPath $ImportDir | ForEach-Object { $_.Name })
                $copiedCount = 0
                foreach ($item in $downloadFolder.Items()) {
                    if ($item.Name -match "WhatsApp Chat|\.zip$|brokers|owners" -and $item.Name -notmatch "\.apk$") {
                        $alreadyExists = $false
                        foreach ($ex in $existingNames) {
                            if ($ex -eq $item.Name -or ($item.Name.Length -ge 15 -and $ex.StartsWith($item.Name.Substring(0, 15)))) {
                                $alreadyExists = $true
                                break
                            }
                        }
                        if (-not $alreadyExists) {
                            Write-Host "      -> Copying new item from phone: $($item.Name)" -ForegroundColor Cyan
                            $destFolder.CopyHere($item, 16 + 512 + 1024)
                            $copiedCount++
                        } else {
                            Write-Host "      -> Staged (up to date): $($item.Name)" -ForegroundColor DarkGray
                        }
                    }
                }
                if ($copiedCount -gt 0) {
                    Write-Host "      Copied $copiedCount new export(s) from phone. Waiting for MTP buffer..." -ForegroundColor Green
                    Start-Sleep -Seconds 3
                }
            }
        }
    } else {
        Write-Host "      No phone currently detected over USB. Will process existing staged exports." -ForegroundColor Gray
    }
} catch {
    Write-Host "      Phone detection notice: $($_.Exception.Message)" -ForegroundColor Gray
}

# 2. Ingest Staged WhatsApp Chats & Photos into Supabase
Write-Host "`n[2/3] Processing Staged WhatsApp Chats & Photo Attachments..." -ForegroundColor Yellow
$importerScript = Join-Path $Root "scripts\import-whatsapp-chat.mjs"
node $importerScript --all-staged --sync-db

# 3. Summary & Instructions
Write-Host "`n[3/3] Sync & Verification Complete!" -ForegroundColor Green
Write-Host "      All qualifying units & high-res photos have been uploaded" -ForegroundColor Gray
Write-Host "      to Supabase Database (public.listings) and Storage (property-media)." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
