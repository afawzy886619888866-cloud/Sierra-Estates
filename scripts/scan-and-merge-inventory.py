# -*- coding: utf-8 -*-
"""
scan-and-merge-inventory.py — Sierra Estates Master Inventory Scanner & Consolidator
Scans local Excel and CSV files (default: I:\\supabase\\Sheets), normalizes columns,
prioritizes listings with photos, deduplicates by (phone, price) as specified by the user,
and produces a consolidated Master Excel workbook and Airtable CSV export.
"""

import sys
import os
import re
import glob
import json
import time
import hashlib
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    getattr(sys.stderr, "reconfigure")(encoding="utf-8")

import pandas as pd
import numpy as np

# Config
DEFAULT_DIR = r"I:\supabase\Sheets"
FALLBACK_DIR = r"H:\Sheets"
USD_TO_EGP = 48.5

# Column synonyms map across Arabic, English, and CRM formats
COLUMN_MAP = {
    'unit_code': ['code', 'unit code', 'كود', 'رقم الوحدة', 'ref', 'unitcode', 'property code', 'property code '],
    'phone': ['mobile', 'phone', 'تليفون', 'موبايل', 'رقم الهاتف', 'broker phone', 'contact', 'whatsapp', 'number', 'number.1'],
    'price': ['price', 'unit price', 'unit price ', 'السعر', 'الإيجار', 'ايجار', 'المطلوب', 'total price', 'price (egp)', 'price_egp'],
    'compound': ['compound', 'الكمبوند', 'الموقع', 'location', 'location ', 'المنطقة والكمبوند', 'location.1'],
    'property_type': ['property type', 'property tybe', 'type', 'النوع', 'نوع الوحدة', 'unit type', 'unit type.1', 'propertytype'],
    'deal_type': ['deal', 'deal type', 'operation', 'نوع المعاملة', 'بيع/ايجار', 'rent/resale', 'rent - resale', 'rent period type'],
    'area': ['area', 'area (sqm)', 'space', 'المساحة', 'مساحه', 'area_sqm'],
    'bedrooms': ['bedrooms', 'number of bedrooms', 'number of bedrooms ', 'غرف', 'عدد الغرف', 'rooms', 'نوم', 'beds'],
    'bathrooms': ['bathrooms', 'baths', 'الحمامات', 'حمام'],
    'finishing': ['finishing', 'furnishing', 'تشطيب', 'حالة التشطيب', 'حالة التأثيث', 'التأثيث', 'مفروش', 'furnished', 'furnished or not', 'furnished.1'],
    'availability': ['availability', 'availablty', 'avail', 'الحالة', 'المتاحية', 'status'],
    'advertiser_type': ['advertiser type', 'advertiser_type', 'owner or broker', 'owner/broker', 'نوع المعلن', 'المعلن', 'source type'],
    'owner_name': ['name', 'owner name', 'owner', 'اسم المالك', 'الاسم', 'contact person', 'agent name', 'name.1'],
    'has_photos': ['has_photos', 'photos', 'صور', 'has photos', 'hasphotos'],
    'photo_links': ['photo_links', 'photo_path', 'photo_code', 'links', 'images', 'image_url'],
    'notes': ['notes', 'comment', 'description', 'ملاحظات', 'الوصف', 'تفاصيل', 'extra notes 1', 'extra notes 2']
}

COMPOUNDS_REGEX = [
    ('Madinaty', re.compile(r'مدينت[يى]|madinat', re.I)),
    ('Al Rehab', re.compile(r'الرحاب|rehab', re.I)),
    ('Mivida', re.compile(r'ميفيدا|mivida', re.I)),
    ('Hyde Park', re.compile(r'هايد\s*بارك|hyde\s*park', re.I)),
    ('Mountain View', re.compile(r'ماونتن\s*فيو|mountain\s*view', re.I)),
    ('Palm Hills', re.compile(r'بالم\s*هيلز|palm\s*hills', re.I)),
    ('Swan Lake', re.compile(r'سوان\s*ليك|swan\s*lake', re.I)),
    ('Villette', re.compile(r'فيليت|villette', re.I)),
    ('Eastown', re.compile(r'ايست\s*تاون|eastown', re.I)),
    ('Katameya Dunes', re.compile(r'قطامية\s*ديونز|katameya\s*dunes', re.I)),
    ('Katameya Heights', re.compile(r'قطامية\s*هايتر|katameya\s*heights', re.I)),
    ('Lake View', re.compile(r'ليك\s*فيو|lake\s*view', re.I)),
    ('Celia', re.compile(r'سيليا|celia', re.I)),
    ('Badya', re.compile(r'بادية|badya', re.I)),
    ('Sarai', re.compile(r'سراي|sarai', re.I)),
    ('Zed East', re.compile(r'زد\s*ايست|zed\s*east', re.I)),
    ('El Patio', re.compile(r'الباتيو|el\s*patio', re.I)),
    ('Taj City', re.compile(r'تاج\s*سيتي|taj\s*city', re.I)),
    ('Bloomfields', re.compile(r'بلوم\s*فيلدز|bloomfields', re.I)),
    ('Il Bosco', re.compile(r'البوسكو|il\s*bosco', re.I)),
]

