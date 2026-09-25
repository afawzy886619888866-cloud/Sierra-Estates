"""
SIERRA BLUE BOT - API INTEGRATION GUIDE
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
        # This would use the Deals API
        # Implementation depends on HubSpot SDK version
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
        
        filters = {
            "property_type": "apartment",
            "bedrooms": 2,
            "furnishing": "fully_furnished",
            "location": "new_cairo",
            "price_min": 10000,
            "price_max": 30000,
            "available_only": True
        }
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
    
    def get_latest_properties(self, limit: int = 10) -> List[Dict]:
        """Get newest properties in system"""
        endpoint = f"{self.BASE_URL}/properties/latest?limit={limit}"
        response = requests.get(endpoint, headers=self.headers)
        
        if response.status_code == 200:
            return response.json().get("results", [])
        return []

# Property Finder Configuration
PROPERTY_FINDER_CONFIG = {
    "api_key": "YOUR_PROPERTY_FINDER_API_KEY",
    "base_url": "https://api.property-finder.eg/v2",
    "webhook_url": "https://yourserver.com/webhooks/property-updates"
}

# ============================================================================
# 3. WhatsApp API INTEGRATION (Twilio / Meta Official API)
# ============================================================================

# Installation
# pip install twilio

from twilio.rest import Client

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
            to=f"whatsapp:{to_phone}"
        )
        return message.sid
    
    def send_message_with_media(self, to_phone: str, message_body: str, media_url: str) -> str:
        """Send WhatsApp message with image/document"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            body=message_body,
            media_url=[media_url],
            to=f"whatsapp:{to_phone}"
        )
        return message.sid
    
    def send_template_message(self, to_phone: str, template_name: str, params: List[str]) -> str:
        """Send WhatsApp template message (pre-approved by Meta)"""
        message = self.client.messages.create(
            from_=f"whatsapp:{self.whatsapp_from}",
            to=f"whatsapp:{to_phone}",
            content_sid=template_name,  # Pre-approved template
            content_variables=params
        )
        return message.sid
    
    def send_reminder_24h_before(self, phone: str, property_code: str, 
                                  viewing_time: str, location: str) -> str:
        """Send automated reminder before viewing"""
        message_body = f"""📍 تذكير معاينة عقار
        
الوحدة: {property_code}
الموعد: {viewing_time}
الموقع: {location}

نتطلع لرؤيتك! 🎉"""
        
        return self.send_message(phone, message_body)

# Twilio WhatsApp Configuration
WHATSAPP_CONFIG = {
    "account_sid": "YOUR_TWILIO_ACCOUNT_SID",
    "auth_token": "YOUR_TWILIO_AUTH_TOKEN",
    "whatsapp_from": "+20123456789",  # Your WhatsApp Business number
    "templates": {
        "initial_greeting": "sierra_blue_greeting_ar",
        "viewing_confirmation": "sierra_blue_viewing_confirmation_ar",
        "viewing_reminder": "sierra_blue_viewing_reminder_ar"
    }
}

# Alternative: Meta Official WhatsApp API
class MetaWhatsAppIntegration:
    """Direct Meta WhatsApp Business API Integration"""
    
    def __init__(self, phone_number_id: str, access_token: str):
        """
        phone_number_id: Your WhatsApp Business Phone Number ID
        access_token: Meta API Access Token
        """
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

# Meta Configuration
META_WHATSAPP_CONFIG = {
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_META_ACCESS_TOKEN",
    "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID"
}

# ============================================================================
# 4. GOOGLE CALENDAR API INTEGRATION
# ============================================================================

# Installation
# pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.urllib3 import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta

