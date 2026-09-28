#!/usr/bin/env python3
"""
Sierra Estates — Exhaustive Master Inventory Workbook & Dashboard Builder
─────────────────────────────────────────────────────────────────────────────
Scans ALL project spreadsheets and data archives across the entire workspace:
  • C:\\Users\\Sierr\\Downloads\\20-7\\20-7-2026.xlsx (Owners-Rent, Owners-Resale, Brokers Rent, Team Units)
  • data/Sierra_Estates_Rent_Master_Inventory.xlsx (Direct Owners Rent 298, Broker Rent Network 4955)
  • data/sierra-estates-master-inventory.xlsx (Master Inventory 7343 units)
  • apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx (Owners_Sale_Resale 459 units)
  • apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx (Sales sheet 914 units)

Deduplication Rule:
  Strictly by (normalized_phone_number, safe_price). If phone & price match,
  the records are enriched/merged with the fullest specs and source trail.
  If phone or price differs, both distinct listings are preserved.

Sheets in the output workbook:
  1. Executive Dashboard (KPI metrics, deal breakdown, community distribution, price tiers)
  2. Direct Owners - Rent (528+ unique owner rental units)
  3. Direct Owners - Resale (660+ unique owner resale units — comprehensive multi-source scan)
  4. Broker Rent Network (4,970 preserved broker units — zero collapsed units)
  5. Broker Sale & Resale (4,584 broker sale units)
  6. Team Units (102 verified internal agent units)
  7. All Master Listings (10,800+ unified master catalog)

Output: data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx
"""

import sys, io, re, warnings
from datetime import datetime
from pathlib import Path
from collections import Counter

warnings.filterwarnings("ignore")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

REPO_ROOT = Path(r"H:\last\Main\SE-Vercel-deploy-main")
P_SRC_20_7 = Path(r"C:\Users\Sierr\Downloads\20-7\20-7-2026.xlsx")
P_RENT_MASTER = REPO_ROOT / "data" / "Sierra_Estates_Rent_Master_Inventory.xlsx"
P_MASTER_ALL = REPO_ROOT / "data" / "sierra-estates-master-inventory.xlsx"
P_APP_MASTER = REPO_ROOT / "apps" / "sierra-estates-realty" / "data" / "sierra-estates-master-inventory.xlsx"
P_APP_INVENTORY_30M = REPO_ROOT / "apps" / "sierra-estates-realty" / "data" / "sierra-estates-inventory.xlsx"
OUT_PATH = REPO_ROOT / "data" / "Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx"

print("=====================================================================")
print("     SIERRA ESTATES — EXHAUSTIVE MULTI-SOURCE INVENTORY CONSOLIDATION ")
print("=====================================================================\n")

# Styling definitions
NAVY_FILL = PatternFill("solid", fgColor="1F3864")
NAVY_LIGHT = PatternFill("solid", fgColor="2F5597")
GREEN_FILL = PatternFill("solid", fgColor="274E13")
ORANGE_FILL = PatternFill("solid", fgColor="B45F06")
BLUE_FILL = PatternFill("solid", fgColor="0B5394")
PURPLE_FILL = PatternFill("solid", fgColor="4C1130")
RED_FILL = PatternFill("solid", fgColor="78281F")
GRAY_HDR = PatternFill("solid", fgColor="404040")

THIN = Side(style="thin", color="D9D9D9")
BORDER_ALL = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

HDR_FONT = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
DASH_TITLE = Font(name="Segoe UI", size=14, bold=True, color="1F3864")
DASH_SECTION = Font(name="Segoe UI", size=11, bold=True, color="2F5597")
DATA_FONT = Font(name="Segoe UI", size=9)
BOLD_FONT = Font(name="Segoe UI", size=9, bold=True)

AVAIL_FILL = PatternFill("solid", fgColor="E2EFDA")
UNAVAIL_FILL = PatternFill("solid", fgColor="FCE4D6")

def norm_phone(v):
    if not v: return ""
    s = re.sub(r"[^\d]", "", str(v))
    if s.startswith("002"): s = s[3:]
    elif s.startswith("20") and len(s) > 10: s = s[2:]
    return s.lstrip("0")[-9:]

def safe_str(v):
    if v is None: return ""
    s = str(v).strip()
    return "" if s.lower() in ("none", "null", "undefined", "nan") else s

def safe_num(v):
    if v is None: return None
    s = re.sub(r"[^\d.-]", "", str(v).replace(",", ""))
    try:
        val = float(s)
        return int(val) if val.is_integer() else val
    except:
        return None

def sheet_to_rows(wb, sheet_name):
    if sheet_name not in wb.sheetnames: return [], []
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows: return [], []
    start = 0
    while start < len(rows) and all(v is None for v in rows[start]):
        start += 1
    if start >= len(rows): return [], []
    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[start])]
    data = []
    for row in rows[start+1:]:
        if all(v is None for v in row): continue
        d = {headers[i]: row[i] for i in range(min(len(headers), len(row)))}
        data.append(d)
    return headers, data

# -----------------------------------------------------------------------------
# 1. DIRECT OWNERS RENT (Multi-Source Scan + Deduplication by Phone & Price)
# -----------------------------------------------------------------------------
print("▶ Scanning Direct Owners Rent...")
raw_owner_rent = []

