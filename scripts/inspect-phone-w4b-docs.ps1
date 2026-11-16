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

function Inspect-Item($folderObj, $pathName) {
    Write-Host "`n=== $pathName ==="
    foreach ($item in $folderObj.Items()) {
        Write-Host " - $($item.Name) (Folder: $($item.IsFolder))"
    }
}

foreach ($item in $mainFolder.Items()) {
    if ($item.Name -eq 'Documents') {
        Inspect-Item $item.GetFolder "Documents"
    }
    if ($item.Name -eq 'Android') {
        $androidF = $item.GetFolder
        foreach ($sub in $androidF.Items()) {
            if ($sub.Name -eq 'media') {
                $mediaF = $sub.GetFolder
                foreach ($m in $mediaF.Items()) {
                    if ($m.Name -eq 'com.whatsapp.w4b') {
                        Inspect-Item $m.GetFolder "Android/media/com.whatsapp.w4b"
                        foreach ($w4bSub in $m.GetFolder.Items()) {
                            if ($w4bSub.IsFolder) {
                                Inspect-Item $w4bSub.GetFolder "Android/media/com.whatsapp.w4b/$($w4bSub.Name)"
                            }
                        }
                    }
                }
            }
        }
    }
}
