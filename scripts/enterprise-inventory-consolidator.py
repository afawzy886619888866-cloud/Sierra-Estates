# -*- coding: utf-8 -*-
# pyright: reportAttributeAccessIssue=false, reportCallIssue=false
"""
Enterprise Real Estate Inventory Consolidator — Sierra Estates
--------------------------------------------------------------
• Recursive folder scan for Excel (.xlsx/.xls), CSV (.csv), and ZIP/WhatsApp (.txt)
• Deduplication: (last 7 digits of phone) + price + deal type
• Keeps First_Seen & Latest_Update tracking across runs
• Ordered columns: Last_Update · First_Seen · Availability (dropdown) …
• Styled openpyxl export with per-sheet tabs:
  1. Summary (Executive KPI metrics & compound distribution)
  2. Master_Inventory (All deduplicated units)
  3. Owners_Rent (Direct Owners - Rent)
  4. Owners_Sale (Direct Owners - Sale)
  5. Brokers_Rent (Brokers - Rent)
  6. Brokers_Sale (Brokers - Sale)
• Moves processed source files to _Processed_Archive to clean the working folders
• Accepts CLI args: --source_dir, --no-archive, --output, --json
"""

import argparse
import glob
import json
import os
import re
import shutil
import sys
import time
import zipfile

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8")

import numpy as np
import openpyxl
import pandas as pd
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ──────────────────────────────────────────────────────────────────────────────
# Compound recognition patterns (Arabic + English + codes)
# ──────────────────────────────────────────────────────────────────────────────
COMPOUNDS_DB = {
    "Madinaty": [r"مدينت[يى]", r"\bmadinat[yi]\b", r"\bb[1-9]\b", r"\bb1[0-4]\b"],
    "Al Rehab": [r"الرحاب", r"\brehab\b"],
    "Mivida": [r"ميفيدا", r"\bmivida\b"],
    "Hyde Park": [r"هايد\s*بارك", r"\bhyde\s*park\b"],
    "Mountain View": [r"ماونتن\s*فيو", r"\bmountain\s*view\b", r"\bmv\b", r"\biity\b"],
    "Villette Sodic": [r"فيليت", r"\bvillette\b", r"سوديك"],
    "Palm Hills": [r"بالم\s*هيلز", r"\bpalm\s*hills\b", r"\bpk\b"],
    "Eastown": [r"ايست\s*تاون", r"إيست\s*تاون", r"\beastown\b"],
    "Swan Lake": [r"سوان\s*ليك", r"\bswan\s*lake\b"],
    "Fifth Square": [r"المراسم", r"فيفث\s*سكوير", r"\bfifth\s*square\b"],
    "Beit El Watan": [r"بيت\s*الوطن", r"\bbeit\s*el\s*watan\b"],
    "Taj City": [r"تاج\s*سيتي", r"\btaj\s*city\b"],
    "New Capital": [r"العاصمة", r"العاصمه", r"\bnew\s*capital\b", r"\br[78]\b"],
    "Fifth Settlement": [r"التجمع", r"\b5th\s*settlement\b", r"القاهرة الجديدة"],
    "New Cairo": [r"القاهرة الجديدة", r"\bnew\s*cairo\b"],
    "Cairo Festival City": [r"كايرو فستيفال", r"\bcfc\b", r"\bcairo\s*festival\b"],
    "Mostakbal City": [r"مستقبل\s*سيتي", r"\bmostakbal\b"],
    "El Shrouk": [r"الشروق", r"\bel\s*shrouk\b"],
    "Badr": [r"\bبدر\b", r"\bbadr\s*city\b"],
    "Katameya Dunes": [r"ديونز", r"\bdunes\b"],
    "Sheikh Zayed": [r"الشيخ\s*زايد", r"\bzayed\b"],
    "North Coast": [r"الساحل\s*الشمالي", r"\bnorth\s*coast\b"],
}