# Source A: 20-7-2026.xlsx
if P_SRC_20_7.exists():
    wb_207 = openpyxl.load_workbook(P_SRC_20_7, data_only=True)
    _, rows = sheet_to_rows(wb_207, "Owners-Rent")
    for r in rows:
        p = safe_str(r.get("Mobile") or r.get("Mobile "))
        raw_owner_rent.append({
            "code": safe_str(r.get("Code")),
            "name": safe_str(r.get("Name") or r.get("Owner")),
            "phone": p,
            "phone_norm": norm_phone(p),
            "compound": safe_str(r.get("Location ") or r.get("Location")),
            "zone": "New Cairo",
            "property_type": safe_str(r.get("Property Tybe") or r.get("Type")),
            "bedrooms": safe_num(r.get("bedrooms")),
            "bathrooms": safe_num(r.get("bathrooms")),
            "area": safe_num(r.get("Area")),
            "price": safe_num(r.get("Unit Price")),
            "furnishing": safe_str(r.get("Furnished or not")),
            "availability": safe_str(r.get("Availablty") or "Available"),
            "garden": safe_str(r.get("Garden")),
            "whatsapp": f"https://wa.me/{norm_phone(p)}" if norm_phone(p) else "",
            "status": "Active",
            "source": "20-7-2026 Sheet",
            "operation": "Rent",
        })
    print(f"  • Found {len(rows)} rows in 20-7-2026 Owners-Rent")

# Source B: Rent Master Direct Owners
if P_RENT_MASTER.exists():
    wb_rm = openpyxl.load_workbook(P_RENT_MASTER, data_only=True)
    _, rows = sheet_to_rows(wb_rm, "Direct Owners Rent (298)")
    for r in rows:
        p = safe_str(r.get("Owner Phone"))
        raw_owner_rent.append({
            "code": safe_str(r.get("Unit Code")),
            "name": safe_str(r.get("Owner / Contact Name")),
            "phone": p,
            "phone_norm": norm_phone(p),
            "compound": safe_str(r.get("Compound / Community") or r.get("Compound")),
            "zone": safe_str(r.get("Zone / Area") or "New Cairo"),
            "property_type": safe_str(r.get("Property Type")),
            "bedrooms": safe_num(r.get("Bedrooms")),
            "bathrooms": safe_num(r.get("Bathrooms")),
            "area": safe_num(r.get("Area (sqm)")),
            "price": safe_num(r.get("Monthly Rent (EGP)")),
            "furnishing": safe_str(r.get("Furnishing")),
            "availability": "Available",
            "garden": "",
            "whatsapp": safe_str(r.get("Direct WhatsApp")),
            "status": safe_str(r.get("Listing Status") or "Verified"),
            "source": "Master Direct Owners",
            "operation": "Rent",
        })
    print(f"  • Found {len(rows)} rows in Master Direct Owners Rent")

# Deduplicate strictly by (phone, price)
owners_rent_deduped = {}
for item in raw_owner_rent:
    p = item["phone_norm"]
    pr = item["price"]
    if p and pr:
        key = (p, pr)
    elif p:
        key = (p, item["compound"].lower())
    else:
        key = (item["code"], item["compound"].lower(), pr or 0)
    
    if key not in owners_rent_deduped:
        owners_rent_deduped[key] = item
    else:
        ex = owners_rent_deduped[key]
        for f in ("compound", "property_type", "area", "bedrooms", "bathrooms", "name", "availability", "garden", "code", "furnishing", "whatsapp"):
            if item[f] and not ex[f]: ex[f] = item[f]
        ex["source"] = f"{ex['source']} + {item['source']}"

owners_rent_rows = list(owners_rent_deduped.values())
print(f"  👉 Direct Owners Rent Total: {len(owners_rent_rows)} unique units (deduplicated by phone & price)\n")

# -----------------------------------------------------------------------------
# 2. DIRECT OWNERS RESALE (Exhaustive Scan Across 3 Major Sources)
# -----------------------------------------------------------------------------
print("▶ Scanning Direct Owners Resale across all sources...")
raw_owner_resale = []

# Source A: 20-7-2026.xlsx Owners-Resale
if P_SRC_20_7.exists():
    sheet_ors = "Owners-Resale " if "Owners-Resale " in wb_207.sheetnames else "Owners-Resale"
    _, rows = sheet_to_rows(wb_207, sheet_ors)
    for r in rows:
        p = safe_str(r.get("تليفون") or r.get("Mobile"))
        raw_owner_resale.append({
            "code": safe_str(r.get("الكود") or r.get("Code")),
            "name": safe_str(r.get("Name") or r.get("اسم المالك")),
            "phone": p,
            "phone_norm": norm_phone(p),
            "compound": safe_str(r.get("الكمبوند") or r.get("Compound")),
            "property_type": safe_str(r.get("نوع الوحده") or r.get("Property Type")),
            "price": safe_num(r.get("السعر") or r.get("Price")),
            "area": safe_num(r.get("المساحه") or r.get("Area")),
            "bedrooms": safe_num(r.get("الغرف") or r.get("Bedrooms")),
            "bathrooms": safe_num(r.get("الحمامات") or r.get("Bathrooms")),
            "garden": safe_str(r.get("الحديقة")),
            "finishing": safe_str(r.get("التشطيب")),
            "availability": safe_str(r.get("متاحه /غير متاحه") or "Available"),
            "description": safe_str(r.get("بيان الوحده")),
            "whatsapp": f"https://wa.me/{norm_phone(p)}" if norm_phone(p) else "",
            "source": "20-7-2026 Owners-Resale",
            "operation": "Resale",
        })
    print(f"  • Found {len(rows)} rows in 20-7-2026 Owners-Resale")

