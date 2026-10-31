# The Unified Admin Command Center

The `app/admin/` hub that connects every operational surface of Sierra Estates —
leads, inventory, deals, the AI agent fleet and recruitment — into one
centrally managed console, plus the public showcase gates it controls.

Built on top of the existing Intelligence OS portal (unchanged, now at
`/admin/console`) with the "Luxury Minimal" register: Deep Navy `#0A192F`
(`bg-navy-900`) and Royal Gold `#D4AF37` (`text-gold-500`), glassmorphism
cards, crisp borders (`app/admin/command-center.css`).

## Routes

| Route | Surface | Data |
| --- | --- | --- |
| `/admin` | Main overview dashboard — the five KPI widgets (Total Deals Value, Active Leads, Verified Properties, Inventory Freshness %, Active Bot Status), command navigation, pipeline value strip, activity feed, 24h webhook stats | `/api/admin/overview` |
| `/admin/pipeline` | CRM **10-stage** drag-and-drop board over `leads.pipeline_stage` (canonical vocabulary, migration 016). Realtime CDC on **`deals` and `leads`**; Lead + Property detail modals with deal chips | `/api/admin/leads`, `/api/admin/deals`, `/api/admin/properties/[id]` |
| `/admin/properties` | Inventory & Freshness Control — verified/stale/sold toggles, `se_code` editing (uniqueness enforced), freshness targets (≥ 90%) and the bulk Curator recompute | `/api/admin/properties*` |
| `/admin/leads` | Leads & AI Matchmaker hub — `lead_score`, matchmaker trigger, match inspection, recommendation dispatch | `/api/admin/leads`, `/api/matching`, `/api/admin/leads/[id]/recommendations` |
| `/admin/bots` | AI COO & 10-Bot Operations Desk — fleet heartbeats, live webhook ledger, raw scrape inspector, manual Scribe / Curator / Stage-9 Closer / Matchmaker runs | `/api/admin/bots`, `/api/admin/bots/run`, `/api/admin/webhook-logs`, `/api/admin/raw-feed` |
| `/admin/applicants` | Recruitment — applicant workflow, CV link inspection, onboarding with WhatsApp dispatch | `/api/admin/applicants*` |
| `/admin/console` | The full legacy Intelligence OS portal (moved from `/admin`, unchanged) | — |

Public surface:

| Piece | What it does |
| --- | --- |
| `/properties` (top rail) | **React Server Component** fetch through `utils/supabase/server` under the public RLS policy: `status='active' AND publish_status='PUBLISHABLE' AND stale=FALSE AND freshness_score >= 90` |
| `components/LeadForm.tsx` | Public advisory capture → `POST /api/leads` → `public.leads` |
| `components/ApplicantForm.tsx` | Careers application (with CV **link**, not a dead file picker) → `POST /api/careers/apply` → `public.career_applications` |

## Deployment & the admin domain

`admin.sierra-estates.net` is a separate Vercel project linked to this repo
(same `main`). The edge proxy (`proxy.ts`) makes the console the site on that
host: `/` rewrites to `/admin` (this Command Center), `/login` to
`/admin/login`. The legacy Intelligence OS portal remains at `/admin/console`
and is linked from the overview. Sign-in lands on `/admin` — the Command
Center overview — after authentication.

Both Vercel projects build from every push to `main`, and the build-time
migration applier (`scripts/apply-pending-migrations.mjs`) applies pending
`supabase/migrations/` files whenever `POSTGRES_URL` is present in the build
environment; the runtime half (`/api/cron/apply-migrations`, CRON_SECRET
gated) picks the migration up if it was not.

### Dispatching migration 037 manually

The runtime applier is deliberately manual-dispatch only. If the build did not
apply it (no `POSTGRES_URL` at build), pick one:

```bash
# 1) Runtime applier (CRON_SECRET from Vercel env)
curl -H "x-cron-secret: $CRON_SECRET" https://admin.sierra-estates.net/api/cron/apply-migrations

# 2) GitHub Actions "Automations" workflow → run the apply-migrations dispatch
#    (requires CRON_SECRET as a repository secret)

# 3) Supabase SQL editor — paste supabase/migrations/20261031_037_unified_command_center.sql
#    (idempotent; safe to paste twice)
```

