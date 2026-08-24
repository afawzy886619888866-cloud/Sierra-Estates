---
name: real-estate-excel-processor
description: >-
  Standalone real estate data processor for Sierra Estates. Use this skill when
  the user asks to run, deploy, fix, extend, or explain the Real Estate Processor
  GUI tool. This tool ingests Excel spreadsheets (.xls/.xlsx) and WhatsApp chat
  exports (.txt) from a source folder, normalises Arabic/English column headers,
  deduplicates listings by phone+price+deal type, and exports a styled
  Final_RealEstate_Database.xlsx with sheets for Summary, All_Units, Owners_Rent,
  Owners_Sale, Brokers_Rent, and Brokers_Sale. The script is a single Python file
  with a Tkinter GUI — no terminal required. Trigger this skill for any task
  involving: running or launching the processor, debugging parse errors, adding
  new compound names, adjusting column synonym mappings, changing the USD→EGP
  rate, modifying deduplication logic, or extending the WhatsApp parser.
---

# Real Estate Excel Processor Skill

A single-file, double-click Python GUI tool that consolidates real estate
listings from Excel sheets and WhatsApp exports into one clean, deduplicated
Excel database — no terminal, no setup wizard.

## Script Location

The canonical script lives at:
`.agents/skills/real-estate-excel-processor/scripts/real_estate_processor.py`

---

## Architecture Overview

```
real_estate_processor.py
├── CONFIG          – Constants: USD_TO_EGP, ID_PREFIX, SKIP_FILES/SHEETS
├── COLUMN_SYNONYMS – Bi-lingual header→field mapping dict (Arabic + English)
├── COMPOUNDS       – Regex patterns for 18 known Egyptian compounds
├── HELPERS         – Pure functions: clean_val, normalize_phone, parse_price,
│                     parse_date, normalize_deal, normalize_compound, map_cols,
│                     find_header
├── WHATSAPP        – parse_whatsapp() + extract_msg() for .txt chat exports
├── PIPELINE        – run_pipeline(): orchestrates load → clean → dedup → export
├── style_file()    – openpyxl post-processing: freeze panes, auto-filter,
│                     header fill, column widths, price number format
└── GUI             – tkinter App class + Redirector (stdout → log widget)
```

---

## Key Configuration Constants

| Constant | Default | Purpose |
|---|---|---|
| `USD_TO_EGP` | `48.0` | Currency conversion rate |
| `ID_PREFIX` | `"SB"` | Prefix for generated Unit IDs (e.g. SB-0001) |
| `SKIP_FILES` | `("Final_", "~$", "Missing_")` | File name prefixes to ignore |
| `SKIP_SHEETS` | `("dashboard", "summary", "pivot", "تعليمات")` | Sheet names to skip |

---

## Adding a New Compound

Add an entry to the `COMPOUNDS` dict in the CONFIG section:

```python
"Compound English Name": [r"arabic_pattern", r"english_pattern"],
```

Patterns are Python regex strings matched case-insensitively against the
combined `Location + Notes` fields.

---

## Adding a New Column Synonym

Add the alias to the appropriate list in `COLUMN_SYNONYMS`:

```python
"Unit_Code": ["code", "كود", "your_new_alias", ...],
```

All matching is lowercase substring, so short aliases should be specific enough
to avoid false positives.

---

## Pipeline Steps (run_pipeline)

1. **Load** — Glob `**/*.xls*` recursively; auto-detect header row (up to row 10)
   using `find_header()` / `map_cols()`.
2. **Load WhatsApp** — Glob `**/*.txt`; parse message timestamps + phone numbers
   using regex; extract price, area, rooms, unit code via inline regex.
3. **Concat** — All DataFrames unified with `pd.concat`.
4. **Normalize phones** — Egyptian numbers → 11-digit `01XXXXXXXXX` format.
   Rows with no valid phone are dropped.
5. **Parse prices** — Handles EGP/USD, millions (مليون/million), thousands
   (الف/k), comma/period separators.
