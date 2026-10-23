"""
Sierra PropTech — Inbound Webhook & Core Intelligence Engine (Evolution API)
Hardened edition (2026-10-23). English codebase.

WHAT THIS IS
    FastAPI server that receives Evolution API (WhatsApp) webhooks and:
      1. Auto-replies to rejected calls (with optional direct-management line)
      2. Handles [owner_outreach] campaign replies
      3. Detects inbound leads vs scraped ads
      4. Extracts + normalizes listing data (compound, price, area, beds, baths,
         finishing, source type) with dedup

SECURITY MODEL (differs from the original draft on purpose)
    - NO credentials, phone numbers, or sheet IDs are hardcoded. Everything
      comes from environment variables. This file lives in a PUBLIC repo.
    - Optional shared-secret guard (WEBHOOK_SECRET) for the /webhook route,
      because an unauthenticated webhook endpoint lets anyone inject fake
      leads / trigger outbound messages from your WhatsApp line.
    - Every outbound attempt is logged with its true result. No fake success.

ENVIRONMENT
    EVOLUTION_API_URL           Evolution API base (default http://localhost:8080)
    EVOLUTION_API_KEY           REQUIRED for outbound sends (no default)
    EVOLUTION_DEFAULT_INSTANCE  fallback instance name for webhook payloads
                                that omit one
    DIRECT_MGMT_PHONE           optional; appended to call-reject replies
    WEBHOOK_SECRET              optional; if set, requests must send header
                                X-Webhook-Secret: <value> (configure the same
                                value as a custom header in Evolution's
                                webhook settings)
    WEBHOOK_PORT                listen port (default 5000)

RUN
    python sierra_webhook.py
    # or: uvicorn sierra_webhook:app --host 0.0.0.0 --port 5000
"""

import os
import re
import random
import logging
from datetime import datetime, timezone

import requests
from fastapi import FastAPI, Request
import uvicorn