Until 037 lands, the consoles degrade honestly: the properties console reads
without freshness/SE-code columns (and shows a "migration pending" banner),
applicants read from `career_applications` without CV links, the webhook ledger
returns a 503 pointing at the migration, and the Curator recompute reports the
missing RPC.

## Migration 037 (`supabase/migrations/20261031_037_unified_command_center.sql`)

Additive and idempotent; mirrored into `apps/sierra-estates-realty/supabase/migrations/`
(byte-identical, enforced by `__tests__/supabase-migration-mirror.test.ts`) and
appended to `supabase/schema.sql`:

- `listings.freshness_score` (0..100; `compute_listing_freshness`: 100 − 2/day, floor 20 — 5 days = 90, 30 days = 40, aligned with the 011 stale SLA) + `refresh_all_listing_freshness()` RPC.
- `listings.se_code` — canonical SE inventory code, `UNIQUE` when set (partial index), backfilled from legacy `code`/`reference_code` without creating duplicates.
- `public.webhook_logs` — unified inbound webhook ledger (source, payload redacted of auth material, signature validity, status, latency), staff-only read, Realtime-streamed.
- `career_applications.cv_url` + the `public.applicants` security_invoker view alias.

## Status vocabulary mapping

The console's verified / stale / sold toggles ride the production state
machine rather than replacing it:

| Console | Production model |
| --- | --- |
| **verified** | `publish_status='PUBLISHABLE'` + `stale=FALSE` + live status (the public gate, migration 020) |
| **stale** | `stale=TRUE` or `publish_status='STALE'` (30-day SLA, migration 011) |
| **sold** | `status='sold'` reached through the legal `reserved → sold` walk (audited into `status_history` by the 011/035 guard) |

Mapping code: `lib/server/inventory-buckets.ts`.

## AI workflows (`/api/admin/bots/run`)

Executed server-side against Supabase, ledgered in `bot_runs`, heartbeating
`system_status` and appending to the `activities` feed:

- **Scribe** — drains unreviewed `raw_feed`: neural parse (`WhatsAppParserService`, needs `GOOGLE_AI_API_KEY`) with a deterministic regex fallback that extracts only what the message carries.
- **Curator** — `refresh_all_listing_freshness()` RPC: freshness recompute + stale SLA.
- **Stage-9 Closer** — late-pipeline leads quiet for 3+ days get high-priority `followups` + WhatsApp nudges (capped at 10 messages per run).
- **Matchmaker** — bulk `runMatchingForLead` over the newest new/contacted leads.

## Migration validation

`scripts/validate-migration-037.mjs` replays the production migration chain on
a real embedded PostgreSQL 18 (platform stubs for auth/roles/pgvector/PostGIS,
then consolidated `schema.sql` + migrations 011/013/020, then 037 twice, then
functional and hazard probes). It caught and now guards against:

- a `COMMENT ON VIEW` breaking when a manually created `applicants` TABLE
  already exists (the view creation is guarded),
- the se_code backfill violating its own unique index on re-run when
  duplicate legacy codes share `created_at` (deterministic id-tiebreak),
- the freshness backfill restarting every row's `updated_at` clock through the
  shared `handle_updated_at` trigger (transaction-scoped `app.skip_updated_at`
  opt-out — the repo's `app.actor` GUC pattern),
- a column `DEFAULT 100` fabricating perfect scores for all existing rows
  (NULL-default add → heal → then default).

Run it per the header comment; 15/15 checks must pass before shipping changes
to this migration.

## Tests

- `__tests__/command-center-units.test.ts` — pipeline vocabulary + bucket mapping.
- `__tests__/admin-overview-route.test.ts` — KPI computation + degradation contract.
- `__tests__/admin-properties-route.test.ts` — buckets, lifecycle writes, se_code 409s.
- `__tests__/webhook-log.test.ts` — ledger redaction, body-preservation, never-throws.
