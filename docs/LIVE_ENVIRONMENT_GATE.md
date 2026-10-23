# LIVE ENVIRONMENT GATE — Phase B & Interim Verification

```text
PHASE:   B — Live Environment Gate & Interim Verification
STATUS:  LIVE-VERIFIED (gate documented with raw evidence)
DATE:    2026-10-05
```

Verdict vocabulary (no "assumed connected" allowed):

```text
CONNECTED              = independently verified working (live probe with real data)
CONFIGURED-NOT-VERIFIED= platform self-reports configured; independent operation NOT proven
NOT CONNECTED          = required credentials/config missing in the audited environment
UNKNOWN                = cannot be determined without external input
```

Probes were executed against the live production deployment
(`https://sierra-estates.net`), Supabase PostgreSQL (`gaxfqcietzoonlmatiot.supabase.co`),
and automation runners. No credentials are revealed anywhere in this document.

---

## Database — Supabase

| Check | Verdict | Evidence |
|---|---|---|
| Service reachability | **CONNECTED** | `https://gaxfqcietzoonlmatiot.supabase.co` responds; live `/api/health`: "Connected to Supabase PostgreSQL", latency 277 ms. |
| Real data flows through it | **CONNECTED** | Public endpoints query `public.listings` (15,994 total rows; gated to 0 PUBLISHABLE, 15,994 REVIEW_REQUIRED; honest empty set served). |
| URL / publishable (anon) key | **CONNECTED** | Tested against PostgREST & app: HTTP 200, 0 unverified rows visible under RLS Policy 020. |
| Service-role key | **CONNECTED** | Active in environment; used to audit provenance, execute 025 repairs, demote unverified inventory, and test probe rows. |
| Expected schema & migrations | **CONNECTED** | 22 migrations ledgered 1:1 in `public.schema_migrations` (including 020, 022, 025). |
| Default constraints | **CONNECTED** | `column_default` on `listings.publish_status` is NULL (standing default dropped via 025). |

### Mechanism & Evidence: The +177 Listings Growth (Resolved)

- **Baseline count**: 15,754 listings on 2026-09-28.
- **Session growth**: Observed at 15,932 (+177) during Phase 2 mid-run, completed at 15,994 (+240 net additions).
- **Ingestion process**: Workflow 08 (`workflows/08-units-sync/sync.js`) executed at `2026-10-04T15:07:29.211Z` to `15:07:32.068Z`. It fetched 324 rows from Google Sheets tab `gid=1127958606` via gviz CSV export, upserting 240 valid units into `public.listings`.
- **Row fingerprint**: All 240 rows share `sync_source: 'sheets-units'`, `source_channel: 'sheets'`, `ref_id: null`, sheet SBR codes (e.g. `OGM739`, `ORH278`, `RH-3F-53K`, `MAD-FR-2166`).
- **Preventive patch**: Patched in commit `871299e87` — `listing.publish_status = 'REVIEW_REQUIRED'` is now hardcoded. All 240 rows are held in `REVIEW_REQUIRED` (0 PUBLISHABLE).

### Permanent Regression Test (Migration 025)

- **Probe execution**: Probe row `probe-test-1791229563902` was inserted into `public.listings` WITHOUT specifying `publish_status`.
- **Landed state**: Row landed with `publish_status: null`, proving the database default was successfully dropped (no fallback to PUBLISHABLE).
- **Anon visibility check**: Querying the probe row via the `anon` client returned 0 rows (error: null). Total visible to anon remained 0 under RLS Policy 020.
- **Cleanup**: Probe row `id: 0b1803bc-8986-4753-a9c3-25615d32f917` was deleted via service-role; post-delete verification returned `[]`.

**Gate verdict: Supabase = CONNECTED across service, service-role admin, RLS policy, and public data paths.**

---

## AI — Gemini / Google AI

| Check | Verdict | Evidence |
|---|---|---|
| `GEMINI_API_KEY` | **CONFIGURED (SET)** | Present in environment. |
| `GOOGLE_AI_API_KEY` / `GOOGLE_GENAI_API_KEY` | **CONFIGURED (SET)** | Present in environment. |
| Live model health | **CONFIGURED** | Live `/api/health` reports `aiOrchestrator: configured, primaryModel: gemini-2.0-flash`. |
| Server-side only | **CONNECTED (policy)** | No server creds browser-visible; secrets used only in server routes. |

**Gate verdict: AI = CONFIGURED (credentials present) — live conversation tests gated on human verification of pilot inventory.**

---

## WhatsApp & OpenWA

