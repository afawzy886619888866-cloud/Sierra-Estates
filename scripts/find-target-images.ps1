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
    if (!$folderObj) { return $null }
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
$waImagesF = Get-SubFolder $waMediaF "WhatsApp Images"

Write-Host "Searching WhatsApp Images for target photos..."
$targetFiles = @('IMG-20250515-WA0155.jpg', 'IMG-20250512-WA0130.jpg', 'IMG-20250512-WA0163.jpg')
$foundTargets = @()

if ($waImagesF) {
    Write-Host "WhatsApp Images folder found! Scanning items..."
    foreach ($item in $waImagesF.Items()) {
        if ($targetFiles -contains $item.Name) {
            Write-Host "FOUND: $($item.Name) ($($item.Size) bytes)"
            $foundTargets += $item
        }
    }
}

Write-Host "Search completed. Found $($foundTargets.Count) of $($targetFiles.Count) targets directly in WhatsApp Images."
