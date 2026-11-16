# Execution Report — 2026-10-25 (Re-check & Production-Gap Closure)

**Session scope**: Owner-approved autonomous re-check of the Sierra Estates
production pipeline against baseline `c41a4e95`, continuing the standing
mandate: fix real defects, never fabricate integration states, never deploy
around a failed migration gate.

**Actual HEAD at session start**: `0540680d409e7e30b45f002aa3ae25411aa8b507`
(3 commits ahead of the stated baseline: `653e889f` gateway 8-line pool,
`94bbe840` dry-run pseudo lanes, `0540680d` RAG-station gateway keys +
RAM floor). All work in this session is on top of `0540680d`.

---

## 1. What was verified before any change (evidence, not claims)

| Surface | Method | Result |
| --- | --- | --- |
| CI on `0540680d` | GitHub API | CI + Jira Sync + Automations + CodeQL **green** |
| Deploy Supabase workflow | run `40175159437` logs | **FAILED** at the credential pre-flight: `SUPABASE_ACCESS_TOKEN and SUPABASE_DB_URL are required`. Repo secret inventory (names only, no values read): `SUPABASE_ACCESS_TOKEN` **present**, `SUPABASE_DB_URL` **MISSING**. All 7 historical runs failed the same way. |
| Deploy Supabase workflow (design) | source read | The workflow only ever ran `apply-supabase-schema.mjs` (schema.sql alone) — **the migration chain 031–036 could never be applied through it**, despite the workflow's name. Push events even attempted REAL applies by default (`inputs.dry_run` is empty on push, so the `= "true"` branch never ran). |
| EC2 automations workflow | run `40132340054` logs | **FAILED**: `The security token included in the request is invalid` (AWS credentials in GitHub secrets are invalid; 5/5 recent scheduled runs failed). Instance var: `i-0bfd988398645d0cb`. |
| Production site | read-only GETs | `https://sierra-estates.net` 200; `/api/health` healthy (DB connected, 20,281 active properties); `/api/inventory` serves publish-gated units (no owner-phone keys in the unit payload); PF feed gated (28 verified broker-sale rows). |
| **Privacy breach (CRITICAL)** | live download + XLSX parse | `GET /api/inventory/download?dataset=owners` (unauthenticated, CORS `*`) served the committed snapshot: **12,334 rows, "Owner Phone" column with 10,755 non-empty Egyptian owner mobile numbers**, plus Owner Contact Name + WhatsApp Direct. Publication-gate and owner-privacy bypass. No in-repo consumer of the route (orphan endpoint). |
| PF feed contact data | source + repo grep | The 28 phone-like strings in the feed are the brokerage's OWN contact (`PF_AGENT_PHONE` default `+201092048333`, the public concierge line in README + deploy pages) — **not** owner phones. No leak. |
| Owner sheet (live gviz CSV) | full fetch, 324 rows | Price column: 198 EMPTY, 124 bare comma numbers (`8,500,000` sale / `28,000`–`60,000` rent), 2 explicit USD (`1,400$`, `700$`) — the sheet is **mixed-currency**, so the sync's hardcoded `price_currency: 'EGP'` was demonstrably wrong for some rows. |
| Real outreach evidence | sheet contact-date column | 61 owners carry contact date `11/10/2026` (single Windows-host campaign day). Nothing since; recent GHA outreach runs were **dry-run simulations** (run `40138338879` log: `WF_DRY_RUN=true`, `outside active hours … nothing sent`). |
| WhatsApp gateway (`54.89.162.250:2785`) | TCP/HTTP probe | **UNREACHABLE from this environment** (connection timeout — possibly source-restricted or down). Not verifiable here. |
| RAG capability report | repo's own `check-live-services.mjs` | `401 — the default-deny SBR gate is LIVE (good)` — authenticated report needs `SBR_SECRET_KEY`; RAG arming not verifiable anonymously. |

## 2. Defects fixed this session (with regression tests)

