#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — Supabase Setup Script
# File: SE/scripts/setup-supabase.sh
# ═══════════════════════════════════════════════════════════════════════════
#
#  USAGE:
#    1. Create a Supabase project at https://supabase.com
#    2. Run: ./scripts/setup-supabase.sh
#    3. Paste your Project URL + anon key when prompted
#    4. The script will:
#       - Run schema.sql (creates 8 tables + RLS)
#       - Update supabase-config.js with your keys
#       - Enable Supabase (flips SIERRA_SUPABASE_ENABLED = true)
#       - Open seed-supabase.html in your browser to populate data
#
#  PREREQUISITES:
#    - Supabase project created (free tier works)
#    - `supabase` CLI installed:  npm install -g supabase
#      OR just use the web SQL Editor (script will guide you)
# ═══════════════════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Sierra Estates — Supabase Setup                         ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Collect credentials ──
echo -e "${YELLOW}Step 1: Enter your Supabase credentials${NC}"
echo -e "  (Find these at: Supabase Dashboard → Project Settings → API)"
echo ""

read -p "Project URL (e.g. https://abcd1234.supabase.co): " SUPABASE_URL
read -p "Anon public key (eyJhbGci...): " SUPABASE_ANON_KEY

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo -e "${RED}✗ Error: Both URL and anon key are required.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Credentials received${NC}"

# ── Step 2: Run schema ──
echo ""
echo -e "${YELLOW}Step 2: Run the database schema${NC}"
echo -e "  The schema creates 8 tables + RLS policies + indexes + realtime."
echo ""
echo -e "  ${BOLD}Option A:${NC} If you have supabase CLI installed:"
echo -e "    supabase db execute --project-ref <ref> < schema.sql"
echo ""
echo -e "  ${BOLD}Option B (recommended):${NC} Use the Supabase Web SQL Editor:"
echo -e "    1. Open: ${SUPABASE_URL}/project/default/sql/new"
echo -e "    2. Copy the contents of: infra/schema.sql"
echo -e "    3. Paste into the SQL Editor"
echo -e "    4. Click 'Run'"
echo ""
read -p "Have you run the schema? (y/n): " RAN_SCHEMA
if [[ "$RAN_SCHEMA" != "y" && "$RAN_SCHEMA" != "Y" ]]; then
  echo -e "${YELLOW}Please run the schema first, then re-run this script.${NC}"
  exit 0
fi
echo -e "${GREEN}✓ Schema confirmed${NC}"

# ── Step 3: Update config file ──
echo ""
echo -e "${YELLOW}Step 3: Updating supabase-config.js...${NC}"

CONFIG_FILE="infra/supabase-config.js"
if [ ! -f "$CONFIG_FILE" ]; then
  CONFIG_FILE="supabase-config.js"
fi

if [ -f "$CONFIG_FILE" ]; then
  # Replace placeholder values
  sed -i.bak "s|url:.*\"https://YOUR-PROJECT-ID.supabase.co\"|url: \"$SUPABASE_URL\"|g" "$CONFIG_FILE"
  sed -i.bak "s|anonKey:.*\"PASTE-YOUR-ANON-PUBLIC-KEY-HERE\"|anonKey: \"$SUPABASE_ANON_KEY\"|g" "$CONFIG_FILE"
  sed -i.bak "s|SIERRA_SUPABASE_ENABLED = false|SIERRA_SUPABASE_ENABLED = true|g" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  echo -e "${GREEN}✓ Updated $CONFIG_FILE${NC}"
  echo -e "  URL: $SUPABASE_URL"
  echo -e "  Key: ${SUPABASE_ANON_KEY:0:30}..."
  echo -e "  Enabled: true"
else
  echo -e "${RED}✗ Config file not found. Creating new one...${NC}"
  cat > "$CONFIG_FILE" << EOF
window.SIERRA_SUPABASE_CONFIG = {
  url: "$SUPABASE_URL",
  anonKey: "$SUPABASE_ANON_KEY"
};
window.SIERRA_SUPABASE_ENABLED = true;
EOF
  echo -e "${GREEN}✓ Created $CONFIG_FILE${NC}"
fi

# ── Step 4: Verify connection ──
echo ""
echo -e "${YELLOW}Step 4: Verify connection${NC}"
echo -e "  Open this URL in your browser to test:"
echo -e "  ${BOLD}file://$(pwd)/infra/seed-supabase.html${NC}"
echo -e "  (or: https://ahmedfawzy8866.github.io/SE/seed-supabase.html)"
echo ""
echo -e "  You should see: 'Connected to Supabase: $SUPABASE_URL'"
echo -e "  Then click 'Seed Supabase Now' to populate 52 compounds + listings."
echo ""

# ── Step 5: Create admin user instructions ──
echo -e "${YELLOW}Step 5: Create your admin user${NC}"
echo -e "  After seeding, create an admin user:"
echo -e "  1. Go to: ${SUPABASE_URL}/project/default/auth/users"
echo -e "  2. Click 'Add user' → fill email + password"
echo -e "  3. Copy the user's UID"
echo -e "  4. Go to SQL Editor and run:"
echo -e ""
echo -e "     INSERT INTO users (id, email, name, role)"
echo -e "     VALUES ('YOUR-UID', 'your@email.com', 'Ahmed', 'admin');"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Supabase setup complete!                              ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Next: Seed the database via seed-supabase.html          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