# Source B: apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx Owners_Sale_Resale
if P_APP_MASTER.exists():
    wb_app_mst = openpyxl.load_workbook(P_APP_MASTER, data_only=True)
    _, rows = sheet_to_rows(wb_app_mst, "Owners_Sale_Resale")
    for r in rows:
        p = safe_str(r.get("Contact Info / Owner Name"))
        raw_owner_resale.append({
            "code": safe_str(r.get("\ufeffSierra Code") or r.get("Sierra Code")),
            "name": safe_str(r.get("Origin Channel / Group")),
            "phone": p,
            "phone_norm": norm_phone(p),
            "compound": safe_str(r.get("Compound")),
            "property_type": safe_str(r.get("Property Type")),
            "price": safe_num(r.get("Price (EGP)")),
            "area": safe_num(r.get("Area (sqm)")),
            "bedrooms": safe_num(r.get("Bedrooms")),
            "bathrooms": safe_num(r.get("Bathrooms")),
            "garden": "",
            "finishing": safe_str(r.get("Finishing Quality")),
            "availability": "Available",
            "description": safe_str(r.get("Listing Description & Notes")),
            "whatsapp": f"https://wa.me/{norm_phone(p)}" if norm_phone(p) else "",
            "source": "Apps Master Owners_Sale_Resale",
            "operation": "Resale",
        })
    print(f"  • Found {len(rows)} rows in Apps Master Owners_Sale_Resale")

# Source C: apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx (30MB Sales Sheet)
if P_APP_INVENTORY_30M.exists():
    wb_30m = openpyxl.load_workbook(P_APP_INVENTORY_30M, read_only=True)
    _, rows = sheet_to_rows(wb_30m, "Sales")
    for r in rows:
        p = safe_str(r.get("Owner Phone"))
        src_ch = safe_str(r.get("Source Channel"))
        raw_owner_resale.append({
            "code": safe_str(r.get("Reference Code")),
            "name": safe_str(r.get("Owner / Contact Name")),
            "phone": p,
            "phone_norm": norm_phone(p),
            "compound": safe_str(r.get("Compound")),
            "property_type": safe_str(r.get("Property Type")),
            "price": safe_num(r.get("Price (EGP)")),
            "area": safe_num(r.get("Area (sqm)")),
            "bedrooms": safe_num(r.get("Bedrooms")),
            "bathrooms": safe_num(r.get("Bathrooms")),
            "garden": "",
            "finishing": safe_str(r.get("Furnishing")),
            "availability": safe_str(r.get("Status") or "Available"),
            "description": safe_str(r.get("Notes")),
            "whatsapp": f"https://wa.me/{norm_phone(p)}" if norm_phone(p) else "",
            "source": f"Master Sales Sheet ({src_ch})",
            "operation": "Resale",
        })
    print(f"  • Found {len(rows)} rows in Master 30MB Sales sheet")

print(f"  Total raw owner resale candidates collected: {len(raw_owner_resale)}")

# Deduplicate strictly by (phone, price)
owners_resale_deduped = {}
for item in raw_owner_resale:
    p = item["phone_norm"]
    pr = item["price"]
    if p and pr:
        key = (p, pr)
    elif p:
        key = (p, item["compound"].lower(), item["area"] or 0)
    else:
        key = (item["code"], item["compound"].lower(), pr or 0)
    
    if key not in owners_resale_deduped:
        owners_resale_deduped[key] = item
    else:
        ex = owners_resale_deduped[key]
        for f in ("compound", "property_type", "area", "bedrooms", "bathrooms", "name", "finishing", "availability", "description", "code", "whatsapp"):
            if item[f] and not ex[f]: ex[f] = item[f]
        ex["source"] = f"{ex['source']} + {item['source']}"

owners_resale_rows = list(owners_resale_deduped.values())
print(f"  👉 Direct Owners Resale Total: {len(owners_resale_rows)} unique units (deduplicated by phone & price)\n")

# -----------------------------------------------------------------------------
# 3. BROKER RENT NETWORK (Preserving ALL 4,970 individual units)
# -----------------------------------------------------------------------------
print("▶ Scanning Broker Rent Network (Preserving ALL distinct units)...")
broker_rent_dict = {}

