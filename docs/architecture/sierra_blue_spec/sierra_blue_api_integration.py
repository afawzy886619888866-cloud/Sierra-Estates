"""
SIERRA BLUE BOT - API INTEGRATION GUIDE
Real API Endpoints & Configuration Examples
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    requests = None  # type: ignore

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    def load_dotenv(): pass

# ============================================================================
# 1. CRM INTEGRATION (HubSpot)
# ============================================================================

# Installation: pip install hubspot-api-client
try:
    from hubspot.crm.contacts import ApiClient as ContactsApiClient
    from hubspot.crm.objects.contacts import ApiException
    from hubspot.configuration import Configuration
    from hubspot.crm.contacts.models import SimplePublicObjectInput
except ImportError:
    ContactsApiClient = None  # type: ignore
    ApiException = Exception  # type: ignore
    Configuration = None  # type: ignore
    SimplePublicObjectInput = None  # type: ignore


class HubSpotCRMIntegration:
    """Real HubSpot Integration with safe fallback"""
    
    def __init__(self, api_key: str):
        """
        api_key: Get from HubSpot Dashboard > Settings > Private Apps
        """
        self.api_key = api_key
        if Configuration and ContactsApiClient:
            configuration = Configuration()
            configuration.api_key["hapikey"] = api_key
            self.client = ContactsApiClient(configuration)
        else:
            self.client = None
    
    def create_contact(self, phone: str, name: str = None, email: str = None) -> Optional[str]:
        """Create new contact in HubSpot"""
        if not self.client or not SimplePublicObjectInput:
            print("[HubSpotCRMIntegration] SDK not installed or client inactive.")
            return None
            
        properties = {
            "firstname": name.split()[0] if name else "",
            "lastname": name.split()[-1] if name and len(name.split()) > 1 else "",
            "phone": phone,
            "email": email or ""
        }
        
        simple_public_object_input = SimplePublicObjectInput(properties=properties)
        
        try:
            api_response = self.client.create(
                simple_public_object_input=simple_public_object_input
            )
            return api_response.id
        except ApiException as e:
            print(f"Exception creating contact: {e}")
            return None
    
    def update_contact(self, contact_id: str, properties: dict) -> bool:
        """Update existing contact"""
        if not self.client or not SimplePublicObjectInput:
            return False
            
        simple_public_object_input = SimplePublicObjectInput(properties=properties)
        
        try:
            self.client.update(
                contact_id=contact_id,
                simple_public_object_input=simple_public_object_input
            )
            return True
        except ApiException as e:
            print(f"Exception updating contact: {e}")
            return False
    
    def add_deal(self, contact_id: str, deal_data: dict) -> Optional[str]:
        """Create a deal for this contact"""
        # Deals API implementation hook
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
        "closed_lost": "7"
    }
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
            "Content-Type": "application/json"
        }
    
    def check_property_availability(self, property_id: str) -> Optional[Dict]:
        """
        Check property availability and details
        GET /properties/{property_id}
        """
        if not requests:
            return None
        endpoint = f"{self.BASE_URL}/properties/{property_id}"
        
        try:
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
                    "description": data.get("description")
                }
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Property availability request error: {e}")
            return None
    
    def search_properties(self, filters: Dict) -> List[Dict]:
        """Search properties with filters"""
        if not requests:
            return []
        endpoint = f"{self.BASE_URL}/properties/search"
        
        try:
            response = requests.post(
                endpoint,
                headers=self.headers,
                json=filters,
                timeout=15
            )
            if response.status_code == 200:
                return response.json().get("results", [])
            else:
                print(f"Search error: {response.status_code}")
                return []
        except Exception as e:
            print(f"Property search request error: {e}")
            return []
    
    def get_latest_properties(self, limit: int = 10) -> List[Dict]:
        """Get newest properties in system"""
        if not requests:
            return []
        endpoint = f"{self.BASE_URL}/properties/latest?limit={limit}"
        try:
            response = requests.get(endpoint, headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json().get("results", [])
            return []
        except Exception as e:
            print(f"Get latest properties error: {e}")
            return []


# Property Finder Configuration
PROPERTY_FINDER_CONFIG = {
    "api_key": "YOUR_PROPERTY_FINDER_API_KEY",
    "base_url": "https://api.property-finder.eg/v2",
    "webhook_url": "https://yourserver.com/webhooks/property-updates"
}

# ============================================================================
# 3. WHATSAPP BUSINESS API (Twilio / Meta Cloud API)
# ============================================================================

try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None  # type: ignore


class WhatsAppIntegration:
    """Twilio WhatsApp Integration"""
    
    def __init__(self, account_sid: str, auth_token: str, whatsapp_from: str):
        self.whatsapp_from = whatsapp_from
        if TwilioClient:
            self.client = TwilioClient(account_sid, auth_token)
        else:
            self.client = None
    
    def send_message(self, to_phone: str, message_body: str) -> Optional[str]:
        """Send WhatsApp message"""
        if not self.client:
            print(f"[WhatsApp Mock] To: {to_phone} | Msg: {message_body}")
            return "mock-sid"
            
        try:
            message = self.client.messages.create(
                from_=f"whatsapp:{self.whatsapp_from}",
                body=message_body,
                to=f"whatsapp:{to_phone}"
            )
            return message.sid
        except Exception as e:
            print(f"WhatsApp send error: {e}")
            return None


class MetaCloudWhatsAppIntegration:
    """Official Meta Cloud WhatsApp API Integration"""
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def send_text_message(self, to_phone: str, text: str) -> bool:
        if not requests:
            return False
        endpoint = f"{self.BASE_URL}/{self.phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone.replace("+", ""),
            "type": "text",
            "text": {"body": text}
        }
        try:
            resp = requests.post(endpoint, headers=self.headers, json=payload, timeout=10)
            return resp.status_code in [200, 201]
        except Exception as e:
            print(f"Meta send error: {e}")
            return False


# ============================================================================
# 4. CALENDAR SCHEDULING API (Google Calendar)
# ============================================================================

try:
    from google.auth.transport.requests import Request
    from google.oauth2.service_account import Credentials as ServiceAccountCredentials
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    Request = None  # type: ignore
    ServiceAccountCredentials = None  # type: ignore
    build = None  # type: ignore
    HttpError = Exception  # type: ignore


class GoogleCalendarIntegration:
    """Google Calendar API for Scheduling"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, credentials_json_path: str):
        if ServiceAccountCredentials and build and os.path.exists(credentials_json_path):
            self.creds = ServiceAccountCredentials.from_service_account_file(
                credentials_json_path,
                scopes=self.SCOPES
            )
            self.service = build('calendar', 'v3', credentials=self.creds)
        else:
            self.service = None
        self.calendar_id = 'primary'
    
    def create_viewing_event(self, customer_email: str, property_data: Dict, 
                             start_time: datetime, duration_minutes: int = 60) -> Optional[Dict]:
        """Create calendar event for property viewing"""
        if not self.service:
            return {"mock": True, "summary": f"Viewing at {property_data.get('location')}"}
            
        end_time = start_time + timedelta(minutes=duration_minutes)
        event = {
            'summary': f'عرض عقار - {property_data.get("location")}',
            'description': f"📍 الموقع: {property_data.get('location')}\n🏠 النوع: {property_data.get('property_type')}\n💰 السعر: {property_data.get('price')}",
            'start': {'dateTime': start_time.isoformat(), 'timeZone': 'Africa/Cairo'},
            'end': {'dateTime': end_time.isoformat(), 'timeZone': 'Africa/Cairo'},
            'attendees': [{'email': customer_email}],
        }
        try:
            return getattr(self.service, 'events')().insert(calendarId=self.calendar_id, body=event).execute()
        except Exception as e:
            print(f"Calendar create event error: {e}")
            return None


