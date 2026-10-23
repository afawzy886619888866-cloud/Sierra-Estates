#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — AWS EC2 Launch Script
# File: SE/scripts/launch-aws-ec2.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  Launches an EC2 instance with n8n + WhatsApp bot fully configured.
#  Run this from your LOCAL machine (not the VPS).
#
#  PREREQUISITES:
#    - AWS CLI installed:  pip install awscli  (or brew install awscli)
#    - AWS configured:     aws configure
#    - SSH key pair created in AWS
#
#  USAGE:
#    bash scripts/launch-aws-ec2.sh
#
#  COST:
#    t3.small: ~$15/month (2GB RAM — recommended)
#    t3.micro: ~$8/month  (1GB RAM + 2GB swap — works but slower)
#    Free tier: t3.micro free for 12 months (new AWS accounts)
# ═══════════════════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Sierra Estates — AWS EC2 Launch                         ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Check AWS CLI ──
if ! command -v aws &> /dev/null; then
  echo -e "${RED}✗ AWS CLI not installed. Install: pip install awscli${NC}"
  exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}✗ AWS credentials not configured. Run: aws configure${NC}"
  exit 1
fi
echo -e "${GREEN}✓ AWS CLI configured${NC}"

# ── Get AWS region ──
REGION=$(aws configure get region 2>/dev/null || echo "")
if [ -z "$REGION" ]; then
  REGION="eu-central-1"  # Frankfurt — closest to Egypt
  echo -e "${YELLOW}  No region set, using $REGION (Frankfurt)${NC}"
fi
echo -e "  Region: $REGION"

# ── Instance type ──
echo ""
echo -e "${YELLOW}Select instance type:${NC}"
echo "  1) t3.micro  (1GB RAM + 2GB swap — $8/mo, free tier eligible)"
echo "  2) t3.small  (2GB RAM — $15/mo, recommended)"
echo "  3) t3.medium (4GB RAM — $30/mo, for high traffic)"
read -p "  Choice [2]: " INSTANCE_CHOICE

case $INSTANCE_CHOICE in
  1) INSTANCE_TYPE="t3.micro" ;;
  3) INSTANCE_TYPE="t3.medium" ;;
  *) INSTANCE_TYPE="t3.small" ;;
esac
echo -e "  Instance: $INSTANCE_TYPE"

# ── Key pair ──
echo ""
echo -e "${YELLOW}SSH Key Pair:${NC}"
KEY_PAIRS=$(aws ec2 describe-key-pairs --region "$REGION" --query 'KeyPairs[*].KeyName' --output text 2>/dev/null)
if [ -z "$KEY_PAIRS" ]; then
  echo -e "${RED}  No key pairs found. Create one first:${NC}"
  echo -e "  aws ec2 create-key-pair --key-name sierra-key --query 'KeyMaterial' --output text > ~/.ssh/sierra-key.pem"
  echo -e "  chmod 400 ~/.ssh/sierra-key.pem"
  exit 1
fi
echo "  Available: $KEY_PAIRS"
read -p "  Key pair name: " KEY_NAME

# ── Get latest Ubuntu AMI ──
echo ""
echo -e "${YELLOW}Finding latest Ubuntu 22.04 AMI...${NC}"
AMI_ID=$(aws ssm get-parameters \
  --names "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp3/ami-id" \
  --region "$REGION" \
  --query 'Parameters[0].Value' \
  --output text 2>/dev/null)

if [ -z "$AMI_ID" ]; then
  echo -e "${RED}✗ Could not find Ubuntu AMI. Falling back to manual.${NC}"
  read -p "  Enter AMI ID manually: " AMI_ID
fi
echo -e "${GREEN}  ✓ AMI: $AMI_ID${NC}"

# ── Create Security Group ──
echo ""
echo -e "${YELLOW}Creating security group...${NC}"
SG_NAME="sierra-estates-sg"
SG_ID=$(aws ec2 describe-security-groups \
  --group-names "$SG_NAME" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "")

if [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Sierra Estates — n8n + WhatsApp bot" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)

  # Add rules
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" --protocol tcp --port 22 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" --protocol tcp --port 5678 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" --protocol tcp --port 3000 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" --protocol tcp --port 443 --cidr 0.0.0.0/0

  echo -e "${GREEN}  ✓ Security group created: $SG_ID${NC}"
else
  echo -e "${GREEN}  ✓ Security group exists: $SG_ID${NC}"
fi

# ── Get user-data script path ──
USER_DATA_PATH="$(dirname "$0")/../infra/aws/ec2-user-data.sh"
if [ ! -f "$USER_DATA_PATH" ]; then
  echo -e "${RED}✗ User data script not found: $USER_DATA_PATH${NC}"
  exit 1
fi

# ── Launch EC2 ──
echo ""
echo -e "${YELLOW}Launching EC2 instance...${NC}"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --user-data "file://$USER_DATA_PATH" \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=sierra-estates},{Key=Project,Value=sierra-estates}]" \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo -e "${GREEN}  ✓ Instance launched: $INSTANCE_ID${NC}"

# ── Wait for public IP ──
echo ""
echo -e "${YELLOW}Waiting for instance to get public IP (30s)...${NC}"
sleep 30

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo -e "${GREEN}  ✓ Public IP: $PUBLIC_IP${NC}"

# ── Print summary ──
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Sierra Estates EC2 launched!                          ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Instance ID:    $INSTANCE_ID${NC}"
echo -e "${GREEN}║  Instance Type:  $INSTANCE_TYPE${NC}"
echo -e "${GREEN}║  Public IP:      $PUBLIC_IP${NC}"
echo -e "${GREEN}║  Region:         $REGION${NC}"
echo -e "${GREEN}║  Security Group: $SG_ID${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  SSH:            ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@$PUBLIC_IP${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  n8n will be available in ~5 minutes at:${NC}"
echo -e "${GREEN}║  http://$PUBLIC_IP:5678${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  n8n password is auto-generated.${NC}"
echo -e "${GREEN}║  Find it: ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'cat /var/log/user-data.log | grep Password'${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  WhatsApp QR:${NC}"
echo -e "${GREEN}║  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'docker compose -f /opt/sierra-estates/infra/docker-compose.yml logs whatsapp-scraper | grep -A 25 Scan'${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# ── Optional: Create S3 backup bucket ──
echo ""
read -p "Create S3 backup bucket? (y/n) [n]: " CREATE_BUCKET
if [[ "$CREATE_BUCKET" == "y" || "$CREATE_BUCKET" == "Y" ]]; then
  BUCKET_NAME="sierra-estates-backups-$(aws sts get-caller-identity --query 'Account' --output text)"
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION" 2>/dev/null || true
  echo -e "${GREEN}  ✓ S3 bucket: s3://$BUCKET_NAME${NC}"
  echo -e "  Backup command: aws s3 sync /opt/sierra-estates/infra/n8n-data s3://$BUCKET_NAME/n8n-data/"
fi
