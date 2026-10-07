<#
.SYNOPSIS
  git-sync-main.ps1 - Windows PowerShell companion for branch synchronization
.DESCRIPTION
  Safely inspects and previews remote branch sync status against main.
.PARAMETER DryRun
  Simulate actions without making any changes
.PARAMETER BaseBranch
  Base branch to compare against (default: main)
.PARAMETER Remote
  Remote name (default: origin)
#>
param(
  [switch]$DryRun = $true,
  [string]$BaseBranch = "main",
  [string]$Remote = "origin",
  [switch]$VerboseOutput
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " git-sync-main — Branch Synchronization Tool (PowerShell)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Remote:      $Remote"
Write-Host " Base Branch: $BaseBranch"
Write-Host " Dry Run:     $DryRun"
Write-Host "=========================================================="

git fetch $Remote --prune 2>$null

$branches = git for-each-ref --format="%(refname:short)" "refs/remotes/$Remote/" | Where-Object {
  $_ -notmatch "HEAD$" -and $_ -notmatch "$BaseBranch$"
}

$plannedCount = 0
$upToDateCount = 0

Write-Host "`nEvaluating branches relative to $Remote/${BaseBranch}:"
Write-Host "----------------------------------------------------------"

foreach ($fullBranch in $branches) {
  $branchShort = $fullBranch -replace "^$Remote/", ""
  $ahead = [int](git rev-list --count "$Remote/$BaseBranch..$fullBranch" 2>$null)
  $behind = [int](git rev-list --count "$fullBranch..$Remote/$BaseBranch" 2>$null)

  if ($ahead -eq 0) {
    $upToDateCount++
    if ($VerboseOutput) {
      Write-Host "  ✓ $branchShort (Up to date / merged)" -ForegroundColor Gray
    }
    continue
  }

  $plannedCount++
  Write-Host "  → [PLANNED]  $branchShort ($ahead commit(s) ahead, behind $behind)" -ForegroundColor Yellow
}

Write-Host "----------------------------------------------------------"
Write-Host "Summary:"
Write-Host "  Planned clean merges: $plannedCount" -ForegroundColor Green
Write-Host "  Branches already merged: $upToDateCount" -ForegroundColor Gray
Write-Host "----------------------------------------------------------"

if ($DryRun) {
  Write-Host "`n✔ [DRY RUN] Simulation complete. No branches were modified or pushed." -ForegroundColor Green
}
