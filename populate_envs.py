import secrets
import os

# Generate fallback secure secrets if not already defined
session_secret = secrets.token_hex(32)
sbr_secret = secrets.token_hex(32)
admin_api_key = secrets.token_hex(32)
cron_secret = secrets.token_hex(32)
tg_webhook_secret = secrets.token_hex(32)

env_content = f"""# =====================================================
# Sierra Estates — Consolidated Environment Configuration
# Automatically assembled from known project credentials
# =====================================================

# ─── Firebase Client SDK (Public) ───────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sierra-blu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-blu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sierra-blu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=941030513456
NEXT_PUBLIC_FIREBASE_APP_ID=1:941030513456:web:56209a1495d69f217086f5
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZP054BPJ8Q
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://sierra-blu-default-rtdb.firebaseio.com

# ─── Firebase Admin SDK (Server) ───────────────────────────
FIREBASE_PROJECT_ID=sierra-blu
FIREBASE_CLIENT_EMAIL=a.fawzy8866@gmail.com
# FIREBASE_PRIVATE_KEY=
# FIREBASE_SERVICE_ACCOUNT_JSON=

# ─── Vercel Deployment & Organization ───────────────────────
VERCEL_ORG_ID=team_UvdJ5ezVTaqEKyhqZ5QVqOKJ
CLIENT_VERCEL_PROJECT_ID=prj_ieVcIcoeTtHndspXMzlE0cwLl89c
ADMIN_VERCEL_PROJECT_ID=prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA
MAINTAINER_EMAIL=a.fawzy8866@gmail.com

# ─── Internal Service Secrets (Generated) ───────────────────
SESSION_SECRET={session_secret}
SBR_SECRET_KEY={sbr_secret}
ADMIN_API_KEY={admin_api_key}
CRON_SECRET={cron_secret}
TELEGRAM_WEBHOOK_SECRET={tg_webhook_secret}
ANTIGRAVITY_API_KEY=ag-dev-master-key

# ─── Property Finder Enterprise API ─────────────────────────
PROPERTY_FINDER_API_KEY=REDACTED_PROPERTY_FINDER_API_KEY
PROPERTY_FINDER_API_SECRET=REDACTED_PROPERTY_FINDER_API_SECR
PROPERTY_FINDER_AUTH_TOKEN=REDACTED_PROPERTY_FINDER_JWT_TOKE
PROPERTY_FINDER_API_GATEWAY=https://atlas.propertyfinder.com
PF_API_KEY=REDACTED_PROPERTY_FINDER_JWT_TOKE
PF_API_SECRET=l9asZRM5xzKUbRCZVo6C6Pusj0kHyMzn
PF_COMPANY_ID=SB-EG-2024-001

# ─── AI / LLM Keys ─────────────────────────────────────────
DEEPSEEK_API_KEY=REDACTED_SK_KEY
DEEPSEEK_API_URL=https://api.deepseek.com
GOOGLE_CLOUD_PROJECT=sierra-blu
GOOGLE_CLOUD_LOCATION=europe-west1
# GOOGLE_AI_API_KEY=
# GEMINI_API_KEY=

# ─── WhatsApp & Meta Cloud API ──────────────────────────────
WHATSAPP_API_TOKEN=REDACTED_WHATSAPP_API_TOKEN
WHATSAPP_META_TOKEN=REDACTED_WHATSAPP_API_TOKEN
WHATSAPP_VERIFY_TOKEN=sierra-verify-webhook-token
BRANDING_TAG=Sierra Estates Realty

# ─── Airtable ───────────────────────────────────────────────
AIRTABLE_BASE_ID=appjzMo3cndE0DjXu
AIRTABLE_TABLE_NAME=Units

# ─── Routing & Application URLs ─────────────────────────────
NEXT_PUBLIC_SITE_URL=https://sierra-estates.net
NEXT_PUBLIC_APP_URL=https://sierra-estates.net
NEXT_PUBLIC_CLIENT_URL=https://sierra-estates.net
NEXT_PUBLIC_ADMIN_URL=https://admin.sierra-estates.net
CLIENT_HOST=sierra-estates.net
ADMIN_HOST=admin.sierra-estates.net
COOKIE_DOMAIN=.sierra-estates.net
NEXT_PUBLIC_DEFAULT_LOCALE=en
ALLOWED_ORIGINS=https://sierra-estates.net,https://admin.sierra-estates.net,http://localhost:3000,http://localhost:8000
OPENMEMORY_URL=http://localhost:8080
PYTHON_API_URL=http://localhost:8000

# ─── AI Orchestrator ────────────────────────────────────────
ORCHESTRATOR_URL=http://127.0.0.1:3000
NEXT_PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000
ORCHESTRATOR_TOKEN=sierra-orchestrator-dev-token-v3
PUBSUB_TOPIC=ai.recommendations
PROPERTYFINDER_KEY=pf-dev-sync-key

# ─── AWS Cloud ──────────────────────────────────────────────
AWS_REGION=us-east-1

# ─── n8n Automation Engine ──────────────────────────────────
N8N_BASE_URL=http://localhost:5678

# ─── Admin Bootstrap Credentials ────────────────────────────
ADMIN_BOOTSTRAP_EMAIL=admin@sierra-estates.net
ADMIN_BOOTSTRAP_PASSWORD=AdminSierra2026!
"""

# Write to apps/sierra-estates-realty/.env.local
with open('apps/sierra-estates-realty/.env.local', 'w', encoding='utf-8') as f:
    f.write(env_content)

# Write to root .env.local
with open('.env.local', 'w', encoding='utf-8') as f:
    f.write(env_content)

# Write to apps/api/.env
api_env_content = f"""# Sierra Estates Python API Configuration
LOG_LEVEL=INFO
ALLOWED_ORIGINS=*
PROPERTY_FINDER_API_GATEWAY=https://atlas.propertyfinder.com
PROPERTY_FINDER_API_KEY=REDACTED_PROPERTY_FINDER_API_KEY
PROPERTY_FINDER_API_SECRET=REDACTED_PROPERTY_FINDER_API_SECR
DEEPSEEK_API_KEY=REDACTED_SK_KEY
FIREBASE_PROJECT_ID=sierra-blu
# HUBSPOT_ACCESS_TOKEN=
"""
with open('apps/api/.env', 'w', encoding='utf-8') as f:
    f.write(api_env_content)

# Write to workflows/.env
workflows_env_content = f"""# External Workflows Configuration
BROKER_INBOX_SHEET_ID=1XG21rZqfG3d_sample_sheet
PROPERTY_FINDER_API_BASE=https://atlas.propertyfinder.com
PROPERTY_FINDER_JWT_TOKEN=REDACTED_PROPERTY_FINDER_JWT_TOKE
PROPERTY_FINDER_COMPANY_ID=SB-EG-2024-001
WHATSAPP_API_URL=REDACTED_WHATSAPP_API_URL
WHATSAPP_API_TOKEN=REDACTED_WHATSAPP_API_TOKEN
FIREBASE_PROJECT_ID=sierra-blu
AWS_REGION=us-east-1
LOG_LEVEL=info
NODE_ENV=production
"""
with open('workflows/.env', 'w', encoding='utf-8') as f:
    f.write(workflows_env_content)

print("Environment files populated successfully.")
