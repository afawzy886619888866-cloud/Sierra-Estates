# -*- coding: utf-8 -*-
# pyright: reportAttributeAccessIssue=false, reportCallIssue=false, reportArgumentType=false
"""
Merges Final_RealEstate_Database.xlsx and Owners_Inventory.json
into a unified, deduplicated Master Database with Photo Priority and Airtable CSV export.
"""

import sys
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8")

import os
import json
import time
import pandas as pd
import numpy as np
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

OUTPUT_DIR = r"H:\Sheets"
MASTER_EXCEL = os.path.join(OUTPUT_DIR, "Final_RealEstate_Database.xlsx")
OWNERS_JSON = os.path.join(OUTPUT_DIR, "Owners_Inventory.json")
AIRTABLE_CSV = os.path.join(OUTPUT_DIR, "Unified_Master_Inventory_Airtable.csv")

def normalize_phone(v):
    if pd.isna(v): return None
    s = str(v).strip()
    if s.endswith(".0"): s = s[:-2]
    d = "".join([c for c in s if c.isdigit()])
    if not d: return None
    if d.startswith("20") and len(d) >= 12: d = d[2:]
    if len(d) == 10 and d.startswith("1"): d = "0" + d
    return d if len(d) >= 7 else None

def get_last7(v):
    d = "".join([c for c in str(v) if c.isdigit()])
    return d[-7:] if len(d) >= 7 else ""

