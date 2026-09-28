#!/usr/bin/env python3
"""
SIERRA BLU — PHASE 1 MASTER INVENTORY PIPELINE
================================================
Sources:
  - data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx (sheet: All Master Listings, 11,488 rows)
  - owners_rent_tab_separated.tsv (298 data rows)  [owner-direct rent, with notes]
  - owners_rent_with_photos.tsv (331 data rows)     [owner-direct rent, with photos]

Pipeline: PARSE -> NORMALIZE -> VALIDATE -> DEDUPLICATE -> CLASSIFY -> QUALITY SCORE -> EMIT
Outputs:
  - data/MASTER_INVENTORY_V1.csv / .xlsx
  - docs/DATA_DICTIONARY.md, DATA_QUALITY_REPORT.md, DUPLICATE_REPORT.md,
    MISSING_DATA_REPORT.md, STALE_LISTINGS_REPORT.md
Never fabricates: unknown compounds stay UNKNOWN (no New-Cairo default), invalid
phones stay invalid, missing prices stay missing.
"""
import csv, hashlib, json, re, unicodedata
from datetime import date, datetime
from collections import Counter, defaultdict

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = '/home/z/my-project/sierra-blu'
XLSX_IN = f'{ROOT}/data/Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx'
TSV1 = f'{ROOT}/owners_rent_tab_separated.tsv'
TSV2 = f'{ROOT}/owners_rent_with_photos.tsv'
TODAY = date(2026, 9, 29)
RUN_TS = '2026-09-29'

# ---------------------------------------------------------------- gazetteer
COMPOUND_COORDS = {
    'Madinaty': (30.101, 31.664), 'New Cairo': (30.03, 31.47), 'Al Rehab': (30.058, 31.514),
    'Uptown Cairo': (30.011, 31.297), 'Fifth Square': (30.025, 31.578), 'Mivida': (30.007, 31.589),
    'Mivida Parks': (30.003, 31.595), 'Cairo Festival City': (30.016, 31.469), 'New Capital': (30.005, 31.74),
    'SODIC East': (30.018, 31.587), 'Hyde Park': (30.008, 31.645), 'Lake View Residence': (30.022, 31.532),
    'Al Narges': (30.052, 31.47), 'Al Banafsaj': (30.045, 31.485), 'Al Andalus': (30.052, 31.49),
    'South Academy': (30.005, 31.44), 'North 90th': (30.03, 31.47), 'Gardenia City': (30.082, 31.412),
    'Eastown': (30.018, 31.587), 'Villette': (30.053, 31.598), 'Swan Lake Residence': (30.045, 31.635),
    '90 Avenue': (30.028, 31.572), 'Katameya Dunes': (29.985, 31.492), 'Katameya Heights': (29.99, 31.48),
    'Katameya Gardens': (29.992, 31.488), 'Village Gardens Katameya': (29.988, 31.484),
    'District 5': (30.012, 31.5), 'Stone Residence': (30.028, 31.557), 'The Square': (30.033, 31.542),
    'El Patio Oro': (30.029, 31.56), 'El Patio 7': (30.035, 31.565), 'El Patio 5 East': (30.14, 31.6),
    'Azzar New Cairo': (30.022, 31.568), 'The Brooks': (30.07, 31.57), 'STEI8HT': (30.075, 31.575),
    'The Crest': (30.068, 31.562), 'Azad & Azad Views': (30.078, 31.558), 'Sarai': (30.005, 31.66),
    'Bloomfields': (30.06, 31.67), 'Taj City': (30.065, 31.531), 'Taj Sultan': (30.062, 31.535),
    'La Mirada': (30.058, 31.685), 'Aeon': (30.03, 31.58), 'Al Burouj': (30.155, 31.63),
    'Dar Misr El Shorouk': (30.132, 31.635), 'Green Square': (30.148, 31.61), 'Layan Residence': (30.01, 31.655),
    'Jayd': (30.045, 31.665), 'Mountain View iCity': (30.014, 31.618), 'Mountain View Executive': (30.018, 31.61),
    'Zed East': (30.095, 31.61), 'The Waterway': (30.028, 31.612), 'Palm Hills New Cairo': (30.002, 31.608),
    'El Shorouk City': (30.121, 31.616), 'El Shorouk Springs': (30.135, 31.615), 'Oriana': (30.033, 31.492),
    'Galleria Moon Valley': (30.02, 31.55), 'Midtown': (30.015, 31.515), 'Mostakbal City': (30.05, 31.65),
    'Badya': (29.93, 30.95), 'Sheikh Zayed': (30.06, 30.98), '6th of October': (29.97, 30.94),
    'North Coast': (30.92, 28.85), 'El Yasmine': (30.048, 31.478), 'El Choueifat': (30.015, 31.425),
    'El Lotus': (30.038, 31.512), 'El Koronfel': (30.065, 31.495), '5th Settlement': (30.02, 31.52),
    'Amorada': (30.025, 31.595), 'City Gate': (30.015, 31.545), 'Trio Gardens': (30.065, 31.625),
    'The Address East': (30.045, 31.565), 'Village Gate': (30.022, 31.505), 'Promenade Wadi Degla': (30.038, 31.525),
    'The Icon Residence': (30.042, 31.535), 'Beit Al Watan': (30.045, 31.615), 'First District': (30.015, 31.435),
    'Second District': (30.022, 31.442), 'Fifth District': (30.028, 31.455), 'El Defaa El Watany': (30.035, 31.465),
}
# Areas (districts) the platform targets
TARGET_AREAS = ['New Cairo', 'Fifth Settlement', 'El Shorouk', 'Madinaty']

