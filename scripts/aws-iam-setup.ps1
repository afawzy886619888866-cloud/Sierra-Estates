#!/usr/bin/env pwsh
# ============================================================
# Sierra Estates — AWS IAM Auto-Setup Script
# Creates IAM user + access keys + EC2 security group
# Run: pwsh scripts/aws-iam-setup.ps1
# ============================================================

# ── 0. Ensure AWS CLI PATH ───────────────────────────────────
$env:PATH = "C:\Users\sierr\AppData\Local\Programs\Python\Python312;C:\Users\sierr\AppData\Local\Programs\Python\Python312\Scripts;" + $env:PATH

# ── 1. Check AWS CLI ─────────────────────────────────────────
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  AWS CLI not found. Installing..." -ForegroundColor Yellow
    pip install awscli
}

# ── 2. Check credentials ─────────────────────────────────────
Write-Host "`n🔍 Verifying AWS credentials..." -ForegroundColor Cyan
$identity = aws sts get-caller-identity --output json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ AWS credentials not configured or invalid." -ForegroundColor Red
    Write-Host "   Your credentials file: $env:USERPROFILE\.aws\credentials" -ForegroundColor Yellow
    Write-Host "   Enter your real AWS root access key below:" -ForegroundColor Yellow
    $keyId     = Read-Host "   aws_access_key_id"
    $keySecret = Read-Host "   aws_secret_access_key"
    @"
[default]
aws_access_key_id = $keyId
aws_secret_access_key = $keySecret
"@ | Set-Content -Path "$env:USERPROFILE\.aws\credentials" -Encoding UTF8
    @"
[default]
region = eu-central-1
output = json
"@ | Set-Content -Path "$env:USERPROFILE\.aws\config" -Encoding UTF8
    Write-Host "✅ Credentials saved." -ForegroundColor Green
} else {
    $identityObj = $identity | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($identityObj.Arn)" -ForegroundColor Green
}

$USER_NAME = "sierra-estates-cli"

# ── 3. Create IAM User ───────────────────────────────────────
Write-Host "`n👤 Creating IAM user: $USER_NAME ..." -ForegroundColor Cyan
aws iam get-user --user-name $USER_NAME 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   User already exists — skipping creation." -ForegroundColor Yellow
} else {
    aws iam create-user --user-name $USER_NAME | Out-Null
    Write-Host "   ✅ User created." -ForegroundColor Green
}

# ── 4. Attach AdministratorAccess policy ─────────────────────
Write-Host "`n🔐 Attaching AdministratorAccess policy..." -ForegroundColor Cyan
aws iam attach-user-policy `
    --user-name $USER_NAME `
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
Write-Host "   ✅ Policy attached." -ForegroundColor Green

# ── 5. Create Access Key ─────────────────────────────────────
Write-Host "`n🗝️  Creating access key for $USER_NAME ..." -ForegroundColor Cyan

# Delete existing keys first (max 2 per user)
$existingKeys = aws iam list-access-keys --user-name $USER_NAME --output json | ConvertFrom-Json
foreach ($key in $existingKeys.AccessKeyMetadata) {
    Write-Host "   Deleting old key: $($key.AccessKeyId)" -ForegroundColor Yellow
    aws iam delete-access-key --user-name $USER_NAME --access-key-id $key.AccessKeyId | Out-Null
}

$newKey = aws iam create-access-key --user-name $USER_NAME --output json | ConvertFrom-Json
$ACCESS_KEY_ID     = $newKey.AccessKey.AccessKeyId
$SECRET_ACCESS_KEY = $newKey.AccessKey.SecretAccessKey

Write-Host "   ✅ Access key created!" -ForegroundColor Green

# ── 6. Save new keys to credentials file ────────────────────
Write-Host "`n💾 Saving new credentials to ~/.aws/credentials..." -ForegroundColor Cyan
@"
[default]
aws_access_key_id = $ACCESS_KEY_ID
aws_secret_access_key = $SECRET_ACCESS_KEY

[sierra-estates]
aws_access_key_id = $ACCESS_KEY_ID
aws_secret_access_key = $SECRET_ACCESS_KEY
"@ | Set-Content -Path "$env:USERPROFILE\.aws\credentials" -Encoding UTF8

@"
[default]
region = eu-central-1
output = json

[profile sierra-estates]
region = eu-central-1
output = json
"@ | Set-Content -Path "$env:USERPROFILE\.aws\config" -Encoding UTF8

Write-Host "   ✅ Credentials saved." -ForegroundColor Green

# ── 7. Print Summary ─────────────────────────────────────────
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ✅ Sierra Estates AWS Setup Complete                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "IAM User:            $USER_NAME"
Write-Host "Access Key ID:       $ACCESS_KEY_ID"
Write-Host "Secret Access Key:   [saved to ~/.aws/credentials]"
Write-Host ""
Write-Host "📋 Next Step — launch EC2 for WhatsApp Bot:" -ForegroundColor Yellow
Write-Host "   bash scripts/launch-aws-ec2.sh"
Write-Host ""

# ── 8. Verify works ──────────────────────────────────────────
Write-Host "🔍 Verifying new credentials..." -ForegroundColor Cyan
aws sts get-caller-identity --profile sierra-estates
