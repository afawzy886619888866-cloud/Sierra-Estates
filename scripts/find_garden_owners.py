import sys
import re
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

def normalize_egypt_phone(raw):
    if not raw or pd.isna(raw):
        return None
    s = str(raw).strip()
    if s.endswith('.0'):
        s = s[:-2]
    digits = re.sub(r'\D', '', s)
    if not digits:
        return None
    # Fix double country code 20201...
    while digits.startswith('20201'):
        digits = digits[2:]
    # 00201... -> 201...
    if digits.startswith('00201'):
        digits = digits[2:]
    # 01... (11 digits) -> 201... (12 digits)
    if digits.startswith('01') and len(digits) == 11 and digits[1] in ['0', '1', '2', '5']:
        digits = '20' + digits[1:]
    # 1... (10 digits) -> 201... (12 digits)
    elif digits.startswith('1') and len(digits) == 10 and digits[1] in ['0', '1', '2', '5']:
        digits = '20' + digits
    
    # Must be exactly 12 digits: 201 + (0/1/2/5) + 8 digits
    if len(digits) == 12 and digits.startswith('201') and digits[3] in ['0', '1', '2', '5']:
        # Exclude mock/test sequences
        if digits in ['201234567890', '201000000000', '201111111111']:
            return None
        return digits
    return None

def extract_phones_from_text(text):
    if not text or pd.isna(text):
        return []
    s = str(text)
    matches = re.findall(r'(?:\+?20|0)?(1[0125]\d{8})', s)
    res = []
    for m in matches:
        p = '20' + m
        if p not in ['201234567890', '201000000000', '201111111111']:
            res.append(p)
    return res

garden_patterns = [
    r'garden',
    r'حديق[ةه]',
    r'بحديق[ةه]',
    r'جاردن',
    r'بجاردن',
    r'ارضي\s*بجاردن',
    r'أرضي\s*بجاردن',
    r'ارضي\s*بحديق[ةه]',
    r'أرضي\s*بحديق[ةه]',
    r'private\s*garden'
]

garden_regex = re.compile('|'.join(garden_patterns), re.IGNORECASE)

records = {}

# 1. Inventory_with_Photos.xlsx
if os.path.exists('Inventory_with_Photos.xlsx'):
    wb = pd.ExcelFile('Inventory_with_Photos.xlsx')
    for sheet in ['Owners Rent', 'Owners Buy']:
        if sheet not in wb.sheet_names:
            continue
        df = wb.parse(sheet)
        for idx, row in df.iterrows():
            text_fields = [str(row.get(col, '')) for col in ['Description', 'Location', 'Compound', 'PropertyType', 'Contact Name']]
            full_text = ' '.join(text_fields)
            if any(b in full_text.lower() for b in ['broker', 'سمسار', 'وسيط', 'شركة تسويق']):
                continue
            if garden_regex.search(full_text):
                # Look for phone in Contact Phone, WhatsApp Direct, or Description
                candidate_phones = []
                p1 = normalize_egypt_phone(row.get('Contact Phone'))
                if p1:
                    candidate_phones.append(p1)
                p2 = normalize_egypt_phone(row.get('WhatsApp Direct'))
                if p2:
                    candidate_phones.append(p2)
                candidate_phones.extend(extract_phones_from_text(row.get('Description')))

                unit_code = str(row.get('UnitCode') or row.get('Unit Code') or f'ROW-{idx}').strip()
                name = str(row.get('Contact Name') or 'Owner').strip()
                compound = str(row.get('Compound') or 'New Cairo').strip()
                deal_type = 'Rent' if 'rent' in sheet.lower() else 'Sale'
                price = str(row.get('Price Formatted') or row.get('Price (EGP)') or '').strip()

                for phone in set(candidate_phones):
                    if phone not in records:
                        records[phone] = {
                            'phone': phone,
                            'name': name,
                            'unit_code': unit_code,
                            'compound': compound,
                            'deal_type': deal_type,
                            'price': price,
                            'source': f'Inventory_with_Photos.xlsx [{sheet}]',
                            'description_sample': full_text[:100]
                        }

# 2. Sierra_Estates_Owners_Rent_Master.xlsx
if os.path.exists('Sierra_Estates_Owners_Rent_Master.xlsx'):
    wb = pd.ExcelFile('Sierra_Estates_Owners_Rent_Master.xlsx')
    for sheet in wb.sheet_names:
        df = wb.parse(sheet)
        for idx, row in df.iterrows():
            full_text = ' '.join([str(v) for v in row.values if pd.notna(v)])
            if garden_regex.search(full_text):
                candidate_phones = []
                p1 = normalize_egypt_phone(row.get('Owner Phone'))
                if p1: candidate_phones.append(p1)
                p2 = normalize_egypt_phone(row.get('Direct WhatsApp'))
                if p2: candidate_phones.append(p2)
                candidate_phones.extend(extract_phones_from_text(row.get('Listing Notes')))
                for phone in set(candidate_phones):
                    if phone not in records:
                        records[phone] = {
                            'phone': phone,
                            'name': str(row.get('Owner / Contact Name') or 'Owner').strip(),
                            'unit_code': str(row.get('Unit Code') or f'RENT-{idx}').strip(),
                            'compound': str(row.get('Compound / Community') or 'New Cairo').strip(),
                            'deal_type': 'Rent',
                            'price': str(row.get('Rent Display') or row.get('Monthly Rent (EGP)') or '').strip(),
                            'source': f'Sierra_Estates_Owners_Rent_Master.xlsx [{sheet}]',
                            'description_sample': full_text[:100]
                        }

# 3. master_inventory_clean_no_duplicates.csv
if os.path.exists('data/master_inventory_clean_no_duplicates.csv'):
    try:
        df = pd.read_csv('data/master_inventory_clean_no_duplicates.csv', low_memory=False)
        for idx, row in df.iterrows():
            full_text = ' '.join([str(v) for v in row.values if pd.notna(v)])
            # Filter brokers
            if any(b in full_text.lower() for b in ['broker', 'سمسار', 'وسيط', 'شركة تسويق']):
                continue
            if garden_regex.search(full_text):
                candidate_phones = []
                for col in ['phone', 'mobile', 'whatsapp', 'contact']:
                    if col in df.columns:
                        p = normalize_egypt_phone(row.get(col))
                        if p: candidate_phones.append(p)
                candidate_phones.extend(extract_phones_from_text(full_text))
                for phone in set(candidate_phones):
                    if phone not in records:
                        records[phone] = {
                            'phone': phone,
                            'name': str(row.get('name') or row.get('owner') or 'Owner').strip(),
                            'unit_code': str(row.get('code') or row.get('unit_code') or f'MST-{idx}').strip(),
                            'compound': str(row.get('compound') or 'New Cairo').strip(),
                            'deal_type': 'Rent' if 'rent' in full_text.lower() else 'Sale',
                            'price': str(row.get('price') or '').strip(),
                            'source': 'data/master_inventory_clean_no_duplicates.csv',
                            'description_sample': full_text[:100]
                        }
    except Exception as e:
        print('Error reading master csv:', e)

print(f"Total Unique Owners with Garden Units: {len(records)}")
df_results = pd.DataFrame(list(records.values()))
print(df_results[['phone', 'name', 'unit_code', 'compound', 'deal_type', 'source']].head(20))
df_results.to_csv('owners_with_garden_broadcast_targets.csv', index=False, encoding='utf-8-sig')
print("Saved to owners_with_garden_broadcast_targets.csv")
