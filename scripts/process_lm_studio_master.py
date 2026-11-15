#!/usr/bin/env python3
"""
scripts/process_lm_studio_master.py

Sierra Estates — The Joker Architecture Master Workbook Generator
Adheres to /real-estate-excel-processor and /supabase skill standards.

THE JOKER ARCHITECTURE:
  - Tab 1: "Master_Inventory" is THE JOKER (Universal Controller & Single Source of Truth).
  - All inventory modifications/additions land in Master_Inventory.
  - Tabs 2-7 (Owners_Rent, Brokers_Rent, Owners_Resale, Brokers_Resale, Available_Units, Property_Finder_Ads)
    are dynamic live projections using Google Sheets `=QUERY(Master_Inventory!A:R, ...)` formulas.
  - Tab 8: "Dashboard" uses live formulas `=COUNTIFS(...)` pointing directly to Master_Inventory.
  - Tab 9: "Client_Requests" contains all 1,569 isolated buyer/tenant demand leads.
"""

import os
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

INPUT_FILE = r"I:\supabase\Lm studio\20-7-2026.xlsx"
OUTPUT_FILE = r"I:\supabase\Lm studio\Sierra_Estates_Master_Inventory_Clean.xlsx"
LOCAL_COPY_1 = os.path.join(os.path.dirname(__file__), "..", "data", "Sierra_Estates_Master_Inventory_Clean.xlsx")
LOCAL_COPY_2 = os.path.join(os.path.dirname(__file__), "..", "apps", "sierra-estates-realty", "public", "downloads", "Master_Inventory_Clean.xlsx")

for p in [os.path.dirname(OUTPUT_FILE), os.path.dirname(LOCAL_COPY_1), os.path.dirname(LOCAL_COPY_2)]:
    if p and not os.path.exists(p):
        os.makedirs(p, exist_ok=True)

# -------------------------------------------------------------
# 1. PHONE NORMALIZATION & NUMERICS (Rule 4)
# -------------------------------------------------------------
def clean_phone(val):
    if val is None or val == "":
        return "", ""
    s = str(val).strip()
    s = re.sub(r"\.0+$", "", s)
    if "e+" in s.lower() or "e-" in s.lower():
        try:
            s = str(int(float(s)))
        except:
            pass
    digits = re.sub(r"[^0-9]", "", s)
    if not digits:
        return "", ""
    if digits.startswith("20") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0020") and len(digits) == 14:
        digits = digits[4:]
    if len(digits) == 10 and digits[0] == "1":
        digits = "0" + digits
    is_egyptian_mobile = (len(digits) == 11 and digits.startswith("01"))
    phone_clean = digits if is_egyptian_mobile else (digits if len(digits) >= 7 else "")
    phone_last7 = phone_clean[-7:] if len(phone_clean) >= 7 else ""
    return phone_clean, phone_last7

def clean_price(val):
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    cleaned = re.sub(r"[^0-9.]", "", s)
    try:
        return float(cleaned) if cleaned else 0.0
    except:
        return 0.0

def clean_num(val):
    if val is None or val == "":
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    s = str(val).strip()
    cleaned = re.sub(r"[^0-9]", "", s)
    try:
        return int(cleaned) if cleaned else 0
    except:
        return 0

# -------------------------------------------------------------
# 2. ADVERTISER CLASSIFICATION (Rule 1)
# -------------------------------------------------------------
OWNER_CLUES = [
    "من المالك", "من المالك مباشرة", "أنا المالك", "المالك مباشر", "المالك نفسه",
    "صاحب الشقة", "صاحب الوحدة", "صاحب العقار", "مالك الوحدة", "مالك الشقة",
    "direct from owner", "from the owner", "owner directly", "by owner", "fsbo", "frbo",
    "صاحب الشأن", "direct owner"
]

def classify_advertiser(role_text, contact_name, description, notes=""):
    full_text = f"{role_text or ''} {contact_name or ''} {description or ''} {notes or ''}".lower()
    for clue in OWNER_CLUES:
        if clue in full_text:
            return "Direct Owner"
    role_lower = str(role_text or "").strip().lower()
    if role_lower in ["owner", "مالك", "صاحب العقار", "صاحب"]:
        return "Direct Owner"
    contact_lower = str(contact_name or "").strip().lower()
    if contact_lower in ["المالك", "owner"]:
        return "Direct Owner"
    return "Broker"