# ============================================================================
# 5. ANALYTICS & TRACKING (Mixpanel)
# ============================================================================

try:
    import mixpanel
except ImportError:
    mixpanel = None  # type: ignore


class AnalyticsIntegration:
    """Bot Analytics & Conversion Tracking"""
    
    def __init__(self, mixpanel_token: str):
        if mixpanel:
            self.mp = mixpanel.Mixpanel(mixpanel_token)
        else:
            self.mp = None
    
    def track_inquiry(self, phone: str, reference_code: str):
        """Track new inquiry"""
        if self.mp:
            self.mp.track(phone, 'Inquiry_Received', {'reference_code': reference_code, 'timestamp': datetime.now().isoformat()})
        else:
            print(f"[Analytics Mock] Inquiry tracked: {phone} -> {reference_code}")


# ============================================================================
# 6. UNIFIED ENVIRONMENT CONFIGURATION
# ============================================================================

INTEGRATED_CONFIG = {
    'hubspot': {
        'api_key': os.getenv('HUBSPOT_API_KEY')
    },
    'property_finder': {
        'api_key': os.getenv('PROPERTY_FINDER_API_KEY')
    },
    'whatsapp': {
        'phone_number_id': os.getenv('META_PHONE_NUMBER_ID'),
        'access_token': os.getenv('META_ACCESS_TOKEN')
    },
    'google_calendar': {
        'credentials_json': os.getenv('GOOGLE_CALENDAR_CREDENTIALS')
    },
    'mixpanel': {
        'token': os.getenv('MIXPANEL_TOKEN')
    }
}
