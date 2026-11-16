# ==============================================================================
# Sierra Estates - Obsidian Memory Vault Sync Script
# Updates the Obsidian Vault with Sierra-2026 Codebase Status and Git Sourcing Data
# Scheduled to run automatically every 2 hours
# ==============================================================================

$ErrorActionPreference = "Stop"

# Paths Definition
$workspacePath = "F:\Final"
$vaultPath = "I:\Work Sierra Estates\Sierra Engine Brain\obsidian-vault"
$logPath = "F:\Final\scripts\obsidian-sync.log"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $msg"
    Write-Host $logLine
    try {
        Add-Content -Path $logPath -Value $logLine -ErrorAction SilentlyContinue
    } catch {}
}

Write-Log "Starting Obsidian Memory Vault synchronization..."

# Verify paths
if (-not (Test-Path $workspacePath)) {
    Write-Log "Error: Workspace path $workspacePath does not exist."
    exit 1
}

if (-not (Test-Path $vaultPath)) {
    Write-Log "Error: Obsidian vault path $vaultPath does not exist."
    exit 1
}

try {
    # 1. Fetch Git Repository Information
    Write-Log "Querying Git status for F:\Final..."
    $gitBranch = git -C $workspacePath rev-parse --abbrev-ref HEAD 2>$null
    if ($null -eq $gitBranch) { $gitBranch = "main" }
    
    $gitLastCommit = git -C $workspacePath log -1 --format="%h - %s (%an, %cr)" 2>$null
    if ($null -eq $gitLastCommit) { $gitLastCommit = "N/A" }

    $gitStatus = git -C $workspacePath status --short 2>$null
    $modifiedCount = 0
    if ($null -ne $gitStatus) {
        $lines = $gitStatus -split "`r?`n" | Where-Object { $_.Trim() -ne "" }
        $modifiedCount = $lines.Count
    }

    Write-Log "Git Info: Branch=[$gitBranch], LastCommit=[$gitLastCommit], ModifiedFiles=[$modifiedCount]"

    # 2. Retrieve Workspace Structure Statistics (Optimized - Skip Ignored Folders)
    Write-Log "Calculating workspace stats (skipping node_modules, .git, etc.)..."
    $ignoredDirs = @("node_modules", ".git", ".next", ".venv", ".turbo", ".pnpm", "node_modules_temp", "ارشيف")
    $totalFiles = 0
    
    Get-ChildItem -Path $workspacePath -Directory | Where-Object { $ignoredDirs -notcontains $_.Name } | ForEach-Object {
        $totalFiles += (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
    }
    # Add files in root
    $totalFiles += (Get-ChildItem -Path $workspacePath -File -ErrorAction SilentlyContinue).Count

    Write-Log "Workspace stats: TotalFiles=[$totalFiles]"

    # 3. Create or Update the Daily/Hourly Log in Obsidian Vault
    $todayStr = Get-Date -Format "yyyy-MM-dd"
    $nowStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $dailyNotePath = Join-Path $vaultPath "$todayStr.md"

    Write-Log "Writing daily note to $dailyNotePath..."
    
    # We construct the string line-by-line to avoid here-string escaping issues
    $lines = @(
        ('# 📅 Operations & Git Activity Ledger: {0}' -f $todayStr),
        '> **Automated Sync Source:** `F:\Final` (sierra-2026)  ',
        ('> **Last Synced:** {0}' -f $nowStr),
        '> **Parent Node:** [[Daily Activity Ledger]]',
        '',
        '---',
        '',
        '## 📡 Codebase & Git Status',
        ('- **Current Active Branch:** `{0}`' -f $gitBranch),
        ('- **Latest Commit Hash & Message:** `{0}`' -f $gitLastCommit),
        ('- **Workspace Modified Files count:** `{0}`' -f $modifiedCount),
        ('- **Total Registered Project Files:** `{0}`' -f $totalFiles),
        '',
        '## ⚙️ Active Sourced Integrations',
        '- **Centralized Data Ingestions:** Mapped to Firebase Firestore (`Properties`, `Owners`, `Leads`, `SessionBufferLogs`).',
        '- **Spreadsheet Sync Pipeline:** Enabled with SHA-256 cryptographic deduplication checks.',
        '- **Lead Dynamic Closer Routing:** Dynamic dispatch pools Active (`CLOSER_VIP_GOLDEN_SQUARE`, `CLOSER_MOKATTAM_SPECIALIST`).',
        '- **Interactive UI Frontends:** Next.js `page.tsx` + `SplitHeroViewport.tsx` (Kuula 3D panoramas integration).',
        '',
        '---',
        '*This ledger is automatically generated and synchronized every 2 hours.*'
    )
    
    $noteHeader = $lines -join "`r`n"
    [System.IO.File]::WriteAllText($dailyNotePath, $noteHeader, [System.Text.Encoding]::UTF8)

    # 4. Append to Obsidian Daily Activity Ledger.md
    $ledgerPath = Join-Path $vaultPath "Daily Activity Ledger.md"
    if (Test-Path $ledgerPath) {
        Write-Log "Appending sync log to Daily Activity Ledger.md..."
        $ledgerContent = [System.IO.File]::ReadAllText($ledgerPath, [System.Text.Encoding]::UTF8)
        
        $syncLine = "- **$nowStr**: Codebase synced. Active Branch: `$gitBranch` | Commit: `$gitLastCommit` | Files: $totalFiles"
        
        if (-not $ledgerContent.Contains("## 📡 Recent Automated Sync Logs")) {
            $ledgerContent += "`r`n`r`n## 📡 Recent Automated Sync Logs`r`n"
        }
        $ledgerContent += "$syncLine`r`n"
        
        [System.IO.File]::WriteAllText($ledgerPath, $ledgerContent, [System.Text.Encoding]::UTF8)
    }

    # 5. Update absolute link paths in Sierra Estates Memory Engine.md to use current local paths
    $enginePath = Join-Path $vaultPath "Sierra Estates Memory Engine.md"
    if (Test-Path $enginePath) {
        Write-Log "Updating local workspace references in Sierra Estates Memory Engine.md..."
        $engineContent = [System.IO.File]::ReadAllText($enginePath, [System.Text.Encoding]::UTF8)
        
        $oldPathPattern = "file:///C:/Users/sierr/.gemini/antigravity/worktrees/Final/refine-full-stack-ecosystem/docs/obsidian-vault"
        $newPathPattern = "file:///F:/Final/docs/obsidian-vault"
        
        if ($engineContent.Contains($oldPathPattern)) {
            $engineContent = $engineContent.Replace($oldPathPattern, $newPathPattern)
            [System.IO.File]::WriteAllText($enginePath, $engineContent, [System.Text.Encoding]::UTF8)
            Write-Log "Successfully updated absolute file links in Sierra Estates Memory Engine.md."
        }
    }

    Write-Log "Obsidian Memory Vault synchronization completed successfully."

} catch {
    $err = $_.Exception.Message
    Write-Log "Critical Error during Obsidian sync: $err"
    exit 1
}

