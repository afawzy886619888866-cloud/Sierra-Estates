import csv
import glob
import os
import re
import sys
import json
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8')

# Canonical Columns (22 Columns)
CANONICAL_COLUMNS = [
    "Timestamp",
    "Unit Code",
    "Deal Type",
    "Compound (Canonical)",
    "Property Type",
    "Asking Price (EGP)",
    "Area (m²)",
    "Bedrooms",
    "Bathrooms",
    "Finishing Status",
    "Floor",
    "Garden (m²)",
    "Pool",
    "Advertiser Type",
    "Contact Name",
    "Mobile Number",
    "Mobile (Last 7)",
    "Availability Status",
    "Last Action Date",
    "Owner Call Response & Notes",
    "Photo URLs",
    "RAG Memory ID"
]

BOT_GUIDANCE_ROW = [
    "e.g. 2026-11-03 21:00:00",
    "e.g. CFC-APT-104",
    "Dropdown: Rent or Resale",
    "Canonical Compound (e.g. Cairo Festival City)",
    "Dropdown: Apartment, Villa, etc.",
    "Numeric: Rent <= 400,000 | Resale > 400,000",
    "Numeric area (m²)",
    "Dropdown: Studio, 1, 2, 3, 4, 5, 6+",
    "Dropdown: 1, 2, 3, 4, 5+",
    "Dropdown: Core & Shell, Semi Finished, Fully Finished, Furnished, Ultra Super Lux",
    "Floor level or Not Specified",
    "Numeric garden m² or No Info",
    "Dropdown: Yes, No, Shared, Not Specified",
    "Dropdown: Direct Owner or Broker",
    "Full name of owner/broker",
    "REQUIRED: 01xxxxxxxxx (11 digits)",
    "Auto: Last 7 digits for deduplication",
    "Dropdown: Available, Under Offer, Rented, Sold, No Answer, Not Available",
    "Date: YYYY-MM-DD / تاريخ اخر تواصل",
    "Detailed call feedback, price changes, viewing terms",
    "Image URLs or No Photos",
    "Supabase Vector UUID / RAG Tag"
]

# Compound Gazetteer
COMPOUND_MAP = {
    "cfc": "Cairo Festival City",
    "cairo festival city": "Cairo Festival City",
    "cairo festival": "Cairo Festival City",
    "كايرو فيستيفال": "Cairo Festival City",
    "كايرو فيستيفال سيتي": "Cairo Festival City",
    "oriana": "Oriana (Festival City)",
    "اوريانا": "Oriana (Festival City)",
    "madinaty": "Madinaty",
    "مدينتي": "Madinaty",
    "rehab": "Al Rehab",
    "al rehab": "Al Rehab",
    "الرحاب": "Al Rehab",
    "mivida": "Mivida",
    "mevida": "Mivida",
    "ميفيدا": "Mivida",
    "eastown": "Eastown",
    "ايست تاون": "Eastown",
    "ايستاون": "Eastown",
    "hyde park": "Hyde Park",
    "هايد بارك": "Hyde Park",
    "villette": "Villette (Sodic)",
    "فيليت": "Villette (Sodic)",
    "palm hills": "Palm Hills New Cairo",
    "بالم هيلز": "Palm Hills New Cairo",
    "pk1": "Palm Hills (PK1)",
    "pk2": "Palm Hills (PK2)",
    "village gate": "Village Gate (Palm Hills)",
    "village avenue": "Village Avenue",
    "mountain view": "Mountain View iCity",
    "ماونتن فيو": "Mountain View iCity",
    "icity": "Mountain View iCity",
    "fifth square": "Fifth Square (Al Marasem)",
    "المراسم": "Fifth Square (Al Marasem)",
    "فيفث سكوير": "Fifth Square (Al Marasem)",
    "katameya dunes": "Katameya Dunes",
    "قطامية ديونز": "Katameya Dunes",
    "katameya heights": "Katameya Heights",
    "قطامية هايتس": "Katameya Heights",
    "katameya residence": "Katameya Residence",
    "lake view": "Lake View",
    "ليك فيو": "Lake View",
    "lake view residence": "Lake View Residence",
    "waterway": "The Waterway",
    "water way": "The Waterway",
    "واتر واي": "The Waterway",
    "swan lake": "Swan Lake (Hassan Allam)",
    "سوان ليك": "Swan Lake (Hassan Allam)",
    "azzar": "Azzar",
    "ازار": "Azzar",
    "sarai": "Sarai",
    "سراي": "Sarai",
    "taj city": "Taj City",
    "تاج سيتي": "Taj City",
    "zed east": "Zed East (Ora)",
    "زد ايست": "Zed East (Ora)",
    "golden square": "Golden Square",
    "المربع الذهبي": "Golden Square",
    "zayed": "Sheikh Zayed",
    "zaid": "Sheikh Zayed",
    "sheikh zayed": "Sheikh Zayed",
    "6th of october": "6th of October",
    "new cairo": "New Cairo (General)",
    "التجمع": "Fifth Settlement",
    "fifth settlement": "Fifth Settlement",
    "sodic east": "SODIC East"
}

