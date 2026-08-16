import pandas as pd
import re
from datetime import datetime
import gspread
from pydrive2.auth import GoogleAuth
from pydrive2.drive import GoogleDrive
import sys
import os

# Add Intelligence path to sys for GravityMemory import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../11_Core_Intelligence')))
from memory.gravity_core import GravityMemory

# ---------------------------------------------------------
# 1. Configuration & Constants
# ---------------------------------------------------------
SOURCE_FOLDER_ID = '1RGuki2ECPK4DHNXgzlinQ2QTFAMBnC1z'
TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Qd7wc3J90hrP1WH2yYUFjQMNIbOAH4-5/edit#gid=101083702516438769460'

# Exact columns from the screenshot
TARGET_COLUMNS = [
    'Timestamp', 
    'تاريخ أخر تحديث', 
    'Name', 
    'Mobile', 
    'Availablity', 
    'bedrooms', 
    'Location', 
    'Unit Price', 
    'condition',        # Furnishing status
    'Property Tybe',    # Apartment, Villa..
    'Owner',            # Owner/Broker
    'Notes'             # the catch-all for unrecognized details
]

# ---------------------------------------------------------
# 2. Logic & Heuristics Functions
# ---------------------------------------------------------

def determine_owner_type(text):
    text = str(text).lower()
    if any(word in text for word in ['مالك', 'صاحب', 'owner', 'بتاعته']):
        return 'Owner'
    elif any(word in text for word in ['مكتب', 'شركة', 'مسوق', 'بروكر', 'وسيط', 'عقاري', 'broker']):
        return 'Broker'
    return 'Blank'

def determine_condition(text):
    text = str(text).lower()
    if any(word in text for word in ['مفروش', 'بالفرش', 'فندقي', 'شامل', 'furnished']):
        return 'Furnished' # Or 'مفروش' based on preference, using english as per screenshot
    elif any(word in text for word in ['نص', 'نصف', 'مطبخ', 'مكيف', 'دواليب', 'half furnished', 'semi']):
        return 'Half Furnished'
    elif any(word in text for word in ['فاضي', 'بدون', 'خالي', 'not furnished']):
        return 'Not Furnished'
    return 'Null'

def clean_and_merge_data(raw_dataframes):
    df = pd.concat(raw_dataframes, ignore_index=True)
    processed_rows = []
    
    current_date = datetime.now().strftime("%d-%b-%y") # format like 14-Apr-26 in screenshot

    for index, row in df.iterrows():
        new_row = {col: None for col in TARGET_COLUMNS}
        new_row['تاريخ أخر تحديث'] = current_date
        notes_arr = []
        
        for val in row.dropna():
            s_val = str(val).strip()
            
            # Mobile logic: 6+ digits
            if s_val.isdigit() and len(s_val) >= 6:
                new_row['Mobile'] = s_val
                
            # Unit Price logic: Large numbers
            elif s_val.replace('.', '', 1).isdigit() and float(s_val) > 1000:
                 new_row['Unit Price'] = s_val
                 
            # Bedrooms logic: 1 to 8
            elif s_val.isdigit() and 1 <= int(s_val) <= 8:
                num = int(s_val)
                if new_row['bedrooms'] is None:
                    new_row['bedrooms'] = num
                else:
                    if num > new_row['bedrooms']:
                        new_row['bedrooms'] = num
            
            # Availability logic (matching screenshot)
            elif str(val).lower() in ['available', 'no answer', 'not available']:
                new_row['Availablity'] = str(val).capitalize()
                
            # Property Type logic
            elif str(val).lower() in ['apartment', 'villa', 'town house', 'floor with garden']:
                new_row['Property Tybe'] = str(val).title()
            
            # Condition / Furnishing logic
            elif determine_condition(s_val) != 'Null':
                new_row['condition'] = determine_condition(s_val)
                
            # Owner / Broker logic
            elif determine_owner_type(s_val) != 'Blank':
                new_row['Owner'] = determine_owner_type(s_val)
                
            # Name (assuming short words without numbers)
            elif not any(char.isdigit() for char in s_val) and len(s_val.split()) <= 4 and new_row['Name'] is None:
                # Basic assumption, if it matches other unclassified, we put it in notes
                new_row['Name'] = s_val
                
            # Catch all -> Location or Notes
            else:
                notes_arr.append(s_val)
        
        if notes_arr:
             new_row['Notes'] = " | ".join(notes_arr)
             
        processed_rows.append(new_row)

    clean_df = pd.DataFrame(processed_rows)

    # 3. Smart Deduplication
    sorted_df = clean_df.sort_values(by=['Timestamp', 'تاريخ أخر تحديث'], ascending=False)
    grouped = sorted_df.groupby(['Mobile', 'Unit Price'], dropna=False) # Keep NaNs from collapsing
    
    # Fill missing values from duplicates, keep the most recent row
    deduped_df = grouped.apply(lambda group: group.ffill().bfill()).drop_duplicates(subset=['Mobile', 'Unit Price'], keep='first')
    
    return deduped_df.fillna("Null")