def normalize_compound(raw):
    """Return canonical compound or None if unresolvable. NEVER invents a location."""
    if raw is None: return None, False
    c = str(raw).strip().lower()
    if not c or c in ('other', 'other compound', 'غير مذكور', 'المتوسط العام للبيانات', 'unresolved', 'n/a', '-'):
        return None, True
    if c in ('new-cairo', 'new cairo', 'القاهرة الجديدة') or 'new cairo' in c: return 'New Cairo', False
    if 'madinaty' in c or 'مدينتي' in c: return 'Madinaty', False
    if 'mevida' in c or 'mivida' in c or 'ميفيدا' in c: return 'Mivida', False
    if 'fifth square' in c or 'المراسم' in c or ('fifth' in c and 'square' in c): return 'Fifth Square', False
    if 'sodic east' in c and 'town' not in c: return 'SODIC East', False
    if 'eastown' in c or 'east town' in c or 'sodic' in c or 'سوديك' in c: return 'Eastown', False
    if 'villette' in c or 'فيليت' in c: return 'Villette', False
    if 'cfc' == c or 'cairo festival' in c or 'كايرو فيستيفال' in c: return 'Cairo Festival City', False
    if 'uptown' in c or 'up town' in c or 'أب تاون' in c: return 'Uptown Cairo', False
    if 'gardenia' in c or 'gardina' in c or 'جاردينيا' in c: return 'Gardenia City', False
    if 'lake view' in c or 'lakeview' in c or 'ليك فيو' in c: return 'Lake View Residence', False
    if 'waterway' in c or 'واتر واي' in c: return 'The Waterway', False
    if 'hyde park' in c or 'haid bark' in c or 'hayd park' in c or 'هايد بارك' in c: return 'Hyde Park', False
    if 'oriana' in c or 'أوريانا' in c: return 'Oriana', False
    if 'galleria' in c or 'جاليريا' in c: return 'Galleria Moon Valley', False
    if 'narges' in c or 'النرجس' in c: return 'Al Narges', False
    if 'banafseg' in c or 'banafsaj' in c or 'البنفسج' in c or 'banfcg' in c: return 'Al Banafsaj', False
    if 'andalus' in c or 'andlos' in c or 'الأندلس' in c: return 'Al Andalus', False
    if 'south academ' in c or 'جنوب الاكاديمية' in c: return 'South Academy', False
    if 'north 90' in c or 'التسعين الشمالي' in c: return 'North 90th', False
    if 'rehab' in c or 'الرحاب' in c: return 'Al Rehab', False
    if 'palm' in c and 'hills' in c: return 'Palm Hills New Cairo', False
    if 'shorouk' in c or 'الشروق' in c: return 'El Shorouk City', False
    if 'zayed' in c or 'zaid' in c or 'زايد' in c: return 'Sheikh Zayed', False
    if 'mountain view' in c or 'ماونتن فيو' in c: return 'Mountain View iCity', False
    if 'katameya heights' in c or 'قطامية هايتس' in c: return 'Katameya Heights', False
    if 'katameya dunes' in c or 'قطامية ديونز' in c: return 'Katameya Dunes', False
    if 'katameya' in c or 'قطامية' in c: return 'Katameya Heights', False
    if 'swan lake' in c or 'سوان ليك' in c: return 'Swan Lake Residence', False
    if 'stone residence' in c or 'ستون ريزيدنس' in c: return 'Stone Residence', False
    if 'the square' in c or 'ذا سكوير' in c: return 'The Square', False
    if 'patio oro' in c or 'باتيو أورو' in c: return 'El Patio Oro', False
    if 'patio 7' in c or 'باتيو 7' in c: return 'El Patio 7', False
    if 'patio' in c or 'باتيو' in c: return 'El Patio Oro', False
    if '90 avenue' in c or '90 أفينيو' in c: return '90 Avenue', False
    if 'district 5' in c or 'ديستريكت 5' in c: return 'District 5', False
    if 'the brooks' in c or 'ذا بروكس' in c: return 'The Brooks', False
    if 'stei8ht' in c or 'ستييت' in c: return 'STEI8HT', False
    if 'the crest' in c or 'ذا كريست' in c: return 'The Crest', False
    if 'sarai' in c or 'ساراي' in c: return 'Sarai', False
    if 'bloomfields' in c or 'بلومفيلدز' in c: return 'Bloomfields', False
    if 'taj city' in c or 'تاج سيتي' in c: return 'Taj City', False
    if 'taj sultan' in c or 'تاج سلطان' in c: return 'Taj Sultan', False
    if 'jayd' in c or 'جايد' in c: return 'Jayd', False
    if 'zed east' in c or 'زد إيست' in c: return 'Zed East', False
    if 'october' in c or 'أكتوبر' in c: return '6th of October', False
    if '5th settlement' in c or 'fifth settlement' in c or 'التجمع الخامس' in c: return '5th Settlement', False
    if 'new capital' in c or 'new-capital' in c: return 'New Capital', False
    if 'north coast' in c or 'الساحل الشمالي' in c: return 'North Coast', False
    if 'mostakbal' in c or 'المستقبل' in c: return 'Mostakbal City', False
    # case-insensitive exact / contains match against known names
    for name in COMPOUND_COORDS:
        if c == name.lower(): return name, False
    for name in COMPOUND_COORDS:
        if name.lower() in c: return name, False
    # capitalization-insensitive match on raw (e.g. 'Mivida (Blue Views)')
    for name in COMPOUND_COORDS:
        if c.startswith(name.lower()): return name, False
    return None, True  # unresolved — DO NOT default to New Cairo

