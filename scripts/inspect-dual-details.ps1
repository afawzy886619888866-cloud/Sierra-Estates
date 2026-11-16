$shell = New-Object -ComObject Shell.Application
$pc = $shell.Namespace(17)
$phone = $null
foreach ($item in $pc.Items()) {
    if ($item.Name -like '*S24*' -or $item.Name -like '*Ahmed*' -or $item.Name -like '*أحمد*') {
        $phone = $item; break
    }
}
$dual = $null
foreach ($item in $phone.GetFolder.Items()) {
    if ($item.Name -like '*Dual*') { $dual = $item; break }
}
$dualFolder = $dual.GetFolder
function Check-Folder($folder, $label) {
    Write-Host "`n=== Dual Messenger: $label ==="
    foreach ($item in $folder.Items()) {
        Write-Host " - $($item.Name) (Folder: $($item.IsFolder))"
    }
}

foreach ($item in $dualFolder.Items()) {
    if ($item.Name -in @('Download', 'Documents', 'Pictures')) {
        Check-Folder $item.GetFolder $item.Name
        if ($item.Name -eq 'Pictures') {
            foreach ($sub in $item.GetFolder.Items()) {
                if ($sub.Name -eq 'WhatsApp') {
                    Check-Folder $sub.GetFolder "Pictures/WhatsApp"
                }
            }
        }
    }
}
