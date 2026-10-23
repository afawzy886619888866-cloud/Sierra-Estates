import sys, io, re, csv, openpyxl
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def norm_phone(v):
    if not v: return ''
    s = re.sub(r'[^\d]', '', str(v))
    if s.startswith('002'): s = s[3:]
    elif s.startswith('20') and len(s) > 10: s = s[2:]
    return s.lstrip('0')[-9:]

def safe_num(v):
    if v is None: return None
    s = re.sub(r'[^\d.-]', '', str(v).replace(',', ''))
    try:
        val = float(s)
        return int(val) if val.is_integer() else val
    except:
        return None

def safe_str(v):
    if v is None: return ''
    s = str(v).strip()
    return '' if s.lower() in ('none', 'null', 'undefined', 'nan') else s

owner_rents = []

# 1. 20-7-2026.xlsx Owners-Rent
wb_207 = openpyxl.load_workbook(r'C:\Users\Sierr\Downloads\20-7\20-7-2026.xlsx', data_only=True)
ws = wb_207['Owners-Rent']
rows = list(ws.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('Mobile') or d.get('Mobile '))
    owner_rents.append({'src': '20-7-2026', 'code': safe_str(d.get('Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Unit Price')), 'compound': safe_str(d.get('Location ') or d.get('Location')), 'type': safe_str(d.get('Property Tybe') or d.get('Type')), 'area': safe_num(d.get('Area')), 'beds': safe_num(d.get('bedrooms')), 'baths': safe_num(d.get('bathrooms')), 'furnishing': safe_str(d.get('Furnished or not')), 'avail': safe_str(d.get('Availablty') or 'Available'), 'name': safe_str(d.get('Name') or d.get('Owner')), 'garden': safe_str(d.get('Garden'))})
print(f'1. 20-7-2026 Owners-Rent: {len(owner_rents)} rows')

# 2. Master Rent Direct Owners Rent (298)
wb_rm = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\data\Sierra_Estates_Rent_Master_Inventory.xlsx', data_only=True)
ws_dor = wb_rm['Direct Owners Rent (298)']
rows = list(ws_dor.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt2 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('Owner Phone'))
    owner_rents.append({'src': 'Master_Rent_DOR', 'code': safe_str(d.get('Unit Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Monthly Rent (EGP)')), 'compound': safe_str(d.get('Compound / Community') or d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'furnishing': safe_str(d.get('Furnishing')), 'avail': 'Available', 'name': safe_str(d.get('Owner / Contact Name')), 'garden': ''})
    cnt2 += 1
print(f'2. Master Rent Direct Owners: {cnt2} rows')

# 3. Sierra_Estates_Rent_Master_Clean.xlsx Owners sheet
p_clean = Path(r'H:\last\Main\SE-Vercel-deploy-main\Sierra_Estates_Rent_Master_Clean.xlsx')
if p_clean.exists():
    wb_cl = openpyxl.load_workbook(p_clean, data_only=True)
    if 'Owners' in wb_cl.sheetnames:
        ws_cl = wb_cl['Owners']
        rows = list(ws_cl.iter_rows(values_only=True))
        hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
        cnt3 = 0
        for r in rows[1:]:
            d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
            p = safe_str(d.get('Contact Phone') or d.get('Owner Phone') or d.get('Phone'))
            owner_rents.append({'src': 'Rent_Master_Clean_Owners', 'code': safe_str(d.get('Reference Code') or d.get('Unit Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)') or d.get('Monthly Rent (EGP)')), 'compound': safe_str(d.get('Compound') or d.get('Location')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)') or d.get('Area')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'furnishing': safe_str(d.get('Furnishing')), 'avail': 'Available', 'name': safe_str(d.get('Contact Name') or d.get('Owner Name')), 'garden': ''})
            cnt3 += 1
        print(f'3. Rent Master Clean Owners: {cnt3} rows')

# 4. public/downloads/owners-rent.csv
p_rcsv = Path(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\downloads\owners-rent.csv')
if p_rcsv.exists():
    cnt4 = 0
    with open(p_rcsv, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for d in reader:
            p = safe_str(d.get('Owner Phone') or d.get('Phone'))
            owner_rents.append({'src': 'public_downloads_rent_csv', 'code': safe_str(d.get('Reference Code') or d.get('Unit Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)') or d.get('Monthly Rent (EGP)')), 'compound': safe_str(d.get('Compound / Project') or d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)') or d.get('Area')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'furnishing': safe_str(d.get('Furnishing')), 'avail': 'Available', 'name': safe_str(d.get('Owner / Contact Name') or d.get('Contact Name')), 'garden': ''})
            cnt4 += 1
    print(f'4. public/downloads/owners-rent.csv: {cnt4} rows')

print(f'\nTotal raw owner rent collected across all sources: {len(owner_rents)}')

# Deduplicate strictly by (phone, price)
deduped_rent = {}
for item in owner_rents:
    p = item['phone_norm']
    pr = item['price']
    if p and pr:
        key = (p, pr)
    elif p:
        key = (p, item['compound'].lower(), item['area'] or 0)
    else:
        key = (item['code'], item['compound'].lower(), pr or 0)
    
    if key not in deduped_rent:
        deduped_rent[key] = item
    else:
        ex = deduped_rent[key]
        for f in ('compound', 'type', 'area', 'beds', 'baths', 'name', 'avail', 'garden', 'code', 'furnishing'):
            if item[f] and not ex[f]: ex[f] = item[f]
        ex['src'] = f"{ex['src']} + {item['src']}"

print(f'👉 FINAL UNIQUE Direct Owners Rent after deduplication by (phone, price): {len(deduped_rent)}')
