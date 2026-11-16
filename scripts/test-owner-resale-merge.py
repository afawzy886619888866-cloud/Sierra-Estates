import sys, io, re, openpyxl
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

# Collect Owner Resale from all sources:
owner_resales = []

# 1. 20-7-2026.xlsx Owners-Resale
wb_207 = openpyxl.load_workbook(r'C:\Users\Sierr\Downloads\20-7\20-7-2026.xlsx', data_only=True)
s_ors = 'Owners-Resale ' if 'Owners-Resale ' in wb_207.sheetnames else 'Owners-Resale'
ws = wb_207[s_ors]
rows = list(ws.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = norm_phone(d.get('تليفون') or d.get('Mobile'))
    pr = safe_num(d.get('السعر') or d.get('Price'))
    owner_resales.append({'src': '20-7-2026', 'phone': p, 'price': pr, 'compound': d.get('الكمبوند'), 'type': d.get('نوع الوحده'), 'area': safe_num(d.get('المساحه')), 'beds': safe_num(d.get('الغرف')), 'baths': safe_num(d.get('الحمامات')), 'finishing': d.get('التشطيب'), 'avail': d.get('متاحه /غير متاحه'), 'name': d.get('Name'), 'raw_phone': d.get('تليفون')})

print(f'From 20-7-2026 Owners-Resale: {len(owner_resales)} rows')

# 2. apps/sierra-estates-realty/data/sierra-estates-master-inventory.xlsx Owners_Sale_Resale
wb_app_mst = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\data\sierra-estates-master-inventory.xlsx', data_only=True)
ws_osr = wb_app_mst['Owners_Sale_Resale']
rows = list(ws_osr.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt2 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = norm_phone(d.get('Contact Info / Owner Name'))
    pr = safe_num(d.get('Price (EGP)'))
    owner_resales.append({'src': 'apps_master_osr', 'phone': p, 'price': pr, 'compound': d.get('Compound'), 'type': d.get('Property Type'), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': d.get('Finishing Quality'), 'avail': 'Available', 'name': d.get('Origin Channel / Group'), 'raw_phone': d.get('Contact Info / Owner Name')})
    cnt2 += 1
print(f'From apps Owners_Sale_Resale: {cnt2} rows')

# 3. apps/sierra-estates-realty/data/sierra-estates-inventory.xlsx sheet Sales
wb_30m = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\apps\sierra-estates-realty\data\sierra-estates-inventory.xlsx', read_only=True)
ws_sales = wb_30m['Sales']
rows = list(ws_sales.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
cnt3 = 0
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    src_ch = str(d.get('Source Channel') or '').lower()
    p = norm_phone(d.get('Owner Phone'))
    pr = safe_num(d.get('Price (EGP)'))
    owner_resales.append({'src': f'30m_sales_{src_ch}', 'phone': p, 'price': pr, 'compound': d.get('Compound'), 'type': d.get('Property Type'), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'finishing': d.get('Furnishing'), 'avail': d.get('Status') or 'Available', 'name': d.get('Owner / Contact Name'), 'raw_phone': d.get('Owner Phone')})
    cnt3 += 1
print(f'From 30MB inventory Sales sheet: {cnt3} rows')

print(f'\nTotal raw owner resale candidate rows collected: {len(owner_resales)}')

# Deduplicate strictly by (phone, price)
deduped = {}
no_key_count = 0
for item in owner_resales:
    p = item['phone']
    pr = item['price']
    if p and pr:
        key = (p, pr)
        if key not in deduped:
            deduped[key] = item
        else:
            ex = deduped[key]
            for f in ('compound', 'type', 'area', 'beds', 'baths', 'finishing', 'name', 'avail'):
                if item[f] and not ex[f]: ex[f] = item[f]
            ex['src'] = f"{ex['src']}+{item['src']}"
    else:
        key = (p or 'nophone', pr or 0, item.get('compound') or '', item.get('area') or 0, item.get('beds') or 0)
        if key not in deduped:
            deduped[key] = item
        no_key_count += 1

print(f'Total UNIQUE Owner Resale after deduplication by (phone, price): {len(deduped)}')
