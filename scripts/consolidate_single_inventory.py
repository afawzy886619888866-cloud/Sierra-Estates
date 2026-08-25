from pathlib import Path
from datetime import datetime
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import CellIsRule

SOURCE = Path('/home/ubuntu/whatsapp_inventory/merged_inventory/merged_rental_inventory.xlsx')
OUT = Path('/home/ubuntu/whatsapp_inventory/merged_inventory/Sierra_Estates_All_Inventory_One_Sheet.xlsx')


def read_formatted_sheet(ws):
    header_row = None
    headers = []
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 20), values_only=True):
        values = [str(v).strip() if v is not None else '' for v in row]
        if 'RecordID' in values or 'UnitFingerprint' in values:
            header_row = row
            headers = values
            break
    if header_row is None:
        return []
    header_map = {}
    for idx, value in enumerate(headers):
        if value and value not in header_map:
            header_map[value] = idx
    records = []
    for values in ws.iter_rows(min_row=header_row[0] if False else 1, values_only=True):
        pass
    # locate row index from the header values
    header_index = next(i for i, row in enumerate(ws.iter_rows(min_row=1, max_row=20, values_only=True), start=1) if list(row) == list(header_row))
    for row in ws.iter_rows(min_row=header_index + 1, values_only=True):
        if not any(v not in (None, '') for v in row):
            continue
        record = {}
        for key, idx in header_map.items():
            record[key] = row[idx] if idx < len(row) else None
        if record.get('RecordID') or record.get('UnitFingerprint'):
            records.append(record)
    return records

src = load_workbook(SOURCE, read_only=True, data_only=True)
rentals = read_formatted_sheet(src['Rental Master'])
sales = read_formatted_sheet(src['Sales Excluded'])

# Keep a single operational inventory sheet while retaining explicit category separation.
fields = [
    'RecordID', 'ListingCategory', 'InventoryStatus', 'SourceType', 'Location', 'Zone',
    'PropertyType', 'Bedrooms', 'Bathrooms', 'AreaSqm', 'PriceEGP', 'Furnished',
    'Garden', 'Pool', 'AdditionalFeatures', 'ContactName', 'ContactPhone', 'OwnerBroker',
    'Availability', 'FollowUpStatus', 'Priority', 'LastContactDate', 'NextAction',
    'AssignedAgent', 'SourceFile', 'SourceSheet', 'SourceRow', 'UnitFingerprint',
    'ConflictFlag', 'ConflictSummary', 'Comment', 'UpdatedAt'
]

out = Workbook()
ws = out.active
ws.title = 'All Inventory Units'
ws.sheet_view.showGridLines = False
ws.freeze_panes = 'A5'
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0

# Title and context.
ws['A1'] = 'SIERRA ESTATES / ALL INVENTORY UNITS'
ws['A1'].font = Font(name='Georgia', size=18, bold=True, color='173B4D')
ws['A2'] = 'Single-sheet operational inventory consolidated from the canonical merged workbook. Rental and sale records remain distinguishable by ListingCategory.'
ws['A2'].font = Font(name='Calibri', size=10, italic=True, color='5D6B73')
ws['A3'] = f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")} | Rental Master: {len(rentals):,} | Sales Excluded: {len(sales):,}'
ws['A3'].font = Font(name='Calibri', size=10, color='5D6B73')

header_row = 5
for col, field in enumerate(fields, start=1):
    cell = ws.cell(header_row, col, field)
    cell.font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
    cell.fill = PatternFill('solid', fgColor='173B4D')
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)


def val(record, *keys, default=None):
    for key in keys:
        if key in record and record[key] not in (None, ''):
            return record[key]
    return default