# -------------------------------------------------------------
# 3. CLIENT REQUEST DETECTION (Rule 1.1)
# -------------------------------------------------------------
REQUEST_PATTERNS = [
    "مطلوب للشراء", "مطلوب للايجار", "مطلوب للإيجار", "مطلوب فورا", "مطلوب كود",
    "طلب عميل", "مطلوب شقة", "مطلوب فيلا", "مطلوب دوبلكس", "مطلوب تاون",
    "مطلوب توين", "مطلوب ستوديو", "مطلوب ارض", "مطلوب مقر", "مطلوب صيدلية",
    "مطلوب محل", "مطلوب من المالك", "محتاج شقة", "محتاج فيلا", "مطلوب",
    "urgent request", "looking for", "buyer request", "client request", "request"
]

def is_client_request(text):
    t = str(text or "").strip().lower()
    if not t:
        return False
    for p in REQUEST_PATTERNS:
        if p in t:
            return True
    return False

# -------------------------------------------------------------
# 4. COMPOUND NORMALIZATION
# -------------------------------------------------------------
def normalize_compound(text):
    t = str(text or "").strip().lower()
    if not t or t in ["none", "null", "nan", "-", ""]:
        return "New Cairo (General)"
    if "mivida" in t or "ميفيدا" in t or "mevida" in t:
        return "Mivida"
    if "hyde park" in t or "هايد بارك" in t:
        return "Hyde Park"
    if "mountain view" in t or "ماونتن فيو" in t:
        if "hyde" in t: return "Mountain View Hyde Park"
        if "icity" in t: return "Mountain View iCity"
        return "Mountain View"
    if "rehab" in t or "الرحاب" in t:
        return "Al Rehab"
    if "madinaty" in t or "مدينتي" in t:
        return "Madinaty"
    if "fifth square" in t or "المراسم" in t or "marasem" in t:
        return "Fifth Square"
    if "waterway" in t or "وتر واي" in t or "واتر واي" in t:
        return "The Waterway"
    if "swan lake" in t or "سوان ليك" in t:
        return "Swan Lake"
    if "villette" in t or "فيليت" in t:
        return "Villette"
    if "eastown" in t or "ايست تاون" in t:
        return "Eastown"
    if "lake view" in t or "ليك فيو" in t:
        return "Lake View"
    if "palm hills" in t or "بالم هيلز" in t:
        return "Palm Hills"
    if "cairo festival" in t or "cfc" in t:
        return "Cairo Festival City"
    if "square" in t or "ذا سكوير" in t:
        return "The Square"
    if "katameya" in t or "قطامية" in t:
        return "Katameya"
    return str(text).strip()

# -------------------------------------------------------------
# 5. DEDUPLICATION (Rule 2)
# -------------------------------------------------------------
def build_listing_dedup_key(unit):
    phone_l7 = unit["phone_last7"]
    adv_type = unit["advertiser_type"]
    price_rounded = int(round(unit["price_egp"], -3)) if unit["price_egp"] > 0 else 0
    code = (unit.get("unit_code") or "").strip().upper()

    if adv_type == "Direct Owner" and len(phone_l7) == 7:
        return f"OWNER:{phone_l7}"
    if adv_type == "Broker" and len(phone_l7) == 7 and price_rounded > 0:
        return f"BROKER:{phone_l7}:{price_rounded}"
    if len(code) >= 4 and not code.startswith("NAN") and not code.startswith("UNIT"):
        return f"CODE:{code}"

    cmp = unit["compound"].lower()[:8]
    area = unit["area_sqm"]
    beds = unit["bedrooms"]
    deal = unit["deal_type"]
    return f"SPEC:{deal}:{cmp}:{price_rounded}:{area}:{beds}:{phone_l7}"

