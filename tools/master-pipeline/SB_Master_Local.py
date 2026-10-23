"""
Sierra Blue - Local Master Merge Tool
=======================================
Scans I:\\Alpha for all .xlsx files, reads EVERY sheet in each,
maps scattered/messy columns into a unified schema, normalizes phone
numbers, deduplicates, and produces I:\\Beta\\Local_Master.xlsx

This does NOT delete or modify any original files. Read-only on input.
"""

import os
import re
import sys
from datetime import datetime

import pandas as pd
from openpyxl import load_workbook

# ────────────────────────────────────────
#  CONFIG
# ────────────────────────────────────────

INPUT_FOLDER = r"I:\Alpha"
OUTPUT_FOLDER = r"I:\Beta"
OUTPUT_FILE = os.path.join(OUTPUT_FOLDER, "Local_Master.xlsx")

# Unified target schema (order matters - this is the final column order)
MASTER_COLUMNS = [
    "Name", "Mobile", "Price", "Rooms", "Location",
    "Type", "Deal", "Listed_By", "Availability", "Code",
    "Source_Sheet", "Timestamp"
]
# Type      = property kind (Apartment, Villa, ...)
# Deal      = operation (Rent, Resale)
# Listed_By = Owner or Broker

# Keywords used to detect which source column maps to which master column.
# Checked against lowercased header text (Arabic headers kept as-is).
COLUMN_HINTS = {
    "Name":         ["name", "اسم", "الاسم", "owner name", "client"],
    "Mobile":       ["mobile", "phone", "تليفون", "موبايل", "رقم", "whatsapp", "contact"],
    "Price":        ["price", "سعر", "amount", "cost", "value"],
    "Rooms":        ["room", "غرف", "bedroom", "br"],
    "Location":     ["location", "موقع", "compound", "كمبوند", "منطقة", "area", "project"],
    "Type":         ["type", "نوع", "property type", "unit type"],
    "Deal":         ["deal", "rent", "sale", "ايجار", "بيع", "resale", "إيجار"],
    "Availability": ["available", "availab", "status", "متاح"],
    "Code":         ["code", "كود", "ref", "id"],
}

# Classification keywords (used as fallback if Type/Deal columns are missing or ambiguous)
OWNER_KEYWORDS = ["مالك", "owner", "مالكة", "owener", "owenr", "0wner"]
BROKER_KEYWORDS = ["بروكر", "broker", "وسيط"]
RENT_KEYWORDS = ["إيجار", "ايجار", "rental", "for rent", "rent"]
RESALE_KEYWORDS = ["بيع", "sell", "for sale", "ريسيل", "resale", "sale"]


# ────────────────────────────────────────
#  PHONE NORMALIZATION
# ────────────────────────────────────────

def normalize_phone(val):
    """Standardize phone numbers to 11-digit Egyptian local format for dedup matching."""
    if pd.isna(val) or str(val).strip() in ["", "N/A", "nan", "None"]:
        return ""

    phone = re.sub(r'[^0-9]', '', str(val).strip())
    if len(phone) == 0:
        return ""

    if phone.startswith("20") and len(phone) > 10:
        phone = "0" + phone[2:]
    elif phone.startswith("966") and len(phone) > 10:
        phone = "0" + phone[3:]
    elif phone.startswith("971") and len(phone) > 10:
        phone = "0" + phone[3:]
    elif phone.startswith("00"):
        phone = phone[2:]
        if phone.startswith("20"):
            phone = "0" + phone[2:]
        elif phone.startswith("966"):
            phone = "0" + phone[3:]
        elif phone.startswith("971"):
            phone = "0" + phone[3:]

    if not phone.startswith("0") and len(phone) == 10:
        phone = "0" + phone

    if len(phone) > 11:
        phone = phone[-11:]

    return phone


# ────────────────────────────────────────
#  COLUMN MAPPING (finds real data regardless of position)
# ────────────────────────────────────────

def map_columns(df):
    """
    Given a raw sheet DataFrame, figure out which of its columns correspond
    to which master field, by header text AND by scanning cell content
    patterns (e.g. a column full of 11-digit numbers = Mobile, even if
    the header is missing or wrong).
    """
    mapping = {}
    headers = [str(c).strip().lower() for c in df.columns]

    # Pass 1: header-based matching
    for master_col, hints in COLUMN_HINTS.items():
        for i, h in enumerate(headers):
            if any(hint in h for hint in hints):
                mapping[master_col] = df.columns[i]
                break

    # Pass 2: content-based fallback for Mobile if not found by header
    if "Mobile" not in mapping:
        for col in df.columns:
            sample = df[col].dropna().astype(str).head(30)
            digit_like = sample.apply(lambda x: bool(re.search(r'\d{8,}', x)))
            if len(sample) > 0 and digit_like.mean() > 0.5:
                mapping["Mobile"] = col
                break

    return mapping


def classify_deal(row_text):
    """Fallback classification: Rent vs Resale based on row text content."""
    text = row_text.lower()
    if any(k in text for k in RENT_KEYWORDS):
        return "Rent"
    if any(k in text for k in RESALE_KEYWORDS):
        return "Resale"
    return ""


def classify_type_owner_broker(row_text):
    """Fallback classification: Owner vs Broker based on row text content."""
    text = row_text.lower()
    if any(k in text for k in OWNER_KEYWORDS):
        return "Owner"
    if any(k in text for k in BROKER_KEYWORDS):
        return "Broker"
    return ""


# ────────────────────────────────────────
#  MAIN EXTRACTION
# ────────────────────────────────────────

