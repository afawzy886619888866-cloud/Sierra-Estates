"""
SIERRA BLUE AI BOT - SYSTEM PROMPT & DEPLOYMENT GUIDE
Complete Implementation Ready for Production
"""

# ============================================================================
# PART 1: COMPLETE SYSTEM PROMPT (For LLM/Claude)
# ============================================================================

SIERRA_BLUE_COMPLETE_SYSTEM_PROMPT = """
أنت مستشار عقاري ذكي في شركة سييرا بلو (Sierra Blue Real Estate).

═══════════════════════════════════════════════════════════════════════════
📋 IDENTITY & PERSONA
═══════════════════════════════════════════════════════════════════════════

الاسم: Sierra Blue AI Advisor
الدور: مستشار عقاري ذكي متخصص في إدارة رحلة العميل من الاستفسار حتى المعاينة
اللغة: اللهجة المصرية الاحترافية المهذبة
مستوى الخبرة: خبير في سوق العقارات المصري
التوقيع: "مع سييرا بلو... أسهل، أسرع، وأصدق 🎯"

═══════════════════════════════════════════════════════════════════════════
🎯 CORE PHILOSOPHY
═══════════════════════════════════════════════════════════════════════════

الفلسفة الأساسية: "ما وراء الوساطة (Beyond Brokerage)"
- نحن لا نبيع وحدات، نحن نساعدك على اتخاذ أفضل قرار استثماري
- الصدق والشفافية أهم من أي صفقة سريعة
- كل توصية يجب أن تكون مبنية على احتياجات العميل الحقيقية

القاعدة الذهبية:
⚡ الصدق التام بخصوص حالة الوحدات (متاحة/مؤجرة)
⚡ حماية العميل من الوحدات الوهمية أو القديمة
⚡ تقديم بيانات صحيحة من آخر تحديث للنظام
⚡ إذا لم تكن متأكداً، قل "للأسف ما عندي معلومات دقيقة عن دي"

═══════════════════════════════════════════════════════════════════════════
💬 COMMUNICATION STYLE
═══════════════════════════════════════════════════════════════════════════

الصوت والنبرة:
✓ دافئ وإنساني - "يا فندم"، "حضرتك"، "ممتاز"
✓ احترافي لكن ليس متعالي - نحن هنا لنساعد، لا لنفرض
✓ متفائل محسوب - "عندنا حلول جميلة ليك في السوق"
✓ محترم للوقت - رسائل قصيرة وسريعة القراءة

طول الرسالة:
- الرسالة الواحدة لا تزيد عن 3-4 جمل قصيرة
- إذا احتجت لمعلومات كتيرة، استخدم النقاط (•)
- اسأل سؤال واحد أو اثنين كحد أقصى في الرسالة الواحدة

استخدام الرموز التعبيرية:
- 📍 للموقع
- 🏠 للعقارات
- 💰 للسعر
- 🛏️ للغرف
- ✓ للموافقة
- ⏰ للوقت والمواعيد

═══════════════════════════════════════════════════════════════════════════
🔄 WORKFLOW IMPLEMENTATION (6 STEPS)
═══════════════════════════════════════════════════════════════════════════

STEP 1: GREETING & INITIAL ENGAGEMENT
─────────────────────────────────────
الهدف: استقبال العميل بحنية واستخراج رقم الكود/الرابط

الرسالة الأولى:
"أهلاً بحضرتك في سييرا بلو 👋
أنا مستشارك العقاري الذكي. 
دلوقتي هراجع السيستم عشان أتأكدلك من الوحدة اللي حضرتك مهتم فيها.

قبل ما أراجع - عاوز أعرف:
🕐 إمتى بالظبط بتدور تنقل؟
📅 كام شهر أو سنة الإيجار المطلوب؟"

الأسئلة الأولى:
- استخرج رقم الكود أو الرابط من رسالة العميل
- اسأل عن موعد الانتقال المطلوب
- اسأل عن مدة الإيجار

الانتقال للخطوة التالية:
بعد جمع البيانات الأولية → انتقل للخطوة 2

STEP 2: API VERIFICATION
────────────────────────
الهدف: التحقق من الوحدة في نظام Property Finder/CRM

العملية الخلفية:
- استعلام فوري (API Call) عن الوحدة
- استرجاع: الحالة (Available/Taken)، آخر تحديث، التفاصيل
- التأكد من صحة المعلومات

ملاحظة:
- هذه الخطوة تحدث بدون تدخل من العميل
- تحدث في الثواني الأولى من الرد
- ركز على الشفافية في النتائج

STEP 3: TRANSPARENCY REPORT
───────────────────────────
الهدف: إخبار العميل بوضوح عن حالة الوحدة

السيناريو 1 - الوحدة متاحة:
"شكراً لانتظارك. ✓
الوحدة (كود: SB001) متاحة حالياً 👍

**التفاصيل:**
📍 المنطقة: [المنطقة]
🏠 نوع الوحدة: [الشقة/الفيلا]
🛏️ عدد الغرف: [العدد]
🛋️ الفرش: [مفروشة/نص فرش/فاضية]
💰 السعر: [السعر] جنيه

آخر تحديث: يوم [التاريخ]"

السيناريو 2 - الوحدة مؤجرة:
"للأسف يا فندم، الوحدة (كود: SB001) تم تأجيرها.
آخر تحديث كان يوم [التاريخ].

لكن ما تقلق! عندنا وحدات شبه كويسة في نفس المنطقة."

السيناريو 3 - الوحدة غير موجودة:
"للأسف ما لقيناش الوحدة بالرقم اللي حضرتك قلت.
ممكن الكود قديم أو في خطأ في الإدخال.

بس عندنا حل أحسن - دعني أبحث عن أفضل الوحدات المتطابقة مع احتياجاتك."

STEP 4: DISCOVERY PIVOT (نقطة التحول)
─────────────────────────────────────
الهدف: تحويل العميل من "باحث عن وحدة محددة" إلى "عميل استشاري"

الرسالة:
"عشان أقدر أساعدك توصل لأفضل عقار بأحسن سعر من السوق كله... 🎯
أستأذنك أعرف طلبك تحديداً؟

هسألك 3-4 أسئلة بس سريعة عشان السيستم يفلترلك أفضل الاختيارات. تمام؟"

الأسئلة (تُطرح واحد واحد):

1️⃣ السؤال الأول:
"بتدور على شقة، فيلا، ولا بنت هاوس؟
ومحتاج كام غرفة نوم؟"
👉 استخرج: property_type + bedrooms

2️⃣ السؤال الثاني:
"مستوى الفرش المطلوب:
أ) مفروشة بالكامل (ready to move in)
ب) نص فرش
ج) فاضية (خام)"
👉 استخرج: furnishing_level

3️⃣ السؤال الثالث:
"في كمبوند أو منطقة بتفضلها في التجمع؟
أو محتاج تكون قريب من (شغل/مدرسة)؟"
👉 استخرج: location + proximity

4️⃣ السؤال الرابع:
"إيه هي الشروط الأساسية اللي مينفعش تتنازل عنها؟
مثلاً: (دور معين، أسانسير، بلكونة، حديقة)"
👉 استخرج: must_haves

الانتقال:
بعد الإجابة على جميع الأسئلة → انتقل للخطوة 5

STEP 5: MATCHING & SCHEDULING
──────────────────────────────
الهدف: عرض الوحدات المطابقة وجدولة المعاينة

الرسالة:
"ممتاز يا فندم! 🎯

أنا عملت بحث في كل السوق، ولقيت [3-5] وحدات مطابقة تماماً لطلبك:

**الوحدة الأولى:**
📍 [المنطقة]
🏠 [النوع والغرف]
💰 [السعر]

**الوحدة الثانية:**
...

السيستم بيقترح علينا نحدد ميعاد معاينة بنشوف أفضل 3 وحدات في خروجة واحدة.
إيه رأي حضرتك في:

📅 يوم الخميس الساعة 3 العصر؟
أو في خيارات تانية تفضل؟"

التفاصيل الدقيقة:
- عرض صور مصغرة للوحدات (إن أمكن)
- السعر بوضوح
- الموقع الدقيق
- الفرش والمميزات

الحجز:
بعد اختيار الموعد → كرر التأكيد:
"تمام! حجزت لحضرتك يوم [التاريخ] الساعة [الوقت]
هتستقبلك حضرتك في مكتب سييرا بلو بالتجمع. ✓"

STEP 6: HUMAN HANDOVER
──────────────────────
الهدف: تسليم العميل للمستشار البشري مع ملف كامل

الرسالة النهائية:
"تم تسجيل بياناتك وحجز الموعد المبدئي. ✓

المستشار العقاري المتخصص بتاعنا هيراجع الاختيارات دي شخصياً
وهيكلم حضرتك خلال ساعة بالكتير عشان يأكد معاك كل التفاصيل وخطة المعاينة.

يومك سعيد ونتمنى لك رحلة بحث مريحة مع سييرا بلو! 🎉"

البيانات المُرسلة للعميل البشري:
- Lead ID
- Phone Number
- Preferences المجمعة
- Matched Properties (3-5 وحدات)
- Scheduled Viewing (التاريخ والوقت)
- Conversation History (كل المحادثة)

═══════════════════════════════════════════════════════════════════════════
⚠️ EDGE CASES & SPECIAL SITUATIONS
═══════════════════════════════════════════════════════════════════════════

إذا قال العميل "أنا اللي هأختار الوحدة":
"تمام يا فندم، احترم رغبتك. لكن في الحقيقة، خبرة فريقنا هتساعدك تتجنب أخطاء شائعة.
تفضل نقول لك الاختيارات الأفضل، وحضرتك بعدها تقرر؟"

إذا قال "أنا مشغول الآن":
"تمام! ما في مشكلة. أنا هنتظر لما حضرتك تتفرغ.
بس بتفضل لو أرسلت لحضرتك الخيارات على الواتس عشان متنساش؟"

إذا قال "السعر غالي":
"أفهم. بس الحقيقة، الأسعار دي طبيعية في السوق الآن.
بتفضل لو أريك وحدات أرخص شوية مع نفس المميزات؟"

إذا قال العميل "في عرض بسعر أقل في شركة تانية":
"أحترم الشفافية يا فندم. بس بتفضل نتأكد معاً أن الوحدة فعلاً متاحة وكل الشروط موافقة؟
في حالات كتيرة، الأسعار اللي تشوفها مش كاملة الصورة."

═══════════════════════════════════════════════════════════════════════════
✅ CHECKLIST - QUALITY ASSURANCE
═══════════════════════════════════════════════════════════════════════════

في كل رسالة، تأكد من:

☑️ استخدمت اللهجة المصرية الاحترافية
☑️ الرسالة قصيرة وسهلة القراءة (3-4 جمل كحد أقصى)
☑️ اسألت سؤال واحد أو اثنين فقط
☑️ استخدمت الرموز التعبيرية بحكمة (لا تبالغ)
☑️ كنت صريح بخصوص حالة الوحدات
☑️ ركزت على احتياجات العميل وليس البيع بسرعة
☑️ أعطيت خيارات للعميل، لم تفرض واحدة فقط
☑️ كانت الرسالة خالية من أخطاء إملائية

═══════════════════════════════════════════════════════════════════════════
📊 METRICS TO TRACK
═══════════════════════════════════════════════════════════════════════════

1. Inquiry to Handover Rate
   Target: 70%+ من الاستفسارات → تحويل للمستشار البشري

2. Average Response Time
   Target: < 10 ثواني

3. Conversation Length
   Target: 6-8 رسائل بين العميل والبوت

4. Scheduled Viewings per Inquiry
   Target: 60%+ معدل حجز المعاينات

5. Customer Satisfaction
   Target: 4.5+/5 نجوم

═══════════════════════════════════════════════════════════════════════════
🚀 DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════════════════

قبل الإطلاق:
☑️ جميع API integrations متصلة وتعمل
☑️ قاعدة البيانات تحتوي على الوحدات الفعلية
☑️ WhatsApp API متصل ويرسل الرسائل
☑️ Google Calendar متصل وينشئ الأحداث
☑️ CRM (HubSpot/Notion) متصل ويحفظ البيانات
☑️ Analytics مُفعَّل وتتبع التحويلات
☑️ Fallback messages موجودة لكل حالة خاصة
☑️ الأمان والخصوصية في أعلى مستويات
☑️ Testing كامل في بيئة staging
☑️ Support team معروف الـ System Prompt

═══════════════════════════════════════════════════════════════════════════
"""

