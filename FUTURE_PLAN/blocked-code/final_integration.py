import pandas as pd
import os
import sys
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai

# Add local path for Gravity Memory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../11_Core_Intelligence')))
try:
    from memory.gravity_core import GravityMemory
except ImportError:
    print("⚠️ GravityMemory import failed. Continuing without local memory vault.")
    GravityMemory = None

# ---------------------------------------------------------
# 1. CONFIGURATION
# ---------------------------------------------------------
EXCEL_PATH = r'f:\Sierra_Blu_Master\02_Data_Ingestion\SIERRA_MASTER_PORTFOLIO.xlsx'
# We search for the service account in common locations
POSSIBLE_KEYS = [
    'f:/Sierra_Blu_Master/my-app/config/service_account.json',
    'f:/Sierra_Blu_Master/service_account.json',
    'C:/Users/sierr/Downloads/service_account.json'
]

# Get Gemini Key from env
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") 

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

COLLECTION_NAME = 'properties'

def init_firebase():
    """Initializes Firebase Admin SDK."""
    key_path = None
    for p in POSSIBLE_KEYS:
        if os.path.exists(p):
            key_path = p
            break
            
    if not key_path:
        print("❌ Error: Firebase Service Account Key not found.")
        return None
    
    print(f"🔑 Using Service Account: {key_path}")
    cred = credentials.Certificate(key_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    return firestore.client()

# ---------------------------------------------------------
# 2. SCHEMA & MAPPING
# ---------------------------------------------------------

COMPOUND_CODES = {
    'mivida': 'MI',
    'hyde park': 'HP',
    'cairo festival city': 'CFC',
    'mountain view': 'MV',
    'palm hills': 'PA',
    'arcadia': 'AR',
    'lakeview': 'LA',
    'rehab': 'RH',
    'madinaty': 'MD',
}

def generate_unit_code(compound, beds, furnishing, price, offer_type):
    c_code = COMPOUND_CODES.get(compound.lower(), compound[:2].upper())
    f_code = 'F' if furnishing == 'furnished' else ('S' if furnishing == 'semi-furnished' else 'U')
    
    if offer_type == 'rent':
        p_code = f"{int(price/1000)}K" if price >= 1000 else f"{int(price)}"
    else:
        p_code = f"{price/1000000:.1f}M" if price >= 1000000 else f"{int(price/1000)}K"
        
    return f"{c_code}-{beds}{f_code}-{p_code}"

def map_row(row):
    location = str(row.get('Location', 'Unknown'))
    price = 0
    try:
        price = float(str(row.get('Price', 0)).replace(',', ''))
    except: pass
    
    beds = 0
    try:
        beds = int(row.get('Beds', 0))
    except: pass
    
    furnishing = 'unfurnished' # Default
    # Heuristics based on "Type" or titles
    title = str(row.get('Title', '')).lower()
    if 'furnish' in title or 'مفروش' in title: furnishing = 'furnished'
    
    raw_type = str(row.get('Type', 'apartment')).lower()
    ut = 'apartment'
    if 'villa' in raw_type: ut = 'villa'
    elif 'town' in raw_type: ut = 'townhouse'
    
    # Normalized Key
    compound_norm = location.lower().replace(' ', '')
    price_bucket = int(price // 500000)
    norm_key = f"{compound_norm}_b{beds}_p{price_bucket}_f{furnishing[0]}"
    
    unit_code = generate_unit_code(location, beds, furnishing, price, 'sale')

    return {
        "unit_code": unit_code,
        "title_en": str(row.get('Title', f"{beds}BR Unit in {location}")),
        "title_ar": "",
        "compound_name": location,
        "bedrooms": beds,
        "unit_type": ut,
        "furnishing": furnishing,
        "price": price,
        "currency": "EGP",
        "price_egp_normalized": price,
        "status": "available",
        "offer_type": "sale",
        "source": "bulk_excel_integration",
        "normalized_key": norm_key,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "is_public": True,
        "is_featured": False,
        "stale_flag": False,
        "gallery_urls": []
    }

# ---------------------------------------------------------
# 3. EXECUTION
# ---------------------------------------------------------

def main():
    print("💎 Sierra Blu: Institutional Integration Sequence Initiated")
    db = init_firebase()
    if not db: return

    df = pd.read_excel(EXCEL_PATH)
    print(f"📈 Analyzing {len(df)} records from Master Portfolio...")

    gm = GravityMemory(vault_path="../11_Core_Intelligence/memory/vault.json") if GravityMemory else None
    
    success_count = 0
    duplicate_count = 0
    
    # Use Firestore Batch for efficiency
    batch = db.batch()
    batch_size = 0
    
    for i, row in df.iterrows():
        data = map_row(row)
        
        # Deduplication check
        dup_query = db.collection(COLLECTION_NAME).where('normalized_key', '==', data['normalized_key']).limit(1).get()
        if len(dup_query) > 0:
            duplicate_count += 1
            continue
            
        doc_ref = db.collection(COLLECTION_NAME).document()
        batch.set(doc_ref, data)
        batch_size += 1
        
        if batch_size >= 450: # Firestore limit is 500
            batch.commit()
            print(f"✅ Committed batch of {batch_size} records...")
            batch = db.batch()
            batch_size = 0
            
        success_count += 1
        if gm:
            gm.ingest_fact("compounds", data['compound_name'], {"code": data['unit_code'], "price": data['price']}, weight=1)

    if batch_size > 0:
        batch.commit()
    
    print("\n🏁 Integration Summary:")
    print(f"✨ Successfully Ingested: {success_count} units")
    print(f"⏩ Duplicates Skipped: {duplicate_count}")
    print(f"🏛️ Total Portfolio Records: {success_count + duplicate_count}")

if __name__ == "__main__":
    main()
