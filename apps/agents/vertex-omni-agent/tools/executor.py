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
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import requests

logger = logging.getLogger("uvicorn.error")

_db = None


def _get_db():
    """Returns a Supabase REST wrapper.

    Originally this lazily-initialised the Firebase Admin SDK + Firestore client.
    Migrated to Supabase on 2026-09-20 — the same `units` collection is now the
    `units` table in Supabase Postgres. Returned object exposes `.collection(name)`
    which yields a small chain compatible with the existing call-sites.
    """
    global _db
    if _db is not None:
        return _db

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "https://gaxfqcietzoonlmatiot.supabase.co"
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not supabase_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY (or anon key) is required for the omni-agent DB layer.")

    _db = _SupabaseFirestoreShim(supabase_url, supabase_key)
    return _db


class _SupabaseFirestoreShim:
    """Minimal Firestore-shaped wrapper over the Supabase REST API.

    Implements just enough of the Firestore SDK surface used by this file:
    `db.collection(name).document(id?).set()/where().limit().stream()`.
    """

    def __init__(self, url: str, key: str):
        self._url = url.rstrip("/")
        self._key = key
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def collection(self, name: str) -> "_Collection":
        return _Collection(self, name)


class _Collection:
    def __init__(self, shim: _SupabaseFirestoreShim, name: str):
        self._shim = shim
        self._name = name
        self._filters: list[tuple[str, str, Any]] = []
        self._limit_n: int | None = None

    def document(self, doc_id: str | None = None) -> "_Document":
        return _Document(self._shim, self._name, doc_id or str(uuid.uuid4()))

    def where(self, field: str, op: str, value: Any) -> "_Collection":
        # Supabase REST maps Firestore `==`, `<=` to `eq`, `lte` operators.
        op_map = {"==": "eq", "<=": "lte", ">=": "gte", "<": "lt", ">": "gt", "!=": "neq"}
        self._filters.append((field, op_map.get(op, "eq"), value))
        return self

    def limit(self, n: int) -> "_Collection":
        self._limit_n = n
        return self

    def stream(self):
        params = {"select": "*"}
        for field, op, value in self._filters:
            params[f"{field}.{op}"] = (
                value.isoformat() if isinstance(value, datetime) else value
            )
        if self._limit_n is not None:
            params["limit"] = self._limit_n
        resp = requests.get(
            f"{self._shim._url}/rest/v1/{self._name}",
            headers=self._shim._headers,
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json() or []
        for row in rows:
            yield _DocSnapshot(row)


class _Document:
    def __init__(self, shim: _SupabaseFirestoreShim, collection: str, doc_id: str):
        self._shim = shim
        self._collection = collection
        self.id = doc_id

    def set(self, data: Dict[str, Any], merge: bool = False) -> Dict[str, Any]:
        payload = {"id": self.id, **data}
        headers = {**self._shim._headers}
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        resp = requests.post(
            f"{self._shim._url}/rest/v1/{self._collection}",
            headers=headers,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {}

    def update(self, data: Dict[str, Any]) -> Dict[str, Any]:
        headers = {**self._shim._headers}
        headers["Prefer"] = "return=representation"
        resp = requests.patch(
            f"{self._shim._url}/rest/v1/{self._collection}?id=eq.{self.id}",
            headers=headers,
            json=data,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {}


class _DocSnapshot:
    def __init__(self, data: Dict[str, Any]):
        self._data = data
        self.id = data.get("id")

    @property
    def exists(self) -> bool:
        return bool(self._data)

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._data)

    def data(self) -> Dict[str, Any]:
        return dict(self._data)


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
        "created_at": datetime.now(timezone.utc).isoformat(),
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

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
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