# ---------------------------------------------------------------- normalizers
PTYPE_MAP = {
    'apartment': 'Apartment', 'apartment with garden': 'Apartment', 'شقة سكنية': 'Apartment', 'شقة': 'Apartment',
    'flat': 'Apartment',
    'standalone villa': 'Standalone Villa', 'villa': 'Standalone Villa', 'villas': 'Standalone Villa',
    'vils': 'Standalone Villa', 'فيلا': 'Standalone Villa', 'stand alone villa': 'Standalone Villa',
    'townhouse': 'Townhouse', 'town house': 'Townhouse', 'town houes': 'Townhouse', 'تاون هاوس': 'Townhouse',
    'twin house': 'Twin House', 'twinhouse': 'Twin House', 'توين هاوس': 'Twin House',
    'duplex': 'Duplex', 'دوبلكس': 'Duplex',
    'penthouse': 'Penthouse', 'بنتهاوس': 'Penthouse',
    'studio': 'Studio', 'استوديو': 'Studio',
    'chalet': 'Chalet', 'شاليه': 'Chalet',
    'commercial / office': 'Commercial / Office', 'commercial': 'Commercial / Office',
    'office': 'Commercial / Office', 'admin': 'Commercial / Office', 'clinic': 'Commercial / Office',
    'retail': 'Retail / Shop', 'shop': 'Retail / Shop', 'store': 'Retail / Shop',
    'ground': 'Ground / Garden Unit', 'وحدة بجاردن (ground unit with garden)': 'Ground / Garden Unit',
    'ground apartment': 'Ground / Garden Unit', 'ground with garden': 'Ground / Garden Unit',
    'floor with garden': 'Ground / Garden Unit', 'roof': 'Roof / Penthouse',
    'land': 'Land / Plot', 'plot': 'Land / Plot', 'building': 'Building',
}
# values that are NOT property types (they are finishing/availability/deal words)
PTYPE_NOT_TYPES = {
    'rent', 'sale', 'resale', 'furnished', 'semi furnished', 'half furnished', 'not furnished',
    'fully finished', 'semi finished', 'core & shell', 'standard', 'unknown', 'unfurnished',
    'تشطيبات شركه', 'مفروش', 'اتباعت', 'تم الايجار', 'لا يوجد وحدات', 'n/a', 'none', 'other',
}
FURNISH_MAP = {
    'furnished': 'furnished', 'fully furnished': 'furnished', 'مفروش': 'furnished', 'مفروشة': 'furnished',
    'semi furnished': 'semi_furnished', 'half furnished': 'semi_furnished', 'نصف مفروش': 'semi_furnished',
    'not furnished': 'unfurnished', 'unfurnished': 'unfurnished', 'غير مفروش': 'unfurnished',
    'fully finished': 'fully_finished', 'تشطيبات شركه': 'fully_finished', 'تشطيب شركة': 'fully_finished',
    'تشطيبات شركة': 'fully_finished', 'finished': 'fully_finished', 'كامل التشطيب': 'fully_finished',
    'semi finished': 'semi_finished', 'نصف تشطيب': 'semi_finished', 'semi-finished': 'semi_finished',
    'core & shell': 'core_shell', 'core and shell': 'core_shell', 'على الطوب والأحمر': 'core_shell',
    'standard': 'semi_finished', 'unknown': 'unknown', '': 'unknown',
}
SOLD_MARKERS = ('sold', 'اتباعت', 'تم البيع', 'تم الايجار', 'rented', 'not available', 'not-available', 'archived', 'متاح')
AVAIL_MAP = {
    'available': 'available', 'available for rent': 'available', 'available for sale': 'available',
    'active': 'available', 'team verified': 'available', 'pending': 'pending',
    'no answer': 'no_answer', 'follow up': 'follow_up', 'excluded from rental map': 'excluded',
}