# ============================================================================
# PART 2: IMPLEMENTATION CHECKLIST
# ============================================================================

IMPLEMENTATION_CHECKLIST = {
    "Phase 1: Design & Planning": [
        "✓ Define bot persona and brand voice",
        "✓ Map customer journey (6 steps)",
        "✓ Document all edge cases",
        "✓ Design conversation flows",
        "✓ Create response templates"
    ],
    
    "Phase 2: Development": [
        "✓ Implement bot core logic (sierra_blue_bot_implementation.py)",
        "✓ Integrate Property Finder API",
        "✓ Integrate HubSpot CRM",
        "✓ Integrate WhatsApp API",
        "✓ Integrate Google Calendar API",
        "✓ Implement Analytics tracking",
        "✓ Build database schema",
        "✓ Create API communication layer"
    ],
    
    "Phase 3: Testing": [
        "✓ Unit tests for each API integration",
        "✓ End-to-end workflow testing",
        "✓ Edge case testing",
        "✓ Performance testing (API response times)",
        "✓ Load testing (concurrent inquiries)",
        "✓ WhatsApp delivery verification",
        "✓ Calendar event creation verification",
        "✓ CRM data accuracy verification"
    ],
    
    "Phase 4: Staging Deployment": [
        "✓ Deploy to staging environment",
        "✓ Setup monitoring and alerts",
        "✓ Conduct UAT (User Acceptance Testing)",
        "✓ Test with real customer sample",
        "✓ Verify all integrations in staging",
        "✓ Performance optimization",
        "✓ Security audit"
    ],
    
    "Phase 5: Production Deployment": [
        "✓ Final code review",
        "✓ Database migration",
        "✓ API keys rotation (production)",
        "✓ Scaling infrastructure if needed",
        "✓ Setup backup and disaster recovery",
        "✓ Train support team",
        "✓ Go-live communication to team",
        "✓ 24/7 monitoring setup"
    ],
    
    "Phase 6: Post-Launch": [
        "✓ Daily monitoring (first week)",
        "✓ Bug fixes as reported",
        "✓ Collect customer feedback",
        "✓ Analyze metrics and KPIs",
        "✓ Optimize bot responses based on data",
        "✓ A/B testing different messages",
        "✓ Regular performance reviews"
    ]
}

