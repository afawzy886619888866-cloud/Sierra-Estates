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
$waF = Get-SubFolder $mediaF "com.whatsapp"
$waAppF = Get-SubFolder $waF "WhatsApp"
$waMediaF = Get-SubFolder $waAppF "Media"

Write-Host "=== WhatsApp Media Subfolders ==="
foreach ($item in $waMediaF.Items()) {
    if ($item.IsFolder) {
        Write-Host " - $($item.Name) (Folder: True)"
    }
}

$waDbF = Get-SubFolder $waAppF "Databases"
Write-Host "`n=== WhatsApp Databases ==="
if ($waDbF) {
    foreach ($item in $waDbF.Items()) {
        Write-Host " - $($item.Name) (Folder: $($item.IsFolder))"
    }
} else {
    Write-Host "No Databases folder found."
}