def normalize_ptype(raw, notes=''):
    if raw is None: return 'Unknown'
    s = str(raw).strip().lower()
    if not s: return 'Unknown'
    if s in PTYPE_NOT_TYPES:
        return 'Unknown'
    if s in PTYPE_MAP: return PTYPE_MAP[s]
    for k, v in PTYPE_MAP.items():
        if k in s: return v
    return 'Unknown'

def normalize_furnishing(raw):
    if raw is None: return 'unknown'
    s = str(raw).strip().lower()
    if not s: return 'unknown'
    if s in FURNISH_MAP: return FURNISH_MAP[s]
    for k, v in FURNISH_MAP.items():
        if k in s: return v
    return 'unknown'

def normalize_deal(raw, segment=''):
    s = str(raw or '').strip().lower()
    if 'rent' in s: return 'rent', 'rent'
    if 'resale' in s: return 'sale', 'resale'
    if 'sale' in s or 'primary' in s: return 'sale', 'primary'
    return 'unknown', 'unknown'

def parse_price(raw):
    if raw is None: return None, 'missing'
    if isinstance(raw, (int, float)):
        p = float(raw)
        return (int(p) if p == int(p) else p, 'ok' if p > 0 else 'zero')
    s = str(raw).strip()
    if not s or s.lower() in ('price on call', 'upon request', 'n/a', '-', 'unknown', 'call'):
        return None, 'on_call'
    s2 = re.sub(r'[^\d.]', '', s.replace(',', ''))
    if not s2: return None, 'on_call'
    try:
        return float(s2), 'ok'
    except ValueError:
        return None, 'unparseable'

def normalize_price_for_conventions(price, deal, public_code):
    """Apply ONLY unambiguous storage-convention fixes, recorded for traceability.
    - sale price < 100 -> stored in millions (e.g. 7.6 = 7.6M EGP)
    - USD evidence: identifier contains 'USD' or '$' -> currency=USD
    Returns (price, currency, fix_applied, usd_flag)."""
    if price is None: return None, 'EGP', None, False
    code = str(public_code or '').upper()
    usd = 'USD' in code or '$' in code
    if deal == 'sale' and 0 < price < 100:
        return price * 1_000_000, 'EGP', 'sale_millions_notation_x1e6', False
    if usd:
        return price, 'USD', 'usd_evidence_in_code', True
    if deal == 'rent' and 100 <= price < 3000:
        return price, 'EGP', None, True  # suspected USD, unconfirmed
    if deal == 'rent' and 0 < price < 100:
        return price, 'EGP', None, True  # suspected USD/thousands, unconfirmed
    return price, 'EGP', None, False

def price_valid_for_deal(price, deal):
    """Rent: 3,000-500,000 EGP/mo. Sale/Resale: 500,000-500,000,000 EGP."""
    if price is None: return 'missing'
    if deal == 'rent':
        if 3000 <= price <= 500000: return 'valid'
        return 'invalid_for_deal_type'  # e.g. 8.5M on a rent row = sale price / typo
    if deal in ('sale',):
        if 500000 <= price <= 500000000: return 'valid'
        if 0 < price < 500000: return 'suspicious_low'
        return 'invalid_for_deal_type'
    return 'unvalidated'

def normalize_phone(raw):
    if raw is None: return None, 'missing'
    if isinstance(raw, (int, float)):
        s = str(int(raw))
    else:
        s = str(raw).strip()
    digits = re.sub(r'\D', '', s)
    if not digits: return None, 'missing'
    if digits.startswith('0020'): digits = '20' + digits[4:]
    if digits.startswith('002'): digits = '2' + digits[3:]
    if len(digits) == 12 and digits.startswith('20') and digits[2] == '1':
        return '+' + digits, 'valid'
    if len(digits) == 11 and digits.startswith('01'):
        return '+20' + digits[1:], 'valid'
    if len(digits) == 10 and digits.startswith('1'):
        return '+20' + digits, 'valid'
    if len(digits) == 10 and digits.startswith('0'):
        return None, 'invalid'  # landline or broken
    return None, 'invalid'

def build_wa(phone):
    return f'https://wa.me/{phone[1:]}' if phone else None

