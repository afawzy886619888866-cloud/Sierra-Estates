<#
DEPLOY_MAP_REDESIGN.ps1
=======================
Ship the COMPLETED Sierra Estates /properties map redesign to production.

The redesign is already implemented and verified (commit 6a57729d, 7 files,
+2709/-51, presentation layer ONLY; tsc 0 errors, vitest 34/34, live-data
browser smoke passed, 6 evidence screenshots). Re-verified against deploy-repo
main b38692a8 on 2026-11-03: patch applies clean, bundle fetch OK.

This script ONLY:
  1. clones the deploy repo (public, no token needed to clone)
  2. recreates branch feat/map-ui-stitch from the verified git bundle
     (falls back to the patch if the bundle cannot be loaded)
  3. pushes that branch to GitHub
  4. opens the Pull Request page (or creates the PR via gh if installed)

It NEVER touches main directly (main is protected). YOU merge the PR on
github.com - that merge is what triggers the Vercel production deploy.

REQUIREMENTS (run on your Windows machine):
  - git installed (https://git-scm.com/download/win)
  - This file in the SAME folder as these two files from the same download:
        map-ui-stitch.bundle
        0001-map-masterplan-stitch-redesign.patch
  - Push rights to sierrablue8866-droid/SE-Vercel-deploy-main
    (a GitHub login window appears on first push - never paste tokens anywhere)

USAGE (PowerShell):
    powershell -ExecutionPolicy Bypass -File .\DEPLOY_MAP_REDESIGN.ps1

Re-runnable: if the clone folder already exists it is reused and reset;
the branch is force-recreated from the bundle each time.
#>

param(
    [string]$RepoUrl   = "https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git",
    [string]$Branch    = "feat/map-ui-stitch",
    [string]$CloneDir  = "SE-Vercel-deploy-main"
)

$ErrorActionPreference = "Stop"
$VerifiedBase = "b38692a8275bcbae6f671d4e5e11dd5cfde50371"   # deploy main this redesign was built + verified on

$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundle = Join-Path $here "map-ui-stitch.bundle"
$patch  = Join-Path $here "0001-map-masterplan-stitch-redesign.patch"

function Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "    $m" -ForegroundColor Green }
function Info($m) { Write-Host "    $m" }
function Warn($m) { Write-Host "    $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "    $m" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 0. preflight
Step "Preflight"
git --version 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "git not found. Install it from https://git-scm.com/download/win, then re-run." }
Ok "git present: $(git --version)"

foreach ($f in @($bundle, $patch)) {
    if (-not (Test-Path $f)) {
        Fail "Missing file: $(Split-Path -Leaf $f) - it must sit in the same folder as this script (extract the WHOLE zip)."
    }
}
Ok "bundle + patch found next to script"

# ------------------------------------------------------------- 1. get the repo
Step "Clone deploy repo (public - no login needed to clone)"
if (Test-Path $CloneDir) {
    Warn "Folder '$CloneDir' exists - reusing it (local changes in it are reset)."
    Push-Location $CloneDir
    git fetch origin
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "git fetch origin failed (internet?)." }
    git checkout -q main
    git reset -q --hard origin/main
    Pop-Location
} else {
    git clone $RepoUrl $CloneDir
    if ($LASTEXITCODE -ne 0) { Fail "clone failed - check internet / GitHub reachability." }
}
Ok "repo ready"