def extract_sheet(df, source_label):
    """Convert one raw sheet into rows matching MASTER_COLUMNS."""
    if df.empty:
        return pd.DataFrame(columns=MASTER_COLUMNS)

    mapping = map_columns(df)
    out_rows = []

    # Precompute sheet-level majority for Owner/Broker fallback
    owner_count = 0
    broker_count = 0
    full_text_rows = df.astype(str).apply(lambda r: " ".join(r.values), axis=1)
    for t in full_text_rows:
        tl = t.lower()
        if any(k in tl for k in OWNER_KEYWORDS):
            owner_count += 1
        elif any(k in tl for k in BROKER_KEYWORDS):
            broker_count += 1
    sheet_majority_type = "Owner" if owner_count >= broker_count else "Broker"

    for idx, row in df.iterrows():
        row_text = str(full_text_rows[idx])

        record = {}
        for master_col in MASTER_COLUMNS:
            if master_col in mapping:
                val = row.get(mapping[master_col], "")
                record[master_col] = val
            else:
                record[master_col] = ""

        # Skip fully blank rows
        if all(str(v).strip() in ["", "nan", "None"] for v in record.values()):
            continue

        # Normalize phone now (keep original display value, add clean version separately later)
        record["Mobile"] = record["Mobile"] if record["Mobile"] not in ["", "nan", "None"] else "N/A"

        # Fill Deal (Rent/Resale) if missing or ambiguous
        if not record["Deal"] or str(record["Deal"]).strip() in ["", "nan", "None"]:
            record["Deal"] = classify_deal(row_text) or "Rent"
        else:
            # Deal column existed but might contain raw descriptive text - re-classify if it
            # doesn't already look like a clean "Rent"/"Resale" value
            if str(record["Deal"]).strip().lower() not in ["rent", "resale"]:
                d = classify_deal(str(record["Deal"]))
                if d:
                    record["Deal"] = d

        # Type stays as property kind (Apartment/Villa/etc) - leave as-is from mapping,
        # do NOT overwrite with Owner/Broker classification.

        # Listed_By = Owner or Broker (separate column, row-level then sheet-majority fallback)
        record["Listed_By"] = classify_type_owner_broker(row_text) or sheet_majority_type

        record["Source_Sheet"] = source_label
        record["Timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        out_rows.append(record)

    return pd.DataFrame(out_rows, columns=MASTER_COLUMNS)


# ────────────────────────────────────────
#  SCAN LOCAL FOLDER
# ────────────────────────────────────────

def scan_local_folder():
    if not os.path.isdir(INPUT_FOLDER):
        print(f"ERROR: Folder not found: {INPUT_FOLDER}")
        sys.exit(1)

    all_frames = []
    files = [f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith(".xlsx")]

    if not files:
        print(f"No .xlsx files found in {INPUT_FOLDER}")
        return pd.DataFrame(columns=MASTER_COLUMNS)

    print(f"Found {len(files)} Excel file(s) in {INPUT_FOLDER}\n")

    for fname in files:
        fpath = os.path.join(INPUT_FOLDER, fname)
        print(f"Reading: {fname}")
        try:
            xls = pd.ExcelFile(fpath)
        except Exception as e:
            print(f"  [SKIPPED - could not open] {e}")
            continue

        for sheet_name in xls.sheet_names:
            try:
                raw = pd.read_excel(fpath, sheet_name=sheet_name)
            except Exception as e:
                print(f"  [SKIPPED sheet '{sheet_name}' - {e}]")
                continue

            label = f"{fname} :: {sheet_name}"
            extracted = extract_sheet(raw, label)
            if not extracted.empty:
                all_frames.append(extracted)
                print(f"  Sheet '{sheet_name}': {len(extracted)} rows extracted")
            else:
                print(f"  Sheet '{sheet_name}': 0 rows (empty or unrecognized)")

    if not all_frames:
        return pd.DataFrame(columns=MASTER_COLUMNS)

    return pd.concat(all_frames, ignore_index=True)


# ────────────────────────────────────────
#  DEDUPLICATION
# ────────────────────────────────────────

def deduplicate(df):
    if df.empty or "Mobile" not in df.columns:
        return df, 0

    before = len(df)
    phone_clean = df["Mobile"].apply(normalize_phone)

    has_phone_mask = phone_clean != ""
    has_phone = df[has_phone_mask].copy()
    no_phone = df[~has_phone_mask].copy()

    has_phone["_pc"] = phone_clean[has_phone_mask]
    has_phone = has_phone.drop_duplicates(subset=["_pc"], keep="first")
    has_phone = has_phone.drop(columns=["_pc"])

    result = pd.concat([has_phone, no_phone], ignore_index=True)
    removed = before - len(result)
    return result, removed


# ────────────────────────────────────────
#  MAIN
# ────────────────────────────────────────

def main():
    print("=" * 60)
    print("  SIERRA BLUE - LOCAL MASTER MERGE")
    print("=" * 60)
    print()

    merged = scan_local_folder()

    print()
    print("-" * 60)
    print(f"Total rows extracted (before dedup): {len(merged)}")

    deduped, removed = deduplicate(merged)
    print(f"Duplicates removed (by phone number): {removed}")
    print(f"Final row count: {len(deduped)}")
    print("-" * 60)

    if not os.path.isdir(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    deduped = deduped.fillna("N/A")
    deduped.to_excel(OUTPUT_FILE, index=False, sheet_name="Master")

    print()
    print(f"Saved: {OUTPUT_FILE}")
    print()
    print("Done. This file only READS your originals - nothing in")
    print(f"{INPUT_FOLDER} was modified or deleted.")


if __name__ == "__main__":
    main()
