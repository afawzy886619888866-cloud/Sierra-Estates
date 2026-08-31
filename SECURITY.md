# Security Hardening Guide — Sierra Estates

**Status:** Production security checklist for sierra-estates.net.  
**Last Updated:** 2026-07-03  
**Responsible:** DevOps / Security team  

---

## Overview

This document outlines security measures already implemented and required setup steps for production deployment of Sierra Estates (luxury PropTech platform).

### Security Measures Implemented

- **Rate Limiting** — Public endpoints (`/api/leads`, `/api/listings`, `/api/leads/request-viewing`) rate-limited via Upstash Redis or in-memory fallback
- **API Key Restrictions** — Firebase API key scoped to specific APIs and referrer origins
- **Telegram Webhook Secret** — Token validation on all incoming bot messages
- **Admin Authentication** — Role-based access control via Firestore (users/{uid}.role)
- **Admin SDK Auth Guard** — Server-side API routes protected via `verifyAdminRequest` and `verifyRequest` functions

---

## 1. Firebase API Key Hardening

### Current Setup

The Firebase Web API key is intentionally public (part of the client SDK configuration). It is:

- **NOT** a service account key
- **NOT** a user token  
- **Identifies** the Firebase project, not an individual user or admin

### Required Setup in Google Cloud Console

1. **Restrict API usage** — In Google Cloud Console, go to **APIs & Services > Credentials > API key (sierra-blu)**:
   - Click the key, then **"API restrictions"**
   - **Restrict to:**
     - Cloud Firestore API
     - Firebase Authentication API
     - Cloud Storage API
   - Click **Save**

2. **Add HTTP referrer restrictions** — In the same credentials panel:
   - Click **"Application restrictions"**
   - Select **"HTTP referrers (web sites)"**
   - Add these origins:

     ```text
     https://sierra-estates.net
     https://sierra-estates.net/*
     https://*.sierra-estates.net
     https://admin.sierra-estates.net
     https://admin.sierra-estates.net/*
     ```

   - Click **Save**

3. **Verify no sensitive operations are exposed** — The API key cannot:
   - Create or delete service accounts
   - Modify IAM policies
   - Access other Google Cloud projects
   - Perform data deletion at scale

### Firestore Security Rules

Security rules enforce that only authenticated users with `role: 'admin'` or `role: 'manager'` can write to protected collections:

- **Stakeholders (leads):** Read/write restricted to staff (`role` in ['admin', 'manager'])
- **Units (listings):** Read open (public), write restricted to admin
- **Admin operations:** Fully restricted to admin users

See `firestore.rules` for the authoritative ruleset.

---

## 2. API Authentication & Authorization

### Public Endpoints (Rate-Limited)

| Endpoint | Method | Rate Limit | Auth |
| ---------- | -------- | ----------- | ------ |
| `/api/listings` | GET | 30 req/min | None (public) |
| `/api/leads` | POST | 30 req/min | None (public) + Zod validation |
| `/api/leads/request-viewing` | POST | 30 req/min | None (public) + Zod validation |

**Rate Limit Details:**

- Window: 60 seconds
- Max requests: 30 per IP per window
- Backend: Upstash Redis (distributed) with in-memory fallback
- Config: `lib/server/rate-limit.ts`

### Admin-Protected Endpoints

| Endpoint | Method | Auth Check | Required Role |
| ---------- | -------- | ----------- | -- |
| `/api/admin/*` | All | `verifyAdminRequest` | admin |
| `/api/viewing-requests` | GET | `verifyAdminRequest` | admin |
| `/api/concierge/send-whatsapp` | POST | `verifyAdminRequest` | admin |
| `/api/telegram/setup` | POST | `verifyAdminRequest` | admin |
| `/api/wealth/roi` | POST | `verifyAdminRequest` | admin |

**Authentication Methods:**

1. **Firebase Bearer Token** — Pass user's Firebase ID token in `Authorization: Bearer <token>`
   - Header is verified server-side via `verifyAdminRequest`
   - User role is read from Firestore `users/{uid}.role`

2. **Service/Cron Secret Key** — Pass in `X-SBR-SECRET-KEY` header
   - Accepted by `verifyRequest` (less restrictive)
   - Used for internal service calls and GitHub Actions workflows
   - Value: `SBR_SECRET_KEY` env var

See `lib/server/auth-guard.ts` for implementation.

### Webhook Endpoints

| Endpoint | Method | Secret Header | Source |
| ---------- | -------- | --- | --- |
| `/api/telegram/webhook` | POST | `X-Telegram-Bot-Api-Secret-Token` | Telegram |
| `/api/whatsapp/webhook` | POST | Conditional `X-SBR-SECRET-KEY` | Meta Cloud API |

**Telegram Webhook Secret:**

