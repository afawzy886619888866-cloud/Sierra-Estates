# LIVE ENVIRONMENT GATE — Phase B

```text
PHASE:   B — Live Environment Gate
STATUS:  COMPLETED (gate documented; per-dependency verdicts below)
DATE:    2026-09-29
```

Verdict vocabulary (no "assumed connected" allowed):

```text
CONNECTED              = independently verified working (live probe with real data)
CONFIGURED-NOT-VERIFIED= platform self-reports configured; independent operation NOT proven
NOT CONNECTED          = required credentials/config missing in the audited environment
UNKNOWN                = cannot be determined without external input
```

Probes were executed against the live production deployment
(`https://sierra-estates.net`) and gateway infrastructure. No credentials are
revealed anywhere in this document (only non-secret hostnames/URLs already
public in the repository).

---

## Database — Supabase

| Check | Verdict | Evidence |
|---|---|---|
| Service reachability | **CONNECTED** | `https://REDACTED-PROJECT.supabase.co` responds (project URL is public in `.env.example`); live `/api/health`: "Connected to Supabase PostgreSQL", latency 116–511 ms across probes. |
| Real data flows through it | **CONNECTED** | Public `/api/listings` returns 500 real rows from `public.listings` (master-inventory lineage codes `SE-RNT-*`/`INV-*`). |
| URL / publishable (anon) key | **CONFIGURED-NOT-VERIFIED (live)** / **NOT CONNECTED (audit env)** | Live app obviously holds them; this audit environment has none (0 relevant env vars present). |
| Service-role key | **NOT CONNECTED (audit env)** | Absent. Required for schema/migration/RLS verification (Phase D), inventory import (Phase C), admin ops. |
| Expected schema | **CONFIGURED-NOT-VERIFIED** | Canonical `supabase/schema.sql` (57+ tables, 126 RLS statements, 12 migrations) is repo-verified; live schema state not inspectable without service-role key. Migration mirror drift: app copy lacks `019`. |
| Migration state | **UNKNOWN** | Needs `POSTGRES_URL` / service-role + `apply-pending-migrations` against live. |

**Gate verdict: Supabase = CONNECTED (service + public data path) · admin-level access NOT CONNECTED in audit environment.**

---

## AI — Gemini / Google AI

| Check | Verdict | Evidence |
|---|---|---|
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | **CONFIGURED-NOT-VERIFIED (live)** / **NOT CONNECTED (audit env)** | Live `/api/health` reports `aiOrchestrator: configured, primaryModel: gemini-2.0-flash`; no independent generation was performed (no key here, and health "configured" is a config check, not an inference test). |
| Model configuration | **CONFIGURED-NOT-VERIFIED** | Self-reported `gemini-2.0-flash`; code: `lib/server/google-ai.ts`, `lib/ai/GoogleAIServiceImpl.ts`, `AI_PROVIDER` switch. |
| Server-side only | **CONNECTED (policy)** | `scripts/check-public-env-safety.mjs` PASS: no server creds browser-visible; secrets used only in server routes. |

**Gate verdict: AI = CONFIGURED-NOT-VERIFIED — a live inference smoke test (e.g. Stage-6 bot turn or `/api/health` AI probe) is required to upgrade to CONNECTED.**

---

## WhatsApp

Production topology (verified from code + live probes): **inbound = Meta
WhatsApp Cloud API webhook** (`/api/webhooks/whatsapp`, HMAC via
`WHATSAPP_APP_SECRET`); **outbound = Twilio-first → OpenWA/custom gateway →
simulation fallback** (`lib/server/twilio-client.ts`, queue
`public.whatsapp_queue` drained by cron).

| Check | Verdict | Evidence |
|---|---|---|
| OpenWA gateway host `18.232.148.172:3000` | **CONNECTED (host)** | HTTP 200 in 0.4 s — live OpenWA dashboard served. |
| Gateway session / QR auth state | **UNKNOWN** | Requires gateway `ADMIN_API_KEY` (correctly not exposed). |
| Meta Cloud API auth (`WHATSAPP_API_TOKEN`, `PHONE_NUMBER_ID`, `APP_SECRET`) | **NOT CONNECTED (audit env)** · **CONFIGURED-NOT-VERIFIED (live)** | Live health: `whatsapp.configured: true, webhookVerified: true, augustOwnersIngest: active`. No live message sent/received in this audit. |
| Inbound delivery | **CONFIGURED-NOT-VERIFIED** | Webhook verified per health; no live inbound message observed. |
| Outbound delivery | **CONFIGURED-NOT-VERIFIED** | Deep health: gateway `configured`, circuit breaker closed, retry policy active; no live outbound send performed. |
| Helpline fallback | **CONFIGURED** | `+201092048333` (public contact number, reported by deep health). |

