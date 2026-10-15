import openpyxl, urllib.request, csv, io, sys, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 1. Fetch Online Sheet
sheet_id = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk'
gid = '1127958606'
url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
content = urllib.request.urlopen(req).read().decode('utf-8')
online_rows = list(csv.reader(io.StringIO(content)))
online_headers = online_rows[0]
print('=== ONLINE GOOGLE SHEET (GID: 1127958606) ===')
print(f'Online Total Rows: {len(online_rows) - 1}')
print(f'Online Headers ({len(online_headers)}):', online_headers)

mob_idx = online_headers.index('Mobile')
code_idx = online_headers.index('Code')
date_idx = online_headers.index('تاريخ اخر تواصل')

online_phones = {}
online_last7 = {}
for idx, r in enumerate(online_rows[1:], start=2):
    mob = r[mob_idx].strip() if len(r) > mob_idx else ''
    digits = re.sub(r'\D', '', mob)
    code = r[code_idx].strip() if len(r) > code_idx else ''
    dt = r[date_idx].strip() if len(r) > date_idx else ''
    if digits:
        online_phones[digits] = {'row_idx': idx, 'raw': mob, 'code': code, 'contact_date': dt}
        if len(digits) >= 7:
            online_last7[digits[-7:]] = {'row_idx': idx, 'raw': mob, 'code': code, 'contact_date': dt}

print(f'Unique phones in Online Sheet: {len(online_phones)}')
contacted_online = [p for p in online_phones.values() if p['contact_date']]
print(f'Rows in Online Sheet with Contact Date written: {len(contacted_online)}')

# 2. Inspect Local Master Sheet
wb = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\data\Sierra_Estates_Unified_Master_Inventory.xlsx', read_only=True)
ws = wb['Direct_Owners']
local_rows = list(ws.iter_rows(values_only=True))
local_headers = local_rows[0]
print('\n=== LOCAL MASTER SHEET (Direct_Owners Tab) ===')
print(f'Local Direct Owners Count: {len(local_rows) - 1}')
print(f'Local Headers ({len(local_headers)}):', local_headers)

local_mob_idx = local_headers.index('Mobile')
local_last7_idx = local_headers.index('Mobile_Last7')

already_in_online = 0
new_to_online = 0
new_owners_list = []

for r in local_rows[1:]:
    mob = str(r[local_mob_idx] or '').strip()
    digits = re.sub(r'\D', '', mob)
    l7 = str(r[local_last7_idx] or '').strip()
    
    match = False
    if digits in online_phones or (l7 and l7 in online_last7):
        match = True
        already_in_online += 1
    else:
        new_to_online += 1
        new_owners_list.append(r)

print(f'\n=== OVERLAP AUDIT ===')
print(f'Owners ALREADY in Online Sheet: {already_in_online}')
print(f'NEW Verified Owners to MERGE/ADD to Online Sheet: {new_to_online}')
print(f'Total after merge: {len(online_rows) - 1 + new_to_online}')