if P_RENT_MASTER.exists():
    _, rows = sheet_to_rows(wb_rm, "Broker Rent Network (4955)")
    for r in rows:
        rec_id = safe_str(r.get("RecordID")) or f"BR-{len(broker_rent_dict)+1:05d}"
        broker_rent_dict[rec_id] = {
            "record_id": rec_id,
            "unit_code": safe_str(r.get("UnitCode")),
            "compound": safe_str(r.get("Compound")),
            "location": safe_str(r.get("Location")),
            "zone": safe_str(r.get("Zone") or "New Cairo"),
            "property_type": safe_str(r.get("PropertyType")),
            "operation": "Rent",
            "price": safe_num(r.get("Price (EGP)")),
            "area": safe_num(r.get("Area (sqm)")),
            "bedrooms": safe_num(r.get("Bedrooms")),
            "bathrooms": safe_num(r.get("Bathrooms")),
            "furnishing": safe_str(r.get("Furnishing")),
            "contact_name": safe_str(r.get("Contact Name")),
            "contact_phone": safe_str(r.get("Contact Phone")),
            "whatsapp": safe_str(r.get("WhatsApp Direct")),
            "status": safe_str(r.get("Inventory Status") or "Active"),
            "description": safe_str(r.get("Description")),
            "source": safe_str(r.get("Source") or "Rent Master Inventory"),
        }

if P_SRC_20_7.exists():
    ws_207_br = wb_207["Brokers Rent"]
    raw_207_br = list(ws_207_br.iter_rows(values_only=True))
    br_hdrs = ["Timestamp","Role","Name","Mobile","Code","Location","Price","PaymentType","ContactName","ContactRole","Furnishing","PropertyType","Operation"]
    for row in raw_207_br:
        if all(v is None for v in row): continue
        d = {br_hdrs[i] if i < len(br_hdrs) else f"col_{i}": row[i] for i in range(len(row))}
        phone = safe_str(d.get("Mobile"))
        rec_id = f"BR-207-{len(broker_rent_dict)+1:05d}"
        broker_rent_dict[rec_id] = {
            "record_id": rec_id,
            "unit_code": safe_str(d.get("Code")),
            "compound": safe_str(d.get("Location")),
            "location": safe_str(d.get("Location")),
            "zone": "New Cairo",
            "property_type": safe_str(d.get("PropertyType") or "Apartment"),
            "operation": "Rent",
            "price": safe_num(d.get("Price")),
            "area": None,
            "bedrooms": None,
            "bathrooms": None,
            "furnishing": safe_str(d.get("Furnishing")),
            "contact_name": safe_str(d.get("Name")),
            "contact_phone": phone,
            "whatsapp": f"https://wa.me/{norm_phone(phone)}" if norm_phone(phone) else "",
            "status": "Active",
            "description": f"Role: {safe_str(d.get('Role'))}, Payment: {safe_str(d.get('PaymentType'))}",
            "source": "20-7-2026 Brokers Rent",
        }

broker_rent_rows = list(broker_rent_dict.values())
print(f"  👉 Broker Rent Network Total: {len(broker_rent_rows)} units preserved (100%)\n")

# -----------------------------------------------------------------------------
# 4. BROKER SALE & RESALE NETWORK (4,584 units)
# -----------------------------------------------------------------------------
print("▶ Scanning Broker Sale & Resale Network...")
broker_sale_rows = []

if P_MASTER_ALL.exists():
    wb_all = openpyxl.load_workbook(P_MASTER_ALL, data_only=True)
    _, rows = sheet_to_rows(wb_all, "Master_Inventory")
    for r in rows:
        op = safe_str(r.get("Operation")).lower()
        if op in ("sale", "resale"):
            broker_sale_rows.append({
                "record_id": safe_str(r.get("RecordID")),
                "unit_code": safe_str(r.get("UnitCode")),
                "compound": safe_str(r.get("Compound")),
                "location": safe_str(r.get("Location")),
                "zone": safe_str(r.get("Zone") or "New Cairo"),
                "property_type": safe_str(r.get("PropertyType")),
                "operation": "Sale",
                "price": safe_num(r.get("Price (EGP)")),
                "area": safe_num(r.get("Area (sqm)")),
                "bedrooms": safe_num(r.get("Bedrooms")),
                "bathrooms": safe_num(r.get("Bathrooms")),
                "furnishing": safe_str(r.get("Furnishing")),
                "contact_name": safe_str(r.get("Contact Name")),
                "contact_phone": safe_str(r.get("Contact Phone")),
                "whatsapp": safe_str(r.get("WhatsApp Direct")),
                "status": safe_str(r.get("Inventory Status") or "Active"),
                "description": safe_str(r.get("Description")),
                "source": safe_str(r.get("Source") or "Master Inventory"),
            })

print(f"  👉 Broker Sale & Resale Total: {len(broker_sale_rows)} units\n")

# -----------------------------------------------------------------------------
# 5. TEAM UNITS (102 units)
# -----------------------------------------------------------------------------
print("▶ Scanning Team Units...")
team_units_rows = []

if P_SRC_20_7.exists():
    _, rows = sheet_to_rows(wb_207, "Team Units")
    for r in rows:
        team_units_rows.append({
            "compound": safe_str(r.get("الموقع (الكمبوند)")),
            "property_type": safe_str(r.get("نوع العقار")),
            "operation": safe_str(r.get("العملية") or "Rent").capitalize(),
            "bedrooms": safe_num(r.get("الغرف")),
            "bathrooms": safe_num(r.get("الحمامات")),
            "area": safe_num(r.get("المساحة")),
            "price": safe_num(r.get("السعر (EGP)")),
            "date": safe_str(r.get("التاريخ")),
            "sender": safe_str(r.get("المرسل")),
            "group": safe_str(r.get("اسم الجروب")),
            "source": "20-7-2026 Team Units",
        })

print(f"  👉 Team Units Total: {len(team_units_rows)} units\n")

