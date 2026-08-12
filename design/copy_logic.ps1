$source = "h:\Sierra-Estates-Final"
$dest = "h:\SE"

# Exclude list (frontend apps and node_modules/git to prevent conflicts)
$exclude = @(
    "apps\sierra-estates-realty",
    "admin-panel",
    "node_modules",
    ".git",
    "dist",
    ".next",
    ".turbo"
)

# Get all items in source
$items = Get-ChildItem -Path $source -Force

foreach ($item in $items) {
    $skip = $false
    foreach ($ex in $exclude) {
        if ($item.FullName -like "*$ex*") {
            $skip = $true
            break
        }
    }
    
    if (-not $skip) {
        $destPath = Join-Path $dest $item.Name
        Write-Host "Copying $($item.Name)..."
        if ($item.PSIsContainer) {
            # Copy directory using robocopy
            robocopy $item.FullName $destPath /E /IS /IT /MT /XD node_modules .git .next dist .turbo /R:1 /W:1 > $null
        } else {
            # Copy file
            Copy-Item $item.FullName -Destination $destPath -Force
        }
    }
}
Write-Host "Copy complete."
