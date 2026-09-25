"""
Sierra Blue AI Real Estate Bot - Complete Implementation
Version: 2026
Purpose: Automate customer journey from inquiry to human handover
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
import uuid

# Ensure UTF-8 stdout encoding on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ============================================================================
# STEP 1: DATA MODELS & ENUMS
# ============================================================================

class PropertyType(Enum):
    """Enumeration of real estate property types."""
    APARTMENT = "شقة"
    VILLA = "فيلا"
    PENTHOUSE = "بنت هاوس"
    DUPLEX = "دوبلكس"


class FurnishingLevel(Enum):
    """Property furnishing completion levels."""
    FULLY_FURNISHED = "مفروشة بالكامل"
    SEMI_FURNISHED = "نص فرش"
    UNFURNISHED = "فاضية"


class PropertyStatus(Enum):
    """Live inventory availability statuses."""
    AVAILABLE = "متاحة"
    TAKEN = "مؤجرة"
    PENDING = "قيد المراجعة"
    INACTIVE = "معطلة"


class BotStep(Enum):
    """Conversation funnel stages."""
    STEP1_GREETING = 1
    STEP2_API_CHECK = 2
    STEP3_AVAILABILITY_REPORT = 3
    STEP4_DISCOVERY_PIVOT = 4
    STEP5_SCHEDULING = 5
    STEP6_HANDOVER = 6


@dataclass
class PropertyData:
    """Property Information Model"""
    code: str
    property_type: PropertyType
    bedrooms: int
    furnishing_level: FurnishingLevel
    location: str
    status: PropertyStatus
    last_updated: datetime
    price: float
    image_url: Optional[str] = None
    compound_name: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert property data into dictionary format."""
        return {
            "code": self.code,
            "property_type": self.property_type.value,
            "bedrooms": self.bedrooms,
            "furnishing_level": self.furnishing_level.value,
            "location": self.location,
            "status": self.status.value,
            "last_updated": self.last_updated.isoformat(),
            "price": self.price
        }


@dataclass
class CustomerPreferences:
    """Customer Requirements Model"""
    property_type: Optional[PropertyType] = None
    bedrooms: Optional[int] = None
    furnishing_level: Optional[FurnishingLevel] = None
    location: Optional[str] = None
    compound_preference: Optional[str] = None
    near_workplace: Optional[str] = None
    near_school: Optional[str] = None
    must_haves: Optional[List[str]] = None  # e.g., ["balcony", "elevator", "garden"]
    move_in_date: Optional[datetime] = None
    rental_duration_months: Optional[int] = None

    def __post_init__(self):
        if self.must_haves is None:
            self.must_haves = []


@dataclass
class LeadProfile:
    """Complete Customer Profile"""
    lead_id: Optional[str]
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    initial_inquiry_code: Optional[str] = None
    inquiry_timestamp: Optional[datetime] = None
    preferences: Optional[CustomerPreferences] = None
    matched_properties: Optional[List[PropertyData]] = None
    scheduled_viewing: Optional[Dict] = None
    conversation_history: Optional[List[Dict]] = None
    current_step: BotStep = BotStep.STEP1_GREETING

    def __post_init__(self):
        if self.preferences is None:
            self.preferences = CustomerPreferences()
        if self.matched_properties is None:
            self.matched_properties = []
        if self.conversation_history is None:
            self.conversation_history = []
        if self.inquiry_timestamp is None:
            self.inquiry_timestamp = datetime.now()

# ============================================================================
# STEP 2: SYSTEM PROMPT (Bot Persona)
# ============================================================================

SIERRA_BLUE_SYSTEM_PROMPT = """أنت مستشار عقاري ذكي في شركة سييرا بلو.

**هويتك:**
- الاسم: Sierra Blue AI Advisor
- اللغة: اللهجة المصرية الاحترافية المهذبة
- الفلسفة: ما وراء الوساطة - نحن لا نبيع، نحن نساعدك على اتخاذ القرار الأفضل

**القاعدة الذهبية:**
تحدث بصراحة تامة عن حالة الوحدات. حماية العميل من الوحدات الوهمية أولويتك الأولى.

**القيم الأساسية:**
1. الصدق والشفافية في كل معاملة
2. احترام وقت العميل
3. كفاءة عالية في البحث والتوصيات
4. لطف واحترافية في التواصل
5. الاستماع الفعال لاحتياجات العميل

**نمط التواصل:**
- استخدم كلمات دافئة: "يا فندم"، "حضرتك"، "ممتاز"
- اجعل الرسائل قصيرة وسهلة الفهم
- اطرح أسئلة واحدة أو اثنتين في كل رسالة
- كن متحمساً لمساعدة العميل
"""