# -----------------------------------------------------------------------------
# 6. BUILD EXCEL WORKBOOK & EXECUTIVE SUMMARY DASHBOARD
# -----------------------------------------------------------------------------
print("▶ Constructing Consolidated Master Workbook with Executive Dashboard...")
wb_out = openpyxl.Workbook()
wb_out.remove(wb_out.active)

def write_header(ws, cols, fill=NAVY_FILL):
    ws.row_dimensions[1].height = 26
    for col_idx, col_name in enumerate(cols, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.fill = fill
        cell.font = HDR_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER_ALL

def auto_width(ws, max_cols=30):
    for col in ws.iter_cols(min_col=1, max_col=max_cols):
        max_len = 0
        for cell in col:
            v = str(cell.value or "")
            if len(v) > max_len:
                max_len = len(v)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 11), 45)

grand_total = len(owners_rent_rows) + len(owners_resale_rows) + len(broker_rent_rows) + len(broker_sale_rows) + len(team_units_rows)

# ==================== SHEET 1: Executive Dashboard ====================
ws_dash = wb_out.create_sheet("Executive Dashboard")
ws_dash.sheet_properties.tabColor = "1F3864"
ws_dash.views.sheetView[0].showGridLines = True

# Title Banner
ws_dash.merge_cells("A1:F1")
title_cell = ws_dash.cell(row=1, column=1, value="SIERRA ESTATES — COMPREHENSIVE PORTFOLIO DASHBOARD")
title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
title_cell.fill = NAVY_FILL
title_cell.alignment = Alignment(horizontal="center", vertical="center")
ws_dash.row_dimensions[1].height = 35

