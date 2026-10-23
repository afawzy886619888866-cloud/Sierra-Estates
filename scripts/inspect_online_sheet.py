import urllib.request, csv, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

url = 'https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/gviz/tq?tqx=out:csv&gid=1127958606'
content = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
rows = list(csv.reader(io.StringIO(content)))
headers = rows[0]
print('=== CURRENT GOOGLE SHEET (gid=1127958606) ===')
print('Total Columns:', len(headers))
print('Columns:', headers)
print('Total Rows in Sheet:', len(rows) - 1)

date_idx = headers.index('تاريخ اخر تواصل') if 'تاريخ اخر تواصل' in headers else -1
avail_idx = headers.index('Availablty') if 'Availablty' in headers else -1
mob_idx = headers.index('Mobile') if 'Mobile' in headers else -1
code_idx = headers.index('Code') if 'Code' in headers else -1
name_idx = headers.index('Name') if 'Name' in headers else -1

contacted = []
avail_counts = {}

for i, r in enumerate(rows[1:], start=2):
    av = r[avail_idx].strip() if avail_idx >= 0 and len(r) > avail_idx else ''
    avail_counts[av] = avail_counts.get(av, 0) + 1
    
    dt = r[date_idx].strip() if date_idx >= 0 and len(r) > date_idx else ''
    if dt:
        contacted.append((i, r[code_idx] if code_idx >= 0 else '', r[name_idx] if name_idx >= 0 else '', r[mob_idx] if mob_idx >= 0 else '', av, dt))

print(f'\nTotal Rows with Contact Date written: {len(contacted)}')
print('Availability breakdown across sheet:', avail_counts)

print('\nSample Contacted Owners in Sheet:')
for c in contacted[:10]:
    print(f'  Row {c[0]:<4} | Code: {c[1]:<15} | Name: {c[2]:<12} | Mobile: {c[3]:<12} | Status: {c[4]:<12} | Date: {c[5]}')