### 2.1 Inventory price parsing — `workflows/08-units-sync/sync.js`
- **Was**: `digits()` stripped every non-digit — `8.34M` parsed as **834 EGP**
  (the Code convention `MT-B14-3U-8.34M` proves decimal-million intent), and
  `price_currency` was hardcoded `'EGP'` for every row including the USD ones.
- **Now**: new `parseUnitPrice()` — decimal-million (`8.34M` → 8,340,000),
  canonical thousands separators (`8,500,000`, dot-grouped `1.250.000`),
  explicit currency labels (EGP/USD/EUR/GBP/AED/SAR + `$`/`جنيه`/`دولار` +
  Eastern Arabic digits). **Currency is never assumed**: unlabeled prices land
  `price_currency NULL`. Ambiguous values (empty, bare decimals without M,
  ranges `8-9M`, text `POA`, negatives) are **quarantined**: price 0 + a
  `raw_data._price_parse` envelope (status/price/currency/reason/raw) for the
  human review queue. The raw source price is preserved verbatim (sheet row
  inside `raw_data` + envelope `raw`). Summary gained `priceParsed` /
  `priceNoCurrency` / `priceQuarantined` counters.
- **Validated against all 324 live rows**: 126 parsed (0 mis-parses — 124
  currency-unknown + 2 USD), 198 quarantined-empty (a real data gap, now
  visible instead of silently price=0+EGP).
- **Untouched by design**: `dupe_check_hash` (from Code), insert-time
  `publish_status='REVIEW_REQUIRED'`, PATCH stripping of
  `publish_status/verified_at/verified_by`, provenance never stamped,
  in-batch dedup, `sync_source`/`source_channel`.
- **Tests**: `__tests__/units-sync-price-parsing.test.ts` — 17 tests
  (decimal-million, malformed, missing currency, source-specific USD rows,
  Arabic formats, quarantine reasons, canonical-identity preservation).

### 2.2 Owner-contact mock send paths — `apps/automations/src/{02,03,04}`
- **Was**: `03-owner-contact/index.js` commented out the real fetch, logged
  "sent", and wrote a `communications` row with `status:'sent'` — a
  fabricated delivery record. `04-email-sender` iterated hard-coded
  `mockInvestors` with a literal `re_mock_key` default and counted unsent
  emails as sent. `02-owner-search` scraped with invented CSS selectors,
  reported timeouts as `success:true, 0 leads`, and inferred "owner-direct"
  from **missing broker data**.
