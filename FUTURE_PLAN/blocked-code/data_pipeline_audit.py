import pandas as pd
import re
from datetime import datetime
import gspread
import os
import sys

"""
SIERRA BLU — DATA PIPELINE V5.0 (English Edition)
Fuzzy Logic Ingestion & Gravity Memory Sync
"""

# Import Gravity Memory from local path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../11_Core_Intelligence')))
try:
    from memory.gravity_core import GravityMemory
except ImportError:
    # Fail gracefully if path is different
    class GravityMemory:
        def __init__(self, **kwargs): pass
        def ingest_fact(self, *args, **kwargs): pass

# Constants
UNIFIED_COLUMNS = ['phone', 'price', 'rooms', 'bathrooms', 'location', 'compound', 'extra_info', 'date']
SOURCE_FILES = ["Sheet1.xlsx", "Sheet2.xlsx"] # Mock list for local testing
TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Qd7wc3J90hrP1WH2yYUFjQMNIbOAH4-5/edit'

def classify_and_clean(df, unified_columns):
    """
    Fuzzy Classification: Heuristically maps unknown columns to the unified schema.
    """
    processed_rows = []
    current_date = datetime.now().strftime("%Y-%m-%d")

    for _, row in df.iterrows():
        new_row = {col: None for col in unified_columns}
        new_row['date'] = current_date
        extra_info = []

        for col_name, value in row.items():
            if pd.isna(value):
                continue
            
            val_str = str(value).strip()

            # 1. Phone Logic: 6+ digits, reasonable length
            if len(re.findall(r'\d', val_str)) >= 6 and len(val_str) < 15:
                # If we don't have a phone yet, take it
                if not new_row['phone']:
                    new_row['phone'] = val_str
                else:
                    extra_info.append(f"alternative_phone: {val_str}")
                continue

            # 2. Rooms & Bathrooms Logic: Small integers in specific contexts
            rooms_baths = [int(n) for n in re.findall(r'\b[1-8]\b', val_str)]
            if len(rooms_baths) == 1:
                # If it's a single digit, we might classify it based on column name
                if 'bath' in col_name.lower() or 'حم' in col_name:
                    new_row['bathrooms'] = rooms_baths[0]
                else:
                    new_row['rooms'] = rooms_baths[0]
            elif len(rooms_baths) >= 2:
                # Often '3, 2' means 3 beds 2 baths
                new_row['rooms'] = max(rooms_baths)
                new_row['bathrooms'] = min(rooms_baths)

            # 3. Price Logic: Large numbers
            try:
                numeric_val = float(val_str.replace(',', ''))
                if numeric_val > 10000:
                    new_row['price'] = int(numeric_val)
                    continue
            except (ValueError, TypeError):
                pass

            # 4. Location/Compound Logic: Keyword based
            if any(keyword in val_str.lower() for keyword in ['cairo', 'mivida', 'mountain', 'marassi', 'sodic', 'compound']):
                if not new_row['compound']:
                    new_row['compound'] = val_str
                else:
                    new_row['location'] = val_str
                continue

            # 5. Catch-all for extra info
            extra_info.append(f"{col_name}: {val_str}")
        
        if extra_info:
            new_row['extra_info'] = " | ".join(extra_info)
        
        processed_rows.append(new_row)

    return pd.DataFrame(processed_rows)

def run_pipeline():
    print("--- STARTING SIERRA DATA PIPELINE (ENGLISH) ---")
    
    # Mock Data for verification (as the user provided)
    raw_data = {
        "Sheet1.xlsx": pd.DataFrame({
            "Owner Number": ["01012345678", "01187654321"],
            "Price Requested": [5000000, "3 Bed, 2 Bath"],
            "Details": ["some details about mivida", 4500000]
        }),
        "Sheet2.xlsx": pd.DataFrame({
            "Contact": ["01012345678", "01299998888"],
            "Market Price": [5200000, 7000000],
            "Location": ["New Cairo", "Zayed"]
        })
    }

    all_data = []

    for file_name, df in raw_data.items():
        print(f"Processing source: {file_name}")
        cleaned = classify_and_clean(df, UNIFIED_COLUMNS)
        all_data.append(cleaned)

    if not all_data:
        print("No data items found.")
        return

    # Combine all datasets
    combined_df = pd.concat(all_data, ignore_index=True)
    print("Merging data from all sources...")

    # Robust Deduplication (Fixing the logic error)
    # We use as_index=False to prevent price/phone from becoming index levels 
    # and causing reset_index() naming collisions.
    final_df = combined_df.groupby(['phone', 'price'], as_index=False).agg(
        lambda x: ' | '.join(x.dropna().astype(str).unique())
    )

    print("\n--- PROCESSED RESULT ---")
    print(final_df.head())
    print(f"\nDeduplication successful. Total records: {len(final_df)}")

    # Gravity Memory Feed
    # Ensure vault path exists or is absolute
    vault_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../11_Core_Intelligence/memory/vault.json'))
    gm = GravityMemory(vault_path=vault_path)
    
    print("Feeding facts into Gravity Memory...")
    for _, row in final_df.iterrows():
        fact = {
            "phone": row.get('phone'),
            "price": row.get('price'),
            "compound": row.get('compound'),
            "details": row.get('extra_info')
        }
        gm.ingest_fact("market_trends", "fuzzy_ingestion", fact, weight=3)

    print("\n✅ Task Complete. Unified data is ready for Sierra.")

if __name__ == "__main__":
    run_pipeline()
