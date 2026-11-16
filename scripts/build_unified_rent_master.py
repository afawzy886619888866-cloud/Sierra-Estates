"""
build_unified_rent_master.py — Sierra Estates Unified Rent Master Builder
───────────────────────────────────────────────────────────────────────────
Merges Direct Owners (1,629 units) and Brokers (19,662 units) into a single,
authoritative primary master sheet 'All_Rent_Unified' inside Sierra_Estates_Rent_Master.xlsx.

Adds:
  - 'Advertiser Type' column ('Owner' vs 'Broker') with luxury conditional styling
  - High-polish header formatting
  - Filter enabled
  - Preserves individual tabs ('Owners_Rent', 'Brokers_Rent', 'Property_Finder_Ads')
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os

RENT_MASTER_PATH = os.path.join("data", "Sierra_Estates_Rent_Master.xlsx")

def build_unified_master():
    print(f"Loading {RENT_MASTER_PATH}...")
    wb = openpyxl.load_workbook(RENT_MASTER_PATH)
    
    ws_owners = wb["Owners_Rent"]
    ws_brokers = wb["Brokers_Rent"]
    
    # Check if All_Rent_Unified already exists, remove if so
    if "All_Rent_Unified" in wb.sheetnames:
        del wb["All_Rent_Unified"]
        
    # Create All_Rent_Unified as the FIRST tab
    ws_all = wb.create_sheet(title="All_Rent_Unified", index=0)
    
    # Original headers:
    # ['Unit Code', 'Status', 'Source', 'Compound / Project', 'Property Type', 'Monthly Rent (EGP)', 'Area (m²)', 'Beds', 'Baths', 'Finishing', 'Contact Name', 'Phone Number', 'Phone (Last 7)', 'Has Photos', 'Listing Description & Notes', 'Photo URLs', 'All Aliases & Codes']
    
    new_headers = [
        "NO",
        "Advertiser Type",
        "Unit Code",
        "Status",
        "Compound / Project",
        "Property Type",
        "Monthly Rent (EGP)",
        "Area (m²)",
        "Beds",
        "Baths",
        "Finishing",
        "Contact Name",
        "Phone Number",
        "Phone (Last 7)",
        "Has Photos",
        "Listing Description & Notes",
        "Source File / Origin"
    ]
    
    ws_all.append(new_headers)
    
    row_no = 1
    
    # 1. Append Direct Owners
    print("Reading Direct Owners...")
    owner_rows = list(ws_owners.iter_rows(values_only=True))[1:]
    for r in owner_rows:
        row_data = [
            row_no,
            "Owner (مالك مباشر)",
            r[0],  # Unit Code
            r[1],  # Status
            r[3],  # Compound
            r[4],  # Property Type
            r[5],  # Price
            r[6],  # Area
            r[7],  # Beds
            r[8],  # Baths
            r[9],  # Finishing
            r[10], # Name
            r[11], # Phone
            r[12], # Last 7
            r[13], # Has Photos
            r[14], # Description
            r[2]   # Source
        ]
        ws_all.append(row_data)
        row_no += 1
        
    print(f"Added {len(owner_rows)} Direct Owners.")
    
    # 2. Append Brokers
    print("Reading Brokers...")
    broker_rows = list(ws_brokers.iter_rows(values_only=True))[1:]
    for r in broker_rows:
        row_data = [
            row_no,
            "Broker (وسيط عقاري)",
            r[0],  # Unit Code
            r[1],  # Status
            r[3],  # Compound
            r[4],  # Property Type
            r[5],  # Price
            r[6],  # Area
            r[7],  # Beds
            r[8],  # Baths
            r[9],  # Finishing
            r[10], # Name
            r[11], # Phone
            r[12], # Last 7
            r[13], # Has Photos
            r[14], # Description
            r[2]   # Source
        ]
        ws_all.append(row_data)
        row_no += 1
        
    print(f"Added {len(broker_rows)} Brokers.")
    print(f"Total Unified Rent units: {row_no - 1}")
    
    # Style Header
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    
    for col_idx in range(1, len(new_headers) + 1):
        cell = ws_all.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    
    ws_all.row_dimensions[1].height = 36
    ws_all.freeze_panes = "A2"
    ws_all.auto_filter.ref = f"A1:{get_column_letter(len(new_headers))}{row_no}"
    
    # Column widths
    col_widths = {
        1: 8,   # NO
        2: 20,  # Advertiser Type
        3: 18,  # Unit Code
        4: 14,  # Status
        5: 22,  # Compound
        6: 16,  # Property Type
        7: 18,  # Monthly Rent
        8: 12,  # Area
        9: 10,  # Beds
        10: 10, # Baths
        11: 14, # Finishing
        12: 20, # Name
        13: 16, # Phone
        14: 14, # Last 7
        15: 12, # Has Photos
        16: 45, # Description
        17: 25  # Source
    }
    
    for col_idx, width in col_widths.items():
        ws_all.column_dimensions[get_column_letter(col_idx)].width = width
        
    print(f"Saving updated workbook to {RENT_MASTER_PATH}...")
    wb.save(RENT_MASTER_PATH)
    print("Done! All_Rent_Unified successfully generated as Tab #1.")

if __name__ == "__main__":
    build_unified_master()
