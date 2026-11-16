---
name: excel-archive-processor
description: Empowers Antigravity and OpenClaw agents to inspect, unpack, read, and extract property listings from Excel spreadsheets (.xlsx, .xls, .csv) and compressed archives (.zip, .rar, .7z, .tar.gz).
---

# Excel & Archive Processor Skill · Antigravity & OpenClaw

> **Status: not yet implemented.** This skill document is aspirational — no
> corresponding code exists in `packages/agents` or elsewhere in the repo.
> An agent following this skill has no archive/spreadsheet-extraction tools
> to invoke; treat every instruction below as a spec for future work, not a
> capability available today.

## Purpose

Enables autonomous handling, extraction, and ingestion of real estate data from compressed archives (`.zip`, `.rar`, `.7z`) and spreadsheets (`.xlsx`, `.xls`, `.csv`, `.tsv`).

---

## 1. Archive Handling (.zip, .rar, .7z)

### Unpacking Commands in Windows PowerShell

- **ZIP Archives**:

  ```powershell
  Expand-Archive -Path "path/to/archive.zip" -DestinationPath "path/to/extracted_dir" -Force
  ```

- **RAR / 7Z Archives** (using built-in Windows Tar or 7-Zip / Python fallback):

  ```powershell
  # Using tar for .tar / .tar.gz / .zip
  tar -xf "path/to/archive.zip" -C "path/to/output_dir"
  ```

- **Python / Node.js programmatic extractor**:

  ```typescript
  import fs from 'node:fs';
  import path from 'node:path';
  // Scan directory for unpacked .txt, .xlsx, .csv files
  ```

---

## 2. Excel & CSV Processing (.xlsx, .xls, .csv)

### CLI & Script Automation

Use `npx tsx` scripts or Node.js packages to parse sheets into JSON:

```bash
# Using openclaw-task-runner for master sheets
npx tsx scripts/openclaw-task-runner.ts ingest:mastersheet
```

### Parsing Logic & Schema Mapping

When parsing an Excel workbook or CSV sheet, map column variations into canonical Sierra Estates properties:

| Common Sheet Header | Canonical Property Field | Types / Examples |
| ------------------- | ------------------------ | ---------------- |
| `Compound`, `Cmp`, `المشروع`, `الكمبوند` | `compound` | `Mivida`, `Hyde Park`, `Madinaty` |
| `Price`, `Total Price`, `السعر`, `المطلوب` | `price` | `18500000` (numeric in EGP) |
| `Type`, `Unit Type`, `نوع الوحدة` | `type` | `Standalone Villa`, `Apartment`, `Penthouse` |
| `Area`, `BUA`, `المساحة` | `area_sqm` | `240` (m²) |
| `Bedrooms`, `Beds`, `غرف` | `bedrooms` | `3`, `4`, `5` |
| `Bathrooms`, `Baths`, `حمامات` | `bathrooms` | `2`, `3`, `4` |
| `Finishing`, `تشطيب`, `حالة التشطيب` | `finishing` | `Ultra Super Lux`, `Core & Shell` |
| `Owner / Broker`, `المالك / وسيط`, `الصفة` | `sourceType` | `'owner'` vs `'broker'` |
| `Mode`, `Sale/Rent`, `العملية` | `operation` | `'Sale'` vs `'Rent'` |
| `Phone`, `Mobile`, `Contact`, `رقم الهاتف` | `contact_info` | `+201012345678` |

---

## 3. Workflow for Ingesting Uploaded Archives & Excel Sheets

1. **Detect File Type**: Check if the uploaded or dropped file is `.zip`, `.rar`, `.xlsx`, `.csv`, or `.txt`.
2. **Unpack & Scan**: Unpack into a workspace directory (e.g. `data/unpacked/`).
3. **Parse Content**:
   - For `.txt` WhatsApp logs $\rightarrow$ Run `npx tsx scripts/extract-whatsapp-chat.ts <file-path>`
   - For `.json` / `.csv` spreadsheets $\rightarrow$ Ingest using `OpenClawAgent.ingestMasterSheet()`
4. **Merge & Reconcile**: Run `npx tsx scripts/merge-inventory-master.ts` to refresh `consolidated-master-inventory.json`.
5. **Verify**: Ensure all units show in the **Admin Portal Listings Hub** (`/admin?view=listings`).