def clean_phone(p):
    if not p: return None, None
    digits = re.sub(r'\D', '', str(p))
    if digits.startswith("20") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) == 10 and digits.startswith("1"):
        digits = "0" + digits
    if re.match(r'^01[0125]\d{8}$', digits):
        return digits, digits[-7:]
    return None, None

def clean_price(val):
    if val is None or val == "": return 0.0
    val_str = str(val).strip().replace(',', '')
    if '.' in val_str and val_str.count('.') > 1:
        # e.g. 4.600.000 -> 4600000
        val_str = val_str.replace('.', '')
    val_str = re.sub(r'[^\d.]', '', val_str)
    try:
        return float(val_str)
    except:
        return 0.0

def clean_compound(val):
    if not val: return "New Cairo (General)"
    s = str(val).strip().lower()
    for k, v in COMPOUND_MAP.items():
        if k in s:
            return v
    return str(val).strip() if str(val).strip() else "New Cairo (General)"

def clean_prop_type(val):
    if not val: return "Apartment"
    s = str(val).strip().lower()
    if "villa" in s or "فيلا" in s: return "Standalone Villa"
    if "town" in s or "تاون" in s: return "Townhouse"
    if "twin" in s or "توين" in s: return "Twin House"
    if "pent" in s or "بنتهاوس" in s: return "Penthouse"
    if "duplex" in s or "دوبلكس" in s: return "Duplex"
    if "studio" in s or "استوديو" in s: return "Studio"
    if "chalet" in s or "شاليه" in s: return "Chalet"
    if "commercial" in s or "تجاري" in s: return "Commercial"
    if "admin" in s or "اداري" in s: return "Admin Office"
    return "Apartment"

def clean_finishing(val):
    if not val: return "Not Specified"
    s = str(val).strip().lower()
    if "ultra" in s or "الترا" in s or "super lux" in s: return "Ultra Super Lux"
    if "fully" in s or "finished" in s or "كامل" in s or "متشطب" in s or "شركه" in s: return "Fully Finished"
    if "semi" in s or "نصف" in s or "half" in s: return "Semi Finished"
    if "core" in s or "shell" in s or "طوب" in s or "محاره" in s: return "Core & Shell"
    if "furnish" in s or "مفروش" in s: return "Furnished"
    return "Not Specified"

def clean_availability(val):
    if not val: return "Available"
    s = str(val).strip().lower()
    if "not" in s or "غير" in s: return "Not Available"
    if "rented" in s or "تاجر" in s: return "Rented"
    if "sold" in s or "اتباع" in s: return "Sold"
    if "under" in s or "offer" in s: return "Under Offer"
    if "no answer" in s or "مبيردش" in s: return "No Answer"
    if "avail" in s or "متاح" in s: return "Available"
    return "Available"

print("="*60)
print("SIERRA ESTATES: MASTER 6-TAB INVENTORY MERGE ENGINE")
print("="*60)

raw_units = []

