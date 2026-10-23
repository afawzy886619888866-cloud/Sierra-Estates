"""
SIERRA ESTATES BOT - API INTEGRATION GUIDE
Real API Endpoints & Configuration Examples
"""

# ── Standard Library ────────────────────────────────────────────────────────
import os
from datetime import datetime, timedelta
from typing import Dict, List

# ── Third-party ─────────────────────────────────────────────────────────────
import requests
import mixpanel
from dotenv import load_dotenv
from twilio.rest import Client

# HubSpot SDK v12+ — correct module layout
from hubspot import HubSpot
from hubspot.crm.contacts import (
    SimplePublicObjectInputForCreate,
    ApiException,
)

# Google APIs
from google.auth.transport.requests import Request  # noqa: F401 (used indirectly)
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ============================================================================
# 1. CRM INTEGRATION (HubSpot)
# ============================================================================

class HubSpotCRMIntegration:
    """Real HubSpot Integration (SDK v12+)"""

    def __init__(self, api_key: str):
        """
        api_key: Get from HubSpot Dashboard > Settings > Private Apps
        """
        self.client = HubSpot(access_token=api_key)

    def create_contact(self, phone: str, name: str | None = None, email: str | None = None) -> str | None:
        """Create new contact in HubSpot"""
        name_parts = name.split() if name else []
        properties = {
            "firstname": name_parts[0] if name_parts else "",
            "lastname": name_parts[-1] if len(name_parts) > 1 else "",
            "phone": phone,
            "email": email or "",
        }

        input_obj = SimplePublicObjectInputForCreate(properties=properties)

        try:
            api_response = self.client.crm.contacts.basic_api.create(
                simple_public_object_input_for_create=input_obj
            )
            return api_response.id
        except ApiException as e:
            print(f"Exception creating contact: {e}")
            return None

    def update_contact(self, contact_id: str, properties: dict) -> bool:
        """Update existing contact"""
        from hubspot.crm.contacts import SimplePublicObjectInput  # v12 update model

        input_obj = SimplePublicObjectInput(properties=properties)

        try:
            self.client.crm.contacts.basic_api.update(
                contact_id=contact_id,
                simple_public_object_input=input_obj,
            )
            return True
        except ApiException as e:
            print(f"Exception updating contact: {e}")
            return False

    def add_deal(self, contact_id: str, deal_data: dict) -> str | None:
        """Create a deal for this contact (stub — extend per business rules)"""
        # Use self.client.crm.deals.basic_api.create(...)
        _ = contact_id, deal_data  # suppress unused warnings
        return None


# HubSpot Configuration Example
HUBSPOT_CONFIG = {
    "api_key": "YOUR_HUBSPOT_API_KEY",
    "pipeline_id": "real_estate_pipeline",
    "deal_stages": {
        "inquiry": "1",
        "qualified": "2",
        "scheduled_viewing": "3",
        "viewed": "4",
        "negotiation": "5",
        "closed_won": "6",
        "closed_lost": "7",
    },
}

# ============================================================================
# 2. PROPERTY DATA API (Property Finder / Immobilia)
# ============================================================================