# --- configuration: environment only, no credential defaults ---------------
API_URL = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
API_KEY = os.getenv("EVOLUTION_API_KEY", "")
DIRECT_MGMT_PHONE = os.getenv("DIRECT_MGMT_PHONE", "")
DEFAULT_INSTANCE = os.getenv("EVOLUTION_DEFAULT_INSTANCE", "")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
PORT = int(os.getenv("WEBHOOK_PORT", "5000"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("sierra-webhook")

app = FastAPI(title="Sierra PropTech Core Intelligence Engine")

COMPOUNDS = ["New Cairo", "Mivida", "Al Rehab", "Madinaty", "The Square",
             "Lake View", "Hyde Park", "Mountain View", "Palm Hills", "Zayed"]
PROPERTY_TYPES = ["Apartment", "Duplex", "Villa", "Townhouse", "Twinhouse",
                  "Penthouse", "Studio", "Chalet", "Office"]

# In-memory dedup for this process only. Durable dedup lives in the master
# orchestrator's Excel ledger (Dedup Key column). A restart clears this set —
# that is an accepted, documented trade-off for the desktop lane.
seen_dedup_keys = set()


def normalize_phone(raw_phone: str):
    """Normalize Egyptian/international phone formats to plain digits."""
    if not raw_phone:
        return None
    digits = re.sub(r"\D", "", str(raw_phone).split("@")[0])
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("201") and len(digits) == 12:
        return digits
    if digits.startswith("01") and len(digits) == 11:
        return "2" + digits
    if digits.startswith("1") and len(digits) == 10:
        return "20" + digits
    return digits if len(digits) >= 10 else None


def send_whatsapp_message(instance: str, number: str, text: str):
    """Send via Evolution API. Returns the honest boolean result; logs everything."""
    if not API_KEY:
        log.error("EVOLUTION_API_KEY is not set — outbound send skipped (no fake success)")
        return False
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {"apikey": API_KEY, "Content-Type": "application/json"}
    payload = {"number": number, "text": text, "delay": 1200}
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=15)
        log.info("sendText instance=%s to=%s -> HTTP %s", instance, number, res.status_code)
        return res.status_code in [200, 201]
    except Exception as exc:
        log.error("sendText instance=%s to=%s failed: %s", instance, number, exc)
        return False


def analyze_payload(event_type: str, text: str, sender_phone: str):
    """Classify an inbound event and produce the action + reply payload."""
    phone = normalize_phone(sender_phone)
    lower_text = (text or "").lower()

    # 1. [CALL_REJECTED]
    if event_type == "CALL_REJECTED" or "call" in event_type.lower():
        fallback_msg = (
            "Hello! This line is dedicated to automated inquiries and viewing reservations. "
            "Your number has been logged, and an advisor will reach out shortly. "
            "If your inquiry is urgent or you need to book an immediate viewing, please reply with your requirements here"
        )
        if DIRECT_MGMT_PHONE:
            fallback_msg += f" or call direct management at: {DIRECT_MGMT_PHONE}."
        else:
            fallback_msg += "."
        return {
            "action": "REJECT_CALL_REPLY",
            "data": {"caller_phone": phone},
            "outgoing_message": fallback_msg,
        }

    # 2. [OWNER_OUTREACH]
    if "[owner_outreach]" in lower_text:
        greeting = random.choice(["Hello", "Good day", "Greetings"])
        pitch = random.choice([
            "we have verified clients actively looking for properties in your area and would love to match them with your unit via our registered platform.",
            "our team at Sierra PropTech can connect your property directly with pre-qualified buyers and tenants with zero hassle.",
            "would you be open to featuring your property to our vetted client network for an immediate viewing?",
        ])
        outreach_msg = (f"{greeting}! Are you still offering your property on the market? "
                        f"At Sierra Estates, {pitch} Reply YES and we will handle the rest.")
        return {
            "action": "SEND_MESSAGE",
            "data": {"target_phone": phone, "campaign": "OWNER_OUTREACH"},
            "outgoing_message": outreach_msg,
        }

    # 3. [INBOUND_LEAD] vs [SCRAPED_AD]
    is_inquiry = any(w in lower_text for w in
                     ["interested", "viewing", "visit", "available?", "details",
                      "how much", "looking for", "book"])
    if is_inquiry and not any(w in lower_text for w in
                              ["for sale", "for rent", "sqm", "bedrooms"]):
        reply_msg = (
            "Welcome to Sierra PropTech! Thank you for reaching out. "
            "This unit features a prime location inside the compound and a spacious, modern layout with premium finishing. "
            "What day and time work best for you to schedule an on-site viewing with our advisor?"
        )
        return {
            "action": "SEND_MESSAGE",
            "data": {"lead_phone": phone, "intent": "INBOUND_LEAD"},
            "outgoing_message": reply_msg,
        }

    # 4. [SCRAPED_AD] extraction & normalization
    compound = next((c for c in COMPOUNDS if c.lower() in lower_text), None)
    deal_type = "Rent" if any(w in lower_text for w in ["rent", "monthly", "lease"]) else "Resale"
    prop_type = next((p for p in PROPERTY_TYPES if p.lower() in lower_text), "Apartment")

    area_match = re.search(r"(\d{2,4})\s*(?:sqm|m2|m\u00b2|meter)", lower_text)
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

    source_type = ("Broker" if any(w in lower_text for w in
                   ["broker", "commission", "agency", "real estate"])
                   else "Direct Owner")
    dedup_key = f"{phone}_{price_egp}"

    extracted = {
        "compound": compound or "Unclassified",
        "deal_type": deal_type,
        "property_type": prop_type,
        "area_sqm": area_sqm,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "price_egp": price_egp,
        "finishing": finishing,
        "contact_phone": phone,
        "source_type": source_type,
        "dedup_key": dedup_key,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }

    if dedup_key in seen_dedup_keys:
        log.info("duplicate scraped ad skipped: %s", dedup_key)
        return {"action": "SKIP_DUPLICATE", "data": extracted, "outgoing_message": None}

    seen_dedup_keys.add(dedup_key)
    return {"action": "SAVE_INVENTORY", "data": extracted, "outgoing_message": None}


@app.post("/webhook")
async def evolution_webhook(request: Request):
    # Optional shared-secret guard (Evolution sends it as a custom header).
    if WEBHOOK_SECRET:
        supplied = request.headers.get("X-Webhook-Secret", "")
        if supplied != WEBHOOK_SECRET:
            return {"action": "UNAUTHORIZED", "data": None, "outgoing_message": None}

    body = await request.json()
    event = body.get("event", "")
    instance = body.get("instance") or DEFAULT_INSTANCE
    data = body.get("data", {})

    if "call" in event.lower():
        caller = data.get("from") or data.get("remoteJid", "")
        result = analyze_payload("CALL_REJECTED", "", caller)
        if result["outgoing_message"] and result["data"]["caller_phone"] and instance:
            send_whatsapp_message(instance, result["data"]["caller_phone"], result["outgoing_message"])
        elif not instance:
            log.error("call-reject reply skipped: no instance in payload and no EVOLUTION_DEFAULT_INSTANCE")
        return result

    key = data.get("key", {})
    if key.get("fromMe"):
        return {"action": "IGNORE_SELF", "data": None, "outgoing_message": None}

    sender = key.get("remoteJid", "")
    msg_obj = data.get("message", {})
    text = msg_obj.get("conversation") or msg_obj.get("extendedTextMessage", {}).get("text") or ""

    result = analyze_payload("MESSAGE", text, sender)
    if result["outgoing_message"] and normalize_phone(sender) and instance:
        send_whatsapp_message(instance, normalize_phone(sender), result["outgoing_message"])
    return result


if __name__ == "__main__":
    if not API_KEY:
        log.warning("EVOLUTION_API_KEY not set — inbound classification will work, "
                    "but outbound replies will be skipped honestly (no fake success)")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