# Helper to process any CSV
def ingest_csv(fpath, default_adv="Direct Owner", default_deal="Rent"):
    if not os.path.exists(fpath): return
    with open(fpath, "r", encoding="utf-8") as f:
        reader = list(csv.reader(f))
    if not reader: return
    headers = [h.strip().lower() for h in reader[0]]

    # Map headers
    c_mob = next((i for i, h in enumerate(headers) if any(k in h for k in ["mobile", "تليفون", "phone", "موبايل"])), None)
    c_price = next((i for i, h in enumerate(headers) if any(k in h for k in ["price", "سعر"])), None)
    c_name = next((i for i, h in enumerate(headers) if any(k in h for k in ["name", "اسم", "owner / broker"])), None)
    c_comp = next((i for i, h in enumerate(headers) if any(k in h for k in ["location", "كمبوند", "موقع", "compound"])), None)
    c_ptype = next((i for i, h in enumerate(headers) if any(k in h for k in ["property ty", "نوع الوحده", "property type"])), None)
    c_code = next((i for i, h in enumerate(headers) if any(k in h for k in ["code", "كود", "unit code"])), None)
    c_area = next((i for i, h in enumerate(headers) if any(k in h for k in ["space", "مساح", "area"])), None)
    c_beds = next((i for i, h in enumerate(headers) if any(k in h for k in ["bedroom", "غرف", "bedrooms"])), None)
    c_baths = next((i for i, h in enumerate(headers) if any(k in h for k in ["bath", "حمام", "bathrooms"])), None)
    c_furn = next((i for i, h in enumerate(headers) if any(k in h for k in ["furnish", "تشطيب", "finishing"])), None)
    c_avail = next((i for i, h in enumerate(headers) if any(k in h for k in ["availab", "متاح", "availability"])), None)
    c_action = next((i for i, h in enumerate(headers) if any(k in h for k in ["تواصل", "متابعه", "تحديث", "last action", "last update"])), None)
    c_notes = next((i for i, h in enumerate(headers) if any(k in h for k in ["comment", "ملحوظ", "بيان", "تفاصيل", "notes", "response"])), None)
    c_adv = next((i for i, h in enumerate(headers) if any(k in h for k in ["advertiser", "owner", "broker"])), None)
    c_deal = next((i for i, h in enumerate(headers) if any(k in h for k in ["deal type", "بيع/ ايجار", "type"])), None)
    c_garden = next((i for i, h in enumerate(headers) if any(k in h for k in ["garden", "حديق"])), None)
    c_pool = next((i for i, h in enumerate(headers) if "pool" in h), None)
    c_time = next((i for i, h in enumerate(headers) if "timestamp" in h), None)

    for r in reader[1:]:
        if not any(r): continue
        raw_phone = r[c_mob].strip() if c_mob is not None and c_mob < len(r) else ""
        digits, last7 = clean_phone(raw_phone)
        if not digits: continue

        price = clean_price(r[c_price]) if c_price is not None and c_price < len(r) else 0.0
        name = r[c_name].strip() if c_name is not None and c_name < len(r) else ""
        comp = clean_compound(r[c_comp] if c_comp is not None and c_comp < len(r) else "")
        ptype = clean_prop_type(r[c_ptype] if c_ptype is not None and c_ptype < len(r) else "")
        furn = clean_finishing(r[c_furn] if c_furn is not None and c_furn < len(r) else "")
        avail = clean_availability(r[c_avail] if c_avail is not None and c_avail < len(r) else "")
        action = r[c_action].strip() if c_action is not None and c_action < len(r) else ""
        notes = r[c_notes].strip() if c_notes is not None and c_notes < len(r) else ""
        code = r[c_code].strip() if c_code is not None and c_code < len(r) else ""
        area_raw = r[c_area].strip() if c_area is not None and c_area < len(r) else ""
        area_clean = re.sub(r'[^\d]', '', area_raw)
        area = area_clean if area_clean and int(area_clean) > 10 else "Not Specified"
        beds = r[c_beds].strip() if c_beds is not None and c_beds < len(r) else "Not Specified"
        baths = r[c_baths].strip() if c_baths is not None and c_baths < len(r) else "Not Specified"
        garden = r[c_garden].strip() if c_garden is not None and c_garden < len(r) else "No Info"
        pool = r[c_pool].strip() if c_pool is not None and c_pool < len(r) else "Not Specified"
        ts = r[c_time].strip() if c_time is not None and c_time < len(r) else ""

        # Determine Advertiser
        adv = default_adv
        if c_adv is not None and c_adv < len(r):
            raw_adv = r[c_adv].strip().lower()
            if "broker" in raw_adv or "بروكر" in raw_adv:
                adv = "Broker"
            elif "owner" in raw_adv or "مالك" in raw_adv:
                adv = "Direct Owner"

        # Determine Deal Type with 400k Rent Ceiling Guard
        raw_dt = r[c_deal].strip().lower() if c_deal is not None and c_deal < len(r) else default_deal.lower()
        if price > 400000:
            deal_type = "Resale"
        elif 0 < price <= 400000:
            deal_type = "Rent"
        else:
            deal_type = "Resale" if any(k in raw_dt for k in ["sell", "sale", "بيع"]) else default_deal

        raw_units.append({
            "source": os.path.basename(fpath),
            "Timestamp": ts or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Unit Code": code,
            "Deal Type": deal_type,
            "Compound (Canonical)": comp,
            "Property Type": ptype,
            "Asking Price (EGP)": price,
            "Area (m²)": area,
            "Bedrooms": beds if beds else "Not Specified",
            "Bathrooms": baths if baths else "Not Specified",
            "Finishing Status": furn,
            "Floor": "Not Specified",
            "Garden (m²)": garden or "No Info",
            "Pool": pool or "Not Specified",
            "Advertiser Type": adv,
            "Contact Name": name,
            "Mobile Number": "'" + digits,
            "Mobile (Last 7)": "'" + last7,
            "Availability Status": avail,
            "Last Action Date": action or datetime.now().strftime("%Y-%m-%d"),
            "Owner Call Response & Notes": notes or "No Notes",
            "Photo URLs": "No Photos",
            "RAG Memory ID": ""
        })

