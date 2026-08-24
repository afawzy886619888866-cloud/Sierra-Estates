from pathlib import Path
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment

SOURCE = Path('/home/ubuntu/whatsapp_inventory/merged_inventory/Sierra_Estates_All_Inventory_One_Sheet.xlsx')
OUT = Path('/home/ubuntu/SE-Vercel-deploy-main/Inventory_with_Photos.xlsx')

wb = load_workbook(SOURCE)
ws = wb['All Inventory Units']

# Add explicit photo fields to the operational workbook. Existing source archives
# contained no media files, so these fields remain truthful and reviewable.
new_fields = ['PhotoStatus', 'PhotoURLs', 'PhotoSource']
header_row = 5
last_col = ws.max_column
for offset, field in enumerate(new_fields, start=1):
    cell = ws.cell(header_row, last_col + offset, field)
    cell.font = Font(name='Calibri', size=10, bold=True, color='FFFFFF')
    cell.fill = PatternFill('solid', fgColor='173B4D')
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

for row in range(header_row + 1, ws.max_row + 1):
    ws.cell(row, last_col + 1, 'No WhatsApp media supplied')
    ws.cell(row, last_col + 2, '')
    ws.cell(row, last_col + 3, '')
    for col in range(last_col + 1, last_col + 4):
        ws.cell(row, col).font = Font(name='Calibri', size=10, color='1F2D33')
        ws.cell(row, col).alignment = Alignment(vertical='top', wrap_text=True)

ws['A1'] = 'SIERRA ESTATES / INVENTORY WITH PHOTOS'
ws['A2'] = 'Unified operational inventory. Photo fields are populated only when source media is supplied and confidently matched to a RecordID.'
ws.column_dimensions['AG'].width = 24
ws.column_dimensions['AH'].width = 42
ws.column_dimensions['AI'].width = 24

# Extend the existing Excel table to include the photo fields.
if ws.tables:
    table = next(iter(ws.tables.values()))
    table.ref = f'A{header_row}:AI{ws.max_row}'

OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print(f'Wrote {OUT}')
print(f'Rows: {ws.max_row - header_row}')
print('PhotoStatus: No WhatsApp media supplied')