def normalize_phone(val: Any) -> Optional[str]:
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    digits = ''.join([c for c in s if c.isdigit()])
    if not digits:
        return None
    if digits.startswith('20') and len(digits) >= 12:
        digits = digits[2:]
    if len(digits) == 10 and digits.startswith('1'):
        digits = '0' + digits
    if len(digits) >= 9 and digits.startswith('01'):
        return digits[:11]
    if len(digits) >= 7:
        return digits
    return None

def normalize_price(val: Any) -> Tuple[float, str]:
    if pd.isna(val) or val is None:
        return 0.0, 'EGP'
    s = str(val).strip().replace(',', '')
    is_usd = bool(re.search(r'usd|\$|دولار', s, re.I))
    clean = re.sub(r'[^\d.]', '', s)
    try:
        num = float(clean)
        if is_usd:
            return round(num * USD_TO_EGP, 2), 'USD'
        return round(num, 2), 'EGP'
    except ValueError:
        return 0.0, 'EGP'

def normalize_compound(text: Any) -> str:
    if pd.isna(text) or not text:
        return 'New Cairo (General)'
    s = str(text).strip()
    for name, rgx in COMPOUNDS_REGEX:
        if rgx.search(s):
            return name
    return s[:40].strip()

def normalize_property_type(val: Any) -> str:
    if pd.isna(val) or not val:
        return 'Apartment'
    s = str(val).strip().lower()
    if any(k in s for k in ['villa', 'فيلا', 'standalone', 'مستقلة']):
        return 'Villa'
    if any(k in s for k in ['twin', 'توين']):
        return 'Twin House'
    if any(k in s for k in ['town', 'تاون']):
        return 'Townhouse'
    if any(k in s for k in ['duplex', 'دوبلكس']):
        return 'Duplex'
    if any(k in s for k in ['penthouse', 'بنتهاوس', 'روف']):
        return 'Penthouse'
    if any(k in s for k in ['studio', 'استوديو']):
        return 'Studio'
    if any(k in s for k in ['chalet', 'شاليه']):
        return 'Chalet'
    if any(k in s for k in ['office', 'مكتب', 'اداري']):
        return 'Office'
    if any(k in s for k in ['commercial', 'تجاري', 'محل']):
        return 'Commercial'
    if any(k in s for k in ['clinic', 'عيادة']):
        return 'Clinic'
    if any(k in s for k in ['land', 'ارض', 'أرض']):
        return 'Land'
    return 'Apartment'

def normalize_deal(val: Any) -> str:
    if pd.isna(val) or not val:
        return 'Rent'
    s = str(val).strip().lower()
    if any(k in s for k in ['sale', 'buy', 'resale', 'بيع', 'شراء', 'تمليك']):
        return 'Sale'
    return 'Rent'

def normalize_advertiser(val: Any, default: str = 'Owner') -> str:
    if pd.isna(val) or not val:
        return default
    s = str(val).strip().lower()
    if any(k in s for k in ['broker', 'سمسار', 'وسيط', 'شركة']):
        return 'Broker'
    if any(k in s for k in ['owner', 'مالك']):
        return 'Owner'
    return default

def match_column(col_name: str) -> Optional[str]:
    c_clean = str(col_name).strip().lower()
    for standard_col, synonyms in COLUMN_MAP.items():
        if c_clean == standard_col or c_clean in synonyms:
            return standard_col
    return None

