# -*- coding: utf-8 -*-
# pyright: reportAttributeAccessIssue=false, reportCallIssue=false
"""
Enterprise Real Estate Inventory Consolidator — Sierra Estates
--------------------------------------------------------------
• Recursive folder scan for Excel (.xlsx/.xls) + WhatsApp text exports
• Deduplication: (last 7 digits of phone) + price + deal type
• Keeps First_Seen & Latest_Update tracking across runs
• Ordered columns: Last_Update · First_Seen · Availability (dropdown) …
• Styled openpyxl export with per-sheet tabs (Master / Owners_Rent /
  Owners_Sale / Brokers_Rent / Brokers_Sale)
• Moves processed source files to _Processed_Archive to prevent re-merge
• Accepts CLI args: --source_dir, --no-archive, --output

Usage
-----
  python enterprise-inventory-consolidator.py
  python enterprise-inventory-consolidator.py --source_dir "I:\\supabase\\Sheets"
  python enterprise-inventory-consolidator.py --source_dir "D:\\Data" --no-archive
"""

import argparse
import glob
import json
import os
import re
import shutil
import sys
import time

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
# Compound recognition patterns  (Arabic + English + codes)
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
}

# ──────────────────────────────────────────────────────────────────────────────
# Column synonym map  →  canonical column name
# ──────────────────────────────────────────────────────────────────────────────
COLUMN_MAP = {
    "Phone":          ["mobile", "phone", "تليفون", "موبايل", "رقم الهاتف", "broker phone", "contact", "whatsapp"],
    "Price_Raw":      ["price", "السعر", "الإيجار", "ايجار", "المطلوب", "unit price", "total price"],
    "Owner_Name":     ["اسم المالك", "owner name", "الاسم", "name", "client name", "العميل"],
    "Contact_Name":   ["broker name", "اسم البروكر", "المعلن", "contact person"],
    "Listing_Date":   ["timestamp", "listing date", "تاريخ العرض", "تاريخ الإعلان", "date"],
    "Update_Date":    ["تاريخ اخر تحديث", "update date", "last update"],
    "Rooms":          ["bedrooms", "عدد الغرف", "الغرف", "rooms", "نوم", "beds"],
    "Location":       ["location", "المنطقة والكمبوند", "الكمبوند", "الموقع", "compound"],
    "Furnishing":     ["furnishing", "حالة التأثيث", "التأثيث", "مفروش"],
    "Finishing":      ["تشطيب", "finishing", "حالة التشطيب"],
    "Unit_Type":      ["property type", "unit type", "نوع الوحدة", "النوع"],
    "Deal":           ["transaction", "نوع المعاملة", "deal", "بيع/ايجار", "operation", "mode"],
    "Advertiser_Type":["advertiser type", "نوع المعلن", "owner/broker", "المعلن", "source"],
    "Area":           ["space", "المساحة", "area", "مساحة الوحدة", "area_sqm"],
    "Notes":          ["notes", "ملاحظات", "تفاصيل", "الوصف", "description", "comment"],
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
    # strip area suffixes to avoid confusing m² digits with price
    c = re.sub(r"m(?:2|²|تر|\s*مربع)", "", s)
    m = re.search(r"\d+(?:[.,]\d+)*", c)
    if not m:
        return float("nan")
    raw = m.group(0)
    # handle European thousands: 8.500.000
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", raw):
        raw = raw.replace(".", "")
    else:
        raw = raw.replace(",", "")
    try:
        n = float(raw)
    except ValueError:
        return float("nan")
    # unit multipliers
    if re.search(r"(?:مليون|ملون|million|\bm\b(?!\s*2))", c):
        n *= 1_000_000
    elif re.search(r"(?:الف|ألف|\bk\b)", c):
        n *= 1_000
    # currency conversion (rough)
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
    s = raw.lower()
    if any(w in s for w in ("فيلا", "villa", "مستقلة")):    return "Villa"
    if any(w in s for w in ("تاون", "townhouse")):           return "Townhouse"
    if any(w in s for w in ("توين", "twinhouse")):           return "Twinhouse"
    if any(w in s for w in ("دوبلكس", "duplex")):            return "Duplex"
    if any(w in s for w in ("بنتهاوس", "penthouse", "روف")): return "Penthouse"
    if any(w in s for w in ("استوديو", "studio")):           return "Studio"
    return "Apartment"


def infer_deal_finishing_furnishing(deal: str, fin: str, furn: str, notes: str, price: float):
    """
    Returns (deal_label, finishing_label, furnishing_label) by scanning all text.
    """
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


# ──────────────────────────────────────────────────────────────────────────────
# Core consolidation logic
# ──────────────────────────────────────────────────────────────────────────────

def _extract_header_mapping(df_raw: pd.DataFrame):
    """
    Scan the first 10 rows of a sheet to find a header row.
    Returns (row_index, column_mapping_dict) or None.
    """
    for i in range(min(10, len(df_raw))):
        lows = [
            str(h).strip().lower() if pd.notna(h) else ""
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


def _load_excel_frames(path: str) -> list[pd.DataFrame]:
    """Parse all relevant sheets from an Excel file into DataFrames."""
    frames = []
    try:
        wb = pd.read_excel(path, sheet_name=None, header=None)
        file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")

        for sheet_name, df_raw in wb.items():
            if any(x in str(sheet_name).lower() for x in ("dashboard", "pivot", "summary", "_archive")):
                continue
            result = _extract_header_mapping(df_raw)
            if result is None:
                continue
            header_row, mapping = result
            sub = df_raw.iloc[header_row + 1:].copy()
            if sub.empty:
                continue

            temp = pd.DataFrame(index=range(len(sub)))
            for std_col, pos in mapping.items():
                if pos < sub.shape[1]:
                    temp[std_col] = sub.iloc[:, pos].values
                else:
                    temp[std_col] = np.nan

            # Detect if price header says "thousands"
            price_header = ""
            if "Price_Raw" in mapping:
                price_header = str(df_raw.iloc[header_row, mapping["Price_Raw"]]).lower()
            temp["_in_k"] = any(w in price_header for w in ("thousand", "000", "بالألف", "بالالف"))
            temp["_file_mtime"] = file_mtime
            frames.append(temp)
    except Exception as e:
        print(f"  [WARN] Could not read Excel {path}: {e}", file=sys.stderr)
    return frames


def _load_whatsapp_frames(path: str) -> list[pd.DataFrame]:
    """Extract listings from a WhatsApp text export."""
    frames = []
    try:
        file_mtime = pd.to_datetime(os.path.getmtime(path), unit="s")
        msg_pat = re.compile(
            r"^\[?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),?\s+"
            r"(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm]|ص|م)?)[\]\s\-:]+([^:]+):"
        )
        rows = []
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
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
                    "Phone":     phone,
                    "Price_Raw": txt,
                    "Notes":     txt[:400],
                    "Owner_Name": m.group(3).strip(),
                    "_file_mtime": file_mtime,
                    "_in_k":     False,
                })
        if rows:
            frames.append(pd.DataFrame(rows))
    except Exception as e:
        print(f"  [WARN] Could not parse WhatsApp file {path}: {e}", file=sys.stderr)
    return frames


