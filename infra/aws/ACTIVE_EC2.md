# Sierra Estates — Active EC2 Instance Configuration

This document records the exact configuration, credentials, and connection instructions for the running AWS EC2 server.

---

## 1. Instance Specification

| Field | Value |
| :--- | :--- |
| **Instance ID** | `i-0be8ff8c5cfba7363` |
| **Public IPv4** | `18.232.148.172` |
| **Private IPv4** | `172.31.17.51` |
| **Public DNS** | `ec2-18-232-148-172.compute-1.amazonaws.com` |
| **AWS Region** | `us-east-1` (US East, N. Virginia) |
| **AWS Account ID**| `453195924104` |
| **Instance Type**| `t3.micro` (2 vCPUs, 1 GB RAM) |
| **AMI ID** | `ami-01edba92f9036f76e` |
| **Operating System** | **Amazon Linux 2023** (`al2023`) |
| **Default SSH User** | **`ec2-user`** (⚠️ Do not use `ubuntu` on Amazon Linux) |
| **Key Pair Name**| `sierra-estates-key` (File: `sierra-estates-key.pem`) |
| **VPC ID** | `vpc-0d4959003057de146` |
| **Subnet ID** | `subnet-0cc8cbee5df685506` |

---

## 2. Inbound Firewall (Security Group) Requirements

Ensure the Security Group attached to this instance permits these inbound ports:

- **Port 22 (SSH)**: Source `My IP` or `0.0.0.0/0` (for command-line access)
- **Port 3000 (OpenWA Web UI)**: Source `0.0.0.0/0` (for linking WhatsApp via QR code)
- **Port 5678 (n8n Automation)**: Source `0.0.0.0/0` (for workflow management)

---

## 3. How to Connect via SSH

From PowerShell on Windows:

```powershell
ssh -i "path\to\sierra-estates-key.pem" ec2-user@18.232.148.172
```

---

## 4. Run Automated Setup on EC2

Once logged in via SSH:

```bash
# Download and execute the automated Amazon Linux 2023 setup
curl -sSL https://raw.githubusercontent.com/sierrablue8866-droid/SE-Vercel-deploy-main/main/infra/aws/setup-al2023-ec2.sh | bash
```

Or step-by-step:

```bash
# 1. Enter the OpenWA directory
cd /opt/sierra-estates/infra/openwa

# 2. Pull latest updates
git pull origin main

# 3. Start containers
docker compose up -d

# 4. Run plugin setup
bash setup.sh
```

---

## 5. Web Dashboards

- **WhatsApp QR & Session Manager**: [http://18.232.148.172:3000](http://18.232.148.172:3000)
- **n8n Automation Workflows**: [http://18.232.148.172:5678](http://18.232.148.172:5678)
