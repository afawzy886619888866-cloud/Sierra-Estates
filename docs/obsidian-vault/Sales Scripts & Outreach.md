# 💬 Sales Scripts & Outreach Registry
> **Path:** `docs/obsidian-vault/Sales Scripts & Outreach.md`  
> **Parent Node:** `[[Sierra Estates Memory Engine]]`

This registry contains the active communication scripts used by **Leila (Conversational Arabic Bot)** and **Sierra (AI Coordinator)** to communicate with direct owners and real estate brokers in Egypt.

---

## 👨‍💼 WhatsApp Direct Owner Outreach Scripts
When an owner lists a property on Dubizzle or Facebook, Leila sends this friendly, highly professional WhatsApp text to vet the unit and request high-quality photos.

### Script 1: Initial Vetting & Photo Request (Arabic)
```
السلام عليكم يا فندم، أنا ليلى من شركة سييرا بلو العقارية بالتجمع الخامس. 

شفت إعلان حضرتك بخصوص وحدة [نوع الوحدة: شقة/توين هاوس] المعروضة للبيع/الإيجار في [اسم الكومباوند/المنطقة، مثل: Lake View]. 

الوحدة ممتازة وتناسب مجموعة من عملائنا المستثمرين المسجلين لدينا حالياً. هل الوحدة لسه متاحة؟ وإذا أمكن، ممكن تشرفني بصور واضحة للوحدة وتفاصيل السعر النهائي وطرق السداد عشان أطرحها لعملائنا فوراً؟

شكراً لحضرتك وفي انتظار ردك!
```

### Script 2: Price Correction & Negotiation (Arabic)
If our `[[Forecasting Engine]]` calculates that the owner's price per square meter is overpriced by more than 15% compared to the New Cairo market average:
```
أهلاً بحضرتك يا فندم. حابة أشكرك على التفاصيل والصور. 

إحنا قمنا بتحليل متوسط أسعار المتر في [اسم المنطقة/الكومباوند] بناءً على الصفقات الفعلية الأخيرة. متوسط السعر الحالي للمتر نصف تشطيب هو [السعر العادل] ج.م، وده بيخلي سعر حضرتك أعلى بنسبة [النسبة]% تقريباً من متوسط السوق.

بما إن عميلنا جاهز للشراء الفوري كاش، هل في إمكانية لتفاوض بسيط في السعر عشان نقرب المسافات ونخلص الإجراءات في أسرع وقت؟ 
```

---

## 🤝 WhatsApp Broker co-broke Coordination Scripts
If the property listing belongs to another real estate broker, the AI bot handles the co-broke (cooperation) outreach systematically using standard codes.

### Script 3: co-broke Proposal (Arabic/English Mixed)
```
السلام عليكم يا كوتش، معاك سييرا من سييرا بلو للتسويق العقاري.

شفت الوحدة المعروضة من طرفك في [الكومباوند] بكود [الترميز، مثل: LV-3B-100K-F]. عندي عميل مباشر ومشتري كاش مهتم جداً بالوحدة دي وجاهز للمعاينة.

هل متاح معاينة للوحدة دي هذا الأسبوع؟ وممكن ننسق بخصوص العمولة المشتركة (co-broke 50/50) وتفاصيل التواصل مع المالك؟

تسلم يا غالي وفي انتظار ردك لتنسيق الموعد!
```

---

## 📧 Email Outreach Templates (`a.fawzy8866@gmail.com`)
When a deal is closed or scheduled, the system sends an automation notification email containing all unit, owner, and broker contact coordinates.

### Email Format: viewing Appointment Booked
```
Subject: 📅 [Sierra Estates AI] Viewing Scheduled - Compound: [Compound] - Unit Code: [Unit Code]

Dear Ahmed Fawzy,

Our AI agents (Leila & Sierra) have successfully closed the qualification stage and booked a physical viewing appointment.

Event Details:
---------------------------------------------
Date & Time: [Date & Time]
Property Code: [Unit Code]
Compound: [Compound/Location]
Property Price: EGP [Price]

Contact Coordinates:
---------------------------------------------
Client Name: [Client Name]
Client Phone: [Client Phone]

Listing Entity Type: [Direct Owner / Broker Listed]
Contact Person Name: [Owner/Broker Name]
Contact Person Phone: [Owner/Broker Phone]

Co-Broke Status: [Yes/No]
WhatsApp Chat Thread Log: [Link to Admin CRM Module]

Please confirm this appointment has been synced to your Google Calendar.
Best regards,
Sierra Estates Intelligence OS
```

