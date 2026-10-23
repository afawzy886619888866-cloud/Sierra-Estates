#!/usr/bin/env pwsh
# ============================================================
# Sierra Estates — AWS EC2 Launch Script (Automated)
# ============================================================

$ErrorActionPreference = "Stop"

# Ensure AWS CLI is in PATH
$env:PATH = "C:\Users\sierr\AppData\Local\Programs\Python\Python312;C:\Users\sierr\AppData\Local\Programs\Python\Python312\Scripts;" + $env:PATH

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Sierra Estates — AWS EC2 Launch (Automated)             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verify AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Verify AWS credentials
Write-Host "🔍 Verifying AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ Authenticated as: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured. Please run aws-iam-setup.ps1 first." -ForegroundColor Red
    exit 1
}

$REGION = "eu-central-1"
$INSTANCE_TYPE = "t3.small"
$KEY_NAME = "sierra-key-auto"
$SG_NAME = "sierra-estates-sg-auto"

Write-Host "`nRegion: $REGION"
Write-Host "Instance Type: $INSTANCE_TYPE"

# Check for existing key pair or create one
Write-Host "`n🔑 Checking Key Pair '$KEY_NAME'..." -ForegroundColor Yellow
$null = aws ec2 describe-key-pairs --region $REGION --key-names $KEY_NAME 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Creating new key pair '$KEY_NAME'..." -ForegroundColor Cyan
    $keyMaterial = aws ec2 create-key-pair --region $REGION --key-name $KEY_NAME --query "KeyMaterial" --output text
    $keyPath = "$env:USERPROFILE\.ssh\$KEY_NAME.pem"
    if (!(Test-Path "$env:USERPROFILE\.ssh")) {
        New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
    }
    $keyMaterial | Out-File -FilePath $keyPath -Encoding ASCII
    Write-Host "✅ Key pair created and saved to $keyPath" -ForegroundColor Green
} else {
    Write-Host "✅ Key pair '$KEY_NAME' already exists." -ForegroundColor Green
}

# Get Latest Ubuntu 22.04 AMI
Write-Host "`n💿 Finding latest Ubuntu 22.04 AMI..." -ForegroundColor Yellow
$AMI_ID = aws ssm get-parameters --names "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id" --region $REGION --query "Parameters[0].Value" --output text
Write-Host "✅ AMI Found: $AMI_ID" -ForegroundColor Green

# Security Group
Write-Host "`n🛡️ Checking Security Group '$SG_NAME'..." -ForegroundColor Yellow
$SG_ID = aws ec2 describe-security-groups --region $REGION --group-names $SG_NAME --query "SecurityGroups[0].GroupId" --output text 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Creating Security Group..." -ForegroundColor Cyan
    $SG_ID = aws ec2 create-security-group --region $REGION --group-name $SG_NAME --description "Sierra Estates Auto SG" --query "GroupId" --output text
    
    # Add Rules
    aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 22 --cidr "0.0.0.0/0" | Out-Null
    aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 80 --cidr "0.0.0.0/0" | Out-Null
    aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 443 --cidr "0.0.0.0/0" | Out-Null
    aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 3000 --cidr "0.0.0.0/0" | Out-Null
    aws ec2 authorize-security-group-ingress --region $REGION --group-id $SG_ID --protocol tcp --port 5678 --cidr "0.0.0.0/0" | Out-Null
    Write-Host "✅ Security group created with ID $SG_ID" -ForegroundColor Green
} else {
    Write-Host "✅ Security group '$SG_NAME' already exists with ID $SG_ID." -ForegroundColor Green
}

# Launch Instance
Write-Host "`n🚀 Launching EC2 instance..." -ForegroundColor Yellow
$userDataPath = "$PSScriptRoot\..\infra\aws\ec2-user-data.sh"
if (-not (Test-Path $userDataPath)) {
    Write-Host "❌ User data script not found at $userDataPath" -ForegroundColor Red
    exit 1
}

# We pass file:// to AWS CLI so it reads the file and encodes it internally
# without hitting the Windows command-line length limits.
$userDataArg = "fileb://$userDataPath"

$INSTANCE_ID = aws ec2 run-instances `
    --region $REGION `
    --image-id $AMI_ID `
    --instance-type $INSTANCE_TYPE `
    --key-name $KEY_NAME `
    --security-group-ids $SG_ID `
    --user-data $userDataArg `
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=sierra-estates-auto}]" `
    --query "Instances[0].InstanceId" `
    --output text

Write-Host "✅ Instance launched! ID: $INSTANCE_ID" -ForegroundColor Green
Write-Host "`n⏳ Waiting for instance to get a public IP (30 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

$PUBLIC_IP = aws ec2 describe-instances --region $REGION --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 Sierra Estates EC2 Launched Successfully!            ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Public IP: $PUBLIC_IP"
Write-Host "║  SSH: ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
Write-Host "║  n8n URL (in ~5m): http://$PUBLIC_IP:5678"
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
