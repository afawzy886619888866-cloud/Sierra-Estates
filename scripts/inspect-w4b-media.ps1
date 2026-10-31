$shell = New-Object -ComObject Shell.Application
$pc = $shell.Namespace(17)
$phone = $null
foreach ($item in $pc.Items()) {
    if ($item.Name -like '*S24*' -or $item.Name -like '*Ahmed*' -or $item.Name -like '*أحمد*') {
        $phone = $item; break
    }
}
$main = $null
foreach ($item in $phone.GetFolder.Items()) {
    if ($item.Name -notlike '*Dual*') { $main = $item; break }
}
$mainFolder = $main.GetFolder

function Get-SubFolder($folderObj, $name) {
    foreach ($item in $folderObj.Items()) {
        if ($item.Name -eq $name) { return $item.GetFolder }
    }
    return $null
}

$androidF = Get-SubFolder $mainFolder "Android"
$mediaF = Get-SubFolder $androidF "media"
$w4bF = Get-SubFolder $mediaF "com.whatsapp.w4b"
$w4bAppF = Get-SubFolder $w4bF "WhatsApp Business"
$w4bMediaF = Get-SubFolder $w4bAppF "Media"

Write-Host "=== WhatsApp Business Media Subfolders ==="
foreach ($item in $w4bMediaF.Items()) {
    Write-Host " - $($item.Name) (Folder: $($item.IsFolder))"
}

$w4bDbF = Get-SubFolder $w4bAppF "Databases"
Write-Host "`n=== WhatsApp Business Databases ==="
foreach ($item in $w4bDbF.Items()) {
    Write-Host " - $($item.Name) (Folder: $($item.IsFolder))"
}