class PropertyFinderRealAPI:
    """Integration with Property Finder API"""

    BASE_URL = "https://api.property-finder.eg/v2"

    def __init__(self, api_key: str):
        """
        api_key: Get from Property Finder Developer Dashboard
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def check_property_availability(self, property_id: str) -> Dict | None:
        """Check property availability and details"""
        endpoint = f"{self.BASE_URL}/properties/{property_id}"

        response = requests.get(endpoint, headers=self.headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return {
                "id": data.get("id"),
                "title": data.get("title"),
                "price": data.get("price"),
                "location": data.get("location"),
                "property_type": data.get("property_type"),
                "bedrooms": data.get("bedrooms"),
                "bathrooms": data.get("bathrooms"),
                "furnishing": data.get("furnishing"),
                "status": "available" if data.get("status") == "available" else "taken",
                "last_updated": data.get("updated_at"),
                "images": data.get("images", []),
                "description": data.get("description"),
            }

        print(f"Error: {response.status_code} - {response.text}")
        return None

    def search_properties(self, filters: Dict) -> List[Dict]:
        """
        Search properties with filters.

        filters = {
            "property_type": "apartment",
            "bedrooms": 2,
            "furnishing": "fully_furnished",
            "location": "new_cairo",
            "price_min": 10000,
            "price_max": 30000,
            "available_only": True,
        }
        """
        endpoint = f"{self.BASE_URL}/properties/search"

        response = requests.post(
            endpoint,
            headers=self.headers,
            json=filters,
            timeout=10,
        )

        if response.status_code == 200:
            return response.json().get("results", [])

        print(f"Search error: {response.status_code}")
        return []

    def get_latest_properties(self, limit: int = 10) -> List[Dict]:
        """Get newest properties in system"""
        endpoint = f"{self.BASE_URL}/properties/latest?limit={limit}"
        response = requests.get(endpoint, headers=self.headers, timeout=10)

        if response.status_code == 200:
            return response.json().get("results", [])
        return []


# Property Finder Configuration
PROPERTY_FINDER_CONFIG = {
    "api_key": "YOUR_PROPERTY_FINDER_API_KEY",
    "base_url": "https://api.property-finder.eg/v2",
    "webhook_url": "https://yourserver.com/webhooks/property-updates",
}

# ============================================================================
# 3. WhatsApp API INTEGRATION (Twilio / Meta Official API)
# ============================================================================

class WhatsAppIntegration:
    """Twilio WhatsApp Integration"""

    def __init__(self, account_sid: str, auth_token: str, whatsapp_from: str):
        """
        account_sid: Your Twilio Account SID
        auth_token: Your Twilio Auth Token
        whatsapp_from: Your WhatsApp Business Phone Number (format: +1234567890)
        """
        self.client = Client(account_sid, auth_token)
        self.whatsapp_from = whatsapp_from

    def send_message(self, to_phone: str, message_body: str) -> str:
        """Send WhatsApp message"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            body=message_body,
            to=f"whatsapp:{to_phone}",
        )
        return message.sid

    def send_message_with_media(self, to_phone: str, message_body: str, media_url: str) -> str:
        """Send WhatsApp message with image/document"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            body=message_body,
            media_url=[media_url],
            to=f"whatsapp:{to_phone}",
        )
        return message.sid

    def send_template_message(self, to_phone: str, template_name: str, params: List[str]) -> str:
        """Send WhatsApp template message (pre-approved by Meta)"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            to=f"whatsapp:{to_phone}",
            content_sid=template_name,
            content_variables=params,
        )
        return message.sid

    def send_reminder_24h_before(self, phone: str, property_code: str,
                                 viewing_time: str, location: str) -> str:
        """Send automated reminder before viewing"""
        message_body = (
            f"📍 تذكير معاينة عقار\n\n"
            f"الوحدة: {property_code}\n"
            f"الموعد: {viewing_time}\n"
            f"الموقع: {location}\n\n"
            "نتطلع لرؤيتك! 🎉"
        )
        return self.send_message(phone, message_body)


# Twilio WhatsApp Configuration
WHATSAPP_CONFIG = {
    "account_sid": "YOUR_TWILIO_ACCOUNT_SID",
    "auth_token": "YOUR_TWILIO_AUTH_TOKEN",
    "whatsapp_from": "+20123456789",
    "templates": {
        "initial_greeting": "sierra_estates_greeting_ar",
        "viewing_confirmation": "sierra_estates_viewing_confirmation_ar",
        "viewing_reminder": "sierra_estates_viewing_reminder_ar",
    },
}


class MetaWhatsAppIntegration:
    """Direct Meta WhatsApp Business API Integration"""

    def __init__(self, phone_number_id: str, access_token: str):
        """
        phone_number_id: Your WhatsApp Business Phone Number ID
        access_token: Meta API Access Token
        """
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.base_url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

    def send_text_message(self, recipient_phone: str, message_text: str) -> Dict:
        """Send text message"""
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_text,
            },
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        response = requests.post(self.base_url, json=payload, headers=headers, timeout=10)
        return response.json()


# Meta Configuration
META_WHATSAPP_CONFIG = {
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_META_ACCESS_TOKEN",
    "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID",
}

# ============================================================================
# 4. GOOGLE CALENDAR API INTEGRATION
# ============================================================================

