FROM node:22-bookworm-slim

# ─────────────────────────────────────────────────────────────────────────
# Sierra Estates — Workflow Runner Control Plane (runner.js)
# Docker home of the server-side scheduler that replaced the AWS EC2
# runner path (see infra/DOCKER-RUNNER-MIGRATION.md). Pure Node: no
# Chromium, no browser sandbox flags. The 8-line WhatsApp gateway it
# drives lives in the sibling RAG-station container; this image only
# spawns and supervises the workflows/ CLI scripts.
# ─────────────────────────────────────────────────────────────────────────

ENV NODE_ENV=production \
    TZ=Africa/Cairo \
    RUNNER_BIND=0.0.0.0 \
    RUNNER_PORT=2786

WORKDIR /app

# Dependencies first (layer cache): lockfile is committed, so `npm ci`
# gives reproducible installs (dev deps excluded).
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Runner + workflow sources + shared libraries (workflows/lib holds the
# gateway client, cron parser, state, supabase sync — same relative layout
# as on the host, so `require('../lib/...')` resolves unchanged).
COPY runner.js ./
COPY lib ./lib
COPY 01-whatsapp-scraper ./01-whatsapp-scraper
COPY 02-owner-search ./02-owner-search
COPY 03-owner-contact ./03-owner-contact
COPY 04-email-sender ./04-email-sender
COPY 05-unit-adder ./05-unit-adder
COPY 06-gateway-sentinel ./06-gateway-sentinel
COPY 07-daily-digest ./07-daily-digest
COPY 08-units-sync ./08-units-sync
COPY 09-owner-outreach ./09-owner-outreach
COPY 10-whatsapp-dispatch ./10-whatsapp-dispatch

# Run-state (overlap locks, last-run summaries) survives restarts via the
# compose volume mount at /app/.state.
RUN mkdir -p .state

# Optional Google service-account key file for sheet workflows — mount at
# run time, never bake it into the image.
VOLUME ["/app/.state"]

EXPOSE 2786

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:2786/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "runner.js"]
