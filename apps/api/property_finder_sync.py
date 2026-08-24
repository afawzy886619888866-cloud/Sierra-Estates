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

from __future__ import annotations

import logging
import os
import time
from typing import Any

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:  # graceful fallback when httpx is not installed in the test env
    _HTTPX_AVAILABLE = False  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Module-level logger
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PF_API_GATEWAY = os.getenv("PROPERTY_FINDER_API_GATEWAY", "https://atlas.propertyfinder.com")
PF_API_KEY = os.getenv("PROPERTY_FINDER_API_KEY", "")
PF_API_SECRET = os.getenv("PROPERTY_FINDER_API_SECRET", "")


class PropertyFinderSyncHub:
    """
    Core integration hub linking remote Property Finder endpoints
    with local portfolio stores. Uses OAuth2 token auth with 30-min
    expiry and auto-refresh — matching the TypeScript pfClient.
    """

    def __init__(self) -> None:
        self.api_gateway = PF_API_GATEWAY
        self.api_key = PF_API_KEY
        self.api_secret = PF_API_SECRET
        self._access_token: str | None = None
        self._token_expiry: float = 0.0
        logger.info("Property Finder Sync Hub initialized (gateway: %s).", self.api_gateway)

    # ------------------------------------------------------------------
    # Auth helpers
    # ------------------------------------------------------------------

    def _get_access_token(self) -> str:
        """Return a cached or freshly-minted OAuth2 bearer token."""
        now = time.time()
        if self._access_token and now < self._token_expiry:
            return self._access_token

        if not _HTTPX_AVAILABLE:
            raise RuntimeError("httpx is required for live PF API calls. Install it via: pip install httpx")

        resp = httpx.post(  # type: ignore[name-defined]
            "%s/v1/auth/token" % self.api_gateway,
            json={"apiKey": self.api_key, "apiSecret": self.api_secret},
            headers={"Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        self._access_token = data["accessToken"]
        expires_in = data.get("expiresIn", 1800)
        self._token_expiry = now + expires_in - 60
        logger.info(
            "PF OAuth2 token acquired (expires in ~%.0f min).",
            (self._token_expiry - now) / 60,
        )
        return self._access_token  # type: ignore[return-value]

    def _auth_headers(self) -> dict[str, str]:
        return {
            "Authorization": "Bearer %s" % self._get_access_token(),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def format_portfolio_asset(self, asset: dict[str, Any]) -> dict[str, Any]:
        """
        Formulate local portfolio asset data into standard JSON
        structures expected by Property Finder syndication feeds.
        """
        logger.info("Formatting Portfolio Asset ID: %s", asset.get("id", "unknown"))
        return {
            "reference": asset.get("id"),
            "title_en": asset.get("title_en"),
            "title_ar": asset.get("title_ar"),
            "offering_type": "investment",
            "price": asset.get("price"),
            "location": asset.get("location"),
        }

    def trigger_batch_sync(self, assets: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Trigger batch syndication of active Portfolio Assets to Property Finder.
        Falls back gracefully if credentials are not configured or httpx unavailable.
        """
        logger.info("Syndicating %d Portfolio Assets to Property Finder...", len(assets))
        formatted_assets = [self.format_portfolio_asset(a) for a in assets]

        if not self.api_key or not self.api_secret:
            logger.warning("PF credentials not configured — returning stub sync result.")
            return {
                "sync_status": "skipped",
                "reason": "credentials_not_configured",
                "synced_count": 0,
            }

        if not _HTTPX_AVAILABLE:
            logger.warning("httpx not installed — returning stub sync result.")
            return {
                "sync_status": "skipped",
                "reason": "httpx_not_installed",
                "synced_count": 0,
            }

        try:
            headers = self._auth_headers()
            resp = httpx.post(  # type: ignore[name-defined]
                "%s/v1/listings/batch" % self.api_gateway,
                json={"listings": formatted_assets},
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            pf_response = resp.json()
            return {
                "sync_status": "success",
                "synced_count": len(formatted_assets),
                "pf_response": pf_response,
            }
        except httpx.HTTPStatusError as exc:  # type: ignore[name-defined]
            logger.error(
                "PF batch sync HTTP error %s: %s",
                exc.response.status_code,
                exc.response.text,
            )
            return {"sync_status": "error", "error": str(exc), "synced_count": 0}
        except (OSError, RuntimeError, ValueError) as exc:
            logger.error("PF batch sync error: %s", str(exc))
            return {"sync_status": "error", "error": str(exc), "synced_count": 0}


# ---------------------------------------------------------------------------
# CLI smoke-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    hub = PropertyFinderSyncHub()
    _test_asset: dict[str, Any] = {
        "id": "SB-UIPT-001",
        "title_en": "Golf Uptown Cairo Penthouse",
        "title_ar": "بنتهاوس أبتاون كايرو المطل على الجولف",
        "price": 45_000_000,
        "location": "Uptown Cairo",
    }
    sync_result = hub.trigger_batch_sync([_test_asset])
    print("Sync Results: %s" % sync_result)
