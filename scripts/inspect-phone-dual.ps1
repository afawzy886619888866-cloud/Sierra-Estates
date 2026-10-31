$shell = New-Object -ComObject Shell.Application
$pc = $shell.Namespace(17)
$phone = $null
foreach ($item in $pc.Items()) {
    if ($item.Name -like '*S24*' -or $item.Name -like '*Ahmed*' -or $item.Name -like '*أحمد*') {
        $phone = $item
        break
    }
}
if (!$phone) { Write-Host 'Phone not found'; exit }
$phoneFolder = $phone.GetFolder
$dual = $null
foreach ($item in $phoneFolder.Items()) {
    if ($item.Name -like '*Dual*') {
        $dual = $item
        break
    }
}
if (!$dual) { Write-Host 'Dual Messenger folder not found'; exit }
Write-Host "Found Dual Storage: $($dual.Name)"
$dualFolder = $dual.GetFolder
foreach ($sub in $dualFolder.Items()) {
    Write-Host " - $($sub.Name) (Folder: $($sub.IsFolder))"
    if ($sub.IsFolder) {
        $subF = $sub.GetFolder
        foreach ($inner in $subF.Items()) {
            Write-Host "    -> $($inner.Name)"
        }
    }
}
