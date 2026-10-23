#!/usr/bin/env bash
# ============================================================================
# supabase/tests/run-rls-tests.sh — RLS verification harness
# ============================================================================
# Backing the root package.json "test:rls" target (previously dangling).
#
# OFFLINE checks (always run — no credentials needed):
#   1. Phase D publish-gate policy present in supabase/schema.sql AND the
#      app mirror copy (apps/sierra-estates-realty/supabase/schema.sql):
#      "Public can view active listings" must require
#      (status = 'active' AND publish_status = 'PUBLISHABLE') OR is_staff().
#   2. get_listings_near_capital() RPC body must filter publish_status.
#   3. Migration 020 (public publish gate) present in both migration dirs.
#
# LIVE checks (require SUPABASE_ACCESS_TOKEN — the same Management-API
# credential scripts/apply-supabase-schema.mjs uses; absent in this sandbox
# by design, see docs/ACTIVATION_BASELINE.md blocker #5):
#   4. Live pg_policies row for the publish-gate policy exists and its
#      USING expression mentions publish_status.
#   5. Anon-role read smoke test inside a rolled-back transaction
#      (BEGIN; SET LOCAL ROLE anon; ... ROLLBACK).
#
# Exit codes: 0 = all requested checks passed
#             1 = a check failed
#             2 = live checks requested but inconclusive (endpoint refused
#                 the multi-statement probe — re-run manually via SQL editor)
# ============================================================================
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-gaxfqcietzoonlmatiot}"
MGMT_API="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"
FAILURES=0
LIVE_INCONCLUSIVE=0

say()  { printf '%s\n' "$*"; }
ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$*"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; FAILURES=$((FAILURES+1)); }
info() { printf '  ....  %s\n' "$*"; }

say "── offline checks (no credentials required) ──────────────────────"

# 1. Publish-gate policy in both schema copies
for SCHEMA in "${REPO_ROOT}/supabase/schema.sql" \
              "${REPO_ROOT}/apps/sierra-estates-realty/supabase/schema.sql"; do
    NAME="${SCHEMA#${REPO_ROOT}/}"
    if [[ ! -f "$SCHEMA" ]]; then
        bad "${NAME}: file missing"
        continue
    fi
    if grep -q 'CREATE POLICY "Public can view active listings"' "$SCHEMA" \
       && grep -A6 'CREATE POLICY "Public can view active listings"' "$SCHEMA" \
            | grep -q "publish_status = 'PUBLISHABLE'" \
       && grep -A6 'CREATE POLICY "Public can view active listings"' "$SCHEMA" \
            | grep -q "public.is_staff()"; then
        ok "${NAME}: Phase D publish-gate policy present (active+PUBLISHABLE OR staff)"
    else
        bad "${NAME}: publish-gate policy missing or not requiring PUBLISHABLE"
    fi
    # no leftover conflict markers anywhere in the schema
    if grep -q '^<<<<<<< ' "$SCHEMA" || grep -q '^>>>>>>> ' "$SCHEMA"; then
        bad "${NAME}: unresolved conflict markers present"
    else
        ok "${NAME}: no conflict markers"
    fi
done

# 2. RPC gate
for SCHEMA in "${REPO_ROOT}/supabase/schema.sql" \
              "${REPO_ROOT}/apps/sierra-estates-realty/supabase/schema.sql"; do
    if awk '/FUNCTION get_listings_near_capital/,/LANGUAGE plpgsql/' "$SCHEMA" \
        | grep -q "publish_status = 'PUBLISHABLE'"; then
        ok "${SCHEMA#${REPO_ROOT}/}: get_listings_near_capital gated on PUBLISHABLE"
    else
        bad "${SCHEMA#${REPO_ROOT}/}: RPC proximity search missing publish gate"
    fi
done