# Ingest all available sources
print("Ingesting online downloaded tabs...")
ingest_csv("scratch/online_tabs_raw/Owners_Rent_Master.csv", "Direct Owner", "Rent")
ingest_csv("scratch/online_tabs_raw/Owners-Rent.csv", "Direct Owner", "Rent")
ingest_csv("scratch/online_tabs_raw/Owners-Rent 2.csv", "Direct Owner", "Rent")
ingest_csv("scratch/online_tabs_raw/Owners_Resale_Master.csv", "Direct Owner", "Resale")
ingest_csv("scratch/online_tabs_raw/Owners-Resale.csv", "Direct Owner", "Resale")
ingest_csv("scratch/online_tabs_raw/Brokers_Inventory.csv", "Broker", "Rent")
ingest_csv("scratch/online_tabs_raw/Brokers Rent.csv", "Broker", "Rent")
ingest_csv("scratch/online_tabs_raw/Not Available Properties.csv", "Direct Owner", "Rent")

print(f"Total raw records parsed: {len(raw_units)}")

# Deduplication by Mobile Last 7 (with smart field absorption)
deduped_map = {}

for u in raw_units:
    l7 = u["Mobile (Last 7)"]
    if l7 not in deduped_map:
        deduped_map[l7] = u
    else:
        ex = deduped_map[l7]
        # Merge logic: preserve the most complete / informative data
        if (not ex["Contact Name"] or ex["Contact Name"] in ["Unknown", "Owner", "N/A"]) and u["Contact Name"] not in ["", "Unknown", "Owner", "N/A"]:
            ex["Contact Name"] = u["Contact Name"]
        if ex["Asking Price (EGP)"] == 0 and u["Asking Price (EGP)"] > 0:
            ex["Asking Price (EGP)"] = u["Asking Price (EGP)"]
            ex["Deal Type"] = u["Deal Type"]
        if ex["Area (m²)"] in ["Not Specified", "N/A", ""] and u["Area (m²)"] not in ["Not Specified", "N/A", ""]:
            ex["Area (m²)"] = u["Area (m²)"]
        if ex["Bedrooms"] in ["Not Specified", "N/A", ""] and u["Bedrooms"] not in ["Not Specified", "N/A", ""]:
            ex["Bedrooms"] = u["Bedrooms"]
        if ex["Bathrooms"] in ["Not Specified", "N/A", ""] and u["Bathrooms"] not in ["Not Specified", "N/A", ""]:
            ex["Bathrooms"] = u["Bathrooms"]
        if ex["Finishing Status"] in ["Not Specified", "N/A", ""] and u["Finishing Status"] not in ["Not Specified", "N/A", ""]:
            ex["Finishing Status"] = u["Finishing Status"]
        if (not ex["Owner Call Response & Notes"] or ex["Owner Call Response & Notes"] in ["No Notes", "N/A"]) and u["Owner Call Response & Notes"] not in ["", "No Notes", "N/A"]:
            ex["Owner Call Response & Notes"] = u["Owner Call Response & Notes"]
        # Last Action Date: pick the freshest date if present
        if u["Last Action Date"] and u["Last Action Date"] not in ["No Contact Yet", "2026-10-31"]:
            ex["Last Action Date"] = u["Last Action Date"]
        # Code: preserve valid custom code
        if (not ex["Unit Code"] or ex["Unit Code"] in ["Pending Code", "N/A"]) and u["Unit Code"] not in ["", "Pending Code", "N/A"]:
            ex["Unit Code"] = u["Unit Code"]

