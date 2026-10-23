$tempEnv = "$HOME\.temp_aws_env"
if (-not (Test-Path $tempEnv)) {
    Set-Location "C:\Users\Sierr\SE-Vercel-deploy-main"
    pnpm --prefix "apps/sierra-estates-realty" dlx vercel@latest env pull --environment=production $tempEnv --yes
}

$cleanLines = @()
if (Test-Path $tempEnv) {
    $cleanLines = Get-Content $tempEnv | Where-Object {
        $_ -match "^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|OPENWA_|WABA_|WHATSAPP_|SENDGRID_|GOOGLE_|MASTER_SHEET_|UNITS_SHEET_|WORKFLOW_|CLOUDFLARE_|TUNNEL_|N8N_)" -and $_ -notmatch "54\.89\.162\.250|18\.232\.148\.172"
    }
}

$dockerEnv = @(
    "NODE_ENV=production",
    "TZ=Africa/Cairo",
    "OPENWA_HOST=openwa",
    "OPENWA_PORT=2785",
    "WHATSAPP_API_URL=http://openwa:2785",
    "RUNNER_BIND=0.0.0.0",
    "RUNNER_PORT=2786",
    "CRON_SECRET=sbr_b158d48c6c054ec1bc9b1d9dd9182d00c9ad479b028327ce",
    "SITE_URL=https://sierra-estates.net"
)

$mergedEnv = ($cleanLines + $dockerEnv) -join "`n"
Set-Content -Path "C:\Users\Sierr\SE-Vercel-deploy-main\workflows\workflows.env" -Value $mergedEnv -Encoding UTF8
Set-Content -Path "C:\Users\Sierr\SE-Vercel-deploy-main\workflows\.env" -Value $mergedEnv -Encoding UTF8
Write-Host "Configured workflows.env for Docker (AWS IPs removed)." -ForegroundColor Green
