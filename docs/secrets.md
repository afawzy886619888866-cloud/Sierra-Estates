# Secrets & Credentials Inventory

> **This file is a TEMPLATE. It must NEVER contain real secret values.**
>
> To record actual values for your own use, copy this file to
> `docs/secrets.local.md` (gitignored) and fill it in there:
>
> ```bash
> cp docs/secrets.md docs/secrets.local.md
> ```
>
> Real secrets live in **Vercel** (web app), **Firebase / Google Secret Manager**
> (Cloud Functions), and **GitHub Actions secrets** (scheduled workflows) — never
> in git. This file just tracks *what* must be set, *where*, and *who owns rotation*.

Legend — **Where**: `V` = Vercel project env, `FB` = Firebase Functions secrets,
`GA` = GitHub Actions repo secrets, `local` = `.env.local` only.
**Public?**: `NEXT_PUBLIC_*` vars ship to the browser and are not secret (but the
Firebase web API key should still be restricted in Google Cloud Console).

## Firebase

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | V, local | yes | Restrict by HTTP referrer + API in GCP console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | V, local | yes | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | V, local | yes | `sierra-blu` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | V, local | yes | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | V, local | yes | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | V, local | yes | |
| `FIREBASE_PROJECT_ID` | V, FB | no | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | V, FB | no | Service-account email |
| `FIREBASE_PRIVATE_KEY` | V, FB | no | **High-value.** Service-account private key (newline-escaped) |

## Internal / Auth

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `SE_SECRET_KEY` | V, FB, GA | no | Shared secret for cron/webhook callers (`verifyRequest`). Some older code/docs call this `SBR_SECRET_KEY` — reconcile before relying on it |
| `CRON_SECRET` | V | no | Guards scheduled route invocations |

## AI

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `GOOGLE_AI_API_KEY` | V, FB | no | Gemini. Without it, `WhatsAppParserService` throws ("Neural parsing disabled") |
| `GOOGLE_CLOUD_LOCATION` | V | n/a | Region for Vertex (ADC/Workload Identity auth, no key) |

## Rate-limiting

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | V | no | Distributed rate-limit counter. Optional — falls back to in-memory if unset |
| `UPSTASH_REDIS_REST_TOKEN` | V | no | Pairs with the URL above |

## Integrations

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `PROPERTY_FINDER_API_KEY` | V, GA | no | |
| `TELEGRAM_BOT_TOKEN` | V, FB, GA | no | High-priority alerts |
| `TELEGRAM_ALERT_CHAT_ID` | V, FB, GA | no | |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | V | no | Inbound webhook verification |
| `TWILIO_ACCOUNT_SID` | V | no | **Pending** — WhatsApp outbound (see TODO.md) |
| `TWILIO_AUTH_TOKEN` | V | no | **Pending** — High-value |
| `WABA_NUMBER_1`..`WABA_NUMBER_4` | V | no | **Pending** — the 4 dedicated WhatsApp senders |
| `N8N_BASE_URL` / `N8N_API_KEY` | V | no | Workflow engine trigger |
| `GOOGLE_SHEETS_ID` / `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_KEY` | V, GA | no | Sheets ingestion |

---

## Quarterly Rotation Calendar

Rotate high-value secrets every quarter. After rotating, update the value in
**every** listed location (V / FB / GA) and redeploy so the new value takes effect.
Record completion dates in your gitignored `docs/secrets.local.md` copy, not here.

**Rotation dates (next 12 months from project baseline 2026-06-21):**

| Quarter | Date | Status |
| --- | --- | --- |
| Q3 2026 | 2026-09-21 | ☐ pending |
| Q4 2026 | 2026-12-21 | ☐ pending |
| Q1 2027 | 2027-03-21 | ☐ pending |
| Q2 2027 | 2027-06-21 | ☐ pending |

**Rotate each quarter (highest-value first):**

1. `FIREBASE_PRIVATE_KEY` — generate a new service-account key in the Firebase
   console, update V + FB, then delete the old key from GCP IAM.
2. `TWILIO_AUTH_TOKEN` — roll in the Twilio console (once Twilio is wired).
3. `SE_SECRET_KEY` / `CRON_SECRET` — `openssl rand -hex 32`; update V + FB + GA together.
4. `GOOGLE_AI_API_KEY` — regenerate in Google AI Studio / GCP.
5. `TELEGRAM_BOT_TOKEN` — `/revoke` via @BotFather, update everywhere.
6. `UPSTASH_REDIS_REST_TOKEN` — roll in the Upstash console.

**On suspected exposure (any time):** rotate the affected secret immediately,
don't wait for the quarterly date, and audit access logs for the exposed window.

> To get calendar reminders for these dates, you can ask Claude Code to set up a
> recurring `/schedule` routine, or add the four dates above to your own calendar.