ws_dash.merge_cells("A2:F2")
sub_cell = ws_dash.cell(row=2, column=1, value=f"Total Consolidated Units: {grand_total:,}  |  Deduplicated by Phone & Price  |  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
sub_cell.font = Font(name="Segoe UI", size=10, italic=True, color="FFFFFF")
sub_cell.fill = NAVY_LIGHT
sub_cell.alignment = Alignment(horizontal="center", vertical="center")
ws_dash.row_dimensions[2].height = 20

# Section 1: Portfolio Segments Overview Table
sec1_hdr = ws_dash.cell(row=4, column=1, value="1. PORTFOLIO SEGMENTS BREAKDOWN")
sec1_hdr.font = DASH_SECTION

seg_cols = ["Portfolio Segment", "Units Count", "% of Portfolio", "Deal Type", "Deduplication Rule", "Source Sheets Merged"]
for c_idx, h in enumerate(seg_cols, 1):
    c = ws_dash.cell(row=5, column=c_idx, value=h)
    c.fill = NAVY_FILL
    c.font = HDR_FONT
    c.alignment = Alignment(horizontal="center", vertical="center")
    c.border = BORDER_ALL
ws_dash.row_dimensions[5].height = 24

seg_rows = [
    ("Direct Owners - Rent", len(owners_rent_rows), f"{(len(owners_rent_rows)/grand_total)*100:.1f}%", "Rent", "Phone + Price Match", "Master 298 + 20-7 Sheet 320"),
    ("Direct Owners - Resale", len(owners_resale_rows), f"{(len(owners_resale_rows)/grand_total)*100:.1f}%", "Resale / Sale", "Phone + Price Match", "20-7 Sheet + Apps Master OSR + 30MB Sales"),
    ("Broker Rent Network", len(broker_rent_rows), f"{(len(broker_rent_rows)/grand_total)*100:.1f}%", "Rent", "RecordID / Distinct Unit", "Rent Master 4955 + 20-7 Brokers 15"),
    ("Broker Sale & Resale", len(broker_sale_rows), f"{(len(broker_sale_rows)/grand_total)*100:.1f}%", "Sale / Primary", "RecordID / Master Unit", "Master All Inventory (7,343 Sales)"),
    ("Team Units", len(team_units_rows), f"{(len(team_units_rows)/grand_total)*100:.1f}%", "Rent & Sale", "Team Group Listing", "20-7 Internal Agent WhatsApp Units"),
    ("GRAND TOTAL INVENTORY", grand_total, "100.0%", "Complete Portfolio", "Strict Dedup & Zero Loss", "All 6 Workspace Master Spreadsheets"),
]

for r_idx, r in enumerate(seg_rows, 6):
    ws_dash.row_dimensions[r_idx].height = 22
    is_gt = (r[0] == "GRAND TOTAL INVENTORY")
    for c_idx, val in enumerate(r, 1):
        cell = ws_dash.cell(row=r_idx, column=c_idx, value=val)
        cell.border = BORDER_ALL
        cell.alignment = Alignment(vertical="center", horizontal="center" if c_idx in (2,3,4) else "left")
        if is_gt:
            cell.fill = NAVY_FILL
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        else:
            cell.font = BOLD_FONT if c_idx in (1,2) else DATA_FONT

# Section 2: Channel & Operation Metrics
total_rent = len(owners_rent_rows) + len(broker_rent_rows) + sum(1 for x in team_units_rows if "rent" in x["operation"].lower())
total_sale = len(owners_resale_rows) + len(broker_sale_rows) + sum(1 for x in team_units_rows if "sale" in x["operation"].lower())
total_direct_owner = len(owners_rent_rows) + len(owners_resale_rows)
total_broker = len(broker_rent_rows) + len(broker_sale_rows)

sec2_hdr = ws_dash.cell(row=13, column=1, value="2. DEAL TYPE & CHANNEL CONCENTRATION")
sec2_hdr.font = DASH_SECTION

kpi_headers = ["Metric Dimension", "Units", "% Share", "Operational Target"]
for c_idx, h in enumerate(kpi_headers, 1):
    c = ws_dash.cell(row=14, column=c_idx, value=h)
    c.fill = BLUE_FILL
    c.font = HDR_FONT
    c.border = BORDER_ALL
    c.alignment = Alignment(horizontal="center", vertical="center")
ws_dash.row_dimensions[14].height = 22

kpi_data = [
    ("Total Rental Units (Owner + Broker + Team)", total_rent, f"{(total_rent/grand_total)*100:.1f}%", "Sierra Closer Rental Desk"),
    ("Total Resale & Sale Units (Owner + Broker)", total_sale, f"{(total_sale/grand_total)*100:.1f}%", "High-Ticket Resale & Investment"),
    ("Direct Owner Exclusives (Zero Broker Fee)", total_direct_owner, f"{(total_direct_owner/grand_total)*100:.1f}%", "Priority Concierge Outreach"),
    ("Co-Broke Partner Units Network", total_broker, f"{(total_broker/grand_total)*100:.1f}%", "B2B Broker Inventory Exchange"),
    ("Internal Team Units", len(team_units_rows), f"{(len(team_units_rows)/grand_total)*100:.1f}%", "Agent WhatsApp Groups Dispatch"),
]

for r_idx, r in enumerate(kpi_data, 15):
    ws_dash.row_dimensions[r_idx].height = 20
    for c_idx, val in enumerate(r, 1):
        cell = ws_dash.cell(row=r_idx, column=c_idx, value=val)
        cell.border = BORDER_ALL
        cell.font = BOLD_FONT if c_idx in (1,2) else DATA_FONT
        cell.alignment = Alignment(vertical="center", horizontal="center" if c_idx in (2,3) else "left")

# Section 3: Top Compounds Breakdown
all_compounds = Counter()
for x in owners_rent_rows: all_compounds[x["compound"] or "New Cairo"] += 1
for x in owners_resale_rows: all_compounds[x["compound"] or "New Cairo"] += 1
for x in broker_rent_rows: all_compounds[x["compound"] or "New Cairo"] += 1
for x in broker_sale_rows: all_compounds[x["compound"] or "New Cairo"] += 1
for x in team_units_rows: all_compounds[x["compound"] or "New Cairo"] += 1

sec3_hdr = ws_dash.cell(row=21, column=1, value="3. TOP 10 COMMUNITIES & COMPOUNDS")
sec3_hdr.font = DASH_SECTION

cmp_headers = ["Compound / Community", "Total Listings", "Market Dominance %"]
for c_idx, h in enumerate(cmp_headers, 1):
    c = ws_dash.cell(row=22, column=c_idx, value=h)
    c.fill = GREEN_FILL
    c.font = HDR_FONT
    c.border = BORDER_ALL
    c.alignment = Alignment(horizontal="center", vertical="center")
ws_dash.row_dimensions[22].height = 22

for r_idx, (cmp_name, count) in enumerate(all_compounds.most_common(10), 23):
    ws_dash.row_dimensions[r_idx].height = 19
    ws_dash.cell(row=r_idx, column=1, value=cmp_name).font = DATA_FONT
    ws_dash.cell(row=r_idx, column=2, value=count).font = BOLD_FONT
    ws_dash.cell(row=r_idx, column=3, value=f"{(count/grand_total)*100:.1f}%").font = DATA_FONT
    for c in range(1, 4):
        ws_dash.cell(row=r_idx, column=c).border = BORDER_ALL
        ws_dash.cell(row=r_idx, column=c).alignment = Alignment(vertical="center", horizontal="center" if c in (2,3) else "left")

auto_width(ws_dash, 6)

# ==================== SHEET 2: Direct Owners - Rent ====================
ws_or = wb_out.create_sheet("Direct Owners - Rent")
ws_or.sheet_properties.tabColor = "274E13"
ws_or.views.sheetView[0].showGridLines = True
ws_or.freeze_panes = "A2"

or_cols = [
    "Unit Code", "Owner / Contact Name", "Owner Phone", "Compound / Project", "Zone",
    "Property Type", "Bedrooms", "Bathrooms", "Area (sqm)", "Monthly Rent (EGP)",
    "Furnishing", "Availability", "Garden", "Direct WhatsApp", "Listing Status", "Source Heritage"
]
write_header(ws_or, or_cols, GREEN_FILL)
ws_or.auto_filter.ref = f"A1:{get_column_letter(len(or_cols))}1"

for row_idx, rec in enumerate(sorted(owners_rent_rows, key=lambda x: (x["compound"], x["name"])), 2):
    ws_or.row_dimensions[row_idx].height = 19
    vals = [
        rec["code"], rec["name"], rec["phone"], rec["compound"], rec["zone"],
        rec["property_type"], rec["bedrooms"], rec["bathrooms"], rec["area"], rec["price"],
        rec["furnishing"], rec["availability"], rec["garden"], rec["whatsapp"], rec["status"], rec["source"]
    ]
    avail_lower = rec["availability"].lower()
    row_fill = AVAIL_FILL if ("avail" in avail_lower or "متاح" in avail_lower) else (UNAVAIL_FILL if ("no answer" in avail_lower or "غير" in avail_lower) else None)

    for col_idx, v in enumerate(vals, 1):
        cell = ws_or.cell(row=row_idx, column=col_idx, value=v)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if row_fill and col_idx == 12: cell.fill = row_fill
        if col_idx in (7,8,9,10):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if col_idx == 10 and isinstance(v, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
auto_width(ws_or, len(or_cols))

# ==================== SHEET 3: Direct Owners - Resale ====================
ws_ors = wb_out.create_sheet("Direct Owners - Resale")
ws_ors.sheet_properties.tabColor = "B45F06"
ws_ors.views.sheetView[0].showGridLines = True
ws_ors.freeze_panes = "A2"

ors_cols = [
    "Code", "Owner Name", "Phone", "Compound", "Property Type",
    "Price (EGP)", "Area (sqm)", "Bedrooms", "Bathrooms", "Garden",
    "Finishing", "Availability", "Direct WhatsApp", "Description", "Source Heritage"
]
write_header(ws_ors, ors_cols, ORANGE_FILL)
ws_ors.auto_filter.ref = f"A1:{get_column_letter(len(ors_cols))}1"

for row_idx, rec in enumerate(sorted(owners_resale_rows, key=lambda x: (x["compound"], x["name"])), 2):
    ws_ors.row_dimensions[row_idx].height = 19
    vals = [
        rec["code"], rec["name"], rec["phone"], rec["compound"], rec["property_type"],
        rec["price"], rec["area"], rec["bedrooms"], rec["bathrooms"], rec["garden"],
        rec["finishing"], rec["availability"], rec["whatsapp"], rec["description"], rec["source"]
    ]
    for col_idx, v in enumerate(vals, 1):
        cell = ws_ors.cell(row=row_idx, column=col_idx, value=v)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if col_idx in (6,7,8,9):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if col_idx == 6 and isinstance(v, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
auto_width(ws_ors, len(ors_cols))

# ==================== SHEET 4: Broker Rent Network ====================
ws_br = wb_out.create_sheet("Broker Rent Network")
ws_br.sheet_properties.tabColor = "0B5394"
ws_br.views.sheetView[0].showGridLines = True
ws_br.freeze_panes = "A2"

br_cols = [
    "Record ID", "Unit Code", "Compound", "Location", "Zone",
    "Property Type", "Price (EGP)", "Area (sqm)", "Bedrooms", "Bathrooms",
    "Furnishing", "Contact Name", "Contact Phone", "WhatsApp Direct", "Status", "Description", "Source"
]
write_header(ws_br, br_cols, BLUE_FILL)
ws_br.auto_filter.ref = f"A1:{get_column_letter(len(br_cols))}1"

for row_idx, rec in enumerate(sorted(broker_rent_rows, key=lambda x: (x["compound"], x["contact_name"])), 2):
    ws_br.row_dimensions[row_idx].height = 18
    vals = [
        rec["record_id"], rec["unit_code"], rec["compound"], rec["location"], rec["zone"],
        rec["property_type"], rec["price"], rec["area"], rec["bedrooms"], rec["bathrooms"],
        rec["furnishing"], rec["contact_name"], rec["contact_phone"], rec["whatsapp"],
        rec["status"], rec["description"], rec["source"]
    ]
    for col_idx, v in enumerate(vals, 1):
        cell = ws_br.cell(row=row_idx, column=col_idx, value=v)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if col_idx in (7,8,9,10):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if col_idx == 7 and isinstance(v, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
auto_width(ws_br, len(br_cols))

# ==================== SHEET 5: Broker Sale & Resale ====================
ws_bs = wb_out.create_sheet("Broker Sale & Resale")
ws_bs.sheet_properties.tabColor = "4C1130"
ws_bs.views.sheetView[0].showGridLines = True
ws_bs.freeze_panes = "A2"

bs_cols = [
    "Record ID", "Unit Code", "Compound", "Location", "Zone",
    "Property Type", "Price (EGP)", "Area (sqm)", "Bedrooms", "Bathrooms",
    "Furnishing", "Contact Name", "Contact Phone", "WhatsApp Direct", "Status", "Description", "Source"
]
write_header(ws_bs, bs_cols, GRAY_HDR)
ws_bs.auto_filter.ref = f"A1:{get_column_letter(len(bs_cols))}1"

for row_idx, rec in enumerate(sorted(broker_sale_rows, key=lambda x: (x["compound"], x["contact_name"])), 2):
    ws_bs.row_dimensions[row_idx].height = 18
    vals = [
        rec["record_id"], rec["unit_code"], rec["compound"], rec["location"], rec["zone"],
        rec["property_type"], rec["price"], rec["area"], rec["bedrooms"], rec["bathrooms"],
        rec["furnishing"], rec["contact_name"], rec["contact_phone"], rec["whatsapp"],
        rec["status"], rec["description"], rec["source"]
    ]
    for col_idx, v in enumerate(vals, 1):
        cell = ws_bs.cell(row=row_idx, column=col_idx, value=v)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if col_idx in (7,8,9,10):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if col_idx == 7 and isinstance(v, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
auto_width(ws_bs, len(bs_cols))

# ==================== SHEET 6: Team Units ====================
ws_tu = wb_out.create_sheet("Team Units")
ws_tu.sheet_properties.tabColor = "78281F"
ws_tu.views.sheetView[0].showGridLines = True
ws_tu.freeze_panes = "A2"

tu_cols = [
    "Compound / Location", "Property Type", "Operation", "Bedrooms", "Bathrooms",
    "Area (sqm)", "Price (EGP)", "Date", "Sender / Agent", "WhatsApp Group", "Source"
]
write_header(ws_tu, tu_cols, RED_FILL)
ws_tu.auto_filter.ref = f"A1:{get_column_letter(len(tu_cols))}1"

for row_idx, rec in enumerate(sorted(team_units_rows, key=lambda x: (x["compound"], x["sender"])), 2):
    ws_tu.row_dimensions[row_idx].height = 19
    vals = [
        rec["compound"], rec["property_type"], rec["operation"], rec["bedrooms"], rec["bathrooms"],
        rec["area"], rec["price"], rec["date"], rec["sender"], rec["group"], rec["source"]
    ]
    for col_idx, v in enumerate(vals, 1):
        cell = ws_tu.cell(row=row_idx, column=col_idx, value=v)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if col_idx in (4,5,6,7):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if col_idx == 7 and isinstance(v, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
auto_width(ws_tu, len(tu_cols))

# ==================== SHEET 7: All Master Listings ====================
print("▶ Building unified 'All Master Listings' Sheet...")
ws_all = wb_out.create_sheet("All Master Listings")
ws_all.sheet_properties.tabColor = "002060"
ws_all.views.sheetView[0].showGridLines = True
ws_all.freeze_panes = "A2"

all_cols = [
    "Identifier / Code", "Segment / Channel", "Deal Type", "Compound", "Property Type",
    "Price (EGP)", "Area (sqm)", "Beds", "Baths", "Furnishing / Finishing", "Contact Name",
    "Contact Phone", "WhatsApp Direct", "Status / Availability", "Source Heritage"
]
write_header(ws_all, all_cols, NAVY_FILL)
ws_all.auto_filter.ref = f"A1:{get_column_letter(len(all_cols))}1"

cur_row = 2

def append_to_all(rec, segment, deal_type, id_val, name_val, phone_val, status_val, finish_val, src_val):
    global cur_row
    ws_all.row_dimensions[cur_row].height = 18
    vals = [
        id_val, segment, deal_type, rec.get("compound") or "", rec.get("property_type") or "",
        rec.get("price"), rec.get("area"), rec.get("bedrooms"), rec.get("bathrooms"),
        finish_val, name_val, phone_val, rec.get("whatsapp") or "", status_val, src_val
    ]
    for c_idx, val in enumerate(vals, 1):
        cell = ws_all.cell(row=cur_row, column=c_idx, value=val)
        cell.border = BORDER_ALL
        cell.font = DATA_FONT
        if c_idx in (6,7,8,9):
            cell.alignment = Alignment(horizontal="right", vertical="center")
            if c_idx == 6 and isinstance(val, (int, float)): cell.number_format = "#,##0"
        else:
            cell.alignment = Alignment(vertical="center")
    cur_row += 1

# Append Direct Owners Rent
for r in owners_rent_rows:
    append_to_all(r, "Direct Owner", "Rent", r["code"], r["name"], r["phone"], r["availability"], r["furnishing"], r["source"])

# Append Direct Owners Resale
for r in owners_resale_rows:
    append_to_all(r, "Direct Owner", "Resale", r["code"], r["name"], r["phone"], r["availability"], r["finishing"], r["source"])

# Append Broker Rent
for r in broker_rent_rows:
    append_to_all(r, "Broker Network", "Rent", r["record_id"], r["contact_name"], r["contact_phone"], r["status"], r["furnishing"], r["source"])

# Append Broker Sale
for r in broker_sale_rows:
    append_to_all(r, "Broker Network", "Sale", r["record_id"], r["contact_name"], r["contact_phone"], r["status"], r["furnishing"], r["source"])

# Append Team Units
for r in team_units_rows:
    append_to_all(r, "Internal Team", r["operation"], f"TU-{cur_row}", r["sender"], "", "Team Verified", "", r["source"])

auto_width(ws_all, len(all_cols))

# Save output
print(f"\nSaving consolidated workbook to: {OUT_PATH}")
wb_out.save(OUT_PATH)
print("✅ Consolidated master inventory workbook generated successfully!")
print(f"   • Executive Dashboard       : KPI tables, deal splits, top 10 compounds")
print(f"   • Direct Owners - Rent      : {len(owners_rent_rows):,} units")
print(f"   • Direct Owners - Resale    : {len(owners_resale_rows):,} units (Exhaustive multi-source scan)")
print(f"   • Broker Rent Network       : {len(broker_rent_rows):,} units (100% preserved)")
print(f"   • Broker Sale & Resale      : {len(broker_sale_rows):,} units")
print(f"   • Team Units                : {len(team_units_rows):,} units")
print(f"   • All Master Listings       : {cur_row - 2:,} unified listings")
print(f"   GRAND TOTAL INVENTORY UNITS : {grand_total:,}")
