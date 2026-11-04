# E2E Test Writer Dispatch: Opaque-Box Comprehensive Test Suite

## Working Directory
`H:\Sierra Estates\.agents\teamwork\test_writer_e2e\`

## Mandatory Documents
Read `H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md` and `H:\Sierra Estates\PROJECT.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All tests must be genuine opaque-box tests verifying real business requirements and inputs. DO NOT hardcode trivial pass assertions or mock out the substance under test. A teamwork_auditor will independently inspect your test suite.

## Exclusively Owned Files
- `TEST_INFRA.md`
- `TEST_READY.md`
- `__tests__/e2e-all-pillars.test.ts`
- `__tests__/e2e-gis-discovery.test.ts`
- `__tests__/e2e-supply-and-dqe.test.ts`
- `__tests__/e2e-concierge-and-commission.test.ts`

## Tasks to Implement
1. Create `TEST_INFRA.md` at project root following the required 4-tier methodology (Tier 1: Feature Coverage, Tier 2: Boundary & Corner Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios).
2. Author comprehensive Vitest test suites covering all 6 pillars (R1 through R6) across all 36 inventoried features in `PROJECT.md`:
   - **Pillar 1: 4K GIS & Proximity Engine**: Test retina configuration, toggle state, GPS polygons for all 14 compounds, centroid coordinate calculation, landmark travel times (AUC, Golden Square, 90th St, New Capital), and live listing pin badge evaluation.
   - **Pillar 2: Supply Engine & Smart Coding**: Test 240 msgs/day schedule, 45-55s typing delay, line-2 exclusion, Easy Listing dual BMM and Sierra code parsing, and >24h latency 5% penalty indicator.
   - **Pillar 3: Data Quality & Synchronization**: Test phone gate (rejecting invalid/missing, normalizing to E.164), NULL cell filling, rent price capping (<=400k, >=1M reclassification), canonical compound alias resolution (50+ aliases), and DQE `sync_hash` deduplication routing to Duplicates.
   - **Pillar 4: AI Memory, Valuation & Media**: Test `public.unified_memory` 2026 baselines, PropertyCard GEM badge calculation (>15% below compound avg), photo request trigger logic (<8-10 photos), watermarking color specification (`#0A1628` + `#C9A84C`), and Property Finder Atlas XML owner phone scrubbing.
   - **Pillar 5: Buyer Concierge, Scripts & Closing**: Test 7-step qualification, adjacent compound fallbacks, 25% discount voucher minting, 3-way Google Calendar invite generation, 60-min golden hour timer, and 4-hour post-viewing survey.
   - **Pillar 6: Commission Engine & Dashboard**: Test 25/25/25/25 split across Bronze/Silver/Gold tiers, governance SLAs (response time, deal volume, latency penalty), and 6-month ramp calculations against 1,000-lead funnel.
3. Run test verification using `pnpm test:root --run`.
4. Publish `TEST_READY.md` at project root once all tests pass.
5. Write `progress.md` and complete with `handoff.md`.


## 2026-11-04T21:58:27Z
You are the E2E Test Writer (Opaque-Box Comprehensive Test Suite).
Working directory: H:\Sierra Estates\.agents\teamwork\test_writer_e2e\
Read H:\Sierra Estates\.agents\teamwork\ORIGINAL_REQUEST.md and H:\Sierra Estates\PROJECT.md.
Read your dispatch instructions at H:\Sierra Estates\.agents\teamwork\test_writer_e2e\DISPATCH.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All tests must be genuine opaque-box tests verifying real business requirements and inputs. DO NOT hardcode trivial pass assertions or mock out the substance under test. A teamwork_auditor will independently inspect your test suite.

Exclusively Owned Files:
- TEST_INFRA.md
- TEST_READY.md
- __tests__/e2e-all-pillars.test.ts
- __tests__/e2e-gis-discovery.test.ts
- __tests__/e2e-supply-and-dqe.test.ts
- __tests__/e2e-concierge-and-commission.test.ts

Implement all tasks in DISPATCH.md:
1. Write TEST_INFRA.md following the 4-tier methodology (Tier 1: Feature Coverage, Tier 2: Boundary & Corner Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios).
2. Author test suites covering all 6 pillars (R1 through R6).
3. Execute tests via `pnpm test:root --run`.
4. Publish TEST_READY.md when tests pass.
5. Maintain progress.md and write handoff.md. Send a completion message when finished.
