#!/usr/bin/env bash
#
# Apply supabase/schema.sql to a throwaway Postgres database and assert the RLS
# policies actually behave — a self-signup 'client' must not be able to read the
# CRM, escalate their own role, or edit the catalogue.
#
# Requires a local Postgres (any recent version). Skips cleanly when one is not
# available, so it can sit in CI without becoming a hard dependency.
set -euo pipefail

DB="${RLS_TEST_DB:-sierra_rls_test}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="$HERE/../schema.sql"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if ! command -v psql >/dev/null 2>&1; then
    echo "SKIP: psql not found — install Postgres to run the RLS tests."
    exit 0
fi

if ! psql -lqt >/dev/null 2>&1; then
    echo "SKIP: no reachable Postgres server (set PGHOST/PGUSER as needed)."
    exit 0
fi

# pgvector is not required to validate the policies. Where it is absent, stub
# the type and drop the vector indexes; everything else runs verbatim.
if psql -tAc "SELECT 1 FROM pg_available_extensions WHERE name='vector'" | grep -q 1; then
    cp "$SCHEMA" "$WORK/schema.sql"
    HARNESS_EXTRA=""
else
    echo "note: pgvector unavailable — stubbing vector columns for this run."
    sed -E 's|CREATE EXTENSION IF NOT EXISTS "vector";|-- vector stubbed by run-rls-tests.sh|; s|vector\([0-9]+\)|vector|g' "$SCHEMA" \
        | grep -v "USING hnsw" > "$WORK/schema.sql"
    HARNESS_EXTRA="yes"
fi

dropdb --if-exists "$DB"
createdb "$DB"
trap 'dropdb --if-exists "$DB" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/harness.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$WORK/schema.sql" 2>&1 | grep -vE "already exists, skipping|does not exist, skipping" || true

# Applying twice proves the schema is idempotent — operators re-run this file.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$WORK/schema.sql" >/dev/null 2>&1
echo "schema applied twice cleanly (idempotent)"

psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/rls.sql"
echo ""
echo "All RLS expectations passed."