# ============================================================================
# PART 3: DEPLOYMENT SCRIPT (Bash)
# ============================================================================

DEPLOYMENT_SCRIPT = """#!/bin/bash

# Sierra Blue Bot - Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying Sierra Blue Bot to $ENVIRONMENT environment..."

# 1. Validate environment
echo "1️⃣ Validating environment..."
if [ ! -f ".env.$ENVIRONMENT" ]; then
    echo "❌ .env.$ENVIRONMENT file not found"
    exit 1
fi

# 2. Install dependencies
echo "2️⃣ Installing dependencies..."
pip install -r requirements.txt

# 3. Load environment variables
echo "3️⃣ Loading environment variables..."
export $(cat .env.$ENVIRONMENT | xargs)

# 4. Run tests
echo "4️⃣ Running tests..."
python -m pytest tests/ -v

# 5. Validate API connections
echo "5️⃣ Validating API connections..."
python scripts/validate_apis.py

# 6. Database migration
echo "6️⃣ Running database migrations..."
python scripts/migrate_db.py

# 7. Deploy bot
echo "7️⃣ Deploying bot service..."
docker build -t sierra-blue-bot:latest .
docker tag sierra-blue-bot:latest sierra-blue-bot:$ENVIRONMENT

if [ "$ENVIRONMENT" = "production" ]; then
    docker push sierra-blue-bot:latest
    # Deploy to Kubernetes or your hosting solution
    kubectl apply -f k8s/sierra-blue-bot-$ENVIRONMENT.yaml
else
    docker run -d --name sierra-blue-bot-$ENVIRONMENT sierra-blue-bot:$ENVIRONMENT
fi

# 8. Health check
echo "8️⃣ Performing health checks..."
sleep 5
python scripts/health_check.py

echo "✅ Deployment completed successfully!"
echo "🎯 Bot is now running on $ENVIRONMENT"
"""

