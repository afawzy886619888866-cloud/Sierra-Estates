---
name: real-estate-excel-processor
description: >-
  Authoritative Real Estate Inventory & Excel Processing Engine for Sierra Estates.
  Governs end-to-end ingestion, bilingual column normalization, strict advertiser
  classification (owner-clue rule vs default broker), phone Last-7 and price deduplication,
  >400k price threshold routing between Rent and Resale, Property Finder ad syndication sheets,
  and formatting standards across Excel workbooks.
---

# Sierra Estates Master Real Estate Excel Engine & Processing Skill

This skill defines the canonical rules, architectural standards, and data processing workflows for consolidating, deduplicating, classifying, and exporting Sierra Estates' multi-source real estate listings across historical Excel workbooks, Google Sheets exports, CRM records, and WhatsApp channels.

---

## 1. Core Architectural Tenets & Invariant Rules

### Rule 1: Advertiser Classification (Explicit Owner Evidence Required — Never Group Name Alone)

- **Group Name / Sheet Name / File Name Alone Is Not Evidence**: Merely originating from an "August Owners" group, an "Owners" spreadsheet, or a group with "owner" in the title does **NOT** qualify a listing as Direct Owner.
- **`Direct Owner` Qualification Requires Explicit Internal Clues**: A listing is placed in the **`Owners`** sheet *only* if explicit evidence is present within the listing's own data fields:
  1. **Advertiser / Role Column**: Explicitly contains `owner`, `مالك`, `صاحب العقار`, `صاحب الشأن`, `direct owner` (and not broker, agency, or group intake).
  2. **Contact Person**: Contains `المالك`, `owner`, or `صاحب` (and not broker/marketing).
  3. **Listing Description / Notes**: Contains explicit phrases such as `من المالك`, `من المالك مباشرة`, `أنا المالك`, `المالك مباشر`, `المالك نفسه`, `صاحب الشقة`, `صاحب الوحدة`, `صاحب العقار`, `مالك الوحدة`, `مالك الشقة`, `direct from owner`, `from the owner`, `owner directly`, `by owner`, `fsbo`, `frbo`.
- **Default & Fallback is `Broker`**: Any listing removed from the Owners sheet because it lacks explicit owner evidence is moved directly to the **`Brokers`** sheet and deduplicated by `(phone_last7, price)`.

---

### Rule 1.1: Client & Buyer Requests Isolation ("REQUESTED" / "مطلوب" Are Not Real Listings)

- **Buyer & Tenant Requests Are Not Inventory**: Messages containing request terminology represent clients searching for properties to buy or rent, **NOT** available property listings.
- **Request Detection Patterns**:
  - English: `request`, `requested`, `urgent request`, `looking for`, `buyer request`, `client request`.
  - Arabic: `مطلوب للشراء`, `مطلوب للايجار`, `مطلوب للإيجار`, `مطلوب فورا`, `مطلوب كود`, `طلب عميل`, `مطلوب شقة`, `مطلوب فيلا`, `مطلوب دوبلكس`, `مطلوب تاون`, `مطلوب توين`, `مطلوب ستوديو`, `مطلوب ارض`, `مطلوب مقر`, `مطلوب صيدلية`, `مطلوب محل`, `مطلوب من المالك`, `محتاج شقة`, `محتاج فيلا`, or text beginning with `مطلوب` not followed by a price/currency.
- **Dedicated Requests Sheet**: All identified requests must be isolated into a dedicated **`Client_Requests`** sheet in both Rent and Resale master workbooks. They must **never** be mixed into `Owners` or `Brokers` available inventory sheets.

---

### Rule 2: Multi-Tier Deduplication Strategy

Different listing sources require distinct deduplication keys to prevent over-collapsing broker inventories while accurately consolidating owner listings:

1. **Unit Code Key (Primary)**:
   - If clean `Sierra_Code` (or reference ID) is present, length > 3, and not a generic placeholder (`NAN`, `VILLA`, `APARTMENT`, `UNIT`, `0`), matching codes always merge.
2. **Broker Listings Deduplication Key**:
   - **Key**: `(Broker_Phone_Last7, round(Price_EGP))`
   - **Rationale**: A broker often markets multiple distinct properties at different prices using their own single phone number. These distinct properties must **never** be collapsed into one. However, if the same broker lists the *same property at the same price* across multiple spreadsheets or updates, it is deduplicated.
3. **Direct Owner Listings Deduplication Key**:
   - **Key**: `Owner_Phone_Last7`
   - **Rationale**: A property owner represents their individual real estate holding. Multiple spreadsheet rows from the same owner phone number collapse into a single consolidated record, retaining the most complete details.
4. **Cross-Channel Resolution**:
   - If a broker listing shares the exact phone number and rounded price with a direct owner listing, they merge, and the resulting record is assigned to `Direct Owner`.