- **Now**: all three rewritten real-provider-only:
  - `03-owner-contact/index.ts`: OpenWA gateway contract (same as the active
    workflows); unconfigured ⇒ `{status:'provider_unconfigured'}`, zero side
    effects; `sent` only on HTTP 2xx (audit row written only then); dry-run
    distinct (`status:'dry_run'`, sends/records nothing).
  - `02-owner-search/index.ts`: official PF partner API only (no scraping —
    respects source terms/access/rate limits); timeout/401-403/429/malformed
    shapes are explicit **failures**; zero results from a healthy response is
    the only success-with-0-leads; owner-direct only from **positive
    evidence** (owner object or the API's own owner_only flag); unsupported
    platforms report `unsupported_platform`.
  - `04-email-sender/index.ts`: no `re_mock_key` default, no invented
    recipients; `sent` only after Resend accepts; failures recorded as failures.
- Stale compiled twins deleted (`02/03/04 …/index.js`) and the
  `check-no-compiled-twins` ALLOWED list shrunk 105 → 102 ("shrink, never
  grow" honored).
- **Tests**: `apps/automations/src/__tests__/automations-honesty.test.ts` —
  17 tests (unconfigured-refusal, 2xx-gated sent, HTTP-rejection, network
  failure, dry-run distinctness, timeout/blocked/malformed/zero-results,
  owner-evidence rules, no fabricated emails).
- **Active production entry points re-audited**: `workflows/03-owner-contact/contact.js`
  and `workflows/09-owner-outreach/outreach.js` both send through
  `GatewayClient.sendText` which requires a real 2xx; dry-run paths touch
  nothing; caps/ledger/opt-out verified in source; GHA outreach defaults to
  dry-run unless the repo variable `WHATSAPP_LIVE_OUTREACH=true`.

### 2.3 Active owner discovery — `workflows/02-owner-search/search.js`
- **Was**: `unit.owner?.phone || unit.agent?.phone || 'No contact'` put
  **broker phones into the owner_leads sheet** (workflow 03 would then text
  brokers as owners) and appended empty placeholder rows; a malformed API
  payload was coerced to `[]` (extraction failure reported as empty success);
  429 was not specially handled.
- **Now**: owner-evidence gate (`hasOwnerEvidence` — owner phone only),
  broker-only/no-evidence rows counted and skipped, malformed shape throws
  (exit 1, honest `:error` run label), 429 fails loudly, exported helpers +
  `require.main` guard for testability.
- **Tests**: `workflows/__tests__/owner-search-evidence.test.ts` — 6 tests.

### 2.4 Public owner-data exposure — `apps/sierra-estates-realty/app/api/inventory/download/route.ts`
- **Was**: unauthenticated public export of the committed snapshot with
  owner names/phones/WhatsApp links (see §1 — 10,755 live owner numbers).
- **Now**: owner-privacy gate — public callers get the repo's established
  concierge-doctrine redaction (owner contact columns → Sierra Estates
  concierge contact; phone-like strings in free text scrubbed), applied to
  all three formats (json/csv/xlsx) and all datasets; **authenticated admin**
  (`verifyPortalRequest`, session cookie or secret key) keeps the full
  export; auth-gate failures fail **closed** to the redacted export.
- **Tests**: `__tests__/inventory-download-privacy.test.ts` — 5 tests
  (public JSON/XLSX redaction incl. workbook-level verification, admin full
  export preserved, fail-closed).
- ⚠️ **The fix is in code only until the next production Vercel deploy**
  (production deploys trigger on `v*` tags / manual dispatch — see §5).

### 2.5 Supabase deploy path — schema + migrations
- **Was**: the workflow applied only `schema.sql`; migrations never applied
  or ledgered; even default dry-runs were blocked by the credential gate;
  push events attempted real applies.
- **Now**: new `scripts/apply-supabase-migrations.mjs` — ordered chain,
  **G2-parity ledger versions** (031/032/033 → `20261019031000/32000/33000`,
  matching the versions already recorded in production, so reconciliation
  skips them), static `--dry-run` validation (idempotency-guard conventions,
  SQL-aware comment/dollar-quote stripping), live-ledger-first apply that
  stops at the first failure. Workflow reworked: dry-run validates with NO
  credentials; the two-credential gate applies to the apply branch only;
  the real path runs schema + migrations; push events default to safe
  dry-run validation.
- **Tests**: `__tests__/supabase-migration-chain.test.ts` — 12 tests.

## 3. Verification commands and actual results

| Command | Result |
| --- | --- |
| `npx vitest run` (root suite) | **85 files / 786 tests — ALL PASS** (729 baseline + 57 new) |
| `pnpm type-check` (turbo, 18 tasks) | **18/18 pass** (client-page needed a solo re-run first — turbo's parallel load OOM-kills tsc on this 4 GB host, the repo's own documented constraint; solo run passes with the adaptive-heap wrapper) |
| `pnpm lint` (twins + legacy boundary + turbo lint) | **15/15 tasks, 0 errors** (114 pre-existing warnings, none in changed files) |
| `node scripts/check-no-compiled-twins.mjs` | **PASS** — 102 grandfathered (shrunk from 105) |
| `node scripts/apply-supabase-migrations.mjs --dry-run` | **PASS** — 34 migrations, versions unique, static validation green, no network |
| `node scripts/validate-price-parser.js` (local harness vs live sheet) | 324/324 rows classified, **0 mis-parses** |

No production data was mutated by any command in this session (the test
suite skips live StorageService tests without keys; `ensure-snapshot` only
touches local files; the migration applier was only run with `--dry-run`).

## 4. Supabase migration status (031–036)

- **031/032/033**: G2 evidence (2026-10-19) records them applied and
  recorded in `supabase_migrations.schema_migrations` (`20261019031000`,
  `20261019032000`, `20261019033000`). The live ledger is **not readable**
  from this environment (no DB URL/credentials; `supabase_migrations` is not
  anon-exposed), so this session **cannot independently re-verify** the
  ledger — the G2 record stands as the last verifiable evidence. The new
  applier's G2-parity version derivation guarantees 031–033 will be SKIPPED
  (not re-applied) when it first runs for real.
- **034/035/036** (2026-10-21/25): no evidence anywhere in the repo that
  they are applied to production. Status: **code-present, live-apply
  UNKNOWN** — treat as not applied until the workflow runs.
- **Blocker (exact)**: repository secret `SUPABASE_DB_URL` does not exist
  (checked by name; `SUPABASE_ACCESS_TOKEN` exists). The workflow's
  two-key gate therefore blocks the apply path.
- **Operator action to unblock** (one-time):
  1. Supabase dashboard → Project `gaxfqcietzoonlmatiot` → Settings →
     Database → copy the connection string (Transaction pooler URI is fine).
  2. `gh secret set SUPABASE_DB_URL` (or repo Settings → Secrets → Actions →
     New repository secret) — never paste it in chat or commit it.
  3. Confirm `SUPABASE_ACCESS_TOKEN` is a CURRENT personal access token
     (the 2026-10-19 §7 note said the then-stored one returned 401 Revoked;
     rotate if needed: `gh secret set SUPABASE_ACCESS_TOKEN`).
  4. Run the workflow (Actions → "Deploy Supabase (schema + migrations)" →
     Run workflow, `dry_run` unchecked) — it now applies schema + the
     migration chain, reconciled against the live ledger (031–033 skipped,
     034–036 + any gaps applied and recorded).
  5. Verify in the run log: `SUMMARY: N applied · M already-in-ledger
     (skipped) · 0 failed`.

## 5. Deployment status & rollback

- **This session did NOT deploy anything.** Production deploys trigger on
  `v*` tags or manual dispatch with a CI gate; the standing mandate
  authorizes commit + push only, and the migration workflow is still
  credential-blocked (§4).
- **The live `/api/inventory/download` privacy breach remains OPEN until
  the next production Vercel deploy ships the redaction gate.** Interim
  note: the endpoint is undocumented (no in-repo consumers), but publicly
  reachable; treat the owner-sheet phone data as exposed until deployed.
- **Recommended deploy order (operator)**: (1) unblock + run the Supabase
  workflow (§4) so the migration chain is reconciled; (2) tag a release
  (`v…`) or run "Deploy Vercel (Client + Admin)" → production, which runs
  the CI gate; (3) verify with: anonymous
  `curl -s 'https://sierra-estates.net/api/inventory/download?dataset=owners&format=json&dealType=sale' | head`
  — every `Owner Phone` must read `+201092048333`.
- **Rollback**: app changes are additive (auth-gated export, parser,
  workflows) — a previous tag redeploys cleanly; the migration applier
  never re-applies ledgered versions, and every migration is idempotent by
  the static validator's contract.

## 6. Integration status matrix (honest)

| Integration | Code | Config | Reachable (from here) | Tested | Production-confirmed |
| --- | --- | --- | --- | --- | --- |
| Canonical inventory (Supabase listings) | ✅ | ✅ (service role on host/GHA) | ✅ via site APIs | ✅ 786-test suite | ✅ site serves 4,954-segment gated inventory |
| Units sync (08) price parsing | ✅ fixed | ✅ (sheet public, SB keys on runner) | ✅ sheet fetched live | ✅ 17+6 tests | ⚠️ next runner cycle applies the fix |
| Owner outreach (09) + contact (03) | ✅ real-gateway only | ✅ on GHA/EC2 hosts | ❌ gateway 54.89.162.250:2785 timeout from here | ✅ safety suites | ⚠️ 61 real contacts 2026-10-11; recent runs dry-run |
| Owner search (02 active + automations) | ✅ fixed | ⚠️ PF token unverified | n/a (no API creds here) | ✅ 23 tests | ❌ no evidence of a successful live run |
| Google Sheets write-back | ✅ | ✅ (WF_SHEET_WRITE_URL on host) | ❌ host-only | ✅ unit | ✅ 61 dated rows exist |
| Public listing API (/api/listings) | ✅ publish-gated | ✅ | ✅ 200 | ✅ | ✅ serves PUBLISHABLE only |
| Map / client portal | ✅ | ✅ | ✅ 200 | ✅ map suites | ✅ live |
| PF feed (/api/feeds/property-finder) | ✅ gated | ✅ | ✅ 200, 28 rows | ✅ | ✅ verified gated; contact = own line |
| Inventory download route | ✅ fixed (redaction) | ✅ | ✅ (breach live pre-deploy) | ✅ 5 tests | ❌ **breach open until deploy** |
| WhatsApp gateway (OpenWA pool) | ✅ | ✅ on hosts | ❌ unreachable here | ✅ pool suites | ❌ not verifiable from this session |
| Telegram (bot/broadcast/webhook) | ✅ routes exist | ✅ token secret exists | ✅ api.telegram.org reachable | ✅ suite | ❌ no live evidence this session |
| RAG station (Gemini + pgvector) | ✅ | gated by SBR key | ⚠️ 401 default-deny gate (by design) | ✅ | ❌ not verifiable anonymously |
| Workflow runner telemetry (public.workflows) | ✅ | on EC2 | ❌ EC2 path blocked (invalid AWS token) | ✅ | ❌ **G3 evidence unreachable** |

## 7. G3 verdict — **NOT PASSED (BLOCKED — infrastructure credentials)**

G3 requires: the real EC2 workflow runner executing the authorized Phase 1
workflow with evidence in integration status logs (`public.workflows`
telemetry) and `status_history`. Current reality:
- The EC2 automations path is down (invalid AWS security token — all 5
  recent scheduled runs failed before reaching the instance).
- `public.workflows` telemetry is only readable through the runner's
  loopback HTTP API on the EC2 host — unreachable from here.
- The only real outreach evidence (61 owners, 2026-10-11) predates the
  telemetry contract and does not constitute a Phase 1 end-to-end run.
- **Therefore G3 remains open. Phase 2 must not start.**
- Unblocking chain: rotate AWS credentials (`AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` secrets) → EC2 automations workflow reaches the
  runner → runner executes units-sync/outreach with the fixes → telemetry +
  ledger + `status_history` evidence → G3 re-evaluation.

## 8. Remaining blockers — exact responsible actions

| # | Blocker | Responsible action |
| --- | --- | --- |
| 1 | Live owner-phone exposure on `/api/inventory/download` until deploy | Operator: run §5 deploy order (Supabase workflow first, then Vercel production deploy). **Highest priority.** |
| 2 | `SUPABASE_DB_URL` secret missing (blocks migration apply; 034–036 unverified) | Operator: §4 steps 1–5. |
| 3 | Invalid AWS credentials (blocks EC2 runner + G3 evidence) | Owner: rotate the AWS key pair in repo secrets; verify with the EC2 daily-digest dispatch. |
| 4 | WhatsApp gateway unreachable from this environment | Operator: confirm gateway host/IP + source restrictions; the GHA outreach runs hold the actual `WHATSAPP_API_URL` secret value. |
| 5 | `SUPABASE_ACCESS_TOKEN` possibly revoked (2026-10-19 note) | Owner: rotate if the workflow reports 401 on first real run. |
| 6 | 198/324 sheet rows have no price (quarantined) | Business: fill prices in the owner sheet (or confirm USD/EGP per row) — sync now flags them for review instead of fabricating. |

## 9. Verdict

**IMPLEMENTED — LIVE VERIFICATION INCOMPLETE.**

All code defects found in this session are fixed with regression coverage and
the full suite is green (786/786, types 18/18, lint 0 errors), but two
production truths keep this out of PRODUCTION READY: the live privacy breach
stays open until the operator deploys (§5), and the EC2/Supabase credential
blockers prevent live verification of the migration chain and G3 (§4, §7).
No integration state above is fabricated: everything marked ❌/⚠️ was probed
and honestly reported.
