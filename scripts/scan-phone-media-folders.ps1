$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null
foreach ($item in $thisPC.Items()) {
    if ($item.Type -match 'Mobile Phone|Portable Device' -or $item.Name -match 'S24|Ultra|Samsung|Android|Phone') {
        $phone = $item
        break
    }
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

$android = Find-ChildFolder $internalStorage "Android"
$media = Find-ChildFolder $android "media"
$comWa = Find-ChildFolder $media "com.whatsapp"
$comW4b = Find-ChildFolder $media "com.whatsapp.w4b"

Write-Host "Checking com.whatsapp..."
if ($comWa) {
    $wa = Find-ChildFolder $comWa "WhatsApp"
    $waMedia = Find-ChildFolder $wa "Media"
    if ($waMedia) {
        Write-Host "Found WhatsApp Media folders:"
        foreach ($f in $waMedia.Items()) {
            Write-Host " - $($f.Name)"
        }
    }
}

Write-Host "`nChecking com.whatsapp.w4b (WhatsApp Business)..."
if ($comW4b) {
    $w4b = Find-ChildFolder $comW4b "WhatsApp Business"
    $w4bMedia = Find-ChildFolder $w4b "Media"
    if ($w4bMedia) {
        Write-Host "Found WhatsApp Business Media folders:"
        foreach ($f in $w4bMedia.Items()) {
            Write-Host " - $($f.Name)"
        }
    }
}
