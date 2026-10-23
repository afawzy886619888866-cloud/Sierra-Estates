import os
import re
import json
import time
import random
import requests
import pandas as pd
from datetime import datetime, timedelta

API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
API_KEY = os.getenv("EVOLUTION_API_KEY", "sierra_secret_key_2026")
IS_CI = os.getenv("GITHUB_ACTIONS") == "true" or os.getenv("CI_SINGLE_RUN") == "true"

INSTANCES = [
    "sierra_01032206443",
    "sierra_01092048333",
    "sierra_01031622600",
    "sierra_01061399688"
]

SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk/export?format=csv"
CHECKPOINT_FILE = "sierra_checkpoint.json"
MASTER_DB_FILE = "Sierra_Estates_Master_Units.xlsx"

GREETINGS = [
    "Hello,",
    "Good day,",
    "Greetings from Sierra Estates,",
    "Hi there,"
]

MESSAGES = [
    "This is the property management and marketing team at Sierra PropTech. Is your listed property still available for direct marketing to our verified clients?",
    "We are reaching out from Sierra Estates regarding your property listing—we have qualified clients ready for immediate viewing and closing.",
    "This is Sierra Asset Management. We would love to confirm the latest details of your unit so we can feature it to our active buyer/tenant network."
]

def get_cairo_time():
    return datetime.utcnow() + timedelta(hours=2)

def is_day_shift():
    now = get_cairo_time()
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

def detect_phone_col(df):
    for col in df.columns:
        if any(k in str(col).lower() for k in ['phone', 'mobile', 'contact', 'tel', 'number']):
            return col
    return df.columns[1] if len(df.columns) > 1 else df.columns[0]

def fetch_sheet_data(retries=3):
    for attempt in range(retries):
        try:
            return pd.read_csv(SHEET_CSV_URL)
        except Exception as e:
            print(f"[Sheet Sync] Attempt ({attempt + 1}/{retries}) failed to download Google Sheet: {e}")
            time.sleep(5 * (attempt + 1))
    return None

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_row": 0, "instance_idx": 0, "contacted": [], "failed_dead_letter": []}

def save_checkpoint(row, inst_idx, contacted, failed_dlq=None):
    tmp_file = f"{CHECKPOINT_FILE}.tmp"
    payload = {
        "last_row": row,
        "instance_idx": inst_idx,
        "contacted": list(contacted),
        "failed_dead_letter": list(failed_dlq) if failed_dlq is not None else [],
        "updated_at": get_cairo_time().strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, CHECKPOINT_FILE)

def is_instance_connected(instance):
    url = f"{API_URL}/instance/connectionState/{instance}"
    headers = {"apikey": API_KEY}
    try:
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            data = res.json()
            state = data.get("instance", {}).get("state") or data.get("state")
            return state == "open"
    except Exception:
        pass
    return False

def send_msg(instance, phone, text, retries=2):
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {"apikey": API_KEY, "Content-Type": "application/json"}
    payload = {"number": phone, "text": text, "delay": 1500}
    for attempt in range(retries):
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=20)
            if res.status_code in [200, 201]:
                return True
        except Exception:
            time.sleep(3 * (attempt + 1))
    return False

def process_inventory_coding(df):
    print("\n[Inventory Engine] Auditing sheet data, generating unit codes, and building Property Finder listings...")
    if df is None or df.empty:
        print("[Inventory Engine] Sheet is empty or unreachable.")
        return

    df_master = pd.DataFrame()
    if os.path.exists(MASTER_DB_FILE):
        try:
            df_master = pd.read_excel(MASTER_DB_FILE)
        except Exception:
            pass

    new_rows = []
    phone_col = detect_phone_col(df)

    for idx, row in df.iterrows():
        phone = clean_phone(row[phone_col])
        if not phone:
            continue

        price = str(row.get('Monthly Rent (EGP)', row.get('Price', 'TBD')))
        dedup_key = f"{phone}_{price}"

        if not df_master.empty and "Dedup Key" in df_master.columns and dedup_key in df_master["Dedup Key"].astype(str).values:
            continue

        compound = str(row.get('Compound / Project', row.get('Compound', 'New Cairo')))
        prop_type = str(row.get('Property Type', 'Apartment'))
        beds = str(row.get('Beds', row.get('Bedrooms', '3')))

        c_code = "NC"
        c_lower = compound.lower()
        if "mivida" in c_lower: c_code = "MIV"
        elif "rehab" in c_lower: c_code = "REH"
        elif "madinaty" in c_lower: c_code = "MAD"
        elif "square" in c_lower: c_code = "SQR"
        elif "lake" in c_lower: c_code = "LKV"

        unit_code = f"{c_code}-APT-{beds}B-PF"
        pf_title_en = f"{prop_type} for Rent/Sale in {compound} | {beds} Bedrooms | Ref {unit_code}"
        pf_desc_en = (
            f"Prime {prop_type} available now in {compound}.\n"
            f"Layout: {beds} Bedrooms.\n"
            f"Asking Price: {price} EGP.\n"
            f"Reference Code: {unit_code}\n"
            f"Contact Sierra Estates Management directly to schedule a private viewing."
        )

        new_rows.append({
            "Unit Code": unit_code,
            "Compound": compound,
            "Property Type": prop_type,
            "Bedrooms": beds,
            "Price": price,
            "Owner Phone": phone,
            "Dedup Key": dedup_key,
            "PF Title EN": pf_title_en,
            "PF Desc EN": pf_desc_en,
            "Processed At": get_cairo_time().strftime("%Y-%m-%d %H:%M")
        })

    if new_rows:
        df_new = pd.DataFrame(new_rows)
        df_final = pd.concat([df_master, df_new], ignore_index=True)
        df_final.to_excel(MASTER_DB_FILE, index=False)
        print(f"[Inventory Engine] Coded and saved {len(new_rows)} new units to {MASTER_DB_FILE}")
    else:
        print("[Inventory Engine] No new unrecorded units found.")

