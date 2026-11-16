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
$wa = Find-ChildFolder $comWa "WhatsApp"
$waMedia = Find-ChildFolder $wa "Media"
$waImages = Find-ChildFolder $waMedia "WhatsApp Images"

if ($waImages) {
    Write-Host "WhatsApp Images item count: $($waImages.Items().Count)"
    $sample = 0
    foreach ($img in $waImages.Items()) {
        if ($sample -lt 5) {
            Write-Host " - $($img.Name)"
            $sample++
        }
    }
}

$comW4b = Find-ChildFolder $media "com.whatsapp.w4b"
$w4b = Find-ChildFolder $comW4b "WhatsApp Business"
$w4bMedia = Find-ChildFolder $w4b "Media"
$w4bImages = Find-ChildFolder $w4bMedia "WhatsApp Business Images"

if ($w4bImages) {
    Write-Host "`nWhatsApp Business Images item count: $($w4bImages.Items().Count)"
    $sample = 0
    foreach ($img in $w4bImages.Items()) {
        if ($sample -lt 5) {
            Write-Host " - $($img.Name)"
            $sample++
        }
    }
}
