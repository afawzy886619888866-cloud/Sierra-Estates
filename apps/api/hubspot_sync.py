"""
hubspot_sync.py

HubSpot CRM Integration Hub for Sierra Estates.
Synchronizes qualified leads and strategic investment deals to HubSpot.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

HUBSPOT_ACCESS_TOKEN = os.getenv("HUBSPOT_ACCESS_TOKEN", os.getenv("HUBSPOT_API_KEY", ""))


class HubSpotSyncHub:
    def __init__(self, token: Optional[str] = None):
        self.token = token or HUBSPOT_ACCESS_TOKEN
        self.client = None

        if self.token:
            try:
                from hubspot import HubSpot
                self.client = HubSpot(access_token=self.token)
                logger.info("HubSpot CRM Sync Hub initialized successfully.")
            except ImportError:
                logger.warning("hubspot package not installed — running in stub mode.")
            except Exception as e:
                logger.error("Failed to initialize HubSpot client: %s", e)
        else:
            logger.info("HubSpot credentials not provided — running in stub mode.")

    def sync_contact(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a contact in HubSpot CRM.
        """
        phone = str(lead_data.get("phone", ""))
        name = str(lead_data.get("name", ""))
        email = str(lead_data.get("email", ""))
        compound = str(lead_data.get("compound", ""))
        budget = lead_data.get("budget", 0)

        if not self.client:
            return {
                "status": "skipped",
                "reason": "hubspot_client_not_configured",
                "lead": {"phone": phone, "name": name},
            }

        try:
            from hubspot.crm.contacts import SimplePublicObjectInputForCreate

            name_parts = name.split() if name else []
            properties = {
                "firstname": name_parts[0] if name_parts else "WhatsApp",
                "lastname": " ".join(name_parts[1:]) if len(name_parts) > 1 else "Prospect",
                "phone": phone,
                "email": email or "",
            }

            input_obj = SimplePublicObjectInputForCreate(properties=properties)
            resp = self.client.crm.contacts.basic_api.create(
                simple_public_object_input_for_create=input_obj
            )
            return {
                "status": "success",
                "contactId": resp.id,
                "details": {"compound": compound, "budget": budget},
            }
        except Exception as e:
            logger.error("HubSpot contact sync error: %s", e)
            return {"status": "error", "error": str(e)}

    def create_deal(self, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a high-value pipeline deal in HubSpot CRM.
        """
        deal_name = str(deal_data.get("title", "Signature Asset Acquisition"))
        amount = deal_data.get("amount", 0)
        pipeline_stage = str(deal_data.get("stage", "qualify"))

        if not self.client:
            return {
                "status": "skipped",
                "reason": "hubspot_client_not_configured",
                "deal": {"name": deal_name, "amount": amount},
            }

        try:
            from hubspot.crm.deals import SimplePublicObjectInputForCreate

            properties = {
                "dealname": deal_name,
                "amount": str(amount),
                "dealstage": pipeline_stage,
            }

            input_obj = SimplePublicObjectInputForCreate(properties=properties)
            resp = self.client.crm.deals.basic_api.create(
                simple_public_object_input_for_create=input_obj
            )
            return {"status": "success", "dealId": resp.id}
        except Exception as e:
            logger.error("HubSpot deal creation error: %s", e)
            return {"status": "error", "error": str(e)}