def normalize_availability(raw):
    if raw is None: return 'unknown'
    s = str(raw).strip().lower()
    if not s or s in ('hyde park',): return 'unknown'
    for k, v in AVAIL_MAP.items():
        if s == k: return v
    if 'sold' in s or 'اتباعت' in s or 'تم البيع' in s or 'rented' in s or 'تم الايجار' in s: return 'not_available'
    if 'not available' in s: return 'not_available'
    if 'available' in s or 'active' in s: return 'available'
    if 'no answer' in s: return 'no_answer'
    if 'follow' in s: return 'follow_up'
    if 'pending' in s: return 'pending'
    if 'archived' in s or 'excluded' in s: return 'archived'
    return 'unknown'

def parse_any_date(val):
    """Parse datetime cells or strings like '20-7-2026'."""
    if val is None: return None
    if isinstance(val, datetime): return val.date()
    if isinstance(val, date): return val
    s = str(val).strip()
    m = re.search(r'(\d{1,2})-(\d{1,2})-(\d{4})', s)
    if m:
        try: return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError: return None
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        try: return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError: return None
    return None

def freshness_bucket(d):
    if d is None: return 'Unknown'
    age = (TODAY - d).days
    if age < 0: age = 0
    if age <= 7: return 'Fresh'
    if age <= 30: return 'Aging'
    if age <= 60: return 'Stale'
    return 'Verification Required'

WEST_CAIRO = {'Sheikh Zayed', '6th of October', 'Badya'}
SHOROUK = {'El Shorouk City', 'El Shorouk Springs', 'Dar Misr El Shorouk', 'Green Square', 'Al Burouj'}

def zone_of(compound):
    """Map compound -> (area, district). Never invents: unknown -> (None, None)."""
    if not compound: return None, None
    if compound == 'Madinaty': return 'Madinaty', 'Madinaty'
    if compound in SHOROUK: return 'El Shorouk', compound
    if compound == '5th Settlement': return 'Fifth Settlement', '5th Settlement'
    if compound in WEST_CAIRO: return '6th of October', compound
    if compound == 'North Coast': return 'North Coast', compound
    if compound == 'New Capital': return 'New Capital', compound
    if compound in COMPOUND_COORDS: return 'New Cairo', compound
    return 'Greater Cairo', compound

# ---------------------------------------------------------------- parsers
def parse_master_xlsx():
    """Parse 'All Master Listings' sheet -> list of raw dicts."""
    wb = openpyxl.load_workbook(XLSX_IN, read_only=True, data_only=True)
    ws = wb['All Master Listings']
    recs = []
    stats = Counter()
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        ident, seg, deal, compound, ptype, price, area, beds, baths, furn, cname, phone, wa, status, heritage = (list(r) + [None]*15)[:15]
        stats['seen'] += 1
        if ident is None and compound is None and price is None and phone is None:
            stats['empty_rows'] += 1
            continue
        recs.append({
            'src': 'master_xlsx', 'src_row': i + 2, 'public_code': ident, 'segment': seg,
            'deal_raw': deal, 'compound_raw': compound, 'ptype_raw': ptype, 'price_raw': price,
            'area_raw': area, 'beds_raw': beds, 'baths_raw': baths, 'furn_raw': furn,
            'cname_raw': cname, 'phone_raw': phone, 'wa_raw': wa, 'status_raw': status,
            'heritage': heritage, 'photos': '', 'last_verified_at': parse_any_date(heritage),
        })
    wb.close()
    return recs, stats

def parse_tsv(path, src_id):
    recs = []
    stats = Counter()
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            stats['seen'] += 1
            if not any((v or '').strip() for v in row.values()):
                stats['empty_rows'] += 1; continue
            photos = row.get('Photo URLs') or row.get('Photo Match Status') or ''
            recs.append({
                'src': src_id, 'src_row': reader.line_num, 'public_code': row.get('Unit Code') or row.get('UnitCode'),
                'segment': 'Direct Owner', 'deal_raw': row.get('Operation') or 'Rent',
                'compound_raw': row.get('Compound') or row.get('Compound / Community'),
                'ptype_raw': row.get('Property Type') or row.get('PropertyType'),
                'price_raw': row.get('Price (EGP)') or row.get('Monthly Rent (EGP)'),
                'area_raw': row.get('Area (sqm)'), 'beds_raw': row.get('Bedrooms'), 'baths_raw': row.get('Bathrooms'),
                'furn_raw': row.get('Furnishing') or row.get('Furnishing / Finishing'),
                'cname_raw': row.get('Contact Name') or row.get('Owner / Contact Name'),
                'phone_raw': row.get('Contact Phone') or row.get('Owner Phone'),
                'wa_raw': row.get('WhatsApp Direct') or row.get('Direct WhatsApp'),
                'status_raw': row.get('Inventory Status') or row.get('Listing Status'),
                'heritage': (row.get('Source') or row.get('Source Channel') or '') + ' (owners TSV)',
                'photos': photos if photos and 'verified' not in str(photos).lower() else '',
                'last_verified_at': parse_any_date(row.get('Updated At')),
            })
    return recs, stats

