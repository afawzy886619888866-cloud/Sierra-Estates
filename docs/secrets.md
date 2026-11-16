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
| `GOOGLE_GENAI_API_KEY` | V | no | Sierra 3.0 pipeline alias for the same Gemini key — read by `gemini-embedding-001` embeddings (`scripts/generate-supabase-embeddings.ts`, `/api/internal/rag-search`) and the Arabic listing formatter. Same value as `GOOGLE_AI_API_KEY`; set both names |
| `GOOGLE_CLOUD_LOCATION` | V | n/a | Region for Vertex (ADC/Workload Identity auth, no key) |

## Supabase

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | V | yes | Project API URL (host `gaxfqcietzoonlmatiot.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | V | no | **High-value.** Server-only writes (listings upsert, gazetteer sync, embeddings). Without it every write leg reports `unavailable` honestly — nothing silently degrades to a fake success |

## Rate-limiting

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | V | no | Distributed rate-limit counter. Optional — falls back to in-memory if unset |
| `UPSTASH_REDIS_REST_TOKEN` | V | no | Pairs with the URL above |

## Integrations

| Var | Where | Public? | Notes |
| --- | --- | --- | --- |
| `PROPERTY_FINDER_API_KEY` | V, GA | no | |
| `TELEGRAM_BOT_TOKEN` | V, FB, GA | no | High-priority alerts; also arms the Sierra 3.0 listing broadcast (`sendMediaGroup` → `@SierraEstatesNewCairo`) |
| `TELEGRAM_CHAT_ID` | V | no | **Public listings channel** (`@SierraEstatesNewCairo`). Broadcasts only — never PII |
| `TELEGRAM_ADMIN_CHAT_ID` | V | no | **Internal ops chat.** Access-request/approval alerts (Sierra 3.0). Must NOT equal `TELEGRAM_CHAT_ID` — staff PII never goes to the public channel |
| `TELEGRAM_ALERT_CHAT_ID` | V, FB, GA | no | Legacy alert chat (pre-3.0 paths) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | V | no | Inbound webhook verification |
| `TWILIO_ACCOUNT_SID` | V | no | **Pending** — WhatsApp outbound (see TODO.md) |
| `TWILIO_AUTH_TOKEN` | V | no | **Pending** — High-value |
| `WABA_NUMBER_1`..`WABA_NUMBER_4` | V | no | **Pending** — the 4 dedicated WhatsApp senders |
| `N8N_BASE_URL` / `N8N_API_KEY` | V | no | Workflow engine trigger |
| `GOOGLE_SHEETS_ID` / `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_KEY` | V, GA | no | Sheets ingestion |

---

## Arming the Sierra Estates 3.0 live pipeline

The 3.0 pipeline (Gemini RAG memory, Telegram broadcast + syndication,
access-approval alerts) degrades honestly until three Vercel secrets exist.
One-time arming:

```bash
pnpm link:vercel
vercel env add GOOGLE_GENAI_API_KEY production      # Gemini: embeddings + Arabic formatter
vercel env add TELEGRAM_BOT_TOKEN production        # @BotFather bot token
vercel env add SUPABASE_SERVICE_ROLE_KEY production # server-only service role
vercel env add TELEGRAM_ADMIN_CHAT_ID production    # internal ops chat (approval alerts)
vercel env add TELEGRAM_CHAT_ID production          # public listings channel @SierraEstatesNewCairo
pnpm deploy:prod                                   # rebuild with the secrets
```

`TELEGRAM_ADMIN_CHAT_ID` must be a chat the bot has actually seen — bots cannot
enumerate their chats. Open `https://t.me/<bot-username>`, press START (or
create an ops group and add the bot), then discover the chat id:

```bash
node scripts/discover-telegram-admin-chat.mjs       # prints the chat id + the
                                                    # verbatim vercel commands; REFUSES
                                                    # the public channel (staff PII)
```

Post-arm verification, in order:

```bash
pnpm live:status                          # ARMED/DEGRADED report; export SBR_SECRET_KEY
                                          # locally to probe the SBR-gated production route
pnpm embeddings:generate -- --dry-run     # capability pre-flight, zero writes
pnpm gazetteer:sync                       # arm map pins in public.compounds (35 entries)
pnpm embeddings:generate -- --continuous  # 768-dim vectors for every listing
curl -X POST https://sierra-estates.net/api/internal/run-harness \
  -H "x-sbr-secret-key: $SBR_SECRET_KEY"  # exercise NLP + AVM + RAG benchmarks
```

Until the secrets are live every service above reports its exact gap — skipped
broadcasts, `unavailable` upserts, `configured: false` capability flags — and
never fabricates success (§21).

`pnpm live:status` deep-probes beyond presence (§21: presence ≠ validity):

- **① RAG** — with `SBR_SECRET_KEY` exported it POSTs a one-word query to
  `/api/internal/rag-search`; only a 200 round-trip counts as ARMED. Two
  distinct honest failures:
  - *present but REJECTED* (e.g. an OAuth access token pasted instead of an
    API key) surfaces as DEGRADED with the server's exact 401 reason. Fix:
    `aistudio.google.com/apikey` → create key → replace the value of
    `GOOGLE_GENAI_API_KEY` in Vercel → redeploy.
  - *valid but quota-exhausted* — verified live 2026-10-17: the deployed
    `AQ.…`-format key AUTHENTICATES (new Google key format; it passes auth
    from Vercel's egress while geo-blocking operator regions) and the probe
    reported Google's own `[429] Please retry in 10h05m` free-tier window
    (1000 embeds/day). No key change fixes this — the window is real. Fix:
    wait for the reset (or move to a paid tier), then keep driving
    `scripts/drive-embeddings.py`, which surfaces the same window per batch.
- **② Telegram** — with `TELEGRAM_BOT_TOKEN` present locally it calls
  `getMe` (token validity) and `getChat` on `TELEGRAM_CHAT_ID` (bot ↔
  channel visibility). A valid token whose bot was never added to the
  channel reports DEGRADED with "add the bot as an ADMIN of the channel".

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