- Must be registered when setting up the bot webhook with Telegram's `setWebhook` API
- Include the `secret_token` parameter: `curl https://api.telegram.org/botTOKEN/setWebhook -d "url=https://sierra-estates.net/api/telegram/webhook&secret_token=YOUR_SECRET"`
- Required env var: `TELEGRAM_WEBHOOK_SECRET` (already in `.env.example`)

---

## 3. Telegram Webhook Setup

### Prerequisites

1. **Telegram Bot Token** — Create a bot via BotFather (@BotFather on Telegram):
   - Chat with @BotFather
   - Send `/newbot`, provide a name and username
   - Save the token in `TELEGRAM_BOT_TOKEN`

2. **Generate Webhook Secret** — Create a strong random token:

   ```bash
   openssl rand -hex 32
   # e.g., 9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
   ```

   - Save in `TELEGRAM_WEBHOOK_SECRET`

### Registering the Webhook

Once the app is deployed and accessible at `sierra-estates.net`:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://sierra-estates.net/api/telegram/webhook\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"
  }"
```

Expected response:

```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### Webhook Secret Validation

The route `app/api/telegram/webhook/route.ts` validates the header on every POST:

```typescript
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (webhookSecret && req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
  return NextResponse.json({ ok: false, error: 'Invalid webhook secret' }, { status: 401 });
}
```

**Note:** Existing deployments without `TELEGRAM_WEBHOOK_SECRET` set will continue to accept unauthenticated requests (backward compatible). Once the secret is configured and the webhook re-registered, only requests with the matching secret are accepted.

---

## 4. Firebase App Check (Recommended Enhancement)

### Status

App Check is **not yet enabled** but is recommended for production to prevent abuse of Firebase SDKs by malicious clients.

### Implementation Steps

1. **Enable reCAPTCHA v3 in Google Cloud Console:**
   - Go to **Security > App Check**
   - Create a new reCAPTCHA v3 provider
   - Save the **Project ID** and **Site Key**

2. **Configure Firestore Rules to require App Check:**
   - In `firestore.rules`, add to protected collections:

     ```javascript
     allow read, write: if request.auth != null && request.appCheck.token != null;
     ```

3. **Wire into Client SDK** (`apps/sierra-estates-realty/lib/firebase.ts`):

   ```typescript
   import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
   
   const appCheck = initializeAppCheck(firebaseApp, {
     provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
     isTokenAutoRefreshEnabled: true,
   });
   ```

4. **Set up environment variables:**
   - Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to `.env.example` and Vercel

See `docs/FIREBASE_APPCHECK_SETUP.md` for the detailed setup guide.

---

## 5. Database & Storage Security

### Firestore Rules

- **Public Read:** Listings (units collection) readable by all
- **Staff Write:** Stakeholders, viewing requests, concierge selections writable only by users with `role` in ['admin', 'manager']
- **Service Account:** Admin SDK bypasses rules — used only for trusted backend operations

**File:** `firestore.rules`  
**Deploy:** `pnpm deploy:rules`

### Storage Rules

- **Listings Images:** Public read, admin-only upload
- **Admin Uploads:** Private, accessible only to the authenticated uploader or admins

**File:** `storage.rules`  
**Deploy:** `pnpm deploy:rules`

### Access Control

Users are authenticated via Firebase Auth:

- Email + password (staff/admin logins)
- Role assignment stored in `users/{uid}.role` (set via Firestore Admin SDK only)

---

## 6. Secret Management

### Environment Variables

**Server-side only (NEVER in NEXT_PUBLIC_*):**

- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service account)
- `SBR_SECRET_KEY` (internal service secret)
- `CRON_SECRET` (GitHub Actions secret)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- `WHATSAPP_API_TOKEN`, `TWILIO_AUTH_TOKEN`
- `GOOGLE_AI_API_KEY`, `ARIZE_API_KEY`
- All database connection strings

**Client-safe (NEXT_PUBLIC_*):**

- `NEXT_PUBLIC_FIREBASE_API_KEY` (identifies project, not a user)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `PROJECT_ID`, etc.
- `NEXT_PUBLIC_MAPBOX_TOKEN` (if read-only)
- `NEXT_PUBLIC_APP_URL` (site URL)

**Vercel Environment Setup:**

1. Go to **Project Settings > Environment Variables**
2. Add all secrets from `.env.local`
3. Select **Production, Preview, Development** as appropriate
4. Mark sensitive vars as **Sensitive** (encrypted at rest)

### Rotating Secrets

1. **Firebase API Key:**
   - Create new key in Google Cloud Console
   - Update `NEXT_PUBLIC_FIREBASE_API_KEY` in Vercel
   - Trigger a new Vercel deployment
   - Delete the old key

