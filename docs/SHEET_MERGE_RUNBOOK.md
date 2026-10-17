# Live Master Sheet Merge Runbook — 2026-10-17

**Goal:** make the LIVE Google Sheet Owners-Rent tab (gid 1127958606) THE master
inventory, and merge the 1,503 verified rows currently sitting in
`data/Online_Sheet_New_Rows_Only.csv` into it — with **zero duplication**
(dedupe-guarded) and **zero errors** (phone-normalized matching, plain-text
Mobile formatting, chunked writes).

## State verified before this runbook (2026-10-17 ~10:30 Cairo)

| Check | Result |
|---|---|
| Live Owners-Rent rows | 324 (240 unique Mobile phones) |
| CSV backlog rows | 1,503 (1,375 unique phones; 1,285 valid Egyptian mobiles) |
| Phone overlap (strict, Mobile column both sides) | **0** |
| Last-9-digit overlap (Apps Script matching logic) | **0** |
| CSV internal exact-duplicate rows | **0** |
| CSV column shape vs sheet headers (19 cols) | **0 mismatches** |
| Code overlap vs live | 0 (1,501 CSV codes vs 240 live codes) |

Net effect after import: master grows 324 → ~1,827 rows; outreach pool grows
240 → ~1,615 phones (1,285 new valid Egyptian mobiles).

## The one manual step (~60 seconds, sheet owner only)

The Apps Script web app currently deployed only supports contact-date
write-backs; row appends require the updated script (v2) below.

1. Open the **live** Google Sheet (the one with the Owners-Rent tab).
2. **Extensions → Apps Script**.
3. Delete everything in the editor and paste the full contents of
   [`scripts/google_apps_script_master.js`](../scripts/google_apps_script_master.js)
   from this repo (main branch).
4. In the function dropdown pick **`importNewMasterRows`** → **Run** (authorize
   when prompted — it only touches this spreadsheet + fetches the CSV from
   GitHub raw).
5. Watch the execution log: it prints
   `Import done: appended 1503, skipped (already present) 0, total rows now 1826`.

That is the whole merge. The import is **idempotent** — it reads the sheet's
Mobile column first and skips any row whose phone (exact OR last-9-digits,
the same matching the write-back uses) already exists, so re-running it can
never duplicate rows. Run it once, run it again tomorrow — same result.

## Optional: enable remote triggering (so nobody has to open the sheet again)

After pasting the v2 script:

1. **Deploy → New deployment → Web app** (Execute as: Me; Access: Anyone).
2. Give the new `/exec` URL to the automation side (it replaces
   `WF_SHEET_WRITE_URL`; the write-back contract is unchanged).
3. From then on the merge can be triggered remotely:

```bash
curl -s -X POST "$WF_SHEET_WRITE_URL" \
  -H 'Content-Type: application/json' \
  -d '{"secret":"SE_OUTREACH_SECRET_2026_CAIRO","action":"importNewMasterRows"}'
# → {"ok":true,"appended":0,"skipped":1503,"totalRows":1826}  (idempotent re-run)
```

Or push arbitrary rows with the same dedupe guard:

```json
{"secret":"...","action":"appendRows","rows":[[ "...19 cells..." ]]}
```

## Why the master is the live sheet (not the repo xlsx)

- `data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx` is a
  static snapshot (Oct 15) that gate 0 re-derives `MASTER_INVENTORY_V1.csv`
  from on every Vercel build — it is a build input, not a living inventory.
- The live sheet is where the team actually works: brokers submit
  (Team-Units tab), owners get contacted (تاريخ اخر تواصل), availability
  changes (Available / Not-Available tabs are phone-subsets of Owners-Rent).
- The outreach runner reads the live sheet directly (gviz, zero credentials)
  — after this merge its candidate pool includes every owner in the CSV
  backlog.

## Post-merge verification

```bash
# sheet grew and dates still write back:
python3 scripts/check_outreach_live.py     # contact-date history
curl -s "$WF_SHEET_WRITE_URL"              # GET → totalRows ~1826, version 2
```