def run_cycle():
    df = fetch_sheet_data()
    cp = load_checkpoint()
    last_row = cp.get("last_row", 0)
    inst_idx = cp.get("instance_idx", 0) % len(INSTANCES)
    contacted = set(cp.get("contacted", []))
    failed_dlq = set(cp.get("failed_dead_letter", []))

    process_inventory_coding(df)

    if is_day_shift():
        connected_inst = None
        for _ in range(len(INSTANCES)):
            candidate = INSTANCES[inst_idx]
            if is_instance_connected(candidate):
                connected_inst = candidate
                break
            print(f"[Health Check] Instance [{candidate}] is not connected/open. Trying next instance...")
            inst_idx = (inst_idx + 1) % len(INSTANCES)

        if not connected_inst:
            print("[Warning] No connected WhatsApp instances available. Skipping outbound messaging for this cycle.")
            save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
            return

        print(f"\n[Day Shift] Active WhatsApp Instance: [{connected_inst}]")
        print("[Day Shift] Target quota: 30 messages over 30 minutes...")

        shift_start = time.time()
        sent_count = 0

        if df is not None and not df.empty:
            phone_col = detect_phone_col(df)
            rows_total = len(df)

            while sent_count < 30 and last_row < rows_total and is_day_shift():
                raw_val = df.iloc[last_row][phone_col]
                phone = clean_phone(raw_val)

                if phone and phone not in contacted:
                    msg = f"{random.choice(GREETINGS)}\n{random.choice(MESSAGES)}"
                    print(f"[{connected_inst}] Sending ({sent_count + 1}/30) to: {phone}")
                    if send_msg(connected_inst, phone, msg):
                        contacted.add(phone)
                        print("  -> Sent successfully")
                    else:
                        failed_dlq.add(phone)
                        print("  -> Send failed (added to dead-letter queue)")

                    sent_count += 1
                    last_row += 1
                    save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
                    if not IS_CI:
                        time.sleep(random.randint(45, 65))
                else:
                    last_row += 1
                    save_checkpoint(last_row, inst_idx, contacted, failed_dlq)

            if last_row >= rows_total:
                print("[Day Shift] Reached end of sheet. Resetting row pointer to 0.")
                last_row = 0

        inst_idx = (inst_idx + 1) % len(INSTANCES)
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)

        if not IS_CI:
            elapsed = time.time() - shift_start
            rem = 1800 - elapsed
            if rem > 0 and is_day_shift():
                print(f"[Day Shift] Quota finished for [{connected_inst}]. Cooling down for {int(rem / 60)} minutes...")
                time.sleep(rem)
    else:
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
        if not IS_CI:
            now = get_cairo_time()
            target = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0) if now.hour >= 21 else now.replace(hour=10, minute=0, second=0, microsecond=0)
            sleep_sec = int((target - now).total_seconds())
            print(f"[Night Shift] Outbound messaging paused outside 10:00-21:00. Resuming in {round(sleep_sec / 3600, 1)} hours...")
            time.sleep(min(sleep_sec, 1800))

def main():
    print("=== Sierra PropTech 24/7 Workflow Orchestrator Started ===")
    if IS_CI:
        run_cycle()
        print("=== CI Single Cycle Completed Successfully ===")
    else:
        while True:
            run_cycle()

if __name__ == "__main__":
    main()
