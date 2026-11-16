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

Write-Host "Navigating to Android -> media -> com.whatsapp..."
$android = Find-ChildFolder $internalStorage "Android"
$media = Find-ChildFolder $android "media"
if ($media) {
    Write-Host "Folders in Android/media:"
    foreach ($item in $media.Items()) {
        Write-Host " - $($item.Name)"
    }
} else {
    Write-Host "Android/media not found."
}

Write-Host "`nChecking Download folder for exported chats or zips..."
$download = Find-ChildFolder $internalStorage "Download"
if ($download) {
    foreach ($item in $download.Items()) {
        if ($item.Name -match "\.txt$|\.zip$|whatsapp|owner" -or -not $item.IsFolder) {
            Write-Host " - $($item.Name)"
        }
    }
}