5. **Information Absorption during Merge**:
   - Retain the highest-fidelity primary record (prioritizing: photo URLs > unit code > specific compound > area > bedrooms > description length).
   - Merge all aliases/codes into `All_Codes` (sorted, pipe-delimited).
   - Merge all unique photo URLs (newline-delimited).
   - Absorb missing area, bedrooms, bathrooms, finishing status, and contact names from secondary records.

---

### Rule 3: Price Routing Logic (Rent vs Resale Threshold)

The single source of truth for segregating Rent and Resale deals is the **400,000 EGP** threshold:

- **`Price > 400,000 EGP`**: Strictly routed to **`Sierra_Estates_Resale_Master.xlsx`** (`Sale`). Even if originally labelled as rent in a messy sheet, any listing above 400,000 EGP is reclassified as Resale.
- **`0 < Price <= 400,000 EGP`**: Strictly routed to **`Sierra_Estates_Rent_Master.xlsx`** (`Rent`). Any listing under or equal to 400,000 EGP is classified as Rent.
- **`Price == 0`**: Falls back to original sheet/file deal type.

---

### Rule 4: Phone Normalization & Number Formatting Standards

All phone numbers and numeric fields must adhere to strict formatting to prevent scientific notation, lost leading zeros, or corrupted string artifacts:

1. **Float String Stripping**:
   - Excel often exports phone numbers as floats (e.g. `1067849072.0`). Stripping `.0` or `.00` before digit extraction is mandatory:

     ```python
     s = re.sub(r'\.0+$', '', str(val).strip())
     ```

2. **Scientific Notation Handling**:
   - Strings like `1.067849072E+09` must be cast through `int(float(s))` before regex.
3. **Leading Zero Restoration**:
   - 10-digit mobile numbers starting with `10`, `11`, `12`, `15` must have `0` prepended → `01xxxxxxxxx`.
   - International prefixes (`+20`, `0020`, `20`) must be stripped.
4. **Last 7 Digits Extraction**:
   - Egyptian mobile subscriber numbers are the last 7 digits (`digits[-7:]`). Used for deduplication and presented in the `Phone (Last 7)` column.
5. **Excel Storage Format**:
   - Phone numbers must **always** be written as strings to cells formatted as Text (`@`):

     ```python
     cell.value = str(phone)
     cell.number_format = '@'
     cell.alignment = Alignment(horizontal="center", vertical="center")
     ```

6. **Numeric Formatting**:
   - `Price`: Integer formatted as `#,##0 "EGP"` (right-aligned).
   - `Area`: Integer formatted as `#,##0` (center-aligned).
   - `Bedrooms` & `Bathrooms`: Integer formatted as `0` (center-aligned).

---

## 2. Final Workbook Structure & Distribution

The pipeline produces exactly **2 final workbooks**:

### Workbook 1: `Sierra_Estates_Rent_Master.xlsx`

- **Sheet 1 (`Owners_Rent`)**: All verified direct owner rental listings.
- **Sheet 2 (`Brokers_Rent`)**: All broker-sourced rental listings.
- **Sheet 3 (`Property_Finder_Ads`)**: High-priority rental listings with verified photos, structured with Property Finder XML syndication columns (`RR`, `Monthly`, property types `AP`/`VH`/`TW`/`TH`, bilingual titles & descriptions).

### Workbook 2: `Sierra_Estates_Resale_Master.xlsx`

- **Sheet 1 (`Owners_Resale`)**: All verified direct owner resale listings.
- **Sheet 2 (`Brokers_Resale`)**: All broker-sourced resale listings.
- **Sheet 3 (`Property_Finder_Ads`)**: High-priority resale listings with verified photos, structured for Property Finder XML syndication (`RS`).

*Note*: Main sheets (`Owners_*` and `Brokers_*`) must retain **all listings**, including those featured in Sheet 3 (`Property_Finder_Ads`).

---

### Distribution Locations

Every run synchronizes the output workbooks across:

1. `C:\Users\Sierr\Downloads\Sheets\` (Root contains **ONLY** the 2 final workbooks; all raw files preserved in `_raw_sheets_archive/`).
2. Project Root: `H:\last\Main\SE-Vercel-deploy-main\`
3. Project Data Directory: `H:\last\Main\SE-Vercel-deploy-main\data\`
4. App Data Directory: `H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\data\`
5. Property Finder XML Feed: `H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\feeds\propertyfinder-full-feed.xml`
6. Interactive Map Geospatial Feeds: `consolidated-master-inventory.json` and `real-listings.json`.

---

## 3. Canonical Execution Script

To run or re-generate the entire master pipeline:

```bash
python scratch/execute_last7_phone_price_dedup.py
```

This single command executes:

1. Recursive harvest of all files in `_raw_sheets_archive` and downloads directory.
2. Clue-based advertiser classification (Default Broker, Explicit Owner).
3. Dual-mode deduplication (Broker: Phone Last 7 + Price; Owner: Phone Last 7).
4. Price logic routing at 400,000 EGP.
5. Professional openpyxl workbook rendering with Dark Slate `#0F172A` headers, alternating fills `#F8FAFC`, status pills, and text phone numbers.
6. Downstream XML and JSON feed compilation.
