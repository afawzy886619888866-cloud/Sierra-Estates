import os
import re
import sys
import random
import requests
from fastapi import FastAPI, Request
import uvicorn

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

app = FastAPI(title="Sierra PropTech Core Intelligence Engine")

def _load_env_key():
    for env_path in [".env", r"H:\Sierra Estates\.env", r"H:\Sierra Estates\workflows\.env"]:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith(("OPENWA_ADMIN_API_KEY=", "WHATSAPP_API_KEY=")):
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return "sierra_secret_key_2026"

API_URL = os.getenv("EVOLUTION_API_URL", "http://127.0.0.1:2785")
API_KEY = os.getenv("EVOLUTION_API_KEY") or _load_env_key()
DIRECT_MGMT_PHONE = "+201092048333"

INSTANCE_LINE_MAP = {
    "sierra_01032206443": "line-1",
    "sierra_01031622600": "line-2",
    "sierra_01061399688": "line-3",
    "sierra_01092048333": "line-4"
}

COMPOUNDS = [
    "New Cairo", "Mivida", "Al Rehab", "Madinaty", "The Square",
    "Lake View", "Hyde Park", "Mountain View", "Palm Hills", "Zayed"
]
PROPERTY_TYPES = [
    "Apartment", "Duplex", "Villa", "Townhouse", "Twinhouse",
    "Penthouse", "Studio", "Chalet", "Office"
]

seen_dedup_keys = set()

def normalize_phone(raw_phone: str):
    if not raw_phone:
        return None
    digits = re.sub(r"\D", "", str(raw_phone).split("@")[0])
    if digits.startswith("0020"):
        digits = digits[4:]
    elif digits.startswith("201") and len(digits) == 12:
        return digits
    elif digits.startswith("01") and len(digits) == 11:
        return "2" + digits
    elif digits.startswith("1") and len(digits) == 10:
        return "20" + digits
    return digits if len(digits) >= 10 else None

def send_whatsapp_message(instance: str, number: str, text: str):
    line_id = INSTANCE_LINE_MAP.get(instance, instance)
    headers = {"x-api-key": API_KEY, "apikey": API_KEY, "Content-Type": "application/json"}
    try:
        res = requests.post(
            f"{API_URL}/api/messages/send-text",
            json={"chatId": number, "text": text},
            headers=headers,
            timeout=15
        )
        if res.status_code in [200, 201]:
            return True
        res_line = requests.post(
            f"{API_URL}/api/sessions/{line_id}/messages/send-text",
            json={"chatId": number, "text": text},
            headers=headers,
            timeout=15
        )
        if res_line.status_code in [200, 201]:
            return True
        res_evo = requests.post(
            f"{API_URL}/message/sendText/{instance}",
            json={"number": number, "text": text, "delay": 1200},
            headers=headers,
            timeout=15
        )
        return res_evo.status_code in [200, 201]
    except Exception:
        return False

def analyze_payload(event_type: str, text: str, sender_phone: str):
    phone = normalize_phone(sender_phone)
    lower_text = (text or "").lower()

    # 1. [CALL_REJECTED]
    if event_type == "CALL_REJECTED" or "call" in event_type.lower():
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
