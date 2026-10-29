#!/usr/bin/env python3
"""
Build Clean Master Inventory Workbook (Sierra Estates)
======================================================
Produces an institutional-grade, pristine Excel workbook (.xlsx) containing:
  1. Standardized 19-column Master_Inventory sheet matching the authoritative schema.
  2. Integrated Data Validation dropdowns for:
     - Compounds (Location ) with 30+ canonical New Cairo communities + Other + Ask Owner.
     - Bedrooms (bedrooms) with Studio, 1-6+, Commercial / Retail, and Ask Owner / Unknown.
     - Availability (Availablty) with standard lifecycle statuses.
     - Deal Type (Type: rent, sale, etc.)
     - Property Type (Property Tybe: Apartment, Villa, etc.)
     - Furnishing (Furnished or not)
  3. Pre-normalized existing records:
     - Standardized compound typos (Mevida -> Mivida, rehab -> Al Rehab, etc.)
     - Cleaned bedroom counts (moved stray prices like 80000 out of bedrooms, extracted bedroom count from comments)
     - Preserved mobile numbers with zero-drop text formatting.
  4. Luxury Obsidian Navy visual theme (#0F172A header, white bold text, auto-fit column widths, freeze panes, auto-filters).
  5. Dedicated _ValidationLookups reference tab preventing Excel 255-character validation formula limits.
"""

import sys
import os
import json
import re
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

sys.stdout.reconfigure(encoding='utf-8')

# Canonical Header Definition (19 Columns)
HEADERS = [
    "Timestamp",
    "NO",
    "تاريخ اخر تحديث ",
    "Name",
    "Mobile",
    "Availablty",
    "bedrooms",
    "Location ",
    "Unit Price",
    "Furnished or not",
    "Type",
    "Property Tybe",
    "Code",
    "Owner",
    "Garden",
    "Space",
    "Pool",
    "Comment",
    "تاريخ اخر تواصل",
]

# Lookups
KNOWN_COMPOUNDS = [
    "Madinaty",
    "Mivida",
    "Al Rehab",
    "Eastown",
    "Hyde Park",
    "Lake View Residence",
    "Fifth Square",
    "Villette",
    "Uptown Cairo",
    "Mountain View iCity",
    "Mountain View Executive",
    "Cairo Festival City (CFC)",
    "SODIC East",
    "Katameya Dunes",
    "Katameya Heights",
    "Swan Lake",
    "Palm Hills New Cairo",
    "Zed East",
    "Waterway",
    "Galleria Moon Valley",
    "Oriana 2",
    "El Shorouk City",
    "New Capital",
    "90 Avenue",
    "Midtown",
    "Sarai",
    "Taj City",
    "The Address East",
    "New Cairo (General)",
    "Other / To Be Added",
    "Ask Owner / Under Review",
]

ROOM_OPTIONS = [
    "Studio",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6+",
    "Commercial / Retail",
    "Ask Owner / Unknown",
]

AVAILABILITY_OPTIONS = [
    "Available",
    "No answer",
    "Follow up",
    "تم استلام الوحدة",
    "Sold",
    "Rented",
    "Not available",
    "Ask Owner",
]

DEAL_TYPE_OPTIONS = [
    "rent",
    "sale",
    "commercial rent",
    "commercial sale",
    "Ask Owner",
]

PROPERTY_TYPE_OPTIONS = [
    "Apartment",
    "Standalone Villa",
    "Twin House",
    "Townhouse",
    "Duplex",
    "Penthouse",
    "Studio",
    "Chalet",
    "Commercial / Office",
    "Clinic",
    "Floor With Garden",
]

FURNISH_OPTIONS = [
    "Furnished",
    "Unfurnished",
    "Semi-Furnished",
    "Ultra Super Lux",
    "Core & Shell",
    "Ask Owner",
]

