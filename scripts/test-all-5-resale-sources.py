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

owner_resales = []

# 1. 20-7-2026.xlsx Owners-Resale
wb_207 = openpyxl.load_workbook(r'C:\Users\Sierr\Downloads\20-7\20-7-2026.xlsx', data_only=True)
s_ors = 'Owners-Resale ' if 'Owners-Resale ' in wb_207.sheetnames else 'Owners-Resale'
ws = wb_207[s_ors]
rows = list(ws.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('تليفون') or d.get('Mobile'))
    owner_resales.append({'src': '20-7-2026', 'code': safe_str(d.get('الكود')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('السعر')), 'compound': safe_str(d.get('الكمبوند')), 'type': safe_str(d.get('نوع الوحده')), 'area': safe_num(d.get('المساحه')), 'beds': safe_num(d.get('الغرف')), 'baths': safe_num(d.get('الحمامات')), 'finishing': safe_str(d.get('التشطيب')), 'avail': safe_str(d.get('متاحه /غير متاحه') or 'Available'), 'name': safe_str(d.get('Name')), 'desc': safe_str(d.get('بيان الوحده'))})
print(f'1. 20-7-2026 Owners-Resale: {len(owner_resales)} rows')

# 2. apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx Owners_Sale_Resale
wb_app_mst = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\data\sierra-estates-master-inventory.xlsx', data_only=True)
ws_osr = wb_app_mst['Owners_Sale_Resale']
rows = list(ws_osr.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt2 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('Contact Info / Owner Name'))
    owner_resales.append({'src': 'apps_master_osr', 'code': safe_str(d.get('\ufeffSierra Code') or d.get('Sierra Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)')), 'compound': safe_str(d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': safe_str(d.get('Finishing Quality')), 'avail': 'Available', 'name': safe_str(d.get('Origin Channel / Group')), 'desc': safe_str(d.get('Listing Description & Notes'))})
    cnt2 += 1
print(f'2. Apps Master Owners_Sale_Resale: {cnt2} rows')

# 3. apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx sheet Sales
wb_30m = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\data\sierra-estates-inventory.xlsx', read_only=True)
ws_sales = wb_30m['Sales']
rows = list(ws_sales.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt3 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('Owner Phone'))
    owner_resales.append({'src': '30m_sales', 'code': safe_str(d.get('Reference Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)')), 'compound': safe_str(d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': safe_str(d.get('Furnishing')), 'avail': safe_str(d.get('Status') or 'Available'), 'name': safe_str(d.get('Owner / Contact Name')), 'desc': safe_str(d.get('Notes'))})
    cnt3 += 1
print(f'3. 30MB inventory Sales sheet: {cnt3} rows')

# 4. Sierra_Estates_Resale_Master.xlsx Direct_Owners
p_resale_mst = Path(r'H:\last\Main\SE-Vercel-deploy-main\Sierra_Estates_Resale_Master.xlsx')
wb_rmst = openpyxl.load_workbook(p_resale_mst, data_only=True)
ws_do = wb_rmst['Direct_Owners']
rows = list(ws_do.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt4 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = safe_str(d.get('Contact Phone'))
    owner_resales.append({'src': 'resale_master_direct_owners', 'code': safe_str(d.get('Reference Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)')), 'compound': safe_str(d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': safe_str(d.get('Furnishing')), 'avail': safe_str(d.get('Listing Status') or 'Available'), 'name': safe_str(d.get('Contact Name')), 'desc': safe_str(d.get('Description'))})
    cnt4 += 1
print(f'4. Sierra_Estates_Resale_Master Direct_Owners: {cnt4} rows')

# 5. apps/sierra-estates-realty/public/downloads/owners-resale.csv
p_csv = Path(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\public\downloads\owners-resale.csv')
cnt5 = 0
with open(p_csv, 'r', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    for d in reader:
        p = safe_str(d.get('Owner Phone') or d.get('Phone'))
        owner_resales.append({'src': 'public_downloads_csv', 'code': safe_str(d.get('Reference Code') or d.get('Unit Code')), 'phone': p, 'phone_norm': norm_phone(p), 'price': safe_num(d.get('Price (EGP)') or d.get('Price')), 'compound': safe_str(d.get('Compound / Project') or d.get('Compound')), 'type': safe_str(d.get('Property Type')), 'area': safe_num(d.get('Area (sqm)') or d.get('Area')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': safe_str(d.get('Furnishing')), 'avail': 'Available', 'name': safe_str(d.get('Owner / Contact Name') or d.get('Contact Name')), 'desc': safe_str(d.get('Notes'))})
        cnt5 += 1
print(f'5. public/downloads/owners-resale.csv: {cnt5} rows')

print(f'\nTotal raw owner resale candidates collected across all 5 sheets: {len(owner_resales)}')

# Deduplicate strictly by (phone, price)
deduped = {}
for item in owner_resales:
    p = item['phone_norm']
    pr = item['price']
    if p and pr:
        key = (p, pr)
    elif p:
        key = (p, item['compound'].lower(), item['area'] or 0)
    else:
        key = (item['code'], item['compound'].lower(), pr or 0)
    
    if key not in deduped:
        deduped[key] = item
    else:
        ex = deduped[key]
        for f in ('compound', 'type', 'area', 'beds', 'baths', 'finishing', 'name', 'avail', 'desc', 'code'):
            if item[f] and not ex[f]: ex[f] = item[f]
        ex['src'] = f"{ex['src']} + {item['src']}"

print(f'👉 FINAL UNIQUE Owner Resale after deduplication by (phone, price): {len(deduped)}')
