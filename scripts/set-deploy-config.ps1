# Syncs GitHub Actions deploy configuration for deploy-vercel.yml.
#
#   - Repo VARIABLES: NEXT_PUBLIC_FIREBASE_* (public web config, read from
#     apps/sierra-estates-realty/.env.local)
#   - Repo SECRET:    SESSION_SECRET (generated once if missing; -Force to rotate)
#
# The deploy workflow pushes these to BOTH Vercel projects (client + admin) on
# every deploy, so the dashboard never needs manual env editing for these keys.
#
# Requires: gh CLI, and a token with repo admin (uses GH_TOKEN if set, else the
# token embedded in the origin remote URL).
#
# Usage: powershell -File scripts\set-deploy-config.ps1 [-Force]

param([switch]$Force)

$ErrorActionPreference = 'Stop'
$repo = 'ahmedfawzy8866/SE'
$root = Split-Path -Parent $PSScriptRoot

if (-not $env:GH_TOKEN) {
    $u = git -C $root remote get-url origin
    if ($u -match 'ghp_[A-Za-z0-9]+') { $env:GH_TOKEN = $Matches[0] }
}
if (-not $env:GH_TOKEN) { throw 'No GitHub token available (set GH_TOKEN).' }

$headers = @{ Authorization = 'Bearer ' + $env:GH_TOKEN; Accept = 'application/vnd.github+json' }
$api = "https://api.github.com/repos/$repo/actions/variables"

# ── Firebase public config → repo variables ─────────────────────────────────
$envFile = Join-Path $root 'apps\sierra-estates-realty\.env.local'
$lines = Get-Content $envFile | Where-Object { $_ -match '^NEXT_PUBLIC_FIREBASE_[A-Z_]+=' }
foreach ($line in $lines) {
    $idx = $line.IndexOf('=')
    $name = $line.Substring(0, $idx)
    $value = $line.Substring($idx + 1).Trim().Trim('"')
    if (-not $value) { continue }
    $body = @{ name = $name; value = $value } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Post -Headers $headers -Uri $api -Body $body -ContentType 'application/json' | Out-Null
        Write-Host "var $name created"
    }
    catch {
        Invoke-RestMethod -Method Patch -Headers $headers -Uri "$api/$name" -Body $body -ContentType 'application/json' | Out-Null
        Write-Host "var $name updated"
    }
}

# ── SESSION_SECRET → repo secret ─────────────────────────────────────────────
$existing = (Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$repo/actions/secrets?per_page=100").secrets.name
if ($Force -or ($existing -notcontains 'SESSION_SECRET')) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $secret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    $secret | gh secret set SESSION_SECRET --repo $repo
    Write-Host 'secret SESSION_SECRET set'
}
else {
    Write-Host 'secret SESSION_SECRET already exists (use -Force to rotate)'
}

Write-Host '' 