**Gate verdict: WhatsApp = gateway host CONNECTED; end-to-end message delivery NOT VERIFIED (needs a live send/receive test with production numbers).**

---

## Telegram

| Check | Verdict | Evidence |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | **NOT CONNECTED (audit env)** · **CONFIGURED-NOT-VERIFIED (live)** | Live health: `telegram.configured: true, channelRelay: active`. No alert was triggered/tested from this audit. |

**Gate verdict: Telegram = CONFIGURED-NOT-VERIFIED — requires a live alert test.**

---

## Google (Calendar / Sheets)

| Check | Verdict | Evidence |
|---|---|---|
| Calendar credentials | **UNKNOWN** | No health component exposes calendar state; `GOOGLE_SERVICE_ACCOUNT_KEY` referenced by `lib/workflows.ts` and viewing flows; not present in audit env; not testable without it. |
| Sheets credentials | **CONFIGURED-NOT-VERIFIED (live)** | Live health: `excelSync: configured, mode: two-way-sync, status: ready` (backed by service account + `INVENTORY_SHEET_ID`/`MASTER_SHEET_ID`). No sync round-trip performed. |

**Gate verdict: Google Calendar = UNKNOWN (must be exercised in Phase J) · Sheets = CONFIGURED-NOT-VERIFIED.**

---

## Deployment — Vercel

| Check | Verdict | Evidence |
|---|---|---|
| Client deployment `sierra-estates.net` | **CONNECTED (Live)** | HTTP 200; `/api/health` healthy, `environment: production`, version 3.1.0. |
| Admin deployment `admin.sierra-estates.net` | **CONNECTED (Live)** | HTTP 200 — static no-build SPA (`deploy/`, separate Vercel project). |
| `VERCEL_TOKEN` / project IDs | **NOT CONNECTED (audit env)** | Absent here; deploy dispatch (`sync-vercel-env.js` targets client `prj_ieVcIcoeTtHndspXMzlE0cwLl89c` + admin project) cannot be driven from this environment. Project-ID drift vs root test expectations noted in ACTIVATION_BASELINE. |
| Environment variable stages (Vercel) | **CONFIGURED-NOT-VERIFIED** | Live app runs with its env (Supabase connected, gateway configured); full stage inventory not inspectable without `VERCEL_TOKEN`. |

---

## Summary matrix

| Dependency | Audit environment | Live production | Independent verification |
|---|---|---|---|
| Supabase (service + public data) | NOT CONNECTED | CONNECTED | ✅ health probe + real rows |
| Supabase (service-role/admin) | NOT CONNECTED | UNKNOWN | ❌ needs key |
| Gemini / Google AI | NOT CONFIGURED | CONFIGURED | ❌ needs live inference test |
| WhatsApp OpenWA gateway host | — (probed directly) | CONNECTED | ✅ HTTP 200 |
| WhatsApp E2E delivery | NOT CONNECTED | CONFIGURED | ❌ needs live send/receive |
| Telegram alerts | NOT CONFIGURED | CONFIGURED | ❌ needs live alert |
| Google Calendar | UNKNOWN | UNKNOWN | ❌ needs Phase J exercise |
| Google Sheets sync | NOT CONFIGURED | CONFIGURED | ❌ needs round-trip test |
| Vercel client site | — | CONNECTED (Live) | ✅ HTTP 200 + prod health |
| Vercel admin site | — | CONNECTED (Live) | ✅ HTTP 200 |
| Vercel API/token access | NOT CONNECTED | UNKNOWN | ❌ needs token |

---

## GATE

Phase B is **documented with evidence; no dependency is "assumed connected."**

**Hard-stop conditions triggered (plan §20) from this execution environment:**
Supabase service-role, Gemini, WhatsApp, Telegram, Google and Vercel
credentials are not available here. Per Rule D, Phases C–O are therefore
**BLOCKED from this environment** and must be executed where production
credentials exist (Vercel runtime, ops machine, or CI with secrets).

**External input required to unblock Phase C (Inventory Activation):**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon),
`SUPABASE_SERVICE_ROLE_KEY` (+ `SUPABASE_ACCESS_TOKEN` for schema apply), and
— for the verification outreach itself — WhatsApp outbound credentials and
Telegram/Gemini keys for bot/alert operation.
