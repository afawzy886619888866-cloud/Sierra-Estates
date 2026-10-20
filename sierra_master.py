import os
import re
import json
import time
import random
import requests
import pandas as pd
from datetime import datetime, timedelta

# ==========================================
# CONFIGURATION
# ==========================================
API_URL = "http://localhost:8080"
API_KEY = "sierra_secret_key_2026"

INSTANCES = [
    "sierra_01032206443",
    "sierra_01092048333",
    "sierra_01031622600",
    "sierra_01061399688"
]

SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/export?format=csv"
CHECKPOINT_FILE = "sierra_checkpoint.json"
MASTER_DB_FILE = "Sierra_Estates_Master_Units.xlsx"

COMPOUND_CODES = {
    "mivida": "MIV",
    "rehab": "REH",
    "madinaty": "MAD",
    "the square": "SQR",
    "square": "SQR",
    "lake view": "LKV",
    "hyde park": "HYD",
    "eastown": "EST",
    "villette": "VIL",
    "katameya heights": "KH",
    "katameya dunes": "KD",
    "palm hills": "PH",
    "fifth square": "FSQ",
    "cairo festival city": "CFC",
    "gardenia": "GAR",
    "5th settlement": "5TH",
    "new cairo": "NC"
}

# Randomized outreach copy (Spintax variation)
GREETINGS = [
    "Hello,",
    "Good day,",
    "Dear Property Owner,",
    "Hi there,"
]

MESSAGES = [
    "Reaching out from Sierra Estates Advisory. We have active qualified clients looking for units in your area. Is your property still available?",
    "This is Sierra Asset Management regarding your listed property. We would like to coordinate direct marketing and viewings with our verified buyers/tenants.",
    "Following up from Sierra PropTech. We are updating our inventory—could you confirm if your listed unit is currently available for rent or resale?"
]

# ==========================================
# TIME & SHIFT CONTROLS (10 AM - 9 PM)
# ==========================================
def is_day_shift():
    now = datetime.now()
    return 10 <= now.hour < 21

def clean_phone(raw):
    if pd.isna(raw):
        return None
    raw_str = str(raw).split('.')[0].strip()
    digits = re.sub(r'\D', '', raw_str)
    if digits.startswith('201') and len(digits) == 12:
        return digits
    elif digits.startswith('01') and len(digits) == 11:
        return '2' + digits
    elif digits.startswith('1') and len(digits) == 10:
        return '20' + digits
    elif len(digits) >= 10:
        return digits
    return None

def fetch_sheet_data():
    try:
        df = pd.read_csv(SHEET_CSV_URL)
        return df
    except Exception as e:
        print(f"[Sheet Sync] Unable to fetch Google Sheet at this moment: {e}")
        return None

# ==========================================
# CHECKPOINT & ANTI-DUPLICATION
# ==========================================
def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_row": 0, "instance_idx": 0, "contacted": []}

def save_checkpoint(row, inst_idx, contacted):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "last_row": row,
            "instance_idx": inst_idx,
            "contacted": list(contacted),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }, f, ensure_ascii=False, indent=2)

def send_whatsapp_msg(instance, phone, text):
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {"apikey": API_KEY, "Content-Type": "application/json"}
    payload = {"number": phone, "text": text, "delay": 1500}
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=20)
        return res.status_code in [200, 201]
    except Exception:
        return False