all_clean = list(deduped_map.values())

# Finalize Unit Code and RAG Memory ID for every unit
for u in all_clean:
    l7_clean = u["Mobile (Last 7)"].replace("'", "")
    comp_clean = re.sub(r'[^A-Za-z0-9]', '', u["Compound (Canonical)"])[:6].upper() or "SE"
    deal_prefix = "RNT" if u["Deal Type"] == "Rent" else "RSL"
    adv_prefix = "OWN" if u["Advertiser Type"] == "Direct Owner" else "BRK"
    
    if not u["Unit Code"] or u["Unit Code"] in ["Pending Code", "N/A"]:
        u["Unit Code"] = f"{adv_prefix}-{comp_clean}-{deal_prefix}-{l7_clean}"
    
    u["RAG Memory ID"] = f"rag-{u['Unit Code'].lower()}"

print(f"Total Unique Clean Units after Deduplication: {len(all_clean)}")

# Segregate into the 5 Data Tabs
owners_rent = [u for u in all_clean if u["Advertiser Type"] == "Direct Owner" and u["Deal Type"] == "Rent"]
owners_resale = [u for u in all_clean if u["Advertiser Type"] == "Direct Owner" and u["Deal Type"] == "Resale"]
brokers_rent = [u for u in all_clean if u["Advertiser Type"] == "Broker" and u["Deal Type"] == "Rent"]
brokers_resale = [u for u in all_clean if u["Advertiser Type"] == "Broker" and u["Deal Type"] == "Resale"]
available_units = [u for u in all_clean if u["Availability Status"] == "Available"]

print(f"  -> Owners Rent     : {len(owners_rent)}")
print(f"  -> Owners Resale   : {len(owners_resale)}")
print(f"  -> Brokers Rent    : {len(brokers_rent)}")
print(f"  -> Brokers Resale  : {len(brokers_resale)}")
print(f"  -> Available Units : {len(available_units)}")

# Create Master Excel Workbook
wb = openpyxl.Workbook()

# Style Palette
NAVY_HEADER = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
GUIDANCE_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
ZEBRA_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
CARD_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

FONT_HEADER = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
FONT_GUIDANCE = Font(name="Segoe UI", size=9, italic=True, color="475569")
FONT_DATA = Font(name="Segoe UI", size=10, color="0F172A")
FONT_TITLE = Font(name="Segoe UI", size=16, bold=True, color="0F172A")
FONT_SUBTITLE = Font(name="Segoe UI", size=11, bold=True, color="334155")
FONT_KPI_VAL = Font(name="Segoe UI", size=20, bold=True, color="0284C7")
FONT_KPI_LBL = Font(name="Segoe UI", size=10, bold=True, color="64748B")

BORDER_THIN = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")

# Tab 1: Dashboard
ws_dash = wb.active
ws_dash.title = "dashboard"
ws_dash.views.sheetView[0].showGridLines = True

ws_dash.cell(row=2, column=2, value="SIERRA ESTATES · MASTER REAL ESTATE COMMAND DASHBOARD").font = FONT_TITLE
ws_dash.cell(row=3, column=2, value="Authoritative Executive Inventory Metrics, Real-Time Segregation & Outreach Parity Engine").font = Font(name="Segoe UI", size=10, italic=True, color="64748B")

# KPI Summary Cards
kpis = [
    ("TOTAL MASTER INVENTORY", len(all_clean), "B5", "B6", "C6"),
    ("AVAILABLE UNITS", len(available_units), "D5", "D6", "E6"),
    ("OWNERS RENT (<= 400K)", len(owners_rent), "F5", "F6", "G6"),
    ("OWNERS RESALE (> 400K)", len(owners_resale), "H5", "H6", "I6"),
    ("BROKERS INVENTORY", len(brokers_rent) + len(brokers_resale), "J5", "J6", "K6")
]

for label, val, top_left, bot_left, bot_right in kpis:
    ws_dash[top_left] = label
    ws_dash[top_left].font = FONT_KPI_LBL
    ws_dash[bot_left] = val
    ws_dash[bot_left].font = FONT_KPI_VAL

ws_dash.cell(row=9, column=2, value="INVENTORY SEGREGATION BY CATEGORY").font = FONT_SUBTITLE