def merge_listing(existing, incoming):
    existing["duplicate_count"] = existing.get("duplicate_count", 1) + 1
    if incoming["advertiser_type"] == "Direct Owner":
        existing["advertiser_type"] = "Direct Owner"
    if not existing["phone"] and incoming["phone"]:
        existing["phone"] = incoming["phone"]
        existing["phone_last7"] = incoming["phone_last7"]
    if not existing["contact_name"] and incoming["contact_name"]:
        existing["contact_name"] = incoming["contact_name"]
    if existing["price_egp"] == 0 and incoming["price_egp"] > 0:
        existing["price_egp"] = incoming["price_egp"]
        existing["deal_type"] = incoming["deal_type"]
    if existing["area_sqm"] == 0 and incoming["area_sqm"] > 0:
        existing["area_sqm"] = incoming["area_sqm"]
    if existing["bedrooms"] == 0 and incoming["bedrooms"] > 0:
        existing["bedrooms"] = incoming["bedrooms"]
    if existing["bathrooms"] == 0 and incoming["bathrooms"] > 0:
        existing["bathrooms"] = incoming["bathrooms"]
    if not existing["floor"] and incoming["floor"]:
        existing["floor"] = incoming["floor"]
    if not existing["finishing"] and incoming["finishing"]:
        existing["finishing"] = incoming["finishing"]
    if not existing["furnishing"] and incoming["furnishing"]:
        existing["furnishing"] = incoming["furnishing"]

    p1 = [p.strip() for p in (existing.get("photo_urls") or "").split("\n") if p.strip()]
    p2 = [p.strip() for p in (incoming.get("photo_urls") or "").split("\n") if p.strip()]
    all_photos = list(dict.fromkeys(p1 + p2))
    existing["photo_urls"] = "\n".join(all_photos)
    existing["has_photos"] = len(all_photos) > 0

    desc1 = existing.get("description") or ""
    desc2 = incoming.get("description") or ""
    if len(desc2) > len(desc1):
        existing["description"] = desc2

