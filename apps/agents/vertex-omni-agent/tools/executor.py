"""
Executes the function calls declared in tools/registry.py.

Previously the model was given full FunctionDeclarations and told (via
SYSTEM_INSTRUCTION in agent_core.py) to call them, but nothing in api.py
ever inspected a response for a function_call part or executed one — the
tool declarations were pure interface with no implementation behind them.
This module is that implementation; agent_core.py's dispatch loop calls it.
"""
import logging
import os
from typing import Any, Dict

import requests

logger = logging.getLogger("uvicorn.error")

_db = None


def _get_db():
    """Lazily initializes the Firebase Admin SDK on first Firestore access."""
    global _db
    if _db is not None:
        return _db

    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        firebase_admin.initialize_app()

    _db = firestore.client()
    return _db


def save_listing(compound: str, price: float, bedrooms: int = None,
                  property_type: str = None, contact: str = None) -> Dict[str, Any]:
    """SCRAPER MODE: persists a listing extracted from a broker WhatsApp group."""
    db = _get_db()
    doc_ref = db.collection("units").document()
    payload = {
        "compound": compound,
        "price": price,
        "bedrooms": bedrooms,
        "propertyType": property_type,
        "ownerContact": contact,
        "ownerType": "broker",
        "syncSource": "vertex-omni-agent",
        "status": "available",
    }
    doc_ref.set({k: v for k, v in payload.items() if v is not None})
    logger.info("[Titan] Saved listing %s (%s, %s EGP)", doc_ref.id, compound, price)
    return {"success": True, "listingId": doc_ref.id}


def send_whatsapp_message(phone_number: str, message: str) -> Dict[str, Any]:
    """Sends a WhatsApp message via the Meta Graph API (same integration as
    apps/agents/sierra-estates-bot/sierra_estates_api_integration.py's
    MetaWhatsAppIntegration — inlined here since these are separate Python
    services with no shared package to import from)."""
    phone_number_id = os.getenv("META_PHONE_NUMBER_ID")
    access_token = os.getenv("META_ACCESS_TOKEN")
    if not phone_number_id or not access_token:
        logger.warning("[Titan] META_PHONE_NUMBER_ID/META_ACCESS_TOKEN not configured — message not sent.")
        return {"success": False, "error": "WhatsApp send is not configured"}

    url = f"REDACTED_WHATSAPP_API_URL/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if response.status_code >= 400:
        logger.error("[Titan] WhatsApp send failed: %s %s", response.status_code, response.text)
        return {"success": False, "error": f"{response.status_code}: {response.text[:200]}"}

    return {"success": True}


def query_crm_listings(location: str = None, max_price: float = None, bedrooms: int = None) -> Dict[str, Any]:
    """Read-only search over the units collection."""
    db = _get_db()
    query = db.collection("units").where("status", "==", "available")
    if location:
        query = query.where("compound", "==", location)
    if bedrooms is not None:
        query = query.where("bedrooms", "==", bedrooms)
    if max_price is not None:
        query = query.where("price", "<=", max_price)

    results = []
    for doc in query.limit(10).stream():
        data = doc.data()
        data["id"] = doc.id
        results.append(data)

    return {"success": True, "count": len(results), "listings": results}


TOOL_FUNCTIONS = {
    "save_listing": save_listing,
    "send_whatsapp_message": send_whatsapp_message,
    "query_crm_listings": query_crm_listings,
}


def execute_tool_call(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Executes a single named tool call with the args the model supplied."""
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        return {"success": False, "error": f"Unknown tool: {name}"}
    try:
        return fn(**args)
    except Exception as exc:  # noqa: BLE001 - reported back to the model, not raised
        logger.error("[Titan] Tool '%s' failed: %s", name, exc)
        return {"success": False, "error": str(exc)}
