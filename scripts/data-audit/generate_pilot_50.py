import csv, os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QUEUE_CSV = os.path.join(ROOT, 'data', 'VERIFICATION_QUEUE_V1.csv')
PILOT_CSV = os.path.join(ROOT, 'data', 'PILOT_50_WORKSHEET.csv')
PILOT_XLSX = os.path.join(ROOT, 'data', 'PILOT_50_WORKSHEET.xlsx')

with open(QUEUE_CSV, encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

# Top 50 priority 1 (OWNER_DIRECT) units
pilot_rows = [r for r in rows if r.get('priority_group') == '1'][:50]

print(f"Selected top {len(pilot_rows)} OWNER_DIRECT pilot units.")

# Field mappings and automated checks
out_rows = []
for i, r in enumerate(pilot_rows, 1):
    unit_id = r.get('unit_id')
    compound = r.get('compound') or 'Unknown'
    deal_type = r.get('deal_type') or 'Unknown'
    prop_type = r.get('property_type') or 'Unknown'
    price = r.get('price_raw') or r.get('price') or '0'
    currency = r.get('currency') or 'EGP'
    beds = r.get('bedrooms') or '0'
    area = r.get('area_sqm') or '0'
    phone = r.get('phone_normalized') or r.get('phone') or 'None'
    contact = r.get('contact_name') or 'Owner'
    source = r.get('source') or 'Unknown'
    source_row = r.get('source_row') or ''
    photo_count = int(r.get('photo_count') or 0)
    avail = r.get('availability') or 'unknown'
    last_verified = r.get('last_verified_at') or 'None'
    
    # Automated checks
    price_ok = r.get('price_validity') == 'valid'
    deal_ok = deal_type.lower() in ('sale', 'rent')
    compound_ok = bool(compound and compound != 'Unknown')
    prop_ok = bool(prop_type and prop_type != 'Unknown')
    beds_ok = bool(beds and beds != '0')
    area_ok = bool(area and area != '0')
    phone_ok = r.get('phone_state') == 'valid'
    photo_ok = photo_count >= 3
    
    passed_checks = sum([price_ok, deal_ok, compound_ok, prop_ok, beds_ok, area_ok, phone_ok, photo_ok])
    completeness = f"{passed_checks}/8"
    
    # Human verification boundary determination
    missing_reasons = []
    if not photo_ok:
        missing_reasons.append("0 real photos (need >=3 unit photos)")
    missing_reasons.append("Pending live owner call/WhatsApp confirmation")
    
    decision = "REVIEW_REQUIRED"
    human_status = "NEEDS_HUMAN_VERIFICATION"
    exact_reason = " · ".join(missing_reasons)
    
    out_rows.append({
        'Pilot_Rank': i,
        'Unit_ID': unit_id,
        'Public_Code': r.get('public_code') or unit_id,
        'Compound': compound,
        'Property_Type': prop_type,
        'Deal_Type': deal_type,
        'Price': price,
        'Currency': currency,
        'Bedrooms': beds,
        'Area_Sqm': area,
        'Owner_Name': contact,
        'Owner_Phone': phone,
        'Availability': avail,
        'Photo_Count': photo_count,
        'Source_Lineage': f"{source} (row {source_row})",
        'Last_Verified_Timestamp': last_verified,
        'Field_Completeness': completeness,
        'Human_Boundary_Status': human_status,
        'Exact_Reason': exact_reason,
        'Publish_Decision': decision
    })

# Write CSV
fieldnames = list(out_rows[0].keys())
with open(PILOT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(out_rows)

print(f"Wrote {PILOT_CSV}")

# Write XLSX
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Pilot Top 50 Units"

# Headers
ws.append(fieldnames)
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")

for col_idx in range(1, len(fieldnames) + 1):
    cell = ws.cell(row=1, column=col_idx)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center")

for row_data in out_rows:
    ws.append(list(row_data.values()))

# Auto-width
for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = get_column_letter(col[0].column)
    ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

wb.save(PILOT_XLSX)
print(f"Wrote {PILOT_XLSX}")