def run_consolidation(
    source_dir: str = r"I:\supabase\Sheets",
    archive_processed: bool = True,
    output_file: str | None = None,
) -> dict:
    """
    Main entry point. Returns a result dict with status, counts, and output path.
    """
    if not os.path.exists(source_dir):
        return {"status": "error", "message": f"Source directory not found: {source_dir}"}

    archive_dir = os.path.join(source_dir, "_Processed_Archive")
    if output_file is None:
        output_file = os.path.join(source_dir, "Master_Cleaned_Final.xlsx")

    print(f"\n{'='*64}")
    print(f"  SIERRA ESTATES — Enterprise Inventory Consolidator")
    print(f"  Source : {source_dir}")
    print(f"  Output : {output_file}")
    print(f"{'='*64}\n")

    t0 = time.time()
    all_files = glob.glob(os.path.join(source_dir, "**/*.*"), recursive=True)
    dfs: list[pd.DataFrame] = []
    processed_files: set[str] = set()

    for path in all_files:
        # Skip archive / output / temp files
        if "_Processed_Archive" in path:
            continue
        if os.path.basename(path).startswith("~$"):
            continue
        if os.path.abspath(path) == os.path.abspath(output_file):
            continue
        if "Master_" in os.path.basename(path):
            continue

        ext = os.path.splitext(path)[1].lower()
        if ext in (".xlsx", ".xls"):
            frames = _load_excel_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)
        elif ext == ".txt":
            frames = _load_whatsapp_frames(path)
            if frames:
                dfs.extend(frames)
                processed_files.add(path)

    print(f"Files scanned      : {len(all_files)}")
    print(f"Files with data    : {len(processed_files)}")

    if not dfs:
        return {"status": "warning", "message": "No new files found to merge."}

    # ── Build master dataframe ──────────────────────────────────────────────
    df = pd.concat(dfs, ignore_index=True, sort=False)

    # Ensure all canonical columns exist
    for col in COLUMN_MAP:
        if col not in df.columns:
            df[col] = np.nan

    # Phone normalisation + drop rows without phone
    df["Phone"] = df["Phone"].map(clean_phone)
    df = df[df["Phone"].notna()].copy()
    df["Phone_Last7"] = df["Phone"].str[-7:]

    # Price
    df["Price"] = df["Price_Raw"].map(parse_price)
    mask_in_k = df["_in_k"].fillna(False) & df["Price"].notna()
    df.loc[mask_in_k, "Price"] *= 1_000
    df = df[df["Price"].notna() & (df["Price"] > 0)].copy()
    # Tiny numbers are almost certainly in millions (e.g. "5" → 5M)
    df.loc[df["Price"].between(1, 99), "Price"] *= 1_000_000

    # Compound & type
    df["Notes"] = df["Notes"].fillna("").astype(str).str.strip()
    df["Compound_Location"] = [
        get_compound(row["Location"], row["Notes"]) for _, row in df.iterrows()
    ]
    df["Unit_Type"] = [
        get_unit_type(f"{row['Unit_Type']} {row['Notes']}") for _, row in df.iterrows()
    ]

    # Advertiser type
    adv_text = (df["Advertiser_Type"].fillna("") + " " + df["Notes"]).str.lower()
    df["Advertiser_Type"] = np.where(
        adv_text.str.contains(r"مالك|اونر|owner|ملاك|active owners", regex=True),
        "Owner", "Broker"
    )

    # Deal / Finishing / Furnishing inference
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
    df["Deal"]      = [x[0] for x in logic]
    df["Finishing"] = [x[1] for x in logic]
    df["Furnishing"]= [x[2] for x in logic]

    # Record date (best available)
    df["Record_Date"] = (
        pd.to_datetime(df["Update_Date"],  errors="coerce")
        .fillna(pd.to_datetime(df["Listing_Date"], errors="coerce"))
        .fillna(df["_file_mtime"])
    )

    # Area & rooms
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

    # ── Deduplication ──────────────────────────────────────────────────────
    df["Dedup_Key"] = [
        f"{row['Phone_Last7']}|{row['Price']:0.0f}|{row['Deal']}"
        for _, row in df.iterrows()
    ]
    df = df.sort_values(by="Record_Date", ascending=False)

    # Back-fill sparse fields within each dedup group
    fill_cols = ["Compound_Location", "Unit_Type", "Area_m2", "Rooms", "Notes", "Owner_Name"]
    df[fill_cols] = df.groupby("Dedup_Key")[fill_cols].bfill().fillna(df[fill_cols])

    # Aggregate first-seen / latest-update / count
    stats = (
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
        .merge(stats, on="Dedup_Key", how="left")
        .sort_values(by="Latest_Update", ascending=False)
        .reset_index(drop=True)
    )

    # ── Final columns ──────────────────────────────────────────────────────
    df_final["Availability"] = "Available"
    df_final["Price_EGP"]    = df_final["Price"]
    df_final["Client_Name"]  = df_final["Owner_Name"].fillna("Unknown")
    df_final["Last_Update"]  = df_final["Latest_Update"].dt.strftime("%Y-%m-%d")
    df_final["First_Seen"]   = df_final["First_Seen"].dt.strftime("%Y-%m-%d")

    ORDERED_COLUMNS = [
        "Last_Update", "First_Seen", "Availability", "Compound_Location", "Price_EGP",
        "Rooms", "Phone", "Client_Name", "Deal", "Advertiser_Type", "Area_m2",
        "Finishing", "Furnishing", "Unit_Type", "Listings_Count", "Notes",
    ]
    export_df = df_final[[c for c in ORDERED_COLUMNS if c in df_final.columns]].copy()

    total_raw    = len(df)
    total_unique = len(export_df)
    print(f"\nRaw rows loaded    : {total_raw}")
    print(f"After dedup        : {total_unique}")

    # ── Write Excel ────────────────────────────────────────────────────────
    print(f"\nWriting workbook   : {output_file}")
    is_owner  = export_df["Advertiser_Type"] == "Owner"
    is_broker = export_df["Advertiser_Type"] == "Broker"
    is_rent   = export_df["Deal"] == "Rent"
    is_sale   = export_df["Deal"] == "Sale"

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        export_df.to_excel(writer, sheet_name="Master_Inventory", index=False)
        export_df[is_owner  & is_rent ].to_excel(writer, sheet_name="Owners_Rent",   index=False)
        export_df[is_owner  & is_sale ].to_excel(writer, sheet_name="Owners_Sale",   index=False)
        export_df[is_broker & is_rent ].to_excel(writer, sheet_name="Brokers_Rent",  index=False)
        export_df[is_broker & is_sale ].to_excel(writer, sheet_name="Brokers_Sale",  index=False)

    # ── Style the workbook ─────────────────────────────────────────────────
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
                    if "price" in header_name:
                        cell.number_format = "#,##0"
                        cell.alignment = Alignment(horizontal="right", vertical="center")
                    elif "notes" in header_name:
                        cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                    else:
                        cell.alignment = Alignment(horizontal="center", vertical="center")

            # Column width
            if "notes" in header_name:
                ws.column_dimensions[cl].width = 40
            else:
                max_len = max(len(str(cell.value or "")) for cell in col_cells)
                ws.column_dimensions[cl].width = min(max(max_len + 3, 14), 28)

        ws.row_dimensions[1].height = 20

    # Tab colours
    TAB_COLORS = {
        "Master_Inventory": "1F4E79",
        "Owners_Rent":      "00B050",
        "Owners_Sale":      "C00000",
        "Brokers_Rent":     "0070C0",
        "Brokers_Sale":     "7030A0",
    }
    for ws in wb.worksheets:
        color = TAB_COLORS.get(ws.title)
        if color:
            ws.sheet_properties.tabColor = color

    wb.save(output_file)
    print("Workbook saved ✓")

    # ── Archive processed source files ─────────────────────────────────────
    archived_count = 0
    if archive_processed and processed_files:
        os.makedirs(archive_dir, exist_ok=True)
        for src_path in processed_files:
            try:
                dest = os.path.join(archive_dir, os.path.basename(src_path))
                if os.path.exists(dest):
                    dest = os.path.join(
                        archive_dir,
                        f"{int(time.time())}_{os.path.basename(src_path)}",
                    )
                shutil.move(src_path, dest)
                archived_count += 1
            except Exception as e:
                print(f"  [WARN] Could not archive {src_path}: {e}", file=sys.stderr)
        print(f"Archived {archived_count} source file(s) → {archive_dir}")

    elapsed = round(time.time() - t0, 1)
    result = {
        "status":        "success",
        "total_raw":     total_raw,
        "total_unique":  total_unique,
        "files_scanned": len(all_files),
        "files_merged":  len(processed_files),
        "archived_count":archived_count,
        "elapsed_sec":   elapsed,
        "output_file":   output_file,
    }
    print(f"\n✓ Done in {elapsed}s — {total_unique} unique units written.\n")
    return result


# ──────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sierra Estates — Enterprise Inventory Consolidator"
    )
    parser.add_argument(
        "--source_dir",
        default=r"I:\supabase\Sheets",
        help="Root folder to scan recursively for Excel / WhatsApp files",
    )
    parser.add_argument(
        "--no-archive",
        action="store_true",
        help="Do NOT move processed source files to _Processed_Archive",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output xlsx path (default: <source_dir>/Master_Cleaned_Final.xlsx)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the result dict as JSON (useful for API / subprocess callers)",
    )
    args = parser.parse_args()

    result = run_consolidation(
        source_dir=args.source_dir,
        archive_processed=not args.no_archive,
        output_file=args.output,
    )

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for k, v in result.items():
            print(f"  {k:<20}: {v}")