# ==========================================
# NIGHT SHIFT: PARSING, CODING & PF DOSSIERS
# ==========================================
def process_night_shift(df):
    print("\n🌙 [Night Shift Active] Deduplicating, Smart Coding & Generating Property Finder Dossiers...")
    if df is None or df.empty:
        print("No sheet data available for processing.")
        return

    df_master = pd.DataFrame()
    if os.path.exists(MASTER_DB_FILE):
        try:
            df_master = pd.read_excel(MASTER_DB_FILE)
        except Exception:
            pass

    phone_col = None
    for col in df.columns:
        if any(k in str(col).lower() for k in ['phone', 'mobile', 'owner phone', 'هاتف', 'موبايل']):
            phone_col = col
            break
    if not phone_col:
        phone_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

    new_rows = []
    for idx, row in df.iterrows():
        phone = clean_phone(row[phone_col])
        if not phone:
            continue

        price_raw = str(row.get('Monthly Rent (EGP)', row.get('Price', 'Ask Price')))
        dedup_key = f"{phone}_{price_raw}"

        if not df_master.empty and "Dedup Key" in df_master.columns and dedup_key in df_master["Dedup Key"].astype(str).values:
            continue

        compound = str(row.get('Compound / Project', row.get('Compound', 'New Cairo')))
        prop_type = str(row.get('Property Type', 'Apartment'))
        beds = str(row.get('Beds', row.get('Bedrooms', '3')))
        area = str(row.get('Area (m²)', row.get('Area', 'Spacious layout')))
        finishing = str(row.get('Finishing', 'Fully Finished'))

        # Generate Sierra Smart Code
        c_code = "NC"
        for k, v in COMPOUND_CODES.items():
            if k in compound.lower():
                c_code = v
                break
        
        t_code = "APT"
        if "villa" in prop_type.lower(): t_code = "VIL"
        elif "duplex" in prop_type.lower(): t_code = "DUP"
        elif "townhouse" in prop_type.lower(): t_code = "TWN"

        unit_code = f"{c_code}-{t_code}-{beds}B-PF"

        # Property Finder SEO English Listing
        pf_title_en = f"Luxury {beds}BR {prop_type} for Rent/Sale in {compound} | Ref: {unit_code}"
        pf_desc_en = (
            f"Exclusive property presented by Sierra Estates.\n\n"
            f"Prime {prop_type} located in {compound}, New Cairo.\n"
            f"- Layout: {beds} Bedrooms with modern distribution\n"
            f"- Area: {area} SQM\n"
            f"- Finishing: {finishing}\n"
            f"- Asking Price: {price_raw}\n"
            f"- Internal Reference: {unit_code}\n\n"
            f"Schedule a viewing appointment today with our senior advisory team."
        )

        new_rows.append({
            "Unit Code": unit_code,
            "Compound": compound,
            "Property Type": prop_type,
            "Bedrooms": beds,
            "Area (sqm)": area,
            "Price": price_raw,
            "Finishing": finishing,
            "Owner Phone": phone,
            "Dedup Key": dedup_key,
            "PF Title EN": pf_title_en,
            "PF Desc EN": pf_desc_en,
            "Processed At": datetime.now().strftime("%Y-%m-%d %H:%M")
        })

    if new_rows:
        df_new = pd.DataFrame(new_rows)
        df_final = pd.concat([df_master, df_new], ignore_index=True)
        df_final.to_excel(MASTER_DB_FILE, index=False)
        print(f"✓ Coded and saved {len(new_rows)} new listings with Property Finder dossiers to: {MASTER_DB_FILE}")
    else:
        print("✓ All inventory in the Google Sheet is already fully coded and synchronized.")

# ==========================================
# MAIN 24/7 ORCHESTRATION LOOP
# ==========================================
def main():
    print("==========================================================")
    print("  SIERRA ESTATES 24/7 MULTI-NUMBER AUTOMATION ENGINE")
    print("==========================================================")
    
    while True:
        df = fetch_sheet_data()
        cp = load_checkpoint()
        last_row = cp.get("last_row", 0)
        inst_idx = cp.get("instance_idx", 0)
        contacted = set(cp.get("contacted", []))

        if is_day_shift():
            active_inst = INSTANCES[inst_idx]
            print(f"\n☀️ [Day Shift] Operating Instance: [{active_inst}]")
            print(f"Target: 30 messages over the next 30 minutes...")

            shift_start = time.time()
            sent_count = 0

            if df is not None:
                phone_col = None
                for col in df.columns:
                    if any(k in str(col).lower() for k in ['phone', 'mobile', 'owner phone', 'هاتف', 'موبايل']):
                        phone_col = col
                        break
                if not phone_col:
                    phone_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

                total_rows = len(df)
                while sent_count < 30 and last_row < total_rows and is_day_shift():
                    raw_val = df.iloc[last_row][phone_col]
                    phone = clean_phone(raw_val)

                    if phone and phone not in contacted:
                        message_body = f"{random.choice(GREETINGS)}\n\n{random.choice(MESSAGES)}"
                        print(f"[{active_inst}] Dispatching ({sent_count + 1}/30) to: {phone}")
                        success = send_whatsapp_msg(active_inst, phone, message_body)

                        if success:
                            contacted.add(phone)
                            print("  ✓ Sent successfully")
                        else:
                            print("  ✗ Failed or unreachable")

                        sent_count += 1
                        last_row += 1
                        save_checkpoint(last_row, inst_idx, contacted)

                        # Humanized safe delay between 45 and 65 seconds
                        time.sleep(random.randint(45, 65))
                    else:
                        last_row += 1
                        save_checkpoint(last_row, inst_idx, contacted)

            # Enforce 30-minute shift interval before handing over to the next instance
            elapsed = time.time() - shift_start
            remaining = 1800 - elapsed
            if remaining > 0 and is_day_shift():
                print(f"Quota completed for [{active_inst}]. Resting {int(remaining / 60)} minutes before rotation...")
                time.sleep(remaining)

            # Handover checkpoint to the next phone instance
            inst_idx = (inst_idx + 1) % len(INSTANCES)
            save_checkpoint(last_row, inst_idx, contacted)
            print(f"-> Checkpoint updated. Handing shift over to: [{INSTANCES[inst_idx]}]")

        else:
            # 9:00 PM to 10:00 AM: Quiet hours, execute data processing and Property Finder listing generation
            process_night_shift(df)
            now = datetime.now()
            next_10am = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0) if now.hour >= 21 else now.replace(hour=10, minute=0, second=0, microsecond=0)
            sleep_duration = int((next_10am - now).total_seconds())
            print(f"🌙 System in nocturnal mode. WhatsApp messaging resumes at 10:00 AM ({round(sleep_duration / 3600, 1)} hrs remaining)...")
            time.sleep(min(sleep_duration, 1800))

if __name__ == "__main__":
    main()
