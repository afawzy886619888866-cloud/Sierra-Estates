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

owner_rents = []

# 1. 20-7-2026.xlsx Owners-Rent
wb_207 = openpyxl.load_workbook(r'C:\Users\Sierr\Downloads\20-7\20-7-2026.xlsx', data_only=True)
ws = wb_207['Owners-Rent']
rows = list(ws.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = norm_phone(d.get('Mobile') or d.get('Mobile '))
    pr = safe_num(d.get('Unit Price'))
    owner_rents.append({'src': '20-7-2026', 'phone': p, 'price': pr, 'compound': d.get('Location ') or d.get('Location'), 'type': d.get('Property Tybe') or d.get('Type'), 'area': safe_num(d.get('Area')), 'beds': safe_num(d.get('bedrooms')), 'baths': safe_num(d.get('bathrooms')), 'avail': d.get('Availablty') or 'Available', 'name': d.get('Name') or d.get('Owner'), 'garden': d.get('Garden'), 'code': d.get('Code')})

# 2. Master Rent Direct Owners Rent (298)
wb_rm = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\data\Sierra_Estates_Rent_Master_Inventory.xlsx', data_only=True)
ws_dor = wb_rm['Direct Owners Rent (298)']
rows = list(ws_dor.iter_rows(values_only=True))
hdrs = [str(h).strip() if h else f'col_{i}' for i, h in enumerate(rows[0])]
for r in rows[1:]:
    d = {hdrs[i]: r[i] for i in range(min(len(hdrs), len(r)))}
    p = norm_phone(d.get('Owner Phone'))
    pr = safe_num(d.get('Monthly Rent (EGP)'))
    owner_rents.append({'src': 'Master_Rent_DOR', 'phone': p, 'price': pr, 'compound': d.get('Compound / Community') or d.get('Compound'), 'type': d.get('Property Type'), 'area': safe_num(d.get('Area (sqm)')), 'beds': safe_num(d.get('Bedrooms')), 'baths': safe_num(d.get('Bathrooms')), 'avail': 'Available', 'name': d.get('Owner / Contact Name'), 'garden': '', 'code': d.get('Unit Code')})

print(f'Total raw owner rent collected: {len(owner_rents)}')

# Deduplicate strictly by (phone, price)
deduped_rent = {}
for item in owner_rents:
    p = item['phone']
    pr = item['price']
    if p and pr:
        key = (p, pr)
    elif p:
        key = (p, item.get('compound') or '')
    else:
        key = (item.get('code') or '', item.get('compound') or '', pr or 0)
    
    if key not in deduped_rent:
        deduped_rent[key] = item
    else:
        ex = deduped_rent[key]
        for f in ('compound', 'type', 'area', 'beds', 'baths', 'name', 'avail', 'garden', 'code'):
            if item[f] and not ex[f]: ex[f] = item[f]
        ex['src'] = f"{ex['src']}+{item['src']}"

print(f'Total UNIQUE Direct Owners Rent after deduplication by (phone, price): {len(deduped_rent)}')
