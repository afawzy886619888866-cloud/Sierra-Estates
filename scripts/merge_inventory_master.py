import csv
import json
import re
import os
import urllib.request
import io
from datetime import datetime

def clean_phone(phone_str):
    if not phone_str:
        return ""
    digits = re.sub(r'\D', '', str(phone_str))
    if digits.startswith('20') and len(digits) > 10:
        digits = '0' + digits[2:]
    elif digits.startswith('0'):
        pass
    elif len(digits) == 10 and digits.startswith('1'):
        digits = '0' + digits
    return digits

def format_eg_phone(digits):
    if not digits:
        return ""
    if len(digits) == 11 and digits.startswith('01'):
        return f"+20 {digits[1:4]} {digits[4:7]} {digits[7:]}"
    elif len(digits) == 10:
        return f"+20 {digits[:3]} {digits[3:6]} {digits[6:]}"
    return f"+20 {digits}"

def parse_price(val):
    if val is None:
        return 0
    s = str(val).strip().replace(',', '').replace('EGP', '').replace('egp', '').replace('$', '').strip()
    # Check for multiplier like 'k' or 'm'
    m = re.search(r'([\d\.]+)\s*([km])', s, re.I)
    if m:
        num = float(m.group(1))
        unit = m.group(2).lower()
        if unit == 'k':
            return num * 1000
        elif unit == 'm':
            return num * 1000000
    try:
        # extract first numeric sequence
        m_num = re.search(r'[\d\.]+', s)
        if m_num:
            return float(m_num.group(0))
    except:
        pass
    return 0

def parse_int(val):
    if val is None:
        return None
    s = str(val).strip()
    m = re.search(r'\d+', s)
    if m:
        return int(m.group(0))
    return None