class GoogleCalendarIntegration:
    """Google Calendar API for Scheduling"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, credentials_json_path: str):
        """
        credentials_json_path: Path to service account JSON file
        Download from Google Cloud Console > APIs & Services > Credentials
        """
        self.creds = ServiceAccountCredentials.from_service_account_file(
            credentials_json_path,
            scopes=self.SCOPES
        )
        self.service = build('calendar', 'v3', credentials=self.creds)
        self.calendar_id = 'primary'  # Or specific calendar ID
    
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

رابط الوحدة: {property_data.get('link')}
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
                {'email': 'agent@sierrablue.com'}  # Your agent email
            ],
            'location': 'سييرا بلو - مكتب التجمع الخامس',
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 1440},  # 24 hours before
                    {'method': 'popup', 'minutes': 30}      # 30 minutes before
                ]
            }
        }
        
        try:
            created_event = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event,
                sendUpdates='all'  # Send notifications to attendees
            ).execute()
            
            return {
                'success': True,
                'event_id': created_event['id'],
                'event_link': created_event.get('htmlLink'),
                'start_time': created_event['start']['dateTime']
            }
        except HttpError as error:
            print(f'Calendar API error: {error}')
            return {'success': False, 'error': str(error)}
    
    def find_available_slots(self, agent_email: str, date: datetime, 
                            num_slots: int = 5, duration_minutes: int = 60) -> List[Dict]:
        """Find available time slots for agent"""
        
        day_start = date.replace(hour=10, minute=0, second=0, microsecond=0)
        day_end = date.replace(hour=18, minute=0, second=0, microsecond=0)
        
        # Get agent's busy times
        freebusy_body = {
            'items': [{'id': agent_email}],
            'timeMin': day_start.isoformat(),
            'timeMax': day_end.isoformat(),
            'intervalMinutes': 60
        }
        
        try:
            freebusy = self.service.freebusy().query(body=freebusy_body).execute()
            
            busy_times = freebusy['calendars'][agent_email]['busy']
            
            available_slots = []
            current_time = day_start
            
            while current_time < day_end:
                slot_end = current_time + timedelta(minutes=duration_minutes)
                
                # Check if this slot is free
                is_free = True
                for busy in busy_times:
                    busy_start = datetime.fromisoformat(busy['start'])
                    busy_end = datetime.fromisoformat(busy['end'])
                    
                    if (current_time < busy_end and slot_end > busy_start):
                        is_free = False
                        break
                
                if is_free:
                    available_slots.append({
                        'start': current_time,
                        'end': slot_end,
                        'display': current_time.strftime('%H:%M')
                    })
                
                current_time += timedelta(minutes=60)
            
            return available_slots[:num_slots]
        
        except HttpError as error:
            print(f'Calendar API error: {error}')
            return []

# Google Calendar Configuration
GOOGLE_CALENDAR_CONFIG = {
    "credentials_json": "/path/to/service-account-key.json",
    "calendar_id": "sierra-blue-viewings@sierrablue.com",
    "agent_emails": [
        "agent1@sierrablue.com",
        "agent2@sierrablue.com"
    ],
    "timezone": "Africa/Cairo"
}

# ============================================================================
# 5. ANALYTICS & TRACKING (Mixpanel / Custom)
# ============================================================================

import mixpanel

class AnalyticsIntegration:
    """Bot Analytics & Conversion Tracking"""
    
    def __init__(self, mixpanel_token: str):
        """
        mixpanel_token: Get from Mixpanel Dashboard
        """
        self.mp = mixpanel.Mixpanel(mixpanel_token)
    
    def track_inquiry(self, phone: str, reference_code: str):
        """Track new inquiry"""
        self.mp.track(
            phone,
            'Inquiry_Received',
            {
                'reference_code': reference_code,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def track_discovery_complete(self, phone: str, preferences: Dict):
        """Track when customer completes discovery questions"""
        self.mp.track(
            phone,
            'Discovery_Completed',
            {
                'property_type': preferences.get('property_type'),
                'bedrooms': preferences.get('bedrooms'),
                'location': preferences.get('location')
            }
        )
    
    def track_viewing_scheduled(self, phone: str, event_data: Dict):
        """Track viewing appointment scheduled"""
        self.mp.track(
            phone,
            'Viewing_Scheduled',
            {
                'viewing_time': event_data.get('time'),
                'properties_count': len(event_data.get('properties', []))
            }
        )
    
    def track_handover(self, phone: str, lead_value: Dict):
        """Track handover to human agent"""
        self.mp.track(
            phone,
            'Lead_Handover',
            {
                'matched_properties': len(lead_value.get('matched_properties', [])),
                'conversation_messages': lead_value.get('conversation_count', 0)
            }
        )

# ============================================================================
# 6. COMPLETE INTEGRATION EXAMPLE
# ============================================================================

class IntegratedSierraBlueBot:
    """Bot with all real API integrations"""
    
    def __init__(self, config: Dict):
        """Initialize all API clients"""
        self.hubspot = HubSpotCRMIntegration(config['hubspot']['api_key'])
        self.property_api = PropertyFinderRealAPI(config['property_finder']['api_key'])
        self.whatsapp = MetaWhatsAppIntegration(
            config['whatsapp']['phone_number_id'],
            config['whatsapp']['access_token']
        )
        self.calendar = GoogleCalendarIntegration(
            config['google_calendar']['credentials_json']
        )
        self.analytics = AnalyticsIntegration(config['mixpanel']['token'])
    
    def process_full_inquiry(self, phone: str, reference_code: str):
        """End-to-end inquiry processing with all integrations"""
        
        # 1. Track inquiry
        self.analytics.track_inquiry(phone, reference_code)
        
        # 2. Create contact in CRM
        contact_id = self.hubspot.create_contact(phone)
        
        # 3. Check property availability
        property_data = self.property_api.check_property_availability(reference_code)
        
        # 4. Send WhatsApp greeting
        greeting_msg = f"أهلاً بحضرتك في سييرا بلو"
        self.whatsapp.send_text_message(phone, greeting_msg)
        
        # 5. Track discovery and schedule
        # ... continue workflow
        
        return contact_id, property_data

# ============================================================================
# 7. DEPLOYMENT CONFIGURATION (Environment Variables)
# ============================================================================

"""
Create .env file in your project root:

# HubSpot
HUBSPOT_API_KEY=your_hubspot_api_key
HUBSPOT_PIPELINE_ID=your_pipeline_id

# Property Finder
PROPERTY_FINDER_API_KEY=your_property_finder_key

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=+20123456789

# WhatsApp (Meta)
META_PHONE_NUMBER_ID=your_phone_id
META_ACCESS_TOKEN=your_meta_token

# Google Calendar
GOOGLE_CALENDAR_CREDENTIALS=/path/to/credentials.json

# Analytics
MIXPANEL_TOKEN=your_mixpanel_token

# Bot Configuration
BOT_NAME=Sierra Blue AI
BOT_TIMEZONE=Africa/Cairo
"""

# Load environment variables
from dotenv import load_dotenv
import os

load_dotenv()

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

# ============================================================================
# 8. TESTING CURL COMMANDS
# ============================================================================

"""
Test Property Finder API:
curl -X GET https://api.property-finder.eg/v2/properties/SB001 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

Test WhatsApp API:
curl -X POST https://graph.instagram.com/v18.0/{phone_number_id}/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "20123456789",
    "type": "text",
    "text": {
      "body": "Hello from Sierra Blue!"
    }
  }'

Test Google Calendar:
python -m pytest tests/test_calendar_integration.py

Test HubSpot:
python -m pytest tests/test_hubspot_integration.py
"""