def normalize_compound(raw_loc: str) -> str:
    if not raw_loc or not str(raw_loc).strip():
        return "Other / To Be Added"
    s = str(raw_loc).strip()
    low = s.lower()

    if low in ("mevida", "mivida"):
        return "Mivida"
    if low in ("rehab", "al rehab", "الرحاب"):
        return "Al Rehab"
    if low in ("madinaty", "مدينتي"):
        return "Madinaty"
    if low in ("east town", "eastown"):
        return "Eastown"
    if low in ("fifth square", "fifth sq"):
        return "Fifth Square"
    if low in ("up town cairo", "uptown cairo", "uptown"):
        return "Uptown Cairo"
    if low in ("cfc", "cairo festival city"):
        return "Cairo Festival City (CFC)"
    if low in ("hyde park", "hydepark"):
        return "Hyde Park"
    if low == "villette":
        return "Villette"
    if low in ("5th settlement", "fifth settlement", "new cairo", "التجمع الخامس"):
        return "New Cairo (General)"
    if low in ("lake view", "lakeview", "lake view residence"):
        return "Lake View Residence"
    if low in ("sodic", "sodic east"):
        return "SODIC East"
    if low in ("swan lake", "swanlake"):
        return "Swan Lake"
    if low in ("palm hills", "palm hills new cairo"):
        return "Palm Hills New Cairo"
    if low in ("the waterway", "waterway", "water way"):
        return "Waterway"
    if low in ("mountain view", "mountain view icity", "mv", "icity"):
        return "Mountain View iCity"
    if low in ("zed", "zed east"):
        return "Zed East"
    if low in ("galleria", "galleria moon valley"):
        return "Galleria Moon Valley"
    if low in ("oriana", "oriana 2"):
        return "Oriana 2"
    if low in ("90 avenue", "تسعين افينيو"):
        return "90 Avenue"
    if low in ("midtown", "ميدتاون"):
        return "Midtown"
    if low in ("sarai", "سراي"):
        return "Sarai"
    if low in ("taj city", "تاج سيتي"):
        return "Taj City"
    if low in ("the address east", "ادريس ايست"):
        return "The Address East"
    if low in ("shorouk", "el shorouk", "الشروق"):
        return "El Shorouk City"
    if low in ("capital", "new capital", "العاصمة الادارية"):
        return "New Capital"
    if low in ("n/a", "other", "غير محدد", "أخرى"):
        return "Other / To Be Added"

    # Match case-insensitively against known compounds
    for kc in KNOWN_COMPOUNDS:
        if kc.lower() == low:
            return kc

    return s

def normalize_bedrooms(raw_bed, comment: str = "", price_val = None):
    # returns (cleaned_bed_str, price_spill)
    price_spill = None
    bed_str = str(raw_bed or "").strip()
    
    # Arabic to Western digits
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for idx, d in enumerate(arabic_digits):
        bed_str = bed_str.replace(d, str(idx))

    digits_only = re.sub(r"[^\d]", "", bed_str)
    bed_num = int(digits_only) if digits_only else 0

    # Misplaced large number (e.g. 80000 rent in bedrooms column)
    if bed_num >= 5000:
        price_spill = bed_num
        return "Ask Owner / Unknown", price_spill

    if bed_num in (1, 2, 3, 4, 5, 6):
        return str(bed_num), None
    if bed_num >= 7:
        return "6+", None

    if bed_str.lower() in ("studio", "استوديو", "استديو"):
        return "Studio", None
    if "محل" in bed_str or "تجاري" in bed_str or "commercial" in bed_str.lower():
        return "Commercial / Retail", None

    # Try inferring from comment
    if comment:
        m = re.search(r"(\d+)\s*(غرف|غرفه|غرفة|نوم|bed|bhk)", str(comment), re.IGNORECASE)
        if m:
            inferred = int(m.group(1))
            if inferred in (1, 2, 3, 4, 5, 6):
                return str(inferred), None
            elif inferred >= 7:
                return "6+", None

    return "Ask Owner / Unknown", None

