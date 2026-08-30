import re
from pathlib import Path
from datetime import datetime
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import CellIsRule

SOURCE = Path('/home/ubuntu/whatsapp_inventory/merged_inventory/merged_rental_inventory.xlsx')
OUT = Path('/home/ubuntu/whatsapp_inventory/merged_inventory/Sierra_Estates_All_Inventory_One_Sheet.xlsx')


def read_formatted_sheet(worksheet):
    """Read a Sierra-formatted openpyxl worksheet and return normalised records."""
    hdr_row = None
    headers = []
    for row in worksheet.iter_rows(min_row=1, max_row=min(worksheet.max_row, 20), values_only=True):
        values = [str(v).strip() if v is not None else '' for v in row]
        if 'RecordID' in values or 'UnitFingerprint' in values:
            hdr_row = row
            headers = values
            break
    if hdr_row is None:
        return []

    header_map = {}
    for col_idx, value in enumerate(headers):
        if value and value not in header_map:
            header_map[value] = col_idx

    # Locate the 1-based row index of the header inside the sheet.
    header_index = next(
        i
        for i, row in enumerate(
            worksheet.iter_rows(min_row=1, max_row=20, values_only=True), start=1
        )
        if list(row) == list(hdr_row)
    )

    records = []
    for row in worksheet.iter_rows(min_row=header_index + 1, values_only=True):
        if not any(v not in (None, '') for v in row):
            continue
        row_data = {}
        for key, col_idx in header_map.items():
            row_data[key] = row[col_idx] if col_idx < len(row) else None
        if row_data.get('RecordID') or row_data.get('UnitFingerprint'):
            records.append(row_data)
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
out_ws = out.active
out_ws.title = 'All Inventory Units'
out_ws.sheet_view.showGridLines = False
out_ws.freeze_panes = 'A5'
out_ws.sheet_properties.pageSetUpPr.fitToPage = True
out_ws.page_setup.fitToWidth = 1
out_ws.page_setup.fitToHeight = 0

# Title and context.
out_ws['A1'] = 'SIERRA ESTATES / ALL INVENTORY UNITS'
out_ws['A1'].font = Font(name='Georgia', size=18, bold=True, color='173B4D')
out_ws['A2'] = (
    'Single-sheet operational inventory consolidated from the canonical merged workbook. '
    'Rental and sale records remain distinguishable by ListingCategory.'
)
out_ws['A2'].font = Font(name='Calibri', size=10, italic=True, color='5D6B73')
out_ws['A3'] = (
    f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")} '
    f'| Rental Master: {len(rentals):,} | Sales Excluded: {len(sales):,}'
)
out_ws['A3'].font = Font(name='Calibri', size=10, color='5D6B73')

HEADER_ROW = 5
for col, field in enumerate(fields, start=1):
    cell = out_ws.cell(HEADER_ROW, col, field)
    cell.font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
    cell.fill = PatternFill('solid', fgColor='173B4D')
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)


def val(record, *keys, default=None):
    """Return the first non-empty value found in *record* for the given *keys*."""
    for key in keys:
        if key in record and record[key] not in (None, ''):
            return record[key]
    return default


def normalize(raw_record, category):
    """Map a source record to the canonical fields list."""
    raw_text = ' '.join(
        str(val(raw_record, key, default='') or '')
        for key in ['RawListingText', 'SourceNotes', 'SourceGroup', 'Location', 'PropertyType']
    )
    is_request = (
        category == 'Rental'
        and bool(re.search(
            r'(?i)(mloob|mloba|مطلوب|محتاج|عايز|دورة مطلوب|عميل طالب'
            r'|client looking|looking for|tenant looking|wanted)',
            raw_text,
        ))
    )
    listing_category = (
        'Sale Excluded' if category == 'Sale'
        else ('Client Request' if is_request else 'Available Listing')
    )
    status = 'Excluded from rental map' if category == 'Sale' else 'Pending'

    features = val(raw_record, 'AdditionalFeatures', 'RawListingText', 'SourceNotes', default='') or ''
    garden = val(raw_record, 'Garden', default=False)
    pool = val(raw_record, 'Pool', default=False)

    if isinstance(garden, str):
        garden = garden.strip().lower() in {'true', 'yes', 'y', '1', 'garden', 'حديقة', 'جاردن'}
    if isinstance(pool, str):
        pool = pool.strip().lower() in {'true', 'yes', 'y', '1', 'pool', 'swimming pool', 'حمام سباحة', 'بول'}
    if not garden:
        garden = bool(re.search(r'(?i)(garden|حديقة|جاردن|private garden)', raw_text))
    if not pool:
        pool = bool(re.search(r'(?i)(pool|حمام سباحة|سباحة|private pool)', raw_text))

    return {
        'RecordID': val(raw_record, 'RecordID', 'Code'),
        'ListingCategory': listing_category,
        'InventoryStatus': status,
        'SourceType': val(raw_record, 'SourceType', 'Source', default='Unknown'),
        'Location': val(raw_record, 'Location', 'Compound', 'Area'),
        'Zone': val(raw_record, 'Zone'),
        'PropertyType': val(raw_record, 'PropertyType', 'Type'),
        'Bedrooms': val(raw_record, 'Bedrooms', 'Beds', 'bedrooms'),
        'Bathrooms': val(raw_record, 'Bathrooms', 'Baths'),
        'AreaSqm': val(raw_record, 'AreaSqm', 'Area', 'Space'),
        'PriceEGP': val(raw_record, 'PriceEGP', 'MonthlyRentEGP', 'Price', 'UnitPrice', 'Rent'),
        'Furnished': val(raw_record, 'Furnished', 'Furnishing', 'FurnishedStatus'),
        'Garden': bool(garden),
        'Pool': bool(pool),
        'AdditionalFeatures': features,
        'ContactName': val(raw_record, 'ContactName', 'SourceName', 'Name'),
        'ContactPhone': val(raw_record, 'ContactPhone', 'SourceContact', 'Phone', 'Mobile'),
        'OwnerBroker': val(raw_record, 'OwnerBroker', 'Ownership', 'SourceType', 'Owner'),
        'Availability': val(raw_record, 'Availability', 'Availablty'),
        'FollowUpStatus': val(
            raw_record, 'FollowUpStatus',
            default='Pending' if category == 'Rental' else 'Not Applicable',
        ),
        'Priority': val(raw_record, 'Priority', default='Normal'),
        'LastContactDate': val(raw_record, 'LastContactDate'),
        'NextAction': val(raw_record, 'NextAction'),
        'AssignedAgent': val(raw_record, 'AssignedAgent', default='Unassigned'),
        'SourceFile': val(raw_record, 'SourceFile', 'SourceWorkbook'),
        'SourceSheet': val(raw_record, 'SourceSheet'),
        'SourceRow': val(raw_record, 'SourceRow'),
        'UnitFingerprint': val(raw_record, 'UnitFingerprint', 'DedupGroupKey'),
        'ConflictFlag': val(raw_record, 'ConflictFlag', default=False),
        'ConflictSummary': val(raw_record, 'ConflictSummary', 'ConflictNotes'),
        'Comment': val(raw_record, 'Comment', 'SourceNotes'),
        'UpdatedAt': val(raw_record, 'UpdatedAt', 'ListingDate'),
    }


