$shell = New-Object -ComObject Shell.Application
$pc = $shell.Namespace(17)
$phone = $null
foreach ($it in $pc.Items()) {
    if ($it.Name -like '*S24*' -or $it.Name -like '*Ahmed*' -or $it.Name -like '*أحمد*') {
        $phone = $it
        break
    }
}

if ($phone) {
    Write-Host "Phone Device Found: $($phone.Name)"
    $phoneFolder = $phone.GetFolder
    if ($phoneFolder) {
        $subItems = @($phoneFolder.Items())
        Write-Host "Storage Items Count: $($subItems.Count)"
        if ($subItems.Count -eq 0) {
            Write-Host "ATTENTION: Device is connected but storage items are not accessible." -ForegroundColor Yellow
            Write-Host "Please ensure the phone screen is UNLOCKED and USB mode is set to 'Transferring files / Android Auto' (MTP)." -ForegroundColor Yellow
        } else {
            foreach ($sub in $subItems) {
                Write-Host " -> $($sub.Name) (Type: $($sub.Type))"
            }
        }
    } else {
        Write-Host "GetFolder was null."
    }
} else {
    Write-Host "Phone not detected in This PC."
}
