#!/usr/bin/env python3
"""
SIERRA BLUE - MASTER CONSOLIDATION PIPELINE
============================================
Merges all sheets from Alpha.xlsx (and future Gmail/local files)
into ONE Master.xlsx = single source of truth.

Handles:
  - Different column layouts per sheet (English / Arabic / positional)
  - Phone normalization (Egypt +20, Saudi +966, UAE +971)
  - Deduplication by mobile (keeps most complete row)
  - Source tagging (which sheet/file each row came from)

Usage:
  python master_pipeline.py --input Alpha.xlsx --output Master.xlsx
  python master_pipeline.py --folder "I:\\Alpha" --output Master.xlsx
"""

import pandas as pd
import argparse
import re
import glob
import os
from pathlib import Path
from datetime import datetime

# ============================================================
# UNIFIED MASTER SCHEMA
# ============================================================
MASTER_COLUMNS = [
    "Name", "Mobile", "Price", "Rooms", "Location",
    "Type", "Deal", "Availability", "Code", "Source_Sheet", "Timestamp"
]

# ============================================================
# PHONE NORMALIZATION
# ============================================================
def normalize_phone(value):
    """Standardize any phone format to 11-digit Egyptian local format."""
    if pd.isna(value):
        return None
    # Keep only digits
    digits = re.sub(r"\D", "", str(value))
    if not digits:
        return None

    # Strip country codes
    if digits.startswith("20") and len(digits) > 11:      # Egypt +20
        digits = digits[2:]
    elif digits.startswith("966"):                         # Saudi +966
        digits = digits[3:]
    elif digits.startswith("971"):                         # UAE +971
        digits = digits[3:]

    # Ensure leading 0 for Egyptian mobiles
    if len(digits) == 10 and digits.startswith("1"):
        digits = "0" + digits          # 1XXXXXXXXX -> 01XXXXXXXXX
    elif len(digits) == 11 and digits.startswith("01"):
        pass                            # already correct
    elif len(digits) == 10:
        digits = "0" + digits

    return digits  # returned as string, preserves leading 0


# ============================================================
# PER-SHEET COLUMN MAPPING
# Maps: master_field -> column index in that sheet
# ============================================================
# Col layout for English sheets:
# 0=Timestamp 1=NO 2=updated 3=Name 4=Mobile 5=Availablty 6=bedrooms
# 7=Location 8=UnitPrice 9=Furnished 10=Type(rent/sale) 11=PropertyType 12=Code 13=Owner
SHEET_MAPS = {
    "Owners-Rent": {
        "header_row": 0,
        "map": {"Name": 3, "Mobile": 4, "Availability": 5, "Rooms": 6,
                "Location": 7, "Price": 8, "Type": 11, "Deal": 10, "Code": 12, "Timestamp": 0},
    },
    "Available Properties": {
        "header_row": 0,
        "map": {"Name": 3, "Mobile": 4, "Availability": 5, "Rooms": 6,
                "Location": 7, "Price": 8, "Type": 11, "Deal": 10, "Code": 12, "Timestamp": 0},
    },
    "Not Available Properties": {
        "header_row": 0,
        "map": {"Name": 3, "Mobile": 4, "Availability": 5, "Rooms": 6,
                "Location": 7, "Price": 8, "Type": 11, "Deal": 10, "Code": 12, "Timestamp": 0},
    },
    # Arabic: 0=Name 1=phone 2=compound 3=price 4=unittype 5=area 7=avail 8=deal 14=code 17=date
    "Owners-Resale ": {
        "header_row": 0,
        "map": {"Name": 0, "Mobile": 1, "Location": 2, "Price": 3,
                "Type": 4, "Rooms": None, "Availability": 7, "Deal": 8, "Code": 14, "Timestamp": 17},
    },
    # Arabic: 0=rooms 1=price 2=proptype 3=location 4=baths 5=area 6=deal 7=date 8=sender
    "Team Units": {
        "header_row": 0,
        "map": {"Rooms": 0, "Price": 1, "Type": 2, "Location": 3,
                "Deal": 6, "Timestamp": 7, "Name": 8, "Mobile": None, "Code": None},
    },
    # Positional: 0=date 1=brokertype 2=name 3=phone 4=code 5=location 6=price 7=avail 11=proptype 12=deal
    "Brokers": {
        "header_row": None,
        "map": {"Timestamp": 0, "Name": 2, "Mobile": 3, "Code": 4,
                "Location": 5, "Price": 6, "Availability": 7, "Type": 11, "Deal": 12},
    },
}

# Sheets to skip entirely
SKIP_SHEETS = {"Dashboard", "Calc_Data"}