2. **Service Account Key:**
   - Generate new key in Google Cloud Console > Service Accounts
   - Update `FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL` in Vercel
   - Deploy
   - Delete the old key

3. **Telegram/WhatsApp Tokens:**
   - Rotate in the respective provider dashboards
   - Update env vars in Vercel
   - Deploy

4. **SBR_SECRET_KEY (internal):**
   - Generate new value: `openssl rand -hex 32`
   - Update in GitHub repo secrets and Vercel
   - Restart all deployments

---

## 7. Network Security

### CORS

The app enforces CORS headers for cross-origin requests. Allowed origins are configurable:

```typescript
// lib/server/cors.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
```

**Set in Vercel:**

```env
ALLOWED_ORIGINS=https://sierra-estates.net,https://admin.sierra-estates.net
```

### HTTPS Enforcement

- All production domains must use HTTPS (Vercel auto-enforces)
- Mixed content (HTTP on HTTPS page) is blocked
- HSTS headers recommended (configure in `vercel.json`)

### CSP Headers

Add to `vercel.json` to prevent XSS and injection attacks:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

---

## 8. Logging & Monitoring

### Structured Logging

The app uses **Pino** for structured, production-grade logging:

```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId, email });
logger.error('Database error', error);
logger.warn('Rate limit approaching', { ip, count });
```

**Configuration:** `lib/logger.ts`  
**Log Level:** Controlled by `LOG_LEVEL` env var (default: `info`)

### Monitoring

1. **Vercel Logs** — Real-time function/error logs at vercel.com/dashboard
2. **Firebase Console** — Monitor functions, storage, Firestore queries
3. **OpenTelemetry + Arize** — Distributed tracing (optional, configured via `ARIZE_SPACE_ID`)

### Error Alerting

- Telegram bot receives high-priority errors (configured in error handlers)
- GitHub Actions workflows monitor scheduled job failures
- Vercel alerts on deployment failures

---

## 9. Checklist for Production Deployment

- [ ] **Firebase API Key Restricted** — API usage + HTTP referrers set in Google Cloud
- [ ] **Telegram Webhook Secret Registered** — `setWebhook` called with `secret_token`
- [ ] **Environment Variables in Vercel** — All secrets from `.env.local` added as **Sensitive**
- [ ] **Firestore Rules Deployed** — `pnpm deploy:rules` run and verified
- [ ] **Storage Rules Deployed** — Image upload restrictions enforced
- [ ] **CORS Origins Configured** — `ALLOWED_ORIGINS` set in Vercel
- [ ] **Rate Limiting Verified** — Test `/api/leads` with >30 rapid requests in 60s
- [ ] **Admin Auth Tested** — Login flow works, role-based access enforced
- [ ] **SSL/TLS Certificate Valid** — HTTPS working on both domains
- [ ] **Secrets NOT in Code** — No API keys in git history (use `git log --all --source --full-history -- '<file>' | grep -i key` to check)
- [ ] **Logging Configured** — `LOG_LEVEL` set to `info` or `warn` in production
- [ ] **Backup & DR Plan** — Firestore backups enabled, recovery tested

---

## 10. Incident Response

### Rate Limit Abuse

If `/api/leads` is being flooded:

1. Check Vercel logs for IP addresses
2. Temporarily reduce `maxRequests` in `lib/server/rate-limit.ts`
3. If Upstash Redis is down, the limiter falls back to in-memory (see logs)
4. Consider adding IP-level blocking at Vercel (via `vercel.json` redirects)

### Unauthorized API Access

If admin endpoints are being probed:

1. Verify no old API keys are exposed (Google Cloud console)
2. Rotate `SBR_SECRET_KEY` if it was exposed
3. Check Firestore rules are enforcing role checks
4. Review Firebase Authentication user roles

### Firebase Project Compromise

If credentials are leaked:

1. **Immediately rotate the service account key** (new key in Google Cloud > Service Accounts)
2. Delete the compromised key
3. Rotate `FIREBASE_PRIVATE_KEY` in Vercel
4. Re-deploy all applications
5. Check Firestore audit logs for unauthorized access

---

## 11. References

- **Firebase Security Best Practices:** <https://firebase.google.com/docs/rules>
- **OWASP Top 10:** <https://owasp.org/www-project-top-ten/>
- **Vercel Security:** <https://vercel.com/docs/concepts/analytics/security>
- **Rate Limiting Strategy:** <https://tools.ietf.org/html/draft-polli-ratelimit-headers-07>

---

## Contacts & Escalation

- **Security Issues:** Report to <a.fawzy8866@gmail.com>
- **Emergency:** Telegram bot (@SierraEstatesBot) alerts on-call team
- **Infrastructure:** Vercel dashboard, Google Cloud Console
