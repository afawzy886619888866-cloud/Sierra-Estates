$shell = New-Object -ComObject Shell.Application
$thisPC = $shell.Namespace(17)
$phone = $null

foreach ($item in $thisPC.Items()) {
    if ($item.Name -like "*S24*" -or $item.Name -like "*Ahmed*" -or $item.Name -match "[\u0600-\u06FF]") {
        $phone = $item
        break
    }
}

$storage = $phone.GetFolder.Items() | Select-Object -First 1

function Walk($folder, $depth) {
    if ($depth -gt 4) { return }
    foreach ($item in $folder.Items()) {
        $indent = "  " * $depth
        if ($item.IsFolder) {
            Write-Host "$indent+ $($item.Name)/"
            Walk $item.GetFolder ($depth + 1)
        } else {
            if ($item.Name -match "\.txt$|\.zip$|chat|whatsapp|owner|broker|[\u0600-\u06FF]" -or $item.Name -match "^IMG-.*-WA") {
                Write-Host "$indent- $($item.Name) ($([math]::Round($item.Size/1024)) KB)"
            }
        }
    }
}

$androidFolder = $storage.GetFolder.Items() | Where-Object { $_.Name -eq "Android" } | Select-Object -First 1
$mediaFolder = $androidFolder.GetFolder.Items() | Where-Object { $_.Name -eq "media" } | Select-Object -First 1
$waFolder = $mediaFolder.GetFolder.Items() | Where-Object { $_.Name -like "*whatsapp*" } | Select-Object -First 1

Write-Host "WhatsApp Package: $($waFolder.Name)"
Walk $waFolder.GetFolder 1