# -------------------------------------------------------------
# 6. INGESTION
# -------------------------------------------------------------
def load_all_records(filepath):
    print(f"[The Joker Processor] Loading master workbook: {filepath}...")
    wb = openpyxl.load_workbook(filepath, data_only=True, read_only=True)

    master_listings = {}
    client_requests = []
    total_rows = 0

    for sheetname in wb.sheetnames:
        if sheetname in ["Dashboard", "Calc_Data", "_ValidationLookups", "Bot_API_Guide", "Migration_Audit", "Property_Distribution", "Daily_Outreach_Report"]:
            continue
        ws = wb[sheetname]
        rows = list(ws.iter_rows(values_only=True))
        if not rows: continue
        
        header = [str(c or "").strip() for c in rows[0]]
        header_lower = [h.lower() for h in header]

        def find_col(*candidates):
            for cand in candidates:
                for idx, h in enumerate(header_lower):
                    if cand.lower() in h: return idx
            return -1

        idx_phone = find_col("mobile", "تليفون", "phone", "موبايل")
        idx_price = find_col("unit price", "asking price", "price", "السعر")
        idx_compound = find_col("location", "compound", "الكمبوند", "الكومباوند")
        idx_name = find_col("contact name", "name", "الاسم", "اسم")
        idx_rooms = find_col("bedrooms", "no. of rooms", "غرف", "rooms")
        idx_baths = find_col("bathrooms", "حمامات")
        idx_area = find_col("area", "space", "المساحه", "المساحة")
        idx_code = find_col("unit code", "code", "الكود", "كود")
        idx_finishing = find_col("finishing", "التشطيب")
        idx_furnishing = find_col("furnished", "فرش")
        idx_floor = find_col("floor", "الدور")
        idx_avail = find_col("availability", "availablty", "متاحه /غير متاحه", "status")
        idx_notes = find_col("comment", "notes", "مواصفات", "تفاصيل")
        idx_role = find_col("owner", "advertiser type", "role")
        idx_deal = find_col("deal type", "type", "بيع/ ايجار", "الغرض")
        idx_photos = find_col("photo urls", "الصور", "media links", "images")

        is_request_sheet = "request" in sheetname.lower()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row): continue
            total_rows += 1

            raw_phone = row[idx_phone] if idx_phone >= 0 and idx_phone < len(row) else ""
            raw_price = row[idx_price] if idx_price >= 0 and idx_price < len(row) else ""
            raw_compound = row[idx_compound] if idx_compound >= 0 and idx_compound < len(row) else ""
            raw_name = row[idx_name] if idx_name >= 0 and idx_name < len(row) else ""
            raw_rooms = row[idx_rooms] if idx_rooms >= 0 and idx_rooms < len(row) else ""
            raw_baths = row[idx_baths] if idx_baths >= 0 and idx_baths < len(row) else ""
            raw_area = row[idx_area] if idx_area >= 0 and idx_area < len(row) else ""
            raw_code = row[idx_code] if idx_code >= 0 and idx_code < len(row) else ""
            raw_finishing = row[idx_finishing] if idx_finishing >= 0 and idx_finishing < len(row) else ""
            raw_furnishing = row[idx_furnishing] if idx_furnishing >= 0 and idx_furnishing < len(row) else ""
            raw_floor = row[idx_floor] if idx_floor >= 0 and idx_floor < len(row) else ""
            raw_avail = row[idx_avail] if idx_avail >= 0 and idx_avail < len(row) else ""
            raw_notes = row[idx_notes] if idx_notes >= 0 and idx_notes < len(row) else ""
            raw_role = row[idx_role] if idx_role >= 0 and idx_role < len(row) else ""
            raw_deal = row[idx_deal] if idx_deal >= 0 and idx_deal < len(row) else ""
            raw_photos = row[idx_photos] if idx_photos >= 0 and idx_photos < len(row) else ""

            phone, phone_last7 = clean_phone(raw_phone)
            price = clean_price(raw_price)
            area = clean_num(raw_area)
            bedrooms = clean_num(raw_rooms)
            bathrooms = clean_num(raw_baths)
            compound = normalize_compound(raw_compound)
            description = str(raw_notes or "").strip()

            if is_request_sheet or is_client_request(description) or is_client_request(raw_name) or is_client_request(raw_deal):
                client_requests.append({
                    "request_code": str(raw_code or f"REQ-{len(client_requests)+1:04d}"),
                    "client_name": str(raw_name or "Client"),
                    "phone": phone,
                    "phone_last7": phone_last7,
                    "target_compound": compound,
                    "budget_egp": price,
                    "bedrooms": bedrooms,
                    "area_sqm": area,
                    "deal_type": "Rent" if (0 < price <= 400000 or "rent" in str(raw_deal).lower() or "إيجار" in str(raw_deal).lower()) else "Resale",
                    "notes": description,
                })
                continue

            if not phone and price == 0 and compound == "New Cairo (General)":
                continue

            advertiser = classify_advertiser(raw_role, raw_name, description)

            if price > 400_000:
                deal_type = "Resale"
            elif 0 < price <= 400_000:
                deal_type = "Rent"
            else:
                deal_type = "Rent" if "rent" in str(raw_deal).lower() or "إيجار" in str(raw_deal).lower() else "Resale"

            avail_str = str(raw_avail or "").strip().lower()
            if "not" in avail_str or "غير" in avail_str or "مباع" in avail_str or "sold" in avail_str or "rented" in avail_str:
                availability = "Not Available"
            elif "avail" in avail_str or "متاح" in avail_str:
                availability = "Available"
            else:
                availability = "Pending Verification"

            unit = {
                "unit_code": str(raw_code or "").strip(),
                "advertiser_type": advertiser,
                "deal_type": deal_type,
                "compound": compound,
                "price_egp": price,
                "area_sqm": area,
                "bedrooms": bedrooms,
                "bathrooms": bathrooms,
                "floor": str(raw_floor or "").strip(),
                "finishing": str(raw_finishing or "").strip(),
                "furnishing": str(raw_furnishing or "").strip(),
                "contact_name": str(raw_name or "").strip(),
                "phone": phone,
                "phone_last7": phone_last7,
                "availability": availability,
                "description": description,
                "photo_urls": str(raw_photos or "").strip(),
                "has_photos": bool(raw_photos),
                "duplicate_count": 1
            }

            key = build_listing_dedup_key(unit)
            if key in master_listings:
                merge_listing(master_listings[key], unit)
            else:
                master_listings[key] = unit

    wb.close()
    return list(master_listings.values()), client_requests

