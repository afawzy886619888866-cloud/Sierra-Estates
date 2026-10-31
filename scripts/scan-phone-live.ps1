$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null
foreach ($item in $thisPC.Items()) {
    if ($item.Type -match 'Mobile Phone|Portable Device' -or $item.Name -match 'S24|Ultra|Samsung|Android|Phone') {
        $phone = $item
        break
    }
}

if ($phone) {
    Write-Host "Found Phone: $($phone.Name)"
    $folder = $phone.GetFolder
    if ($folder) {
        Write-Host "Storage roots found:"
        foreach ($sub in $folder.Items()) {
            Write-Host " - $($sub.Name)"
        }
    } else {
        Write-Host "GetFolder was null. Please verify phone is unlocked and set to Transferring files."
    }
} else {
    Write-Host "No phone found."
}
