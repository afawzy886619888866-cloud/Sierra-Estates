# PRODUCTION READINESS REPORT — Sierra Blu / Sierra Estates

**Phase 14 gate run:** 2026-10-01 · commit `0fc03cc` + gate fixes · `pnpm deploy:check`

## Gate result: 9/9 stages PASSED

| # | Stage | Result |
|---|-------|--------|
| 1 | Root Configuration Files | ✅ |
| 2 | Production Environment Configuration (Supabase Authoritative) | ✅ (notice: values in GitHub Secrets / Vercel) |
| 3 | Public Environment Safety (no NEXT_PUBLIC_ server secrets) | ✅ |
| 4 | Canonical Supabase Backend Policy | ✅ * |
| 5 | Legacy Runtime Boundary | ✅ |
| 6 | Supabase Master Schema Readiness | ✅ |
| 7 | Packages Compilation & Type-Check | ✅ |
| 8 | Client Unit & Integration Tests | ✅ (115/115 suites, 1,239/1,239 tests at gate time; now 116/116, 1,267/1,267 after the Easy Listing suite) |
| 9 | Git Status & Zero Working Tree Drift | ✅ |

\* Stage 4 is a presence-only env check (Supabase URL + anon key + service-role key at run time). The verified run used **placeholder values to exercise the checker logic**; production values are configured in Vercel (stage 2's acknowledged contract). The gate must be re-run in the deploy environment for a production-signed result.

## Gate fixes made in Phase 14

1. **`app/api/broker-brain/route.ts`** — dropped the `NEXT_PUBLIC_GEMINI_API_KEY` read (client-inlined a server secret — same defect class as audit B12). Now `GEMINI_API_KEY` only.
2. **`scripts/verify-deploy-readiness.ts`** — removed `.amphion/config.json` from required files: it was deliberately deleted in commit 6ec9f0a (deploy slim-down) and is now gitignored; the stale requirement kept the gate permanently red and contradicted the repo's own recorded decision. The three real build roots (package.json, turbo.json, tsconfig.json) remain required.

## Cumulative state (Phases 0–14)

- **Data honesty:** zero fabrication paths in client-facing code (Phase 1.5 sweep, pinned by tests); master inventory 12,088 → 8,486 unique units, **0 PUBLISHABLE** — publication requires verification by rule, pinned by the Phase 13 data-QA suite.
- **Database:** canonical migration chain 011–018 (additive, idempotent, add-both rule mirrored; 018 adds the Easy Listing broker `map_sheet_entries` staging table), baseline schema.sql in sync.
- **Automation:** all 10 cron jobs scheduled via the Phase 11 dispatcher (Vercel 2-slot Hobby fallback + GitHub Actions canonical), run ledger + DLQ lifecycle.
- **Admin:** Data Integrity Control Center widgets on real data with guarded degradation (Phase 12).
- **Security:** fail-closed cron/webhook auth, B12 fixed, WhatsApp HMAC hardened, service-role usage audited with justification, secrets scan pinned (Phase 13).
- **Website:** snapshot out of client bundles, real matching engine with hard constraints + honest states (Phases 4–6); viewing + feedback lifecycle (Phases 8–9); unified CRM pipeline (Phase 10).

## External blockers (credentials only — no code work pending)

| Blocker | Impact | Owner action |
|---------|--------|--------------|
| Supabase service key | Live import of the 8,486-unit master inventory (`--write` is non-destructive, upsert-only) | Add `SUPABASE_SERVICE_ROLE_KEY` where the importer runs |
| Gemini API key | Bot extraction E2E (AR/EN/mixed/vague/contradictory matrix) + broker-brain live replies | Set `GEMINI_API_KEY` in Vercel |
| WhatsApp (Meta) creds | Outbound dispatch + signed webhook verification | Set `WHATSAPP_API_TOKEN`, `WHATSAPP_APP_SECRET`, `SBR_SECRET_KEY`; ensure `WHATSAPP_APP_SECRET` matches the Meta app so signed traffic verifies |
| `CRON_SECRET` in GitHub repo secrets | The GHA scheduler leg (Vercel cron fallback works regardless) | Add `CRON_SECRET` (same value as Vercel) to repo secrets |

## Standing guidance

- Re-run `pnpm deploy:check` in the deploy environment before each production push (stage 4 requires the real env there).
- Phase 15 (advanced intelligence) stays POSTPONED per the master rule — semantic search/market intelligence only when inventory is verified and usage justifies it.
- The 7,898-unit verification campaign (Phase 1 queue) remains the path to a non-zero PUBLISHABLE set; the data-QA suite intentionally fails if that number moves without a deliberate act.
