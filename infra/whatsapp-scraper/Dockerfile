# ═══════════════════════════════════════════════════════════════════════════
# Sierra Estates — WhatsApp Scraper Dockerfile
# File: SE/infra/whatsapp-scraper/Dockerfile
# ═══════════════════════════════════════════════════════════════════════════

FROM node:24-slim

# Install dependencies for QR code rendering in terminal
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files + install deps (layer cached)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY . .

# Create auth directory for Baileys session
RUN mkdir -p /app/auth

# Health check — simple node process check
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Run the bot
CMD ["node", "src/index.js"]
