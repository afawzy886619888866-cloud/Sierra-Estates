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
    Write-Host "Phone not detected"
    exit 1
}

Write-Host "Phone: $($phone.Name)"
$phoneFolder = $phone.GetFolder

foreach ($storage in $phoneFolder.Items()) {
    Write-Host "`nStorage: $($storage.Name)"
    $sFolder = $storage.GetFolder
    foreach ($f in $sFolder.Items()) {
        if ($f.Name -match "Download|Documents|WhatsApp") {
            Write-Host "  -> Directory: $($f.Name)"
            $subFolder = $f.GetFolder
            foreach ($item in $subFolder.Items()) {
                if ($item.Name -match "Chat|WhatsApp|Owner|Broker|[\u0600-\u06FF]") {
                    $type = if ($item.IsFolder) { 'DIR' } else { 'FILE' }
                    Write-Host "     $($item.Name) [$type]"
                }
            }
        }
    }
}
