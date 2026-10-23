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
            "Property Type": prop_type,TED" or "call" in event_type.lower():
        fallback_msg = (
            f"Hello! This line is dedicated to automated inquiries and viewing reservations. "
            f"Your number has been logged, and an advisor will reach out shortly. "
            f"If your inquiry is urgent or you need to book an immediate viewing, please reply with your requirements here "
            f"or call direct management at: {DIRECT_MGMT_PHONE}."
        )
        return {
            "action": "REJECT_CALL_REPLY",
            "data": {"caller_phone": phone},
            "outgoing_message": fallback_msg
        }

    # 2. [OWNER_OUTREACH]
    if "[owner_outreach]" in lower_text:
        greeting = random.choice(["Hello", "Good day", "Greetings"])
        pitch = random.choice([
            "we have verified clients actively looking for properties in your area and would love to match them with your unit via our registered platform.",
            "our team at Sierra PropTech can connect your property directly with pre-qualified buyers and tenants with zero hassle.",
            "would you be open to featuring your property to our vetted client network for an immediate viewing?"
        ])
        outreach_msg = f"{greeting}! Are you still offering your property on the market? At Sierra Estates, {pitch} Reply YES and we will handle the rest."
        return {
            "action": "SEND_MESSAGE",
            "data": {"target_phone": phone, "campaign": "OWNER_OUTREACH"},
            "outgoing_message": outreach_msg
        }

    # 3. [INBOUND_LEAD] vs [SCRAPED_AD]
    is_inquiry = any(w in lower_text for w in ["interested", "viewing", "visit", "available?", "details", "how much", "looking for", "book"])
    if is_inquiry and not any(w in lower_text for w in ["for sale", "for rent", "sqm", "bedrooms"]):
        reply_msg = (
            "Welcome to Sierra PropTech! Thank you for reaching out. "
            "This unit features a prime location inside the compound and a spacious, modern layout with premium finishing. "
            "What day and time work best for you to schedule an on-site viewing with our advisor?"
        )
        return {
            "action": "SEND_MESSAGE",
            "data": {"lead_phone": phone, "intent": "INBOUND_LEAD"},
            "outgoing_message": reply_msg
        }

    # 4. [SCRAPED_AD] Extraction & Normalization
    compound = next((c for c in COMPOUNDS if c.lower() in lower_text), "New Cairo")
    deal_type = "Rent" if any(w in lower_text for w in ["rent", "monthly", "lease"]) else "Resale"
    prop_type = next((p for p in PROPERTY_TYPES if p.lower() in lower_text), "Apartment")

    area_match = re.search(r"(\d{2,4})\s*(?:sqm|m2|m²|meter)", lower_text)
    area_sqm = int(area_match.group(1)) if area_match else None

    beds_match = re.search(r"(\d+)\s*(?:bed|br|bedroom|rooms)", lower_text)
    bedrooms = int(beds_match.group(1)) if beds_match else None

    baths_match = re.search(r"(\d+)\s*(?:bath|wc|bathroom)", lower_text)
    bathrooms = int(baths_match.group(1)) if baths_match else None

    price_match = re.search(r"(?:price|egp|rent|for)\s*[:\-]?\s*([\d,]{4,12})", lower_text)
    if not price_match:
        price_match = re.search(r"\b(\d{1,3}(?:,\d{3})+|\d{5,9})\b", lower_text)
    price_egp = int(price_match.group(1).replace(",", "")) if price_match else 0

    finishing = None
    if "furnished" in lower_text and "unfurnished" not in lower_text:
        finishing = "Furnished"
    elif "fully finished" in lower_text or "super lux" in lower_text:
        finishing = "Fully Finished"
    elif "semi" in lower_text:
        finishing = "Semi-Finished"
    elif "core" in lower_text or "shell" in lower_text:
        finishing = "Core & Shell"

    source_type = "Broker" if any(w in lower_text for w in ["broker", "commission", "agency", "real estate"]) else "Direct Owner"
    dedup_key = f"{phone}_{price_egp}"

    extracted = {
        "compound": compound,
        "deal_type": deal_type,
        "property_type": prop_type,
        "area_sqm": area_sqm,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "price_egp": price_egp,
        "finishing": finishing,
        "contact_phone": phone,
        "source_type": source_type,
        "dedup_key": dedup_key
    }

    if dedup_key in seen_dedup_keys:
        return {"action": "SKIP_DUPLICATE", "data": extracted, "outgoing_message": None}

    seen_dedup_keys.add(dedup_key)
    return {"action": "SAVE_INVENTORY", "data": extracted, "outgoing_message": None}

@app.post("/webhook")
async def evolution_webhook(request: Request):
    body = await request.json()
    event = body.get("event", "")
    instance = body.get("instance", "sierra_01032206443")
    data = body.get("data", {})

    if "call" in event.lower():
        caller = data.get("from") or data.get("remoteJid", "")
        result = analyze_payload("CALL_REJECTED", "", caller)
        if result["outgoing_message"] and result["data"]["caller_phone"]:
            send_whatsapp_message(instance, result["data"]["caller_phone"], result["outgoing_message"])
        return result

    key = data.get("key", {})
    if key.get("fromMe"):
        return {"action": "IGNORE_SELF", "data": None, "outgoing_message": None}

    sender = key.get("remoteJid", "")
    msg_obj = data.get("message", {})
    text = msg_obj.get("conversation") or msg_obj.get("extendedTextMessage", {}).get("text") or ""

    result = analyze_payload("MESSAGE", text, sender)
    if result["outgoing_message"] and normalize_phone(sender):
        send_whatsapp_message(instance, normalize_phone(sender), result["outgoing_message"])
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
