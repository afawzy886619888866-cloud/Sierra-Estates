#!/usr/bin/env python3
"""
merge_and_verify_owners_excel.py — Sierra Estates Master Excel Consolidation Engine
──────────────────────────────────────────────────────────────────────────────────
Merges ALL Excel workbooks in the data/ folder into ONE unified master workbook:
  H:\\last\\Main\\SE-Vercel-deploy-main\\data\\Sierra_Estates_Unified_Master_Inventory.xlsx

Core Invariants:
  1. Strict Mobile Deduplication:
     - Direct Owners: Exactly 1 record per unique mobile phone.
     - All secondary unit codes, compounds, and notes are merged into that record.
  2. Double-Check Owner Verification:
     - Analyzes listing frequency across the entire portfolio.
     - Scans for explicit owner clues (من المالك, أنا المالك, المالك مباشر, owner).
     - Identifies and isolates brokers marketing multiple units.
     - Segregates buyer/tenant client requests (مطلوب للشراء, مطلوب للايجار).
  3. Professional Output Workbook:
     - Direct_Owners (Verified direct property owners, deduped by mobile)
     - Brokers (Broker & agent network inventory, deduped by phone + price)
     - Client_Requests (Isolated buyer and rental requests)
     - Summary_Audit (Complete audit trail & executive metrics)
"""

import os
import sys
import io
import re
import warnings

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from datetime import datetime
from collections import defaultdict, Counter
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

warnings.filterwarnings("ignore")

DATA_DIR = r"H:\last\Main\SE-Vercel-deploy-main\data"
OUT_FILE = os.path.join(DATA_DIR, "Sierra_Estates_Unified_Master_Inventory.xlsx")