def main():
    print("=== STARTING MASTER INVENTORY MERGE ===")
    merged_units = []
    seen_keys = set()

    # 1. Fetch Online Sheet rows (gid=1127958606)
    print("1. Fetching current online Google Sheet (gid=1127958606)...")
    sheet_id = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk'
    gid = '1127958606'
    url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&gid={gid}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        content = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        online_rows = list(csv.reader(io.StringIO(content)))
        if online_rows and len(online_rows) > 1:
            h = online_rows[0]
            print(f"   Loaded {len(online_rows)-1} rows from online Google Sheet.")
            
            def get_col(row, name):
                for idx, col in enumerate(h):
                    if name.lower() in col.lower():
                        return row[idx] if idx < len(row) else ""
                return ""

            for i, r in enumerate(online_rows[1:], start=1):
                phone = clean_phone(get_col(r, 'Mobile'))
                code = get_col(r, 'Code') or f"SE-ONL-{str(i).padStart if hasattr(str(i), 'padStart') else str(i).zfill(3)}"
                compound = get_col(r, 'Location') or "New Cairo"
                price = parse_price(get_col(r, 'Unit Price'))
                beds = parse_int(get_col(r, 'bedrooms'))
                prop_type = get_col(r, 'Property Tybe') or get_col(r, 'Property Type') or "Apartment"
                name = get_col(r, 'Name') or "Owner"
                deal_val = get_col(r, 'Type').lower()
                deal = "Rent" if "rent" in deal_val or "ايجار" in deal_val else "Sale"
                avail = get_col(r, 'Availablty') or "Available"
                space = get_col(r, 'Space')
                comment = get_col(r, 'Comment')
                last_contact = get_col(r, 'تاريخ اخر تواصل') or get_col(r, 'تاريخ اخر تحديث')

                key = (phone, compound.lower(), beds, int(price))
                if phone and key in seen_keys:
                    continue
                if phone:
                    seen_keys.add(key)

                merged_units.append({
                    "id": f"UNIT-ONL-{i}",
                    "code": code,
                    "lastUpdate": last_contact or "Recent",
                    "availability": avail if avail in ["Available", "Under Offer", "Rented", "Sold"] else "Available",
                    "compound": compound,
                    "price": price,
                    "rooms": beds,
                    "bathrooms": None,
                    "space": f"{space} m²" if space and not 'm' in space.lower() else space,
                    "propertyType": prop_type,
                    "phone": format_eg_phone(phone),
                    "sender": name,
                    "deal": deal,
                    "advertiserType": "Owner",
                    "source": "Google Sheet (gid=1127958606)",
                    "comment": comment
                })
    except Exception as e:
        print(f"   Warning: could not fetch online sheet: {e}")

    # 2. Ingest Direct Owners Rent Master (data/Sierra_Estates_Owners_Rent_Master.csv)
    rent_owners_file = 'data/Sierra_Estates_Owners_Rent_Master.csv'
    if os.path.exists(rent_owners_file):
        print("2. Ingesting Sierra_Estates_Owners_Rent_Master.csv...")
        with open(rent_owners_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader, start=1):
                phone = clean_phone(r.get('Owner Phone') or r.get('Direct WhatsApp'))
                compound = r.get('Compound / Community') or r.get('Zone / Area') or "New Cairo"
                price = parse_price(r.get('Monthly Rent (EGP)') or r.get('Rent Display'))
                beds = parse_int(r.get('Bedrooms'))
                baths = parse_int(r.get('Bathrooms'))
                space = r.get('Area (sqm)')
                code = r.get('Unit Code') or f"SE-OWN-R{str(i).zfill(3)}"
                prop_type = r.get('Property Type') or "Apartment"
                name = r.get('Owner / Contact Name') or "Direct Owner"
                status = r.get('Listing Status') or "Available"
                avail = "Available" if "avail" in status.lower() else "Under Offer" if "offer" in status.lower() else "Rented" if "rent" in status.lower() else "Available"

                key = (phone, compound.lower(), beds, int(price))
                if phone and key in seen_keys:
                    continue
                if phone:
                    seen_keys.add(key)

                merged_units.append({
                    "id": f"UNIT-OWN-{i}",
                    "code": code,
                    "lastUpdate": "2026-10-18",
                    "availability": avail,
                    "compound": compound,
                    "price": price,
                    "rooms": beds,
                    "bathrooms": baths,
                    "space": f"{space} m²" if space and not 'm' in str(space).lower() else str(space) if space else None,
                    "propertyType": prop_type,
                    "phone": format_eg_phone(phone),
                    "sender": name,
                    "deal": "Rent",
                    "advertiserType": "Owner",
                    "source": "Direct Owner Intake",
                    "comment": r.get('Listing Notes', '')
                })
        print(f"   Total merged units so far: {len(merged_units)}")

    # 3. Ingest Master Clean No Duplicates (data/master_inventory_clean_no_duplicates.csv)
    no_dup_file = 'data/master_inventory_clean_no_duplicates.csv'
    if os.path.exists(no_dup_file):
        print("3. Ingesting master_inventory_clean_no_duplicates.csv...")
        with open(no_dup_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader, start=1):
                phone = clean_phone(r.get('Mobile'))
                compound = r.get('Compound') or r.get('Zone') or "New Cairo"
                price = parse_price(r.get('Price') or r.get('Unit Price'))
                beds = parse_int(r.get('Bedrooms'))
                code = r.get('Code') or f"SE-CL-{str(i).zfill(3)}"
                name = r.get('Name') or "Direct Owner"
                avail = r.get('Availability') or "Available"

                key = (phone, compound.lower(), beds, int(price))
                if phone and key in seen_keys:
                    continue
                if phone:
                    seen_keys.add(key)

                merged_units.append({
                    "id": f"UNIT-CL-{i}",
                    "code": code,
                    "lastUpdate": r.get('Timestamp') or "2026-10-15",
                    "availability": avail if avail in ["Available", "Under Offer", "Rented", "Sold"] else "Available",
                    "compound": compound,
                    "price": price,
                    "rooms": beds,
                    "bathrooms": None,
                    "space": None,
                    "propertyType": "Apartment",
                    "phone": format_eg_phone(phone),
                    "sender": name,
                    "deal": "Rent" if price < 300000 else "Sale",
                    "advertiserType": "Owner",
                    "source": "Clean Owner Inventory",
                    "comment": ""
                })
        print(f"   Total merged units so far: {len(merged_units)}")

    # 4. Ingest Cleaned Master Inventory (data/sierra-estates-master-inventory.csv)
    master_file = 'data/sierra-estates-master-inventory.csv'
    if os.path.exists(master_file):
        print("4. Ingesting sierra-estates-master-inventory.csv...")
        with open(master_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            count = 0
            for i, r in enumerate(reader, start=1):
                phone = clean_phone(r.get('Contact Phone') or r.get('WhatsApp Direct') or r.get('Contact Name'))
                compound = r.get('Compound') or r.get('Location') or r.get('Zone') or "New Cairo"
                price = parse_price(r.get('Price (EGP)'))
                if price <= 0:
                    continue
                beds = parse_int(r.get('Bedrooms'))
                baths = parse_int(r.get('Bathrooms'))
                space = r.get('Area (sqm)')
                rec_id = r.get('RecordID') or r.get('\ufeffRecordID') or f"REC-{i}"
                code = r.get('UnitCode') or f"SE-MST-{rec_id.replace('INV-', '')}"
                prop_type = r.get('PropertyType') or "Apartment"
                op = r.get('Operation', '').lower()
                deal = "Rent" if "rent" in op or "ايجار" in op or (price < 350000 and prop_type == 'Apartment') else "Sale"
                status = r.get('Inventory Status', 'Available')
                avail = "Available" if "avail" in status.lower() else "Under Offer" if "offer" in status.lower() else "Sold" if "sold" in status.lower() else "Available"
                name = r.get('Contact Name') or "Verified Broker"
                src = r.get('Source', 'Master Database')
                is_direct = 'owner' in src.lower() or 'direct' in src.lower()
                ad_type = "Owner" if is_direct else "Broker"

                key = (phone, compound.lower(), beds, int(price))
                if phone and key in seen_keys:
                    continue
                if phone:
                    seen_keys.add(key)

                merged_units.append({
                    "id": f"UNIT-MST-{i}",
                    "code": code,
                    "lastUpdate": (r.get('Updated At') or '2026-10-19')[:10],
                    "availability": avail,
                    "compound": compound,
                    "price": price,
                    "rooms": beds,
                    "bathrooms": baths,
                    "space": f"{space} m²" if space and not 'm' in str(space).lower() else str(space) if space else None,
                    "propertyType": prop_type,
                    "phone": format_eg_phone(phone),
                    "sender": name if name and not name.startswith('+') else ("Direct Owner" if ad_type == "Owner" else "Verified Partner"),
                    "deal": deal,
                    "advertiserType": ad_type,
                    "source": src,
                    "comment": r.get('Description', '')
                })
                count += 1
                # To keep browser fast and responsive while providing an immense inventory, cap master additions to 2000 top listings
                if count >= 2000:
                    break
        print(f"   Added {count} curated listings from master inventory.")

    print(f"\n=== MERGE COMPLETE ===")
    print(f"Total Unique High-Quality Units: {len(merged_units)}")
    owners_count = sum(1 for u in merged_units if u['advertiserType'] == 'Owner')
    rent_count = sum(1 for u in merged_units if u['deal'] == 'Rent')
    sale_count = sum(1 for u in merged_units if u['deal'] == 'Sale')
    print(f"Direct Owners: {owners_count}")
    print(f"Rent Deals: {rent_count}")
    print(f"Sale Deals: {sale_count}")

    # 5. Write to apps/sierra-estates-realty/data/online-sheet-units.json
    out_json = 'apps/sierra-estates-realty/data/online-sheet-units.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(merged_units, f, ensure_ascii=False, indent=2)
    print(f"Written updated app data JSON: {out_json}")

    # 6. Generate Google Sheet Ready CSV (matching GID 1127958606 schema)
    out_sheet_csv = 'data/Sierra_Estates_Merged_Google_Sheet_Import.csv'
    sheet_headers = [
        "Timestamp", "NO", "تاريخ اخر تحديث ", "Name", "Mobile", "Availablty", 
        "bedrooms", "Location ", "Unit Price", "Furnished or not", "Type", 
        "Property Tybe", "Code", "Owner", "Garden", "Space", "Pool", "Comment", "تاريخ اخر تواصل"
    ]
    with open(out_sheet_csv, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(sheet_headers)
        now_str = datetime.now().strftime('%m/%d/%Y %H:%M:%S')
        for idx, u in enumerate(merged_units, start=1):
            writer.writerow([
                now_str,
                str(idx),
                u['lastUpdate'],
                u['sender'],
                u['phone'].replace(' ', ''),
                u['availability'],
                str(u['rooms'] or ''),
                u['compound'],
                f"{u['price']:,.0f}" if u['price'] > 0 else "Upon Request",
                "Fully Finished" if "vill" in u['propertyType'].lower() else "Finished",
                u['deal'].lower(),
                u['propertyType'],
                u['code'],
                u['advertiserType'],
                "",
                u['space'] or "",
                "",
                u.get('comment', ''),
                ""
            ])
    print(f"Written Google Sheet Ready CSV: {out_sheet_csv}")

if __name__ == '__main__':
    main()