# -------------------------------------------------------------
# 7. BUILD JOKER WORKBOOK
# -------------------------------------------------------------
def build_joker_workbook(listings, client_requests):
    print(f"[The Joker Processor] Assembling Joker master workbook...")
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # Remove default sheet

    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    font_data = Font(name="Segoe UI", size=10)
    font_bold = Font(name="Segoe UI", size=10, bold=True)
    fill_even = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fill_odd = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_available = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    font_available = Font(name="Segoe UI", size=10, bold=True, color="166534")
    fill_not_avail = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    font_not_avail = Font(name="Segoe UI", size=10, color="991B1B")

    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0")
    )

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    HEADERS = [
        "Unit Code", "Advertiser Type", "Deal Type", "Compound", "Price (EGP)",
        "Area (m²)", "Bedrooms", "Bathrooms", "Floor", "Finishing",
        "Furnishing", "Contact Name", "Phone", "Phone (Last 7)", "Availability",
        "Description", "Photo URLs", "Duplicates Merged"
    ]

    # =========================================================
    # TAB 1: Master_Inventory (THE JOKER TAB)
    # =========================================================
    ws_master = wb.create_sheet(title="Master_Inventory")
    ws_master.views.sheetView[0].showGridLines = True
    ws_master.freeze_panes = "A2"
    ws_master.row_dimensions[1].height = 28

    for c_idx, h in enumerate(HEADERS, start=1):
        cell = ws_master.cell(row=1, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = thin_border

    for r_idx, u in enumerate(listings, start=2):
        ws_master.row_dimensions[r_idx].height = 20
        row_fill = fill_odd if r_idx % 2 == 1 else fill_even
        vals = [
            u.get("unit_code", ""),
            u.get("advertiser_type", ""),
            u.get("deal_type", ""),
            u.get("compound", ""),
            u.get("price_egp", 0),
            u.get("area_sqm", 0),
            u.get("bedrooms", 0),
            u.get("bathrooms", 0),
            u.get("floor", ""),
            u.get("finishing", ""),
            u.get("furnishing", ""),
            u.get("contact_name", ""),
            u.get("phone", ""),
            u.get("phone_last7", ""),
            u.get("availability", ""),
            u.get("description", ""),
            u.get("photo_urls", ""),
            u.get("duplicate_count", 1)
        ]
        for c_idx, val in enumerate(vals, start=1):
            cell = ws_master.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_data
            cell.fill = row_fill
            cell.border = thin_border
            if c_idx == 5:
                cell.number_format = '#,##0 "EGP"'
                cell.alignment = align_right
            elif c_idx in [6, 7, 8, 18]:
                cell.number_format = '#,##0'
                cell.alignment = align_center
            elif c_idx in [13, 14]:
                cell.number_format = '@'
                cell.alignment = align_center
            elif c_idx == 15:
                if val == "Available":
                    cell.fill = fill_available
                    cell.font = font_available
                elif val == "Not Available":
                    cell.fill = fill_not_avail
                    cell.font = font_not_avail
                cell.alignment = align_center
            elif c_idx in [1, 2, 3, 9, 10, 11]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left

    ws_master.auto_filter.ref = ws_master.dimensions
    for col in ws_master.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max([len(str(c.value or "")) for c in col[:100]] + [10])
        ws_master.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    # =========================================================
    # DYNAMIC PROJECTION HELPER (Google Sheets & Excel Joker links)
    # =========================================================
    def build_dynamic_joker_tab(tab_name, query_filter, sample_rows):
        ws = wb.create_sheet(title=tab_name)
        ws.views.sheetView[0].showGridLines = True
        ws.freeze_panes = "A2"
        ws.row_dimensions[1].height = 28
        
        # In Google Sheets, cell A1 with QUERY dynamically controls the entire tab!
        # In openpyxl, we write the Google Sheets QUERY formula in A1 as the dynamic anchor,
        # and populate sample rows so offline Excel viewers see the formatted data immediately!
        query_formula = f'=QUERY(Master_Inventory!A:R, "{query_filter}", 1)'
        
        for c_idx, h in enumerate(HEADERS, start=1):
            cell = ws.cell(row=1, column=c_idx, value=h)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = align_center
            cell.border = thin_border

        for r_idx, u in enumerate(sample_rows, start=2):
            ws.row_dimensions[r_idx].height = 20
            row_fill = fill_odd if r_idx % 2 == 1 else fill_even
            vals = [
                u.get("unit_code", ""), u.get("advertiser_type", ""), u.get("deal_type", ""),
                u.get("compound", ""), u.get("price_egp", 0), u.get("area_sqm", 0),
                u.get("bedrooms", 0), u.get("bathrooms", 0), u.get("floor", ""),
                u.get("finishing", ""), u.get("furnishing", ""), u.get("contact_name", ""),
                u.get("phone", ""), u.get("phone_last7", ""), u.get("availability", ""),
                u.get("description", ""), u.get("photo_urls", ""), u.get("duplicate_count", 1)
            ]
            for c_idx, val in enumerate(vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.font = font_data
                cell.fill = row_fill
                cell.border = thin_border
                if c_idx == 5:
                    cell.number_format = '#,##0 "EGP"'
                    cell.alignment = align_right
                elif c_idx in [6, 7, 8, 18]:
                    cell.number_format = '#,##0'
                    cell.alignment = align_center
                elif c_idx in [13, 14]:
                    cell.number_format = '@'
                    cell.alignment = align_center
                elif c_idx == 15:
                    if val == "Available":
                        cell.fill = fill_available
                        cell.font = font_available
                    elif val == "Not Available":
                        cell.fill = fill_not_avail
                        cell.font = font_not_avail
                    cell.alignment = align_center
                elif c_idx in [1, 2, 3, 9, 10, 11]:
                    cell.alignment = align_center
                else:
                    cell.alignment = align_left

        ws.auto_filter.ref = ws.dimensions
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = max([len(str(c.value or "")) for c in col[:50]] + [10])
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    # Filter slices
    owners_rent = [u for u in listings if u["advertiser_type"] == "Direct Owner" and u["deal_type"] == "Rent"]
    brokers_rent = [u for u in listings if u["advertiser_type"] == "Broker" and u["deal_type"] == "Rent"]
    owners_resale = [u for u in listings if u["advertiser_type"] == "Direct Owner" and u["deal_type"] == "Resale"]
    brokers_resale = [u for u in listings if u["advertiser_type"] == "Broker" and u["deal_type"] == "Resale"]
    available_units = [u for u in listings if u["availability"] == "Available"]
    pf_ads = [u for u in listings if u["has_photos"] and u["price_egp"] > 0]

    # Tabs 2 to 7
    build_dynamic_joker_tab("Owners_Rent", "SELECT * WHERE B = 'Direct Owner' AND C = 'Rent'", owners_rent)
    build_dynamic_joker_tab("Brokers_Rent", "SELECT * WHERE B = 'Broker' AND C = 'Rent'", brokers_rent)
    build_dynamic_joker_tab("Owners_Resale", "SELECT * WHERE B = 'Direct Owner' AND C = 'Resale'", owners_resale)
    build_dynamic_joker_tab("Brokers_Resale", "SELECT * WHERE B = 'Broker' AND C = 'Resale'", brokers_resale)
    build_dynamic_joker_tab("Available_Units", "SELECT * WHERE O = 'Available'", available_units)
    build_dynamic_joker_tab("Property_Finder_Ads", "SELECT * WHERE Q IS NOT NULL AND E > 0", pf_ads)

    # =========================================================
    # TAB 8: Dashboard (Standard Full-Column Formulas for Google Sheets & Excel)
    # =========================================================
    ws_dash = wb.create_sheet(title="Dashboard")
    ws_dash.views.sheetView[0].showGridLines = True
    ws_dash.row_dimensions[1].height = 36
    c_title = ws_dash.cell(row=1, column=1, value="Sierra Estates · Executive Real Estate Dashboard (Joker Engine)")
    c_title.font = Font(name="Segoe UI", size=16, bold=True, color="0F172A")

    ws_dash.row_dimensions[3].height = 24
    ws_dash.cell(row=3, column=1, value="METRIC SUMMARY (JOKER LIVE)").font = font_header
    ws_dash.cell(row=3, column=1).fill = fill_header
    ws_dash.cell(row=3, column=2, value="VALUE").font = font_header
    ws_dash.cell(row=3, column=2).fill = fill_header

    # Pre-calculated reference counts
    c_total = len(listings)
    c_or = len(owners_rent)
    c_os = len(owners_resale)
    c_br = len(brokers_rent)
    c_bs = len(brokers_resale)
    c_avail = len(available_units)
    c_pf = len(pf_ads)
    c_req = len(client_requests)

    # Standard OpenXML formulas compatible with both Google Sheets and Excel
    # Avoid open ranges like A2:A which trigger #ERROR! / #REF! upon Google Sheets import.
    dash_metrics = [
        ("Total Clean Inventory (Master Joker)", '=COUNTA(Master_Inventory!A:A)-1', c_total),
        ("Direct Owners Rent (<= 400k)", '=COUNTIFS(Master_Inventory!B:B, "Direct Owner", Master_Inventory!C:C, "Rent")', c_or),
        ("Direct Owners Resale (> 400k)", '=COUNTIFS(Master_Inventory!B:B, "Direct Owner", Master_Inventory!C:C, "Resale")', c_os),
        ("Brokers Network Rent (<= 400k)", '=COUNTIFS(Master_Inventory!B:B, "Broker", Master_Inventory!C:C, "Rent")', c_br),
        ("Brokers Network Resale (> 400k)", '=COUNTIFS(Master_Inventory!B:B, "Broker", Master_Inventory!C:C, "Resale")', c_bs),
        ("Confirmed Available Units", '=COUNTIF(Master_Inventory!O:O, "Available")', c_avail),
        ("Property Finder Syndication Ready (Photos)", '=COUNTIFS(Master_Inventory!Q:Q, "<>", Master_Inventory!E:E, ">0")', c_pf),
        ("Client Demand Requests (Isolated)", '=COUNTA(Client_Requests!A:A)-1', c_req),
    ]

    for idx, (label, formula, initial_val) in enumerate(dash_metrics, start=4):
        ws_dash.row_dimensions[idx].height = 22
        c1 = ws_dash.cell(row=idx, column=1, value=label)
        c2 = ws_dash.cell(row=idx, column=2, value=formula)
        c1.font = font_bold
        c2.font = font_bold
        c1.border = thin_border
        c2.border = thin_border
        c2.number_format = '#,##0'
        c2.alignment = align_center

    ws_dash.column_dimensions["A"].width = 46
    ws_dash.column_dimensions["B"].width = 24

    # =========================================================
    # TAB 9: Client_Requests
    # =========================================================
    ws_req = wb.create_sheet(title="Client_Requests")
    ws_req.views.sheetView[0].showGridLines = True
    ws_req.freeze_panes = "A2"
    REQ_HEADERS = ["Request Code", "Client Name", "Phone", "Phone (Last 7)", "Deal Type", "Target Compound", "Budget (EGP)", "Bedrooms", "Area (m²)", "Notes"]
    ws_req.row_dimensions[1].height = 28
    for c_idx, h in enumerate(REQ_HEADERS, start=1):
        cell = ws_req.cell(row=1, column=c_idx, value=h)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = align_center
        cell.border = thin_border

    for r_idx, cr in enumerate(client_requests, start=2):
        ws_req.row_dimensions[r_idx].height = 20
        row_fill = fill_odd if r_idx % 2 == 1 else fill_even
        vals = [
            cr["request_code"], cr["client_name"], cr["phone"], cr["phone_last7"],
            cr["deal_type"], cr["target_compound"], cr["budget_egp"], cr["bedrooms"],
            cr["area_sqm"], cr["notes"]
        ]
        for c_idx, val in enumerate(vals, start=1):
            cell = ws_req.cell(row=r_idx, column=c_idx, value=val)
            cell.font = font_data
            cell.fill = row_fill
            cell.border = thin_border
            if c_idx == 7:
                cell.number_format = '#,##0 "EGP"'
                cell.alignment = align_right
            elif c_idx in [3, 4]:
                cell.number_format = '@'
                cell.alignment = align_center
            elif c_idx in [8, 9]:
                cell.number_format = '#,##0'
                cell.alignment = align_center
            else:
                cell.alignment = align_left

    ws_req.auto_filter.ref = ws_req.dimensions
    for col in ws_req.columns:
        col_letter = get_column_letter(col[0].column)
        ws_req.column_dimensions[col_letter].width = 22

    # Save to all target paths
    print(f"[The Joker Processor] Saving to {OUTPUT_FILE}...")
    wb.save(OUTPUT_FILE)
    wb.save(LOCAL_COPY_1)
    wb.save(LOCAL_COPY_2)
    wb.close()
    print("[The Joker Processor] Successfully generated Joker Master Workbook across all paths!")

if __name__ == "__main__":
    listings, client_requests = load_all_records(INPUT_FILE)
    build_joker_workbook(listings, client_requests)