class GoogleCalendarIntegration:
    """Google Calendar API for Scheduling"""

    SCOPES = ["https://www.googleapis.com/auth/calendar"]

    def __init__(self, credentials_json_path: str):
        """
        credentials_json_path: Path to service account JSON file.
        Download from Google Cloud Console > APIs & Services > Credentials.
        """
        self.creds = ServiceAccountCredentials.from_service_account_file(
            credentials_json_path,
            scopes=self.SCOPES,
        )
        self.service = build("calendar", "v3", credentials=self.creds)
        self.calendar_id = "primary"

    def create_viewing_event(self, customer_email: str, property_data: Dict,
                             start_time: datetime, duration_minutes: int = 60) -> Dict:
        """Create calendar event for property viewing"""
        end_time = start_time + timedelta(minutes=duration_minutes)

        event = {
            "summary": f"عرض عقار - {property_data.get('location')}",
            "description": (
                f"📍 الموقع: {property_data.get('location')}\n"
                f"🏠 النوع: {property_data.get('property_type')}\n"
                f"🛏️ الغرف: {property_data.get('bedrooms')}\n"
                f"💰 السعر: {property_data.get('price')}\n\n"
                f"رابط الوحدة: {property_data.get('link')}"
            ),
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": "Africa/Cairo",
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": "Africa/Cairo",
            },
            "attendees": [
                {"email": customer_email},
                {"email": "agent@sierra-estates.com"},
            ],
            "location": "Sierra Estates - القاهرة الجديدة",
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 1440},
                    {"method": "popup", "minutes": 30},
                ],
            },
        }

        try:
            created_event = self.service.events().insert(  # type: ignore
                calendarId=self.calendar_id,
                body=event,
                sendUpdates="all",
            ).execute()

            return {
                "success": True,
                "event_id": created_event["id"],
                "event_link": created_event.get("htmlLink"),
                "start_time": created_event["start"]["dateTime"],
            }
        except HttpError as error:
            print(f"Calendar API error: {error}")
            return {"success": False, "error": str(error)}

    def find_available_slots(self, agent_email: str, date: datetime,
                             num_slots: int = 5, duration_minutes: int = 60) -> List[Dict]:
        """Find available time slots for agent"""
        day_start = date.replace(hour=10, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=18, minute=0, second=0, microsecond=0)

        freebusy_body = {
            "items": [{"id": agent_email}],
            "timeMin": day_start.isoformat(),
            "timeMax": day_end.isoformat(),
            "intervalMinutes": 60,
        }

        try:
            freebusy = self.service.freebusy().query(body=freebusy_body).execute()  # type: ignore
            busy_times = freebusy["calendars"][agent_email]["busy"]

            available_slots: List[Dict] = []
            current_time = day_start

            while current_time < day_end:
                slot_end = current_time + timedelta(minutes=duration_minutes)

                is_free = True
                for busy in busy_times:
                    busy_start = datetime.fromisoformat(busy["start"])
                    busy_end = datetime.fromisoformat(busy["end"])

                    if current_time < busy_end and slot_end > busy_start:
                        is_free = False
                        break

                if is_free:
                    available_slots.append({
                        "start": current_time,
                        "end": slot_end,
                        "display": current_time.strftime("%H:%M"),
                    })

                current_time += timedelta(minutes=60)

            return available_slots[:num_slots]

        except HttpError as error:
            print(f"Calendar API error: {error}")
            return []


# Google Calendar Configuration
GOOGLE_CALENDAR_CONFIG = {
    "credentials_json": "/path/to/service-account-key.json",
    "calendar_id": "sierra-estates-viewings@sierra-estates.com",
    "agent_emails": [
        "agent1@sierra-estates.com",
        "agent2@sierra-estates.com",
    ],
    "timezone": "Africa/Cairo",
}

# ============================================================================
# 5. ANALYTICS & TRACKING (Mixpanel)
# ============================================================================

class AnalyticsIntegration:
    """Bot Analytics & Conversion Tracking"""

    def __init__(self, mixpanel_token: str):
        """
        mixpanel_token: Get from Mixpanel Dashboard
        """
        self.mp = mixpanel.Mixpanel(mixpanel_token)

    def track_inquiry(self, phone: str, reference_code: str) -> None:
        """Track new inquiry"""
        self.mp.track(
            phone,
            "Inquiry_Received",
            {
                "reference_code": reference_code,
                "timestamp": datetime.now().isoformat(),
            },
        )

    def track_discovery_complete(self, phone: str, preferences: Dict) -> None:
        """Track when customer completes discovery questions"""
        self.mp.track(
            phone,
            "Discovery_Completed",
            {
                "property_type": preferences.get("property_type"),
                "bedrooms": preferences.get("bedrooms"),
                "location": preferences.get("location"),
            },
        )

    def track_viewing_scheduled(self, phone: str, event_data: Dict) -> None:
        """Track viewing appointment scheduled"""
        self.mp.track(
            phone,
            "Viewing_Scheduled",
            {
                "viewing_time": event_data.get("time"),
                "properties_count": len(event_data.get("properties", [])),
            },
        )

    def track_handover(self, phone: str, lead_value: Dict) -> None:
        """Track handover to human agent"""
        self.mp.track(
            phone,
            "Lead_Handover",
            {
                "matched_properties": len(lead_value.get("matched_properties", [])),
                "conversation_messages": lead_value.get("conversation_count", 0),
            },
        )


# ============================================================================
# 6. COMPLETE INTEGRATION EXAMPLE
# ============================================================================