def merge_all():
    print("🚀 Starting Unified Inventory Merge...")
    t0 = time.time()

    # 1. Load Master Excel if exists
    dfs = []
    if os.path.exists(MASTER_EXCEL):
        print(f"📖 Reading {MASTER_EXCEL}...")
        try:
            df_master = pd.read_excel(MASTER_EXCEL, sheet_name="All_Units")
            if not df_master.empty:
                if "Has_Photos" not in df_master.columns:
                    df_master["Has_Photos"] = "NO"
                if "Photo_Code" not in df_master.columns:
                    df_master["Photo_Code"] = np.nan
                if "Photo_Path" not in df_master.columns:
                    df_master["Photo_Path"] = np.nan
                dfs.append(df_master)
                print(f"  Loaded {len(df_master)} master records.")
        except Exception as e:
            print(f"  Warning reading master excel: {e}")

    # 2. Load Owners JSON if exists
    if os.path.exists(OWNERS_JSON):
        print(f"📖 Reading {OWNERS_JSON}...")
        try:
            with open(OWNERS_JSON, "r", encoding="utf-8") as f:
                owners_data = json.load(f)
            if owners_data:
                df_owners = pd.DataFrame(owners_data)
                # Map columns to match Master schema
                rename_map = {
                    "Owner_Phone": "Phone",
                    "Deal_Type": "Deal",
                    "Description": "Notes",
                    "Received_At": "Latest_Update",
                    "Source_Channel": "Source_Sheet",
                }
                df_owners = df_owners.rename(columns=rename_map)
                df_owners["Source_File"] = "WhatsApp_Live_Harvester"
                df_owners["First_Seen"] = df_owners["Latest_Update"]
                df_owners["Advertiser_Type"] = "Owner"
                dfs.append(df_owners)
                print(f"  Loaded {len(df_owners)} live harvested owner records.")
        except Exception as e:
            print(f"  Warning reading owners json: {e}")

    if not dfs:
        print("❌ No data sources found to merge.")
        return

    # 3. Concatenate
    combined: Any = pd.concat(dfs, ignore_index=True, sort=False)
    total_raw = len(combined)
    print(f"📊 Combined total records: {total_raw}")

    # 4. Clean & Standardize
    combined["Phone_Clean"] = combined["Phone"].map(normalize_phone)
    combined = combined[combined["Phone_Clean"].notna()].copy()
    combined["Phone_Last7"] = combined["Phone_Clean"].map(get_last7)

    # Standardize Deal
    combined["Deal"] = combined["Deal"].fillna("Unknown")
    combined["Deal"] = np.where(combined["Deal"].str.contains("Rent|ايجار|إيجار", case=False, regex=True), "Rent",
                        np.where(combined["Deal"].str.contains("Sale|بيع|resale|تنازل", case=False, regex=True), "Sale", "Unknown"))

    # Standardize Price
    combined["Price_EGP"] = pd.to_numeric(combined["Price_EGP"], errors="coerce")
    combined["Area_m2"] = pd.to_numeric(combined.get("Area_m2", combined.get("Area", np.nan)), errors="coerce")
    combined["Rooms"] = pd.to_numeric(combined.get("Rooms", np.nan), errors="coerce")
    combined["Bathrooms"] = pd.to_numeric(combined.get("Bathrooms", np.nan), errors="coerce")

    # Has Photos
    combined["Has_Photos"] = combined["Has_Photos"].fillna("NO").str.upper()
    has_photo_mask = (combined["Has_Photos"] == "YES") | combined["Photo_Path"].notna()
    combined["Has_Photos"] = np.where(has_photo_mask, "YES", "NO")

    # Status
    combined["Status"] = np.where(combined["Has_Photos"] == "YES", "Ready (With Photos)",
                         np.where(combined["Status"].fillna("").str.contains("Sold|اتباعت", case=False), "Sold",
                         np.where(combined["Status"].fillna("").str.contains("Rented|تأجير", case=False), "Rented",
                         np.where(combined["Advertiser_Type"] == "Owner", "Needs Revision (No Photos)", "Active"))))

    # 5. Deduplicate
    price_key = combined["Price_EGP"].fillna(0).round(0).astype("Int64").astype(str)
    combined["Dedup_Key"] = combined["Phone_Last7"] + "|" + price_key + "|" + combined["Deal"]

    # Sort so photo-bearing and recent records come first
    combined["photo_priority"] = np.where(combined["Has_Photos"] == "YES", 0, 1)
    combined = combined.sort_values(by=["photo_priority", "Latest_Update"], ascending=[True, False])

    df_unique: Any = combined.drop_duplicates(subset=["Dedup_Key"], keep="first").copy()
    df_unique = df_unique.drop(columns=["photo_priority", "Dedup_Key"])

    # Sequential ID
    df_unique["Unit_ID"] = [f"SE-{i:05d}" for i in range(1, len(df_unique) + 1)]
    print(f"✅ Deduplicated to {len(df_unique)} unique listings ({total_raw - len(df_unique)} duplicates removed).")

    # 6. Column Ordering
    PREFERRED_COLS = [
        "Unit_ID", "Status", "Has_Photos", "Photo_Code", "Photo_Path",
        "Phone", "Phone_Clean", "Advertiser_Type", "Deal", "Compound",
        "Unit_Type", "Price_EGP", "Price_Raw", "Currency", "Area_m2",
        "Rooms", "Bathrooms", "Furnishing", "Finishing", "Owner_Name",
        "Contact_Person", "Unit_Code", "All_Original_Codes", "First_Seen",
        "Latest_Update", "Days_Advertised", "Listings_Count", "Source_File",
        "Source_Sheet", "Notes"
    ]
    cols = [c for c in PREFERRED_COLS if c in df_unique.columns]
    for c in df_unique.columns:
        if c not in cols: cols.append(c)
    master: Any = df_unique[cols].copy()

    # 7. Save Airtable CSV
    master.to_csv(AIRTABLE_CSV, index=False, encoding="utf-8-sig")
    print(f"📁 Airtable CSV saved: {AIRTABLE_CSV}")

    # 8. Save Excel Workbook
    jls_extract_var = "openpyxl"
    jls_extract_var = "openpyxl"jls_extract_var) as writer:
        # Summar
        jls_etract_var = DataFrame
        s.Excel = pd.jls_extract_var
        summary = pd.DataFrame({
            "Metric": [
                "Total Master Units",
                "Units With Photos (Ready)",
                "Units Without Photos (Revision)",
                "Direct Owners",
                "Brokers / Network",
                "Rent Units",
                "Sale Units",
                "Active Status",
                "Duplicates Removed",
                "Duration (s)"
            ],
            "Count": [
                len(master),
                (master["Has_Photos"] == "YES").sum(),
                (master["Status"].str.contains("Revision")).sum(),
                (master["Advertiser_Type"] == "Owner").sum(),
                (master["Advertiser_Type"] == "Broker").sum(),
                (master["Deal"] == "Rent").sum(),
                (master["Deal"] == "Sale").sum(),
                (master["Status"].isin(["Active", "Ready (With Photos)"])).sum(),
                total_raw - len(master),
                round(time.time() - t0, 1)
            ]
        })
        summary.to_excel(writer, sheet_name="Summary", index=False)
        master.to_excel(writer, sheet_name="All_Units", index=False)

        # Categorized sub-sheets
        for name, (adv, deal) in {
            "Owners_Rent": ("Owner", "Rent"),
            "Owners_Sale": ("Owner", "Sale"),
            "Brokers_Rent": ("Broker", "Rent"),
            "Brokers_Sale": ("Broker", "Sale"),
        }.items():
            sub: Any = master[(master["Advertiser_Type"] == adv) & (master["Deal"] == deal)]
            if not sub.empty:
                sub.to_excel(writer, sheet_name=name, index=False)

    # 9. Fast & Memory-Efficient Styling
    wb = openpyxl.load_workbook(MASTER_EXCEL)
    hf = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    hfont = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")

    for ws in wb.worksheets:
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{ws.max_row}"
        for c in range(1, ws.max_column + 1):
            cell = ws.cell(1, c)
            cell.fill = hf
            cell.font = hfont
            cell.alignment = Alignment(horizontal="center", vertical="center")
            header_str = str(cell.value or "")
            col_width = min(max(len(header_str) + 5, 12), 40)
            ws.column_dimensions[get_column_letter(c)].width = col_width

    wb.save(MASTER_EXCEL)
    dur = round(time.time() - t0, 1)
    print(f"🎉 Merge Complete in {dur}s! Master Excel: {MASTER_EXCEL}")


if __name__ == "__main__":
    merge_all()