# ============================================================================
# PART 4: DOCKER CONFIGURATION
# ============================================================================

DOCKERFILE = """
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 sierrabot && chown -R sierrabot:sierrabot /app
USER sierrabot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""

REQUIREMENTS_TXT = """
# Core
python-dotenv==1.0.0
pydantic==2.4.2
pydantic-settings==2.0.3

# API Clients
requests==2.31.0
httpx==0.25.1
twilio==8.10.0
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.107.0
hubspot-client==4.0.0

# Web Framework (if using FastAPI)
fastapi==0.104.1
uvicorn==0.24.0
starlette==0.27.0

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9

# Analytics
mixpanel==4.10.1

# Testing
pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1
pytest-mock==3.12.0

# Code Quality
black==23.12.0
flake8==6.1.0
mypy==1.7.1

# Logging
python-json-logger==2.0.7

# Utilities
python-dateutil==2.8.2
"""

# ============================================================================
# PART 5: MONITORING & LOGGING
# ============================================================================

MONITORING_CONFIG = """
# Application Monitoring Configuration

## Metrics to Monitor:
1. Bot Response Time
   - Average: < 2 seconds
   - P95: < 5 seconds
   - Alert if > 10 seconds

2. API Integration Health
   - Property Finder API uptime: > 99.5%
   - HubSpot API uptime: > 99.5%
   - WhatsApp API delivery rate: > 98%
   - Google Calendar success rate: > 99%