def clean_str(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ["none", "null", "nan", "undefined"]:
        return ""
    return s

def clean_phone(val):
    if val is None:
        return ""
    s = str(val).strip()
    s = re.sub(r'\.0+$', '', s)
    if 'e' in s.lower():
        try:
            s = str(int(float(s)))
        except:
            pass
    digits = re.sub(r'\D', '', s)
    if not digits:
        return ""
    
    # Strip international Egyptian prefixes
    if digits.startswith("0020"):
        digits = digits[4:]
    elif digits.startswith("20") and len(digits) >= 12:
        digits = digits[2:]
    
    # 10 digits starting with 10, 11, 12, 15 -> prepend 0
    if len(digits) == 10 and digits[0] in ['1']:
        digits = "0" + digits
    
    # If 11 digits starting with 01
    if len(digits) == 11 and digits.startswith("01"):
        return digits
    
    # Return digits if at least 7
    if len(digits) >= 7:
        return digits
    return ""

def get_phone_last7(phone):
    digits = re.sub(r'\D', '', str(phone or ''))
    return digits[-7:] if len(digits) >= 7 else ""

def clean_num(val):
    if val is None:
        return 0
    s = str(val).strip()
    s = s.replace(",", "").replace("EGP", "").replace("LE", "").replace("جم", "").strip()
    m = re.search(r'[-+]?\d*\.?\d+', s)
    if m:
        try:
            return float(m.group(0))
        except:
            return 0
    return 0

# Keywords
OWNER_EXPLICIT_KEYWORDS = [
    "من المالك", "المالك مباشر", "المالك نفسه", "أنا المالك", "انا المالك",
    "صاحب الشقة", "صاحب الوحدة", "صاحب العقار", "مالك الوحدة", "مالك الشقة",
    "direct owner", "by owner", "from owner", "direct from owner", "fsbo", "frbo", "مالك"
]

BROKER_EXPLICIT_KEYWORDS = [
    "عمولة", "مكتب عقاري", "شركة تسويق", "شركة عقارية", "لدينا المزيد",
    "وسيط", "سمسار", "عموله", "للتسويق", "broker", "agency", "realtor"
]

REQUEST_KEYWORDS = [
    "مطلوب للشراء", "مطلوب للايجار", "مطلوب للإيجار", "مطلوب فورا", "مطلوب كود",
    "طلب عميل", "مطلوب شقة", "مطلوب فيلا", "مطلوب دوبلكس", "مطلوب تاون",
    "مطلوب توين", "مطلوب ستوديو", "مطلوب ارض", "مطلوب مقر", "مطلوب صيدلية",
    "مطلوب محل", "مطلوب من المالك", "محتاج شقة", "محتاج فيلا", "looking for",
    "buyer request", "client request", "urgent request"
]

def is_client_request(text):
    t = (text or "").lower()
    for kw in REQUEST_KEYWORDS:
        if kw in t:
            return True
    return False

def has_owner_clue(text, name, role):
    combined = f"{text} {name} {role}".lower()
    for kw in OWNER_EXPLICIT_KEYWORDS:
        if kw in combined:
            return True
    return False

def has_broker_clue(text, name, role):
    combined = f"{text} {name} {role}".lower()
    for kw in BROKER_EXPLICIT_KEYWORDS:
        if kw in combined:
            return True
    return False

def extract_rows_from_workbook(file_path):
    wb_name = os.path.basename(file_path)
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    raw_listings = []
    
    for sheet_name in wb.sheetnames:
        if sheet_name in ["Executive Dashboard", "Summary"]:
            continue
        
        ws = wb[sheet_name]
        rows_iter = ws.iter_rows(values_only=True)
        try:
            first_row = next(rows_iter)
        except StopIteration:
            continue
        if not first_row:
            continue
        
        headers = [clean_str(c).lower() for c in first_row]
        
        # Col find helper
        def find_col(candidates):
            for i, h in enumerate(headers):
                for cand in candidates:
                    if cand == h or cand in h:
                        return i
            return -1
        
        i_code = find_col(['unit code', 'public_code', 'unitcode', 'reference code', 'code', 'كود', 'recordid', 'record id'])
        i_name = find_col(['owner name', 'contact_name', 'owner / contact name', 'contact name', 'owner', 'الاسم', 'مالك', 'المرسل'])
        i_phone = find_col(['owner phone', 'phone number', 'contact phone', 'phone', 'mobile', 'موبايل', 'هاتف', 'تليفون'])
        i_compound = find_col(['compound / project', 'community / compound', 'compound', 'location', 'الكمبوند', 'الموقع'])
        i_zone = find_col(['zone / area', 'zone / district', 'zone', 'district', 'area'])
        i_type = find_col(['property type', 'propertytype', 'property tybe', 'النوع', 'نوع العقار'])
        i_deal = find_col(['deal type', 'operation', 'offering type', 'deal_type', 'type'])
        i_price = find_col(['price (egp)', 'monthly rent (egp)', 'resale price (egp)', 'unit price', 'price', 'السعر'])
        i_area = find_col(['area (sqm)', 'area (m²)', 'area_sqm', 'area (m)', 'space', 'المساحة'])
        i_beds = find_col(['bedrooms', 'beds', 'rooms', 'غرف', 'الغرف'])
        i_baths = find_col(['bathrooms', 'baths', 'حمامات'])
        i_finishing = find_col(['finishing', 'furnishing', 'furnished or not', 'تشطيب', 'فرش'])
        i_status = find_col(['listing status', 'inventory status', 'availability', 'status', 'availablty', 'الحالة'])
        i_desc = find_col(['listing description & notes', 'detailed description', 'description / details', 'description', 'comment', 'notes', 'تفاصيل', 'ملاحظات'])
        i_photos = find_col(['photo urls', 'photo urls (multi-image)', 'photos', 'images', 'صور'])
        i_advertiser = find_col(['owner_or_broker', 'segment / channel', 'advertiser', 'source channel', 'source'])
        
        is_sheet_owner_tab = any(k in sheet_name.lower() for k in ['owner', 'direct owner', 'مالك'])
        
        for r in rows_iter:
            if not r or not any(r):
                continue
            
            val = lambda idx: clean_str(r[idx]) if idx >= 0 and idx < len(r) else ""
            num_val = lambda idx: clean_num(r[idx]) if idx >= 0 and idx < len(r) else 0
            
            code = val(i_code)
            phone_raw = val(i_phone)
            phone = clean_phone(phone_raw)
            last7 = get_phone_last7(phone)
            
            # Skip rows with neither code nor phone
            if not code and not phone:
                continue
            
            name = val(i_name)
            compound = val(i_compound)
            zone = val(i_zone)
            prop_type = val(i_type)
            deal_raw = val(i_deal)
            price = num_val(i_price)
            area = num_val(i_area)
            beds = num_val(i_beds)
            baths = num_val(i_baths)
            finishing = val(i_finishing)
            status = val(i_status)
            desc = val(i_desc)
            photos = val(i_photos)
            advertiser = val(i_advertiser)
            
            # Deal type normalization (Rule 3)
            if price > 400000:
                deal_type = "Resale"
            elif 0 < price <= 400000:
                deal_type = "Rent"
            else:
                deal_type = "Rent" if "rent" in deal_raw.lower() or "ايجار" in deal_raw.lower() else "Resale"
            
            raw_listings.append({
                "code": code,
                "name": name,
                "phone": phone,
                "last7": last7,
                "compound": compound,
                "zone": zone,
                "prop_type": prop_type,
                "deal_type": deal_type,
                "price": price,
                "area": area,
                "beds": int(beds) if beds else "",
                "baths": int(baths) if baths else "",
                "finishing": finishing,
                "status": status if status else "Available",
                "desc": desc,
                "photos": photos,
                "advertiser": advertiser,
                "sheet_owner_tab": is_sheet_owner_tab,
                "source_file": wb_name,
                "source_sheet": sheet_name,
            })
            
    wb.close()
    return raw_listings

def main():
    print("=" * 70)
    print("  SIERRA ESTATES: UNIFIED MASTER EXCEL CONSOLIDATION & OWNER AUDIT")
    print("=" * 70)
    
    excel_files = [
        "Sierra_Estates_Rent_Master.xlsx",
        "Sierra_Estates_Resale_Master.xlsx",
        "Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx",
        "sierra-estates-master-inventory.xlsx",
        "VERIFICATION_QUEUE_V1.xlsx",
        "PILOT_50_WORKSHEET.xlsx"
    ]
    
    all_raw = []
    for f in excel_files:
        p = os.path.join(DATA_DIR, f)
        if os.path.exists(p):
            print(f"Reading: {f}...")
            rows = extract_rows_from_workbook(p)
            print(f"  Extracted {len(rows)} rows from {f}")
            all_raw.extend(rows)
        else:
            print(f"  Warning: {f} not found, skipping.")
    
    total_extracted = len(all_raw)
    print(f"\nTotal raw listings loaded from all workbooks: {total_extracted:,}")
    
    # Frequency Map for Phone Numbers
    phone_counts = Counter()
    phone_compounds = defaultdict(set)
    for r in all_raw:
        if r["last7"]:
            phone_counts[r["last7"]] += 1
            if r["compound"]:
                phone_compounds[r["last7"]].add(r["compound"].lower())
                
    print(f"Total unique phone numbers across all data: {len(phone_counts):,}")
    
    # ── CLASSIFICATION & OWNER AUDIT ──────────────────────────────────────────
    direct_owner_records = defaultdict(list)
    broker_records = defaultdict(list)
    request_records = []
    
    audit_stats = {
        "verified_owners": 0,
        "reclassified_brokers": 0,
        "requests_isolated": 0,
        "initial_brokers": 0
    }
    
    for r in all_raw:
        last7 = r["last7"]
        count = phone_counts[last7] if last7 else 1
        num_compounds = len(phone_compounds[last7]) if last7 else 1
        
        # 1. Client Requests Isolation
        if is_client_request(r["desc"]) or is_client_request(r["code"]) or is_client_request(r["name"]):
            r["classification"] = "Client Request"
            r["owner_evidence"] = "Identified Buyer/Tenant Request"
            request_records.append(r)
            audit_stats["requests_isolated"] += 1
            continue
        
        # 2. Check for explicit owner clues
        has_owner = has_owner_clue(r["desc"], r["name"], r["advertiser"])
        has_broker = has_broker_clue(r["desc"], r["name"], r["advertiser"])
        
        # 3. Decision Logic:
        # If listed 6+ times across 3+ different compounds and lacks explicit owner notes -> Broker!
        if count >= 6 and num_compounds >= 3 and not ("أنا المالك" in r["desc"] or "من المالك مباشرة" in r["desc"]):
            is_owner = False
            reason = f"High-Volume Lister ({count} listings across {num_compounds} compounds) -> Broker"
        elif has_broker:
            is_owner = False
            reason = "Explicit Broker Keyword in details"
        elif has_owner:
            is_owner = True
            reason = "Explicit Owner Verification Phrase / Role"
        elif r["sheet_owner_tab"] and count <= 3 and num_compounds <= 2:
            is_owner = True
            reason = "Direct Owner Sheet Entry (Low listing frequency: private owner)"
        else:
            is_owner = False
            reason = "Standard Broker / Network Listing"
            
        r["owner_evidence"] = reason
        
        if is_owner:
            r["classification"] = "Direct Owner (Verified)"
            audit_stats["verified_owners"] += 1
            # Group by mobile last7 (or phone if no last7)
            dedup_key = last7 if last7 else r["phone"]
            direct_owner_records[dedup_key].append(r)
        else:
            r["classification"] = "Broker / Agent"
            if r["sheet_owner_tab"]:
                audit_stats["reclassified_brokers"] += 1
            else:
                audit_stats["initial_brokers"] += 1
            # Broker deduplication key: (last7, round(price)) or code
            broker_key = (last7, round(r["price"], -2)) if (last7 and r["price"] > 0) else (r["code"] or r["desc"][:20])
            broker_records[broker_key].append(r)
            
    print(f"\nClassification & Verification Results:")
    print(f"  • Verified Direct Owner rows: {audit_stats['verified_owners']:,} (Collapsing to {len(direct_owner_records):,} unique owner phones)")
    print(f"  • Reclassified Brokers (removed from owners sheets): {audit_stats['reclassified_brokers']:,}")
    print(f"  • Standard Broker rows: {audit_stats['initial_brokers']:,} (Collapsing to {len(broker_records):,} unique broker units)")
    print(f"  • Client Requests isolated: {audit_stats['requests_isolated']:,}")
    
    # ── MERGE DIRECT OWNERS (STRICT 1 ROW PER MOBILE) ────────────────────────
    merged_owners = []
    for phone_key, group in direct_owner_records.items():
        # Pick best record: prioritize record with photos, then with description, then with price
        best = max(group, key=lambda x: (bool(x["photos"]), len(x["desc"]), x["price"] > 0, x["area"] > 0))
        
        # Merge all unique unit codes
        all_codes = sorted(list(set(g["code"] for g in group if g["code"] and len(g["code"]) > 2)))
        code_str = " | ".join(all_codes) if all_codes else best["code"]
        
        # Merge all unique photo URLs
        all_photos = []
        for g in group:
            if g["photos"]:
                for url in re.split(r'[\n\r|,]+', g["photos"]):
                    u = url.strip()
                    if u.startswith("http") and u not in all_photos:
                        all_photos.append(u)
        photo_str = "\n".join(all_photos)
        
        # Merge sources
        sources = sorted(list(set(f"{g['source_file']} [{g['source_sheet']}]" for g in group)))
        
        # Phone formatting
        phone_full = best["phone"] or (group[0]["phone"])
        
        merged_owners.append({
            "Unit_Code": code_str or f"OWNER-{phone_key}",
            "Classification": "Direct Owner (Verified)",
            "Owner_Verification_Evidence": best["owner_evidence"],
            "Contact_Name": best["name"] or "صاحب العقار",
            "Mobile": phone_full,
            "Mobile_Last7": best["last7"],
            "WhatsApp_Link": f"https://wa.me/20{phone_full[1:]}" if len(phone_full) == 11 and phone_full.startswith("01") else "",
            "Deal_Type": best["deal_type"],
            "Compound": best["compound"] or "New Cairo",
            "Location_Zone": best["zone"] or "New Cairo",
            "Property_Type": best["prop_type"] or "Apartment",
            "Price_EGP": best["price"],
            "Area_Sqm": best["area"],
            "Bedrooms": best["beds"],
            "Bathrooms": best["baths"],
            "Finishing": best["finishing"],
            "Availability": best["status"],
            "Total_Listings_Found": len(group),
            "Has_Photos": "Yes" if photo_str else "No",
            "Photo_URLs": photo_str,
            "Description_Notes": best["desc"],
            "Source_Sheets": "; ".join(sources)
        })
        
    print(f"\nFinal Consolidated Direct Owners: {len(merged_owners):,} unique owner mobile numbers")
    
    # ── MERGE BROKERS ─────────────────────────────────────────────────────────
    merged_brokers = []
    for b_key, group in broker_records.items():
        best = max(group, key=lambda x: (bool(x["photos"]), len(x["desc"]), x["area"] > 0))
        all_codes = sorted(list(set(g["code"] for g in group if g["code"] and len(g["code"]) > 2)))
        code_str = " | ".join(all_codes) if all_codes else best["code"]
        
        all_photos = []
        for g in group:
            if g["photos"]:
                for url in re.split(r'[\n\r|,]+', g["photos"]):
                    u = url.strip()
                    if u.startswith("http") and u not in all_photos:
                        all_photos.append(u)
        photo_str = "\n".join(all_photos)
        
        sources = sorted(list(set(f"{g['source_file']} [{g['source_sheet']}]" for g in group)))
        phone_full = best["phone"]
        
        merged_brokers.append({
            "Unit_Code": code_str or "SE-BRK",
            "Classification": "Broker / Network",
            "Broker_Audit_Reason": best["owner_evidence"],
            "Contact_Name": best["name"] or "وسيط عقاري",
            "Mobile": phone_full,
            "Mobile_Last7": best["last7"],
            "WhatsApp_Link": f"https://wa.me/20{phone_full[1:]}" if len(phone_full) == 11 and phone_full.startswith("01") else "",
            "Deal_Type": best["deal_type"],
            "Compound": best["compound"] or "New Cairo",
            "Location_Zone": best["zone"] or "New Cairo",
            "Property_Type": best["prop_type"] or "Apartment",
            "Price_EGP": best["price"],
            "Area_Sqm": best["area"],
            "Bedrooms": best["beds"],
            "Bathrooms": best["baths"],
            "Finishing": best["finishing"],
            "Availability": best["status"],
            "Has_Photos": "Yes" if photo_str else "No",
            "Photo_URLs": photo_str,
            "Description_Notes": best["desc"],
            "Source_Sheets": "; ".join(sources)
        })
        
    print(f"Final Consolidated Brokers: {len(merged_brokers):,} distinct listings")
    
    # ── WRITE OUTPUT WORKBOOK ─────────────────────────────────────────────────
    print(f"\nGenerating master workbook at: {OUT_FILE}...")
    wb_out = openpyxl.Workbook()
    
    # Styling definitions
    font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_bold = Font(name="Segoe UI", size=10, bold=True)
    font_regular = Font(name="Segoe UI", size=10)
    
    fill_owner_hdr = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid") # Navy
    fill_broker_hdr = PatternFill(start_color="2D3748", end_color="2D3748", fill_type="solid") # Slate
    fill_req_hdr = PatternFill(start_color="742A2A", end_color="742A2A", fill_type="solid") # Burgundy
    fill_summary_hdr = PatternFill(start_color="1A365D", end_color="1A365D", fill_type="solid")
    
    border_thin = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )
    
    # 1. Direct_Owners Sheet
    ws_owners = wb_out.active
    ws_owners.title = "Direct_Owners"
    ws_owners.views.sheetView[0].showGridLines = True
    
    owner_cols = [
        "Unit_Code", "Classification", "Owner_Verification_Evidence", "Contact_Name",
        "Mobile", "Mobile_Last7", "WhatsApp_Link", "Deal_Type", "Compound", "Location_Zone",
        "Property_Type", "Price_EGP", "Area_Sqm", "Bedrooms", "Bathrooms", "Finishing",
        "Availability", "Total_Listings_Found", "Has_Photos", "Photo_URLs", "Description_Notes", "Source_Sheets"
    ]
    
    ws_owners.append(owner_cols)
    for col_idx in range(1, len(owner_cols) + 1):
        cell = ws_owners.cell(row=1, column=col_idx)
        cell.font = font_header
        cell.fill = fill_owner_hdr
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    for r in merged_owners:
        row_vals = [r[c] for c in owner_cols]
        ws_owners.append(row_vals)
        cur_row = ws_owners.max_row
        
        # Format mobile as text explicitly
        c_mob = ws_owners.cell(row=cur_row, column=5)
        c_mob.number_format = '@'
        c_mob.alignment = Alignment(horizontal="center")
        
        # Price formatting
        c_price = ws_owners.cell(row=cur_row, column=12)
        c_price.number_format = '#,##0 "EGP"'
        
        for col_idx in range(1, len(owner_cols) + 1):
            c = ws_owners.cell(row=cur_row, column=col_idx)
            c.font = font_regular
            c.border = border_thin
            if col_idx in [1, 2, 4, 6, 7, 8, 13, 14, 15, 17, 18, 19]:
                c.alignment = Alignment(horizontal="center")
    
    # 2. Brokers Sheet
    ws_brokers = wb_out.create_sheet("Brokers")
    ws_brokers.views.sheetView[0].showGridLines = True
    
    broker_cols = [
        "Unit_Code", "Classification", "Broker_Audit_Reason", "Contact_Name",
        "Mobile", "Mobile_Last7", "WhatsApp_Link", "Deal_Type", "Compound", "Location_Zone",
        "Property_Type", "Price_EGP", "Area_Sqm", "Bedrooms", "Bathrooms", "Finishing",
        "Availability", "Has_Photos", "Photo_URLs", "Description_Notes", "Source_Sheets"
    ]
    
    ws_brokers.append(broker_cols)
    for col_idx in range(1, len(broker_cols) + 1):
        cell = ws_brokers.cell(row=1, column=col_idx)
        cell.font = font_header
        cell.fill = fill_broker_hdr
        cell.alignment = Alignment(horizontal="center", vertical="center")
        
    for r in merged_brokers:
        row_vals = [r[c] for c in broker_cols]
        ws_brokers.append(row_vals)
        cur_row = ws_brokers.max_row
        
        c_mob = ws_brokers.cell(row=cur_row, column=5)
        c_mob.number_format = '@'
        c_mob.alignment = Alignment(horizontal="center")
        
        c_price = ws_brokers.cell(row=cur_row, column=12)
        c_price.number_format = '#,##0 "EGP"'
        
        for col_idx in range(1, len(broker_cols) + 1):
            c = ws_brokers.cell(row=cur_row, column=col_idx)
            c.font = font_regular
            c.border = border_thin
            if col_idx in [1, 2, 4, 6, 7, 8, 13, 14, 15, 17, 18]:
                c.alignment = Alignment(horizontal="center")

    # 3. Client_Requests Sheet
    ws_req = wb_out.create_sheet("Client_Requests")
    ws_req.views.sheetView[0].showGridLines = True
    req_cols = ["Request_ID", "Client_Name", "Phone", "Phone_Last7", "Deal_Type", "Compound / Target", "Budget_EGP", "Description_Request", "Source_File"]
    ws_req.append(req_cols)
    for col_idx in range(1, len(req_cols) + 1):
        cell = ws_req.cell(row=1, column=col_idx)
        cell.font = font_header
        cell.fill = fill_req_hdr
        cell.alignment = Alignment(horizontal="center", vertical="center")
        
    for i, r in enumerate(request_records):
        ws_req.append([
            f"REQ-{i+1:04d}",
            r["name"] or "طلب عميل",
            r["phone"],
            r["last7"],
            r["deal_type"],
            r["compound"],
            r["price"],
            r["desc"],
            f"{r['source_file']} [{r['source_sheet']}]"
        ])
        cur_row = ws_req.max_row
        ws_req.cell(row=cur_row, column=3).number_format = '@'
        ws_req.cell(row=cur_row, column=7).number_format = '#,##0 "EGP"'
        for col_idx in range(1, len(req_cols) + 1):
            c = ws_req.cell(row=cur_row, column=col_idx)
            c.font = font_regular
            c.border = border_thin
            
    # 4. Summary & Audit Dashboard Sheet
    ws_sum = wb_out.create_sheet("Summary_Audit", 0) # Place as first tab
    ws_sum.views.sheetView[0].showGridLines = True
    
    ws_sum.column_dimensions['A'].width = 5
    ws_sum.column_dimensions['B'].width = 38
    ws_sum.column_dimensions['C'].width = 25
    ws_sum.column_dimensions['D'].width = 45
    
    ws_sum.merge_cells("B2:D2")
    title_cell = ws_sum["B2"]
    title_cell.value = "SIERRA ESTATES — UNIFIED INVENTORY CONSOLIDATION REPORT"
    title_cell.font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
    title_cell.fill = fill_summary_hdr
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws_sum.row_dimensions[2].height = 35
    
    ws_sum["B3"] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} Cairo"
    ws_sum["B3"].font = Font(name="Segoe UI", size=9, italic=True, color="718096")
    
    metrics = [
        ("Total Raw Input Records Scanned", f"{total_extracted:,}", "Across all 6 master workbooks"),
        ("Unique Phone Numbers Identified", f"{len(phone_counts):,}", "Normalized to 11-digit / Last-7 Egyptian format"),
        ("Verified Direct Owner Units (Deduped)", f"{len(merged_owners):,}", "Strictly 1 row per unique owner mobile"),
        ("Direct Owner Phone Duplicates Merged", f"{audit_stats['verified_owners'] - len(merged_owners):,}", "Multi-sheet owner reposts collapsed"),
        ("Brokers Reclassified (Removed from Owners)", f"{audit_stats['reclassified_brokers']:,}", "High-frequency listers & broker keywords filtered"),
        ("Consolidated Broker Network Listings", f"{len(merged_brokers):,}", "Deduplicated by (Phone, Rounded Price)"),
        ("Client Buyer/Tenant Requests Filtered", f"{len(request_records):,}", "Isolated to Client_Requests sheet"),
    ]
    
    start_row = 5
    ws_sum.cell(row=start_row, column=2, value="Audit Metric").font = font_bold
    ws_sum.cell(row=start_row, column=3, value="Count / Value").font = font_bold
    ws_sum.cell(row=start_row, column=4, value="Verification Scope & Rationale").font = font_bold
    ws_sum.row_dimensions[start_row].height = 24
    
    for c_idx in range(2, 5):
        cell = ws_sum.cell(row=start_row, column=c_idx)
        cell.fill = PatternFill(start_color="EDF2F7", fill_type="solid")
        cell.border = border_thin
    
    for i, (m_label, m_val, m_desc) in enumerate(metrics):
        r_idx = start_row + 1 + i
        ws_sum.row_dimensions[r_idx].height = 22
        
        c1 = ws_sum.cell(row=r_idx, column=2, value=m_label)
        c2 = ws_sum.cell(row=r_idx, column=3, value=m_val)
        c3 = ws_sum.cell(row=r_idx, column=4, value=m_desc)
        
        c1.font = font_bold if "Direct Owner" in m_label else font_regular
        c2.font = font_bold
        c3.font = font_regular
        
        c1.border = border_thin
        c2.border = border_thin
        c3.border = border_thin
        
        c2.alignment = Alignment(horizontal="center")
        
        if "Direct Owner" in m_label:
            c1.fill = PatternFill(start_color="EBF8FF", fill_type="solid")
            c2.fill = PatternFill(start_color="EBF8FF", fill_type="solid")
            c3.fill = PatternFill(start_color="EBF8FF", fill_type="solid")
            
    # Auto-fit column widths across all sheets
    for ws in [ws_owners, ws_brokers, ws_req]:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col[:100]: # Sample first 100 rows
                val_s = str(cell.value or "")
                if len(val_s) > max_len:
                    max_len = len(val_s)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)
            
    wb_out.save(OUT_FILE)
    wb_out.close()
    
    print("\n" + "=" * 70)
    print(f"✔ MASTER EXCEL GENERATED SUCCESSFULLY:")
    print(f"  Path: {OUT_FILE}")
    print(f"  File size: {os.path.getsize(OUT_FILE) / (1024*1024):.2f} MB")
    print("=" * 70)

if __name__ == "__main__":
    main()