# ---------------------------------------------------------------- pipeline
def norm_int(v):
    if v is None: return None
    try:
        f = float(str(v).replace(',', ''))
        return int(f) if f == int(f) else f
    except (ValueError, TypeError):
        return None

def build_record(r, seq):
    compound, unresolved = normalize_compound(r['compound_raw'])
    deal, deal_sub = normalize_deal(r['deal_raw'], r.get('segment', ''))
    price, price_state = parse_price(r['price_raw'])
    price_val_raw = price if price_state == 'ok' else None
    price, currency, price_fix, usd_suspect = normalize_price_for_conventions(price_val_raw, deal, r['public_code'])
    if price is None: price_fix, usd_suspect = None, False
    phone, phone_state = normalize_phone(r['phone_raw'])
    ptype = normalize_ptype(r['ptype_raw'], str(r.get('heritage') or ''))
    furn = normalize_furnishing(r['furn_raw'])
    avail = normalize_availability(r['status_raw'])
    lat, lng = (COMPOUND_COORDS.get(compound) or (None, None)) if compound else (None, None)

    seg = str(r.get('segment') or '').strip()
    if 'direct owner' in seg.lower(): owner_broker = 'OWNER_DIRECT'
    elif 'broker' in seg.lower(): owner_broker = 'BROKER'
    elif 'team' in seg.lower() or 'internal' in seg.lower(): owner_broker = 'PARTNER'
    else: owner_broker = 'UNKNOWN'

    price_val = price if price_state == 'ok' else None
    pv = price_valid_for_deal(price, deal) if currency == 'EGP' else 'usd_unconfirmed'
    area_zone, district = zone_of(compound)

    # quality score ------------------------------------------------------
    comp_score = (
        (10 if price is not None else 0) + (4 if compound else 0) + (4 if ptype != 'Unknown' else 0) +
        (4 if norm_int(r['beds_raw']) else 0) + (2 if norm_int(r['baths_raw']) else 0) +
        (4 if norm_int(r['area_raw']) else 0) + (3 if furn != 'unknown' else 0) +
        (2 if r['cname_raw'] else 0) + (3 if phone_state == 'valid' else 0) +
        (2 if r['wa_raw'] else 0) + (2 if (r.get('photos') or str(r.get('heritage') or '')) else 0)
    )  # /40
    price_score = 20 if pv == 'valid' else (5 if pv == 'suspicious_low' else 0)
    loc_score = 10 if (compound and lat) else (6 if compound else 0)
    photo_score = 10 if r.get('photos') else 0
    fresh = freshness_bucket(r['last_verified_at'])
    fresh_score = {'Fresh': 10, 'Aging': 7, 'Stale': 4}.get(fresh, 1)
    src_score = {'PARTNER': 10, 'OWNER_DIRECT': 8, 'BROKER': 5, 'UNKNOWN': 3}[owner_broker]
    quality = comp_score + price_score + loc_score + photo_score + fresh_score + src_score

    # fingerprint (requires price + beds-or-area evidence, else low-evidence) ----
    p_bucket = int(round(price / 5000.0)) * 5000 if (price and deal == 'rent') else (int(round(price / 250000.0)) * 250000 if price else None)
    a_bucket = int(round((norm_int(r['area_raw']) or 0) / 10.0)) * 10 if r['area_raw'] else None
    has_evidence = price is not None and (norm_int(r['beds_raw']) is not None or norm_int(r['area_raw']) is not None)
    fp_src = '|'.join(str(x) for x in [compound, ptype, deal, norm_int(r['beds_raw']), a_bucket, p_bucket])
    fp = (hashlib.sha1(fp_src.encode('utf-8')).hexdigest()[:12].upper()) if has_evidence else 'LOWEV-' + hashlib.sha1((fp_src + str(r['src_row']) + r['src']).encode('utf-8')).hexdigest()[:10].upper()

    return {
        'unit_id': f'SB-{fp}',
        'public_code': (str(r['public_code']).strip() if r['public_code'] else None),
        'compound': compound, 'compound_raw': r['compound_raw'], 'compound_unresolved': unresolved,
        'area': area_zone, 'district': district,
        'property_type': ptype, 'deal_type': deal, 'deal_subtype': deal_sub,
        'price': price, 'currency': currency, 'price_state': price_state, 'price_validity': pv,
        'price_fix_applied': price_fix, 'usd_suspected': usd_suspect,
        'bedrooms': norm_int(r['beds_raw']), 'bathrooms': norm_int(r['baths_raw']),
        'area_sqm': norm_int(r['area_raw']),
        'furnishing': furn, 'finishing': furn if furn in ('fully_finished', 'semi_finished', 'core_shell') else '',
        'view': '', 'floor': '',
        'owner_or_broker': owner_broker,
        'contact_name': str(r['cname_raw']).strip() if r['cname_raw'] else None,
        'phone': phone, 'phone_state': phone_state,
        'whatsapp': build_wa(phone) if phone_state == 'valid' else (str(r['wa_raw']).strip() if r['wa_raw'] and str(r['wa_raw']).startswith('http') else None),
        'availability': avail, 'status_raw': r['status_raw'],
        'source': f"{r['src']}::{r.get('heritage') or ''}".strip('::'),
        'source_url': build_wa(phone) if phone_state == 'valid' else None,
        'last_verified_at': r['last_verified_at'].isoformat() if r['last_verified_at'] else None,
        'freshness': fresh,
        'photos': r.get('photos') or '', 'photo_count': len([p for p in str(r.get('photos') or '').split(',') if p.strip()]),
        'latitude': lat, 'longitude': lng,
        'quality_score': quality,
        'fingerprint': fp,
        'notes': str(r.get('heritage') or ''),
        'src': r['src'], 'src_row': r['src_row'],
        'duplicate_of': None, 'publish_status': None,
    }