def extract_df_records(df: pd.DataFrame, source_file: str, source_sheet: str) -> List[Dict[str, Any]]:
    col_mapping = {}
    for col in df.columns:
        m = match_column(col)
        if m and m not in col_mapping.values():
            col_mapping[col] = m

    records = []
    default_advertiser = 'Broker' if 'broker' in source_sheet.lower() else 'Owner'
    default_deal = 'Sale' if any(w in source_sheet.lower() for w in ['buy', 'sale']) else 'Rent'

    for _, row in df.iterrows():
        rec: Dict[str, Any] = {
            'unit_code': '',
            'phone': '',
            'price': 0.0,
            'currency': 'EGP',
            'compound': '',
            'property_type': 'Apartment',
            'deal_type': default_deal,
            'area': 0.0,
            'bedrooms': 0,
            'bathrooms': 0,
            'finishing': '',
            'availability': 'Available',
            'advertiser_type': default_advertiser,
            'owner_name': '',
            'has_photos': 'NO',
            'photo_links': '',
            'notes': '',
            'source_file': source_file,
            'source_sheet': source_sheet
        }

        for orig_col, std_col in col_mapping.items():
            val = row[orig_col]
            if pd.notna(val):
                rec[std_col] = val

        # Normalization
        rec['phone'] = normalize_phone(rec.get('phone'))
        p_val, cur = normalize_price(rec.get('price'))
        rec['price'] = p_val
        rec['currency'] = cur
        rec['compound'] = normalize_compound(rec.get('compound'))
        rec['property_type'] = normalize_property_type(rec.get('property_type'))
        rec['deal_type'] = normalize_deal(rec.get('deal_type') or default_deal)
        rec['advertiser_type'] = normalize_advertiser(rec.get('advertiser_type'), default=default_advertiser)

        # Numeric fields
        try:
            rec['area'] = float(re.sub(r'[^\d.]', '', str(rec.get('area') or '0')) or 0)
        except ValueError:
            rec['area'] = 0.0

        try:
            rec['bedrooms'] = int(re.sub(r'[^\d]', '', str(rec.get('bedrooms') or '0')) or 0)
        except ValueError:
            rec['bedrooms'] = 0

        try:
            rec['bathrooms'] = int(re.sub(r'[^\d]', '', str(rec.get('bathrooms') or '0')) or 0)
        except ValueError:
            rec['bathrooms'] = 0

        # Check photos
        p_raw = str(rec.get('has_photos') or '').strip().upper()
        p_links = str(rec.get('photo_links') or '').strip()
        if p_raw in ['YES', 'TRUE', '1', 'Y', 'نعم'] or (len(p_links) > 5 and 'http' in p_links):
            rec['has_photos'] = 'YES'
        else:
            rec['has_photos'] = 'NO'

        # Filter empty / invalid rows (must have at least phone OR (compound and price > 0))
        if rec['phone'] or (rec['compound'] and rec['price'] > 0):
            records.append(rec)

    return records

def scan_folder(folder_path: str) -> List[Dict[str, Any]]:
    print(f"\nScanning directory: {folder_path}")
    if not os.path.exists(folder_path):
        print(f"Directory not found: {folder_path}")
        return []

    all_records = []
    files = glob.glob(os.path.join(folder_path, "*"))
    for file_path in files:
        base = os.path.basename(file_path)
        if base.startswith("~$") or base.startswith("."):
            continue
        ext = os.path.splitext(base)[1].lower()

        if ext == '.csv':
            print(f"  Reading CSV: {base}")
            read_success = False
            for enc in ['utf-8-sig', 'utf-8', 'cp1256', 'latin1']:
                try:
                    df = pd.read_csv(file_path, encoding=enc)
                    recs = extract_df_records(df, base, 'Sheet1')
                    all_records.extend(recs)
                    print(f"    Extracted {len(recs)} listings (enc: {enc})")
                    read_success = True
                    break
                except Exception:
                    continue
            if not read_success:
                print(f"    Failed to read CSV {base}")

        elif ext in ['.xlsx', '.xls']:
            print(f"  Reading Excel: {base}")
            try:
                xl = pd.ExcelFile(file_path)
                for sheet in xl.sheet_names:
                    # Skip meta sheets
                    if sheet.lower() in ['summary', 'meta', 'kpis']:
                        continue
                    df = xl.parse(sheet)
                    recs = extract_df_records(df, base, sheet)
                    all_records.extend(recs)
                    print(f"    Sheet [{sheet}]: {len(recs)} listings")
            except Exception as e:
                print(f"    Failed to parse Excel {base}: {e}")

    return all_records

