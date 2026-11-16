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

# Import Gravity Memory from packages/gravity-memory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../packages/gravity-memory')))
from gravity_memory import GravityMemory

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

            # 1. Phone Logic: phone column or Egyptian phone number pattern (not price)
            is_phone_col = any(k in col_name.lower() for k in ['phone', 'contact', 'mobile', 'owner number'])
            is_price_col = any(k in col_name.lower() for k in ['price', 'سعر', 'cost'])
            digits = re.findall(r'\d', val_str)
            is_phone_num = (val_str.startswith(('01', '+20', '20', '0020')) or len(digits) in (10, 11)) and not is_price_col
            if (is_phone_col or is_phone_num) and len(digits) >= 6 and len(val_str) < 16:
                # If we don't have a phone yet, take it
                if not new_row['phone']:
                    new_row['phone'] = val_str
                else:
                    extra_info.append(f"alternative_phone: {val_str}")
                continue

            # 2. Rooms & Bathrooms Logic: Small integers in specific contexts
            rooms_baths = [int(n) for n in re.findall(r'\b[1-8]\b', val_str)]
            if len(rooms_baths) == 1 and not is_price_col:
                # If it's a single digit, we might classify it based on column name
                if 'bath' in col_name.lower() or 'حم' in col_name:
                    new_row['bathrooms'] = rooms_baths[0]
                else:
                    new_row['rooms'] = rooms_baths[0]
            elif len(rooms_baths) >= 2 and not is_price_col:
                # Often '3, 2' means 3 beds 2 baths
                new_row['rooms'] = max(rooms_baths)
                new_row['bathrooms'] = min(rooms_baths)

            # 3. Price Logic: Large numbers or price columns
            try:
                numeric_val = float(val_str.replace(',', ''))
                if numeric_val > 10000 or is_price_col:
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

    # Gravity Memory Feed & Memory-backed Dedupe (FUTURE_PLAN/01 Spec Section B3)
    vault_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../packages/gravity-memory/vault.json'))
    gm = GravityMemory(vault_path=vault_path)
    
    print("Feeding facts into Gravity Memory with memory-backed dedupe...")
    seen_count = 0
    new_count = 0
    for _, row in final_df.iterrows():
        rec_hash = f"{row.get('phone')}_{row.get('price')}_{row.get('compound')}"
        if gm.seen(rec_hash):
            seen_count += 1
            print(f">> Previously seen in GravityMemory (skipped): {rec_hash}")
            continue

        fact = {
            "phone": row.get('phone'),
            "price": row.get('price'),
            "compound": row.get('compound'),
            "details": row.get('extra_info'),
            "record_hash": rec_hash,
        }
        gm.ingest_fact("market_trends", "fuzzy_ingestion", fact, weight=3)
        gm.mark_seen(rec_hash, meta=fact)
        new_count += 1

    print(f"\n[Ingestion Summary]: {new_count} new records ingested, {seen_count} previously-seen records deduped.")
    print("[SUCCESS] Task Complete. Unified data is ready for Sierra.")

if __name__ == "__main__":
    run_pipeline()