# ============================================================================
# STEP 3: API INTEGRATION MOCK (Replace with real APIs)
# ============================================================================

class PropertyFinderAPI:
    """Mock API for Property Finder Integration"""

    def __init__(self):
        # Mock database
        self.properties_db = {
            "SB001": PropertyData(
                code="SB001",
                property_type=PropertyType.APARTMENT,
                bedrooms=2,
                furnishing_level=FurnishingLevel.FULLY_FURNISHED,
                location="التجمع الخامس",
                status=PropertyStatus.AVAILABLE,
                last_updated=datetime.now(),
                price=15000,
                compound_name="Mountain View"
            ),
            "SB002": PropertyData(
                code="SB002",
                property_type=PropertyType.VILLA,
                bedrooms=3,
                furnishing_level=FurnishingLevel.SEMI_FURNISHED,
                location="التجمع الأول",
                status=PropertyStatus.TAKEN,
                last_updated=datetime.now() - timedelta(days=2),
                price=25000,
                compound_name="Palm Hills"
            )
        }

    def check_property_availability(self, code: str) -> Tuple[Optional[PropertyData], bool]:
        """
        Check if property exists and is available
        Returns: (PropertyData, is_available)
        """
        if code not in self.properties_db:
            return None, False

        property_data = self.properties_db[code]
        is_available = property_data.status == PropertyStatus.AVAILABLE

        return property_data, is_available

    def search_properties(self, preferences: CustomerPreferences) -> List[PropertyData]:
        """Search properties matching customer preferences"""
        results = []

        for prop in self.properties_db.values():
            # Filter by preferences
            if preferences.property_type and prop.property_type != preferences.property_type:
                continue
            if preferences.bedrooms and prop.bedrooms != preferences.bedrooms:
                continue
            if (preferences.furnishing_level and
                    prop.furnishing_level != preferences.furnishing_level):
                continue
            if preferences.location and preferences.location not in prop.location:
                continue
            if prop.status != PropertyStatus.AVAILABLE:
                continue

            results.append(prop)

        return results[:3]  # Return top 3 matches


class CRMSystem:
    """Mock CRM Integration (HubSpot/Notion equivalent)"""

    def __init__(self):
        self.leads_db = {}

    def create_lead(self, lead_profile: LeadProfile) -> str:
        """Create new lead in CRM"""
        lead_profile.lead_id = str(uuid.uuid4())
        self.leads_db[lead_profile.lead_id] = lead_profile
        print(f"✓ Lead created in CRM: {lead_profile.lead_id}")
        return lead_profile.lead_id

    def update_lead(self, lead_profile: LeadProfile) -> bool:
        """Update existing lead"""
        if lead_profile.lead_id in self.leads_db:
            self.leads_db[lead_profile.lead_id] = lead_profile
            print(f"✓ Lead updated: {lead_profile.lead_id}")
            return True
        return False

    def get_lead(self, lead_id: str) -> Optional[LeadProfile]:
        """Retrieve lead from CRM"""
        return self.leads_db.get(lead_id)


class WhatsAppAPI:
    """Mock WhatsApp Integration"""

    @staticmethod
    def send_message(phone_number: str, message: str, message_type: str = "text") -> bool:
        """Send WhatsApp message"""
        print(f"📱 WhatsApp [{message_type}] -> {phone_number}")
        print(f"   {message[:80]}...")
        return True

    @staticmethod
    def send_reminder(phone_number: str, viewing_time: str, property_details: str) -> bool:
        """Send reminder before viewing"""
        message = f"📍 تذكير: لديك معاينة في {viewing_time}\n{property_details}"
        return WhatsAppAPI.send_message(phone_number, message, message_type="reminder")


