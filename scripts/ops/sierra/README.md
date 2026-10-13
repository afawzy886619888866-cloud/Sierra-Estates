# Sierra Estates — Operational Toolkit & Runbook

This directory contains the operational and enrichment toolkit for Sierra Estates production maintenance.

## Operating Runbook

### Daily 2-Minute Health Check
Run `smoke_production.sh` (requires only `curl` + `python3`, zero credentials needed):
```bash
bash scripts/ops/sierra/smoke_production.sh
```
All green (15/15 checks) = done for the day.

---

### Inventory Enrichment Loop (Processing the Active Queue)
Turns active-but-unpublished queue rows into verified, sellable inventory without data fabrication (§21 compliance):

1. **Generate Worklist**:
   ```bash
   python3 scripts/ops/sierra/generate_worklist.py --out worklist_$(date +%F).csv
   ```
2. **Human Verification**:
   The operator reviews the CSV and fills only the `new_*` columns in Excel / Google Sheets for facts they genuinely know. (70.3% of queue rows already carry owner or broker phone contacts). Blanks are left blank—never invent or fabricate prices, coordinates, or specifications.
3. **Dry-Run Review & Apply**:
   ```bash
   # Dry-run validation (zero writes)
   python3 scripts/ops/sierra/apply_enrichment.py worklist_YYYY-MM-DD.csv

   # Apply verified human fills (writes to DB + audit_logs table)
   python3 scripts/ops/sierra/apply_enrichment.py worklist_YYYY-MM-DD.csv --apply
   ```
4. **Publish Gate Check & Promotion**:
   ```bash
   # Dry-run audit against the 12-field completeness gate
   python3 scripts/ops/sierra/recheck_and_publish.py

   # Promote passing rows to PUBLISHABLE
   python3 scripts/ops/sierra/recheck_and_publish.py --apply
   ```
   Promoted listings appear live on the public map immediately upon next request.

---

### Queue Defect Groups (Mutually Exclusive)
Queue listings are categorized into strict priority defect groups:
- `no_price`: Price is NULL or 0.
- `stub_5m`: Price equals 5,000,000 (known placeholder pattern). Requires `5m-confirmed` in notes to pass.
- `rent_level_on_sale`: Sale/resale listing with price < 100,000 (monthly rent placed on sale listing).
- `rent_anomaly`: Rent listing with price <= 999.
- `no_coords`: Priced listing lacking latitude or longitude.
- `incomplete_fields`: Priced and geocoded, but missing description, photos, bedrooms, bathrooms, area, or code.

---

### Rollback of an Accidental Publish Batch
If an unintended batch is marked publishable, revert status using a single REST call:
```http
PATCH /rest/v1/listings?publish_status=eq.PUBLISHABLE
Content-Type: application/json

{"publish_status": "REVIEW_REQUIRED"}
```

---

### Audit Trail
Every update performed through `apply_enrichment.py` and `recheck_and_publish.py` creates an entry in `audit_logs` with actor `sierra-enrichment-workflow`, containing full `before` and `after` snapshots.