# ---------------------------------------------------------
# 3. Google API Integration
# ---------------------------------------------------------

def authenticate_google_drive():
    """Authenticates with Google Drive using PyDrive2."""
    try:
        gauth = GoogleAuth()
        # Look for local client_secrets.json or settings.yaml
        gauth.LocalWebserverAuth() 
        return GoogleDrive(gauth)
    except Exception as e:
        print(f"❌ Drive Auth Failed: {e}")
        return None

def download_excel_files_from_drive(drive, folder_id):
    """Downloads all excel files from a specific folder."""
    file_list = drive.ListFile({'q': f"'{folder_id}' in parents and trashed=false"}).GetList()
    dataframes = []
    
    for file in file_list:
        if file['title'].endswith(('.xlsx', '.xls', '.csv')):
            print(f"📂 Downloading {file['title']}...")
            file.GetContentFile(file['title'])
            
            if file['title'].endswith('.csv'):
                df = pd.read_csv(file['title'])
            else:
                df = pd.read_excel(file['title'])
            
            dataframes.append(df)
    
    return dataframes

def upload_to_google_sheets(df, sheet_url):
    """Uploads a DataFrame to a specific Google Sheet using gspread."""
    try:
        # Assumes service_account.json is in the same directory
        gc = gspread.service_account(filename='config/service_account.json')
        sh = gc.open_by_url(sheet_url)
        worksheet = sh.get_worksheet(0) # First sheet
        
        # Clear existing data
        worksheet.clear()
        
        # Prepare for upload (headers + data)
        data_to_upload = [df.columns.values.tolist()] + df.values.tolist()
        
        print(f"🚀 Uploading {len(df)} rows to Master Sheet...")
        worksheet.update('A1', data_to_upload)
        print("✅ Data synchronization complete.")
        
    except Exception as e:
        print(f"❌ Sheets Upload Failed: {e}")

# ---------------------------------------------------------
# 4. Main Execution
# ---------------------------------------------------------

def main():
    print("--- Sierra Estates DATA PIPELINE V4.0 ---")
    
    drive = authenticate_google_drive()
    if not drive: return
    
    raw_dfs = download_excel_files_from_drive(drive, SOURCE_FOLDER_ID)
    if not raw_dfs:
        print("⚠️ No raw files found in SOURCE_FOLDER_ID.")
        return
        
    print("🧹 Cleaning and Deduplicating data...")
    clean_df = clean_and_merge_data(raw_dfs)
    
    print(f"✨ Processed {len(clean_df)} unique records.")
    
    # --- Gravity Memory Integration ---
    print("🧠 Feeding Sierra Gravity Memory...")
    gm = GravityMemory(vault_path=os.path.abspath(os.path.join(os.path.dirname(__file__), '../11_Core_Intelligence/memory/vault.json')))
    for _, row in clean_df.iterrows():
        fact = {
            "compound": row.get('Location', 'Unknown'),
            "price": row.get('Unit Price', 'Unknown'),
            "bedrooms": row.get('bedrooms', 'Unknown'),
            "owner": row.get('Owner', 'Unknown')
        }
        gm.ingest_fact("compounds", str(row.get('Location', 'General')), fact, weight=2)
    # ----------------------------------

    upload_to_google_sheets(clean_df, TARGET_SHEET_URL)

if __name__ == "__main__":
    main()