def normalize_availability(raw_avail: str) -> str:
    s = str(raw_avail or "").strip()
    low = s.lower()
    if low in ("available", "متاح", "متاحة"):
        return "Available"
    if low in ("no answer", "لا يرد", "مبيردش"):
        return "No answer"
    if low in ("follow up", "متابعة"):
        return "Follow up"
    if low in ("تم استلام الوحدة", "مستلمة", "مستلم"):
        return "تم استلام الوحدة"
    if low in ("sold", "مباع", "مبيعة", "اتباعت"):
        return "Sold"
    if low in ("rented", "مؤجرة", "تاجرت"):
        return "Rented"
    if low in ("not available", "غير متاح", "غير متاحة"):
        return "Not available"
    if not s or low in ("empty", "none", "nan", "null"):
        return "Available"
    return s

def normalize_deal_type(raw_type: str) -> str:
    s = str(raw_type or "").strip().lower()
    if "rent" in s or "ايجار" in s or "إيجار" in s:
        if "comm" in s or "تجاري" in s:
            return "commercial rent"
        return "rent"
    if "sale" in s or "بيع" in s or "resale" in s:
        if "comm" in s or "تجاري" in s:
            return "commercial sale"
        return "sale"
    return "rent"  # default for rent-heavy owner workflows

def normalize_property_type(raw_pt: str) -> str:
    s = str(raw_pt or "").strip().lower()
    if "villa" in s or "فيلا" in s:
        return "Standalone Villa"
    if "twin" in s or "توين" in s:
        return "Twin House"
    if "town" in s or "تاون" in s:
        return "Townhouse"
    if "duplex" in s or "دوبلكس" in s:
        return "Duplex"
    if "penthouse" in s or "بنتهاوس" in s:
        return "Penthouse"
    if "studio" in s or "استوديو" in s:
        return "Studio"
    if "chalet" in s or "شاليه" in s:
        return "Chalet"
    if "commercial" in s or "محل" in s or "تجاري" in s or "office" in s or "مكتب" in s:
        return "Commercial / Office"
    if "clinic" in s or "عيادة" in s:
        return "Clinic"
    return "Apartment"

def format_mobile(phone_raw: str) -> str:
    if not phone_raw:
        return ""
    s = str(phone_raw).strip()
    # If starts with +20 or similar, keep clean
    if s.startswith("+"):
        return s
    digits = re.sub(r"[^\d]", "", s)
    if len(digits) == 10 and digits.startswith("1"):
        return "0" + digits
    if len(digits) == 11 and digits.startswith("01"):
        return digits
    if len(digits) == 12 and digits.startswith("201"):
        return "+" + digits
    return s