SOURCE_PRIORITY = {'PARTNER': 3, 'OWNER_DIRECT': 2, 'BROKER': 1, 'UNKNOWN': 0}

def dedupe(records):
    """Exact fingerprint dupes (only where evidence: price + beds-or-area), then
    near-dupes (same compound+ptype+deal+beds, price ±5%, area ±10%)."""
    groups = defaultdict(list)
    for rec in records:
        groups[rec['fingerprint']].append(rec)
    kept, dupes = [], []
    for fp, group in groups.items():
        if not fp.startswith('LOWEV-'):  # low-evidence records never exact-merge
            group.sort(key=lambda r: (-SOURCE_PRIORITY[r['owner_or_broker']], -r['quality_score'],
                                      -sum(1 for v in (r['price'], r['bedrooms'], r['area_sqm'], r['phone']) if v)))
            winner = dict(group[0])
            merged_photos = set()
            others_meta = []
            for g in group[1:]:
                if g.get('photos'): merged_photos.update(str(g['photos']).split(','))
                others_meta.append({'unit_id': g['unit_id'], 'src': g['src'], 'row': g['src_row'],
                                    'owner_or_broker': g['owner_or_broker'], 'phone': g['phone']})
                d = dict(g); d['duplicate_of'] = winner['unit_id']; d['dupe_type'] = 'exact'
                dupes.append(d)
            if merged_photos and not winner.get('photos'):
                winner['photos'] = ','.join(sorted(p.strip() for p in merged_photos if p.strip()))
                winner['photo_count'] = len([p for p in winner['photos'].split(',') if p.strip()])
            winner['dupe_sources'] = others_meta
            winner['dupe_count'] = len(others_meta)
            kept.append(winner)
        else:
            for g in group:  # low-evidence: keep all, flagged
                w = dict(g); w['dupe_count'] = 0; w['dupe_sources'] = []
                kept.append(w)

    # near-dupes on kept set (evidence rows only)
    key = lambda r: (r['compound'], r['property_type'], r['deal_type'], r['bedrooms'])
    buckets = defaultdict(list)
    for r in kept:
        if r['price'] is not None:
            buckets[key(r)].append(r)
    near_dupe_pairs, near_dupes, near_loser_ids = [], [], set()
    for _, bucket in buckets.items():
        removed = set()
        for i, a in enumerate(bucket):
            if a['unit_id'] in removed: continue
            for j in range(i + 1, len(bucket)):
                if a['unit_id'] in removed: break  # a already lost; stop using it as anchor
                b = bucket[j]
                if b['unit_id'] in removed: continue
                if a['price'] and b['price'] and a['price'] > 0 and b['price'] > 0:
                    if abs(a['price'] - b['price']) / max(a['price'], b['price']) <= 0.05:
                        aa, ba = a['area_sqm'] or 0, b['area_sqm'] or 0
                        if (not aa and not ba) or (aa and ba and abs(aa - ba) / max(aa, ba) <= 0.10) or not aa or not ba:
                            a_wins = (SOURCE_PRIORITY[a['owner_or_broker']], a['quality_score']) >= (SOURCE_PRIORITY[b['owner_or_broker']], b['quality_score'])
                            winner, loser = (a, b) if a_wins else (b, a)
                            near_dupe_pairs.append((winner['unit_id'], loser['unit_id'], loser['src'], loser['src_row']))
                            loser['duplicate_of'] = winner['unit_id']
                            loser['dupe_type'] = 'near'
                            near_dupes.append(loser)
                            near_loser_ids.add(loser['unit_id'])
                            removed.add(loser['unit_id'])
    survivors = [r for r in kept if r['unit_id'] not in near_loser_ids]
    return survivors, dupes, near_dupes, near_dupe_pairs

