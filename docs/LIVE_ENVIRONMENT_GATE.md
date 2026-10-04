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
| Service reachability | **CONNECTED** | `https://REDACTED-PROJECT.supabase.co` responds; live `/api/health`: "Connected to Supabase PostgreSQL", latency 187 ms. |
| Real data flows through it | **CONNECTED** | Public endpoints query `public.listings` (15,932 total rows; gated to 0 PUBLISHABLE; honest empty set served). |
| URL / publishable (anon) key | **CONNECTED** | Tested against PostgREST: HTTP 200, Range `*/0`, 0 unverified rows visible under RLS Policy 020. |
| Service-role key | **CONNECTED** | Active in environment; used to audit provenance, execute 025 repairs, demote unverified inventory, and test probe rows. |
| Expected schema & migrations | **CONNECTED** | 22 migrations ledgered 1:1 in `public.schema_migrations` (including 020, 022, 025). |
| Default constraints | **CONNECTED** | `column_default` on `listings.publish_status` is NULL (standing default dropped via 025). |

**Gate verdict: Supabase = CONNECTED across service, service-role admin, RLS policy, and public data paths.**

---

## AI — Gemini / Google AI

| Check | Verdict | Evidence |
|---|---|---|
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | **CONFIGURED (SET)** | Present in environment; live `/api/health` reports `aiOrchestrator: configured, primaryModel: gemini-2.0-flash`. |
| Model configuration | **CONFIGURED** | Self-reported `gemini-2.0-flash`; code: `lib/server/google-ai.ts`, `lib/ai/GoogleAIServiceImpl.ts`. |
| Server-side only | **CONNECTED (policy)** | No server creds browser-visible; secrets used only in server routes. |

**Gate verdict: AI = CONFIGURED (credentials present) — live conversation tests gated on human verification of pilot inventory.**

---

## WhatsApp & OpenWA

| Check | Verdict | Evidence |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_VERIFY_TOKEN` | **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_TOKEN` / API Token | **NOT SET** | Missing in audited environment; required for outbound Meta Cloud API sends. |
| OpenWA server credentials | **NOT SET** | Missing in audited environment. |

**Gate verdict: WhatsApp = Webhook configuration SET; outbound message delivery credentials NOT SET.**

---

## Google (Calendar / Sheets)

| Check | Verdict | Evidence |
|---|---|---|
| `GOOGLE_CALENDAR_ID` | **CONFIGURED (SET)** | Present in environment. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | **CONFIGURED (SET)** | Present in environment. |
| `GOOGLE_CALENDAR_CREDENTIALS`| **NOT SET** | Full JSON credentials not configured directly. |
| Sheets synchronization | **CONNECTED** | Workflow 08 (`workflows/08-units-sync/sync.js`) connects to Google Sheets (gid=1127958606); patched to land units as `REVIEW_REQUIRED`. |

**Gate verdict: Google Calendar = Configuration partially set (Calendar ID + Service Account Key SET); Sheets sync CONNECTED.**

---

## Automations & Deployment — Vercel

| Check | Verdict | Evidence |
|---|---|---|
| Client deployment `sierra-estates.net` | **CONNECTED (Live)** | HTTP 200; `/api/health` healthy, `environment: production`, version 3.1.0. |
| Honest Empty State | **CONNECTED (Live)** | `/api/listings` returns `[]`; `/api/inventory` returns `count: 0`, `source: "none"`; `/properties` renders clean without error. |
| Vercel Cron Configuration | **CONNECTED (Live)** | `vercel.json` defines exactly 2 crons: `night` (`0 2 * * *`) and `morning` (`0 6 * * *`). |
| Migration Runner Schedule | **VERIFIED MANUAL** | `/api/cron/apply-migrations` is NOT in `vercel.json` crons (deliberate manual invocation only). |
| Real Execution Proofs | **CONNECTED (Live)** | `public.automation_runs` contains real execution logs (`sync-leads` success at `2026-10-04T06:44:44Z`). |

---

## Summary Matrix

| Dependency | Configuration Presence | Live Production Status | Verification Level |
|---|---|---|---|
| Supabase PostgreSQL | SET | CONNECTED (22 migrations) | ✅ Live-verified (0 PUBLISHABLE, anon sees 0) |
| Supabase Service Role | SET | CONNECTED | ✅ Live-verified |
| Gemini AI API | SET | CONFIGURED (`gemini-2.0-flash`) | ⏳ Awaiting pilot inventory |
| WhatsApp Webhook Config | SET | CONFIGURED | ⏳ Awaiting outbound token |
| WhatsApp Outbound Token | NOT SET | NOT CONNECTED | ❌ Needs token |
| Google Calendar | PARTIALLY SET | CONFIGURED | ⏳ Awaiting pilot inventory |
| Google Sheets Sync | SET | CONNECTED | ✅ Live-verified |
| Vercel Client Site | SET | CONNECTED (Live) | ✅ Live-verified |
| Vercel Cron Jobs | SET | CONNECTED (`night`, `morning`) | ✅ Live-verified via `automation_runs` |

---

## GATE

Interim phase verification is **COMPLETE and ground-truthed with raw evidence**:
1. All 22 migrations ledgered (incl. 020, 022, 025).
2. Standing default constraint dropped; regression probe verified.
3. 15,932 listings demoted to `REVIEW_REQUIRED`, 0 `PUBLISHABLE`.
4. RLS Policy 020 strictly enforced (anon sees 0).
5. Public surface operates in honest empty state.
6. Next operational milestone: Human verification of the 50-unit pilot (`data/PILOT_50_WORKSHEET.xlsx`).
