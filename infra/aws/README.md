# Sierra Estates — AWS Infrastructure

> Deploy n8n + WhatsApp bot on AWS EC2 (or ECS Fargate for managed).

## Architecture

```
                    AWS (eu-central-1 / Frankfurt)
                    ┌─────────────────────────────────┐
                    │                                 │
  Internet ───────► │  EC2 t3.small (2GB RAM)         │
                    │  ┌─────────────────────────┐    │
                    │  │ Docker Compose          │    │
                    │  │  ├─ n8n (port 5678)     │    │
                    │  │  └─ whatsapp-scraper    │    │
                    │  └─────────────────────────┘    │
                    │                                 │
                    │  Security Group:                │
                    │    22 (SSH)                     │
                    │    5678 (n8n)                   │
                    │    3000 (WhatsApp QR)           │
                    │    80/443 (future SSL)          │
                    └────────────┬────────────────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │  S3 Bucket (backups)            │
                    │  sierra-estates-backups         │
                    └─────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `ec2-user-data.sh` | Cloud-init script — auto-provisions EC2 on first boot |
| `security-group.json` | Security group config (SSH + n8n + WhatsApp ports) |
| `iam-role.json` | IAM role for S3 backups + CloudWatch logs |
| `ecs-task-definition.json` | Optional: ECS Fargate task definition (managed) |

## Quick Start (EC2 — recommended)

### Option A: One-command launch (from your laptop)
```bash
# Prerequisites: AWS CLI installed + configured
pip install awscli
aws configure  # enter access key + secret + region

# Launch EC2 with everything pre-configured
bash scripts/launch-aws-ec2.sh
```

The script will:
1. ✅ Find latest Ubuntu 22.04 AMI
2. ✅ Create security group (ports 22, 5678, 3000, 80, 443)
3. ✅ Launch EC2 instance with user-data script
4. ✅ Auto-install Docker + clone repo + start containers
5. ✅ Print SSH command + n8n URL + password

### Option B: Manual launch via AWS Console
1. Go to AWS Console → EC2 → Launch Instance
2. Select **Ubuntu 22.04 LTS** AMI
3. Instance type: **t3.small** (2GB RAM, ~$15/mo)
4. Configure:
   - Storage: 30GB gp3
   - Security group: Allow ports 22, 5678, 3000, 80, 443
   - User data: Paste contents of `infra/aws/ec2-user-data.sh`
5. Launch with your SSH key pair
6. Wait 5 minutes → access n8n at `http://YOUR-IP:5678`

## Cost Comparison

| Instance | RAM | Cost/mo | Free Tier | Notes |
|----------|-----|---------|-----------|-------|
| t3.micro | 1GB | $8 | ✅ (12mo) | Needs 2GB swap — works but slower |
| **t3.small** | 2GB | $15 | ❌ | **Recommended** — comfortable for n8n |
| t3.medium | 4GB | $30 | ❌ | High traffic / many workflows |
| ECS Fargate | 1GB | ~$12 | ❌ | Managed (no SSH needed) |

## Backups

### Set up daily S3 backups (cron)
```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR-IP

# Create S3 bucket (from your laptop)
aws s3 mb s3://sierra-estates-backups --region eu-central-1

# Add backup script to cron
crontab -e
# Add this line for daily 3am backup:
0 3 * * * /opt/sierra-estates/scripts/backup-to-s3.sh sierra-estates-backups
```

### Restore from backup
```bash
# Stop containers
cd /opt/sierra-estates/infra
docker compose down

# Restore n8n data
aws s3 sync s3://sierra-estates-backups/backup-2025-01-15_0300/n8n-data/ ./n8n-data/

# Restore WhatsApp session
aws s3 sync s3://sierra-estates-backups/backup-2025-01-15_0300/whatsapp-auth/ ./whatsapp-auth/

# Restart
docker compose up -d
```

## Monitoring with CloudWatch

The IAM role (`iam-role.json`) grants CloudWatch Logs permissions.
To enable Docker logging to CloudWatch, add to `docker-compose.yml`:

```yaml
services:
  n8n:
    logging:
      driver: awslogs
      options:
        awslogs-group: "/sierra-estates/n8n"
        awslogs-region: "eu-central-1"
        awslogs-stream-prefix: "n8n"
```

## Optional: ECS Fargate (managed, no SSH)

For teams that prefer managed containers:

1. Build + push WhatsApp scraper to ECR:
```bash
aws ecr create-repository --repository-name sierra-whatsapp-scraper
cd infra/whatsapp-scraper
docker build -t sierra-whatsapp-scraper .
docker tag sierra-whatsapp-scraper:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/sierra-whatsapp-scraper:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/sierra-whatsapp-scraper:latest
```

2. Create ECS cluster + task definition from `ecs-task-definition.json`
3. Create EFS volumes for persistence (n8n-data + whatsapp-auth)
4. Store secrets in AWS Secrets Manager
5. Launch task on Fargate

> ⚠️ ECS Fargate is more expensive (~$12/mo for 0.5 vCPU + 1GB RAM) but requires no SSH maintenance.

## Security Hardening

### Restrict SSH to your IP
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR.HOME.IP/32
```

### Add SSL with Caddy (free Let's Encrypt)
```bash
# SSH to EC2
sudo apt install caddy
sudo tee /etc/caddy/Caddyfile << 'EOF'
your-domain.com {
  reverse_proxy localhost:5678
}
EOF
sudo systemctl restart caddy
```

## Troubleshooting

### Instance not responding
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-xxxxx

# Check user-data log
ssh -i key.pem ubuntu@IP 'cat /var/log/user-data.log'
```

### n8n not starting
```bash
# Check container logs
ssh -i key.pem ubuntu@IP 'docker compose -f /opt/sierra-estates/infra/docker-compose.yml logs n8n'

# Check if swap is active
ssh -i key.pem ubuntu@IP 'free -h'
```
