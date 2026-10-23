"""
sierra estatesE BOT - API INTEGRATION GUIDE
Real API Endpoints & Configuration Examples
"""

# ============================================================================
# 1. CRM INTEGRATION (HubSpot)
# ============================================================================

# Installation
# pip install hubspot-client

from hubspot.crm.contacts import ApiClient as ContactsApiClient
from hubspot.crm.objects.contacts import ApiException
from hubspot.configuration import Configuration

class HubSpotCRMIntegration:
    """Real HubSpot Integration"""
    
    def __init__(self, api_key: str):
        """
        api_key: Get from HubSpot Dashboard > Settings > Private Apps
        """
        configuration = Configuration()
        configuration.api_key["hapikey"] = api_key
        self.client = ContactsApiClient(configuration)
    
    def create_contact(self, phone: str, name: str = None, email: str = None) -> str:
        """Create new contact in HubSpot"""
        from hubspot.crm.contacts.models import SimplePublicObjectInput
        
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
        from hubspot.crm.contacts.models import SimplePublicObjectInput
        
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
    
    def add_deal(self, contact_id: str, deal_data: dict) -> str:
        """Create a deal for this contact"""
        pass

# HubSpot Configuration Example
HUBSPOT_CONFIG = {
    "api_key": "YOUR_HUBSPOT_API_KEY",
    "pipeline_id": "real_estate_pipeline",
    "deal_stages": {
        "inquiry": "1",  # Stage ID in HubSpot
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

import requests
from typing import Dict, List

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
    
    def check_property_availability(self, property_id: str) -> Dict:
        """
        Check property availability and details
        GET /properties/{property_id}
        """
        endpoint = f"{self.BASE_URL}/properties/{property_id}"
        
        response = requests.get(endpoint, headers=self.headers)
        
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
    
    def search_properties(self, filters: Dict) -> List[Dict]:
        """
        Search properties with filters
        POST /properties/search
        """
        endpoint = f"{self.BASE_URL}/properties/search"
        
        response = requests.post(
            endpoint,
            headers=self.headers,
            json=filters
        )
        
        if response.status_code == 200:
            return response.json().get("results", [])
        else:
            print(f"Search error: {response.status_code}")
            return []

# ============================================================================
# 3. WhatsApp API INTEGRATION (Twilio / Meta Official API)
# ============================================================================

from twilio.rest import Client

class WhatsAppIntegration:
    """Twilio WhatsApp Integration"""
    
    def __init__(self, account_sid: str, auth_token: str, whatsapp_from: str):
        self.client = Client(account_sid, auth_token)
        self.whatsapp_from = whatsapp_from
    
    def send_message(self, to_phone: str, message_body: str) -> str:
        """Send WhatsApp message"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            body=message_body,
            to=f"whatsapp:{to_phone}"
        )
        return message.sid

# Direct Meta WhatsApp Business API Integration
class MetaWhatsAppIntegration:
    """Direct Meta WhatsApp Business API Integration"""
    
    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.base_url = f"https://graph.instagram.com/v18.0/{phone_number_id}/messages"
    
    def send_text_message(self, recipient_phone: str, message_text: str) -> Dict:
        """Send text message"""
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_text
            }
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(self.base_url, json=payload, headers=headers)
        return response.json()

# ============================================================================
# 4. GOOGLE CALENDAR API INTEGRATION
# ============================================================================

from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class GoogleCalendarIntegration:
    """Google Calendar API for Scheduling"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, credentials_json_path: str):
        self.creds = ServiceAccountCredentials.from_service_account_file(
            credentials_json_path,
            scopes=self.SCOPES
        )
        self.service = build('calendar', 'v3', credentials=self.creds)
        self.calendar_id = 'primary'
    
    def create_viewing_event(self, customer_email: str, property_data: Dict, 
                           start_time: datetime, duration_minutes: int = 60) -> Dict:
        """Create calendar event for property viewing"""
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        event = {
            'summary': f'عرض عقار - {property_data.get("location")}',
            'description': f"""
📍 الموقع: {property_data.get('location')}
🏠 النوع: {property_data.get('property_type')}
🛏️ الغرف: {property_data.get('bedrooms')}
💰 السعر: {property_data.get('price')}
            """,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Africa/Cairo'
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'Africa/Cairo'
            },
            'attendees': [
                {'email': customer_email},
                {'email': 'agent@sierraestatese.com'}
            ],
            'location': 'سييرا بلو - مكتب التجمع الخامس',
        }
        
        try:
            created_event = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            return {
                'success': True,
                'event_id': created_event['id'],
                'event_link': created_event.get('htmlLink')
            }
        except HttpError as error:
            print(f'Calendar API error: {error}')
            return {'success': False, 'error': str(error)}
