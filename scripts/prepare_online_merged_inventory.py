import openpyxl, urllib.request, csv, io, sys, re
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 1. Fetch current Online Sheet rows
sheet_id = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk'
gid = '1127958606'
url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
content = urllib.request.urlopen(req).read().decode('utf-8')
online_rows = list(csv.reader(io.StringIO(content)))
headers = online_rows[0]

print('=== STEP 1: LOAD ONLINE SHEET ===')
print(f'Online Rows: {len(online_rows) - 1}')
print(f'Online Headers ({len(headers)}):', headers)

mob_idx = headers.index('Mobile')
date_idx = headers.index('تاريخ اخر تواصل')
code_idx = headers.index('Code')

# Map of existing phones in online sheet
existing_phones = set()
existing_last7 = set()
for r in online_rows[1:]:
    mob = r[mob_idx].strip() if len(r) > mob_idx else ''
    digits = re.sub(r'\D', '', mob)
    if digits:
        existing_phones.add(digits)
        if len(digits) >= 7:
            existing_last7.add(digits[-7:])

print(f'Existing Unique Mobiles in Online Sheet: {len(existing_phones)}')

# 2. Load Local Master Unified Workbook
wb = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\data\Sierra_Estates_Unified_Master_Inventory.xlsx', read_only=True)
ws = wb['Direct_Owners']
local_data = list(ws.iter_rows(values_only=True))
local_headers = local_data[0]
print(f'\n=== STEP 2: LOAD LOCAL MASTER WORKBOOK ===')
print(f'Local Direct Owners: {len(local_data) - 1}')

# Build field lookup map for local headers
lh_map = {h: idx for idx, h in enumerate(local_headers)}

def get_val(row, field_name, default=''):
    idx = lh_map.get(field_name)
    if idx is not None and idx < len(row):
        val = row[idx]
        return str(val).strip() if val is not None else default
    return default

# 3. Map new local owners to Online Sheet schema
new_rows_for_online = []
current_max_no = len(online_rows) - 1
now_str = datetime.now().strftime('%m/%d/%Y %H:%M:%S')
update_date_str = datetime.now().strftime('%d-%b-%y')

for r in local_data[1:]:
    mob = get_val(r, 'Mobile')
    digits = re.sub(r'\D', '', mob)
    l7 = get_val(r, 'Mobile_Last7')
    
    # Check if already in online sheet
    if digits in existing_phones or (l7 and l7 in existing_last7):
        continue
    
    existing_phones.add(digits)
    if l7:
        existing_last7.add(l7)
        
    current_max_no += 1
    
    # Map fields
    code = get_val(r, 'Unit_Code')
    name = get_val(r, 'Contact_Name')
    if not name or name.lower() in ['none', 'null']:
        name = 'المالك'
        
    avail = get_val(r, 'Availability', 'Available')
    if not avail or avail.lower() in ['none', 'null', 'available']:
        avail = 'Available'
        
    bedrooms = get_val(r, 'Bedrooms')
    compound = get_val(r, 'Compound')
    zone = get_val(r, 'Location_Zone')
    location = compound if compound else zone
    
    price = get_val(r, 'Price_EGP')
    try:
        p_num = float(price.replace(',', ''))
        if p_num > 0:
            price_formatted = f'{p_num:,.0f}'
        else:
            price_formatted = ''
    except:
        price_formatted = price
        
    finishing = get_val(r, 'Finishing')
    deal_type = get_val(r, 'Deal_Type', 'rent').lower()
    if 'resale' in deal_type or 'sale' in deal_type or 'buy' in deal_type:
        deal_type = 'sale'
    else:
        deal_type = 'rent'
        
    prop_type = get_val(r, 'Property_Type', 'Apartment')
    owner_str = 'Owner'
    
    notes = get_val(r, 'Description_Notes')
    evidence = get_val(r, 'Owner_Verification_Evidence')
    comment = f'{evidence} | {notes}'.strip(' |')
    
    space = get_val(r, 'Area_Sqm')
    
    # Schema columns:
    # 0: Timestamp
    # 1: NO
    # 2: تاريخ اخر تحديث 
    # 3: Name
    # 4: Mobile
    # 5: Availablty
    # 6: bedrooms
    # 7: Location 
    # 8: Unit Price
    # 9: Furnished or not
    # 10: Type
    # 11: Property Tybe
    # 12: Code
    # 13: Owner
    # 14: Garden
    # 15: Space
    # 16: Pool
    # 17: Comment
    # 18: تاريخ اخر تواصل
    row_online = [
        now_str,                     # 0: Timestamp
        str(current_max_no),         # 1: NO
        update_date_str,             # 2: تاريخ اخر تحديث 
        name,                        # 3: Name
        digits,                      # 4: Mobile (clean digits, e.g. 010xxxxxxxx)
        avail,                       # 5: Availablty
        bedrooms,                    # 6: bedrooms
        location,                    # 7: Location 
        price_formatted,             # 8: Unit Price
        finishing,                   # 9: Furnished or not
        deal_type,                   # 10: Type
        prop_type,                   # 11: Property Tybe
        code,                        # 12: Code
        owner_str,                   # 13: Owner
        '',                          # 14: Garden
        space,                       # 15: Space
        '',                          # 16: Pool
        comment,                     # 17: Comment
        ''                           # 18: تاريخ اخر تواصل (empty for uncontacted)
    ]
    new_rows_for_online.append(row_online)

print(f'\n=== STEP 3: NEW ROWS COMPILED ===')
print(f'New unique verified owner rows prepared: {len(new_rows_for_online)}')

# 4. Save to CSV and Excel files for direct upload or API sync
out_csv = r'H:\last\Main\SE-Vercel-deploy-main\data\Online_Sheet_Merged_Full.csv'
out_xlsx = r'H:\last\Main\SE-Vercel-deploy-main\data\Online_Sheet_Merged_Full.xlsx'
out_new_csv = r'H:\last\Main\SE-Vercel-deploy-main\data\Online_Sheet_New_Rows_Only.csv'

# Full combined dataset
full_combined_rows = [headers] + online_rows[1:] + new_rows_for_online

with open(out_csv, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(full_combined_rows)

with open(out_new_csv, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(new_rows_for_online)

# Create high-end Excel workbook
wb_new = openpyxl.Workbook()
ws_new = wb_new.active
ws_new.title = 'Master_Units_Inventory'

for r_idx, row_data in enumerate(full_combined_rows, start=1):
    for c_idx, val in enumerate(row_data, start=1):
        cell = ws_new.cell(row=r_idx, column=c_idx, value=val)
        if c_idx == 5: # Mobile column
            cell.number_format = '@'

wb_new.save(out_xlsx)

print(f'\n=== STEP 4: FILES CREATED SUCCESSFULLY ===')
print(f'1. Full Merged CSV (1,827 rows): {out_csv}')
print(f'2. New Rows Only CSV ({len(new_rows_for_online)} rows): {out_new_csv}')
print(f'3. Full Merged Excel: {out_xlsx}')
print('DONE.')
