#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — VPS Automated Setup Script
# File: SE/scripts/setup-vps.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  WHAT THIS DOES:
#    1. Installs Docker + Docker Compose on a fresh Ubuntu VPS
#    2. Clones the SE repo (dispatch branch)
#    3. Configures environment variables (prompts for keys)
#    4. Places Firebase service account JSON
#    5. Starts n8n + WhatsApp scraper containers
#    6. Prints the QR code for WhatsApp linking
#    7. Opens n8n at http://YOUR-VPS-IP:5678
#
#  PREREQUISITES:
#    - Fresh Ubuntu 22.04 or 24.04 VPS (4GB RAM minimum)
#    - Root or sudo access
#    - Ports 5678 (n8n) + 3000 (WhatsApp QR) open in firewall
#
#  USAGE:
#    ssh root@your-vps-ip
#    curl -fsSL https://raw.githubusercontent.com/ahmedfawzy8866/SE/dispatch/scripts/setup-vps.sh | bash
#    — OR —
#    scp this file to VPS, then: bash setup-vps.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Sierra Estates — VPS Setup                              ║${NC}"
echo -e "${BOLD}║   n8n + WhatsApp Bot on $10 VPS                           ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo bash setup-vps.sh${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1: Install Docker
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${YELLOW}Step 1/6: Installing Docker...${NC}"

if command -v docker &> /dev/null; then
  echo -e "${GREEN}  ✓ Docker already installed${NC}"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}  ✓ Docker installed${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2: Clone repo
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Step 2/6: Cloning SE repo...${NC}"

SE_DIR="/opt/sierra-estates"
if [ -d "$SE_DIR" ]; then
  echo -e "${GREEN}  ✓ Repo already exists at $SE_DIR${NC}"
  cd "$SE_DIR"
  git pull origin dispatch 2>/dev/null || true
else
  git clone -b dispatch https://github.com/ahmedfawzy8866/SE.git "$SE_DIR"
  cd "$SE_DIR"
  echo -e "${GREEN}  ✓ Repo cloned to $SE_DIR${NC}"
fi

cd "$SE_DIR/infra"

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 3: Configure environment
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Step 3/6: Configure environment${NC}"

if [ -f .env ]; then
  echo -e "${GREEN}  ✓ .env already exists (skipping)${NC}"
else
  cp .env.example .env

  echo ""
  echo -e "${BLUE}  Enter your configuration (press Enter to keep defaults):${NC}"
  echo ""

  read -p "  n8n admin password [ChangeMe!]: " N8N_PASS
  N8N_PASS=${N8N_PASS:-ChangeMe!}
  sed -i "s/N8N_BASIC_AUTH_PASSWORD=.*/N8N_BASIC_AUTH_PASSWORD=$N8N_PASS/" .env

  read -p "  VPS public IP or domain [localhost]: " VPS_IP
  VPS_IP=${VPS_IP:-localhost}
  sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=http://$VPS_IP:5678|" .env
  sed -i "s|N8N_EDITOR_BASE_URL=.*|N8N_EDITOR_BASE_URL=http://$VPS_IP:5678|" .env

  read -p "  Gemini API key (optional, press Enter to skip): " GEMINI_KEY
  if [ -n "$GEMINI_KEY" ]; then
    sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" .env
  fi

  read -p "  Firebase Project ID (optional): " FB_PROJECT
  if [ -n "$FB_PROJECT" ]; then
    sed -i "s/FIREBASE_PROJECT_ID=.*/FIREBASE_PROJECT_ID=$FB_PROJECT/" .env
  fi

  echo -e "${GREEN}  ✓ .env configured${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 4: Firebase service account
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Step 4/6: Firebase service account${NC}"

SECRETS_DIR="$SE_DIR/infra/secrets"
mkdir -p "$SECRETS_DIR"

if [ -f "$SECRETS_DIR/firebase-service-account.json" ]; then
  echo -e "${GREEN}  ✓ Service account already placed${NC}"
else
  echo -e "${BLUE}  Place your Firebase service account JSON:${NC}"
  echo -e "  1. Go to: Firebase Console → Project Settings → Service Accounts"
  echo -e "  2. Click 'Generate new private key' → download JSON"
  echo -e "  3. Upload it to this VPS:"
  echo -e "     scp ~/Downloads/service-account.json root@$VPS_IP:$SECRETS_DIR/firebase-service-account.json"
  echo ""
  read -p "  Have you uploaded the service account JSON? (y/n): " SA_UPLOADED
  if [[ "$SA_UPLOADED" != "y" && "$SA_UPLOADED" != "Y" ]]; then
    echo -e "${YELLOW}  ⚠ Skip for now — n8n won't be able to write to Firestore.${NC}"
    echo -e "${YELLOW}    Upload later and restart: docker compose restart n8n${NC}"
  else
    echo -e "${GREEN}  ✓ Service account confirmed${NC}"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 5: Start containers
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Step 5/6: Starting Docker containers...${NC}"

docker compose down 2>/dev/null || true
docker compose up -d --build

echo -e "${GREEN}  ✓ Containers started${NC}"

# Wait for n8n to be ready
echo -e "${YELLOW}  Waiting for n8n to start (30s)...${NC}"
sleep 30

# ═══════════════════════════════════════════════════════════════════════════
#  STEP 6: Print access info + WhatsApp QR
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}Step 6/6: Final verification${NC}"
echo ""

# Get VPS IP if not set
if [ "$VPS_IP" = "localhost" ]; then
  VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR-VPS-IP")
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Sierra Estates VPS is running!                        ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  n8n Dashboard:  http://$VPS_IP:5678${NC}"
echo -e "${GREEN}║  Login:          admin / (password you set)${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Container status:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  📱 To link WhatsApp:${NC}"
echo -e "${GREEN}║  1. View QR code: docker compose logs whatsapp-scraper | grep -A 20 'Scan this'${NC}"
echo -e "${GREEN}║  2. Open WhatsApp on your phone${NC}"
echo -e "${GREEN}║  3. Settings → Linked Devices → Link a device${NC}"
echo -e "${GREEN}║  4. Scan the QR code${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  📦 Import n8n workflows:${NC}"
echo -e "${GREEN}║  1. Open http://$VPS_IP:5678${NC}"
echo -e "${GREEN}║  2. Workflows → Add → Import from File${NC}"
echo -e "${GREEN}║  3. Import all 3 files from:${NC}"
echo -e "${GREEN}║     /opt/sierra-estates/infra/n8n-workflows/${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# Show WhatsApp QR if available
echo ""
echo -e "${YELLOW}WhatsApp QR Code (if available):${NC}"
docker compose logs whatsapp-scraper 2>/dev/null | grep -A 25 "Scan this QR" | tail -30 || echo "  (QR will appear here once bot connects)"
