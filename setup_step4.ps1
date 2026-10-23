Get-ChildItem -Path "C:\Users\Sierr\SE-Vercel-deploy-main" -Recurse -Depth 2 -Filter "docker-compose*.yml" | ForEach-Object {
    Write-Host "Starting Docker stack: $($_.FullName)" -ForegroundColor Cyan
    docker compose -f $_.FullName up -d --build --remove-orphans
}

docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
