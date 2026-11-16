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

if (-not $internalStorage) {
    Write-Host "Internal storage not found."
    exit 1
}

Write-Host "Listing top-level folders in Internal storage:"
foreach ($f in $internalStorage.Items()) {
    Write-Host " - $($f.Name)"
}
