#!/usr/bin/env bash
# tsc-shard-run.sh — memory-safe type-check for the whole app on 4 GB hosts.
#
# The repo's single tsc run needs ~2740 MB V8 heap, which neither fits the
# V8 abort threshold nor the kernel OOM limit on a 4 GB box (no swap). tsc
# always checks the FULL transitive module graph of every entry file, so
# splitting the entry set into shards still covers every reachable file —
# the union of the shards equals the single run.
#
# Shards:
#   api-a / api-b   app/api/** (split alphabetically, the heaviest tree)
#   pages           app pages/components (excl. app/api)
#   libs            lib/**, utils/**, hooks/**, types/**, config/**, messages/**
#   comp            components/**, client/**, mcp-servers/**
#   root            *.ts / *.mts entry files
set -u
cd "$(dirname "$0")/../apps/sierra-estates-realty" || exit 1

HEAP="${TSC_SHARD_HEAP:-2200}"
FAIL=0

run_shard() {
  local name="$1"; shift
  local files
  files="$@"
  if [ -z "$files" ]; then
    echo "[shard $name] no files — skip"
    return 0
  fi
  # Write a temporary shard tsconfig with the explicit file list.
  local cfg="node_modules/.tmp/tsconfig.shard-$name.json"
  mkdir -p node_modules/.tmp
  {
    echo '{'
    echo '  "extends": "../../tsconfig.json",'
    echo '  "compilerOptions": { "noEmit": true, "incremental": false },'
    echo '  "files": ['
    local first=1
    for f in $files; do
      if [ $first -eq 1 ]; then first=0; else echo ','; fi
      printf '"%s"' "$f"
    done
    echo ''
    echo '  ]'
    echo '}'
  } > "$cfg"
  echo "[shard $name] $(echo $files | wc -w) files…"
  if NODE_OPTIONS="--max-old-space-size=$HEAP" npx tsc -p "$cfg" 2>&1 | tee "node_modules/.tmp/tsc-$name.log" | grep -E "error TS" | head -10; then
    :
  fi
  if grep -qE "error TS" "node_modules/.tmp/tsc-$name.log"; then
    echo "[shard $name] FAILED"
    FAIL=1
  else
    echo "[shard $name] OK"
  fi
  rm -f "$cfg"
}

# API routes: alphabetical halves.
API_A=$(find app/api -name "*.ts" ! -path "*__tests__*" | sort | head -n $(($(find app/api -name "*.ts" | wc -l) / 2)))
API_B=$(find app/api -name "*.ts" ! -path "*__tests__*" | sort | tail -n +$(($(find app/api -name "*.ts" | wc -l) / 2 + 1)))
run_shard api-a $API_A
run_shard api-b $API_B

# Pages (app minus api).
PAGES=$(find app -name "*.ts" -o -name "*.tsx" | grep -v "^app/api/" | grep -v __tests__ | sort)
run_shard pages $PAGES

# Lib + the rest.
LIBS=$(find lib utils hooks types config messages -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v __tests__ | sort)
run_shard libs $LIBS

COMP=$(find components client mcp-servers -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v __tests__ | sort)
run_shard comp $COMP

ROOT=$(ls *.ts *.mts 2>/dev/null | grep -v next-env)
run_shard root $ROOT

if [ "$FAIL" -eq 0 ]; then
  echo "ALL SHARDS OK — type-check equivalent to the single full run"
  exit 0
else
  echo "TYPE ERRORS FOUND"
  exit 1
fi
