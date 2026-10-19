#!/usr/bin/env bash
# scripts/ops/cline-cron.sh
# Scheduled execution wrapper for Cline CLI tasks in crontab or Linux containers.

set -euo pipefail

PRESET="${1:-audit}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${ROOT_DIR}/.reports/cline"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%SZ")"
LOG_FILE="${REPORT_DIR}/cline_${PRESET}_${TIMESTAMP}.log"

mkdir -p "${REPORT_DIR}"

echo "==========================================" | tee -a "${LOG_FILE}"
echo "Sierra Estates Cline Cron: ${PRESET}"       | tee -a "${LOG_FILE}"
echo "Timestamp: ${TIMESTAMP}"                    | tee -a "${LOG_FILE}"
echo "Root Dir:  ${ROOT_DIR}"                     | tee -a "${LOG_FILE}"
echo "==========================================" | tee -a "${LOG_FILE}"

cd "${ROOT_DIR}"

# Run preset task headless with auto-approve/yolo
node "${ROOT_DIR}/scripts/run-cline-task.mjs" --preset "${PRESET}" --yolo 2>&1 | tee -a "${LOG_FILE}"
EXIT_CODE="${PIPESTATUS[0]}"

echo "Finished with exit code: ${EXIT_CODE}" | tee -a "${LOG_FILE}"
exit "${EXIT_CODE}"