# 3. Migration 020 present in root + app mirror
for DIR in "${REPO_ROOT}/supabase/migrations" \
           "${REPO_ROOT}/apps/sierra-estates-realty/supabase/migrations"; do
    if [[ -f "${DIR}/20261002_020_public_publish_gate.sql" ]]; then
        ok "${DIR#${REPO_ROOT}/}: migration 020 present"
    else
        bad "${DIR#${REPO_ROOT}/}: migration 020 (public publish gate) missing"
    fi
done

say ""
say "── live checks (SUPABASE_ACCESS_TOKEN) ────────────────────────────"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    say "  SKIP  live checks: SUPABASE_ACCESS_TOKEN not set in this environment."
    say "        (Phase D live apply is tracked as credential-gated work in"
    say "        docs/ACTIVATION_BASELINE.md — apply migration 020 with the"
    say "        same token, then re-run: pnpm test:rls)"
else
    api_query() {
        curl -sS -X POST "$MGMT_API" \
            -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
            -H 'Content-Type: application/json' \
            --data "$(jq -n --arg q "$1" '{query: $q}')"
    }

    # 4. Policy exists on the live database
    POLICY_RES="$(api_query "SELECT policyname, qual FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Public can view active listings';")"
    POLICY_COUNT="$(printf '%s' "$POLICY_RES" | jq 'length' 2>/dev/null || echo -1)"
    if [[ "$POLICY_COUNT" == "1" ]]; then
        if printf '%s' "$POLICY_RES" | jq -r '.[0].qual' | grep -qi 'publish_status'; then
            ok "live pg_policies: publish gate exists and quals on publish_status"
        else
            bad "live pg_policies: policy exists but qual lacks publish_status (migration 020 not applied?)"
        fi
    else
        bad "live pg_policies: expected exactly 1 publish-gate policy, got: ${POLICY_COUNT}"
    fi

    # 5. Anon-role smoke test inside a rolled-back transaction
    ANON_RES="$(api_query "BEGIN; SET LOCAL ROLE anon; SELECT count(*) AS total, count(*) FILTER (WHERE status='active' AND publish_status='PUBLISHABLE') AS compliant FROM public.listings; ROLLBACK;")"
    if printf '%s' "$ANON_RES" | jq -e '.message' >/dev/null 2>&1 \
       && [[ "$(printf '%s' "$ANON_RES" | jq -r '.message' 2>/dev/null)" != "null" ]]; then
        say "  ....  multi-statement probe refused by the Management API:"
        info "$(printf '%s' "$ANON_RES" | jq -r '.message' 2>/dev/null | head -c 200)"
        info "run the smoke test manually in the SQL editor:"
        info "  BEGIN; SET LOCAL ROLE anon; SELECT count(*) FILTER (WHERE NOT (status='active' AND publish_status='PUBLISHABLE')) FROM public.listings; ROLLBACK;  -- must be 0"
        LIVE_INCONCLUSIVE=1
    else
        TOTAL="$(printf '%s' "$ANON_RES" | jq -r '.[0].total // "?"' 2>/dev/null)"
        COMPLIANT="$(printf '%s' "$ANON_RES" | jq -r '.[0].compliant // "?"' 2>/dev/null)"
        info "anon-role probe: total visible=${TOTAL}, PUBLISHABLE-compliant=${COMPLIANT}"
        if [[ "$TOTAL" == "$COMPLIANT" && "$TOTAL" != "?" ]]; then
            ok "live anon-role read: every visible row is publish-gate compliant"
        else
            bad "live anon-role read: non-compliant rows visible to anon (${TOTAL} total vs ${COMPLIANT} compliant)"
        fi
    fi
fi

say ""
if [[ "$FAILURES" -gt 0 ]]; then
    say "RESULT: FAIL (${FAILURES} failed check(s))"
    exit 1
elif [[ "$LIVE_INCONCLUSIVE" -eq 1 ]]; then
    say "RESULT: INCONCLUSIVE (offline checks passed; live anon probe needs manual run)"
    exit 2
else
    say "RESULT: PASS"
    exit 0
fi