def normalize(record, category):
    raw_text = ' '.join(str(val(record, key, default='') or '') for key in ['RawListingText', 'SourceNotes', 'SourceGroup', 'Location', 'PropertyType'])
    is_request = category == 'Rental' and bool(__import__('re').search(r'(?i)(mloob|mloba|مطلوب|محتاج|عايز|دورة مطلوب|عميل طالب|client looking|looking for|tenant looking|wanted)', raw_text))
    listing_category = 'Sale Excluded' if category == 'Sale' else ('Client Request' if is_request else 'Available Listing')
    status = 'Excluded from rental map' if category == 'Sale' else 'Pending'
    features = val(record, 'AdditionalFeatures', 'RawListingText', 'SourceNotes', default='') or ''
    garden = val(record, 'Garden', default=False)
    pool = val(record, 'Pool', default=False)
    if isinstance(garden, str): garden = garden.strip().lower() in {'true','yes','y','1','garden','حديقة','جاردن'}
    if isinstance(pool, str): pool = pool.strip().lower() in {'true','yes','y','1','pool','swimming pool','حمام سباحة','بول'}
    if not garden: garden = bool(__import__('re').search(r'(?i)(garden|حديقة|جاردن|private garden)', raw_text))
    if not pool: pool = bool(__import__('re').search(r'(?i)(pool|حمام سباحة|سباحة|private pool)', raw_text))
    return {
        'RecordID': val(record, 'RecordID', 'Code'),
        'ListingCategory': listing_category,
        'InventoryStatus': status,
        'SourceType': val(record, 'SourceType', 'Source', default='Unknown'),
        'Location': val(record, 'Location', 'Compound', 'Area'),
        'Zone': val(record, 'Zone'),
        'PropertyType': val(record, 'PropertyType', 'Type'),
        'Bedrooms': val(record, 'Bedrooms', 'Beds', 'bedrooms'),
        'Bathrooms': val(record, 'Bathrooms', 'Baths'),
        'AreaSqm': val(record, 'AreaSqm', 'Area', 'Space'),
        'PriceEGP': val(record, 'PriceEGP', 'MonthlyRentEGP', 'Price', 'UnitPrice', 'Rent'),
        'Furnished': val(record, 'Furnished', 'Furnishing', 'FurnishedStatus'),
        'Garden': bool(garden),
        'Pool': bool(pool),
        'AdditionalFeatures': features,
        'ContactName': val(record, 'ContactName', 'SourceName', 'Name'),
        'ContactPhone': val(record, 'ContactPhone', 'SourceContact', 'Phone', 'Mobile'),
        'OwnerBroker': val(record, 'OwnerBroker', 'Ownership', 'SourceType', 'Owner'),
        'Availability': val(record, 'Availability', 'Availablty'),
        'FollowUpStatus': val(record, 'FollowUpStatus', default='Pending' if category == 'Rental' else 'Not Applicable'),
        'Priority': val(record, 'Priority', default='Normal'),
        'LastContactDate': val(record, 'LastContactDate'),
        'NextAction': val(record, 'NextAction'),
        'AssignedAgent': val(record, 'AssignedAgent', default='Unassigned'),
        'SourceFile': val(record, 'SourceFile', 'SourceWorkbook'),
        'SourceSheet': val(record, 'SourceSheet'),
        'SourceRow': val(record, 'SourceRow'),
        'UnitFingerprint': val(record, 'UnitFingerprint', 'DedupGroupKey'),
        'ConflictFlag': val(record, 'ConflictFlag', default=False),
        'ConflictSummary': val(record, 'ConflictSummary', 'ConflictNotes'),
        'Comment': val(record, 'Comment', 'SourceNotes'),
        'UpdatedAt': val(record, 'UpdatedAt', 'ListingDate'),
    }

rows = [normalize(r, 'Rental') for r in rentals] + [normalize(r, 'Sale') for r in sales]
for row_idx, record in enumerate(rows, start=header_row + 1):
    for col, field in enumerate(fields, start=1):
        cell = ws.cell(row_idx, col, record.get(field))
        cell.font = Font(name='Calibri', size=10, color='1F2D33')
        cell.alignment = Alignment(vertical='top', wrap_text=field in {'AdditionalFeatures','ConflictSummary','Comment'})
        if field == 'PriceEGP' and isinstance(cell.value, (int, float)):
            cell.number_format = '#,##0'
        if field in {'Garden','Pool','ConflictFlag'}:
            cell.alignment = Alignment(horizontal='center', vertical='top')
    if row_idx % 2 == 0:
        for col in range(1, len(fields) + 1):
            ws.cell(row_idx, col).fill = PatternFill('solid', fgColor='F4F7F7')

last_row = header_row + len(rows)
last_col = len(fields)
ref = f'A{header_row}:{chr(64 + last_col) if last_col <= 26 else "AF"}{last_row}'
tab = Table(displayName='AllInventoryUnits', ref=ref)
tab.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showFirstColumn=False, showLastColumn=False, showRowStripes=True, showColumnStripes=False)
ws.add_table(tab)

# Conditional formatting for operational fields.
status_col = fields.index('FollowUpStatus') + 1
priority_col = fields.index('Priority') + 1
category_col = fields.index('ListingCategory') + 1
for col in [status_col, priority_col, category_col]:
    letter = ws.cell(header_row, col).column_letter
    ws.conditional_formatting.add(f'{letter}{header_row+1}:{letter}{last_row}', CellIsRule(operator='equal', formula=['"Pending"'], fill=PatternFill('solid', fgColor='FFF3CD')))

widths = {
    'RecordID': 17, 'ListingCategory': 19, 'InventoryStatus': 22, 'SourceType': 13, 'Location': 22,
    'Zone': 15, 'PropertyType': 18, 'Bedrooms': 10, 'Bathrooms': 10, 'AreaSqm': 11, 'PriceEGP': 13,
    'Furnished': 12, 'Garden': 9, 'Pool': 9, 'AdditionalFeatures': 32, 'ContactName': 22,
    'ContactPhone': 17, 'OwnerBroker': 14, 'Availability': 15, 'FollowUpStatus': 16, 'Priority': 11,
    'LastContactDate': 16, 'NextAction': 28, 'AssignedAgent': 16, 'SourceFile': 28, 'SourceSheet': 18,
    'SourceRow': 10, 'UnitFingerprint': 28, 'ConflictFlag': 12, 'ConflictSummary': 30, 'Comment': 34, 'UpdatedAt': 18,
}
for idx, field in enumerate(fields, start=1):
    ws.column_dimensions[ws.cell(header_row, idx).column_letter].width = widths.get(field, 14)
ws.row_dimensions[1].height = 28
ws.row_dimensions[2].height = 30
ws.row_dimensions[header_row].height = 38
ws.auto_filter.ref = ref
ws.print_title_rows = f'{header_row}:{header_row}'

OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT)
print(f'Wrote {OUT}')
print(f'Rows: {len(rows)} | rental: {len(rentals)} | sale: {len(sales)}')