def deduplicate_records(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Deduplicates listings by (phone, price) as requested by user.
    Falls back to (compound, type, price, bedrooms) if phone is absent.
    Prioritizes records with photos. Merges metadata.
    """
    master_map: Dict[str, Dict[str, Any]] = {}
    duplicates_count = 0
    photos_count = 0

    for rec in records:
        phone = rec.get('phone')
        price = rec.get('price', 0.0)

        if phone and len(phone) >= 7:
            dedup_key = f"TEL_{phone}_{int(price)}"
        else:
            comp = (rec.get('compound') or 'unknown').lower()
            ptype = (rec.get('property_type') or 'unknown').lower()
            beds = rec.get('bedrooms', 0)
            dedup_key = f"FALLBACK_{comp}_{ptype}_{int(price)}_{beds}"

        if dedup_key in master_map:
            duplicates_count += 1
            existing = master_map[dedup_key]

            # If new record has photos and existing does not, swap primary
            if rec.get('has_photos') == 'YES' and existing.get('has_photos') != 'YES':
                # Swap and merge existing into rec
                for field in ['area', 'bedrooms', 'bathrooms', 'finishing', 'owner_name', 'notes']:
                    if not rec.get(field) and existing.get(field):
                        rec[field] = existing[field]
                rec['duplicate_sources'] = existing.get('duplicate_sources', []) + [f"{rec['source_file']}:{rec['source_sheet']}"]
                master_map[dedup_key] = rec
            else:
                # Merge new fields into existing
                for field in ['area', 'bedrooms', 'bathrooms', 'finishing', 'owner_name', 'notes', 'unit_code']:
                    if not existing.get(field) and rec.get(field):
                        existing[field] = rec[field]
                if rec.get('has_photos') == 'YES':
                    existing['has_photos'] = 'YES'
                    if rec.get('photo_links'):
                        existing['photo_links'] = rec['photo_links']
                existing.setdefault('duplicate_sources', []).append(f"{rec['source_file']}:{rec['source_sheet']}")
        else:
            rec['duplicate_sources'] = [f"{rec['source_file']}:{rec['source_sheet']}"]
            master_map[dedup_key] = rec

    deduped_list = list(master_map.values())
    for r in deduped_list:
        if r.get('has_photos') == 'YES':
            photos_count += 1

    stats = {
        'total_extracted': len(records),
        'duplicates_removed': duplicates_count,
        'unique_listings': len(deduped_list),
        'with_photos': photos_count,
        'without_photos': len(deduped_list) - photos_count
    }
    return deduped_list, stats

def export_consolidated_database(records: List[Dict[str, Any]], stats: Dict[str, Any], output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    master_excel_path = os.path.join(output_dir, "Final_RealEstate_Master_Unified.xlsx")
    airtable_csv_path = os.path.join(output_dir, "Unified_Airtable_Inventory.csv")

    # Format into DataFrame rows
    rows = []
    for idx, r in enumerate(records, start=1):
        price = r.get('price', 0.0)
        price_fmt = f"{price:,.0f} EGP" if price > 0 else "Price on Request"
        code = r.get('unit_code') or f"SE-{idx:05d}"

        rows.append({
            'RecordID': idx,
            'UnitCode': code,
            'Compound': r.get('compound'),
            'PropertyType': r.get('property_type'),
            'DealType': r.get('deal_type'),
            'Price (EGP)': price,
            'Price Formatted': price_fmt,
            'Area (sqm)': r.get('area') or '',
            'Bedrooms': r.get('bedrooms') or '',
            'Bathrooms': r.get('bathrooms') or '',
            'Finishing': r.get('finishing') or '',
            'Availability': r.get('availability', 'Available'),
            'AdvertiserType': r.get('advertiser_type', 'Owner'),
            'ContactName': r.get('owner_name') or '',
            'Phone': r.get('phone') or '',
            'HasPhotos': r.get('has_photos', 'NO'),
            'PhotoLinks': r.get('photo_links') or '',
            'SourceFile': r.get('source_file') or '',
            'SourceSheet': r.get('source_sheet') or '',
            'DuplicateOccurrences': len(r.get('duplicate_sources', [])),
            'Notes': r.get('notes') or ''
        })

    df_all = pd.DataFrame(rows)

    # Sort so units with photos come first, then highest price
    df_all['HasPhotosOrder'] = df_all['HasPhotos'].apply(lambda x: 0 if x == 'YES' else 1)
    df_all.sort_values(by=['HasPhotosOrder', 'Price (EGP)'], ascending=[True, False], inplace=True)
    df_all.drop(columns=['HasPhotosOrder'], inplace=True)

    # Filter views
    df_photos = df_all[df_all['HasPhotos'] == 'YES']
    df_owners_rent = df_all[(df_all['AdvertiserType'] == 'Owner') & (df_all['DealType'] == 'Rent')]
    df_owners_sale = df_all[(df_all['AdvertiserType'] == 'Owner') & (df_all['DealType'] == 'Sale')]
    df_brokers_rent = df_all[(df_all['AdvertiserType'] == 'Broker') & (df_all['DealType'] == 'Rent')]
    df_brokers_sale = df_all[(df_all['AdvertiserType'] == 'Broker') & (df_all['DealType'] == 'Sale')]

    # Summary Sheet DataFrame
    summary_data = [
        {'Metric': 'Scan Timestamp', 'Value': time.strftime('%Y-%m-%d %H:%M:%S')},
        {'Metric': 'Total Listings Extracted', 'Value': stats['total_extracted']},
        {'Metric': 'Duplicates Merged (Phone + Price)', 'Value': stats['duplicates_removed']},
        {'Metric': 'Total Unique Units', 'Value': stats['unique_listings']},
        {'Metric': 'Units With Photos (High Priority)', 'Value': stats['with_photos']},
        {'Metric': 'Units Without Photos (Map Data)', 'Value': stats['without_photos']},
        {'Metric': 'Direct Owners - Rent', 'Value': len(df_owners_rent)},
        {'Metric': 'Direct Owners - Sale', 'Value': len(df_owners_sale)},
        {'Metric': 'Brokers - Rent', 'Value': len(df_brokers_rent)},
        {'Metric': 'Brokers - Sale', 'Value': len(df_brokers_sale)},
        {'Metric': 'Unique Compounds Covered', 'Value': df_all['Compound'].nunique()},
    ]
    df_summary = pd.DataFrame(summary_data)

    print(f"\nWriting Master Workbook to: {master_excel_path}")
    with pd.ExcelWriter(master_excel_path, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        df_photos.to_excel(writer, sheet_name='Units_With_Photos', index=False)
        df_all.to_excel(writer, sheet_name='All_Units', index=False)
        df_owners_rent.to_excel(writer, sheet_name='Owners_Rent', index=False)
        df_owners_sale.to_excel(writer, sheet_name='Owners_Sale', index=False)
        df_brokers_rent.to_excel(writer, sheet_name='Brokers_Rent', index=False)
        df_brokers_sale.to_excel(writer, sheet_name='Brokers_Sale', index=False)

    print(f"Writing Airtable CSV to: {airtable_csv_path}")
    df_all.to_csv(airtable_csv_path, index=False, encoding='utf-8-sig')

    # Also sync into repo app data
    repo_data_excel = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "apps", "sierra-estates-realty", "data", "sierra-estates-inventory.xlsx"
    ))
    try:
        os.makedirs(os.path.dirname(repo_data_excel), exist_ok=True)
        with pd.ExcelWriter(repo_data_excel, engine='openpyxl') as writer:
            df_all.to_excel(writer, sheet_name='All Listings', index=False)
            df_photos.to_excel(writer, sheet_name='Units With Photos', index=False)
        print(f"Synced to App inventory cache: {repo_data_excel}")
    except Exception as e:
        print(f"Warning syncing to app repo: {e}")

    return master_excel_path, airtable_csv_path

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR
    if not os.path.exists(target_dir):
        if os.path.exists(FALLBACK_DIR):
            target_dir = FALLBACK_DIR
        else:
            print(f"Target directory {target_dir} not found. Please provide a valid path.")
            return

    t0 = time.time()
    records = scan_folder(target_dir)
    if not records:
        print("No valid listings found in directory.")
        return

    deduped, stats = deduplicate_records(records)
    print("\n" + "="*50)
    print("INVENTORY MERGE RESULTS:")
    print(f"  Total records read:       {stats['total_extracted']:,}")
    print(f"  Duplicates resolved:      {stats['duplicates_removed']:,}")
    print(f"  Unique inventory units:   {stats['unique_listings']:,}")
    print(f"  Units with photos:        {stats['with_photos']:,}")
    print(f"  Units without photos:     {stats['without_photos']:,}")
    print("="*50)

    excel_file, csv_file = export_consolidated_database(deduped, stats, target_dir)
    print(f"\nProcess completed in {time.time() - t0:.2f} seconds.")
    print(f"Excel Master: {excel_file}")
    print(f"Airtable CSV: {csv_file}")

if __name__ == "__main__":
    main()
