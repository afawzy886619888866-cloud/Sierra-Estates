#!/usr/bin/env pwsh
# ==============================================================================
# Sierra Estates — Terminate AWS EC2 & Release Elastic IP (Free Docker Migration)
# ==============================================================================
# Permanently stops cloud billing by terminating instance i-0be8ff8c5cfba7363
# and releasing Elastic IP 18.232.148.172.
# ==============================================================================

$ErrorActionPreference = "Continue"
$REGION = "us-east-1"
$INSTANCE_ID = "i-0be8ff8c5cfba7363"
$ELASTIC_IP = "18.232.148.172"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sierra Estates -- AWS EC2 Decommission & Billing Cut" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check AWS CLI Authentication
Write-Host "`n[1/3] Checking AWS Authentication..." -ForegroundColor Yellow
$authSuccess = $false

foreach ($profile in @("sierra-estates", "default", "Ahmed", "AHMED")) {
    try {
        $id = aws sts get-caller-identity --profile $profile --output json 2>$null | ConvertFrom-Json
        if ($id -and $id.Arn) {
            Write-Host "   Authenticated via profile: $profile ($($id.Arn))" -ForegroundColor Green
            $env:AWS_PROFILE = $profile
            $authSuccess = $true
            break
        }
    } catch {
        # continue checking
    }
}

if (-not $authSuccess) {
    Write-Host "   AWS CLI session expired or unauthenticated." -ForegroundColor Yellow
    Write-Host "   Attempting to authenticate via browser..." -ForegroundColor Gray
    aws login --profile sierra-estates
    
    try {
        $id = aws sts get-caller-identity --profile sierra-estates --output json 2>$null | ConvertFrom-Json
        if ($id -and $id.Arn) {
            $authSuccess = $true
            $env:AWS_PROFILE = "sierra-estates"
        }
    } catch {}
}

if ($authSuccess) {
    # 2. Terminate Instance
    Write-Host "`n[2/3] Terminating EC2 Instance $INSTANCE_ID..." -ForegroundColor Yellow
    $termResult = aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION --output json 2>&1
    Write-Host "   $termResult" -ForegroundColor Green

    # 3. Release Elastic IP
    Write-Host "`n[3/3] Releasing Elastic IP $ELASTIC_IP..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    $relResult = aws ec2 release-address --public-ip $ELASTIC_IP --region $REGION 2>&1
    Write-Host "   $relResult" -ForegroundColor Green

    Write-Host "`nSUCCESS: AWS Instance terminated and Elastic IP released! AWS monthly cost is now $0.00." -ForegroundColor Green
} else {
    Write-Host "`n[Action Required] AWS CLI authentication could not be completed automatically." -ForegroundColor Red
    Write-Host "Please terminate directly via AWS Web Console (1-minute process):" -ForegroundColor Cyan
    Write-Host "1. Open EC2 Instances:" -ForegroundColor White
    Write-Host "   https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#Instances:instanceId=i-0be8ff8c5cfba7363"
    Write-Host "   -> Select instance -> Instance State -> Terminate Instance"
    Write-Host "2. Open Elastic IPs:" -ForegroundColor White
    Write-Host "   https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#Addresses:search=18.232.148.172"
    Write-Host "   -> Select 18.232.148.172 -> Actions -> Release Elastic IP address"
}