6. **Price sanity fix** — Bare small numbers (< 100) auto-multiplied by 1M
   (sale) or 1K (rent).
7. **Deduplicate** — Key: `Phone_Last7 | Price_EGP_rounded | Deal_Clean`.
   Keeps the most-recently-updated record; aggregates listing count and all
   known unit codes.
8. **Export** — `Final_RealEstate_Database.xlsx` with sheets:
   `Summary`, `All_Units`, `Owners_Rent`, `Owners_Sale`, `Brokers_Rent`,
   `Brokers_Sale`.
9. **Style** — Freeze row 1, auto-filter, dark blue header, Segoe UI font,
   auto-column widths, price number format.

---

## Running the GUI

```bash
# Double-click in Explorer, or:
python .agents/skills/real-estate-excel-processor/scripts/real_estate_processor.py
```

First run: click **📦 Install Deps** to auto-install `numpy`, `pandas`,
`openpyxl` via `pip` (hidden console on Windows).

---

## Dependencies

| Package | Purpose |
|---|---|
| `pandas` | DataFrame engine |
| `numpy` | Numeric helpers |
| `openpyxl` | Excel read/write + styling |
| `tkinter` | GUI (stdlib, always available) |

---

## Output Schema (All_Units sheet)

| Column | Source Field | Notes |
|---|---|---|
| `Unit_ID` | Generated | `SB-XXXX` sequential |
| `Phone` | `Phone_Clean` | Normalised 11-digit |
| `Phone_Last7` | Derived | Dedup suffix |
| `Deal` | `Deal_Clean` | Rent / Sale / Unknown |
| `Status` | Derived | Active / Sold / Rented |
| `Advertiser_Type` | `Advertiser_Clean` | Owner / Broker / Unknown |
| `Availability` | `Availability_Clean` | — |
| `Price_EGP` | Converted | Always in EGP |
| `Price_Raw` | `Price` | Original parsed numeric |
| `Currency` | Detected | EGP / USD |
| `Compound` | `Location_Clean` | Normalised compound name |
| `Unit_Type` | `Unit_Type_Clean` | — |
| `Area_m2` | `Area_Num` | Numeric only |
| `Rooms` | `Rooms_Num` | Numeric only |
| `Bathrooms` | `Bathrooms_Num` | Numeric only |
| `Furnishing` | `Furnishing_Clean` | — |
| `Finishing` | `Finishing_Clean` | — |
| `Owner_Name` | `Owner_Name_Clean` | — |
| `Contact_Person` | `Contact_Name_Clean` | — |
| `Unit_Code` | `Unit_Code_Clean` | Uppercase, stripped |
| `All_Original_Codes` | Aggregated | Comma-separated across duplicates |
| `First_Seen` | `Listing_Date_Clean` | Earliest date seen |
| `Latest_Update` | `Update_Date_Clean` | Most recent update |
| `Days_Advertised` | Derived | Latest − First |
| `Listings_Count` | Aggregated | How many raw rows merged |
| `Source_File` | Filename | — |
| `Source_Sheet` | Sheet/WhatsApp | — |
| `Notes` | `Notes_Clean` | Up to 500 chars from WhatsApp |

---

## Common Modifications

### Change exchange rate
```python
USD_TO_EGP = 50.0  # top of file
```

### Change output ID prefix
```python
ID_PREFIX = "SE"  # top of file
```

### Skip an additional sheet name
```python
SKIP_SHEETS = ("dashboard", "summary", "pivot", "تعليمات", "my_sheet")
```

### Extend WhatsApp phone regex
Edit `WA_PHONE` at the top of the WHATSAPP section to add more number formats.

---

## Verification

After running, check the **Summary** sheet in the output Excel for:
- `Total` — raw rows loaded
- `Dropped (no phone)` — filter effectiveness
- `Unique` — final record count
- `Duplicates removed` — dedup effectiveness
- `Duration (s)` — performance baseline