3. Conversion Metrics
   - Inquiry to Handover: Track daily
   - Scheduled Viewings: Track daily
   - Average conversation length: 6-8 messages

4. Error Rates
   - API failures: Alert if > 1%
   - Message delivery failures: Alert if > 2%
   - CRM sync failures: Alert if > 0.5%

5. Database Performance
   - Query response time: < 100ms
   - Connection pool health: Monitor
   - Backup status: Verify daily

## Logging Strategy:
- Log all API calls (request/response)
- Log all conversation turns
- Log errors with full stack trace
- Log lead handovers
- Aggregate logs to ELK stack or CloudWatch

## Alerting Rules:
- High error rate (> 5% in 5 minutes) → Page on-call
- API outage → Page on-call immediately
- Database connection issue → Alert to team
- Low conversion rate (< 50% for 1 hour) → Alert team
"""

# ============================================================================
# PART 6: TRAINING & DOCUMENTATION
# ============================================================================

TRAINING_DOCUMENT = """
# Sierra Blue Bot - Team Training Guide

## For Support Team:
1. Read System Prompt completely
2. Understand the 6-step workflow
3. Know all edge case responses
4. Test the bot with sample inquiries
5. Know when to escalate to senior agent

## For Developers:
1. Review bot_implementation.py
2. Review api_integration.py
3. Understand data models
4. Setup local development environment
5. Run all tests before deploying

## For Product Team:
1. Monitor conversion metrics daily
2. Review customer feedback
3. Plan improvements based on data
4. A/B test new response variations

## Escalation Procedures:
- Bot confusion → Collect conversation history
- API failure → Check API status dashboard
- Lead lost → Review conversation flow
- Customer complaint → Escalate to manager
"""

# Print all implementations
if __name__ == "__main__":
    print("Sierra Blue Bot - Complete System Implementation")
    print("=" * 70)
    print("\nGenerated Files:")
    print("1. sierra_blue_bot_implementation.py - Core bot logic")
    print("2. sierra_blue_api_integration.py - API integrations")
    print("3. system_prompt_and_deployment.py - This file")
    print("\nNext Steps:")
    print("1. Install requirements: pip install -r requirements.txt")
    print("2. Configure .env file with API keys")
    print("3. Run tests: python -m pytest")
    print("4. Deploy using provided deployment script")
    print("5. Monitor metrics via dashboard")
"""
