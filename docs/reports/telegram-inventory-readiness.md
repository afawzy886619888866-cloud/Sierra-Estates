# Telegram and inventory-sheet readiness report

**Audit date:** 2026-11-07  
**Scope:** Repository-local Excel snapshots and the tracked Telegram/OpenClaw
listing-intake code. No listing rows, phone numbers, or contact names are
included in this report.

## Important scope limitation

The workbook files examined are ignored by Git (`.gitignore` `data/` rule),
so they are local exports, not files available in the online Sierra Estates
repository. This audit could not query the live Google Sheet; the report
below describes only the local snapshots and should not be read as live-sheet
counts. No workbook data was modified.

## Spreadsheet findings

| Snapshot | Sheet / scope | Records | Missing or unusable fields |
|---|---|---:|---|
| `data/Sierra_Estates_Rent_Master.xlsx` | Owners_Rent | 206 | All 206 primary photo links are empty; 2 price-per-square-metre values are empty. |
| same | Brokers_Rent | 3 | All 3 primary photo links are empty. |
| same | Property_Finder_Ads | 15 | All 15 primary photo links are empty. |
| `data/Sierra_Estates_Resale_Master.xlsx` | Owners_Resale | 244 | 194 asking prices and price-per-square-metre values are empty; all 244 primary photo links are empty. |
| same | Brokers_Resale | 6 | All 6 primary photo links are empty. |
| same | Property_Finder_Ads | 25 | 20 asking prices and price-per-square-metre values are empty; all 25 primary photo links are empty. |
| `data/Sierra_Estates_Master_GoogleSheet_Reorganized.xlsx` | Owner rent, owner resale, broker tabs | 931 | No usable HTTP photo URLs or embedded workbook images were found. The Photo URLs column contains placeholder values in 928 records. Contact Name is placeholder-only in 97 records (1 rent, 96 resale). |
| same | Rejected_No_Mobile | 16 | This is explicitly a rejected-record tab; all 16 records lack a usable mobile number. |
| `data/sierra-estates-master-inventory-clean.xlsx` | Master_Inventory | 2,580 | Mobile is empty in 285 records; Unit Price is empty in 385 records. |
| `apps/sierra-estates-realty/data/Inventory_with_Photos.xlsx` | Four owner/broker tabs | 9 | This is a small sample export, not a complete master; UnitCode and contact-name fields are mostly empty. It is not suitable as the authoritative source. |

### Interpretation and priorities

1. **Photos are the largest publication blocker.** The two dedicated Rent and
   Resale masters have no primary photo links at all. The reorganized master
   likewise contains no usable photo URLs or embedded images. Property Finder
   ad tabs therefore cannot be treated as photo-ready based on these files.
2. **Resale price completeness needs repair.** The dedicated resale export has
   no asking price on 194 owner rows and 20 of 25 ad rows. Do not infer price
   from other fields; reconcile those rows to the authoritative inventory.
3. **Contact and availability are sensitive operational fields.** The
   reorganized workbook has placeholder contact names, while the
   `Rejected_No_Mobile` tab records 16 intentionally rejected rows. Keep
   owner numbers restricted to internal workflows and do not copy private
   fields into bot broadcasts.
4. **There are conflicting snapshots.** The reorganized workbook has 931
   owner/broker records with nonblank asking-price cells, while the dedicated
   resale workbook has 194 missing owner prices. These workbooks are not
   in sync and must be reconciled before bulk publishing or overwriting the
   online sheet.
5. **The live sheet needs a fresh read-only export/audit** before changing any
   rows. The current snapshot files are not tracked or remotely available.

## Telegram/OpenClaw intake findings

- The repository already contains an Arabic/English Telegram intake flow:
  parse required fields, ask for missing details, mask owner contacts, append
  to the `Telegram Intake` and `new_units` tabs, and place database listings
  in `REVIEW_REQUIRED` for human approval.
- The `new_units` tab uses columns A–M, with column M carrying Rent/Sale.
- The unit-adder previously read only `BROKER_INBOX_SHEET_ID`, while
  Telegram intake used the Google/Telegram/Units sheet-ID fallback chain.
  With the documented runner default, that could leave pending units unread.
  Both now share one sheet-ID resolver.
- Before this update, normal accepted submissions were written to Supabase
  both directly and by workflow 05, which could create duplicate inventory
  records. The normal route now uses workflow 05 as its sole writer; the
  sheet-outage fallback shares its deduplication hash so recovery does not
  add a second copy.
- Before this update, an empty group allowlist left listing intake open to
  unconfigured chats. Intake is now fail-closed: groups and direct-message
  users must be explicitly allowed. `/chatid` and `/id` remain available for
  setup.
- `pnpm telegram:bot` is a different, legacy general-purpose bot. Listing
  submissions use `pnpm telegram:intake` (or the secure PowerShell launcher
  `scripts/run-telegram-intake.ps1`).
- The bot needs Telegram token, authorized group/user IDs, Google Sheets ID
  and service-account access, and Supabase credentials to complete the
  entire listing-to-database flow. Missing Sheets credentials spool locally;
  missing Supabase credentials prevent database insertion.
- Do not run `ingest:all` against production as a test. It is a mutating bulk
  ingestion operation. Use the offline intake test command:

  ```powershell
  pnpm exec vitest run __tests__/telegram-intake-pipeline.test.ts
  ```