seg_rows = [
    ("Tab Name", "Category Description", "Advertiser", "Deal Type", "Active Units"),
    ("owners rent", "Direct Owner Rent Units (Rent <= 400,000 EGP)", "Direct Owner", "Rent", len(owners_rent)),
    ("owners resale", "Direct Owner Resale Units (Resale > 400,000 EGP)", "Direct Owner", "Resale", len(owners_resale)),
    ("brokers rent", "Broker Rent Listings", "Broker", "Rent", len(brokers_rent)),
    ("brokers resale", "Broker Resale Listings", "Broker", "Resale", len(brokers_resale)),
    ("available units", "Ready & Confirmed Available Units (All Categories)", "Mixed", "Mixed", len(available_units))
]

for r_idx, srow in enumerate(seg_rows, start=10):
    for c_idx, val in enumerate(srow, start=2):
        cell = ws_dash.cell(row=r_idx, column=c_idx, value=val)
        if r_idx == 10:
            cell.font = FONT_HEADER
            cell.fill = NAVY_HEADER
            cell.alignment = ALIGN_CENTER
        else:
            cell.font = FONT_DATA
            cell.border = BORDER_THIN
            cell.alignment = ALIGN_CENTER if c_idx in [2, 4, 5, 6] else ALIGN_LEFT

# Auto column widths for Dashboard
for col in ws_dash.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws_dash.column_dimensions[col_letter].width = max(max_len + 3, 14)

# Function to build a standardized 22-column data sheet
def populate_data_sheet(ws_name, unit_list):
    ws = wb.create_sheet(title=ws_name)
    ws.views.sheetView[0].showGridLines = True
    
    # Row 1: Canonical Headers
    for c_idx, h in enumerate(CANONICAL_COLUMNS, start=1):
        cell = ws.cell(row=1, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN
    
    # Row 2: Guidance Row
    for c_idx, g in enumerate(BOT_GUIDANCE_ROW, start=1):
        cell = ws.cell(row=2, column=c_idx, value=g)
        cell.font = FONT_GUIDANCE
        cell.fill = GUIDANCE_FILL
        cell.alignment = ALIGN_LEFT
        cell.border = BORDER_THIN
    
    # Data Rows
    for r_idx, u in enumerate(unit_list, start=3):
        fill = ZEBRA_FILL if r_idx % 2 == 0 else WHITE_FILL
        for c_idx, col_name in enumerate(CANONICAL_COLUMNS, start=1):
            val = u.get(col_name, "")
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_DATA
            cell.fill = fill
            cell.border = BORDER_THIN
            if col_name in ["Asking Price (EGP)"]:
                cell.number_format = '#,##0'
                cell.alignment = ALIGN_RIGHT
            elif col_name in ["Unit Code", "Deal Type", "Bedrooms", "Bathrooms", "Floor", "Mobile Number", "Mobile (Last 7)", "Availability Status", "Last Action Date"]:
                cell.alignment = ALIGN_CENTER
            else:
                cell.alignment = ALIGN_LEFT

    # Set column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col[:15]) # sample first 15
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(min(max_len + 3, 40), 12)

# Build the 5 Data Tabs
populate_data_sheet("owners rent", owners_rent)
populate_data_sheet("owners resale", owners_resale)
populate_data_sheet("brokers rent", brokers_rent)
populate_data_sheet("brokers resale", brokers_resale)
populate_data_sheet("available units", available_units)

# Save Master Excel
output_xlsx = "Sierra_Estates_Master_GoogleSheet_Reorganized.xlsx"
wb.save(output_xlsx)
print(f"Saved Master Reorganized Workbook: {output_xlsx}")

# Also export each sheet as clean CSV
csv_dir = "scratch/master_6_tabs_csv"
os.makedirs(csv_dir, exist_ok=True)

def export_tab_csv(name, ulist):
    path = os.path.join(csv_dir, f"{name}.csv")
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(CANONICAL_COLUMNS)
        writer.writerow(BOT_GUIDANCE_ROW)
        for u in ulist:
            writer.writerow([u.get(c, "") for c in CANONICAL_COLUMNS])
    print(f"  -> Exported {path} ({len(ulist)} units)")

export_tab_csv("owners_rent", owners_rent)
export_tab_csv("owners_resale", owners_resale)
export_tab_csv("brokers_rent", brokers_rent)
export_tab_csv("brokers_resale", brokers_resale)
export_tab_csv("available_units", available_units)

print("="*60)
print("SUCCESS: 6-TAB REORGANIZATION COMPLETE!")
print("="*60)