# ──────────────────────────────────────────────────────────────────────────────
# Column synonym map → canonical column name
# ──────────────────────────────────────────────────────────────────────────────
COLUMN_MAP = {
    "Phone": [
        "mobile", "phone", "تليفون", "موبايل", "رقم الهاتف", "broker phone",
        "contact", "whatsapp", "contact_info"
    ],
    "Price_Raw": [
        "price", "السعر", "الإيجار", "ايجار", "المطلوب", "unit price",
        "total price", "price_egp", "price_raw", "rent display"
    ],
    "Owner_Name": [
        "اسم المالك", "owner name", "الاسم", "name", "client name", "العميل",
        "owner_name", "owner"
    ],
    "Contact_Name": [
        "broker name", "اسم البروكر", "المعلن", "contact person", "contact_name"
    ],
    "Listing_Date": [
        "timestamp", "listing date", "تاريخ العرض", "تاريخ الإعلان", "date",
        "listing_date", "created_at"
    ],
    "Update_Date": [
        "تاريخ اخر تحديث", "update date", "last update", "update_date"
    ],
    "Availability": [
        "availability", "availablty", "avail", "الحالة", "المتاحية", "status"
    ],
    "Rooms": [
        "bedrooms", "عدد الغرف", "الغرف", "rooms", "نوم", "beds"
    ],
    "Location": [
        "location", "المنطقة والكمبوند", "الكمبوند", "الموقع", "compound",
        "zone", "sub area"
    ],
    "Furnishing": [
        "furnishing", "حالة التأثيث", "التأثيث", "مفروش", "furnished",
        "furnished or not"
    ],
    "Finishing": [
        "تشطيب", "finishing", "حالة التشطيب"
    ],
    "Unit_Type": [
        "property type", "property tybe", "unit type", "نوع الوحدة", "النوع",
        "type"
    ],
    "Deal": [
        "transaction", "نوع المعاملة", "deal", "بيع/ايجار", "operation",
        "mode", "deal_type"
    ],
    "Advertiser_Type": [
        "advertiser type", "نوع المعلن", "owner/broker", "المعلن", "source",
        "source_type", "owner_party"
    ],
    "Area": [
        "space", "المساحة", "area", "مساحة الوحدة", "area_sqm", "space_m2",
        "area_m2"
    ],
    "Garden": [
        "garden", "حديقة", "حديقه", "garden_m2"
    ],
    "Pool": [
        "pool", "حمام سباحة", "بسين"
    ],
    "Notes": [
        "notes", "ملاحظات", "تفاصيل", "الوصف", "description", "comment"
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def clean_phone(v) -> str | None:
    """Return a normalised Egyptian mobile or None."""
    if pd.isna(v):
        return None
    s = str(v).strip()
    if s.endswith(".0"):
        s = s[:-2]
    d = re.sub(r"\D", "", s)
    if not d:
        return None
    if d.startswith("20") and len(d) >= 12:
        d = d[2:]
    if d.startswith("0020") and len(d) >= 14:
        d = d[4:]
    if len(d) == 10 and d.startswith("1"):
        d = "0" + d
    return d if len(d) >= 7 else None


def parse_price(v) -> float:
    """Parse EGP price from a raw string / number."""
    if pd.isna(v):
        return float("nan")
    s = str(v).strip().lower()
    if s in ("*", "", "nan", "none", "-", "unknown", "null", "n/a"):
        return float("nan")
    c = re.sub(r"m(?:2|²|تر|\s*مربع)", "", s)
    m = re.search(r"\d+(?:[.,]\d+)*", c)
    if not m:
        return float("nan")
    raw = m.group(0)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", raw):
        raw = raw.replace(".", "")
    else:
        raw = raw.replace(",", "")
    try:
        n = float(raw)
    except ValueError:
        return float("nan")
    if re.search(r"(?:مليون|ملون|million|\bm\b(?!\s*2))", c):
        n *= 1_000_000
    elif re.search(r"(?:الف|ألف|\bk\b)", c):
        n *= 1_000
    if re.search(r"\$|usd|dollar|دولار", s):
        n *= 48.0
    return n


def get_compound(location_val, notes_val="") -> str:
    """Resolve a location string to a canonical compound name."""
    combined = f"{location_val} {notes_val}".lower()
    for std_name, patterns in COMPOUNDS_DB.items():
        for pat in patterns:
            if re.search(pat, combined, re.I):
                return std_name
    raw = str(location_val).strip()
    if raw.lower() in ("*", "", "nan", "none", "-", "null", "unknown"):
        return "Other"
    return raw


def get_unit_type(raw: str) -> str:
    s = str(raw).lower()
    if any(w in s for w in ("فيلا", "villa", "مستقلة")):    return "Villa"
    if any(w in s for w in ("تاون", "townhouse")):           return "Townhouse"
    if any(w in s for w in ("توين", "twinhouse")):           return "Twinhouse"
    if any(w in s for w in ("دوبلكس", "duplex")):            return "Duplex"
    if any(w in s for w in ("بنتهاوس", "penthouse", "روف")): return "Penthouse"
    if any(w in s for w in ("استوديو", "studio")):           return "Studio"
    return "Apartment"


def infer_deal_finishing_furnishing(deal: str, fin: str, furn: str, notes: str, price: float):
    comb = f"{deal} {fin} {furn} {notes}".lower()

    # Finishing
    if any(w in comb for w in ("طوب احمر", "محارة", "بدون تشطيب", "core & shell", "مش متشطبة")):
        f_fin = "Core & Shell"
    elif any(w in comb for w in ("نصف تشطيب", "نص تشطيب", "semi finished")):
        f_fin = "Semi-Finished"
    elif any(w in comb for w in ("الترا سوبر لوكس", "الترا لوكس", "ultra super lux")):
        f_fin = "Ultra Super Lux"
    elif any(w in comb for w in ("سوبر لوكس", "super lux", "تشطيب خاص")):
        f_fin = "Super Lux"
    else:
        f_fin = "Finished"

    # Furnishing
    if f_fin in ("Core & Shell", "Semi-Finished"):
        f_furn = "Unfurnished"
    elif any(w in comb for w in ("مفروش بالكامل", "مفروشة", "مفروش", "furnished")):
        f_furn = "Furnished"
    elif any(w in comb for w in ("مطبخ وتكييفات", "بالمطبخ والتكييفات", "بالتكييفات", "kitchen & acs")):
        f_furn = "Kitchen & ACs"
    else:
        f_furn = "Unfurnished"

    # Deal type
    if any(w in comb for w in ("ايجار", "إيجار", "rent", "rental", "للايجار")):
        f_deal = "Rent"
    elif any(w in comb for w in ("بيع", "sale", "sell", "resale", "للبيع", "ريسيل", "كاش", "اقساط")):
        f_deal = "Sale"
    else:
        f_deal = "Sale" if (not np.isnan(price) and price > 250_000) else "Rent"

    return f_deal, f_fin, f_furn


def normalize_availability(v: str) -> str:
    s = str(v).lower().strip()
    if any(w in s for w in ("sold", "مباع", "اتباعت", "تم البيع")):
        return "Sold"
    if any(w in s for w in ("rented", "مؤجر", "تأجير", "تم الايجار", "تم التأجير")):
        return "Rented"
    if any(w in s for w in ("under offer", "تفاوض", "عربون", "مقدم")):
        return "Under Offer"
    if any(w in s for w in ("hold", "معلق", "موقوف")):
        return "On Hold"
    return "Available"


# ──────────────────────────────────────────────────────────────────────────────
# Frame loaders
# ──────────────────────────────────────────────────────────────────────────────

def _extract_header_mapping(df_raw: pd.DataFrame):
    """Scan the first 10 rows of a sheet to find a header row."""
    for i in range(min(10, len(df_raw))):
        lows = [
            re.sub(r"\s+", " ", str(h).strip().lower()) if pd.notna(h) else ""
            for h in df_raw.iloc[i].tolist()
        ]
        mapping: dict[str, int] = {}
        for std_col, synonyms in COLUMN_MAP.items():
            for syn in synonyms:
                for pos, cell_header in enumerate(lows):
                    if syn in cell_header and std_col not in mapping:
                        mapping[std_col] = pos
                        break
        if len(mapping) >= 2 and any(k in mapping for k in ("Phone", "Price_Raw")):
            return i, mapping
    return None


def _build_mapped_frame(sub: pd.DataFrame, mapping: dict[str, int], file_mtime, sheet_name: str) -> pd.DataFrame:
    df_clean = pd.DataFrame()
    for std_col, col_idx in mapping.items():
        if col_idx < sub.shape[1]:
            df_clean[std_col] = sub.iloc[:, col_idx].values

    if "Price_Raw" in df_clean.columns:
        is_in_k = False
        if mapping.get("Price_Raw") is not None and mapping["Price_Raw"] < sub.shape[1]:
            hdr_str = str(sub.columns[mapping["Price_Raw"]]).lower()
            if any(w in hdr_str for w in ("الف", "ألف", "thousands", "/1000")):
                is_in_k = True
        df_clean["_in_k"] = is_in_k

    df_clean["_file_mtime"] = file_mtime
    df_clean["_source_sheet"] = sheet_name
    return df_clean


def _load_excel_frames(path: str) -> list[pd.DataFrame]:
    frames = []
    try:
        file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")
        wb = pd.read_excel(path, sheet_name=None, header=None)
        for sheet_name, df_raw in wb.items():
            if any(x in str(sheet_name).lower() for x in ("dashboard", "pivot", "summary", "_archive", "تعليمات")):
                continue
            res = _extract_header_mapping(df_raw)
            if res is None:
                continue
            hdr_row, mapping = res
            sub = df_raw.iloc[hdr_row + 1:].copy()
            if sub.empty:
                continue
            df_c = _build_mapped_frame(sub, mapping, file_mtime, str(sheet_name))
            if not df_c.empty:
                frames.append(df_c)
    except Exception as e:
        print(f"  [WARN] Failed to read Excel {os.path.basename(path)}: {e}", file=sys.stderr)
    return frames


def _load_csv_frames(path: str) -> list[pd.DataFrame]:
    frames = []
    file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")
    for enc in ("utf-8-sig", "utf-8", "cp1256", "latin1"):
        try:
            df_raw = pd.read_csv(path, encoding=enc, header=None, low_memory=False)
            res = _extract_header_mapping(df_raw)
            if res is None:
                continue
            hdr_row, mapping = res
            sub = df_raw.iloc[hdr_row + 1:].copy()
            if sub.empty:
                continue
            df_c = _build_mapped_frame(sub, mapping, file_mtime, os.path.basename(path))
            if not df_c.empty:
                frames.append(df_c)
                break
        except Exception:
            continue
    return frames


def _parse_whatsapp_text(lines: list[str], file_mtime) -> list[dict]:
    msg_pat = re.compile(
        r"^\[?(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s+([^:]+):"
    )
    rows = []
    for line in lines:
        m = msg_pat.match(line)
        if not m:
            continue
        txt = line[m.end():].strip()
        if len(txt) < 15:
            continue
        ph_m = re.search(r"(?:(?:\+?20|0)?1[0125][\d\s\-]{8,10})", txt)
        phone = clean_phone(ph_m.group(0)) if ph_m else clean_phone(m.group(3).strip())
        if not phone:
            continue
        rows.append({
            "Phone": phone,
            "Price_Raw": txt,
            "Notes": txt[:400],
            "Owner_Name": m.group(3).strip(),
            "_file_mtime": file_mtime,
            "_in_k": False,
            "_source_sheet": "WhatsApp",
        })
    return rows


def _load_whatsapp_frames(path: str) -> list[pd.DataFrame]:
    frames = []
    try:
        file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            lines = fh.readlines()
        rows = _parse_whatsapp_text(lines, file_mtime)
        if rows:
            frames.append(pd.DataFrame(rows))
    except Exception as e:
        print(f"  [WARN] Failed to read WhatsApp file {os.path.basename(path)}: {e}", file=sys.stderr)
    return frames


def _load_zip_frames(path: str) -> list[pd.DataFrame]:
    frames = []
    try:
        file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")
        with zipfile.ZipFile(path) as z:
            for item in z.infolist():
                name_low = item.filename.lower()
                if name_low.endswith(".txt"):
                    with z.open(item) as f:
                        content = f.read().decode("utf-8", errors="ignore")
                        rows = _parse_whatsapp_text(content.splitlines(), file_mtime)
                        if rows:
                            frames.append(pd.DataFrame(rows))
    except Exception as e:
        print(f"  [WARN] Failed to read ZIP {os.path.basename(path)}: {e}", file=sys.stderr)
    return frames


# ──────────────────────────────────────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────────────────────────────────────

def run_consolidation(
    source_dir: str = r"I:\supabase\Sheets",
    archive_processed: bool = True,
    output_file: str | None = None,
) -> dict:
    if not os.path.exists(source_dir):
        return {"status": "error", "message": f"Source directory not found: {source_dir}"}

    archive_dir = os.path.join(source_dir, "_Processed_Archive")
    if output_file is None:
        output_file = os.path.join(source_dir, "Final_RealEstate_Database.xlsx")

    alt_output_file = os.path.join(source_dir, "Master_Cleaned_Final.xlsx")

    print(f"\n{'='*70}")
    print(f"  SIERRA ESTATES — ENTERPRISE INVENTORY CONSOLIDATOR")
    print(f"  Source Root : {source_dir}")
    print(f"  Output File : {output_file}")
    print(f"  Archive Dir : {archive_dir}")
    print(f"{'='*70}\n")

    t0 = time.time()
    all_files = glob.glob(os.path.join(source_dir, "**/*.*"), recursive=True)
    dfs: list[pd.DataFrame] = []
    processed_files: set[str] = set()

    for path in all_files:
        norm_p = os.path.abspath(path)
        base = os.path.basename(path)

        # Safety filters: skip archive, temp files, lock files, and target outputs
        if "_Processed_Archive" in path:
            continue
        if base.startswith("~$") or base.startswith(".~"):
            continue
        if norm_p in (os.path.abspath(output_file), os.path.abspath(alt_output_file)):
            continue

        ext = os.path.splitext(path)[1].lower()
        if ext in (".xlsx", ".xls"):
            frames = _load_excel_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)
        elif ext == ".csv":
            frames = _load_csv_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)
        elif ext == ".txt":
            frames = _load_whatsapp_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)
        elif ext == ".zip":
            frames = _load_zip_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)

    print(f"Total candidate files found : {len(all_files)}")
    print(f"Files successfully ingested : {len(processed_files)}")

    if not dfs:
        return {"status": "warning", "message": "No listings found in source files to merge."}

    # ── Master DataFrame normalization ─────────────────────────────────────
    df = pd.concat(dfs, ignore_index=True, sort=False)

    for col in COLUMN_MAP:
        if col not in df.columns:
            df[col] = np.nan

    # Phone normalization + drop rows without valid phone
    df["Phone"] = df["Phone"].map(clean_phone)
    df = df[df["Phone"].notna()].copy()
    df["Phone_Last7"] = df["Phone"].str[-7:]

    # Price normalization
    df["Price"] = df["Price_Raw"].map(parse_price)
    mask_in_k = df.get("_in_k", pd.Series(False, index=df.index)).fillna(False) & df["Price"].notna()
    df.loc[mask_in_k, "Price"] *= 1_000
    df = df[df["Price"].notna() & (df["Price"] > 0)].copy()
    df.loc[df["Price"].between(1, 99), "Price"] *= 1_000_000

    # Compound & Unit Type
    df["Notes"] = df["Notes"].fillna("").astype(str).str.strip()
    df["Compound_Location"] = [
        get_compound(row["Location"], row["Notes"]) for _, row in df.iterrows()
    ]
    df["Unit_Type"] = [
        get_unit_type(f"{row['Unit_Type']} {row['Notes']}") for _, row in df.iterrows()
    ]

    # Advertiser Type
    adv_type_str = df["Advertiser_Type"].fillna("").astype(str)
    notes_str = df["Notes"].fillna("").astype(str)
    adv_text = (adv_type_str + " " + notes_str).str.lower()
    df["Advertiser_Type"] = np.where(
        adv_text.str.contains(r"مالك|اونر|owner|ملاك|active owners", regex=True),
        "Owner", "Broker"
    )

    # Deal / Finishing / Furnishing
    logic = [
        infer_deal_finishing_furnishing(
            str(row.get("Deal", "")),
            str(row.get("Finishing", "")),
            str(row.get("Furnishing", "")),
            str(row.get("Notes", "")),
            row.get("Price", float("nan")),
        )
        for _, row in df.iterrows()
    ]
    df["Deal"]       = [x[0] for x in logic]
    df["Finishing"]  = [x[1] for x in logic]
    df["Furnishing"] = [x[2] for x in logic]

    # Availability
    if "Availability" in df.columns:
        df["Availability"] = df["Availability"].fillna("Available").map(normalize_availability)
    else:
        df["Availability"] = "Available"

    # Timestamp (normalize all timezones with utc=True)
    dt_update  = pd.to_datetime(df["Update_Date"], errors="coerce", utc=True)
    dt_listing = pd.to_datetime(df["Listing_Date"], errors="coerce", utc=True)
    dt_mtime   = pd.to_datetime(df["_file_mtime"], errors="coerce", utc=True)
    df["Record_Date"] = dt_update.fillna(dt_listing).fillna(dt_mtime)

    # Area & Rooms
    df["Area_m2"] = pd.to_numeric(
        df["Area"].astype(str).str.extract(r"(\d+)", expand=False)
        .fillna(df["Notes"].str.extract(r"(\d{2,4})\s*(?:متر|م|m2)", expand=False)),
        errors="coerce"
    ).fillna(0)
    df["Rooms"] = pd.to_numeric(
        df["Rooms"].astype(str).str.extract(r"(\d+)", expand=False)
        .fillna(df["Notes"].str.extract(r"(\d)\s*(?:غرف|غرفة|نوم|rooms)", expand=False)),
        errors="coerce"
    ).fillna(0)

    # ── Deduplication by Phone (last 7) + Price + Deal ──────────────────────
    df["Dedup_Key"] = [
        f"{row['Phone_Last7']}|{row['Price']:0.0f}|{row['Deal']}"
        for _, row in df.iterrows()
    ]
    df = df.sort_values(by="Record_Date", ascending=False)

    fill_cols = ["Compound_Location", "Unit_Type", "Area_m2", "Rooms", "Notes", "Owner_Name"]
    for col in fill_cols:
        if col in df.columns:
            try:
                df[col] = df.groupby("Dedup_Key")[col].transform(lambda s: s.bfill().ffill())
            except Exception:
                pass

    stats_agg = (
        df.groupby("Dedup_Key")
        .agg(
            First_Seen     =("Record_Date", "min"),
            Latest_Update  =("Record_Date", "max"),
            Listings_Count =("Dedup_Key",   "count"),
        )
        .reset_index()
    )
    df_final = (
        df.drop_duplicates(subset=["Dedup_Key"], keep="first")
        .merge(stats_agg, on="Dedup_Key", how="left")
        .sort_values(by="Latest_Update", ascending=False)
        .reset_index(drop=True)
    )

    # Final presentation fields
    df_final["Price_EGP"]    = df_final["Price"]
    df_final["Client_Name"]  = df_final["Owner_Name"].fillna("Unknown")
    today_str = time.strftime("%Y-%m-%d")
    df_final["Last_Update"]  = pd.to_datetime(df_final["Latest_Update"], errors="coerce", utc=True).dt.strftime("%Y-%m-%d").fillna(today_str)
    df_final["First_Seen"]   = pd.to_datetime(df_final["First_Seen"], errors="coerce", utc=True).dt.strftime("%Y-%m-%d").fillna(df_final["Last_Update"])

    ORDERED_COLUMNS = [
        "Last_Update", "First_Seen", "Availability", "Compound_Location", "Price_EGP",
        "Rooms", "Phone", "Client_Name", "Deal", "Advertiser_Type", "Area_m2",
        "Finishing", "Furnishing", "Unit_Type", "Listings_Count", "Notes",
    ]
    export_df = df_final[[c for c in ORDERED_COLUMNS if c in df_final.columns]].copy()

    total_raw    = len(df)
    total_unique = len(export_df)
    dup_removed  = total_raw - total_unique

    print(f"\nRaw listings loaded : {total_raw}")
    print(f"Duplicates removed  : {dup_removed}")
    print(f"Unique master units : {total_unique}")

    # ── Category Subsets ───────────────────────────────────────────────────
    is_owner  = export_df["Advertiser_Type"] == "Owner"
    is_broker = export_df["Advertiser_Type"] == "Broker"
    is_rent   = export_df["Deal"] == "Rent"
    is_sale   = export_df["Deal"] == "Sale"

    df_owners_rent  = export_df[is_owner  & is_rent ]
    df_owners_sale  = export_df[is_owner  & is_sale ]
    df_brokers_rent = export_df[is_broker & is_rent ]
    df_brokers_sale = export_df[is_broker & is_sale ]

    # ── Build Summary Sheet ────────────────────────────────────────────────
    top_compounds = export_df["Compound_Location"].value_counts().head(8)
    summary_rows = [
        ["METRIC", "VALUE"],
        ["Total Source Files Processed", len(processed_files)],
        ["Total Raw Listings Ingested", total_raw],
        ["Duplicates Removed (Phone + Price)", dup_removed],
        ["Total Unique Active Listings", total_unique],
        ["Direct Owners — Rent", len(df_owners_rent)],
        ["Direct Owners — Sale", len(df_owners_sale)],
        ["Brokers — Rent", len(df_brokers_rent)],
        ["Brokers — Sale", len(df_brokers_sale)],
        ["Available Status Units", (export_df["Availability"] == "Available").sum()],
        ["Consolidation Timestamp", time.strftime("%Y-%m-%d %H:%M:%S")],
        ["", ""],
        ["TOP COMPOUNDS", "LISTINGS COUNT"],
    ]
    for cmp_name, count in top_compounds.items():
        summary_rows.append([str(cmp_name), int(count)])

    summary_df = pd.DataFrame(summary_rows[1:], columns=summary_rows[0])

    # ── Write Multi-Sheet Excel ────────────────────────────────────────────
    print(f"\nWriting master workbook: {output_file}")
    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        export_df.to_excel(writer, sheet_name="Master_Inventory", index=False)
        df_owners_rent.to_excel(writer, sheet_name="Owners_Rent", index=False)
        df_owners_sale.to_excel(writer, sheet_name="Owners_Sale", index=False)
        df_brokers_rent.to_excel(writer, sheet_name="Brokers_Rent", index=False)
        df_brokers_sale.to_excel(writer, sheet_name="Brokers_Sale", index=False)

    # Also mirror to Master_Cleaned_Final.xlsx for backward compatibility
    shutil.copyfile(output_file, alt_output_file)

    # ── OpenPyXL Styling ───────────────────────────────────────────────────
    wb = openpyxl.load_workbook(output_file)
    h_fill   = PatternFill(start_color="0A1628", end_color="0A1628", fill_type="solid")
    h_font   = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    d_font   = Font(name="Segoe UI", size=9)
    alt_fill = PatternFill(start_color="F4F7FA", end_color="F4F7FA", fill_type="solid")
    thin     = Side(style="thin", color="D9D9D9")
    border   = Border(left=thin, right=thin, top=thin, bottom=thin)

    avail_dv = DataValidation(
        type="list",
        formula1='"Available,Rented,Sold,Under Offer,On Hold"',
        allow_blank=True,
    )

    for ws in wb.worksheets:
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        ws.sheet_view.showGridLines = True

        if ws.title != "Summary":
            ws.add_data_validation(avail_dv)
            if ws.max_row > 1:
                avail_dv.add(f"C2:C{ws.max_row}")

        for col_idx in range(1, ws.max_column + 1):
            cl = get_column_letter(col_idx)
            header_name = str(ws.cell(1, col_idx).value or "").lower()
            col_cells = list(ws[cl])
            for i, cell in enumerate(col_cells):
                cell.border = border
                if cell.row == 1:
                    cell.fill   = h_fill
                    cell.font   = h_font
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=False)
                else:
                    cell.font = d_font
                    if i % 2 == 0:
                        cell.fill = alt_fill
                    if "price" in header_name or "value" in header_name:
                        if isinstance(cell.value, (int, float)):
                            cell.number_format = "#,##0"
                        cell.alignment = Alignment(horizontal="right", vertical="center")
                    elif "notes" in header_name:
                        cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                    else:
                        cell.alignment = Alignment(horizontal="center", vertical="center")

            if "notes" in header_name:
                ws.column_dimensions[cl].width = 40
            else:
                max_len = max(len(str(cell.value or "")) for cell in col_cells[:200])
                ws.column_dimensions[cl].width = min(max(max_len + 3, 14), 32)

        ws.row_dimensions[1].height = 22

    TAB_COLORS = {
        "Summary":          "D4AF37",
        "Master_Inventory": "1F4E79",
        "Owners_Rent":      "00B050",
        "Owners_Sale":      "C00000",
        "Brokers_Rent":     "0070C0",
        "Brokers_Sale":     "7030A0",
    }
    for ws in wb.worksheets:
        c = TAB_COLORS.get(ws.title)
        if c:
            ws.sheet_properties.tabColor = c

    wb.save(output_file)
    wb.save(alt_output_file)
    print("Workbooks styled & saved ✓")

    # ── Safe Archiving / Moving processed files ────────────────────────────
    archived_count = 0
    if archive_processed and processed_files:
        os.makedirs(archive_dir, exist_ok=True)
        for src_path in processed_files:
            try:
                dest = os.path.join(archive_dir, os.path.basename(src_path))
                if os.path.exists(dest):
                    dest = os.path.join(
                        archive_dir,
                        f"{int(time.time())}_{os.path.basename(src_path)}"
                    )
                shutil.move(src_path, dest)
                archived_count += 1
            except Exception as e:
                print(f"  [WARN] Could not move {os.path.basename(src_path)} to archive: {e}", file=sys.stderr)

    elapsed = round(time.time() - t0, 2)
    print(f"\nConsolidation complete in {elapsed}s.")
    print(f"Archived {archived_count} source files to {archive_dir}.\n")

    return {
        "status": "success",
        "source_dir": source_dir,
        "output_file": output_file,
        "alt_output_file": alt_output_file,
        "archive_dir": archive_dir,
        "files_scanned": len(all_files),
        "files_processed": len(processed_files),
        "archived_count": archived_count,
        "raw_rows": total_raw,
        "unique_rows": total_unique,
        "duplicates_removed": dup_removed,
        "owners_rent": len(df_owners_rent),
        "owners_sale": len(df_owners_sale),
        "brokers_rent": len(df_brokers_rent),
        "brokers_sale": len(df_brokers_sale),
        "elapsed_seconds": elapsed,
    }


def main():
    parser = argparse.ArgumentParser(description="Sierra Estates — Enterprise Inventory Consolidator")
    parser.add_argument("--source_dir", default=r"I:\supabase\Sheets", help="Root folder to scan recursively")
    parser.add_argument("--no-archive", action="store_true", help="Do NOT move processed source files to _Processed_Archive")
    parser.add_argument("--output", default=None, help="Output xlsx path")
    parser.add_argument("--json", action="store_true", help="Print result as JSON")

    args = parser.parse_args()
    res = run_consolidation(
        source_dir=args.source_dir,
        archive_processed=not args.no_archive,
        output_file=args.output,
    )
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
