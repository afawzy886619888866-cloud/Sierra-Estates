---
name: inventory-csv-merger
description: >
  Merge new Owners-Rent or Owners-Buy CSV exports into the Sierra Estates
  master inventory CSV. Handles column mapping between Google Form / CRM
  export format and the canonical master schema, deduplicates by phone+code,
  back-fills sparse fields, transitions stale availability statuses, and
  regenerates the consolidated Excel workbook.
---

# Inventory CSV Merger Skill

## When to Use

Activate this skill whenever:

- A **new Owners-Rent CSV** or **Owners-Buy CSV** arrives (from Google Forms, CRM export, or manual data entry)
- The user asks to **merge**, **import**, **update**, or **deduplicate** rental/sale inventory
- A new batch of owner contacts needs to be **consolidated** into the master

## Prerequisites

- Node.js 18+
- `papaparse` and `xlsx` packages (already in project dependencies)

## Source CSV Formats

### New CSV Format (Google Form / CRM Export)

| Column | Description |
|---|---|
| `Timestamp` | Entry date/time |
| `NO` | Row number |
| `تاريخ اخر تحديث` | Last update date |
| `Name` | Owner / contact name |
| `Mobile` | Phone number (10–13 digits, possibly with spaces) |
| `Availablty` | Status: `Available`, `No answer`, `Not available`, `Follow up`, `Sold` |
| `bedrooms` | Number of bedrooms |
| `Location ` | Compound/area name (free text, trailing space in header) |
| `Unit Price` | Price — may be EGP, USD ($), "Price on Call", or "per meter" |
| `Furnished or not` | Furnishing status |
| `Type` | Deal type: `rent`, `sale`, `Furnished rent`, `اتباعت`, `تم الايجار` |
| `Property Tybe` | Property type (note: typo in original) |
| `Code` | Unit listing code |
| `Owner` | Always "Owner" for direct owner intake |
| `Garden` | Garden area in sqm |
| `Space` | Built-up area in sqm |
| `Pool` | Pool availability (yes/no) |
| `Comment` | Free-text notes |

### Master CSV Format (Target)

| Column | Maps From |
|---|---|
| `Unit Code` | `Code` |
| `Compound / Community` | `Location` → gazetteer lookup |
| `Zone / Area` | `Location` → gazetteer zone |
| `Property Type` | `Property Tybe` (normalized) |
| `Monthly Rent (EGP)` | `Unit Price` (cleaned) |
| `Rent Display` | Formatted price string |
| `Area (sqm)` | `Space` |
| `Bedrooms` | `bedrooms` |
| `Bathrooms` | (not in source) |
| `Furnishing` | `Furnished or not` |
| `Owner / Contact Name` | `Name` |
| `Owner Phone` | `Mobile` (formatted +20...) |
| `Direct WhatsApp` | Generated from phone |
| `Listing Status` | `Availablty` + `Type` (mapped) |
| `Source Channel` | Always "Direct Owner Intake" |
| `Listing Notes` | `Comment` |
| `Record ID` | SHA-256 hash of phone+code |
| `Garden (sqm)` | `Garden` |
| `Pool` | `Pool` |
| `Availability Raw` | `Availablty` (original text) |
| `Deal Type` | `Type` → rent/sale |
| `Last Updated` | `تاريخ اخر تحديث` or `Timestamp` |

## Deduplication Strategy

1. **Primary key**: `normalizedPhone (last 10 digits) + Code (uppercased)`
2. **When matched**:
   - Keep whichever record has more filled fields (field score)
   - Back-fill empty/placeholder fields from the other record
   - Update status if new data says "Not available"/"اتباعت" but old says "Available"
3. **Fallback**: code-only match when phone differs (same unit, different contact)

## Running the Merge

```bash
# Dry run (preview only, no writes)
node scripts/merge-owners-rent-csv.mjs <path-to-new-csv> --dry-run

# Actual merge
node scripts/merge-owners-rent-csv.mjs <path-to-new-csv>
```

## Post-Merge Checklist

After running the merge:

1. **Verify** the merged CSV row count and compound distribution
2. **Regenerate consolidated Excel**:
   ```bash
   node scripts/create-consolidated-rent-master.mjs
   ```
3. **Copy to data directory** (if needed):
   ```bash
   cp Sierra_Estates_Owners_Rent_Master.csv apps/sierra-estates-realty/data/
   ```
4. **Update snapshot** for the inventory API fallback
5. **Redeploy** to Vercel if the snapshot changed
6. **Verify map** at `/explore` — check compound badges show updated counts

## Location Resolution

The merge script uses a built-in gazetteer to resolve free-text location names
to canonical compound names and zones. Known aliases include:

- `Mevida` → Mivida
- `CFC` → Cairo Festival City
- `rehab` → Al Rehab
- `eypet hose elkurfenl` → Dar Misr (El Koronfel)
- `banfcg` → Al Banafsaj
- `andlos` → Al Andalus
- `gardina city` → Gardenia City

If a location can't be resolved, it falls through to `Unresolved` and should
be manually corrected in the output CSV.

## Price Handling

- **Comma-grouped numbers** (`8,500,000`) → stripped to integer
- **USD prices** (`1,400$`, `700$`) → converted at 50 EGP/USD rate
- **"per meter"** or **"negotiable"** → mapped to "Price on Call"
- **Sale prices** (≥1M) detected even when `Type` says "rent" — heuristic override

## Status Mapping

| Source Values | Master Status |
|---|---|
| `Available` | `Available for Rent` |
| `No answer` | `No Answer` |
| `Not available` | `Unavailable` |
| `Follow up` | `Follow Up` |
| `Sold`, `اتباعت`, `تم الايجار` | `Unavailable` |