rows = [normalize(r, 'Rental') for r in rentals] + [normalize(r, 'Sale') for r in sales]
for row_idx, unit in enumerate(rows, start=HEADER_ROW + 1):
    for col, field in enumerate(fields, start=1):
        cell = out_ws.cell(row_idx, col, unit.get(field))
        cell.font = Font(name='Calibri', size=10, color='1F2D33')
        cell.alignment = Alignment(
            vertical='top',
            wrap_text=field in {'AdditionalFeatures', 'ConflictSummary', 'Comment'},
        )
        if field == 'PriceEGP' and isinstance(cell.value, (int, float)):
            cell.number_format = '#,##0'
        if field in {'Garden', 'Pool', 'ConflictFlag'}:
            cell.alignment = Alignment(horizontal='center', vertical='top')
    if row_idx % 2 == 0:
        for col in range(1, len(fields) + 1):
            out_ws.cell(row_idx, col).fill = PatternFill('solid', fgColor='F4F7F7')

last_row = HEADER_ROW + len(rows)
LAST_COL = len(fields)
TABLE_REF = f'A{HEADER_ROW}:{chr(64 + LAST_COL) if LAST_COL <= 26 else "AF"}{last_row}'
tab = Table(displayName='AllInventoryUnits', ref=TABLE_REF)
tab.tableStyleInfo = TableStyleInfo(
    name='TableStyleMedium2',
    showFirstColumn=False,
    showLastColumn=False,
    showRowStripes=True,
    showColumnStripes=False,
)
out_ws.add_table(tab)

# Conditional formatting for operational fields.
status_col = fields.index('FollowUpStatus') + 1
priority_col = fields.index('Priority') + 1
category_col = fields.index('ListingCategory') + 1
for col in [status_col, priority_col, category_col]:
    letter = out_ws.cell(HEADER_ROW, col).column_letter
    out_ws.conditional_formatting.add(
        f'{letter}{HEADER_ROW + 1}:{letter}{last_row}',
        CellIsRule(
            operator='equal',
            formula=['"Pending"'],
            fill=PatternFill('solid', fgColor='FFF3CD'),
        ),
    )

widths = {
    'RecordID': 17, 'ListingCategory': 19, 'InventoryStatus': 22, 'SourceType': 13, 'Location': 22,
    'Zone': 15, 'PropertyType': 18, 'Bedrooms': 10, 'Bathrooms': 10, 'AreaSqm': 11, 'PriceEGP': 13,
    'Furnished': 12, 'Garden': 9, 'Pool': 9, 'AdditionalFeatures': 32, 'ContactName': 22,
    'ContactPhone': 17, 'OwnerBroker': 14, 'Availability': 15, 'FollowUpStatus': 16, 'Priority': 11,
    'LastContactDate': 16, 'NextAction': 28, 'AssignedAgent': 16, 'SourceFile': 28, 'SourceSheet': 18,
    'SourceRow': 10, 'UnitFingerprint': 28, 'ConflictFlag': 12, 'ConflictSummary': 30,
    'Comment': 34, 'UpdatedAt': 18,
}
for col_idx, field in enumerate(fields, start=1):
    out_ws.column_dimensions[out_ws.cell(HEADER_ROW, col_idx).column_letter].width = widths.get(field, 14)
out_ws.row_dimensions[1].height = 28
out_ws.row_dimensions[2].height = 30
out_ws.row_dimensions[HEADER_ROW].height = 38
out_ws.auto_filter.ref = TABLE_REF
out_ws.print_title_rows = f'{HEADER_ROW}:{HEADER_ROW}'

OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT)
print(f'Wrote {OUT}')
print(f'Rows: {len(rows)} | rental: {len(rentals)} | sale: {len(sales)}')
