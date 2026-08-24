#!/usr/bin/env python3
"""
Sierra Estates Realty - Property Finder Integration Hub
---------------------------------------------
Manages real-time data sync, formatting, and translation of
Portfolio Assets for optimal exposure and alignment.

Terminological Standards:
- Portfolio Assets (never listings)
- Strategic Pipeline (never CRM)
- Investment Stakeholders (never leads)
"""

import os
import logging
import time
from typing import Dict, Any, List, Optional

import httpx

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PF_API_GATEWAY = os.getenv("PROPERTY_FINDER_API_GATEWAY", "https://atlas.propertyfinder.com")
PF_API_KEY = os.getenv("PROPERTY_FINDER_API_KEY", "")
PF_API_SECRET = os.getenv("PROPERTY_FINDER_API_SECRET", "")


class PropertyFinderSyncHub:
    """
    Core integration hub linking remote Property Finder endpoints
    with local portfolio stores.  Uses OAuth2 token auth with 30-min
    expiry and auto-refresh — matching the TypeScript pfClient.
    """
    def __init__(self):
        self.api_gateway = PF_API_GATEWAY
        self.api_key = PF_API_KEY
        self.api_secret = PF_API_SECRET
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0.0
        logger.info("Property Finder Sync Hub initialized (gateway: %s).", self.api_gateway)

    def _get_access_token(self) -> str:
        """Return a cached or freshly-minted OAuth2 bearer token."""
        now = time.time()
        if self._access_token and now < self._token_expiry:
            return self._access_token

        resp = httpx.post(
            f"{self.api_gateway}/v1/auth/token",
            json={"apiKey": self.api_key, "apiSecret": self.api_secret},
            headers={"Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        self._access_token = data["accessToken"]
        self._token_expiry = now + data.get("expiresIn", 1800) - 60
        logger.info("PF OAuth2 token acquired (expires in ~%.0f min).", (self._token_expiry - now) / 60)
        return self._access_token

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def format_portfolio_asset(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formulate local portfolio asset data into standard JSON
        structures expected by Property Finder syndication feeds.
        """
        logger.info(f"Formatting Portfolio Asset ID: {asset.get('id', 'unknown')}")
        return {
            "reference": asset.get("id"),
            "title_en": asset.get("title_en"),
            "title_ar": asset.get("title_ar"),
            "offering_type": "investment",
            "price": asset.get("price"),
            "location": asset.get("location"),
        }

    def trigger_batch_sync(self, assets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Trigger batch syndication of active Portfolio Assets to Property Finder.
        Falls back gracefully if credentials are not configured.
        """
        logger.info(f"Syndicating {len(assets)} Portfolio Assets to Property Finder...")
        formatted_assets = [self.format_portfolio_asset(a) for a in assets]

        if not self.api_key or not self.api_secret:
            logger.warning("PF credentials not configured — returning stub sync result.")
            return {"sync_status": "skipped", "reason": "credentials_not_configured", "synced_count": 0}

        try:
            headers = self._auth_headers()
            resp = httpx.post(
                f"{self.api_gateway}/v1/listings/batch",
                json={"listings": formatted_assets},
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            return {"sync_status": "success", "synced_count": len(formatted_assets), "pf_response": result}
        except httpx.HTTPStatusError as e:
            logger.error("PF batch sync HTTP error %s: %s", e.response.status_code, e.response.text)
            return {"sync_status": "error", "error": str(e), "synced_count": 0}
        except Exception as e:
            logger.error("PF batch sync error: %s", str(e))
            return {"sync_status": "error", "error": str(e), "synced_count": 0}


if __name__ == "__main__":
    hub = PropertyFinderSyncHub()
    # Initial verification run
    test_asset = {
        "id": "SB-UIPT-001",
        "title_en": "Golf Uptown Cairo Penthouse",
        "title_ar": "بنتهاوس أبتاون كايرو المطل على الجولف",
        "price": 45000000,
        "location": "Uptown Cairo",
    }
    result = hub.trigger_batch_sync([test_asset])
    print(f"Sync Results: {result}")