def build_workbook():
    json_path = "apps/sierra-estates-realty/data/online-sheet-units.json"
    if not os.path.exists(json_path):
        print(f"Error: dataset {json_path} not found.")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        units = json.load(f)

    print(f"Loaded {len(units)} units from {json_path}")

    wb = openpyxl.Workbook()

    # Sheet 1: Master_Inventory
    ws = wb.active
    ws.title = "Master_Inventory"

    # Sheet 2: _ValidationLookups (Options table)
    ws_lookups = wb.create_sheet(title="_ValidationLookups")

    # Populate Lookups Sheet
    lookup_cols = [
        ("Location", KNOWN_COMPOUNDS),
        ("Bedrooms", ROOM_OPTIONS),
        ("Availability", AVAILABILITY_OPTIONS),
        ("DealType", DEAL_TYPE_OPTIONS),
        ("PropertyType", PROPERTY_TYPE_OPTIONS),
        ("Furnishing", FURNISH_OPTIONS),
    ]

    for col_idx, (col_name, options) in enumerate(lookup_cols, start=1):
        ws_lookups.cell(row=1, column=col_idx, value=col_name).font = Font(bold=True)
        for row_idx, opt in enumerate(options, start=2):
            ws_lookups.cell(row=row_idx, column=col_idx, value=opt)

    # Styling constants
    NAVY_FILL = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    HEADER_FONT = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    DATA_FONT = Font(name="Segoe UI", size=10, color="000000")
    ZEBRA_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    
    THIN_BORDER_SIDE = Side(border_style="thin", color="E2E8F0")
    ROW_BORDER = Border(
        left=THIN_BORDER_SIDE,
        right=THIN_BORDER_SIDE,
        top=THIN_BORDER_SIDE,
        bottom=THIN_BORDER_SIDE
    )

    CENTER_ALIGN = Alignment(horizontal="center", vertical="center")
    LEFT_ALIGN = Alignment(horizontal="left", vertical="center")
    RIGHT_ALIGN = Alignment(horizontal="right", vertical="center")

    # Write Headers
    ws.row_dimensions[1].height = 36
    for col_idx, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = NAVY_FILL
        cell.font = HEADER_FONT
        cell.alignment = CENTER_ALIGN
        cell.border = ROW_BORDER

    # Populate Data Rows
    norm_compound_cnt = 0
    norm_bed_cnt = 0
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for idx, u in enumerate(units, start=1):
        row_num = idx + 1
        ws.row_dimensions[row_num].height = 22

        raw_loc = u.get("compound", "")
        clean_loc = normalize_compound(raw_loc)
        if clean_loc != raw_loc:
            norm_compound_cnt += 1

        comment = u.get("comment", "")
        raw_bed = u.get("rooms", "")
        price_val = u.get("price")

        clean_bed, price_spill = normalize_bedrooms(raw_bed, comment=comment, price_val=price_val)
        if clean_bed != str(raw_bed):
            norm_bed_cnt += 1

        final_price = price_spill if price_spill is not None else price_val
        clean_avail = normalize_availability(u.get("availability", ""))
        clean_type = normalize_deal_type(u.get("deal", ""))
        clean_prop_type = normalize_property_type(u.get("propertyType", ""))
        clean_mobile = format_mobile(u.get("phone", ""))

        row_values = [
            u.get("lastUpdate") or now_str,            # Timestamp
            idx,                                        # NO
            u.get("lastUpdate") or "14-Apr-26",         # تاريخ اخر تحديث
            u.get("sender") or "",                      # Name
            clean_mobile,                               # Mobile
            clean_avail,                                # Availablty
            clean_bed,                                  # bedrooms
            clean_loc,                                  # Location
            final_price if final_price else "",         # Unit Price
            "Ask Owner",                                # Furnished or not
            clean_type,                                 # Type
            clean_prop_type,                            # Property Tybe
            u.get("code") or f"UNT-{idx:04d}",          # Code
            u.get("advertiserType") or "Owner",         # Owner
            "",                                         # Garden
            u.get("space") or "",                       # Space
            "",                                         # Pool
            comment,                                    # Comment
            u.get("lastUpdate") or ""                   # تاريخ اخر تواصل
        ]

        is_zebra = (row_num % 2 == 0)
        row_fill = ZEBRA_FILL if is_zebra else WHITE_FILL

        for col_idx, val in enumerate(row_values, start=1):
            cell = ws.cell(row=row_num, column=col_idx, value=val)
            cell.font = DATA_FONT
            cell.fill = row_fill
            cell.border = ROW_BORDER

            # Specific column alignments & number formats
            if col_idx in (1, 2, 3, 6, 7, 10, 11, 12, 14, 15, 17, 19):
                cell.alignment = CENTER_ALIGN
            elif col_idx in (5, 9, 16):
                cell.alignment = RIGHT_ALIGN
            else:
                cell.alignment = LEFT_ALIGN

            # Mobile formatting (Plain Text so leading zero is NEVER dropped)
            if col_idx == 5:
                cell.number_format = "@"

            # Price formatting
            if col_idx == 9 and isinstance(val, (int, float)):
                cell.number_format = "#,##0"

    total_rows = len(units) + 1

    # Freeze Header Row
    ws.freeze_panes = "A2"

    # Auto-filter
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HEADERS))}{total_rows}"

    # Auto-fit Column Widths with clean margins
    col_widths = {
        1: 20,   # Timestamp
        2: 8,    # NO
        3: 18,   # تاريخ اخر تحديث
        4: 20,   # Name
        5: 18,   # Mobile
        6: 18,   # Availablty
        7: 22,   # bedrooms
        8: 26,   # Location
        9: 16,   # Unit Price
        10: 18,  # Furnished or not
        11: 16,  # Type
        12: 20,  # Property Tybe
        13: 20,  # Code
        14: 14,  # Owner
        15: 12,  # Garden
        16: 14,  # Space
        17: 12,  # Pool
        18: 35,  # Comment
        19: 18,  # تاريخ اخر تواصل
    }

    for col_idx, width in col_widths.items():
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width

    # Embed Excel Data Validations pointing to _ValidationLookups
    # 1. Location (Col H / 8)
    dv_location = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$A$2:$A${len(KNOWN_COMPOUNDS)+1}",
        allow_blank=True
    )
    dv_location.error ='Please pick a valid compound or add it to _ValidationLookups'
    dv_location.errorTitle = 'Invalid Compound'
    dv_location.prompt = 'Select compound enclave'
    dv_location.promptTitle = 'Compound Selection'
    ws.add_data_validation(dv_location)
    dv_location.add(f"H2:H{total_rows}")

    # 2. Bedrooms (Col G / 7)
    dv_bedrooms = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$B$2:$B${len(ROOM_OPTIONS)+1}",
        allow_blank=True
    )
    ws.add_data_validation(dv_bedrooms)
    dv_bedrooms.add(f"G2:G{total_rows}")

    # 3. Availability (Col F / 6)
    dv_avail = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$C$2:$C${len(AVAILABILITY_OPTIONS)+1}",
        allow_blank=True
    )
    ws.add_data_validation(dv_avail)
    dv_avail.add(f"F2:F{total_rows}")

    # 4. Furnishing (Col J / 10)
    dv_furnish = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$F$2:$F${len(FURNISH_OPTIONS)+1}",
        allow_blank=True
    )
    ws.add_data_validation(dv_furnish)
    dv_furnish.add(f"J2:J{total_rows}")

    # 5. Deal Type (Col K / 11)
    dv_deal = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$D$2:$D${len(DEAL_TYPE_OPTIONS)+1}",
        allow_blank=True
    )
    ws.add_data_validation(dv_deal)
    dv_deal.add(f"K2:K{total_rows}")

    # 6. Property Type (Col L / 12)
    dv_prop = DataValidation(
        type="list",
        formula1=f"=_ValidationLookups!$E$2:$E${len(PROPERTY_TYPE_OPTIONS)+1}",
        allow_blank=True
    )
    ws.add_data_validation(dv_prop)
    dv_prop.add(f"L2:L{total_rows}")

    # Auto-fit columns in _ValidationLookups
    for col_idx in range(1, len(lookup_cols) + 1):
        col_letter = get_column_letter(col_idx)
        ws_lookups.column_dimensions[col_letter].width = 25

    # Target save paths
    output_targets = [
        "apps/sierra-estates-realty/public/downloads/sierra-estates-master-inventory-clean.xlsx",
        "data/sierra-estates-master-inventory-clean.xlsx"
    ]

    for target in output_targets:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        wb.save(target)
        print(f"Successfully saved pristine workbook -> {target} ({os.path.getsize(target):,} bytes)")

    print(f"\nWorkbook Build Complete:")
    print(f"  • Total Inventory Units: {len(units):,}")
    print(f"  • Total Data Rows: {total_rows - 1:,}")
    print(f"  • Standardized Compounds: {norm_compound_cnt:,}")
    print(f"  • Normalized Room Counts: {norm_bed_cnt:,}")
    print(f"  • Dropdown validations attached: Location, Bedrooms, Availability, Deal Type, Property Type, Furnishing")

if __name__ == "__main__":
    build_workbook()
