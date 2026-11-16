$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null
foreach ($item in $thisPC.Items()) {
    if ($item.Type -match 'Mobile Phone|Portable Device' -or $item.Name -match 'S24|Ultra|Samsung|Android|Phone') {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Host "Phone not found."
    exit 1
}

$phoneFolder = $phone.GetFolder
$internalStorage = $null
foreach ($sub in $phoneFolder.Items()) {
    if ($sub.Name -match "Internal storage$") {
        $internalStorage = $sub.GetFolder
        break
    }
}

function Find-ChildFolder($parentFolder, $name) {
    if (-not $parentFolder) { return $null }
    foreach ($item in $parentFolder.Items()) {
        if ($item.Name -eq $name) {
            return $item.GetFolder
        }
    }
    return $null
}

$destDir = "H:\Sierra Estates\data\whatsapp-phone-import"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
$destFolder = $shell.Namespace($destDir)

$download = Find-ChildFolder $internalStorage "Download"
Write-Host "Searching Download folder on S24 Ultra for WhatsApp Chat exports..."
$foundCount = 0

if ($download) {
    foreach ($item in $download.Items()) {
        if ($item.Name -match "WhatsApp Chat|\.zip$|owner|brokers" -and $item.Name -notmatch "\.apk$") {
            Write-Host "Found on phone: $($item.Name) -> Copying to laptop..." -ForegroundColor Green
            # 16 = FOF_NOCONFIRMATION, 512 = FOF_NOERRORUI, 1024 = FOF_SILENT
            $destFolder.CopyHere($item, 16 + 512 + 1024)
            $foundCount++
        }
    }
}

Write-Host "`nCompleted! Copied $foundCount item(s) from phone Download folder to $destDir."