# ============================================================
# EXTRACT ROWS FROM ONE SHEET
# ============================================================
def extract_sheet(file_path, sheet_name, config):
    """Pull rows from one sheet and map to master schema."""
    header_row = config["header_row"]
    col_map = config["map"]

    # Read raw (no header) so index positions are stable
    raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)

    # Determine where data starts
    start = (header_row + 1) if header_row is not None else 0
    data = raw.iloc[start:].reset_index(drop=True)

    out = pd.DataFrame()
    for field in MASTER_COLUMNS:
        if field == "Source_Sheet":
            out[field] = [sheet_name.strip()] * len(data)
        elif field in col_map and col_map[field] is not None:
            idx = col_map[field]
            if idx < data.shape[1]:
                out[field] = data.iloc[:, idx].values
            else:
                out[field] = None
        else:
            out[field] = None

    return out


# ============================================================
# CLEAN + CONSOLIDATE
# ============================================================
def clean_row_completeness(df):
    """Score each row by how many key fields are filled (for dedup priority)."""
    key_fields = ["Name", "Price", "Rooms", "Location", "Type", "Code"]
    df["_score"] = df[key_fields].notna().sum(axis=1)
    return df


def process_file(file_path):
    """Process ALL sheets of one Excel file into unified rows."""
    xl = pd.ExcelFile(file_path)
    frames = []

    for sheet in xl.sheet_names:
        clean_name = sheet.strip()
        if clean_name in SKIP_SHEETS:
            print(f"   ⏭️  Skipped: {clean_name}")
            continue
        # Find config (handle trailing spaces in sheet names)
        config = SHEET_MAPS.get(sheet) or SHEET_MAPS.get(clean_name)
        if not config:
            print(f"   ⚠️  No mapping for: {clean_name} — skipped")
            continue
        try:
            df = extract_sheet(file_path, sheet, config)
            # keep rows that have EITHER a mobile OR a name (Team Units has no phone)
            df = df[df["Mobile"].notna() | df["Name"].notna()]
            frames.append(df)
            print(f"   ✅ {clean_name}: {len(df)} rows")
        except Exception as e:
            print(f"   ❌ {clean_name}: {e}")

    if not frames:
        return pd.DataFrame(columns=MASTER_COLUMNS)
    return pd.concat(frames, ignore_index=True)


def build_master(all_data):
    """Normalize, dedup, finalize."""
    df = all_data.copy()

    # Normalize phones
    df["Mobile"] = df["Mobile"].apply(normalize_phone)

    # Drop rows with no name AND no mobile (junk)
    df = df[~(df["Name"].isna() & df["Mobile"].isna())]

    # Completeness score for dedup priority
    df = clean_row_completeness(df)

    # Sort so most-complete rows come first, then dedup by Mobile
    df = df.sort_values("_score", ascending=False)

    before = len(df)
    # Dedup: rows WITH a mobile → dedup by mobile; rows without → keep all
    has_mobile = df[df["Mobile"].notna()].drop_duplicates(subset=["Mobile"], keep="first")
    no_mobile = df[df["Mobile"].isna()]
    df = pd.concat([has_mobile, no_mobile], ignore_index=True)
    after = len(df)

    df = df.drop(columns=["_score"])

    # Final column order (priority fields first — already are)
    df = df[MASTER_COLUMNS]

    print(f"\n🔁 Deduplication: {before} → {after} rows ({before-after} duplicates removed)")
    return df


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="Sierra Blue Master Consolidation")
    parser.add_argument("--input", help="Single Excel file")
    parser.add_argument("--folder", help="Folder of Excel files (e.g. I:\\Alpha)")
    parser.add_argument("--output", default="Master.xlsx", help="Output file")
    args = parser.parse_args()

    files = []
    if args.input:
        files = [args.input]
    elif args.folder:
        files = glob.glob(os.path.join(args.folder, "*.xlsx"))
    else:
        print("❌ Provide --input or --folder")
        return

    print("="*60)
    print("🏢 SIERRA BLUE — MASTER CONSOLIDATION")
    print("="*60)

    all_frames = []
    for f in files:
        print(f"\n📂 Processing: {Path(f).name}")
        all_frames.append(process_file(f))

    combined = pd.concat(all_frames, ignore_index=True)
    print(f"\n📊 Total raw rows collected: {len(combined)}")

    master = build_master(combined)

    # Save
    master.to_excel(args.output, index=False, sheet_name="Master")
    print(f"\n✅ SAVED: {args.output}")
    print(f"   Final: {len(master)} unique rows × {len(master.columns)} columns")

    # Quick summary by source
    print("\n📋 Rows by source sheet:")
    print(master["Source_Sheet"].value_counts().to_string())


if __name__ == "__main__":
    main()