class IntegratedSierraEstatesBot:
    """Bot with all real API integrations"""

    def __init__(self, config: Dict):
        """Initialize all API clients"""
        self.hubspot = HubSpotCRMIntegration(config["hubspot"]["api_key"])
        self.property_api = PropertyFinderRealAPI(config["property_finder"]["api_key"])
        self.whatsapp = MetaWhatsAppIntegration(
            config["whatsapp"]["phone_number_id"],
            config["whatsapp"]["access_token"],
        )
        self.calendar = GoogleCalendarIntegration(
            config["google_calendar"]["credentials_json"]
        )
        self.analytics = AnalyticsIntegration(config["mixpanel"]["token"])

    def process_full_inquiry(self, phone: str, reference_code: str):
        """End-to-end inquiry processing with all integrations"""
        # 1. Track inquiry
        self.analytics.track_inquiry(phone, reference_code)

        # 2. Create contact in CRM
        contact_id = self.hubspot.create_contact(phone)

        # 3. Check property availability
        property_data = self.property_api.check_property_availability(reference_code)

        # 4. Send WhatsApp greeting
        greeting_msg = "أهلاً بحضرتك في Sierra Estates"
        self.whatsapp.send_text_message(phone, greeting_msg)

        # 5. Track discovery and schedule
        # ... continue workflow

        return contact_id, property_data


# ============================================================================
# 7. DEPLOYMENT CONFIGURATION (Environment Variables)
# ============================================================================
#
# Create .env file in your project root:
#
#   # HubSpot
#   HUBSPOT_API_KEY=your_hubspot_api_key
#   HUBSPOT_PIPELINE_ID=your_pipeline_id
#
#   # Property Finder
#   PROPERTY_FINDER_API_KEY=your_property_finder_key
#
#   # WhatsApp (Twilio)
#   TWILIO_ACCOUNT_SID=your_twilio_sid
#   TWILIO_AUTH_TOKEN=your_twilio_token
#   TWILIO_WHATSAPP_FROM=+20123456789
#
#   # WhatsApp (Meta)
#   META_PHONE_NUMBER_ID=your_phone_id
#   META_ACCESS_TOKEN=your_meta_token
#
#   # Google Calendar
#   GOOGLE_CALENDAR_CREDENTIALS=/path/to/credentials.json
#
#   # Analytics
#   MIXPANEL_TOKEN=your_mixpanel_token
#
#   # Bot Configuration
#   BOT_NAME=Sierra Estates AI
#   BOT_TIMEZONE=Africa/Cairo

# Load environment variables
load_dotenv()

INTEGRATED_CONFIG = {
    "hubspot": {
        "api_key": os.getenv("HUBSPOT_API_KEY"),
    },
    "property_finder": {
        "api_key": os.getenv("PROPERTY_FINDER_API_KEY"),
    },
    "whatsapp": {
        "phone_number_id": os.getenv("META_PHONE_NUMBER_ID"),
        "access_token": os.getenv("META_ACCESS_TOKEN"),
    },
    "google_calendar": {
        "credentials_json": os.getenv("GOOGLE_CALENDAR_CREDENTIALS"),
    },
    "mixpanel": {
        "token": os.getenv("MIXPANEL_TOKEN"),
    },
}

# ============================================================================
# 8. TESTING CURL COMMANDS
# ============================================================================
#
# Test Property Finder API:
#   curl -X GET https://api.property-finder.eg/v2/properties/SE001 \
#     -H "Authorization: Bearer YOUR_API_KEY" \
#     -H "Content-Type: application/json"
#
# Test WhatsApp API:
#   curl -X POST https://graph.facebook.com/v18.0/{phone_number_id}/messages \
#     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
#     -H "Content-Type: application/json" \
#     -d '{"messaging_product":"whatsapp","to":"20123456789","type":"text","text":{"body":"Hello from Sierra Estates!"}}'
#
# Test Google Calendar:
#   python -m pytest tests/test_calendar_integration.py
#
# Test HubSpot:
#   python -m pytest tests/test_hubspot_integration.py


if __name__ == "__main__":
    print("Sierra Estates Bot - Complete System Implementation")
    print("=" * 70)
    print("\nGenerated Files:")
    print("1. sierra_estates_bot_implementation.py - Core bot logic")
    print("2. sierra_estates_api_integration.py - API integrations")
    print("3. system_prompt_and_deployment.py - This file")
    print("\nNext Steps:")
    print("1. Install requirements: pip install -r requirements.txt")
    print("2. Configure .env file with API keys")
    print("3. Run tests: python -m pytest")
    print("4. Deploy using provided deployment script")
    print("5. Monitor metrics via dashboard")