class GoogleCalendarAPI:
    """Mock Google Calendar Integration"""

    @staticmethod
    def create_event(event_data: Dict) -> Dict:
        """Create calendar event for viewing"""
        event_id = str(uuid.uuid4())
        print(f"📅 Calendar event created: {event_id}")
        return {
            "event_id": event_id,
            "date": event_data.get("date"),
            "time": event_data.get("time"),
            "title": event_data.get("title"),
            "location": event_data.get("location")
        }

    @staticmethod
    def suggest_available_slots(duration_minutes: int = 60) -> List[Dict]:
        """Suggest available time slots"""
        suggestions = []
        base_date = datetime.now() + timedelta(days=1)

        for hour in [10, 14, 16]:
            suggestions.append({
                "date": base_date.strftime("%Y-%m-%d"),
                "time": f"{hour:02d}:00",
                "duration_minutes": duration_minutes,
                "display": f"يوم {base_date.strftime('%A')} الساعة {hour}:00"
            })

        return suggestions

# ============================================================================
# STEP 4: CORE BOT LOGIC (6-Step Workflow)
# ============================================================================

class SierraBlueBot:
    """Main Bot Engine - Orchestrates entire customer journey"""

    def __init__(self):
        self.property_api = PropertyFinderAPI()
        self.crm = CRMSystem()
        self.whatsapp = WhatsAppAPI()
        self.calendar = GoogleCalendarAPI()
        self.current_lead: Optional[LeadProfile] = None

    def process_inquiry(self, phone_number: str, reference_code: Optional[str] = None) -> str:
        """
        STEP 1 & 2: Greeting + API Check
        Entry point for customer inquiry
        """
        print(f"\n{'='*70}")
        print("STEP 1-2: 🎯 GREETING & AVAILABILITY CHECK")
        print(f"{'='*70}\n")

        # Create lead profile
        lead = LeadProfile(
            lead_id=None,
            phone_number=phone_number,
            initial_inquiry_code=reference_code,
            current_step=BotStep.STEP1_GREETING
        )

        # Create in CRM
        self.crm.create_lead(lead)
        self.current_lead = lead

        # Bot greeting message
        greeting = f"""أهلاً بحضرتك في سييرا بلو، مستشارك العقاري الذكي.
ثواني هراجع السيستم حالاً عشان أتأكدلك إذا كانت الوحدة دي (كود: {reference_code}) لسه متاحة ولا لأ.

وبستأذنك عقبال ما أراجع، أعرف من حضرتك:
- ناوي تنقل إمتى بالظبط؟
- ومدة الإيجار المطلوبة قد إيه؟"""

        print("🤖 BOT:", greeting)
        lead.conversation_history.append({
            "role": "bot",
            "message": greeting,
            "timestamp": datetime.now().isoformat()
        })

        # Step 2: API Check
        if reference_code:
            prop_data, is_avail = self.property_api.check_property_availability(reference_code)

            if prop_data:
                self._step3_availability_report(prop_data, is_avail)
            else:
                self._availability_not_found(reference_code)

        return lead.lead_id or ""

    def _step3_availability_report(self, property_data: PropertyData, is_available: bool):
        """
        STEP 3: Availability Report (Transparency)
        """
        print(f"\n{'='*70}")
        print("STEP 3: 📊 AVAILABILITY REPORT")
        print(f"{'='*70}\n")

        status_text = "متاحة ✓" if is_available else "للأسف تم تأجيرها ✗"
        last_update = property_data.last_updated.strftime("%d/%m/%Y")

        report = f"""شكراً لانتظارك. أنا راجعت بيانات الوحدة، ووفقاً لآخر تحديث للإعلان يوم {last_update}،
الوحدة دي حالياً {status_text}

**تفاصيل الوحدة:**
📍 المنطقة: {property_data.location}
🏠 النوع: {property_data.property_type.value}
🛏️ عدد الغرف: {property_data.bedrooms}
🛋️ الفرش: {property_data.furnishing_level.value}
💰 السعر: {property_data.price:,} جنيه

وعموماً، إحنا في سييرا بلو بنعمل مسح شامل للماركت كله بالذكاء الاصطناعي،
وكل الوحدات اللي بنرشحها حقيقية 100% ونزلنا عاينّاها بنفسنا."""

        print("🤖 BOT:", report)
        if self.current_lead:
            self.current_lead.conversation_history.append({
                "role": "bot",
                "message": report,
                "timestamp": datetime.now().isoformat()
            })

            # Move to Step 4
            self.current_lead.current_step = BotStep.STEP4_DISCOVERY_PIVOT
        self._step4_discovery_pivot()

    def _availability_not_found(self, code: str):
        """Handle case when property is not found"""
        message = f"""عذراً يا فندم، الوحدة برقم {code} لم نتمكن من العثور عليها في النظام.
قد تكون الوحدة قديمة أو الكود غير صحيح.

لكن لا تقلق! إحنا قادرين نوفر لك خيارات أفضل من السوق كله.
تفضل، أعرفني بالتفاصيل اللي بتدور عليها؟"""

        print("🤖 BOT:", message)
        if self.current_lead:
            self.current_lead.conversation_history.append({
                "role": "bot",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
            self.current_lead.current_step = BotStep.STEP4_DISCOVERY_PIVOT
        self._step4_discovery_pivot()

    def _step4_discovery_pivot(self):
        """
        STEP 4: Discovery Pivot
        Transform from property inquirer to consulting customer
        """
        print(f"\n{'='*70}")
        print("STEP 4: 🔄 DISCOVERY PIVOT (Qualification)")
        print(f"{'='*70}\n")

        pivot_message = """عشان أقدر أساعدك توصل لأفضل عقار بأحسن سعر من السوق كله،
أستأذنك أعرف طلبك إيه تحديداً؟
هسألك كام سؤال سريع عشان السيستم يفلترلك أحسن الاختيارات.

**السؤال الأول:**
بتدور على شقة ولا فيلا؟ ومحتاج كم غرفة نوم؟"""

        print("🤖 BOT:", pivot_message)
        if self.current_lead:
            self.current_lead.conversation_history.append({
                "role": "bot",
                "message": pivot_message,
                "timestamp": datetime.now().isoformat()
            })
            self.current_lead.current_step = BotStep.STEP4_DISCOVERY_PIVOT

    def collect_customer_preferences(self,
                                    property_type: PropertyType,
                                    bedrooms: int,
                                    furnishing_level: FurnishingLevel,
                                    location: str,
                                    must_haves: Optional[List[str]] = None) -> List[PropertyData]:
        """
        Collect preferences from customer and search for matches
        """
        print(f"\n{'='*70}")
        print("STEP 4: 📋 PREFERENCE COLLECTION")
        print(f"{'='*70}\n")

        if not self.current_lead:
            return []

        # Update preferences
        self.current_lead.preferences = CustomerPreferences(
            property_type=property_type,
            bedrooms=bedrooms,
            furnishing_level=furnishing_level,
            location=location,
            must_haves=must_haves or []
        )

        # Search for matching properties
        matches = self.property_api.search_properties(self.current_lead.preferences)
        self.current_lead.matched_properties = matches

        acknowledgment = f"""ممتاز يا فندم! فهمت احتياجاتك:
✓ {property_type.value} بـ {bedrooms} غرف نوم
✓ {furnishing_level.value}
✓ في منطقة {location}

أنا دلوقتي بحث في كل السوق... ولقيت {len(matches)} وحدات مطابقة لطلبك!"""

        print("🤖 BOT:", acknowledgment)

        if matches:
            for i, prop in enumerate(matches, 1):
                print(f"\n📌 الوحدة #{i}:")
                print(f"   - الموقع: {prop.location}")
                print(f"   - السعر: {prop.price:,} جنيه")
                print(f"   - الحالة: {prop.status.value}")

        self._step5_schedule_viewing()
        return matches

    def _step5_schedule_viewing(self):
        """
        STEP 5: Schedule Viewing Automation
        """
        print(f"\n{'='*70}")
        print("STEP 5: 📅 SCHEDULING AUTOMATION")
        print(f"{'='*70}\n")

        # Get available time slots
        slots = self.calendar.suggest_available_slots()

        scheduling_message = f"""ممتاز يا فندم. أنا جهزت محفظة عقارية مبدئية ليك.
السيستم بيقترح علينا نحدد ميعاد معاينة عشان تشوف أفضل 3 وحدات مطابقة لطلبك في خروجة واحدة.

**الخيارات المتاحة:**
1️⃣ {slots[0]['display']}
2️⃣ {slots[1]['display']}
3️⃣ {slots[2]['display']}

إيه رأي حضرتك؟"""

        print("🤖 BOT:", scheduling_message)
        if self.current_lead:
            self.current_lead.conversation_history.append({
                "role": "bot",
                "message": scheduling_message,
                "timestamp": datetime.now().isoformat()
            })
            self.current_lead.current_step = BotStep.STEP5_SCHEDULING

    def confirm_viewing_appointment(self, slot_index: int):
        """
        Confirm viewing appointment and create calendar event
        """
        print(f"\n{'='*70}")
        print("STEP 5: ✅ APPOINTMENT CONFIRMATION")
        print(f"{'='*70}\n")

        if not self.current_lead:
            return

        slots = self.calendar.suggest_available_slots()
        selected_slot = slots[slot_index]

        # Create calendar event
        event = self.calendar.create_event({
            "title": f"معاينة عقارات - {self.current_lead.phone_number}",
            "date": selected_slot["date"],
            "time": selected_slot["time"],
            "location": "سييرا بلو - مكتب التجمع"
        })

        self.current_lead.scheduled_viewing = {
            "event_id": event["event_id"],
            "date": selected_slot["date"],
            "time": selected_slot["time"],
            "properties": [p.code for p in self.current_lead.matched_properties or []]
        }

        # Update CRM
        self.crm.update_lead(self.current_lead)

        # Send WhatsApp confirmation
        confirmation_message = f"""✅ تم تأكيد الموعد بنجاح!

📅 **موعد المعاينة:**
التاريخ: {selected_slot['date']}
الوقت: {selected_slot['time']}

📍 **الموقع:**
سييرا بلو - مكتب التجمع الخامس

📱 في أي سؤال، تواصل معنا على الواتس!"""

        print("🤖 BOT:", confirmation_message)
        self.whatsapp.send_message(self.current_lead.phone_number, confirmation_message)

        # Move to Step 6
        self._step6_human_handover()

    def _step6_human_handover(self):
        """
        STEP 6: Handover to Human Agent
        """
        print(f"\n{'='*70}")
        print("STEP 6: 🤝 HUMAN HANDOVER")
        print(f"{'='*70}\n")

        if not self.current_lead:
            return

        # Mark lead as ready for handover
        self.current_lead.current_step = BotStep.STEP6_HANDOVER

        # Generate Lead Profile Summary
        lead_summary = self.generate_lead_summary()

        # Send notification to human agent (Push Notification)
        self._notify_agent(lead_summary)

        # Send final message to customer
        final_message = """تم تسجيل بياناتك وحجز الموعد المبدئي.
المستشار العقاري المتخصص بتاعنا هيراجع الاختيارات دي شخصياً
وهيكلم حضرتك خلال ساعة بالكتير عشان يأكد معاك كل التفاصيل وخطة المعاينة.

يومك سعيد ونتمنى لك رحلة بحث مريحة مع سييرا بلو! 🎉"""

        print("🤖 BOT:", final_message)

        self.current_lead.conversation_history.append({
            "role": "bot",
            "message": final_message,
            "timestamp": datetime.now().isoformat()
        })

        # Update CRM final time
        self.crm.update_lead(self.current_lead)

    def generate_lead_summary(self) -> Dict:
        """Generate comprehensive lead profile for agent"""
        if not self.current_lead:
            return {}

        pref = self.current_lead.preferences
        summary = {
            "lead_id": self.current_lead.lead_id,
            "phone_number": self.current_lead.phone_number,
            "name": self.current_lead.name,
            "email": self.current_lead.email,
            "inquiry_timestamp": (
                self.current_lead.inquiry_timestamp.isoformat()
                if self.current_lead.inquiry_timestamp else None
            ),
            "preferences": {
                "property_type": (
                    pref.property_type.value if pref and pref.property_type else None
                ),
                "bedrooms": pref.bedrooms if pref else None,
                "furnishing_level": (
                    pref.furnishing_level.value if pref and pref.furnishing_level else None
                ),
                "location": pref.location if pref else None,
                "must_haves": pref.must_haves if pref else []
            },
            "matched_properties": [
                p.to_dict() for p in (self.current_lead.matched_properties or [])
            ],
            "viewing_appointment": self.current_lead.scheduled_viewing,
            "conversation_count": len(self.current_lead.conversation_history or [])
        }

        return summary

    def _generate_lead_summary(self) -> Dict:
        """Internal backwards-compatible alias."""
        return self.generate_lead_summary()

    def _notify_agent(self, lead_summary: Dict):
        """Send notification to human agent"""
        print("\n" + "🔔 "*10)
        print("⚡ AGENT NOTIFICATION - NEW QUALIFIED LEAD")
        print("🔔 "*10)
        print(json.dumps(lead_summary, ensure_ascii=False, indent=2))
        print("\n✓ Agent will contact customer within 1 hour\n")

# ============================================================================
# STEP 5: ANALYTICS & METRICS
# ============================================================================

class BotAnalytics:
    """Track bot performance and conversion rates"""

    def __init__(self):
        self.metrics = {
            "total_inquiries": 0,
            "completed_discovery": 0,
            "scheduled_viewings": 0,
            "handovers": 0,
            "conversion_rate": 0.0,
            "avg_messages_per_lead": 0.0,
            "step_abandonment": {}
        }

    def track_inquiry(self):
        """Record a new customer inquiry metric."""
        self.metrics["total_inquiries"] += 1

    def track_handover(self, lead: LeadProfile):
        """Record a completed handover to a human advisor."""
        self.metrics["handovers"] += 1
        if lead.scheduled_viewing:
            self.metrics["scheduled_viewings"] += 1
        history_len = len(lead.conversation_history or [])
        self.metrics["avg_messages_per_lead"] = (
            self.metrics["avg_messages_per_lead"] + history_len
        ) / 2

    def get_conversion_rate(self) -> float:
        """Calculate lead handover conversion rate percentage."""
        if self.metrics["total_inquiries"] == 0:
            return 0.0
        return (self.metrics["handovers"] / self.metrics["total_inquiries"]) * 100

    def print_report(self):
        """Print formatted analytics summary report."""
        print("\n" + "="*70)
        print("📊 BOT PERFORMANCE REPORT")
        print("="*70)
        print(f"Total Inquiries: {self.metrics['total_inquiries']}")
        print(f"Completed Handovers: {self.metrics['handovers']}")
        print(f"Scheduled Viewings: {self.metrics['scheduled_viewings']}")
        print(f"Conversion Rate: {self.get_conversion_rate():.1f}%")
        print(f"Avg Messages per Lead: {self.metrics['avg_messages_per_lead']:.1f}")
        print("="*70 + "\n")

# ============================================================================
# STEP 6: USAGE EXAMPLE
# ============================================================================

def main():
    """Run full customer journey demonstration."""
    print("\n" + "█"*70)
    print("🏢 SIERRA BLUE AI BOT - COMPLETE WORKFLOW DEMONSTRATION")
    print("█"*70)

    # Initialize bot and analytics
    bot = SierraBlueBot()
    analytics = BotAnalytics()

    # Simulate customer inquiry
    print("\n" + "🎯 "*15)
    print("SIMULATING CUSTOMER INQUIRY...")
    print("🎯 "*15)

    # Step 1-2: Process inquiry with reference code
    analytics.track_inquiry()
    bot.process_inquiry(
        phone_number="+201001234567",
        reference_code="SB001"
    )

    # Simulate customer response with preferences
    print("\n" + "📝 "*15)
    print("CUSTOMER PROVIDES PREFERENCES...")
    print("📝 "*15)

    bot.collect_customer_preferences(
        property_type=PropertyType.APARTMENT,
        bedrooms=2,
        furnishing_level=FurnishingLevel.FULLY_FURNISHED,
        location="التجمع",
        must_haves=["balcony", "elevator"]
    )

    # Step 5: Confirm viewing appointment
    print("\n" + "⏰ "*15)
    print("CUSTOMER SELECTS TIME SLOT...")
    print("⏰ "*15)

    bot.confirm_viewing_appointment(slot_index=0)

    # Track handover
    if bot.current_lead:
        analytics.track_handover(bot.current_lead)

    # Print analytics
    analytics.print_report()

    # Print final lead profile
    print("\n" + "="*70)
    print("📋 FINAL LEAD PROFILE (Ready for Agent Handoff)")
    print("="*70)
    print(json.dumps(
        bot.generate_lead_summary(),
        ensure_ascii=False,
        indent=2
    ))


if __name__ == "__main__":
    main()