Push-Location $CloneDir
try {
    # ------------------------------------------------------ 2. load the commit
    Step "Load the verified redesign commit onto branch $Branch"
    $originMain = (git rev-parse origin/main)
    if (-not $originMain) { Fail "could not resolve origin/main - is the clone intact? Delete the '$CloneDir' folder and re-run." }
    if ($originMain -ne $VerifiedBase) {
        Warn "Deploy main moved: now $($originMain.Substring(0,8)), verified base was $($VerifiedBase.Substring(0,8))."
        Warn "The branch will still be based on the verified base - GitHub merges this fine unless the same map files changed. If the PR shows conflicts, stop and go back to the chat."
    } else {
        Ok "deploy main = b38692a8 (exact verified base)"
    }

    git checkout -q main
    git fetch -q "$bundle" "+refs/heads/${Branch}:refs/heads/${Branch}"
    if ($LASTEXITCODE -eq 0) {
        git checkout -q $Branch
        Ok "loaded EXACT verified commit $(git rev-parse --short $Branch) from the git bundle"
    } else {
        Warn "bundle load failed - falling back to patch application"
        git checkout -q -B $Branch origin/main
        git am "$patch"
        if ($LASTEXITCODE -ne 0) {
            git am --abort 2>$null
            Fail "patch did not apply cleanly (main probably moved). Run: git log --oneline -5  and take that output back to the chat."
        }
        Ok "patch applied - new commit $(git rev-parse --short $Branch)"
    }

    $touched = (git show --stat --format="" $Branch)
    Info "commit touches $($touched.Count) file-stat lines; presentation files only (verified)."

    # ------------------------------------------------------------- 3. push it
    Step "Push branch $Branch to GitHub"
    Info "A GitHub login window may pop up on first push - use your browser, never paste tokens."
    git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Warn "Plain push failed. If you re-ran this script and the remote branch already exists, force-refresh it with:"
        Warn "    git push --force-with-lease origin $Branch"
        Fail "push failed - see git's message above."
    }
    Ok "branch pushed"

    # --------------------------------------------------------------- 4. the PR
    Step "Create the Pull Request"
    $repoPath = $RepoUrl -replace '\.git$','' -replace '^https://github\.com/',''
    $prTitle  = "feat(map): properties masterplan redesign - 4 Stitch variants (light/dark x en/ar/bilingual)"
    $prBody = @'
## What
/properties map redesign per the approved Stitch masterplan design (project 2455613122012383700, order v2): 4 variants (Light/Dark x EN/AR/bilingual), glass compound pills with live counts, zoom-driven proximity magnification, Inventory Registry modal (real live units only), keyless Esri basemaps, golden compass + live coordinates + real scale bar.

## Safety
Presentation layer ONLY - 7 files, +2709/-51. Zero changes to /api/inventory, publish gates, RLS, migrations, or compounds-data.ts coordinates. No demo values (order section 21), no hotlinks to Stitch/Google CDNs. Map engine (react-leaflet) kept.

## Verification (agent sandbox, live data, 2026-11-02)
tsc 0 errors | vitest 34/34 | dev-server smoke with real /api/inventory | 4-variant + registry-modal + proximity-zoom screenshots | demo-value grep zero hits | zero CDN hotlink requests.

## After merge
Vercel auto-deploys. Check: sierra-estates.net, /properties and admin all HTTP 200; map pins count unchanged. Rollback: git revert this commit + push, or Vercel Instant Rollback.
'@

    $prCreated = $false
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        gh pr create --repo $repoPath --base main --head $Branch --title $prTitle --body $prBody
        if ($LASTEXITCODE -eq 0) { $prCreated = $true; Ok "PR created with gh (link above)" }
    }
    if (-not $prCreated) {
        $prUrl = "https://github.com/$repoPath/compare/main...${Branch}?expand=1"
        Info "gh CLI not available/failed - opening the PR page in your browser:"
        Info "    $prUrl"
        Start-Process $prUrl
        Ok "browser opened - fill title/body if you like, then click 'Create pull request'"
    }

    # ------------------------------------------------- 5. what happens next
    Step "REMAINING STEPS (manual, ~2 minutes)"
    $nextSteps = @"
    1. On the PR page: click 'Create pull request' (if not already created),
       review the 7 changed files, then click 'Merge pull request'.
       -> Merging to main triggers the Vercel production deploy automatically.
    2. Wait for the Vercel deployment to finish (watch it at
       https://vercel.com/dashboard, or the PR's deployment checks).
    3. Verify production (PowerShell):
           curl.exe -s -o NUL -w "home:  %{http_code}``n" https://sierra-estates.net
           curl.exe -s -o NUL -w "map:   %{http_code}``n" https://sierra-estates.net/properties
           curl.exe -s -o NUL -w "admin: %{http_code}``n" https://admin.sierra-estates.net
       All three must be 200. Then open https://sierra-estates.net/properties
       and confirm the new map (Light/Dark + EN/AR|EN pills, top-left).
    4. ROLLBACK if anything looks wrong:
       - instant: Vercel dashboard -> Deployments -> last good -> Instant Rollback
       - git:      git revert <merge-commit> && git push origin main
"@
    Write-Host $nextSteps
    Ok "done - the rest is two clicks on github.com"
}
finally {
    Pop-Location
}