def assign_publish_status(r):
    if r['duplicate_of']: return 'DUPLICATE'
    if r['availability'] in ('not_available', 'archived', 'excluded'): return 'EXPIRED'
    if (r['price'] is None and r['price_state'] in ('missing', 'on_call', 'unparseable')) or r['compound'] is None or r['property_type'] == 'Unknown' or (r['bedrooms'] is None and r['area_sqm'] is None):
        return 'INCOMPLETE'
    if r['price_validity'] in ('invalid_for_deal_type', 'zero'): return 'INCOMPLETE'
    if r['freshness'] in ('Stale', 'Verification Required', 'Unknown'):
        return 'STALE' if r['quality_score'] >= 55 else 'REVIEW_REQUIRED'
    if r['quality_score'] >= 75 and r['freshness'] in ('Fresh', 'Aging') and r['availability'] == 'available' and r['phone_state'] == 'valid':
        return 'PUBLISHABLE'
    return 'REVIEW_REQUIRED'

# ---------------------------------------------------------------- main
def main():
    print('Parsing sources...')
    xlsx_recs, xlsx_stats = parse_master_xlsx()
    tsv1_recs, tsv1_stats = parse_tsv(TSV1, 'owners_tsv1')
    tsv2_recs, tsv2_stats = parse_tsv(TSV2, 'owners_tsv2')
    print(f"  master_xlsx: {xlsx_stats['seen']} seen, {len(xlsx_recs)} records ({xlsx_stats['empty_rows']} empty)")
    print(f"  owners_tsv1: {tsv1_stats['seen']} seen, {len(tsv1_recs)} records")
    print(f"  owners_tsv2: {tsv2_stats['seen']} seen, {len(tsv2_recs)} records")

    all_recs = [build_record(r, i) for i, r in enumerate(xlsx_recs + tsv1_recs + tsv2_recs)]
    print(f"Normalized {len(all_recs)} records")

    survivors, exact_dupes, near_dupes, near_pairs = dedupe(all_recs)
    print(f"Dedupe: {len(all_recs)} -> {len(survivors)} unique ({len(exact_dupes)} exact dupes, {len(near_dupes)} near dupes)")

    for r in survivors:
        r['publish_status'] = assign_publish_status(r)
    for r in exact_dupes + near_dupes:
        r['publish_status'] = 'DUPLICATE'

    final = survivors + exact_dupes + near_dupes
    final.sort(key=lambda r: (r['publish_status'] != 'DUPLICATE', -r['quality_score'], r['compound'] or 'zzz'))

    # ---------------- summary stats
    ps = Counter(r['publish_status'] for r in final)
    fr = Counter(r['freshness'] for r in survivors)
    ob = Counter(r['owner_or_broker'] for r in survivors)
    comp_unresolved = sum(1 for r in survivors if r['compound'] is None)
    phone_valid = sum(1 for r in survivors if r['phone_state'] == 'valid')
    price_valid = sum(1 for r in survivors if r['price_validity'] == 'valid')
    pv_bad = Counter(r['price_validity'] for r in survivors)
    print('\n=== SUMMARY ===')
    print('Publish status:', dict(ps))
    print('Freshness (unique):', dict(fr))
    print('Owner/Broker:', dict(ob))
    print(f'Compound unresolved: {comp_unresolved} | phones valid: {phone_valid} | price valid: {price_valid}')
    print('Price validity:', dict(pv_bad))

    # ---------------- emit CSV
    cols = ['unit_id','public_code','compound','area','district','property_type','deal_type','deal_subtype',
            'price','currency','price_validity','price_fix_applied','usd_suspected','bedrooms','bathrooms','area_sqm',
            'furnishing','finishing','view','floor','owner_or_broker','contact_name','phone','phone_state',
            'whatsapp','availability','last_verified_at','freshness','photos','photo_count','latitude','longitude',
            'quality_score','publish_status','source','source_url','fingerprint','duplicate_of','notes']
    out_csv = f'{ROOT}/data/MASTER_INVENTORY_V1.csv'
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore')
        w.writeheader()
        for r in final: w.writerow(r)
    print(f"\nWrote {out_csv} ({len(final)} rows)")

    # stash data for report generation
    with open('/home/z/my-project/scripts/_phase1_data.json', 'w', encoding='utf-8') as f:
        json.dump({'final': final, 'survivor_count': len(survivors), 'near_pairs': near_pairs[:500],
                   'seen': {'xlsx': xlsx_stats['seen'], 'tsv1': tsv1_stats['seen'], 'tsv2': tsv2_stats['seen']},
                   'empty': {'xlsx': xlsx_stats['empty_rows']}}, f, ensure_ascii=False, default=str)
    print('Stashed _phase1_data.json for report generation')

if __name__ == '__main__':
    main()