| Check | Verdict | Evidence |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_VERIFY_TOKEN` | **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_META_TOKEN` | **CONFIGURED (SET)** | Present in environment. |
| `WHATSAPP_TOKEN` | **NOT SET** | Uses `WHATSAPP_API_TOKEN` / `WHATSAPP_META_TOKEN`. |
| OpenWA server credentials | **CONFIGURED (SET)** | `OPENWA_HOST`, `OPENWA_PORT`, `OPENWA_ADMIN_API_KEY`, `OPENWA_SESSION_ID` present in environment. |

**Gate verdict: WhatsApp / OpenWA = CONFIGURED (credentials present). Outbound delivery gated on pilot inventory activation.**

---

## Google (Calendar / Sheets)

| Check | Verdict | Evidence |
|---|---|---|
| `GOOGLE_CALENDAR_ID` | **CONFIGURED (SET)** | Present in environment. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | **CONFIGURED (SET)** | Present in environment. |
| `GOOGLE_CALENDAR_CREDENTIALS`| **NOT SET** | Key string parsed directly via `GOOGLE_SERVICE_ACCOUNT_KEY`. |
| Sheets synchronization | **CONNECTED** | Workflow 08 (`workflows/08-units-sync/sync.js`) connects to Google Sheets (gid=1127958606); patched to land units as `REVIEW_REQUIRED`. |

**Gate verdict: Google Calendar = CONFIGURED (Service Account Key SET); Sheets sync = CONNECTED.**

---

## Automations & Deployment — Vercel

| Check | Verdict | Evidence |
|---|---|---|
| Client deployment `sierra-estates.net` | **CONNECTED (Live)** | HTTP 200; `/api/health` healthy, `environment: production`, version 3.1.0, databaseLatency 277 ms. |
| Honest Empty State | **CONNECTED (Live)** | `/api/listings` returns `[]`; `/api/inventory` returns `count: 0`, `source: "none"`; `POST /api/matches` returns `[]`; `/properties` renders `<div class="empty-state">` without crash; unverified ID yields clean HTTP 404. |
| Vercel Cron Configuration | **CONNECTED (Live)** | `vercel.json` defines exactly 2 crons: `night` (`0 2 * * *`) and `morning` (`0 6 * * *`). No third cron. |
| Migration Runner Schedule | **VERIFIED MANUAL** | `/api/cron/apply-migrations` is NOT in `vercel.json` crons (deliberate manual invocation only). |
| Real Execution Proofs (Night) | **CONNECTED (Live)** | `public.automation_runs` records execution at `2026-10-05T02:11:53Z`: `maintenance` (success), `expire-reservations` (success), `check-availability-sla` (success). |
| Real Execution Proofs (Morning) | **CONNECTED (Live)** | `public.automation_runs` records execution at `2026-10-05T06:44:44Z`: `sync-leads` (success, duration 5314 ms, 11 created, 39 updated). |

---

## Summary Matrix

| Dependency | Configuration Presence | Live Production Status | Verification Level |
|---|---|---|---|
| Supabase PostgreSQL | SET | CONNECTED (22 migrations) | ✅ Live-verified (0 PUBLISHABLE, anon sees 0) |
| Supabase Service Role | SET | CONNECTED | ✅ Live-verified |
| Gemini AI API | SET | CONFIGURED (`gemini-2.0-flash`) | ⏳ Awaiting pilot inventory |
| WhatsApp Webhook Config | SET | CONFIGURED | ⏳ Awaiting pilot inventory |
| WhatsApp Meta / OpenWA Token | SET | CONFIGURED | ⏳ Awaiting pilot inventory |
| Google Calendar | SET | CONFIGURED | ⏳ Awaiting pilot inventory |
| Google Sheets Sync | SET | CONNECTED | ✅ Live-verified |
| Vercel Client Site | SET | CONNECTED (Live) | ✅ Live-verified |
| Vercel Cron Jobs | SET | CONNECTED (`night`, `morning`) | ✅ Live-verified via `automation_runs` |

---

## GATE

Interim phase verification is **COMPLETE and ground-truthed with raw evidence**:

1. All 22 migrations ledgered (incl. 020, 022, 025).
2. Standing default constraint dropped; permanent regression probe verified (`publish_status: null`, anon sees 0).
3. 15,994 listings held in `REVIEW_REQUIRED`, 0 `PUBLISHABLE`.
4. RLS Policy 020 strictly enforced (anon sees 0).
5. Public surface operates in honest empty state across all endpoints and pages.
6. Next operational milestone: Human verification of the 50-unit pilot (`data/PILOT_50_WORKSHEET.xlsx`).
