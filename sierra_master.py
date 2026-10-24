import os
import re
import sys
import json
import time
import random
import requests
import pandas as pd
from datetime import datetime, timedelta

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
API_KEY = os.getenv("EVOLUTION_API_KEY", "sierra_secret_key_2026")
IS_CI = os.getenv("GITHUB_ACTIONS") == "true" or os.getenv("CI_SINGLE_RUN") == "true"

INSTANCES = [
    "sierra_01032206443",
    "sierra_01092048333",
    "sierra_01031622600",
    "sierra_01061399688"
]

SHEET_ID = os.getenv("UNITS_SHEET_ID", "1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk")
SHEET_GID = os.getenv("UNITS_SHEET_GID", "1127958606")
SHEET_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&gid={SHEET_GID}"

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
    "We are reaching out from Sierra Estates regarding your property listing - we have qualified clients ready for immediate viewing and closing.",
    "This is Sierra Asset Management. We would love to confirm the latest details of your unit so we can feature it to our active buyer/tenant network."
]

def get_cairo_time():
    return datetime.utcnow() + timedelta(hours=2)

def is_day_shift():
    now = get_cairo_time()
    return 10 <= now.hour < 21

def clean_phone(raw):
    if pd.isna(raw) or raw is None:
        return None
    raw_str = str(raw).split('.')[0].strip()
    digits = re.sub(r'\D', '', raw_str)
    if digits.startswith('0020'):
        digits = digits[4:]
    elif digits.startswith('20') and len(digits) == 12:
        return digits
    elif digits.startswith('0'):
        digits = digits[1:]
    if len(digits) == 10 and digits.startswith(('10', '11', '12', '15')):
        return '20' + digits
    elif len(digits) >= 10:
        return digits
    return None

def detect_phone_col(df):
    for col in df.columns:
        if any(k in str(col).lower() for k in ['mobile', 'phone', 'contact', 'tel', 'number']):
            return col
    return df.columns[1] if len(df.columns) > 1 else df.columns[0]

def fetch_sheet_data(retries=3):
    for attempt in range(retries):
        try:
            df = pd.read_csv(SHEET_CSV_URL, dtype=str)
            df.columns = [str(c).strip() for c in df.columns]
            return df
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
        "contacted": sorted(list(contacted)),
        "failed_dead_letter": sorted(list(failed_dlq)) if failed_dlq is not None else [],
        "updated_at": get_cairo_time().strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, CHECKPOINT_FILE)

def is_instance_connected(instance):
    url = f"{API_URL}/instance/connectionState/{instance}"
    headers = {"apikey": API_KEY}
    try:
        res = requests.get(url, headers=headers, timeout=6)
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

def get_val(row, *keys, default=""):
    for k in keys:
        val = row.get(k)
        if pd.notna(val) and str(val).strip() != "" and str(val).strip().lower() != "nan":
            return str(val).strip()
    return default

def process_inventory_coding(df):
    print("\n[Inventory Engine] Auditing sheet data, generating unit codes, and building Property Finder listings...")
    if df is None or df.empty:
        print("[Inventory Engine] Sheet is empty or unreachable.")
        return

    df_master = pd.DataFrame()
    if os.path.exists(MASTER_DB_FILE):
        try:
            df_master = pd.read_excel(MASTER_DB_FILE, dtype=str)
        except Exception:
            pass

    new_rows = []
    seen_in_batch = set()
    if not df_master.empty and "Dedup Key" in df_master.columns:
        seen_in_batch.update(df_master["Dedup Key"].astype(str).tolist())

    phone_col = detect_phone_col(df)

    for idx, row in df.iterrows():
        phone = clean_phone(row.get(phone_col))
        if not phone:
            continue

        raw_price = get_val(row, "Unit Price", "Monthly Rent (EGP)", "Price", default="0")
        price_digits = re.sub(r"\D", "", raw_price) or "0"
        dedup_key = f"{phone}_{price_digits}"

        if dedup_key in seen_in_batch:
            continue
        seen_in_batch.add(dedup_key)

        compound = get_val(row, "Location", "Compound / Project", "Compound", default="New Cairo")
        prop_type = get_val(row, "Property Tybe", "Property Type", default="Apartment")
        raw_beds = get_val(row, "bedrooms", "Beds", "Bedrooms", default="3")
        beds = raw_beds.split(".")[0] if raw_beds else "3"
        deal_type = get_val(row, "Type", default="Rent").capitalize()
        area_sqm = get_val(row, "Space", default="N/A").split(".")[0]
        finishing = get_val(row, "Furnished or not", default="Fully Finished")
        availability = get_val(row, "Availablty", "Availability", default="Available")

        c_code = "NC"
        c_lower = compound.lower()
        if "mivida" in c_lower: c_code = "MIV"
        elif "rehab" in c_lower: c_code = "REH"
        elif "madinaty" in c_lower: c_code = "MAD"
        elif "square" in c_lower: c_code = "SQR"
        elif "lake" in c_lower: c_code = "LKV"

        existing_code = get_val(row, "Code", default="")
        unit_code = existing_code if existing_code else f"{c_code}-APT-{beds}B-PF"

        pf_title_en = f"{prop_type} for {deal_type} in {compound} | {beds} Bedrooms | Ref {unit_code}"
        pf_desc_en = (
            f"Prime {prop_type} available now for {deal_type} in {compound}.\n"
            f"Layout: {beds} Bedrooms | Area: {area_sqm} sqm | Finishing: {finishing}.\n"
            f"Asking Price: {raw_price} EGP.\n"
            f"Reference Code: {unit_code}\n"
            f"Contact Sierra Estates Management directly to schedule a private viewing."
        )

        new_rows.append({
            "Unit Code": unit_code,
            "Compound": compound,
            "Deal Type": deal_type,
            "Property Type": prop_type,
            "Bedrooms": beds,
            "Area (sqm)": area_sqm,
            "Finishing": finishing,
            "Availability": availability,
            "Price (EGP)": price_digits,
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
        print(f"[Inventory Engine] Coded and saved {len(new_rows)} new units to {MASTER_DB_FILE} (Total: {len(df_final)})")
    else:
        print(f"[Inventory Engine] No new unrecorded units found. Master DB is up to date ({len(df_master)} units).")

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
                raw_val = df.iloc[last_row].get(phone_col)
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
        print("[Night Shift] Outside Cairo daytime window (10:00-21:00). Inventory coding completed; outbound messaging paused.")
        save_checkpoint(last_row, inst_idx, contacted, failed_dlq)
        if not IS_CI:
            now = get_cairo_time()
            target = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0) if now.hour >= 21 else now.replace(hour=10, minute=0, second=0, microsecond=0)
            sleep_sec = int((target - now).total_seconds())
            print(f"[Night Shift] Resuming outbound shifts in {round(sleep_sec / 3600, 1)} hours...")
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
