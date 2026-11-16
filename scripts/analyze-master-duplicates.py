import openpyxl, sys, io
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
wb = openpyxl.load_workbook(r'H:\last\Main\SE-Vercel-deploy-main\data\Sierra_Estates_Consolidated_Master_Inventory_All_Sheets.xlsx', read_only=True)
ws = wb['All Master Listings']

rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
data = rows[1:]

print(f"Total rows in All Master Listings: {len(data)}")

seen_id = {}
duplicates = []

for idx, r in enumerate(data):
    id_code = str(r[0] or '').strip()
    segment = str(r[1] or '').strip()
    deal_type = str(r[2] or '').strip()
    compound = str(r[3] or '').strip()
    price = str(r[5] or '').strip()
    phone = str(r[11] or '').strip()

    if not id_code or id_code.lower() in ('none', 'null', ''):
        key = f"HASH_{compound}_{price}_{phone}"
    else:
        key = id_code

    if key in seen_id:
        prev = seen_id[key]
        duplicates.append({
            'key': key,
            'first_seg': prev['segment'],
            'first_cmp': prev['compound'],
            'first_deal': prev['deal'],
            'dup_seg': segment,
            'dup_cmp': compound,
            'dup_deal': deal_type,
            'price': price,
            'phone': phone
        })
    else:
        seen_id[key] = {'segment': segment, 'compound': compound, 'deal': deal_type, 'row': idx}

print(f"Unique identifier keys: {len(seen_id)}")
print(f"Total rows merged/deduplicated: {len(duplicates)}")

c = Counter(f"{d['first_seg']} ({d['first_deal']}) == {d['dup_seg']} ({d['dup_deal']})" for d in duplicates)
print("\nDUPLICATE BREAKDOWN:")
for k, v in c.most_common(10):
    print(f"  {k}: {v}")

print("\nTop 10 duplicate keys with multiple occurrences:")
key_counts = Counter(d['key'] for d in duplicates)
for k, v in key_counts.most_common(10):
    print(f"  {k}: repeated {v+1} times")

print("\nSample Duplicate Rows (First 5):")
for i, d in enumerate(duplicates[:5]):
    print(f"{i+1}. Key [{d['key']}]: {d['first_seg']} ({d['first_cmp']}) matched with {d['dup_seg']} ({d['dup_cmp']}) | Price: {d['price']}")
